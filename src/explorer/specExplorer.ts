'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeVSCodeCommands, GaugeRequests, setCommandContext, GaugeCommandContext } from '../constants';
import { FileWatcher } from '../fileWatcher';
import { Disposable, Uri, workspace, window } from 'vscode';

const extensions = [".spec", ".md"];

export class SpecNodeProvider implements vscode.TreeDataProvider<GaugeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<GaugeNode | undefined> =
        new vscode.EventEmitter<GaugeNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<GaugeNode | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private workspaceRoot: string,
        private fileWatcher: FileWatcher,
        private languageClient?: LanguageClient
    ) {
        setCommandContext(GaugeCommandContext.Activated, false);
        if (isSpecExplorerEnabled()) {
            const disposable = window.registerTreeDataProvider(GaugeCommandContext.GaugeSpecExplorer, this);
            context.subscriptions.push(disposable);
            this.activateTreeDataProvider(this.languageClient, workspaceRoot);
            vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
                if (this.shouldRefresh(doc.uri)) {
                    this.refresh();
                }
            });
            vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh());
            vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => {
                if (this.shouldRefresh(doc.uri)) {
                    this.refresh();
                }
            });
            const refreshMethod = (fileUri: vscode.Uri) => {
                if (this.shouldRefresh(fileUri)) {
                    this.refresh();
                }
            };
            this.fileWatcher.addOnCreateHandler(refreshMethod);
            this.fileWatcher.addOnDeleteHandler(refreshMethod);
        }
    }

    private shouldRefresh(fileUri: vscode.Uri): boolean {
        return extensions.includes(path.extname(fileUri.fsPath)) &&
            vscode.workspace.getWorkspaceFolder(fileUri).uri.fsPath === this.workspaceRoot;
    }

    changeClient(client: LanguageClient, projectPath: string) {
        setCommandContext(GaugeCommandContext.Activated, false);
        if (isSpecExplorerEnabled()) {
            this.activateTreeDataProvider(client, projectPath);
        }
    }

    private activateTreeDataProvider(client: LanguageClient, projectPath: string) {
        if (!client) return;
        client.onReady().then(() => {
            this.languageClient = client;
            this.refresh();
            this.workspaceRoot = projectPath;
            setTimeout(setCommandContext, 1000, GaugeCommandContext.Activated, true);
        }).catch((reason) => {
            window.showErrorMessage("Failed to create test explorer.", reason);
        });
    }

    refresh(element?: GaugeNode): void {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: GaugeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GaugeNode): Thenable<GaugeNode[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No dependency in empty workspace');
            return Promise.resolve([]);
        }
        if (!this.languageClient) return Promise.resolve([]);

        return new Promise((resolve, reject) => {
            if (element && element.contextValue === "specification") {
                let uri = TextDocumentIdentifier.create(element.file);
                return this.languageClient.sendRequest(GaugeRequests.Scenarios, {
                    textDocument: uri,
                    position: new vscode.Position(1, 1)
                }, new vscode.CancellationTokenSource().token).then(
                    (val: any[]) => {
                        resolve(val.map((x) => {
                            const specFile = x.executionIdentifier.split(":" + x.lineNo)[0];
                            return new Scenario(x.heading, specFile, x.lineNo);
                        }));
                    },
                    (reason) => { console.log(reason); reject(reason); }
                );
            } else {
                let token = new vscode.CancellationTokenSource().token;
                return this.languageClient.sendRequest(GaugeRequests.Specs, {}, token)
                    .then(
                        (val: any[]) => {
                            resolve(val.map((x) => {
                                if (x.heading) {
                                    return new Spec(x.heading, x.executionIdentifier);
                                }
                            }));
                        }
                    );
            }
        });
    }
}

export abstract class GaugeNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly file: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
    }
    command = { title: 'Open File', command: GaugeVSCodeCommands.Open, arguments: [this] };
}

export class Spec extends GaugeNode {

    constructor(
        public readonly label: string,
        public readonly file: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed, file);
    }

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

    contextValue = 'scenario';
}

function isSpecExplorerEnabled(): boolean {
    let specExplorerConfig = workspace.getConfiguration('gauge.specExplorer');
    return specExplorerConfig && specExplorerConfig.get<boolean>('enabled');
}