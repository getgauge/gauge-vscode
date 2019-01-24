'use strict';

import * as path from 'path';
import { platform } from 'os';
import {
    CancellationTokenSource, commands, Disposable, OutputChannel, window, workspace,
    WorkspaceConfiguration, WorkspaceFolder, WorkspaceFoldersChangeEvent
} from "vscode";
import { DynamicFeature, LanguageClient, LanguageClientOptions, RevealOutputChannelOn } from "vscode-languageclient";
import { GaugeCommandContext, setCommandContext, GaugeRunners } from "./constants";
import { GaugeExecutor } from "./execution/gaugeExecutor";
import { SpecNodeProvider } from "./explorer/specExplorer";
import { SpecificationProvider } from './file/specificationFileProvider';
import { GaugeState } from "./gaugeState";
import { GaugeWorkspaceFeature } from "./gaugeWorkspace.proposed";

import { getGaugeCommand, getProjectRootFromSpecPath, getActiveGaugeDocument } from './util';
import { getGaugeProject, GaugeProject } from './gaugeProject';
import { GaugeCLI } from './gaugeCLI';
import { GaugeJavaProjectConfig } from './config/gaugeProjectConfig';
import GaugeConfig from './config/gaugeConfig';

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';
const GAUGE_CODELENS_CONFIG = 'gauge.codeLenses';
const REFERENCE_CONFIG = 'reference';

export class GaugeWorkspace extends Disposable {
    private readonly _fileProvider: SpecificationProvider;
    private _executor: GaugeExecutor;
    private _clients: Map<string, LanguageClient> = new Map();
    private _clientLanguageMap: Map<string, string> = new Map();
    private _outputChannel: OutputChannel = window.createOutputChannel('gauge');
    private _launchConfig: WorkspaceConfiguration;
    private _codeLensConfig: WorkspaceConfiguration;
    private _disposable: Disposable;
    private _specNodeProvider: SpecNodeProvider;

    constructor(private state: GaugeState, private cli: GaugeCLI) {
        super(() => this.dispose());
        this._executor = new GaugeExecutor(this);
        workspace.workspaceFolders.forEach(async (folder) => {
            await this.startServerFor(folder);
        });

        getActiveGaugeDocument(window.activeTextEditor).then(async (p) => {
            if (p) await this.startServerForSpecFile(p);
        });

        setCommandContext(GaugeCommandContext.MultiProject, this._clients.size > 1);

        workspace.onDidChangeWorkspaceFolders(async (event) => {
            if (event.added) await this.onFolderAddition(event);
            if (event.removed) this.onFolderDeletion(event);
            setCommandContext(GaugeCommandContext.MultiProject, this._clients.size > 1);
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
        let projectRoot = getProjectRootFromSpecPath(file);
        if (!this._clients.has(projectRoot))
            await this.startServerFor(projectRoot);
    }

    setReportPath(reportPath: string) {
        this.state.setReportPath(reportPath.trim());
    }

    getGaugeExecutor(): GaugeExecutor {
        return this._executor;
    }

    getReportThemePath(): string {
        return this.state.getReportThemePath();
    }

    getClients(): Map<string, LanguageClient> {
        return this._clients;
    }

    getClientLanguageMap(): Map<string, string> {
        return this._clientLanguageMap;
    }

    getDefaultFolder() {
        let projects: any = [];
        this._clients.forEach((v, k) => projects.push(k));
        return projects.sort((a: any, b: any) => a > b)[0];
    }

    showProjectOptions(onChange: Function) {
        let projectItems = [];
        this._clients.forEach((v, k) => projectItems.push({ label: path.basename(k), description: k }));
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
            if (!this._clients.has(folder.uri.fsPath)) {
                await this.startServerFor(folder);
            }
        }
    }

    private onFolderDeletion(event: WorkspaceFoldersChangeEvent) {
        for (let folder of event.removed) {
            if (!this._clients.has(folder.uri.fsPath)) return;
            let client = this._clients.get(folder.uri.fsPath);
            this._clients.delete(folder.uri.fsPath);
            client.stop();
        }
        this._specNodeProvider.changeClient(this.getDefaultFolder());
    }

    private async startServerFor(folder: WorkspaceFolder | string): Promise<any> {
        let project = getGaugeProject(folder);
        let serverOptions = {
            command: getGaugeCommand(),
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
        if (typeof folder !== 'string') clientOptions.workspaceFolder = folder;
        let languageClient = new LanguageClient('gauge', 'Gauge', serverOptions, clientOptions);
        this._clients.set(project.root(), languageClient);
        await this.installRunnerFor(project);
        if (project.isProjectLanguage(GaugeRunners.Java)) {
            new GaugeJavaProjectConfig(project.root(),
                this.cli.getPluginVersion(GaugeRunners.Java),
                new GaugeConfig(platform())).generate();
            process.env.SHOULD_BUILD_PROJECT = "false";
        }
        this.registerDynamicFeatures(languageClient);
        languageClient.start();
        return languageClient.onReady().then(() => { this.setLanguageId(languageClient, project.root()); });
    }

    private async installRunnerFor(project: GaugeProject): Promise<any> {
        const language = project.language();
        if (this.cli.isPluginInstalled(language)) return;
        let message = `The project ${path.basename(project.root())} requires gauge ${language} to be installed. ` +
            "Do you like to install?";
        let action = await window.showErrorMessage(message, { modal: true }, "Yes", "No");
        if (action === "Yes") {
            return await this.cli.install(language);
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
        for (let client of this._clients.values()) {
            promises.push(client.stop());
        }
        return Promise.all(promises).then((f) => {
            this._disposable.dispose();
        });
    }
}
