'use strict';

import { commands } from 'vscode';

export enum VSCodeCommands {
	Open = 'vscode.open',
	SetContext = 'setContext',
	ShowReferences = 'editor.action.showReferences'
}

export enum GaugeVSCodeCommands {
	StopExecution = 'gauge.stopExecution',
	RefreshExplorer = 'gauge.specexplorer.refresh',
	Execute = 'gauge.execute',
	ExecuteInParallel = 'gauge.execute.inParallel',
	ExecuteFailed = 'gauge.execute.failed',
	ExecuteSpec = 'gauge.execute.specification',
	ExecuteAllSpecs = 'gauge.execute.specification.all',
	ExecuteAllSpecExplorer = 'gauge.specexplorer.runAllActiveProjectSpecs',
	ExecuteScenario = 'gauge.execute.scenario',
	ExecuteScenarios = 'gauge.execute.scenarios',
	CopyStub = 'gauge.copy.unimplemented.stub',
	ShowReferences = 'gauge.showReferences',
	ShowReferencesAtCursor = 'gauge.showReferences.atCursor',
	ReportIssue = 'gauge.help.reportIssue',
	Open = 'gauge.open',
	RepeatExecution = 'gauge.execute.repeat',
	SwitchProject = 'gauge.specexplorer.switchProject'
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