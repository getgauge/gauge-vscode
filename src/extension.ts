'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, Location as LSLocation, Position as LSPosition, RevealOutputChannelOn } from 'vscode-languageclient';
import vscode = require('vscode');
import fs = require('fs');
import cp = require('child_process');
import opn = require('opn');
import copyPaste = require('copy-paste');
import { execute } from "./execution/gaugeExecution";

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
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute', (args) => { execute(args, false) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.inParallel', (args) => { execute(args, true) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.failed', () => { execute(null, { rerunFailed: true }) }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.copy.unimplemented.stub', (code: string) => { copyPaste.copy(code); }));
    context.subscriptions.push(vscode.commands.registerCommand('gauge.showReferences', (uri: string, position: LSPosition, locations: LSLocation[]) => {
        if (locations && locations.length > 0) {
            vscode.commands.executeCommand('editor.action.showReferences', Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position),
                locations.map(languageClient.protocol2CodeConverter.asLocation))
        }
    }));
    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(disposable);

    return {
        extendMarkdownIt(md) {
            md.options.html = false;
            return md;
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
