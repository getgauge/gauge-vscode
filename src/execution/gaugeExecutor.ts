'use strict';

import { ChildProcess, spawn } from 'child_process';
import {
    CancellationTokenSource, commands, Disposable, Position,
    StatusBarAlignment, Uri, window, DebugSession, env
} from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient';
import { GaugeCommands, GaugeVSCodeCommands } from '../constants';
import { GaugeWorkspace } from '../gaugeWorkspace';
import { GaugeDebugger } from "./debug";
import { OutputChannel } from './outputChannel';
import { ExecutionConfig } from './executionConfig';
import { CLI } from '../cli';
import { join, relative, extname } from 'path';
import psTree = require('ps-tree');
import {
    LineTextProcessor, DebuggerAttachedEventProcessor, DebuggerNotAttachedEventProcessor, ReportEventProcessor
} from './lineProcessors';
import { MavenProject } from '../project/mavenProject';
import { GradleProject } from '../project/gradleProject';
import { ProjectFactory } from '../project/projectFactory';

const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const successMessage = "Success: Tests passed.";
const failureMessage = "Error: Tests failed.";

export class GaugeExecutor extends Disposable {
    private executing: boolean;
    private aborted: boolean = false;
    private outputChannel = window.createOutputChannel(outputChannelName);
    private childProcess: ChildProcess;
    private preExecute: Function[] = [];
    private postExecute: Function[] = [];
    private _disposables: Disposable[] = [];
    private gaugeDebugger: GaugeDebugger;
    private processors: Array<LineTextProcessor> = new Array();

    constructor(private gaugeWorkspace: GaugeWorkspace, private cli: CLI) {
        super(() => this.dispose());

        this.registerLineTextProcessors();
        this.registerExecutionStatus();
        this.registerStopExecution();
        this.registerCommands();
    }

