'use strict';

import { commands } from 'vscode';

export enum VSCodeCommands {
    Open = 'vscode.open',
    SetContext = 'setContext',
    ShowReferences = 'editor.action.showReferences'
}

export enum GaugeCommandContext {
	Enabled = 'gauge:enabled',
	Activated = 'gauge:activated',
    GaugeTestExplorer = 'gauge:testExplorer',
}

export function setCommandContext(key: GaugeCommandContext | string, value: any) {
    return commands.executeCommand(VSCodeCommands.SetContext, key, value);
}