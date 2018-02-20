import fs = require('fs');
import * as path from 'path';
import {
    workspace, WorkspaceEdit, window, CancellationTokenSource, QuickPickItem, TextDocument, Selection, Uri
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import copyPaste = require('copy-paste');

const NEW_FILE = 'New File';
const COPY_TO_CLIPBOARD = 'Copy To Clipboard';
const GAUGE_FILES_REQUEST = "gauge/getImplFiles";

function writeToFileInTextEditor(fileName: string, fileEdits: WorkspaceEdit): void {
    if (!fs.existsSync(fileName)) {
        workspace.openTextDocument().then((document: TextDocument) => {
            window.showTextDocument(document).then(() => {
                let newFileEdits = new WorkspaceEdit();
                newFileEdits.set(document.uri, fileEdits.entries()[0][1]);
                workspace.applyEdit(newFileEdits);
            });
        });
    } else {
        workspace.openTextDocument(fileName).then((document: TextDocument) => {
            window.showTextDocument(document).then(() => {
                workspace.applyEdit(fileEdits);
            });
        });
    }
}

function addImplementationToFile(languageClient: LanguageClient, fileName: string, code: string) {
    if (fileName === NEW_FILE) {
        fileName = "";
    }
    languageClient.sendRequest("gauge/putStubImpl", {
        implementationFilePath: fileName, codes: [code]
    }, new CancellationTokenSource().token).then((edit) => {
        writeToFileInTextEditor(fileName, languageClient.protocol2CodeConverter.asWorkspaceEdit(edit));
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

export function generateStub(clients: Map<String, LanguageClient>, code: string) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    let languageClient = clients.get(cwd);
    languageClient.sendRequest(GAUGE_FILES_REQUEST, new CancellationTokenSource().token).then(
        (files: string[]) => {
            window.showQuickPick(getQuickPickList(files, cwd)).then((selected) => {
                if (selected) {
                    if (selected.value === COPY_TO_CLIPBOARD) {
                        copyPaste.copy(code);
                        window.showInformationMessage("Step Implementation copied to clipboard");
                    } else {
                        addImplementationToFile(languageClient, selected.value, code);
                    }
                }
            }, (err) => {
                window.showErrorMessage('Unable to select file.', err);
            });
        }
    );
}

export function extractConcept(clients: Map<String, LanguageClient>, info: any) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    let lc = clients.get(cwd);
    let options = { prompt: "Enter concpet name", placeHolder: "example: my new <concpet>" };
    window.showInputBox(options).then((cptName: string) => {
        if (cptName) {
            info.conceptName = cptName;
            let t = new CancellationTokenSource().token;
            lc.sendRequest(GAUGE_FILES_REQUEST, { concept: true }, t).then((files: string[]) => {
                window.showQuickPick(getQuickPickList(files, cwd, false)).then((selected) => {
                    let uri = Uri.file(selected.value);
                    window.showTextDocument(uri);
                });
            }, (reason: any) => {
                console.log('Failed to extract. ' + reason);
            });
        }
    }, (reason: any) => {
        console.log('Failed to extract. ' + reason);
    });
}

function getQuickPickList(files: string[], cwd: string, copyToClipboard = true): FileListItem[] {
    const showFileList: FileListItem[] = files.map((file) => {
        return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file);
    });
    const quickPickFileList = [new FileListItem(NEW_FILE, "", NEW_FILE)];
    if (copyToClipboard) {
        quickPickFileList.push(new FileListItem(COPY_TO_CLIPBOARD, "", COPY_TO_CLIPBOARD));
    }
    return quickPickFileList.concat(showFileList);
}