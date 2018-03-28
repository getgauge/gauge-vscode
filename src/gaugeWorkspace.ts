import { LanguageClient, DynamicFeature, RevealOutputChannelOn } from "vscode-languageclient";
import {
    Disposable, workspace, WorkspaceFolder, WorkspaceFoldersChangeEvent, Uri,
    CancellationTokenSource, OutputChannel, window, WorkspaceConfiguration, commands, ExtensionContext
} from "vscode";
import { GaugeCommandContext, setCommandContext, GaugeVSCodeCommands } from "./constants";
import { GaugeWorkspaceFeature } from "./gaugeWorkspace.proposed";
import { clientLanguageMap } from "./execution/debug";
import fs = require('fs');
import * as path from 'path';
import { SpecNodeProvider } from "./explorer/specExplorer";
import { GaugeExecutor } from "./execution/gaugeExecutor";
import { GaugeState } from "./gaugeState";

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';

export class GaugeWorkspace extends Disposable {
    private _executor: GaugeExecutor;
    private _clients: Map<string, LanguageClient> = new Map();
    private _outputChannel: OutputChannel = window.createOutputChannel('gauge');
    private _launchConfig: WorkspaceConfiguration;
    private _disposable: Disposable;
    private _specNodeProvider: SpecNodeProvider;

    constructor(private state: GaugeState) {
        super(() => this.dispose());
        this._executor = new GaugeExecutor(this);
        workspace.workspaceFolders.forEach((folder) => this.startServerFor(folder));

        setCommandContext(GaugeCommandContext.MultiProject, this._clients.size > 1);

        workspace.onDidChangeWorkspaceFolders((event) => {
            if (event.added) this.onFolderAddition(event);
            if (event.removed) this.onFolderDeletion(event);
            setCommandContext(GaugeCommandContext.MultiProject, this._clients.size > 1);
        });
        this._specNodeProvider = new SpecNodeProvider(this);
        this._disposable = Disposable.from(
            this._specNodeProvider,
            this.onConfigurationChange()
        );
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

    getDefaultFolder() {
        let projects: any = [];
        this._clients.forEach((v, k) => projects.push(k));
        return projects.sort((a: any, b: any) => a > b)[0];
    }

    showProjectOptions(onChange: Function) {
        let projectItems = [];
        this._clients.forEach((v, k) => projectItems.push({ label: path.basename(k), description: k }));
        return window.showQuickPick(projectItems).then((selected) => {
            if (selected) {
                return onChange(selected.description);
            }
        }, (err) => {
            window.showErrorMessage('Unable to select project.', err);
        });
    }

    private onFolderAddition(event: WorkspaceFoldersChangeEvent) {
        for (let folder of event.added) {
            if (!this._clients.has(folder.uri.fsPath)) {
                this.startServerFor(folder);
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

    private startServerFor(folder: WorkspaceFolder) {
        let folderPath = folder.uri.fsPath;
        if (!fs.existsSync(path.join(folderPath, "manifest.json"))) {
            return;
        }
        let serverOptions = {
            command: 'gauge',
            args: ["daemon", "--lsp", "--dir=" + folderPath],
        };

        this._launchConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
        if (this._launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
            serverOptions.args.push("-l");
            serverOptions.args.push("debug");
        }
        let clientOptions = {
            documentSelector: [{ scheme: 'file', language: 'gauge', pattern: `${folderPath}/**/*` }],
            diagnosticCollectionName: 'gauge',
            workspaceFolder: folder,
            outputChannel: this._outputChannel,
            revealOutputChannelOn: RevealOutputChannelOn.Never,
        };
        let languageClient = new LanguageClient('gauge', 'Gauge', serverOptions, clientOptions);

        this.registerDynamicFeatures(languageClient);
        this._clients.set(folderPath, languageClient);
        languageClient.start();

        languageClient.onReady().then(() => { this.setLanguageId(languageClient, folderPath); });
    }

    private registerDynamicFeatures(languageClient: LanguageClient) {
        let result: Array<(DynamicFeature<any>)> = [];
        result.push(new GaugeWorkspaceFeature(languageClient));
        languageClient.registerFeatures(result);
    }

    private setLanguageId(languageClient: LanguageClient, projectRoot: string) {
        languageClient.sendRequest("gauge/getRunnerLanguage", new CancellationTokenSource().token).then(
            (language: string) => {
                clientLanguageMap.set(projectRoot, language);
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
        this._disposable.dispose();
        let promises: Thenable<void>[] = [];
        for (let client of this._clients.values()) {
            promises.push(client.stop());
        }
        return Promise.all(promises).then(() => undefined);
    }
}