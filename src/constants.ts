'use strict';

import { commands } from 'vscode';

export enum VSCodeCommands {
    Open = 'vscode.open',
    SetContext = 'setContext',
    ShowReferences = 'editor.action.showReferences',
    Preview = 'vscode.previewHtml',
    OpenFolder = 'vscode.openFolder',
    ReloadWindow = 'workbench.action.reloadWindow'
}

export enum GaugeVSCodeCommands {
    SaveRecommendedSettings = 'gauge.config.saveRecommended',
    ShowReport = 'gauge.report.html',
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
    GenerateStepStub = 'gauge.generate.step',
    GenerateConceptStub = 'gauge.generate.concept',
    ShowReferences = 'gauge.showReferences',
    ShowReferencesAtCursor = 'gauge.showReferences.atCursor',
    Open = 'gauge.open',
    RepeatExecution = 'gauge.execute.repeat',
    SwitchProject = 'gauge.specexplorer.switchProject',
    ExtractConcept = 'gauge.extract.concept',
    ExecuteInTerminal = "gauge.executeIn.terminal",
    CreateProject = "gauge.createProject",
    CreateSpecification = "gauge.create.specification",
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
    Init = 'init',
    Install = "install",
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
    GenerateConcept = 'gauge/generateConcept',
    SpecDirs = 'gauge/specDirs'
}

export enum GaugeRunners {
    Java = "java",
    Dotnet = "dotnet"
}

export const LAST_REPORT_PATH = 'gauge.execution.report';
export const COPY_TO_CLIPBOARD = 'Copy To Clipboard';
export const NEW_FILE = 'New File';
export const GAUGE_TEMPLATE_URL = 'https://downloads.gauge.org/templates';
export const GAUGE_MANIFEST_FILE = 'manifest.json';
export const MAVEN_POM = "pom.xml";
export const MAVEN_COMMAND = "mvn";
export const GRADLE_COMMAND = "gradlew";
export const GRADLE_BUILD = 'build.gradle';
export const GAUGE_CUSTOM_CLASSPATH = 'gauge_custom_classpath';
export const GAUGE_DOCS_URI = 'https://docs.gauge.org';
export const INSTALL_INSTRUCTION_URI = `${GAUGE_DOCS_URI}/getting_started/installing-gauge.html`;