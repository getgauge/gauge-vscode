import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Gauge Extension Tests', () => {
	let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

	test('should activate for spec and concept files', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'example.spec'));
		assert.ok(!vscode.extensions.getExtension('GetGauge.Gauge').isActive)
		vscode.workspace.openTextDocument(specFile).then((textDocument) => {
			return vscode.window.showTextDocument(textDocument).then(() => {
				assert.ok(vscode.extensions.getExtension('GetGauge.Gauge').isActive)
			}).then(()=> {
				vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				return Promise.resolve();
			});
		}, (err) => {
			assert.ok(false, err)
		}).then(() => done(), done);;
	});
});