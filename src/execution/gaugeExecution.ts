'use strict';

import vscode = require('vscode');
import cp = require('child_process')
import { LineBuffer } from './lineBuffer'
import { OutputChannel } from './outputChannel'

const gauge = 'gauge';
const run = 'run';
const parallel = '--parallel';
const simpleConsole = '--simple-console';
const rerunFailed = '--failed';
const outputChannelName = 'Gauge Execution'
let outputChannel = vscode.window.createOutputChannel(outputChannelName);

export function execute(spec: string, config: any) {
	return new Promise<boolean>((resolve, reject) => {
		let args = getArgs(spec, config);
		let chan = new OutputChannel(outputChannel, ['Running tool:', gauge, args.join(' ')].join(' '));
		let process = cp.spawn(gauge, args, { cwd: vscode.workspace.rootPath });
		process.stdout.on('data', chunk => chan.appendOutBuf(chunk.toString()));
		process.stderr.on('data', chunk => chan.appendErrBuf(chunk.toString()));
		process.on('close', code => chan.onFinish(resolve, code));
	});
}

let getArgs = function (spec, config): Array<string> {
	if (config.rerunFailed) {
		return [run, rerunFailed];
	}
	return (!config.inParallel) ? [run, spec, simpleConsole] : [run, parallel, spec];
}
