import fs = require('fs');
import * as path from 'path';
import {
    workspace, WorkspaceEdit, window, CancellationTokenSource, QuickPickItem, TextDocument
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import copyPaste = require('copy-paste');

const NEW_FILE_DISPLAY_MESSAGE = 'New File';
const COPY_TO_CLIPBOARD_DISPLAY_MESSAGE = 'Copy To Clipboard'
const GAUGE_IMPL_FILES_COMMAND = "gauge/getImplFiles";

function writeToFileInTextEditor(fileName: string, fileEdits: WorkspaceEdit): void {
    if (!fs.existsSync(fileName)) {
        workspace.openTextDocument().then((document: TextDocument) => {
            window.showTextDocument(document).then(() => {
                var newFileEdits = new WorkspaceEdit()
                newFileEdits.set(document.uri, fileEdits.entries()[0][1])
                workspace.applyEdit(newFileEdits)
            });
        });
    } else {
        workspace.openTextDocument(fileName).then((document: TextDocument) => {
            window.showTextDocument(document).then(() => {
                workspace.applyEdit(fileEdits)
            });
        });
    }
}

function addImplementationToFile(languageClient: LanguageClient, fileName: string, code: string) {
    if (fileName == NEW_FILE_DISPLAY_MESSAGE) {
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
    languageClient.sendRequest(GAUGE_IMPL_FILES_COMMAND, new CancellationTokenSource().token).then(
        (files: string[]) => {
            window.showQuickPick(getQuickPickList(files, cwd)).then((selected) => {
                if (selected) {
                    if (selected.value == COPY_TO_CLIPBOARD_DISPLAY_MESSAGE) {
                        copyPaste.copy(code);
                        window.showInformationMessage("Step Implementation copied to clipboard");
                    } else {
                        addImplementationToFile(languageClient, selected.value, code);
                    }
                }
            }, (err) => {
                window.showErrorMessage('Unable to select file.', err)
            });
        }
    );
}

function getQuickPickList(files: string[], cwd: string): FileListItem[] {
    let showFileList: FileListItem[] = files.map(file => {
        return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file)
    });
    var quickPickFileList = [new FileListItem(NEW_FILE_DISPLAY_MESSAGE, "", NEW_FILE_DISPLAY_MESSAGE),
    new FileListItem(COPY_TO_CLIPBOARD_DISPLAY_MESSAGE, "", COPY_TO_CLIPBOARD_DISPLAY_MESSAGE)];
    return quickPickFileList.concat(showFileList);
}