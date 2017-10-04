'use trict'

import * as vscode from 'vscode';
import { LineBuffer } from './lineBuffer';
import * as cp from 'child_process';

export class OutputChannel {
	private process: cp.ChildProcess;
	private outBuf: LineBuffer;
	private errBuf: LineBuffer;
	private chan: vscode.OutputChannel

	constructor(name, initial: string) {
		this.outBuf = new LineBuffer();
		this.errBuf = new LineBuffer();
		this.chan = vscode.window.createOutputChannel(name);
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
		this.outBuf.append(line);
	}

	public appendErrBuf(line: string) {
		this.errBuf.append(line);
	}

	public onFinish(resolve: (value?: boolean | PromiseLike<boolean>) => void, code: number) {
		this.outBuf.done();
		this.errBuf.done();
		if (code) {
			this.chan.appendLine('Error: Tests failed.');
		} else {
			this.chan.appendLine('Success: Tests passed.');
		}
		resolve(code === 0)
	}
}
