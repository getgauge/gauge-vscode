'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, Uri, extensions, commands } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, Location as LSLocation, Position as LSPosition, RevealOutputChannelOn, TextDocumentIdentifier } from 'vscode-languageclient';
import { escape } from "querystring";
import vscode = require('vscode');
import fs = require('fs');
import cp = require('child_process');
import opn = require('opn');
import copyPaste = require('copy-paste');
import { execute, runScenario, runSpecification } from "./execution/gaugeExecution";

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';
let launchConfig;

export function activate(context: ExtensionContext) {
    let gaugeVersion = cp.spawnSync('gauge', ['-v']);
    if (gaugeVersion.error) {
        vscode.window.showWarningMessage("Cannot find 'gauge' executable in PATH.", 'Install').then(selected => {
            if (selected === 'Install') {
                opn('https://getgauge.io/get-started.html');
            }
        });
        return
    }
    let serverOptions = {
        command: 'gauge',
        args: ["daemon", "--lsp", "--dir=" + vscode.workspace.rootPath],
    }
    launchConfig = vscode.workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
    if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
        serverOptions.args.push("-l")
        serverOptions.args.push("debug")
    };
    let clientOptions = {
        documentSelector: ['markdown'],
        revealOutputChannelOn: RevealOutputChannelOn.Never,
    };
    let languageClient = new LanguageClient('Gauge', serverOptions, clientOptions);
    let disposable = languageClient.start();

    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute', (args) => { execute(args, { inParallel: false }) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.inParallel', (args) => { execute(args, { inParallel: false }) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.failed', () => { return execute(null, { rerunFailed: true }) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.repeat', () => { return execute(null, { repeat: true }) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.specification', () => { return runSpecification() }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.specification.all', () => { return runSpecification(true) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.scenario', () => { return runScenario(languageClient, true) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.scenarios', () => { return runScenario(languageClient, false) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.copy.unimplemented.stub', (code: string) => {
        copyPaste.copy(code);
        vscode.window.showInformationMessage("Step Implementation copied to clipboard");
    }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.showReferences.atCursor', showStepReferencesAtCursor(languageClient)));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.showReferences', showCodeLensReferences(languageClient)));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.help.reportIssue', () => { reportIssue(gaugeVersion) }));
    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(disposable);

    return {
        extendMarkdownIt(md) {
            md.options.html = false;
            return md;
        }
    }
}

function reportIssue(gaugeVersion: cp.SpawnSyncReturns<string>) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let issueTemplate = `\`\`\`
VS-Code version: ${vscode.version}
Gauge Extension Version: ${extVersion}

${gaugeVersion.stdout.toString()}
\`\`\``;

    return opn(`https://github.com/getgauge/gauge-vscode/issues/new?body=${escape(issueTemplate)}`).then(() => { }, (err) => {
        vscode.window.showErrorMessage("Can't open issue URL. " + err);
    });
}

function showCodeLensReferences(languageClient: LanguageClient): (uri: string, position: LSPosition, stepValue: string) => Thenable<any> {
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
            return showCodeLensReferences(languageClient)(documentId.uri, position, stepValue);
        });
    }
}

function showReferences(locations: LSLocation[], uri: string, languageClient: LanguageClient, position: LSPosition): Thenable<any> {
    if (locations) {
        return vscode.commands.executeCommand('editor.action.showReferences', Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
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
