import * as assert from 'assert';
import { commands, window, workspace } from 'vscode';
import { GaugeVSCodeCommands, WELCOME_PAGE_URI } from '../../src/constants';

suite('Welcome Page', () => {
    setup(() => {
        return commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should be shown inline when invoked via command', async () => {
        await commands.executeCommand(GaugeVSCodeCommands.Welcome);
        assert.ok(workspace.textDocuments.some((d) => !d.isClosed && d.uri.toString() === WELCOME_PAGE_URI),
            "Expected one document to have welcome page");
    });
});