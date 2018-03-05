'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeVSCodeCommands, GaugeRequests } from '../constants';
const SPEC_FILE_PATTERN = `**/*.spec`;

const extensions = [".spec", ".md"];

export class SpecNodeProvider implements vscode.TreeDataProvider<GaugeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<GaugeNode | undefined> =
        new vscode.EventEmitter<GaugeNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<GaugeNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string, private languageClient: LanguageClient) {
        vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
            if (extensions.includes(path.extname(doc.fileName))) {
                this.refresh();
            }
        });
        vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh());
        vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => {
            if (extensions.includes(path.extname(doc.fileName))) {
                this.refresh();
            }
        });
        let specWatcher = vscode.workspace.createFileSystemWatcher(SPEC_FILE_PATTERN);
        specWatcher.onDidCreate(() => this.refresh());
        specWatcher.onDidDelete(() => this.refresh());
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