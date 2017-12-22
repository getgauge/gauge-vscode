'use strict';

import { Position, workspace, Uri, WorkspaceFolder } from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient'
import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import { LineBuffer } from './lineBuffer'
import { OutputChannel } from './outputChannel'
import { GaugeVSCodeCommands, GaugeCommands } from '../commands';
import { ChildProcess } from 'child_process';

const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const GAUGE_EXECUTION_CONFIG = "gauge.execution"
let outputChannel = vscode.window.createOutputChannel(outputChannelName);
let executing: boolean;
let process: ChildProcess;
let preExecute: Function[] = [];
let postExecute: Function[] = [];

export function execute(spec: string, config: any): Thenable<any> {
	return new Promise((resolve, reject) => {
		if (executing) {
			reject('A Specification or Scenario is still running!');
			return;
		}

		executing = true;
		preExecute.forEach(f => f.call(null, path.relative(vscode.workspace.rootPath, config.status)))
		let args = getArgs(spec, config);
		let chan = new OutputChannel(outputChannel, ['Running tool:', GaugeCommands.Gauge, args.join(' ')].join(' '));
		process = cp.spawn(GaugeCommands.Gauge, args, { cwd: vscode.workspace.rootPath });
		process.stdout.on('data', chunk => chan.appendOutBuf(chunk.toString()));
		process.stderr.on('data', chunk => chan.appendErrBuf(chunk.toString()));
		process.on('exit', (code, signal) => {
			chan.onFinish(resolve, code, signal !== null);
			executing = false;
			postExecute.forEach(f => f.call(null));
		});
	});
}

export function cancel() {
	if (process && !process.killed)
		process.kill();
}

export function onBeforeExecute(hook: Function) {
	preExecute.push(hook);
}

export function onExecuted(hook: Function) {
	postExecute.push(hook);
}

function getArgs(spec, config): Array<string> {
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


export function runSpecification(all?: boolean): Thenable<any> {
	if (all) {
		let dirs = vscode.workspace.getConfiguration(GAUGE_EXECUTION_CONFIG).get<Array<string>>("specDirs");
		return execute(dirs.join(" "), { inParallel: false, status: dirs.join(" ") });
	}
	let spec = vscode.window.activeTextEditor.document.fileName;
	if (!extensions.includes(path.extname(spec))) {
		vscode.window.showWarningMessage(`No specification found. Current file is not a gauge specification.`);
		return Promise.reject(new Error(`No specification found. Current file is not a gauge specification.`));
	}
	return execute(spec, { inParallel: false, status: spec });
};

export function runScenario(clients: Map<String, LanguageClient>, atCursor: boolean): Thenable<any> {
	let spec = vscode.window.activeTextEditor.document.fileName;
	let lc = clients.get(workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath)
	if (!extensions.includes(path.extname(spec))) {
		vscode.window.showWarningMessage(`No scenario(s) found. Current file is not a gauge specification.`);
		return Promise.reject(new Error(`No scenario(s) found. Current file is not a gauge specification.`));
	}
	return getAllScenarios(lc, atCursor).then((scenarios: any): Thenable<any> => {
		if (atCursor) {
			return executeAtCursor(scenarios);
		}
		return executeOptedScenario(scenarios);
	}, (reason: any) => {
		vscode.window.showErrorMessage(`found some problems in ${spec}. Fix all problems before running scenarios.`);
		return Promise.reject(reason);
	});
};

function getAllScenarios(languageClient: LanguageClient, atCursor?: boolean): Thenable<any> {
	let uri = TextDocumentIdentifier.create(vscode.window.activeTextEditor.document.uri.toString());
	let currPos = vscode.window.activeTextEditor.selection.active;
	let params = { textDocument: uri, position: currPos };
	if (!atCursor) {
		//change the position to get all scenarios instead of only related to cursor position
		params.position = new Position(1, 1);
	}
	return languageClient.sendRequest("gauge/scenarios", params, new vscode.CancellationTokenSource().token);
}

function getQuickPickItems(sceHeadings: Array<any>) {
	return sceHeadings.map((sh) => {
		return { label: sh, detail: 'Scenario' };
	});
}

function executeOptedScenario(scenarios: any): Thenable<any> {
	let sceHeadings = scenarios.map(sce => sce.heading);
	return vscode.window.showQuickPick<any>(getQuickPickItems(sceHeadings)).then((selected) => {
		if (selected) {
			let sce = scenarios.find(sce => selected.label == sce.heading);
			return execute(sce.executionIdentifier, { inParallel: false, status: sce.executionIdentifier });
		}
	}, (reason: any) => {
		return Promise.reject(reason);
	});
}

function executeAtCursor(scenarios: any): Thenable<any> {
	if (scenarios instanceof Array) {
		return executeOptedScenario(scenarios);
	}
	return execute(scenarios.executionIdentifier, { inParallel: false, status: scenarios.executionIdentifier });
}
