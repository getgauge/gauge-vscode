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

import { getGaugeCommand, getProjectRootFromSpecPath, hasActiveGaugeDocument } from './util';
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
        workspace.workspaceFolders.forEach((folder) => {
            this.startServerFor(folder);
        });
        if (hasActiveGaugeDocument(window.activeTextEditor))
            this.startServerForSpecFile(window.activeTextEditor.document.uri.fsPath);

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
        return window.onDidChangeActiveTextEditor((editor) => {
            if (hasActiveGaugeDocument(editor))
                this.startServerForSpecFile(editor.document.uri.fsPath);
        });
    }

    private startServerForSpecFile(file: string) {
        let projectRoot = getProjectRootFromSpecPath(file);
        if (!this._clients.has(projectRoot))
            this.startServerFor(projectRoot);
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
        if (!project.isGaugeProject()) return;
        if (project.isProjectLanguage(GaugeRunners.Java)) {
            new GaugeJavaProjectConfig(project.root(),
                this.cli.getPluginVersion(GaugeRunners.Java),
                new GaugeConfig(platform())).generate();
            process.env.SHOULD_BUILD_PROJECT = "false";
        }
        await this.installRunnerFor(project);

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
        this.registerDynamicFeatures(languageClient);
        this._clients.set(project.root(), languageClient);
        languageClient.start();
        return languageClient.onReady().then(() => { this.setLanguageId(languageClient, project.root()); });
    }

    private async installRunnerFor(project: GaugeProject): Promise<any> {
        const language = project.language();
        if (this.cli.isPluginInstalled(language)) return;
        try {
            let message = `The project ${path.basename(project.root())} requires gauge ${language} to be installed. ` +
                "Do you like to install?";
            // Need to find a way to block showWarningMessage call
            let action = await window.showWarningMessage(message, "Yes", "No");
            if (action === "Yes") {
                return this.cli.install(language, project.root());
            }
            return Promise.resolve();
        } catch (error) {
            return window.showErrorMessage(`Failed to install plugin ${language}.` +
                'Refer [this](https://docs.gauge.org/latest/installation.html#language-plugins) to install manually');
        }
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
