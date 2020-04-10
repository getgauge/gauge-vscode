import * as assert from 'assert';
import * as path from 'path';
import { commands, Uri, window, workspace } from 'vscode';
import { GaugeVSCodeCommands } from '../../src/constants';

let testDataPath = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject');

suite('Gauge Execution Tests', () => {
    setup(async () => { await commands.executeCommand('workbench.action.closeAllEditors'); });

    let assertStatus = (status, val = true) => {
        let logDoc = workspace.textDocuments.find((x) => x.languageId === "Log");
        let output = logDoc && logDoc.getText() || "Couldn't find the log output.";
        assert.equal(status, val, "Output:\n\n" + output);
    };

    teardown(async () => {
        await commands.executeCommand(GaugeVSCodeCommands.StopExecution);
    });

    test('should execute given specification', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        await window.showTextDocument(Uri.file(spec));
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assertStatus(status);
    }).timeout(20000);

    test('should execute given scenario', async () => {
        let spec = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        await window.showTextDocument(spec);
        let scenario = spec.fsPath + ":6";
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, scenario);
        assertStatus(status);
    }).timeout(10000);

    test('should execute all specification in spec dir', async () => {
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs);
        assertStatus(status);
    }).timeout(10000);

    test('should execute currently open specification', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        await window.showTextDocument(specFile);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteSpec);
        assertStatus(status);
    }).timeout(10000);

    test('should execute scenario at cursor', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        await window.showTextDocument(specFile);
        await commands.executeCommand("workbench.action.focusFirstEditorGroup");
        let cm = { to: 'down', by: 'line', value: 8 };
        await commands.executeCommand("cursorMove", cm);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteScenario);
        assertStatus(status);
    }).timeout(10000);

    test('should abort execution', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        await window.showTextDocument(Uri.file(spec));
        // simulate a delay, we could handle this in executor, i.e. before spawining an execution
        // check if an abort signal has been sent.
        // It seems like over-complicating things for a non-human scenario :)
        setTimeout(() => commands.executeCommand(GaugeVSCodeCommands.StopExecution), 100);
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assertStatus(status, false);
    });

    test('should reject execution when another is already in progress', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        await window.showTextDocument(Uri.file(spec));
        commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs);
        try {
            await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
            throw new Error("Expected simultaneous runs to reject");
        } catch (err) {
            assert.equal(err.message, "A Specification or Scenario is still running!");
        }
    }).timeout(10000);
});