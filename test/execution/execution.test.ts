import * as assert from 'assert';
import * as path from 'path';
import vscode = require('vscode');
import { execute } from '../../src/execution/gaugeExecution'
import { TextDocument } from 'vscode-languageclient/lib/main';

let testDataPath = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject');

let statusHandler = (done) => {
	return (status) => {
		assert.ok(status);
		done();
	};
};

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

	test('should execute given specification', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec');
		execute(spec, false).then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute given scenario', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec:6');
		execute(spec, false).then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute all specification in spec dir', (done) => {
		vscode.commands.executeCommand('gauge.execute.specification.all').then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute currently open specification', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
		vscode.window.showTextDocument(specFile).then((document) => {
			vscode.commands.executeCommand('gauge.execute.specification').then(statusHandler(done), errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);

	test('should execute scenario at cursor', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
		vscode.window.showTextDocument(specFile).then((editor) => {
			vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup").then(() => {
				let cm = { to: 'down', by: 'line', value: 8 };
				vscode.commands.executeCommand("cursorMove", cm).then(() => {
					vscode.commands.executeCommand('gauge.execute.scenario').then(statusHandler(done), errorHandler(done));
				}, errorHandler(done));
			}, errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);

});
