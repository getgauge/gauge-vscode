'use strict'

import * as vscode from 'vscode';
import { LineBuffer } from './lineBuffer';
import * as cp from 'child_process';
import * as path from 'path';

export class OutputChannel {
	private process: cp.ChildProcess;
	private outBuf: LineBuffer;
	private errBuf: LineBuffer;
	private chan: vscode.OutputChannel
	private projectRoot: string

	constructor(outputChannel, initial: string, projectRoot: string) {
		this.projectRoot = projectRoot;
		this.outBuf = new LineBuffer();
		this.errBuf = new LineBuffer();
		this.chan = outputChannel;
		this.chan.clear();
		this.chan.appendLine(initial);
		this.setup();
	}

	private setup() {
		this.chan.show(true);
		this.outBuf.onLine(line => this.chan.appendLine(line));
		this.outBuf.onDone(last => last && this.chan.appendLine(last));
		this.errBuf.onLine(line => this.chan.appendLine(line));
		this.errBuf.onDone(last => last && this.chan.appendLine(last));
	}

	public appendOutBuf(line: string) {
		let regexes: RegExp[] = [/Specification: /, /at Object.* \(/];
		var lineArray = line.split("\n")
		for (var j = 0; j < lineArray.length; j++) {
			for (var i = 0; i < regexes.length; i++) {
				let matches = lineArray[j].match(regexes[i]);
				if (matches && !lineArray[j].includes(this.projectRoot)) {
					lineArray[j] = lineArray[j].replace(matches[0], matches[0] + this.projectRoot + path.sep)
				}
			}
		}
		line = lineArray.join("\n")
		this.outBuf.append(line);
	}

	public appendErrBuf(line: string) {
		this.errBuf.append(line);
	}

	public onFinish(resolve: (value?: boolean | PromiseLike<boolean>) => void, code: number, aborted? : boolean) {
		this.outBuf.done();
		this.errBuf.done();

		if(aborted){
			this.chan.appendLine('Run stopped by user.');
			resolve(false);
			return;
		}

		if (code) {
			this.chan.appendLine('Error: Tests failed.');
		} else {
			this.chan.appendLine('Success: Tests passed.');
		}
		resolve(code === 0);
	}
}
