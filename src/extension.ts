'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';
import vscode = require('vscode');
import fs = require('fs');

import { execute } from "./execution/gaugeExecution"

export function activate(context: ExtensionContext) {
	if (fs.readdirSync(vscode.workspace.rootPath).includes("manifest.json")) {
		let disposable = new LanguageClient(
			'langserver',
			{
				command: 'gauge',
				args: ["daemon", "--lsp", "--dir=" + vscode.workspace.rootPath],
			},
			{
				documentSelector: ['markdown'],
			}
		).start();

		context.subscriptions.push(vscode.commands.registerCommand('gauge.execute', (args) => { execute(args, false) }));
		context.subscriptions.push(vscode.commands.registerCommand('gauge.execute.inParallel', (args) => { execute(args, true) }));
		context.subscriptions.push(disposable);

		return {
			extendMarkdownIt(md) {
				md.options.html = false;
				return md;
			}
		}
	}
}
