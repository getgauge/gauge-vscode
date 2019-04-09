'use strict';

import { Disposable, ExtensionContext } from "vscode";
import { LAST_REPORT_PATH } from "./constants";

export class GaugeState extends Disposable {
    constructor(private context: ExtensionContext) {
        super(() => this.dispose());
    }

    setReportPath(reportPath: string) {
        this.context.workspaceState.update(LAST_REPORT_PATH, reportPath);
    }

    getReportPath(): string {
        return this.context.workspaceState.get(LAST_REPORT_PATH);
    }
}
