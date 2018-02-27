import * as path from 'path';

import { Disposable, commands, ExtensionContext, workspace, window, CancellationTokenSource } from "vscode";
import { LanguageClient } from 'vscode-languageclient';

import { GaugeVSCodeCommands, VSCodeCommands, GaugeRequests } from "../constants";
import { FileListItem } from '../types/fileListItem';
import { WorkspaceEditor } from './workspaceEditor';
import { getFileLists } from "../util";

export class ExtractConceptCommandProvider extends Disposable {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;
    private readonly _clients: Map<string, LanguageClient>;

    constructor(context: ExtensionContext, clients: Map<string, LanguageClient>) {
        super(() => this.dispose());

        this._context = context;
        this._clients = clients;
        this._disposable = commands.registerCommand(GaugeVSCodeCommands.ExtractConcept, (range) => {
            this.extractConcept(range);
        });
    }

    extractConcept(info: any) {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        let languageClient = this._clients.get(cwd);
        let options = { prompt: "Enter concept name", placeHolder: "example: my new <concept>" };
        window.showInputBox(options).then((conceptName: string) => {
            if (!conceptName) return;
            info.conceptName = conceptName;
            let t = new CancellationTokenSource().token;
            languageClient.sendRequest(GaugeRequests.Files, { concept: true }, t).then((files: string[]) => {
                window.showQuickPick(getFileLists(files, cwd, false)).then((selected) => {
                    if (!selected) return;
                    this.performExtraction(selected, info, languageClient);
                }, this.handleError);
            }, this.handleError);
        }, this.handleError);
    }

    private performExtraction(selected: FileListItem, info: any, languageClient: LanguageClient) {
        info.conceptFile = selected.value;
        let token = new CancellationTokenSource().token;
        languageClient.sendRequest(GaugeRequests.ExtractConcept, info, token).then((edit) => {
            let editor = new WorkspaceEditor(languageClient.protocol2CodeConverter.asWorkspaceEdit(edit));
            editor.applyChanges();
        }, this.handleError);
    }

    private handleError(reason: string) {
        window.showErrorMessage('Failed to extract into concept. ' + reason);
    }

    dispose() {
        this._disposable.dispose();
    }
}
