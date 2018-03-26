'use strict';

import {
    window, Position, workspace, Uri, CancellationTokenSource, debug, ExtensionContext, Disposable,
    commands, StatusBarAlignment
} from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import cp = require('child_process');
import path = require('path');
import { LineBuffer } from './lineBuffer';
import { OutputChannel } from './outputChannel';
import { GaugeVSCodeCommands, GaugeCommands, LAST_REPORT_PATH } from '../constants';
import { ChildProcess } from 'child_process';
import { setDebugConf } from "./debug";
import { GaugeWorkspace } from '../gaugeWorkspace';

const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const GAUGE_EXECUTION_CONFIG = "gauge.execution";
const DEBUG_PORT = 'debugPort';
const REPORT_PATH_PREFIX = "Successfully generated html-report to => ";

export class GaugeExecutor extends Disposable {
    private executing: boolean;
    private outputChannel = window.createOutputChannel(outputChannelName);
    private childProcess: ChildProcess;
    private preExecute: Function[] = [];
    private postExecute: Function[] = [];
    private readonly _reportThemePath: string;
    private _disposables: Disposable[] = [];

    constructor(private gaugeWorkspace: GaugeWorkspace) {
        super(() => this.dispose());

        this._reportThemePath  = gaugeWorkspace.getReportThemePath();
        this.registerExecutionStatus();
        this.registerStopExecution();
        this.registerCommands();
    }

    public execute(spec: string, config: any): Thenable<any> {
        return new Promise((resolve, reject) => {
            if (this.executing) {
                reject(new Error('A Specification or Scenario is still running!'));
                return;
            }
            this.executing = true;
            this.preExecute.forEach((f) => f.call(null, path.relative(config.projectRoot, config.status)));
            setDebugConf(config, DEBUG_PORT).then((env) => {
                env.GAUGE_HTML_REPORT_THEME_PATH = this._reportThemePath;
                let args = this.getArgs(spec, config);
                let chan = new OutputChannel(this.outputChannel,
                    ['Running tool:', GaugeCommands.Gauge, args.join(' ')].join(' '),
                    config.projectRoot);
                this.childProcess = cp.spawn(GaugeCommands.Gauge, args, { cwd: config.projectRoot, env: env });
                this.childProcess.stdout.on('data', (chunk) => {
                    let lineText = chunk.toString();
                    chan.appendOutBuf(lineText);
                    if (lineText.indexOf(REPORT_PATH_PREFIX) >= 0) {
                        let reportPath = lineText.replace(REPORT_PATH_PREFIX, "");
                        this.gaugeWorkspace.setReportPath(reportPath);
                    }
                });
                this.childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
                this.childProcess.on('exit', (code, signal) => {
                    this.executing = false;
                    this.postExecute.forEach((f) => f.call(null, config.projectRoot, signal !== null));
                    chan.onFinish(resolve, code, signal !== null);
                });
            });
        });
    }

    public cancel() {
        if (this.childProcess && !this.childProcess.killed) {
            let activeDebugSession = debug.activeDebugSession;
            if (activeDebugSession) {
                activeDebugSession.customRequest("disconnect");
            }
            this.childProcess.kill();
        }
    }

    public onBeforeExecute(hook: Function) {
        this.preExecute.push(hook);
    }

    public onExecuted(hook: Function) {
        this.postExecute.push(hook);
    }

