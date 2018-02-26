import { existsSync } from 'fs';
import * as path from 'path';
import {
    workspace, WorkspaceEdit, window, CancellationTokenSource, CancellationToken, QuickPickItem,
    TextDocument, TextEdit, Uri
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { GaugeRequests } from './constants';
import copyPaste = require('copy-paste');

const NEW_FILE = 'New File';
const COPY_TO_CLIPBOARD = 'Copy To Clipboard';

function writeInDocument(document, edit) {
    window.showTextDocument(document).then(() => {
        let newFileEdits = new WorkspaceEdit();
        newFileEdits.set(document.uri, edit);
        workspace.applyEdit(newFileEdits);
    });
}

function writeToFileInTextEditor(fileName: string, fileEdit: TextEdit[]): void {
    if (!existsSync(fileName)) {
        workspace.openTextDocument().then((document: TextDocument) => {
            writeInDocument(document, fileEdit);
        });
    } else {
        workspace.openTextDocument(fileName).then((document: TextDocument) => {
            writeInDocument(document, fileEdit);
        });
    }
}

export function generateStub(clients: Map<String, LanguageClient>, code: string) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    let lc = clients.get(cwd);
    lc.sendRequest(GaugeRequests.Files, new CancellationTokenSource().token).then(
        (files: string[]) => {
            window.showQuickPick(getQuickPickList(files, cwd)).then((selected) => {
                if (selected) {
                    if (selected.value === COPY_TO_CLIPBOARD) {
                        copyPaste.copy(code);
                        window.showInformationMessage("Step Implementation copied to clipboard");
                    } else {
                        let param = { implementationFilePath: selected.value, codes: [code] };
                        let t = new CancellationTokenSource().token;
                        makeRequestAndApplyChanges(lc, GaugeRequests.AddStub, param, t);
                    }
                }
            }, (err) => {
                window.showErrorMessage('Unable to select file.', err);
            });
        }
    );
}

function hadleExtractFailure(reason) {
    window.showErrorMessage('Failed to extract into concept. ' + reason);
}

export function extractConcept(clients: Map<String, LanguageClient>, info: any) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    let lc = clients.get(cwd);
    let options = { prompt: "Enter concept name", placeHolder: "example: my new <concept>" };
    window.showInputBox(options).then((cptName: string) => {
        if (cptName) {
            info.conceptName = cptName;
            let t = new CancellationTokenSource().token;
            lc.sendRequest(GaugeRequests.Files, { concept: true }, t).then((files: string[]) => {
                window.showQuickPick(getQuickPickList(files, cwd, false)).then((selected) => {
                    if (selected) {
                        info.conceptFile = selected.value;
                        makeRequestAndApplyChanges(lc, GaugeRequests.ExtractConcept, info, t);
                    }
                });
            }, hadleExtractFailure);
        }
    }, hadleExtractFailure);
}

function makeRequestAndApplyChanges(lc: LanguageClient, request: string, param: any, t: CancellationToken) {
    lc.sendRequest(request, param, t).then((e) => {
        let edit = lc.protocol2CodeConverter.asWorkspaceEdit(e);
        edit.entries().forEach((tuple) => {
            writeToFileInTextEditor(tuple[0].fsPath, tuple[1]);
        });
    });
}

class FileListItem implements QuickPickItem {
    label: string;
    description: string;
    value: string;

    constructor(l: string, d: string, v: string) {
        this.label = l;
        this.description = d;
        this.value = v;
    }
}

function getQuickPickList(files: string[], cwd: string, copyToClipboard = true): FileListItem[] {
    const showFileList: FileListItem[] = files.map((file) => {
        return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file);
    });
    const quickPickFileList = [new FileListItem(NEW_FILE, "Create a new file", NEW_FILE)];
    if (copyToClipboard) {
        quickPickFileList.push(new FileListItem(COPY_TO_CLIPBOARD, "", COPY_TO_CLIPBOARD));
    }
    return quickPickFileList.concat(showFileList);
}