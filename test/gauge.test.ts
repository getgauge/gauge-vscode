import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Gauge Extension Tests', () => {
	let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

	test('should activate for spec and concept files', (done) => {
		let specFile = vscode.Uri.file(path.join(testDataPath, 'example.spec'));
		assert.ok((typeof vscode.extensions.getExtension('getgauge.gauge') === 'undefined') || !(vscode.extensions.getExtension('getgauge.gauge').isActive))
		vscode.workspace.openTextDocument(specFile).then((textDocument) => {
			return vscode.window.showTextDocument(textDocument).then(() => {
				assert.ok(vscode.extensions.getExtension('getgauge.gauge').isActive);
			}).then(()=> {
				vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				return Promise.resolve();
			});
		}, (err) => {
			assert.ok(false, err)
		}).then(() => done(), done);;
	});
});