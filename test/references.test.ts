import * as assert from 'assert';
import * as path from 'path';
import vscode = require('vscode');
import { TextDocument } from 'vscode-languageclient/lib/main';
import { connect } from 'tls';

let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

suite('Gauge References Tests', () => {
    setup(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should show references for step at cursor', async () => {
        let specFile = vscode.Uri.file(path.join(testDataPath, 'tests', 'step_implementation.js'));
        let editor = await vscode.window.showTextDocument(specFile)
        await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup")
        await vscode.commands.executeCommand("cursorMove", { to: 'down', by: 'line', value: 18 })
        let value = await vscode.commands.executeCommand('gauge.showReferences.atCursor')
        assert.ok(value);
    }).timeout(10000);

    test('should not show any reference if cursor is not in step context', async () => {
        let specFile = vscode.Uri.file(path.join(testDataPath, 'tests', 'step_implementation.js'));
        let editor = await vscode.window.showTextDocument(specFile);
        await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
        await vscode.commands.executeCommand("cursorMove", { to: 'down', by: 'line', value: 20 });
        let value = vscode.commands.executeCommand('gauge.showReferences.atCursor')
        assert.notEqual(value, true);
    }).timeout(10000);
});
