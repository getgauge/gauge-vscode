import * as assert from 'assert';
import { commands, Uri, window } from 'vscode';
import * as path from 'path';

let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

suite('Gauge References Tests', () => {
    setup(async () => {
        await commands.executeCommand('workbench.action.closeAllEditors');
        let implFile = Uri.file(path.join(testDataPath, 'tests', 'step_implementation.js'));
        await window.showTextDocument(implFile);
    });

    test('should show references for step at cursor', async () => {
        await commands.executeCommand("workbench.action.focusFirstEditorGroup");
        await commands.executeCommand("cursorMove", { to: 'down', by: 'line', value: 18 });
        let value = commands.executeCommand('gauge.showReferences.atCursor');
        assert.ok(value);
    }).timeout(10000);

    test('should not show any reference if cursor is not in step context', async () => {
        await commands.executeCommand("workbench.action.focusFirstEditorGroup");
        await commands.executeCommand("cursorMove", { to: 'down', by: 'line', value: 20 });
        let value = commands.executeCommand('gauge.showReferences.atCursor');
        assert.notEqual(value, true);
    }).timeout(10000);
});
