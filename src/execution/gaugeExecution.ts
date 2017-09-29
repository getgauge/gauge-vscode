'use strict';

import vscode = require('vscode');
import cp = require('child_process')
import { LineBuffer } from './lineBuffer'
import { OutputChannel } from './outputChannel'

const gauge = 'gauge';
const run = 'run';
const parallel = '--parallel';
const simpleConsole = '--simple-console';
const outputChannelName = 'Gauge Execution'

export function execute(spec: string, inParallel: boolean) {
	return new Promise<boolean>((resolve, reject) => {
		let args = (!inParallel) ? [run, spec, simpleConsole] : [run, parallel, spec];
		let chan = new OutputChannel(outputChannelName, ['Running tool:', gauge, args.join(' ')].join(' '));
		let process = cp.spawn(gauge, args, { cwd: vscode.workspace.rootPath });
		process.stdout.on('data', chunk => chan.appendOutBuf(chunk.toString()));
		process.stderr.on('data', chunk => chan.appendErrBuf(chunk.toString()));
		process.on('close', code => chan.onFinish(resolve, code));
	});
}

