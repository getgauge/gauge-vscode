'use strict';

import * as assert from 'node:assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigProvider } from '../../src/config/configProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal stub of the object returned by
 * workspace.getConfiguration().inspect(...).
 */
function makeInspectResult(values: Partial<{
    globalValue: string;
    workspaceValue: string;
    workspaceFolderValue: string;
}> = {}) {
    return {
        key: 'gauge.recommendedSettings.options',
        defaultValue: undefined,
        globalValue: undefined,
        workspaceValue: undefined,
        workspaceFolderValue: undefined,
        ...values,
    };
}

/**
 * Returns a fake WorkspaceConfiguration whose inspect() returns different
 * results based on the key passed to it, letting each test control only the
 * key it cares about.
 */
function makeWorkspaceConfig(
    recommendedOptionsInspect: ReturnType<typeof makeInspectResult>,
    // Passing a workspaceValue on "other" keys makes verifyRecommendedConfig()
    // return true (settings already applied), which is the default so most
    // tests only need to worry about the options key.
    otherInspect: ReturnType<typeof makeInspectResult> = makeInspectResult({
        workspaceValue: 'already-set' as any,
    })
): vscode.WorkspaceConfiguration {
    const updateStub = sinon.stub().resolves();
    const inspectStub = sinon.stub().callsFake((key: string) => {
        if (key === 'gauge.recommendedSettings.options') return recommendedOptionsInspect;
        if (key === 'files.associations') return makeInspectResult({ workspaceValue: {} as any });
        return otherInspect;
    });

    return {
        inspect: inspectStub,
        update: updateStub,
        get: sinon.stub(),
        has: sinon.stub(),
    } as unknown as vscode.WorkspaceConfiguration;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

suite('ConfigProvider - verifyRecommendedConfig / constructor ignore guard', () => {
    let sandbox: sinon.SinonSandbox;
    let getConfigurationStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let registerCommandStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let fakeContext: vscode.ExtensionContext;

    setup(() => {
        sandbox = sinon.createSandbox();
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
        registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand').returns({ dispose: sinon.stub() });
        executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
        getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration');
        fakeContext = {} as vscode.ExtensionContext;
    });

    teardown(() => {
        sandbox.restore();
    });

    // -----------------------------------------------------------------------
    // Core "Ignore" guard — the bug fixed by PR #1107
    // -----------------------------------------------------------------------

    test('does NOT show prompt when workspaceValue is "Ignore" (code-workspace file)', () => {
        // This is the exact scenario from the bug report: the user stored
        // "Ignore" inside a .code-workspace file, which sets workspaceValue.
        // Before the fix, only globalValue was checked here so the prompt
        // appeared anyway.
        const config = makeWorkspaceConfig(makeInspectResult({ workspaceValue: 'Ignore' }));
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'Prompt must not be shown when workspaceValue is "Ignore"'
        );
    });

    test('does NOT show prompt when workspaceFolderValue is "Ignore"', () => {
        const config = makeWorkspaceConfig(makeInspectResult({ workspaceFolderValue: 'Ignore' }));
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'Prompt must not be shown when workspaceFolderValue is "Ignore"'
        );
    });

    test('does NOT show prompt when globalValue is "Ignore"', () => {
        // Pre-existing behaviour that must still hold after the PR.
        const config = makeWorkspaceConfig(makeInspectResult({ globalValue: 'Ignore' }));
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'Prompt must not be shown when globalValue is "Ignore"'
        );
    });

    // -----------------------------------------------------------------------
    // "Apply & Reload" path — must still work after the fix
    // -----------------------------------------------------------------------

    test('auto-applies settings and does NOT show prompt when globalValue is "Apply & Reload"', () => {
        // verifyRecommendedConfig returns false (settings not yet applied) so
        // the constructor reaches the globalValue === "Apply & Reload" branch.
        const recommendedInspect = makeInspectResult({ globalValue: 'Apply & Reload' });
        const settingInspect = makeInspectResult(); // no workspaceValue → not applied yet
        const config = makeWorkspaceConfig(recommendedInspect, settingInspect);
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'Prompt must not appear when "Apply & Reload" is already stored'
        );
        assert.ok(
            (config.update as sinon.SinonStub).called,
            'Settings must be applied when globalValue is "Apply & Reload"'
        );
    });

    // -----------------------------------------------------------------------
    // Prompt is shown when nothing is configured yet
    // -----------------------------------------------------------------------

    test('shows prompt when no preference has been set and settings are missing', () => {
        // No value anywhere → user hasn't chosen yet → prompt should appear.
        const recommendedInspect = makeInspectResult();  // all undefined
        const settingInspect = makeInspectResult();      // not applied either
        const config = makeWorkspaceConfig(recommendedInspect, settingInspect);
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.calledOnce,
            'Prompt must be shown when no preference is stored and settings are missing'
        );
    });

    test('does NOT show prompt when recommended settings are already applied at workspace level', () => {
        // workspaceValue being set means the settings are already in place.
        const recommendedInspect = makeInspectResult();  // no "Ignore"
        const settingInspect = makeInspectResult({ workspaceValue: 'afterDelay' as any });
        const config = makeWorkspaceConfig(recommendedInspect, settingInspect);
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'Prompt must not appear when recommended settings are already applied'
        );
    });

    // -----------------------------------------------------------------------
    // User responds to prompt — "Ignore"
    // -----------------------------------------------------------------------

    test('saves "Ignore" to Global scope and does not reload when user picks Ignore', async () => {
        showInformationMessageStub.resolves('Ignore');

        const config = makeWorkspaceConfig(makeInspectResult(), makeInspectResult());
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);
        await Promise.resolve(); // flush the .then() callback

        const updateStub = config.update as sinon.SinonStub;
        const ignoreCall = updateStub.args.find(
            ([key, value, target]) =>
                key === 'gauge.recommendedSettings.options' &&
                value === 'Ignore' &&
                target === vscode.ConfigurationTarget.Global
        );

        assert.ok(ignoreCall, '"gauge.recommendedSettings.options" must be saved as "Ignore" in Global scope');
        assert.ok(executeCommandStub.notCalled, 'Window must NOT reload when user picks Ignore');
    });

    // -----------------------------------------------------------------------
    // User responds to prompt — "Apply & Reload"
    // -----------------------------------------------------------------------

    test('applies settings and reloads window when user picks "Apply & Reload"', async () => {
        showInformationMessageStub.resolves('Apply & Reload');

        const config = makeWorkspaceConfig(makeInspectResult(), makeInspectResult());
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        // Drain the microtask queue across multiple promise chain hops:
        // showInformationMessage → .then() → Promise.all() → .then(executeCommand)
        for (let i = 0; i < 10; i++) await Promise.resolve();

        assert.ok(
            executeCommandStub.called,
            'Window should reload after user picks "Apply & Reload"'
        );
    });

    // -----------------------------------------------------------------------
    // Precedence — more-specific scope wins
    // -----------------------------------------------------------------------

    test('workspaceFolderValue "Ignore" takes precedence over globalValue "Apply & Reload"', () => {
        const config = makeWorkspaceConfig(makeInspectResult({
            globalValue: 'Apply & Reload',
            workspaceFolderValue: 'Ignore',
        }));
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'workspaceFolderValue "Ignore" must suppress the prompt'
        );
        const updateStub = config.update as sinon.SinonStub;
        assert.ok(
            updateStub.args.every(([key]) => key !== 'files.autoSave'),
            'Recommended settings must not be written when ignored'
        );
    });

    test('workspaceValue "Ignore" takes precedence over globalValue "Apply & Reload"', () => {
        const config = makeWorkspaceConfig(makeInspectResult({
            globalValue: 'Apply & Reload',
            workspaceValue: 'Ignore',
        }));
        getConfigurationStub.returns(config);

        new ConfigProvider(fakeContext);

        assert.ok(
            showInformationMessageStub.notCalled,
            'workspaceValue "Ignore" must suppress the prompt'
        );
    });
});
