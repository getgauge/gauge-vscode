import * as assert from 'assert';
import * as path from 'path';
import { execute } from '../../src/execution/gaugeExecution'
import { TextDocument } from 'vscode-languageclient/lib/main';
import { Uri, commands, window } from 'vscode';

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
		commands.executeCommand('workbench.action.closeAllEditors').then(() => {
			done();
		});
	});

	test('should execute given specification', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec');
		execute(spec, { inParallel: false, status: spec, projectRoot: testDataPath }).then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute given scenario', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec:6');
		execute(spec, { inParallel: false, status: spec, projectRoot: testDataPath }).then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute all specification in spec dir', (done) => {
		commands.executeCommand('gauge.execute.specification.all').then(statusHandler(done), errorHandler(done));
	}).timeout(10000);

	test('should execute currently open specification', (done) => {
		let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
		window.showTextDocument(specFile).then((document) => {
			commands.executeCommand('gauge.execute.specification').then(statusHandler(done), errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);

	test('should execute scenario at cursor', (done) => {
		let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
		window.showTextDocument(specFile).then((editor) => {
			commands.executeCommand("workbench.action.focusFirstEditorGroup").then(() => {
				let cm = { to: 'down', by: 'line', value: 8 };
				commands.executeCommand("cursorMove", cm).then(() => {
					commands.executeCommand('gauge.execute.scenario').then(statusHandler(done), errorHandler(done));
				}, errorHandler(done));
			}, errorHandler(done));
		}, errorHandler(done));
	}).timeout(10000);

	test('should abort execution', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec');
		execute(spec, { inParallel: false, status: spec, projectRoot: testDataPath }).then((status) => {
			assert.equal(status, false);
			done();
		}, err => done(err));
		commands.executeCommand('gauge.stopExecution').then(() => { done(); }, () => { done() });
	}).timeout(10000);

	test('should reject execution when another is already in progress', (done) => {
		let spec = path.join(testDataPath, 'specs', 'example.spec');
		execute(spec, { inParallel: false, status: spec, projectRoot: testDataPath })
		execute(spec, { inParallel: false, status: spec, projectRoot: testDataPath }).then(() => { }, err => {
			assert.equal(err, "A Specification or Scenario is still running!")
			done();
		});
	}).timeout(10000);
});
