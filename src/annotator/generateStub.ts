'use strict';

import * as path from 'path';
import { CancellationTokenSource, commands, Disposable, window } from "vscode";
import { LanguageClient } from "vscode-languageclient";
import { COPY_TO_CLIPBOARD, GaugeRequests, GaugeVSCodeCommands, NEW_FILE } from "../constants";
import { GaugeClients } from "../gaugeClients";
import { ProjectFactory } from "../project/projectFactory";
import { WorkspaceEditor } from "../refactor/workspaceEditor";
import { FileListItem } from "../types/fileListItem";

import clipboardy = require("clipboardy");

export class GenerateStubCommandProvider implements Disposable {
    private readonly _clientsMap: GaugeClients;
    private readonly _disposable: Disposable;

    constructor(clients: GaugeClients) {
        this._clientsMap = clients;
        this._disposable = Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.GenerateStepStub, (code: string) => {
                return this.generateStepStub(code);
            }), commands.registerCommand(GaugeVSCodeCommands.GenerateConceptStub, (conceptInfo: any) => {
                return this.generateConceptStub(conceptInfo);
            })
        );
    }
    private generateConceptStub(conceptInfo: any) {
        let project = ProjectFactory.get(window.activeTextEditor.document.uri.fsPath);
        let languageClient = this._clientsMap.get(project.root()).client;
        let t = new CancellationTokenSource().token;
        languageClient.sendRequest(GaugeRequests.Files, { concept: true }, t).then((files: string[]) => {
            window.showQuickPick(this.getFileLists(files, project.root(), false)).then((selected) => {
                if (!selected) return;
                conceptInfo.conceptFile = selected.value;
                conceptInfo.dir = path.dirname(window.activeTextEditor.document.uri.fsPath);
                let token = new CancellationTokenSource().token;
                this.generateInFile(GaugeRequests.GenerateConcept, conceptInfo, languageClient);
            }, this.handleError);
        }, this.handleError);
    }

    private generateStepStub(code: string) {
        let pc = this._clientsMap.get(window.activeTextEditor.document.uri.fsPath);
        let token = new CancellationTokenSource().token;
        pc.client.sendRequest(GaugeRequests.Files, token).then((files: string[]) => {
            window.showQuickPick(this.getFileLists(files, pc.project.root())).then((selected: FileListItem) => {
                if (!selected) return;
                if (selected.isCopyToClipBoard()) {
                    clipboardy.writeSync(code);
                    window.showInformationMessage("Step Implementation copied to clipboard");
                } else {
                    let params = { implementationFilePath: selected.value, codes: [code] };
                    this.generateInFile(GaugeRequests.AddStub, params, pc.client);
                }
            }, this.handleError);
        }, this.handleError);
    }

    private generateInFile(request: string, params: any, languageClient: LanguageClient) {
        let token = new CancellationTokenSource().token;
        languageClient.sendRequest(request, params, token).then((e) => {
            let editor = new WorkspaceEditor(languageClient.protocol2CodeConverter.asWorkspaceEdit(e));
            editor.applyChanges();
        }, this.handleError);
    }

    private handleError(reason: string) {
        window.showErrorMessage('Unable to generate implementation. ' + reason);
    }

    private getFileLists(files: string[], cwd: string, copy = true): FileListItem[] {
        const showFileList: FileListItem[] = files.map((file) => {
            return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file);
        });
        const quickPickFileList = [new FileListItem(NEW_FILE, "Create a new file", NEW_FILE)];
        if (copy) {
            quickPickFileList.push(new FileListItem(COPY_TO_CLIPBOARD, "", COPY_TO_CLIPBOARD));
        }
        return quickPickFileList.concat(showFileList);
    }

    dispose() {
        this._disposable.dispose();
    }
}
