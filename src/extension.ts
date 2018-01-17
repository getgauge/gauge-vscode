'use strict';

import * as path from 'path';

import {
    workspace, Disposable, ExtensionContext, Uri, extensions, TextDocumentShowOptions, Position, Range, WorkspaceFolder, OutputChannel,
    commands, WorkspaceFoldersChangeEvent, window, StatusBarAlignment, CancellationTokenSource, version, TextDocument, TextEditor, languages
} from 'vscode';

import {
    LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, TextDocumentIdentifier, Location as LSLocation,
    Position as LSPosition, RevealOutputChannelOn, DynamicFeature
} from 'vscode-languageclient';

import { escape } from "querystring";

import fs = require('fs');
import cp = require('child_process');
import opn = require('opn');
import copyPaste = require('copy-paste');
import { execute, runScenario, runSpecification, cancel, onBeforeExecute, onExecuted } from "./execution/gaugeExecution";
import { SpecNodeProvider, GaugeNode, Scenario } from './explorer/specExplorer'
import { VSCodeCommands, GaugeVSCodeCommands, GaugeCommandContext, setCommandContext } from './commands';
import { getGaugeVersionInfo, GaugeVersionInfo } from './gaugeVersion'

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';
const GAUGE_EXTENSION_ID = 'getgauge.gauge';
const GAUGE_SUPPRESS_UPDATE_NOTIF = 'gauge.notification.suppressUpdateNotification';
const GAUGE_VSCODE_VERSION = 'gauge.version';
const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';
let launchConfig;

let treeDataProvider: Disposable = new Disposable(() => undefined);
let clients: Map<string, LanguageClient> = new Map();
let outputChannel: OutputChannel = window.createOutputChannel('gauge');

export function activate(context: ExtensionContext) {
    let gaugeVersionInfo = getGaugeVersionInfo();
    if (!gaugeVersionInfo || !gaugeVersionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        notifyToInstallGauge(`Cannot find 'gauge' executable or a compatible version (>=${MINIMUM_SUPPORTED_GAUGE_VERSION}) in PATH.`);
        return;
    }
    languages.setLanguageConfiguration('gauge', {
		wordPattern: /^(?:[*])([^*].*)$/g
	});

    workspace.workspaceFolders.forEach(folder => startServerFor(folder));
    setCommandContext(GaugeCommandContext.MultiProject, clients.size > 1);

    workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.added) onFolderAddition(event, context);
        if (event.removed) onFolderDeletion(event, context);
        setCommandContext(GaugeCommandContext.MultiProject, clients.size > 1)
    });
    notifyOnNewGaugeVsCodeVersion(context, extensions.getExtension(GAUGE_EXTENSION_ID)!.packageJSON.version);
    registerStopExecution(context);

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        return execute(spec, { inParallel: false, status: spec, projectRoot: cwd })
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        return execute(spec, { inParallel: true, status: spec, projectRoot: cwd })
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (context: ExtensionContext, selection: string) => { execute(null, { rerunFailed: true, status: "failed scenarios", projectRoot: selection }); });
        return execute(null, { rerunFailed: true, status: "failed scenarios", projectRoot: getDefaultFolder() });
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteSpec, () => { return runSpecification() }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecs, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (context: ExtensionContext, selection: string) => { runSpecification(selection); });
        return runSpecification(getDefaultFolder());
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteScenario, (scn: Scenario) => {
        if (scn) return execute(scn.executionIdentifier, { inParallel: false, status: scn.executionIdentifier, projectRoot: getBaseFolderByFile(scn.file) });
        return runScenario(clients, true);
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteScenarios, (scn: Scenario) => {
        if (scn) return execute(scn.executionIdentifier, { inParallel: false, status: scn.executionIdentifier, projectRoot: getDefaultFolder() });
        return runScenario(clients, false);
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.CopyStub, copyToClipboard));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ShowReferencesAtCursor, showStepReferencesAtCursor(clients)));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.RepeatExecution, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (context: ExtensionContext, selection: string) => { execute(null, { repeat: true, status: "previous run", projectRoot: selection }); });
        return execute(null, { repeat: true, status: "previous run", projectRoot: getDefaultFolder() });
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ShowReferences, showStepReferences(clients)));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => { reportIssue(gaugeVersionInfo); }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.Open, (node: GaugeNode) => workspace.openTextDocument(node.file).then(showDocumentWithSelection(node))));
    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.SwitchProject, () => showProjectOptions(context, switchTreeDataProvider)));
    registerTreeDataProvider(context, getDefaultFolder(), true);
}


