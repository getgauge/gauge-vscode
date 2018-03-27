'use strict';

import { Disposable, ExtensionContext, FileSystemWatcher, workspace, Uri } from "vscode";
import { LanguageClient, TextDocumentIdentifier } from "vscode-languageclient";
import { GaugeWorkspace } from "./gaugeWorkspace";

export class FileWatcher extends Disposable {
    private _watcher: FileSystemWatcher;
    private _onDeleteHandlers: Array<Function>;
    private _onCreateHandlers: Array<Function>;

    public constructor(private gaugeWorkspace: GaugeWorkspace) {
        super(() => this.dispose());
        this._watcher = workspace.createFileSystemWatcher("**/*");
        this._onCreateHandlers = new Array<Function>();
        this._onDeleteHandlers = new Array<Function>();
        this._watcher.onDidCreate((uri: Uri) => {
            this._onCreateHandlers.forEach((handler: Function) => {
                handler(uri);
            });
        });
        this._watcher.onDidDelete((uri: Uri) => {
            this._onDeleteHandlers.forEach((handler: Function) => {
                handler(uri);
            });
        });
        this.registerDefaultHandlers();
    }

    private registerDefaultHandlers() {
        this.addOnCreateHandler((uri: Uri) => {
            const client = this.gaugeWorkspace.getClients().get(workspace.getWorkspaceFolder(uri).uri.fsPath);
            if (client) {
                client.sendNotification('textDocument/didCreate', TextDocumentIdentifier.create(
                    client.code2ProtocolConverter.asUri(uri)
                ));
            }
        });
        this.addOnDeleteHandler((uri: Uri) => {
            const client = this.gaugeWorkspace.getClients().get(workspace.getWorkspaceFolder(uri).uri.fsPath);
            if (client) {
                client.sendNotification('textDocument/didDelete', TextDocumentIdentifier.create(
                    client.code2ProtocolConverter.asUri(uri)
                ));
            }
        });
    }

    public addOnCreateHandler(handler: Function) {
        this._onCreateHandlers.push(handler);
    }

    public addOnDeleteHandler(handler: Function) {
        this._onDeleteHandlers.push(handler);
    }

    dispose() {
        this._watcher.dispose();
    }
}
