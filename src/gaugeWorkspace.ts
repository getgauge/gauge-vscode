'use strict';

import { platform } from 'os';
import * as path from 'path';
import {
    CancellationTokenSource, commands, Disposable, OutputChannel, Uri,
    window, workspace, WorkspaceConfiguration, WorkspaceFoldersChangeEvent
} from "vscode";
import { DynamicFeature, LanguageClient, LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { CLI } from './cli';
import GaugeConfig from './config/gaugeConfig';
import { GaugeJavaProjectConfig } from './config/gaugeProjectConfig';
import { GaugeCommandContext, GaugeRunners, setCommandContext } from "./constants";
import { GaugeExecutor } from "./execution/gaugeExecutor";
import { SpecNodeProvider } from "./explorer/specExplorer";
import { SpecificationProvider } from './file/specificationFileProvider';
import { GaugeClients as GaugeProjectClientMap } from './gaugeClients';
import { GaugeWorkspaceFeature } from "./gaugeWorkspace.proposed";
import { GaugeProject } from './project/gaugeProject';
import { ProjectFactory } from './project/projectFactory';
import { getActiveGaugeDocument, hasActiveGaugeDocument } from './util';
import { MavenProject } from './project/mavenProject';

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';
const GAUGE_CODELENS_CONFIG = 'gauge.codeLenses';
const REFERENCE_CONFIG = 'reference';

export class GaugeWorkspace extends Disposable {
    private readonly _fileProvider: SpecificationProvider;
    private _executor: GaugeExecutor;
    private _clientsMap: GaugeProjectClientMap = new GaugeProjectClientMap();
    private _clientLanguageMap: Map<string, string> = new Map();
    private _outputChannel: OutputChannel = window.createOutputChannel('gauge');
    private _launchConfig: WorkspaceConfiguration;
    private _codeLensConfig: WorkspaceConfiguration;
    private _disposable: Disposable;
    private _specNodeProvider: SpecNodeProvider;

    constructor(private cli: CLI) {
        super(() => this.dispose());
        this._executor = new GaugeExecutor(this, cli);

        if (workspace.workspaceFolders) {
            workspace.workspaceFolders.forEach(async (folder) => {
                await this.startServerFor(folder.uri.fsPath);
            });
        }

        if (hasActiveGaugeDocument(window.activeTextEditor))
            this.startServerForSpecFile(window.activeTextEditor.document.uri.fsPath);

        setCommandContext(GaugeCommandContext.MultiProject, this._clientsMap.size > 1);

        workspace.onDidChangeWorkspaceFolders(async (event) => {
            if (event.added) await this.onFolderAddition(event);
            if (event.removed) this.onFolderDeletion(event);
            setCommandContext(GaugeCommandContext.MultiProject, this._clientsMap.size > 1);
        });
        this._fileProvider = new SpecificationProvider(this);
        this._specNodeProvider = new SpecNodeProvider(this);
        this._disposable = Disposable.from(
            this._specNodeProvider,
            this._executor,
            this._fileProvider,
            this.onConfigurationChange(),
            this.onEditorChange()
        );
    }

    private onEditorChange(): Disposable {
        return window.onDidChangeActiveTextEditor(async (editor) => {
            getActiveGaugeDocument(window.activeTextEditor).then(async (p) => {
                if (p) await this.startServerForSpecFile(p);
            });
        });
    }

    private async startServerForSpecFile(file: string) {
        let project = ProjectFactory.getGaugeRootFromFilePath(file);
        await this.startServerFor(project);
    }

    getGaugeExecutor(): GaugeExecutor {
        return this._executor;
    }

    getClientsMap(): GaugeProjectClientMap {
        return this._clientsMap;
    }

    getClientLanguageMap(): Map<string, string> {
        return this._clientLanguageMap;
    }

    getDefaultFolder() {
        let projects: any = [];
        this._clientsMap.forEach((v, k) => projects.push(k));
        return projects.sort((a: any, b: any) => a > b)[0];
    }

    showProjectOptions(onChange: Function) {
        let projectItems = [];
        this._clientsMap.forEach((v, k) => projectItems.push({ label: path.basename(k), description: k }));
        let options = { canPickMany: false, placeHolder: "Choose a project" };
        return window.showQuickPick(projectItems, options).then((selected: any) => {
            if (selected) {
                return onChange(selected.description);
            }
        }, (err) => {
            window.showErrorMessage('Unable to select project.', err);
        });
    }

    private async onFolderAddition(event: WorkspaceFoldersChangeEvent) {
        for (let folder of event.added) {
            if (!this._clientsMap.has(folder.uri.fsPath)) {
                await this.startServerFor(folder.uri.fsPath);
            }
        }
    }

    private onFolderDeletion(event: WorkspaceFoldersChangeEvent) {
        for (let folder of event.removed) {
            if (!this._clientsMap.has(folder.uri.fsPath)) return;
            let client = this._clientsMap.get(folder.uri.fsPath).client;
            this._clientsMap.delete(folder.uri.fsPath);
            client.stop();
        }
        this._specNodeProvider.changeClient(this.getDefaultFolder());
    }

    private async startServerFor(folder: string): Promise<any> {
        if (!ProjectFactory.isGaugeProject(folder)) return;
        let project = ProjectFactory.get(folder);
        if (this._clientsMap.has(project.root())) return;
        let serverOptions = {
            command: this.cli.gaugeCommand(),
            args: ["daemon", "--lsp", "--dir=" + project.root()],
            options: { env: process.env }
        };

        this._launchConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
        if (this._launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
            serverOptions.args.push("-l");
            serverOptions.args.push("debug");
        }
        this._codeLensConfig = workspace.getConfiguration(GAUGE_CODELENS_CONFIG);
        if (this._codeLensConfig.has(REFERENCE_CONFIG) && !this._codeLensConfig.get(REFERENCE_CONFIG)) {
            serverOptions.options.env.gauge_lsp_reference_codelens = 'false';
        }
        let clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'gauge', pattern: `${project.root()}/**/*` }],
            diagnosticCollectionName: 'gauge',
            outputChannel: this._outputChannel,
            revealOutputChannelOn: RevealOutputChannelOn.Never,
        };
        clientOptions.workspaceFolder = workspace.getWorkspaceFolder(Uri.file(folder));
        let languageClient = new LanguageClient('gauge', 'Gauge', serverOptions, clientOptions);
        this._clientsMap.set(project.root(), { project: project, client: languageClient });
        await this.installRunnerFor(project);
        this.generateJavaConfig(project);
        this.registerDynamicFeatures(languageClient);
        languageClient.start();
        return languageClient.onReady().then(() => { this.setLanguageId(languageClient, project.root()); });
    }

    private generateJavaConfig(project: GaugeProject) {
        if (project.isProjectLanguage(GaugeRunners.Java)
            && this.cli.isPluginInstalled(GaugeRunners.Java)
            && !(project instanceof MavenProject)) {
                new GaugeJavaProjectConfig(project.root(),
                    this.cli.getGaugePluginVersion(GaugeRunners.Java), new GaugeConfig(platform())).generate();
                process.env.SHOULD_BUILD_PROJECT = "false";
        }
    }

    private async installRunnerFor(project: GaugeProject): Promise<any> {
        const language = project.language();
        if (this.cli.isPluginInstalled(language)) return;
        let message = `The project ${path.basename(project.root())} requires gauge ${language} to be installed. ` +
            "Would you like to install it?";
        let action = await window.showErrorMessage(message, { modal: true }, "Yes", "No");
        if (action === "Yes") {
            return await this.cli.installGaugeRunner(language);
        }
        return Promise.resolve();
    }

    private registerDynamicFeatures(languageClient: LanguageClient) {
        let result: Array<(DynamicFeature<any>)> = [];
        result.push(new GaugeWorkspaceFeature(languageClient));
        languageClient.registerFeatures(result);
    }

    private setLanguageId(languageClient: LanguageClient, projectRoot: string) {
        languageClient.sendRequest("gauge/getRunnerLanguage", new CancellationTokenSource().token).then(
            (language: string) => {
                this._clientLanguageMap.set(projectRoot, language);
            }
        );

    }

    private onConfigurationChange() {
        return workspace.onDidChangeConfiguration((params) => {
            let newConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
            if (this._launchConfig.get(DEBUG_LOG_LEVEL_CONFIG) !== newConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
                let msg = 'Gauge Language Server configuration changed, please restart VS Code.';
                let action = 'Restart Now';
                this._launchConfig = newConfig;
                window.showWarningMessage(msg, action).then((selection) => {
                    if (action === selection) {
                        commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            }
        });
    }

    dispose(): Thenable<void> {
        let promises: Thenable<void>[] = [];
        for (let cp of this._clientsMap.values()) {
            promises.push(cp.client.stop());
        }
        return Promise.all(promises).then((f) => {
            this._disposable.dispose();
        });
    }
}
