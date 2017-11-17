import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class SpecNodeProvider implements vscode.TreeDataProvider<GaugeNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<Spec | undefined> = new vscode.EventEmitter<Spec | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Spec | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string) {
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

		return new Promise(resolve => {
			if (element && element.contextValue==="specification") {
				resolve([
					new Scenario(element.label+"scn1", ""),
					new Scenario(element.label+"scn1", "")
				]);
			} else {
				resolve([
					new Spec("foo", ""),
					new Spec("bar", "")
				]);
			}
		});
	}
}


abstract class GaugeNode extends vscode.TreeItem{
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly file: string
	) {
		super(label, vscode.TreeItemCollapsibleState.Collapsed);
	}
	command= {title:'Open File', command: 'vscode.window.showTextDocument', args: {uri: this.file}}
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

class Scenario extends GaugeNode {

	constructor(
		public readonly label: string,
		public readonly file: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None, file);
	}

	iconPath = {
		light: path.join(__filename, '..', '..', '..', '..', 'resources', 'light', 'document.svg'),
		dark: path.join(__filename, '..', '..', '..', '..', 'resources', 'dark', 'document.svg')
	};

	contextValue = 'scenario';
}