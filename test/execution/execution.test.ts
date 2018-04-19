import * as assert from 'assert';
import * as path from 'path';
import { TextDocument } from 'vscode-languageclient/lib/main';
import { Uri, commands, window, workspace } from 'vscode';
import { GaugeVSCodeCommands, REPORT_URI } from '../../src/constants';

let testDataPath = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject');

suite('Gauge Execution Tests', () => {
    setup(async () => { await commands.executeCommand('workbench.action.closeAllEditors'); });

    teardown(async () => {
        await commands.executeCommand(GaugeVSCodeCommands.StopExecution);
    });

    test('should execute given specification', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        await window.showTextDocument(Uri.file(spec));
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assert.ok(status);
    }).timeout(10000);

    test('should execute given scenario', async () => {
        let spec = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        await window.showTextDocument(spec);
        let scenario = spec.path + ":6";
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, scenario);
        assert.ok(status);
    }).timeout(10000);

    test('should execute all specification in spec dir', async () => {
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs);
        assert.ok(status);
    }).timeout(10000);

    test('should execute currently open specification', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        await window.showTextDocument(specFile);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteSpec);
        assert.ok(status);
    }).timeout(10000);

    test('should execute scenario at cursor', async () => {
        let specFile = Uri.file(path.join(testDataPath, 'specs', 'example.spec'));
        let editor = await window.showTextDocument(specFile);
        await commands.executeCommand("workbench.action.focusFirstEditorGroup");
        let cm = { to: 'down', by: 'line', value: 8 };
        await commands.executeCommand("cursorMove", cm);
        let status = await commands.executeCommand(GaugeVSCodeCommands.ExecuteScenario);
        assert.ok(status);
    }).timeout(10000);

    test('should abort execution', async () => {
        let spec = path.join(testDataPath, 'specs', 'example.spec');
        await window.showTextDocument(Uri.file(spec));
        // simulate a delay, we could handle this in executor, i.e. before spawining an execution
        // check if an abort signal has been sent.
        // It seems like over-complicating things for a non-human scenario :)
        setTimeout(() => commands.executeCommand(GaugeVSCodeCommands.StopExecution), 100);
        let status = await commands.executeCommand(GaugeVSCodeCommands.Execute, spec);
        assert.equal(status, false);
    });

    test('should open reports inline after execution', (done) => {
        commands.executeCommand(GaugeVSCodeCommands.ExecuteAllSpecs).then(() => {
            commands.executeCommand(GaugeVSCodeCommands.ShowReport).then(() => {
                assert.ok(workspace.textDocuments.some((d) =>
                    !d.isClosed && d.uri.toString() === REPORT_URI),
                    "Expected one document to have last run report");
                done();
            }, (e) => done(e));
        });
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