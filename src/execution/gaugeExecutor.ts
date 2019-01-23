'use strict';

import { ChildProcess } from 'child_process';
import {
    CancellationTokenSource, commands, Disposable, Position,
    StatusBarAlignment, Uri, window, DebugSession
} from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeCommands, GaugeVSCodeCommands } from '../constants';
import { GaugeWorkspace } from '../gaugeWorkspace';
import { getExecutionCommand, getProjectRootFromSpecPath, isMavenProject } from '../util';
import { GaugeDebugger } from "./debug";
import { OutputChannel } from './outputChannel';
import psTree = require('ps-tree');
import cp = require('child_process');
import path = require('path');

const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const REPORT_PATH_PREFIX = "Successfully generated html-report to => ";
const ATTACH_DEBUGGER_EVENT = "Runner Ready for Debugging";
const NO_DEBUGGER_ATTACHED = "No debugger attached";
const successMessage = "Success: Tests passed.";
const failureMessage = "Error: Tests failed.";

export class GaugeExecutor extends Disposable {
    private executing: boolean;
    private aborted: boolean = false;
    private outputChannel = window.createOutputChannel(outputChannelName);
    private childProcess: ChildProcess;
    private preExecute: Function[] = [];
    private postExecute: Function[] = [];
    private readonly _reportThemePath: string;
    private _disposables: Disposable[] = [];
    private gaugeDebugger: GaugeDebugger;

