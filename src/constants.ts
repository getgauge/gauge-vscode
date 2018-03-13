'use strict';

import { commands } from 'vscode';

export enum VSCodeCommands {
    Open = 'vscode.open',
    SetContext = 'setContext',
    ShowReferences = 'editor.action.showReferences',
    Preview = 'vscode.previewHtml'
}

export enum GaugeVSCodeCommands {
    ShowReport = 'gauge.report.html',
    Welcome = 'gauge.welcome',
    ToggleWelcome = 'gauge.welcome.toggle',
    StopExecution = 'gauge.stopExecution',
    Execute = 'gauge.execute',
    Debug = 'gauge.debug',
    ExecuteInParallel = 'gauge.execute.inParallel',
    ExecuteFailed = 'gauge.execute.failed',
    ExecuteSpec = 'gauge.execute.specification',
    ExecuteAllSpecs = 'gauge.execute.specification.all',
    ExecuteAllSpecExplorer = 'gauge.specexplorer.runAllActiveProjectSpecs',
    ExecuteScenario = 'gauge.execute.scenario',
    ExecuteScenarios = 'gauge.execute.scenarios',
    GenerateStub = 'gauge.generate.unimplemented.stub',
    ShowReferences = 'gauge.showReferences',
    ShowReferencesAtCursor = 'gauge.showReferences.atCursor',
    ReportIssue = 'gauge.help.reportIssue',
    Open = 'gauge.open',
    RepeatExecution = 'gauge.execute.repeat',
    SwitchProject = 'gauge.specexplorer.switchProject',
    ExtractConcept = 'gauge.extract.concept',
    ExecuteInTerminal = "gauge.executeIn.terminal"
}

export enum GaugeCommands {
    Gauge = 'gauge',
    Version = '--version',
    MachineReadable = '--machine-readable',
    Run = 'run',
    Parallel = '--parallel',
    SimpleConsole = '--simple-console',
    RerunFailed = '--failed',
    Repeat = '--repeat',
    HideSuggestion = '--hide-suggestion',
}

export enum GaugeCommandContext {
    Enabled = 'gauge:enabled',
    Activated = 'gauge:activated',
    GaugeSpecExplorer = 'gauge:specExplorer',
    MultiProject = 'gauge:multipleProjects?',
}

export function setCommandContext(key: GaugeCommandContext | string, value: any) {
    return commands.executeCommand(VSCodeCommands.SetContext, key, value);
}

export enum GaugeRequests {
    Specs = 'gauge/specs',
    Scenarios = 'gauge/scenarios',
    Files = "gauge/getImplFiles",
    AddStub = 'gauge/putStubImpl',
    ExtractConcept = 'gauge/extractConcept'
}

export const LAST_REPORT_PATH = 'gauge.execution.report';

export const WELCOME_PAGE_URI = "gauge://global/welcome";
export const REPORT_URI = "gauge://workspace/htmlreport";
