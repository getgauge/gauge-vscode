'use strict';

import { Position } from 'vscode';
import { LanguageClient, TextDocumentIdentifier } from 'vscode-languageclient'
import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import { LineBuffer } from './lineBuffer'
import { OutputChannel } from './outputChannel'

const gauge = 'gauge';
const run = 'run';
const parallel = '--parallel';
const simpleConsole = '--simple-console';
const rerunFailed = '--failed';
const hideSuggestion = '--hide-suggestion';
const outputChannelName = 'Gauge Execution';
const extensions = [".spec", ".md"];
const GAUGE_EXECUTION_CONFIG = "gauge.execution"
let outputChannel = vscode.window.createOutputChannel(outputChannelName);

export function execute(spec: string, config: any): Thenable<any> {
	return new Promise<boolean>((resolve, reject) => {
		let args = getArgs(spec, config);
		let chan = new OutputChannel(outputChannel, ['Running tool:', gauge, args.join(' ')].join(' '));
		let process = cp.spawn(gauge, args, { cwd: vscode.workspace.rootPath });
		process.stdout.on('data', chunk => chan.appendOutBuf(chunk.toString()));
		process.stderr.on('data', chunk => chan.appendErrBuf(chunk.toString()));
		process.on('close', code => chan.onFinish(resolve, code));
	});
}

function getArgs(spec, config): Array<string> {
	if (config.rerunFailed) {
		return [run, rerunFailed];
	}
	return (!config.inParallel) ? [run, spec, simpleConsole, hideSuggestion] : [run, parallel, spec, hideSuggestion];
}


export function runSpecification(all?: boolean): Thenable<any> {
	if (all) {
		let dirs = vscode.workspace.getConfiguration(GAUGE_EXECUTION_CONFIG).get<Array<string>>("specDirs");
		return execute(dirs.join(" "), { inParallel: false });
	}
	let spec = vscode.window.activeTextEditor.document.fileName;
	if (!extensions.includes(path.extname(spec))) {
		vscode.window.showWarningMessage(`${spec} is not a valid specification.`);
		return Promise.reject(new Error(`${spec} is not a valid specification.`));
	}
	return execute(spec, { inParallel: false });
};

export function runScenario(languageClient: LanguageClient, atCursor: boolean): Thenable<any> {
	let spec = vscode.window.activeTextEditor.document.fileName;
	if (!extensions.includes(path.extname(spec))) {
		vscode.window.showWarningMessage(`${spec} is not a valid specification.`);
		return Promise.reject(new Error(`${spec} is not a valid specification.`));
	}
	return getAllScenarios(languageClient, atCursor).then((scenarios: any): Thenable<any> => {
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

function getQuickPickItems(scenHeadings: Array<any>) {
	return scenHeadings.map((sh) => {
		return { label: sh, detail: 'Scenario' };
	});
}

function executeOptedScenario(scenarios: any): Thenable<any> {
	let sceHeadings = scenarios.map(sce => sce.heading);
	return vscode.window.showQuickPick<any>(getQuickPickItems(sceHeadings)).then((selected) => {
		let sce = scenarios.find(sce => selected.label == sce.heading);
		return execute(sce.executionIdentifier, { inParallel: false });
	}, (reason: any) => {
		return Promise.reject(reason);
	});
}

function executeAtCursor(scenarios: any): Thenable<any> {
	if (scenarios instanceof Array) {
		return executeOptedScenario(scenarios);
	}
	return execute(scenarios.executionIdentifier, { inParallel: false });
}
