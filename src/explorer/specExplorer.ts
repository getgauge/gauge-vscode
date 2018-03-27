'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeVSCodeCommands, GaugeRequests } from '../constants';
import {
    commands, workspace, TextDocument, Uri, Position, Range, window,
    TextDocumentShowOptions, TextEditor, Disposable
} from 'vscode';
import { GaugeExecutor } from '../execution/gaugeExecutor';
const SPEC_FILE_PATTERN = `**/*.spec`;

const extensions = [".spec", ".md"];

export class SpecNodeProvider extends Disposable implements vscode.TreeDataProvider<GaugeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<GaugeNode | undefined> =
        new vscode.EventEmitter<GaugeNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<GaugeNode | undefined> = this._onDidChangeTreeData.event;
    private activeFolder: string;
    private _disposable: Disposable;

    constructor(private workspaceRoot: string, private languageClient: LanguageClient,
                private executor: GaugeExecutor) {
        super(() => this.dispose());
        this.activeFolder = workspaceRoot;
        vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
            if (extensions.includes(path.extname(doc.fileName))) {
                this.refresh();
            }
        });
        workspace.onDidChangeWorkspaceFolders(() => this.refresh());
        workspace.onDidCloseTextDocument((doc: TextDocument) => {
            if (extensions.includes(path.extname(doc.fileName))) {
                this.refresh();
            }
        });
        let specWatcher = workspace.createFileSystemWatcher(SPEC_FILE_PATTERN);
        specWatcher.onDidCreate(() => this.refresh());
        specWatcher.onDidDelete(() => this.refresh());

        this._disposable = Disposable.from(
        commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecExplorer, () => {
            return this.executor.runSpecification(this.activeFolder);
        }),
        commands.registerCommand(GaugeVSCodeCommands.ExecuteScenario, (scn: Scenario) => {
            if (scn) return this.executor.execute(scn.executionIdentifier, {
                inParallel: false,
                status: scn.executionIdentifier,
                projectRoot: workspace.getWorkspaceFolder(Uri.file(scn.file)).uri.fsPath
            });
            return this.executor.runScenario(true);
        }),
        commands.registerCommand(GaugeVSCodeCommands.ExecuteSpec, (spec: Spec) => {
            if (spec) {
                return this.executor.execute(spec.file, {
                    inParallel: false,
                    status: spec.file,
                    projectRoot: workspace.getWorkspaceFolder(Uri.file(spec.file)).uri.fsPath
                });
            }
            return this.executor.runSpecification();
        }),
        commands.registerCommand(GaugeVSCodeCommands.Open,
            (node: GaugeNode) => workspace.openTextDocument(node.file).then(this.showDocumentWithSelection(node)))
        );
    }

    updateSpecExplorerActiveFolder(folder) {
        this.activeFolder = folder;
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

    private showDocumentWithSelection(node: GaugeNode): (value: TextDocument) => TextEditor | Thenable<TextEditor> {
        return (document) => {
            if (node instanceof Scenario) {
                let scenarioNode: Scenario = node;
                let options: TextDocumentShowOptions = {
                    selection: new Range(new Position(scenarioNode.lineNo - 1, 0),
                    new Position(scenarioNode.lineNo - 1, 0))
                };
                return window.showTextDocument(document, options);
            }
            if (node instanceof Spec) {
                let options: TextDocumentShowOptions = {
                    selection: new Range(new Position(0, 0), new Position(0, 0))
                };
                return window.showTextDocument(document, options);
            }
            return window.showTextDocument(document);
        };
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