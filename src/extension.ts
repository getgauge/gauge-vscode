'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, Uri, extensions, TextDocumentShowOptions, Position, Range } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, TextDocumentIdentifier, Location as LSLocation, Position as LSPosition, RevealOutputChannelOn } from 'vscode-languageclient';
import { escape } from "querystring";
import vscode = require('vscode');
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
const GAUGE_VSCODE_VERSION = 'gauge.vscode.version';
const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';
let launchConfig;

export function activate(context: ExtensionContext) {
    let gaugeVersionInfo = getGaugeVersionInfo();
    if (!gaugeVersionInfo || !gaugeVersionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        notifyToInstallGauge(`Cannot find 'gauge' executable or a compatible version (>=${MINIMUM_SUPPORTED_GAUGE_VERSION}) in PATH.`);
        return
    }

    let serverOptions = {
        command: 'gauge',
        args: ["daemon", "--lsp", "--dir=" + vscode.workspace.rootPath],
    };

    launchConfig = vscode.workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
    if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
        serverOptions.args.push("-l")
        serverOptions.args.push("debug")
    };

    let clientOptions = {
        documentSelector: ['gauge'],
        revealOutputChannelOn: RevealOutputChannelOn.Never,
    };
    let languageClient = new LanguageClient('Gauge', serverOptions, clientOptions);
    let disposable = languageClient.start();

    var notifyNewVersion = notifyOnNewGaugeVsCodeVersion(context,extensions.getExtension(GAUGE_EXTENSION_ID)!.packageJSON.version);

    registerStopExecution(context);
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => { return execute(spec, { inParallel: false, status: spec }) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => { return execute(spec, { inParallel: true, status: spec }) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => { return execute(null, { rerunFailed: true, status: "failed scenarios" }) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteSpec, () => { return runSpecification() }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecs, () => { return runSpecification(true) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteScenario, () => { return runScenario(languageClient, true) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ExecuteScenarios, (scn: Scenario) => {
        if (scn) {
            return execute(scn.executionIdentifier, { inParallel: false, status: scn.executionIdentifier })
        }
        return runScenario(languageClient, false)
    }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.CopyStub, (code: string) => {
        copyPaste.copy(code);
        vscode.window.showInformationMessage("Step Implementation copied to clipboard");
    }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ShowReferencesAtCursor, showStepReferencesAtCursor(languageClient)));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.RepeatExecution, () => { return execute(null, { repeat: true, status: "previous run" }) }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ShowReferences, showStepReferences(languageClient)));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => { reportIssue(gaugeVersionInfo); }));
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.Open, (node: GaugeNode) => {
        return vscode.workspace.openTextDocument(node.file).then(document => {
            if (node instanceof Scenario) {
                let scenarioNode: Scenario = node
                let options: TextDocumentShowOptions = {
                    selection: new Range(new Position(scenarioNode.lineNo - 1, 0), new Position(scenarioNode.lineNo - 1, 0))
                }
                return vscode.window.showTextDocument(document, options)
            }
            return vscode.window.showTextDocument(document);
        });
    }));

    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(disposable);

    const specNodeProvider = new SpecNodeProvider(vscode.workspace.rootPath, languageClient);
    vscode.window.registerTreeDataProvider('gaugeSpecs', specNodeProvider);
    languageClient.onReady().then(
        () => {
            let specExplorerConfig = workspace.getConfiguration('gauge.specExplorer');
            if (specExplorerConfig && specExplorerConfig.get<boolean>('enabled')) {
                let provider = new SpecNodeProvider(vscode.workspace.rootPath, languageClient);
                let treeDataProvider = vscode.window.registerTreeDataProvider(GaugeCommandContext.GaugeSpecExplorer, provider);
                context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.RefreshExplorer, () => provider.refresh()));
                context.subscriptions.push(treeDataProvider);
                setTimeout(setCommandContext, 1000, GaugeCommandContext.Activated, true);
            }
        }
    );
}

