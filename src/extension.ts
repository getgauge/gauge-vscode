'use strict';

import {
    workspace, ExtensionContext, extensions,
    commands, window, version, languages
} from 'vscode';

import opn = require('opn');
import { GaugeVSCodeCommands } from './constants';
import { getGaugeVersionInfo, GaugeVersionInfo } from './gaugeVersion';
import { PageProvider } from './pages/provider';
import { GenerateStubCommandProvider } from './annotator/generateStub';
import { GaugeWorkspace } from './gaugeWorkspace';
import { GaugeState } from './gaugeState';
import { ReferenceProvider } from './gaugeReference';
import { ProjectInitializer } from './init/projectInit';
import { ConfigProvider } from './config/configProvider';
import { isGaugeProject, hasActiveGaugeDocument } from './util';
import { showWelcomeNotification, showInstallGaugeNotification } from './welcomeNotifications';

const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';
export let GAUGE_COMMAND;

export function activate(context: ExtensionContext) {
    let versionInfo = getGaugeVersionInfo();
    let folders = workspace.workspaceFolders;
    let pageProvider = new PageProvider(context, !!versionInfo);
    context.subscriptions.push(
        new ProjectInitializer(!!versionInfo),
        pageProvider,
        commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => {
            reportIssue(versionInfo);
        })
    );

    if (!(hasActiveGaugeDocument(window.activeTextEditor)) && (!folders || !folders.some(isGaugeProject))) return;
    if (!versionInfo || !versionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return showInstallGaugeNotification();
    }
    showWelcomeNotification(context);

    languages.setLanguageConfiguration('gauge', { wordPattern: /^(?:[*])([^*].*)$/g });

    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context));

    let clients = gaugeWorkspace.getClients();
    pageProvider.activated = true;

    context.subscriptions.push(
        gaugeWorkspace,
        new ReferenceProvider(clients),
        new GenerateStubCommandProvider(clients),
        new ConfigProvider(context)
    );
}

function reportIssue(gaugeVersion: GaugeVersionInfo) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let gaugeVersionInfo = "";
    if (gaugeVersion != null) {
        gaugeVersionInfo = gaugeVersion.toString();
    } else {
        gaugeVersionInfo = "Gauge executable not found!!";
    }
    let issueTemplate = `\`\`\`
VS-Code version: ${version}
Gauge Extension Version: ${extVersion}

${gaugeVersionInfo}
\`\`\``;

    return opn(`https://github.com/getgauge/gauge-vscode/issues/new?body=${escape(issueTemplate)}`).then(
        () => { }, (err) => {
            window.showErrorMessage("Can't open issue URL. " + err);
        });
}