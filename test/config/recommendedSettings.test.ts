import * as assert from 'assert';
import { workspace, commands } from 'vscode';
import { GaugeVSCodeCommands } from '../../src/constants';

suite('Recommended Settings', () => {
    let settings = ["files.autoSave", "files.autoSaveDelay"];
    setup(() => {
        let config = workspace.getConfiguration();
        settings.forEach((s) => {
            config.update(s, config.inspect(s).defaultValue);
        });
    });

    test('should be applied', async () => {
        await commands.executeCommand(GaugeVSCodeCommands.SaveRecommendedSettings);
        let config = workspace.getConfiguration();

        assert.equal(config.get("files.autoSave"), "afterDelay");
        assert.equal(config.get("files.autoSaveDelay"), 500);
    });
});