    constructor(private gaugeWorkspace: GaugeWorkspace) {
        super(() => this.dispose());

        this._reportThemePath = gaugeWorkspace.getReportThemePath();
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
            this.gaugeDebugger = new GaugeDebugger(this.gaugeWorkspace.getClientLanguageMap(), config);
            this.gaugeDebugger.registerStopDebugger((e: DebugSession) => { this.cancel(); });
            this.gaugeDebugger.addDebugEnv(config.projectRoot).then((env) => {
                env.GAUGE_HTML_REPORT_THEME_PATH = this._reportThemePath;
                env.use_nested_specs = "false";
                env.SHOULD_BUILD_PROJECT = "true";
                let args = this.getArgs(spec, config);
                let chan = new OutputChannel(this.outputChannel,
                    ['Running tool:', getExecutionCommand(config.projectRoot), args.join(' ')].join(' '),
                    config.projectRoot);
                this.preExecute.forEach((f) => f.call(null, env, path.relative(config.projectRoot, config.status)));
                this.aborted = false;
                this.childProcess = cp.spawn(getExecutionCommand(config.projectRoot), args,
                    { cwd: config.projectRoot, env: env });

                this.childProcess.stdout.on('data', this.filterStdoutDataDumpsToTextLines((lineText) => {
                    chan.appendOutBuf(lineText);
                    let lineTexts = lineText.split("\n");
                    lineTexts.forEach((lineText) => {
                        if (lineText.indexOf(REPORT_PATH_PREFIX) >= 0) {
                            let reportPath = lineText.replace(REPORT_PATH_PREFIX, "");
                            this.gaugeWorkspace.setReportPath(reportPath);
                        }
                        if (env.DEBUGGING && lineText.indexOf(ATTACH_DEBUGGER_EVENT) >= 0) {
                            this.gaugeDebugger.addProcessId(+lineText.replace(/^\D+/g, ''));
                            this.gaugeDebugger.startDebugger();
                        }
                        if (env.DEBUGGING && lineText.indexOf(NO_DEBUGGER_ATTACHED) >= 0) {
                            window.showErrorMessage("No debugger attached. Stopping the execution");
                            this.cancel();
                        }
                    });
                }));
                this.childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
                this.childProcess.on('exit', (code) => {
                    this.executing = false;
                    this.postExecute.forEach((f) => f.call(null, config.projectRoot, this.aborted));
                    chan.onFinish(resolve, code, successMessage, failureMessage, this.aborted);
                });
            });
        });
    }
    private filterStdoutDataDumpsToTextLines(callback) {
        let acc = '';
        return (data) => {
            let splitted = data.toString().split(/\r?\n/);
            let lines = splitted.slice(0, splitted.length - 1);
            if (lines.length > 0) {
                lines[0] = `${acc}${lines[0]}`;
                acc = '';
            }
            acc = `${acc}${splitted[splitted.length - 1]}`;
            lines.forEach((line) => callback(`${line}\n`));
        };
    }
    private killRecursive(pid: number) {
        try {
            psTree(pid, (error: Error, children: Array<any>) => {
                if (!error && children.length) {
                    children.forEach((c: any) => {
                        try {
                            process.kill(c.PID);
                        } catch (e) {
                            if (e.code !== 'ESRCH') throw error;
                        }
                    });
                }
            });
            this.aborted = true;
            return process.kill(pid);
        } catch (error) {
            if (error.code !== 'ESRCH') throw error;
        }
    }

    public cancel() {
        if (this.childProcess && !this.childProcess.killed) {
            this.gaugeDebugger.stopDebugger();
            this.killRecursive(this.childProcess.pid);
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
            return this.execute(null,
                { inParallel: false, status: path.join(projectRoot, "All specs"), projectRoot: projectRoot });
        }
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let doc = activeTextEditor.document;
            if (!extensions.includes(path.extname(doc.fileName))) {
                return Promise.reject(new Error(`No specification found. Current file is not a gauge specification.`));
            }
            return this.execute(doc.fileName, {
                inParallel: false,
                status: doc.fileName,
                projectRoot: getProjectRootFromSpecPath(doc.uri.fsPath)
            });
        } else {
            return Promise.reject(new Error(`A gauge specification file should be open to run this command.`));
        }
    }

    public runScenario(atCursor: boolean): Thenable<any> {
        let clients = this.gaugeWorkspace.getClients();
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let spec = activeTextEditor.document.fileName;
            let lc = clients.get(getProjectRootFromSpecPath(window.activeTextEditor.document.uri.fsPath));
            if (!extensions.includes(path.extname(spec))) {
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
            return Promise.reject(new Error(`A gauge specification file should be open to run this command.`));
        }
    }

    private createMavenArgs(spec, config): Array<string> {
        let args = ["-q", "clean", "compile", "test-compile", "gauge:execute"];
        let defaultArgs = `-Dflags=--hide-suggestion,--simple-console`;
        if (config.rerunFailed) return args.concat(`-Dflags=--failed`);
        if (config.repeat) return args.concat(`-Dflags=--repeat`);
        args = args.concat(defaultArgs);
        if (config.inParallel) args = args.concat("-DinParallel=true");
        if (spec) return args.concat(`-DspecsDir=${path.relative(config.projectRoot, spec)}`);
        return args;
    }

    private getArgs(spec, config): Array<string> {
        if (isMavenProject(config.projectRoot)) return this.createMavenArgs(spec, config);
        if (config.rerunFailed) {
            return [GaugeCommands.Run, GaugeCommands.RerunFailed];
        }
        if (config.repeat) {
            return [GaugeCommands.Run, GaugeCommands.Repeat];
        }
        if (config.inParallel) {
            if (spec) {
                return [GaugeCommands.Run, GaugeCommands.Parallel, spec, GaugeCommands.HideSuggestion];
            }
            return [GaugeCommands.Run, GaugeCommands.Parallel, GaugeCommands.HideSuggestion];
        }
        if (spec) {
            return [GaugeCommands.Run, spec, GaugeCommands.SimpleConsole, GaugeCommands.HideSuggestion];
        }
        return [GaugeCommands.Run, GaugeCommands.SimpleConsole, GaugeCommands.HideSuggestion];
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
                let pr = getProjectRootFromSpecPath(Uri.file(path).fsPath);
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
        let pr = getProjectRootFromSpecPath(Uri.file(path).fsPath);
        return this.execute(scenarios.executionIdentifier, {
            inParallel: false,
            status: scenarios.executionIdentifier,
            projectRoot: pr
        });
    }

    private registerCommands() {
        this._disposables.push(Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => {
                let cwd = getProjectRootFromSpecPath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, { inParallel: false, status: spec, projectRoot: cwd });
            }),
            commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => {
                let cwd = getProjectRootFromSpecPath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, { inParallel: true, status: spec, projectRoot: cwd });
            }),

            commands.registerCommand(GaugeVSCodeCommands.Debug, (spec) => {
                let cwd = getProjectRootFromSpecPath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, { inParallel: false, status: spec, projectRoot: cwd, debug: true });
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => {
                if (this.gaugeWorkspace.getClients().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.execute(null, {
                            rerunFailed: true,
                            status: path.join(selection, "failed scenarios"), projectRoot: selection
                        });
                    });
                return this.execute(null, {
                    rerunFailed: true,
                    status: path.join(this.gaugeWorkspace.getDefaultFolder(), "failed scenarios"),
                    projectRoot: this.gaugeWorkspace.getDefaultFolder()
                });
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
                        return this.execute(null, {
                            repeat: true, status: path.join(selection, "previous run"),
                            projectRoot: selection
                        });
                    });
                return this.execute(null,
                    {
                        repeat: true, status: path.join(this.gaugeWorkspace.getDefaultFolder(), "previous run"),
                        projectRoot: this.gaugeWorkspace.getDefaultFolder()
                    });
            })
        ));
    }

    private registerStopExecution() {
        let stopExecution = window.createStatusBarItem(StatusBarAlignment.Left, 2);
        stopExecution.command = GaugeVSCodeCommands.StopExecution;
        stopExecution.tooltip = 'Click to Stop Run';
        this._disposables.push(stopExecution);
        this.onBeforeExecute((env, s) => {
            if (env.DEBUGGING) return;
            stopExecution.text = `$(primitive-square) Running ${s}`;
            stopExecution.show();
        });
        this.onExecuted(() => stopExecution.hide());
        this._disposables.push(commands.registerCommand(GaugeVSCodeCommands.StopExecution, () => {
            try {
                this.cancel();
            } catch (e) {
                window.showErrorMessage("Failed to Stop Run: " + e.message);
            }
        }));
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