    public execute(spec: string, config: ExecutionConfig): Thenable<any> {
        return new Promise((resolve, reject) => {
            if (this.executing) {
                reject(new Error('A Specification or Scenario is still running!'));
                return;
            }
            try {
                this.executing = true;
                this.gaugeDebugger = new GaugeDebugger(this.gaugeWorkspace.getClientLanguageMap(),
                    this.gaugeWorkspace.getClientsMap(), config);
                this.gaugeDebugger.registerStopDebugger((e: DebugSession) => { this.cancel(false); });
                this.gaugeDebugger.addDebugEnv().then((env) => {
                    let cmd = config.getProject().getExecutionCommand(this.cli);
                    let args = this.getArgs(spec, config);
                    let initialText = ['Running tool:', cmd, args.join(' ')].join(' ');
                    let chan = new OutputChannel(this.outputChannel, initialText, config.getProject().root());
                    const relPath = relative(config.getProject().root(), config.getStatus());
                    this.preExecute.forEach((f) => { f.call(null, env, relPath); });
                    this.aborted = false;
                    this.childProcess = spawn(cmd, args, { cwd: config.getProject().root(), env: env, detached: true });
                    this.childProcess.stdout.on('data', this.filterStdoutDataDumpsToTextLines((lineText: string) => {
                        chan.appendOutBuf(lineText);
                        lineText.split("\n").forEach((lineText) => {
                            this.processors.forEach((p) => p.process(lineText, this.gaugeDebugger));
                        });
                    }));
                    this.childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
                    this.childProcess.on('exit', (code) => {
                        this.executing = false;
                        this.postExecute.forEach((f) => f.call(null, config.getProject().root(), this.aborted));
                        chan.onFinish(resolve, code, successMessage, failureMessage, this.aborted);
                    });
                });
            } catch (error) {
                console.log(error);
            }
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
    private killRecursive(pid: number, aborted: boolean) {
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
            this.aborted = aborted;
            return process.kill(-pid);
        } catch (error) {
            if (error.code !== 'ESRCH') throw error;
        }
    }

    public cancel(aborted: boolean) {
        if (this.childProcess && !this.childProcess.killed) {
            this.gaugeDebugger.stopDebugger();
            this.killRecursive(this.childProcess.pid, aborted);
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
            const config = new ExecutionConfig().setStatus(join(projectRoot, "All specs"))
                .setProject(ProjectFactory.get(projectRoot));
            return this.execute(null, config);
        }
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let doc = activeTextEditor.document;
            if (!extensions.includes(extname(doc.fileName))) {
                return Promise.reject(new Error(`No specification found. Current file is not a gauge specification.`));
            }
            return this.execute(doc.fileName, new ExecutionConfig()
                .setStatus(doc.fileName)
                .setProject(ProjectFactory.getProjectByFilepath(doc.uri.fsPath))
            );
        } else {
            return Promise.reject(new Error(`A gauge specification file should be open to run this command.`));
        }
    }

    public runScenario(atCursor: boolean): Thenable<any> {
        let clientsMap = this.gaugeWorkspace.getClientsMap();
        let activeTextEditor = window.activeTextEditor;
        if (activeTextEditor) {
            let spec = activeTextEditor.document.fileName;
            let lc = clientsMap.get(window.activeTextEditor.document.uri.fsPath).client;
            if (!extensions.includes(extname(spec))) {
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

    private createMavenArgs(spec, config: ExecutionConfig): Array<string> {
        let args = ["-q", "clean", "compile", "test-compile", "gauge:execute"];
        let defaultArgs = `-Dflags=--hide-suggestion,--simple-console`;
        if (config.getFailed()) return args.concat(`-Dflags=--failed`);
        if (config.getRepeat()) return args.concat(`-Dflags=--repeat`);
        args = args.concat(defaultArgs);
        if (config.getParallel()) args = args.concat("-DinParallel=true");
        if (spec) return args.concat(`-DspecsDir=${relative(config.getProject().root(), spec)}`);
        return args;
    }

    private createGradleArgs(spec, config: ExecutionConfig): Array<string> {
        let args = ["clean", "gauge"];
        let defaultArgs = `-PadditionalFlags=--hide-suggestion --simple-console`;
        if (config.getFailed()) return args.concat(`-PadditionalFlags=--failed`);
        if (config.getRepeat()) return args.concat(`-PadditionalFlags=--repeat`);
        args = args.concat(defaultArgs);
        if (config.getParallel()) args = args.concat("-PinParallel=true");
        if (spec) return args.concat(`-PspecsDir=${relative(config.getProject().root(), spec)}`);
        return args;
    }

    private getArgs(spec: string, config: ExecutionConfig): Array<string> {
        if (config.getProject() instanceof MavenProject) return this.createMavenArgs(spec, config);
        if (config.getProject() instanceof GradleProject) return this.createGradleArgs(spec, config);
        if (config.getFailed()) {
            return [GaugeCommands.Run, GaugeCommands.RerunFailed];
        }
        if (config.getRepeat()) {
            return [GaugeCommands.Run, GaugeCommands.Repeat];
        }
        if (config.getParallel()) {
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
                let pr = ProjectFactory.getProjectByFilepath(Uri.file(path).fsPath);
                return this.execute(sce.executionIdentifier, new ExecutionConfig()
                    .setStatus(sce.executionIdentifier)
                    .setProject(pr)
                );
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
        let pr = ProjectFactory.getProjectByFilepath(Uri.file(path).fsPath);
        return this.execute(scenarios.executionIdentifier, new ExecutionConfig()
            .setStatus(scenarios.executionIdentifier)
            .setProject(pr)
        );
    }

    private registerLineTextProcessors(): void {
        this.processors = [
            new ReportEventProcessor(this.gaugeWorkspace),
            new DebuggerAttachedEventProcessor(this),
            new DebuggerNotAttachedEventProcessor(this)
        ];
    }

    private registerCommands() {
        this._disposables.push(Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => {
                let project = ProjectFactory.getProjectByFilepath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, new ExecutionConfig().setStatus(spec).setProject(project));
            }),
            commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => {
                let project = ProjectFactory.getProjectByFilepath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, new ExecutionConfig().setParallel().setStatus(spec).setProject(project));
            }),

            commands.registerCommand(GaugeVSCodeCommands.Debug, (spec) => {
                let project = ProjectFactory.getProjectByFilepath(window.activeTextEditor.document.uri.fsPath);
                return this.execute(spec, new ExecutionConfig().setStatus(spec).setDebug().setProject(project));
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => {
                if (this.gaugeWorkspace.getClientsMap().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.execute(null, new ExecutionConfig().setFailed()
                            .setStatus(join(selection, "failed scenarios"))
                            .setProject(ProjectFactory.getProjectByFilepath(selection)));
                    });
                let defaultProject = ProjectFactory.get(this.gaugeWorkspace.getDefaultFolder());
                return this.execute(null, new ExecutionConfig().setFailed()
                    .setStatus(join(defaultProject.root(), "failed scenarios"))
                    .setProject(defaultProject));
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecs, () => {
                if (this.gaugeWorkspace.getClientsMap().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.runSpecification(selection);
                    });
                return this.runSpecification(this.gaugeWorkspace.getDefaultFolder());
            }),

            commands.registerCommand(GaugeVSCodeCommands.ExecuteScenarios, () => {
                return this.runScenario(false);
            }),
            commands.registerCommand(GaugeVSCodeCommands.RepeatExecution, () => {
                if (this.gaugeWorkspace.getClientsMap().size > 1)
                    return this.gaugeWorkspace.showProjectOptions((selection: string) => {
                        return this.execute(null, new ExecutionConfig().setRepeat()
                            .setStatus(join(selection, "previous run"))
                            .setProject(ProjectFactory.getProjectByFilepath(selection)));
                    });
                let defaultProject = ProjectFactory.get(this.gaugeWorkspace.getDefaultFolder());
                return this.execute(null, new ExecutionConfig().setRepeat()
                    .setStatus(join(defaultProject.root(), "previous run"))
                    .setProject(defaultProject));
            }),
            commands.registerCommand(GaugeVSCodeCommands.ShowReport, () => {
                this.openReport();
            })
        ));
    }

    private openReport() {
        return env.openExternal(Uri.parse(this.gaugeWorkspace.getReportPath())).then(
        () => { }, (err) => {
            window.showErrorMessage("Can't open html report. " + err);
        });
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
                this.cancel(true);
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
                let client = this.gaugeWorkspace.getClientsMap().get(Uri.file(projectRoot).fsPath).client;
                return client.sendRequest("gauge/executionStatus", {},
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
