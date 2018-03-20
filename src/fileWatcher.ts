'use strict';

import { Disposable, ExtensionContext, FileSystemWatcher, workspace, Uri } from "vscode";
import { LanguageClient, TextDocumentIdentifier } from "vscode-languageclient";

export class FileWatcher implements Disposable {
    private watcher: FileSystemWatcher;
    private onDeleteHandlers: Array<Function>;
    private onCreateHandlers: Array<Function>;

    public constructor() {
        this.watcher = workspace.createFileSystemWatcher("**/*");
        this.onCreateHandlers = new Array<Function>();
        this.onDeleteHandlers = new Array<Function>();
        this.watcher.onDidCreate((uri: Uri) => {
            this.onCreateHandlers.forEach((handler: Function) => {
                handler(uri);
            });
        });
        this.watcher.onDidDelete((uri: Uri) => {
            this.onDeleteHandlers.forEach((handler: Function) => {
                handler(uri);
            });
        });
    }

    public addOnCreateHandler(handler: Function) {
        this.onCreateHandlers.push(handler);
    }

    public addOnDeleteHandler(handler: Function) {
        this.onDeleteHandlers.push(handler);
    }

    dispose() {
        this.watcher.dispose();
    }
}

export function registerFileSystemWatcher(fileWatcher: FileWatcher, clients: Map<string, LanguageClient>) {
    fileWatcher.addOnCreateHandler((uri: Uri) => {
        const client = clients.get(workspace.getWorkspaceFolder(uri).uri.fsPath);
        if (client) {
            client.sendNotification('textDocument/didCreate', TextDocumentIdentifier.create(
                client.code2ProtocolConverter.asUri(uri)
            ));
        }
    });
    fileWatcher.addOnDeleteHandler((uri: Uri) => {
        const client = clients.get(workspace.getWorkspaceFolder(uri).uri.fsPath);
        if (client) {
            client.sendNotification('textDocument/didDelete', TextDocumentIdentifier.create(
                client.code2ProtocolConverter.asUri(uri)
            ));
        }
    });
}