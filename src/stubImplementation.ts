import { existsSync } from 'fs';
import * as path from 'path';
import {
    workspace, WorkspaceEdit, window, CancellationTokenSource, CancellationToken, QuickPickItem,
    TextDocument, TextEdit, Uri
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { GaugeRequests } from './constants';
import { FileListItem } from './types/fileListItem';
import { WorkspaceEditor } from './refactor/workspaceEditor';
import copyPaste = require('copy-paste');

const NEW_FILE = 'New File';
const COPY_TO_CLIPBOARD = 'Copy To Clipboard';

export function generateStub(clients: Map<String, LanguageClient>, code: string) {
    let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
    let languageClient = clients.get(cwd);
    languageClient.sendRequest(GaugeRequests.Files, new CancellationTokenSource().token).then(
        (files: string[]) => {
            window.showQuickPick(getQuickPickList(files, cwd)).then((selected) => {
                if (selected) {
                    if (selected.value === COPY_TO_CLIPBOARD) {
                        copyPaste.copy(code);
                        window.showInformationMessage("Step Implementation copied to clipboard");
                    } else {
                        let param = { implementationFilePath: selected.value, codes: [code] };
                        makeRequestAndApplyChanges(languageClient, GaugeRequests.AddStub, param);
                    }
                }
            }, (err) => {
                window.showErrorMessage('Unable to select file.', err);
            });
        }
    );
}

function makeRequestAndApplyChanges(lc: LanguageClient, request: string, param: any) {
    lc.sendRequest(request, param, new CancellationTokenSource().token).then((e) => {
        let editor = new WorkspaceEditor(lc.protocol2CodeConverter.asWorkspaceEdit(e));
        editor.applyChanges();
    });
}

function getQuickPickList(files: string[], cwd: string): FileListItem[] {
    const showFileList: FileListItem[] = files.map((file) => {
        return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file);
    });
    const quickPickFileList = [new FileListItem(NEW_FILE, "Create a new file", NEW_FILE),
    new FileListItem(COPY_TO_CLIPBOARD, "", COPY_TO_CLIPBOARD)];
    return quickPickFileList.concat(showFileList);
}