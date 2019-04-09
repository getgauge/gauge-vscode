import { GaugeWorkspace } from "../gaugeWorkspace";
import { GaugeExecutor } from "./gaugeExecutor";
import { GaugeDebugger } from "./debug";
import { window } from "vscode";

export interface LineTextProcessor {
    canProcess(lineText: string): boolean;
    process(lineText: string, gaugeDebugger: GaugeDebugger): void;
}

abstract class BaseProcessor implements LineTextProcessor {
    protected eventPrefix: string;

    constructor(prefix: string) {
        this.eventPrefix = prefix;
    }

    public canProcess(lineText: string): boolean {
        return lineText.includes(this.eventPrefix);
    }

    abstract process(lineText: string, gaugeDebugger: GaugeDebugger): void;
}

export class ReportEventProcessor extends BaseProcessor {

    constructor(private workspace: GaugeWorkspace) {
       super("Successfully generated html-report to => ");
   }

    public process(lineText: string): void {
       if (!this.canProcess(lineText)) return;
       let reportPath = lineText.replace(this.eventPrefix, "");
       this.workspace.setReportPath(reportPath);
   }
}

export class DebuggerAttachedEventProcessor extends BaseProcessor {

    constructor(private executor: GaugeExecutor) {
        super("Runner Ready for Debugging");
    }

    public process(lineText: string, gaugeDebugger: GaugeDebugger): void {
        if (!this.canProcess(lineText)) return;
        gaugeDebugger.addProcessId(+lineText.replace(/^\D+/g, ''));
        gaugeDebugger.startDebugger().then(() => { }).catch((reason) => {
            window.showErrorMessage(reason);
            this.executor.cancel();
        });
    }
}

export class DebuggerNotAttachedEventProcessor extends BaseProcessor {

    constructor(private executor: GaugeExecutor) {
        super("No debugger attached");
    }

    public process(lineText: string): void {
        if (!this.canProcess(lineText)) return;
        window.showErrorMessage("No debugger attached. Stopping the execution");
        this.executor.cancel();
    }
}
