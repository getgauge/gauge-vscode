'use strict';

import { window, Position, workspace, Uri, WorkspaceFolder, CancellationTokenSource } from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient'
import cp = require('child_process');
import path = require('path');
import { LineBuffer } from './lineBuffer'
import { OutputChannel } from './outputChannel'
import { GaugeVSCodeCommands, GaugeCommands } from '../commands';
import { ChildProcess } from 'child_process';

const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const GAUGE_EXECUTION_CONFIG = "gauge.execution"
let outputChannel = window.createOutputChannel(outputChannelName);
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
		preExecute.forEach(f => f.call(null, path.relative(config.projectRoot, config.status)))
		let args = getArgs(spec, config);
		let chan = new OutputChannel(outputChannel, ['Running tool:', GaugeCommands.Gauge, args.join(' ')].join(' '), config.projectRoot);
		process = cp.spawn(GaugeCommands.Gauge, args, { cwd: config.projectRoot });
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


export function runSpecification(projectRoot?: string): Thenable<any> {
	if (projectRoot) {
		let dirs = workspace.getConfiguration(GAUGE_EXECUTION_CONFIG).get<Array<string>>("specDirs");
		return execute(dirs.join(" "), { inParallel: false, status: dirs.join(" "), projectRoot: projectRoot });
	}
	let doc = window.activeTextEditor.document;
	if (!extensions.includes(path.extname(doc.fileName))) {
		window.showWarningMessage(`No specification found. Current file is not a gauge specification.`);
		return Promise.reject(new Error(`No specification found. Current file is not a gauge specification.`));
	}
	return execute(doc.fileName, { inParallel: false, status: doc.fileName, projectRoot: workspace.getWorkspaceFolder(doc.uri).uri.fsPath });
};

export function runScenario(clients: Map<String, LanguageClient>, atCursor: boolean): Thenable<any> {
	let spec = window.activeTextEditor.document.fileName;
	let lc = clients.get(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath)
	if (!extensions.includes(path.extname(spec))) {
		window.showWarningMessage(`No scenario(s) found. Current file is not a gauge specification.`);
		return Promise.reject(new Error(`No scenario(s) found. Current file is not a gauge specification.`));
	}
	return getAllScenarios(lc, atCursor).then((scenarios: any): Thenable<any> => {
		if (atCursor) {
			return executeAtCursor(scenarios);
		}
		return executeOptedScenario(scenarios);
	}, (reason: any) => {
		window.showErrorMessage(`found some problems in ${spec}. Fix all problems before running scenarios.`);
		return Promise.reject(reason);
	});
};

function getAllScenarios(languageClient: LanguageClient, atCursor?: boolean): Thenable<any> {
	let uri = TextDocumentIdentifier.create(window.activeTextEditor.document.uri.toString());
	let currPos = window.activeTextEditor.selection.active;
	let params = { textDocument: uri, position: currPos };
	if (!atCursor) {
		//change the position to get all scenarios instead of only related to cursor position
		params.position = new Position(1, 1);
	}
	return languageClient.sendRequest("gauge/scenarios", params, new CancellationTokenSource().token);
}

function getQuickPickItems(sceHeadings: Array<any>) {
	return sceHeadings.map((sh) => {
		return { label: sh, detail: 'Scenario' };
	});
}

function executeOptedScenario(scenarios: any): Thenable<any> {
	let sceHeadings = scenarios.map(sce => sce.heading);
	return window.showQuickPick<any>(getQuickPickItems(sceHeadings)).then((selected) => {
		if (selected) {
			let sce = scenarios.find(sce => selected.label == sce.heading);
			let pr = workspace.getWorkspaceFolder(Uri.file(sce.executionIdentifier.split(':')[0])).uri.fsPath
			return execute(sce.executionIdentifier, { inParallel: false, status: sce.executionIdentifier, projectRoot : pr });
		}
	}, (reason: any) => {
		return Promise.reject(reason);
	});
}

function executeAtCursor(scenarios: any): Thenable<any> {
	if (scenarios instanceof Array) {
		return executeOptedScenario(scenarios);
	}
	let pr = workspace.getWorkspaceFolder(Uri.file(scenarios.executionIdentifier.split(':')[0])).uri.fsPath
	return execute(scenarios.executionIdentifier, { inParallel: false, status: scenarios.executionIdentifier, projectRoot: pr });
}
