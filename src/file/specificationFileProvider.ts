'use strict';

import * as fs from "fs-extra";
import * as path from "path";
import { EOL } from "os";
import { CancellationToken, Disposable, Position, Range, TextDocument, commands, window, workspace } from "vscode";
import { CancellationTokenSource } from "vscode-languageclient";
import { GaugeRequests, GaugeVSCodeCommands } from "../constants";
import { GaugeWorkspace } from "../gaugeWorkspace";

export class SpecificationProvider extends Disposable {

    private readonly gaugeWorkspace: GaugeWorkspace;
    private _disposable: Disposable;

    constructor(workspace: GaugeWorkspace) {
        super(() => this.dispose());
        this.gaugeWorkspace = workspace;
        this._disposable = Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.CreateSpecification, () => {
                if (this.gaugeWorkspace.getClientsMap().size > 1) {
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.createSpecificationIn(selection);
                    });
                }
                return this.createSpecificationIn(this.gaugeWorkspace.getDefaultFolder());
            })
        );
    }

    private createSpecificationIn(project: string): Thenable<any> {
        let client = this.gaugeWorkspace.getClientsMap().get(project).client;
        let token = new CancellationTokenSource().token;
        return client.sendRequest(GaugeRequests.SpecDirs, token).then((specDirs: any) => {
            let p = "Choose the folder in which the specification should be created";
            if (specDirs.length > 1) {
                return window.showQuickPick(specDirs, { canPickMany: false, placeHolder: p }).then((dir: string) => {
                    if (!dir) return;
                    return this.getFileName(token, path.join(project, dir));
                }, this.handleError);
            }
            return this.getFileName(token, path.join(project, specDirs[0]));

        }, this.handleError);
    }

    private getFileName(token: CancellationToken, dir: string): Thenable<any> {
        return window.showInputBox({ placeHolder: "Enter the file name" }, token).then((file) => {
            if (!file) return;
            let filename = path.join(dir, file + ".spec");
            if (fs.existsSync(filename)) return this.handleError("File" + filename + " already exists.");
            return this.createFileAndShow(filename);
        }, this.handleError);
    }

    private createFileAndShow(filename: string): Thenable<any> {
        let info = this.getDocumentInfo();
        return fs.createFile(filename).then(() => {
            return fs.writeFile(filename, info.text, "UTF-8").then(() => {
                return workspace.openTextDocument(filename).then((doc: TextDocument) => {
                    return window.showTextDocument(doc, { selection: info.range });
                }, this.handleError);
            }, this.handleError);
        }, this.handleError);
    }

    private getDocumentInfo(): { text: string, range: Range } {
        let withHelp = workspace.getConfiguration("gauge").get("create.specification.withHelp");
        let text = "# SPECIFICATION HEADING" + EOL;
        if (withHelp) {
            text += EOL + "This is an executable specification file. This file follows markdown syntax." + EOL +
                "Every heading in this file denotes a scenario. Every bulleted point denotes a step." + EOL + EOL +
                "> To turn off these comments, set the configuration" +
                "`gauge.create.specification.withHelp` to false." + EOL;
        }
        text += EOL + "## SCEANRIO HEADING" + EOL + EOL + "* step" + EOL;
        let line = text.split(EOL).length - 2;
        let range = new Range(new Position(line, 2), new Position(line, 6));
        return { text: text, range: range };
    }

    handleError(message: string): Thenable<any> {
        return window.showErrorMessage('Unable to generate speccification. ' + message);
    }

    dispose() {
        this._disposable.dispose();
    }
}