    public runSpecification(projectRoot?: string): Thenable<any> {
        if (projectRoot) {
            let dirs = workspace.getConfiguration(GAUGE_EXECUTION_CONFIG).get<Array<string>>("specDirs");
            return this.execute(dirs.join(" "),
                { inParallel: false, status: dirs.join(" "), projectRoot: projectRoot });
        }
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let doc = activeTextEditor.document;
            if (!extensions.includes(path.extname(doc.fileName))) {
                window.showWarningMessage(`No specification found. Current file is not a gauge specification.`);
                return Promise.reject(new Error(`No specification found. Current file is not a gauge specification.`));
            }
            return this.execute(doc.fileName, {
                inParallel: false,
                status: doc.fileName,
                projectRoot: workspace.getWorkspaceFolder(doc.uri).uri.fsPath
            });
        } else {
            window.showWarningMessage(`A gauge specification file should be open to run this command.`);
            return Promise.reject(new Error(`A gauge specification file should be open to run this command.`));
        }
    }

    public runScenario(atCursor: boolean): Thenable<any> {
        let clients = this.gaugeWorkspace.getClients();
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let spec = activeTextEditor.document.fileName;
            let lc = clients.get(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath);
            if (!extensions.includes(path.extname(spec))) {
                window.showWarningMessage(`No scenario(s) found. Current file is not a gauge specification.`);
                return Promise.reject(new Error(`No scenario(s) found. Current file is not a gauge specification.`));
            }
            return this.getAllScenarios(lc, atCursor).then((scenarios: any): Thenable<any> => {
                if (atCursor) {
                    return this.executeAtCursor(scenarios);
                }
                return this.executeOptedScenario(scenarios);
            }, (reason: any) => {
                window.showErrorMessage(`found some problems in ${spec}. Fix all problems before running scenarios.`);
                return Promise.reject(reason);
            });
        } else {
            window.showWarningMessage(`A gauge specification file should be open to run this command.`);
            return Promise.reject(new Error(`A gauge specification file should be open to run this command.`));
        }
    }

    private getArgs(spec, config): Array<string> {
        if (config.rerunFailed) {
            return [GaugeCommands.Run, GaugeCommands.RerunFailed];
        }
        if (config.repeat) {
            return [GaugeCommands.Run, GaugeCommands.Repeat];
        }
        if (config.inParallel) {
            return [GaugeCommands.Run, GaugeCommands.Parallel, spec, GaugeCommands.HideSuggestion];
        }
        return [GaugeCommands.Run, spec, GaugeCommands.SimpleConsole, GaugeCommands.HideSuggestion];
    }

    private getAllScenarios(languageClient: LanguageClient, atCursor?: boolean): Thenable<any> {
        let uri = TextDocumentIdentifier.create(window.activeTextEditor.document.uri.toString());
        let currPos = window.activeTextEditor.selection.active;
        let params = { textDocument: uri, position: currPos };
        if (!atCursor) {
            // change the position to get all scenarios instead of only related to cursor position
            params.position = new Position(1, 1);
        }
        return languageClient.sendRequest("gauge/scenarios", params, new CancellationTokenSource().token);
    }

    private getQuickPickItems(sceHeadings: Array<any>) {
        return sceHeadings.map((sh) => {
            return { label: sh, detail: 'Scenario' };
        });
    }

    private executeOptedScenario(scenarios: any): Thenable<any> {
        let sceHeadings = scenarios.map((sce) => sce.heading);
        return window.showQuickPick<any>(this.getQuickPickItems(sceHeadings)).then((selected) => {
            if (selected) {
                let sce = scenarios.find((sce) => selected.label === sce.heading);
                let path = sce.executionIdentifier.substring(0, sce.executionIdentifier.lastIndexOf(":"));
                let pr = workspace.getWorkspaceFolder(Uri.file(path)).uri.fsPath;
                return this.execute(sce.executionIdentifier, {
                    inParallel: false,
                    status: sce.executionIdentifier,
                    projectRoot: pr
                });
            }
        }, (reason: any) => {
            return Promise.reject(reason);
        });
    }

    private executeAtCursor(scenarios: any): Thenable<any> {
        if (scenarios instanceof Array) {
            return this.executeOptedScenario(scenarios);
        }
        let path = scenarios.executionIdentifier.substring(0, scenarios.executionIdentifier.lastIndexOf(":"));
        let pr = workspace.getWorkspaceFolder(Uri.file(path)).uri.fsPath;
        return this.execute(scenarios.executionIdentifier, {
            inParallel: false,
            status: scenarios.executionIdentifier,
            projectRoot: pr
        });
    }

    private registerCommands() {
        this._disposables.push(Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => {
                let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
                return this.execute(spec, { inParallel: false, status: spec, projectRoot: cwd });
            }),
            commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => {
                let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
                return this.execute(spec, { inParallel: true, status: spec, projectRoot: cwd });
            }),

            commands.registerCommand(GaugeVSCodeCommands.Debug, (spec) => {
                let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
                return this.execute(spec, { inParallel: false, status: spec, projectRoot: cwd, debug: true });
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => {
                if (this.gaugeWorkspace.getClients().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.execute(null, { rerunFailed: true,
                            status: "failed scenarios", projectRoot: selection });
                    });
                return this.execute(null, { rerunFailed: true, status: "failed scenarios",
                    projectRoot: this.gaugeWorkspace.getDefaultFolder() });
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecs, () => {
                if (this.gaugeWorkspace.getClients().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.runSpecification(selection);
                    });
                return this.runSpecification(this.gaugeWorkspace.getDefaultFolder());
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteScenarios, () => {
                return this.runScenario(false);
            }),
            commands.registerCommand(GaugeVSCodeCommands.RepeatExecution, () => {
                if (this.gaugeWorkspace.getClients().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.execute(null, { repeat: true, status: "previous run", projectRoot: selection });
                    });
                return this.execute(null,
                    { repeat: true, status: "previous run", projectRoot: this.gaugeWorkspace.getDefaultFolder() });
            })
        ));
    }

    private registerStopExecution() {
        let stopExecution = window.createStatusBarItem(StatusBarAlignment.Left, 2);
        stopExecution.command = GaugeVSCodeCommands.StopExecution;
        stopExecution.tooltip = 'Click to Stop Run';
        this._disposables.push(stopExecution);
        this.onBeforeExecute((s) => {
            stopExecution.text = `$(primitive-square) Running ${s}`;
            stopExecution.show();
        });
        this.onExecuted(() => stopExecution.hide());
        this._disposables.push(commands.registerCommand(GaugeVSCodeCommands.StopExecution, () => { this.cancel(); }));
    }

    private registerExecutionStatus() {
        let executionStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        executionStatus.command = GaugeVSCodeCommands.ShowReport;
        this._disposables.push(executionStatus);
        let root;
        this.onBeforeExecute(() => {
            executionStatus.hide();
        });
        this.onExecuted((projectRoot, aborted) => {
            if (aborted) {
                executionStatus.hide();
            } else {
                root = projectRoot;
                let languageClient = this.gaugeWorkspace.getClients().get(Uri.file(projectRoot).fsPath);
                return languageClient.sendRequest("gauge/executionStatus", {},
                    new CancellationTokenSource().token).then(
                    (val: any) => {
                        let status = '#999999';
                        if (val.sceFailed > 0)
                            status = '#E73E48';
                        else if (val.scePassed > 0)
                            status = '#66ff66';
                        executionStatus.color = status;
                        executionStatus.text = `$(check) ` + val.scePassed + `  $(x) ` + val.sceFailed +
                            `  $(issue-opened) ` + val.sceSkipped;
                        executionStatus.tooltip = "Specs : " + val.specsExecuted + " Executed, "
                            + val.specsPassed + " Passed, " + val.specsFailed + " Failed, " + val.specsSkipped
                            + " Skipped" + "\n" + "Scenarios : " + val.sceExecuted + " Executed, " + val.scePassed
                            + " Passed, " + val.sceFailed + " Failed, " + val.sceSkipped + " Skipped";
                        executionStatus.show();
                    }
                );
            }
        });
    }
}
