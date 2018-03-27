'use strict';

import {
    workspace, ExtensionContext, Uri, extensions, Position,
     commands,  window, CancellationTokenSource, version, languages,
} from 'vscode';

import opn = require('opn');
import { GaugeExecutor} from "./execution/gaugeExecutor";
import { VSCodeCommands, GaugeVSCodeCommands } from './constants';
import { getGaugeVersionInfo, GaugeVersionInfo } from './gaugeVersion';
import { PageProvider } from './pages/provider';
import { GenerateStubCommandProvider} from './annotator/generateStub';
import { GaugeWorkspace } from './gaugeWorkspace';
import { GaugeState } from './gaugeState';
import { ReferenceProvider } from './gaugeReference';

const GAUGE_EXTENSION_ID = 'getgauge.gauge';
const GAUGE_VSCODE_VERSION = 'gauge.version';
const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

export function activate(context: ExtensionContext) {
    let currentExtensionVersion = extensions.getExtension(GAUGE_EXTENSION_ID)!.packageJSON.version;
    let hasUpgraded = hasExtensionUpdated(context, currentExtensionVersion);
    let gaugeVersionInfo = getGaugeVersionInfo();
    if (!gaugeVersionInfo || !gaugeVersionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return;
    }
    languages.setLanguageConfiguration('gauge', {
        wordPattern: /^(?:[*])([^*].*)$/g
    });

    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context));

    let clients = gaugeWorkspace.getClients();

    context.subscriptions.push(
        new PageProvider(context, hasUpgraded),
        gaugeWorkspace,
        commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => {
            reportIssue(gaugeVersionInfo);
        }),
        new ReferenceProvider(clients),
        new GenerateStubCommandProvider(clients)
    );
}

function reportIssue(gaugeVersion: GaugeVersionInfo) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let issueTemplate = `\`\`\`
VS-Code version: ${version}
Gauge Extension Version: ${extVersion}

${gaugeVersion.toString()}
\`\`\``;

    return opn(`https://github.com/getgauge/gauge-vscode/issues/new?body=${escape(issueTemplate)}`).then(
        () => { }, (err) => {
            window.showErrorMessage("Can't open issue URL. " + err);
        });
}

function hasExtensionUpdated(context: ExtensionContext, latestVersion: string): boolean {
    const gaugeVsCodePreviousVersion = context.globalState.get<string>(GAUGE_VSCODE_VERSION);
    context.globalState.update(GAUGE_VSCODE_VERSION, latestVersion);
    return !gaugeVsCodePreviousVersion || gaugeVsCodePreviousVersion === latestVersion;
}