function registerStopExecution(context: ExtensionContext) {
    let stopExecution = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
    stopExecution.command = GaugeVSCodeCommands.StopExecution;
    stopExecution.tooltip = 'Click to Stop Run';
    context.subscriptions.push(stopExecution);
    onBeforeExecute((s) => {
        stopExecution.text = `$(primitive-square) Running ${s}`;
        stopExecution.show();
    });
    onExecuted(() => stopExecution.hide());
    context.subscriptions.push(vscode.commands.registerCommand(GaugeVSCodeCommands.StopExecution, () => { cancel(); }));
}

function notifyToInstallGauge(message: string) {
    vscode.window.showWarningMessage(message, 'Install').then(selected => {
        if (selected === 'Install') {
            opn('https://getgauge.io/get-started.html');
        }
    });
}

function reportIssue(gaugeVersion: GaugeVersionInfo) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let issueTemplate = `\`\`\`
VS-Code version: ${vscode.version}
Gauge Extension Version: ${extVersion}

${gaugeVersion.toString()}
\`\`\``;

    return opn(`https://github.com/getgauge/gauge-vscode/issues/new?body=${escape(issueTemplate)}`).then(() => { }, (err) => {
        vscode.window.showErrorMessage("Can't open issue URL. " + err);
    });
}

function showStepReferences(languageClient: LanguageClient): (uri: string, position: LSPosition, stepValue: string) => Thenable<any> {
    return (uri: string, position: LSPosition, stepValue: string) => {
        return languageClient.sendRequest("gauge/stepReferences", stepValue, new vscode.CancellationTokenSource().token).then((locations: LSLocation[]) => {
            return showReferences(locations, uri, languageClient, position);
        });
    };
}

function showStepReferencesAtCursor(languageClient: LanguageClient): () => Thenable<any> {
    return (): Thenable<any> => {
        let position = vscode.window.activeTextEditor.selection.active;
        let documentId = TextDocumentIdentifier.create(vscode.window.activeTextEditor.document.uri.toString());
        return languageClient.sendRequest("gauge/stepValueAt", { textDocument: documentId, position: position }, new vscode.CancellationTokenSource().token).then((stepValue: string) => {
            return showStepReferences(languageClient)(documentId.uri, position, stepValue);
        });
    }
}

function showReferences(locations: LSLocation[], uri: string, languageClient: LanguageClient, position: LSPosition): Thenable<any> {
    if (locations) {
        return vscode.commands.executeCommand(VSCodeCommands.ShowReferences, Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
            locations.map(languageClient.protocol2CodeConverter.asLocation));
    }
    vscode.window.showInformationMessage('No reference found!');
    return Promise.resolve(false);
}

function onConfigurationChange() {
    return workspace.onDidChangeConfiguration(params => {
        let newConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
        if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG) != newConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
            let msg = 'Gauge Language Server configuration changed, please restart VS Code.';
            let action = 'Restart Now';
            launchConfig = newConfig;
            vscode.window.showWarningMessage(msg, action).then((selection) => {
                if (action === selection) {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });
}

function notifyOnNewGaugeVsCodeVersion(context: ExtensionContext, latestVersion: string) {
    if (vscode.workspace.getConfiguration().get<boolean>(GAUGE_SUPPRESS_UPDATE_NOTIF)) return
    const gaugeVsCodePreviousVersion = context.globalState.get<string>(GAUGE_VSCODE_VERSION);
    context.globalState.update(GAUGE_VSCODE_VERSION, latestVersion);

    if (gaugeVsCodePreviousVersion === undefined) return;

    if (gaugeVsCodePreviousVersion === latestVersion) return;

    showUpdateMessage(latestVersion);
}

function showUpdateMessage(version: string) {
    vscode.window.showInformationMessage("Gauge updated to version " + version, 'Show Release Notes', 'Do not show this again').then(selected => {
        if (selected === 'Show Release Notes') {
            opn('https://github.com/getgauge/gauge-vscode/releases/tag/v' + version);
        }
        if (selected === 'Do not show this again') {
            vscode.workspace.getConfiguration().update(GAUGE_SUPPRESS_UPDATE_NOTIF, true);
        }
    });
    return
}