export function deactivate(): Thenable<void> {
    treeDataProvider.dispose();
    let promises: Thenable<void>[] = [];
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}

function onFolderAddition(event: WorkspaceFoldersChangeEvent, context: ExtensionContext) {
    for (let folder of event.added) {
        if (!clients.has(folder.uri.fsPath)) {
            startServerFor(folder);
        }
    }
}

function onFolderDeletion(event: WorkspaceFoldersChangeEvent, context: ExtensionContext) {
    for (let folder of event.removed) {
        if (!clients.has(folder.uri.fsPath)) return;
        let client = clients.get(folder.uri.fsPath);
        clients.delete(folder.uri.fsPath);
        client.stop();
        switchTreeDataProvider(context, getDefaultFolder())
    }
}

function showDocumentWithSelection(node: GaugeNode): (value: TextDocument) => TextEditor | Thenable<TextEditor> {
    return document => {
        if (node instanceof Scenario) {
            let scenarioNode: Scenario = node;
            let options: TextDocumentShowOptions = {
                selection: new Range(new Position(scenarioNode.lineNo - 1, 0), new Position(scenarioNode.lineNo - 1, 0))
            };
            return window.showTextDocument(document, options);
        }
        return window.showTextDocument(document);
    };
}

function startServerFor(folder: WorkspaceFolder) {
    if (!fs.existsSync(path.join(folder.uri.fsPath, "manifest.json"))) {
        return
    }
    let serverOptions = {
        command: 'gauge',
        args: ["daemon", "--lsp", "--dir=" + folder.uri.fsPath],
    };

    launchConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
    if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
        serverOptions.args.push("-l");
        serverOptions.args.push("debug");
    }
    ;
    let clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'gauge', pattern: `${folder.uri.fsPath}/**/*` }],
        diagnosticCollectionName: 'gauge',
        workspaceFolder: folder,
        outputChannel: outputChannel,
        revealOutputChannelOn: RevealOutputChannelOn.Error,
    };
    let languageClient = new LanguageClient('gauge', 'Gauge', serverOptions, clientOptions);

    clients.set(folder.uri.fsPath, languageClient);
    languageClient.start();
}

function registerTreeDataProvider(context: ExtensionContext, projectPath: string, registerRefresh?: boolean) {
    let client = clients.get(projectPath);
    client.onReady().then(() => {
        let specExplorerConfig = workspace.getConfiguration('gauge.specExplorer');
        if (specExplorerConfig && specExplorerConfig.get<boolean>('enabled')) {
            let provider = new SpecNodeProvider(projectPath, client);
            treeDataProvider = window.registerTreeDataProvider(GaugeCommandContext.GaugeSpecExplorer, provider);
            if (registerRefresh) {
                context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.RefreshExplorer, () => provider.refresh()));
            }
            setTimeout(setCommandContext, 1000, GaugeCommandContext.Activated, true);
        }
    }).catch((reason) => {
        window.showErrorMessage("Failed to create test explorer.", reason);
    })
}

function registerStopExecution(context: ExtensionContext) {
    let stopExecution = window.createStatusBarItem(StatusBarAlignment.Left, 2);
    stopExecution.command = GaugeVSCodeCommands.StopExecution;
    stopExecution.tooltip = 'Click to Stop Run';
    context.subscriptions.push(stopExecution);
    onBeforeExecute((s) => {
        stopExecution.text = `$(primitive-square) Running ${s}`;
        stopExecution.show();
    });
    onExecuted(() => stopExecution.hide());
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.StopExecution, () => { cancel(); }));
}

function getDefaultFolder() {
    let projects: any = [];
    clients.forEach((v, k) => projects.push(k));
    return projects.sort((a: any, b: any) => a > b)[0];
}

function getBaseFolderByFile(file: string) {
    let baseFolder: string = "";
    for (let folder of clients.keys()) {
        if (file.startsWith(folder)) {
            baseFolder = folder;
        }
    }
    return baseFolder;
}


