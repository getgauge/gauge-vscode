import * as assert from 'assert';
import * as path from 'path';
import vscode = require('vscode');
import { TextDocument } from 'vscode-languageclient/lib/main';
import { connect } from 'tls';

let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

let errorHandler = (done) => {
	return (err) => {
		assert.ok(false, 'Error: ' + err);
		done();
	};
};

suite('Gauge Execution Tests', () => {
	setup((done) => {
		vscode.commands.executeCommand('workbench.action.closeAllEditors').then(() => {
			done();
		});
	});

	test('should show references for step at cursor', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'tests', 'step_implementation.js'));
		vscode.window.showTextDocument(specFile).then((editor) => {
			vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup").then(() => {
				let cm = { to: 'down', by: 'line', value: 18 };
				vscode.commands.executeCommand("cursorMove", cm).then(() => {
					vscode.commands.executeCommand('gauge.showReferences.atCursor').then((value) => {
						assert.ok(value);
						done();
					}, errorHandler(done));
				}, errorHandler(done));
			}, errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);

	test('should not show any reference if cursor is not in step context', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'tests', 'step_implementation.js'));
		vscode.window.showTextDocument(specFile).then((editor) => {
			vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup").then(() => {
				let cm = { to: 'down', by: 'line', value: 20 };
				vscode.commands.executeCommand("cursorMove", cm).then(() => {
					vscode.commands.executeCommand('gauge.showReferences.atCursor').then((v) => {
						assert.notEqual(v, true);
						done();
					});
				}, errorHandler(done));
			}, errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);
});
