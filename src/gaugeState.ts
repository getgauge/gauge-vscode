import { Disposable, ExtensionContext } from "vscode";
import * as path from 'path';
import { LAST_REPORT_PATH } from "./constants";

export class GaugeState extends Disposable {
    constructor(private context: ExtensionContext) {
        super(() => this.dispose());
    }

    getReportThemePath(): string {
        return this.context.asAbsolutePath(path.join('out', 'report-theme'));
    }

    setReportPath(reportPath: string) {
        this.context.workspaceState.update(LAST_REPORT_PATH, reportPath);
    }
}