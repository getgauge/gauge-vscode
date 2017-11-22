import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeCommands } from '../commands';

export class SpecNodeProvider implements vscode.TreeDataProvider<GaugeNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<Spec | undefined> = new vscode.EventEmitter<Spec | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Spec | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string, private languageClient: LanguageClient) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: GaugeNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: GaugeNode): Thenable<GaugeNode[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		return new Promise((resolve,reject) => {
			if (element && element.contextValue==="specification") {
				let uri = TextDocumentIdentifier.create(element.file);
				return this.languageClient.sendRequest("gauge/scenarios", { textDocument: uri, position: new vscode.Position(1,1) }, new vscode.CancellationTokenSource().token).then(
					(val: any[]) => {
						resolve(val.map(x => {
							var specFile = x.executionIdentifier.split(":" + x.lineNo)[0];
							return new Scenario(x.heading, specFile, x.lineNo);
						}));
					},
					(reason) => {console.log(reason);reject(reason)}
				);
			} else {
				return this.languageClient.sendRequest("gauge/specs", {}, new vscode.CancellationTokenSource().token).then(
					(val: any[]) => {
						resolve(val.map(x => new Spec(x.heading, x.executionIdentifier)));
					}
				);
			}
		});
	}
}


export abstract class GaugeNode extends vscode.TreeItem{
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly file: string
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
	command = {title:'Open File', command: GaugeCommands.Open, arguments: [this]}
}

class Spec extends GaugeNode {

	constructor(
		public readonly label: string,
		public readonly file: string
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed, file);
	}

	iconPath = {
		light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'folder.svg'),
		dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'folder.svg')
	};

	contextValue = 'specification';
}

export class Scenario extends GaugeNode {

	constructor(
		public readonly label: string,
		public readonly file: string,
		public readonly lineNo: number,
	) {
		super(label, vscode.TreeItemCollapsibleState.None, file);
	}

	readonly executionIdentifier = this.file + ":" + this.lineNo;

	iconPath = {
		light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'document.svg'),
		dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'document.svg')
	};

	contextValue = 'scenario';
}