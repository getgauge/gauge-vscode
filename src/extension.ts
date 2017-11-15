'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, Location as LSLocation, Position as LSPosition, RevealOutputChannelOn, CancellationToken } from 'vscode-languageclient';
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
    if (cp.spawnSync('gauge', []).error) {
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
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.specification', () => { return runSpecification() }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.specification.all', () => { return runSpecification(true) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.scenario', () => { return runScenario(languageClient, true) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.scenarios', () => { return runScenario(languageClient, false) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.copy.unimplemented.stub', (code: string) => { copyPaste.copy(code); }));
<<<<<<< HEAD
    context.subscriptions.push(vscode.commands.registerCommand('gauge.showReferences', (uri: string, position: LSPosition, stepValue: string, count: number) => {
        if (count > 0) {
            languageClient.sendRequest("gauge/stepReferences", stepValue, new vscode.CancellationTokenSource().token).then((locations: LSLocation[]) => {
                vscode.commands.executeCommand('editor.action.showReferences', Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
                locations.map(languageClient.protocol2CodeConverter.asLocation))
            });
        }
    }));
=======
    context.subscriptions.push(vscode.commands.registerCommand('gauge.showReferences', showReferences(languageClient)));
>>>>>>> Added global command to run scenarios from command pellate #24
    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(disposable);

    return {
        extendMarkdownIt(md) {
            md.options.html = false;
            return md;
        }
    }
}


function showReferences(languageClient: LanguageClient): any {
    return (uri: string, position: LSPosition, locations: LSLocation[]) => {
        if (locations && locations.length > 0) {
            vscode.commands.executeCommand('editor.action.showReferences', Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
                locations.map(languageClient.protocol2CodeConverter.asLocation));
        }
    }
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