function showProjectOptions(context: ExtensionContext, onChange: Function) {
    let projectItems = [];
    clients.forEach((v, k) => projectItems.push({ label: path.basename(k), description: k }));
    return window.showQuickPick(projectItems).then((selected) => {
        return onChange(context, selected.description);
    }, (err) => {
        window.showErrorMessage('Unable to select project.', err)
    })
}

function switchTreeDataProvider(context: ExtensionContext, projectPath: string) {
    treeDataProvider.dispose();
    setCommandContext(GaugeCommandContext.Activated, false);
    registerTreeDataProvider(context, projectPath, false);
}

function notifyToInstallGauge(message: string) {
    window.showWarningMessage(message, 'Install').then(selected => {
        if (selected === 'Install') {
            opn('https://getgauge.io/get-started.html');
        }
    });
}

function reportIssue(gaugeVersion: GaugeVersionInfo) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let issueTemplate = `\`\`\`
VS-Code version: ${version}
Gauge Extension Version: ${extVersion}

${gaugeVersion.toString()}
\`\`\``;

    return opn(`https://github.com/getgauge/gauge-vscode/issues/new?body=${escape(issueTemplate)}`).then(() => { }, (err) => {
        window.showErrorMessage("Can't open issue URL. " + err);
    });
}

function showStepReferences(clients: Map<string, LanguageClient>): (uri: string, position: LSPosition, stepValue: string) => Thenable<any> {
    return (uri: string, position: LSPosition, stepValue: string) => {
        let languageClient = clients.get(workspace.getWorkspaceFolder(Uri.parse(uri)).uri.fsPath)
        return languageClient.sendRequest("gauge/stepReferences", stepValue, new CancellationTokenSource().token).then((locations: LSLocation[]) => {
            return showReferences(locations, uri, languageClient, position);
        });
    };
}

function showStepReferencesAtCursor(clients: Map<string, LanguageClient>): () => Thenable<any> {
    return (): Thenable<any> => {
        let position = window.activeTextEditor.selection.active;
        let documentId = TextDocumentIdentifier.create(window.activeTextEditor.document.uri.toString());
        let languageClient = clients.get(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath);
        let params = { textDocument: documentId, position: position };
        return languageClient.sendRequest("gauge/stepValueAt", params, new CancellationTokenSource().token).then((stepValue: string) => {
            return showStepReferences(clients)(documentId.uri, position, stepValue);
        });
    }
}

function showReferences(locations: LSLocation[], uri: string, languageClient: LanguageClient, position: LSPosition): Thenable<any> {
    if (locations) {
        return commands.executeCommand(VSCodeCommands.ShowReferences, Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
            locations.map(languageClient.protocol2CodeConverter.asLocation));
    }
    window.showInformationMessage('No reference found!');
    return Promise.resolve(false);
}

function onConfigurationChange() {
    return workspace.onDidChangeConfiguration(params => {
        let newConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
        if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG) != newConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
            let msg = 'Gauge Language Server configuration changed, please restart VS Code.';
            let action = 'Restart Now';
            launchConfig = newConfig;
            window.showWarningMessage(msg, action).then((selection) => {
                if (action === selection) {
                    commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });
}

function notifyOnNewGaugeVsCodeVersion(context: ExtensionContext, latestVersion: string) {
    if (workspace.getConfiguration().get<boolean>(GAUGE_SUPPRESS_UPDATE_NOTIF)) return
    const gaugeVsCodePreviousVersion = context.globalState.get<string>(GAUGE_VSCODE_VERSION);
    context.globalState.update(GAUGE_VSCODE_VERSION, latestVersion);
    if (!gaugeVsCodePreviousVersion || gaugeVsCodePreviousVersion === latestVersion) return;
    showUpdateMessage(latestVersion);
}

function showUpdateMessage(version: string) {
    let actions = {
        'Show Release Notes': () => opn('https://github.com/getgauge/gauge-vscode/releases/tag/v' + version),
        'Do not show this again': () => workspace.getConfiguration().update(GAUGE_SUPPRESS_UPDATE_NOTIF, true),
    };
    window.showInformationMessage("Gauge updated to version " + version, 'Show Release Notes', 'Do not show this again').then(selected => {
        actions[selected]();
    });
}

function copyToClipboard(code: string) {
    copyPaste.copy(code);
    window.showInformationMessage("Step Implementation copied to clipboard");
}