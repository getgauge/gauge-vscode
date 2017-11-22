'use strict';

import { commands } from 'vscode';

export enum VSCodeCommands {
    Open = 'vscode.open',
    SetContext = 'setContext',
    ShowReferences = 'editor.action.showReferences'
}

export enum GaugeCommands {
	RefreshExplorer = 'gauge.specexplorer.refresh',
	Execute = 'gauge.execute',
	ExecuteInParallel = 'gauge.execute.inParallel',
	ExecuteFailed = 'gauge.execute.failed',
	ExecuteSpec = 'gauge.execute.specification',
	ExecuteAllSpecs = 'gauge.execute.specification.all',
	ExecuteScenarioAtCursor = 'gauge.execute.scenario.atCursor',
	ExecuteScenario = 'gauge.execute.scenarios',
	CopyStub = 'gauge.copy.unimplemented.stub',
	ShowReferences = 'gauge.showReferences',
	ShowReferencesAtCursor = 'gauge.showReferences.atCursor',
	ReportIssue = 'gauge.help.reportIssue',
	Open = 'gauge.open',
	RepeatExecution = 'gauge.execute.repeat',
}

export enum GaugeCommandContext {
	Enabled = 'gauge:enabled',
	Activated = 'gauge:activated',
    GaugeSpecExplorer = 'gauge:specExplorer',
}

export function setCommandContext(key: GaugeCommandContext | string, value: any) {
    return commands.executeCommand(VSCodeCommands.SetContext, key, value);
}