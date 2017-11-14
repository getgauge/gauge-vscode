import * as assert from 'assert';
import * as path from 'path';
import { OutputChannel } from '../../src/execution/outputChannel';
import * as vscode from 'vscode';

suite('Output Channel', () => {
	class MockVSOutputChannel implements vscode.OutputChannel{
		name: string;
		text: string;
		append(value: string): void {
			throw new Error("Method not implemented.");
		}
		appendLine(value: string): void {
			this.text = value;
		}
		clear(): void {
			throw new Error("Method not implemented.");
		}
		show(preserveFocus?: boolean): void;
		show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
		show(column?: any, preserveFocus?: any) {
			throw new Error("Method not implemented.");
		}
		hide(): void {
			throw new Error("Method not implemented.");
		}
		dispose(): void {
			throw new Error("Method not implemented.");
		}

		read() : string {
			return this.text;
		}
	}

	test('should convert specification path from relative to absolute', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      Specification: specs" + path.sep + "example.spec:19");

		assert.equal(chan.read(), "      Specification: "+ vscode.workspace.rootPath + "specs" + path.sep + "example.spec:19");
		done();
	});

	test('should convert implementation path from relative to absolute', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      at Object.<anonymous> (tests" + path.sep + "step_implementation.js:24:10)");

		assert.equal(chan.read(), "      at Object.<anonymous> (tests"+ vscode.workspace.rootPath + "specs" + path.sep + "step_implementation.js:24:10)");
		done();
	});
});