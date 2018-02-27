import { LanguageClient, Disposable } from "vscode-languageclient";
import { commands, workspace, window, CancellationTokenSource } from "vscode";
import * as path from 'path';

import copyPaste = require("copy-paste");

import { GaugeVSCodeCommands, GaugeRequests } from "../constants";
import { FileListItem } from "../types/fileListItem";
import { WorkspaceEditor } from "../refactor/workspaceEditor";
import { getFileLists } from "../util";

export class GenerateStubCommandProvider implements Disposable {
    private readonly _clients: Map<string, LanguageClient>;
    private readonly _disposable: Disposable;

    constructor(clients: Map<string, LanguageClient>) {
        this._clients = clients;
        this._disposable = commands.registerCommand(GaugeVSCodeCommands.GenerateStub, (code: string) => {
            return this.generateStub(code);
        });
    }

    private generateStub(code: string) {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        let languageClient = this._clients.get(cwd);
        let token = new CancellationTokenSource().token;
        languageClient.sendRequest(GaugeRequests.Files, token).then((files: string[]) => {
            window.showQuickPick(getFileLists(files, cwd)).then((selected: FileListItem) => {
                if (!selected) return;
                if (selected.isCopyToClipBoard()) {
                    copyPaste.copy(code);
                    window.showInformationMessage("Step Implementation copied to clipboard");
                } else {
                    this.generateInFile(selected, code, languageClient);
                }
            }, this.handleError);
        }, this.handleError);
    }

    private generateInFile(selected: FileListItem, code: string, languageClient: LanguageClient) {
        let param = { implementationFilePath: selected.value, codes: [code] };
        let token = new CancellationTokenSource().token;
        languageClient.sendRequest(GaugeRequests.AddStub, param, token).then((e) => {
            let editor = new WorkspaceEditor(languageClient.protocol2CodeConverter.asWorkspaceEdit(e));
            editor.applyChanges();
        }, this.handleError);
    }

    private handleError(reason: string) {
        window.showErrorMessage('Unable to generate implementation.', reason);
    }

    dispose() {
        this._disposable.dispose();
    }
}
