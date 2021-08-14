import * as assert from 'assert';
import * as path from 'path';
import { commands, Uri, window, workspace } from 'vscode';
import { GaugeVSCodeCommands } from '../../src/constants';
import { createSandbox } from 'sinon';

let testDataPath = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject');

suite('Gauge Execution Tests', () => {
    let sandbox;

    teardown(() => {
        sandbox.restore();
    });

    setup(async () => {
        sandbox = createSandbox();
        await commands.executeCommand('workbench.action.closeAllEditors');
    });

    let assertStatus = (status, val = true) => {
        let logDoc = workspace.textDocuments.find((x) => x.languageId === "Log");
        let output = logDoc && logDoc.getText() || "Couldn't find the log output.";
        assert.equal(status, val, "Output:\n\n" + output);
    };

    teardown(async () => {
        await commands.executeCommand(GaugeVSCodeCommands.StopExecution);
        await commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('should execute given specification', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        let doc = await workspace.openTextDocument(Uri.file(spec));
        await window.showTextDocument(doc);
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assertStatus(status);
    }).timeout(30000);

    test('should execute given scenario', async () => {
        let spec = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        let doc = await workspace.openTextDocument(spec);
        await window.showTextDocument(doc);
        let scenario = spec.fsPath + ":6";
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, scenario);
        assertStatus(status);
    }).timeout(20000);

    test('should execute all specification in spec dir', async () => {
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs);
        assertStatus(status);
    }).timeout(20000);

    test('should execute currently open specification', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        let doc = await workspace.openTextDocument(specFile);
        await window.showTextDocument(doc);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteSpec);
        assertStatus(status);
    }).timeout(20000);

    test('should execute scenario at cursor', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        let doc = await workspace.openTextDocument(specFile);
        await window.showTextDocument(doc);
        await commands.executeCommand("workbench.action.focusFirstEditorGroup");
        let cm = { to: 'down', by: 'line', value: 8 };
        await commands.executeCommand("cursorMove", cm);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteScenario);
        assertStatus(status);
    }).timeout(20000);

    test('should abort execution', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        let doc = await workspace.openTextDocument(Uri.file(spec));
        await window.showTextDocument(doc);
        // simulate a delay, we could handle this in executor, i.e. before spawining an execution
        // check if an abort signal has been sent.
        // It seems like over-complicating things for a non-human scenario :)
        setTimeout(() => commands.executeCommand(GaugeVSCodeCommands.StopExecution), 100);
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assertStatus(status, false);
    });

    test('should reject execution when another is already in progress', async () => {
        let expectedErrorMessage;
        sandbox.stub(window, 'showErrorMessage').callsFake((args) => expectedErrorMessage = args );

        let spec = path.join(testDataPath, 'specs', 'example.spec');
        let doc = await workspace.openTextDocument(Uri.file(spec));
        await window.showTextDocument(doc);
        commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs);
        try {
            await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
            throw new Error("Must not run new tests when others are already in progress");
        } catch {
            assert.equal(expectedErrorMessage, "A Specification or Scenario is still running!");
        }
    }).timeout(20000);
});
