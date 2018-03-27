'use strict';

import { Disposable, ExtensionContext, FileSystemWatcher, workspace, Uri } from "vscode";
import { LanguageClient, TextDocumentIdentifier } from "vscode-languageclient";
import { GaugeWorkspace } from "./gaugeWorkspace";
import { GaugeRequests } from "./constants";
import * as path from 'path';
const negatedFolders = ['.git', '.gauge', 'logs', 'bin', 'gauge_bin', 'reports', 'node_modules',
    'vendor', 'packages', 'libs', '.vscode', 'env', '.gradle'];

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
            if (this.shouldHandleUri(uri)) {
                this._onCreateHandlers.forEach((handler: Function) => {
                    handler(uri);
                });
            }
        });
        this._watcher.onDidDelete((uri: Uri) => {
            if (this.shouldHandleUri(uri)) {
                this._onDeleteHandlers.forEach((handler: Function) => {
                    handler(uri);
                });
            }
        });
        this.registerDefaultHandlers();
    }

    private shouldHandleUri(uri: Uri) {
        const workspaceFolder = workspace.getWorkspaceFolder(uri).uri.fsPath;
        const folders = path.dirname(path.relative(workspaceFolder, uri.fsPath)).split(path.sep);
        return this.gaugeWorkspace.getClients().get(workspaceFolder) &&
            !folders.find(((f) => negatedFolders.indexOf(f) !== -1));
    }

    private registerDefaultHandlers() {
        this.addOnCreateHandler((uri: Uri) => {
            const client = this.gaugeWorkspace.getClients().get(workspace.getWorkspaceFolder(uri).uri.fsPath);
            client.sendNotification(GaugeRequests.DidCreate, TextDocumentIdentifier.create(
                client.code2ProtocolConverter.asUri(uri)
            ));
        });
        this.addOnDeleteHandler((uri: Uri) => {
            const client = this.gaugeWorkspace.getClients().get(workspace.getWorkspaceFolder(uri).uri.fsPath);
            client.sendNotification(GaugeRequests.DidDelete, TextDocumentIdentifier.create(
                client.code2ProtocolConverter.asUri(uri)
            ));
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
