import * as assert from 'assert';
import * as path from 'path';
import { OutputChannel } from '../../src/execution/outputChannel';
import * as vscode from 'vscode';

suite('Output Channel', () => {
    class MockVSOutputChannel implements vscode.OutputChannel {
        name: string;
        text: string;
        append(value: string): void { }
        appendLine(value: string): void {
            this.text = value;
        }
        clear(): void {
            this.text = '';
        }
        show(preserveFocus?: boolean): void;
        show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
        show(column?: any, preserveFocus?: any) { }
        hide(): void { }
        dispose(): void { }

        read(): string {
            return this.text;
        }
    }

    test('should convert specification path from relative to absolute', (done) => {
        let chan = new MockVSOutputChannel();
        let outputChannel = new OutputChannel(chan, "", "project");
        outputChannel.appendOutBuf("      Specification: " + path.join("specs", "example.spec:19") + "\n");

        assert.equal(chan.read(), "      Specification: " + path.join("project", "specs", "example.spec:19"));
        done();
    });

    test('should convert implementation path from relative to absolute', (done) => {
        let chan = new MockVSOutputChannel();
        let outputChannel = new OutputChannel(chan, "", "project");
        outputChannel.appendOutBuf("      at Object.<anonymous> (" +
            path.join("tests", "step_implementation.js:24:10") + ")\n");

        assert.equal(chan.read(), "      at Object.<anonymous> (" +
            path.join("project", "tests", "step_implementation.js:24:10)"));
        done();
    });

    test('should not change implementation path from relative to absolute if it is already absolute', (done) => {
        let chan = new MockVSOutputChannel();
        let outputChannel = new OutputChannel(chan, "", "projectRoot");
        outputChannel.appendOutBuf("      at Object.<anonymous> (" +
            path.join("projectRoot", "tests", "step_implementation.js:24:10") + ")\n");

        assert.equal(chan.read(), "      at Object.<anonymous> (" +
            path.join("projectRoot", "tests", "step_implementation.js:24:10)"));
        done();
    });

    test('should convert implementation path from relative to absolute for lamda methods', (done) => {
        let chan = new MockVSOutputChannel();
        let outputChannel = new OutputChannel(chan, "", "project");
        outputChannel.appendOutBuf("      at Object.<anonymous> (" +
            path.join("tests", "step_implementation.js:24:10") + ")\n");

        assert.equal(chan.read(), "      at Object.<anonymous> (" +
            path.join("project", "tests", "step_implementation.js:24:10)"));
        done();
    });

    test('should convert implementation path from relative to absolute for lamda methods in hooks', (done) => {
        let chan = new MockVSOutputChannel();
        let outputChannel = new OutputChannel(chan, "", "project");
        outputChannel.appendOutBuf("      at Object.<anonymous> (" +
            path.join("tests", "step_implementation.js:24:10") + ")\n");

        assert.equal(chan.read(), "      at Object.<anonymous> (" +
            path.join("project", "tests", "step_implementation.js:24:10)"));
        done();
    });
});