import * as assert from 'assert';
import * as path from 'path';
import { OutputChannel } from '../../src/execution/outputChannel';
import * as vscode from 'vscode';

suite('Output Channel', () => {
	class MockVSOutputChannel implements vscode.OutputChannel{
		name: string;
		text: string;
		append(value: string): void {}
		appendLine(value: string): void {
			this.text = value;
		}
		clear(): void {
			this.text='';
		}
		show(preserveFocus?: boolean): void;
		show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
		show(column?: any, preserveFocus?: any) {};
		hide(): void {};
		dispose(): void {};

		read() : string {
			return this.text;
		}
	}

	test('should convert specification path from relative to absolute', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      Specification: " + path.join("specs", "example.spec:19") + "\n");

		assert.equal(chan.read(), "      Specification: "+ path.join(vscode.workspace.rootPath, "specs", "example.spec:19"));
		done();
	});

	test('should convert implementation path from relative to absolute', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      at Object.<anonymous> (" + path.join("tests", "step_implementation.js:24:10") +")\n");

		assert.equal(chan.read(), "      at Object.<anonymous> ("+ path.join(vscode.workspace.rootPath,"tests", "step_implementation.js:24:10)"));
		done();
	});

	test('should not change implementation path from relative to absolute if it is already absolute', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      at Object.<anonymous> (" + path.join(vscode.workspace.rootPath,"tests", "step_implementation.js:24:10") +")\n");

		assert.equal(chan.read(), "      at Object.<anonymous> ("+ path.join(vscode.workspace.rootPath,"tests", "step_implementation.js:24:10)"));
		done();
	});

	test('should convert implementation path from relative to absolute for lamda methods', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      at Object.step (" + path.join("tests", "step_implementation.js:24:10") +")\n");

		assert.equal(chan.read(), "      at Object.step ("+ path.join(vscode.workspace.rootPath,"tests", "step_implementation.js:24:10)"));
		done();
	});

	test('should convert implementation path from relative to absolute for lamda methods in hooks', (done) => {
		var chan = new MockVSOutputChannel();
		var outputChannel = new OutputChannel(chan, "");
		outputChannel.appendOutBuf("      at Object.beforeSpec (" + path.join("tests", "step_implementation.js:24:10") +")\n");

		assert.equal(chan.read(), "      at Object.beforeSpec ("+ path.join(vscode.workspace.rootPath,"tests", "step_implementation.js:24:10)"));
		done();
	});
});