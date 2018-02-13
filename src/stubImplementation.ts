import {clients} from './extension'
import fs = require('fs');
import * as path from 'path';
import {
	workspace, Uri, Position, ExtensionContext, Range, WorkspaceEdit, window, CancellationTokenSource,
	TextDocument, TextEditor, QuickPickItem
} from 'vscode';
import copyPaste = require('copy-paste');

const NEW_FILE_DISPLAY_MESSAGE = 'New File';
const COPY_TO_CLIPBOARD_DISPLAY_MESSAGE = 'Copy To Clipboard'

function putStubImplementationInFileContent(cwd: string, filePath: string, stepTexts: string[]): Thenable<WorkspaceEdit> {
    return new Promise((resolve,reject) => {
        let languageClient = clients.get(cwd);
        languageClient.sendRequest("gauge/putStubImpl", {implementationFilePath: filePath, stepTexts: stepTexts}, new CancellationTokenSource().token).then(
            (val) => {
                resolve(languageClient.protocol2CodeConverter.asWorkspaceEdit(val));
            },
            (reason) => {
                reject(reason)
            }
        );
    })
}

function writeToFileInTextEditor(fileName: string, fileEdits: WorkspaceEdit): void {
    if (!fs.existsSync(fileName)) {
        workspace.openTextDocument().then(document => {
            window.showTextDocument(document).then(success => {
                var newFileEdits = new WorkspaceEdit()
                newFileEdits.set(document.uri, fileEdits.entries()[0][1])
                workspace.applyEdit(newFileEdits)
            });
        });
    } else {
        workspace.openTextDocument(fileName).then(document => {
            window.showTextDocument(document).then(success => {
                workspace.applyEdit(fileEdits)
            });
        });
    }
}

export function appendToFile(fileName) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    var position = window.activeTextEditor.selection.start;
    var text = window.activeTextEditor.document.lineAt(position.line).text.slice(1);
    var texts = [].concat(text);
    if (fileName == COPY_TO_CLIPBOARD_DISPLAY_MESSAGE) {
        putStubImplementationInFileContent(cwd, "", texts).then(
            (content: WorkspaceEdit) => {
                let stepImpls = content.entries()[0][1]
                let stepImplTexts = stepImpls.map(x => {return x.newText})
                let stepImplConcat = stepImplTexts.reduceRight((a,b) => a + "\n" + b)
                copyPaste.copy(stepImplConcat)
                window.showInformationMessage("Step Implementation copied to clipboard")
            },
            (reason) => {
                window.showErrorMessage("Step Implementation could not be copied to clipboard because "+ reason);
            }
        )
    } else {
		if (fileName == NEW_FILE_DISPLAY_MESSAGE) {
			fileName = "";
		}
        putStubImplementationInFileContent(cwd, fileName, texts).then(
            (workspaceEdit: WorkspaceEdit) => {
                writeToFileInTextEditor(fileName, workspaceEdit)
            },
            (reason) => {
                window.showErrorMessage("Could Not Write to file because "+ reason);
            }
        )
    }
}

function getImplementationFiles(cwd: string) {
    return new Promise((resolve,reject) => {
        clients.get(cwd).sendRequest("gauge/getImplFiles", new CancellationTokenSource().token).then(
            (val: string[]) => {
                resolve(val)
            }
        );
    })
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

export function showImplementationFileOptions(context: ExtensionContext, onChange: Function) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    getImplementationFiles(cwd).then(
        (files: string[]) => {
			var showFileList = []
			files.forEach(f => showFileList.push(new FileListItem(path.basename(f),
			path.dirname(f).substring(workspace.rootPath.length + 1),
			f)))
			var quickPickFileList = [new FileListItem(NEW_FILE_DISPLAY_MESSAGE, "", NEW_FILE_DISPLAY_MESSAGE),
			new FileListItem(COPY_TO_CLIPBOARD_DISPLAY_MESSAGE, "", COPY_TO_CLIPBOARD_DISPLAY_MESSAGE)]
				 .concat(showFileList)
            return window.showQuickPick(quickPickFileList).then((selected) => {
                if (selected) {
                    return onChange(context, selected.value);
                }
            }, (err) => {
                window.showErrorMessage('Unable to select file.', err)
            })
        }
    )
}