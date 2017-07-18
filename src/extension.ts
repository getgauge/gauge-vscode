'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';
import vscode = require('vscode');
import fs = require('fs');
export function activate(context: ExtensionContext) {
	if(fs.readdirSync(vscode.workspace.rootPath).includes("manifest.json")) {
		let disposable = new LanguageClient(
				'langserver',
				{
					command: 'gauge',
					args: ["daemon", "--lsp", "--dir=" + vscode.workspace.rootPath],
				},
				{
					documentSelector: ['gauge'],
				}
			).start();
		context.subscriptions.push(disposable);
	}
}
