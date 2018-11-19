'use strict';

import {Disposable, workspace, Uri, ExtensionContext, commands, ViewColumn} from 'vscode';
import {Page} from "./page";
import * as path from 'path';
import {LAST_REPORT_PATH, GaugeVSCodeCommands, VSCodeCommands, REPORT_URI} from "../constants";

export class ReportPage extends Disposable implements Page {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;

    constructor(context: ExtensionContext) {
        super(() => this.dispose());

        this._context = context;
        this._disposable = commands.registerCommand(GaugeVSCodeCommands.ShowReport, () => {
            return commands.executeCommand(VSCodeCommands.Preview,
                REPORT_URI, ViewColumn.Active, 'Last Execution Report');
        });
    }

    async content(activated: Boolean): Promise<string> {
        let reportPath = this._context.workspaceState.get<string>(LAST_REPORT_PATH);
        try {
            const doc = await workspace.openTextDocument(Uri.file(reportPath));
            let text =  doc.getText();
            return text.replace('type="text/css" href="',
                `type="text/css" href="${Uri.file(path.dirname(reportPath))}/`);
        } catch (e) {
            console.log(e);
            return Promise.reject(e);
        }
    }

    dispose() {
        this._disposable.dispose();
    }
}