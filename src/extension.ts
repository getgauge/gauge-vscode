'use strict';

import { commands, ExtensionContext, extensions, languages, version, window, workspace } from 'vscode';
import { GenerateStubCommandProvider } from './annotator/generateStub';
import { CLI } from './cli';
import { ConfigProvider } from './config/configProvider';
import { GaugeVSCodeCommands } from './constants';
import { ReferenceProvider } from './gaugeReference';
import { GaugeState } from './gaugeState';
import { GaugeWorkspace } from './gaugeWorkspace';
import { ProjectInitializer } from './init/projectInit';
import { PageProvider } from './pages/provider';
import { ProjectFactory } from './project/projectFactory';
import { hasActiveGaugeDocument } from './util';
import { showInstallGaugeNotification, showWelcomeNotification } from './welcomeNotifications';

import opn = require('opn');

const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

export async function activate(context: ExtensionContext) {
    let cli = CLI.instance();
    let folders = workspace.workspaceFolders;
    let pageProvider = new PageProvider(context, cli.isGaugeInstalled());
    context.subscriptions.push(
        new ProjectInitializer(cli),
        pageProvider,
        commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => {
            reportIssue(cli);
        })
    );
    let hasGaugeProject = folders && folders.some((f) => ProjectFactory.get(f.uri.fsPath).isGaugeProject());
    if (!hasActiveGaugeDocument(window.activeTextEditor) && !hasGaugeProject) return;
    if (!cli.isGaugeInstalled() || !cli.isGaugeVersionGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return showInstallGaugeNotification();
    }
    showWelcomeNotification(context);
    languages.setLanguageConfiguration('gauge', { wordPattern: /^(?:[*])([^*].*)$/g });

    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context), cli);

    let clientsMap = gaugeWorkspace.getClientsMap();
    pageProvider.activated = true;

    context.subscriptions.push(
        gaugeWorkspace,
        new ReferenceProvider(clientsMap),
        new GenerateStubCommandProvider(clientsMap),
        new ConfigProvider(context)
    );
}

function reportIssue(cli: CLI) {
    let extVersion = extensions.getExtension("getgauge.gauge").packageJSON.version;
    let gaugeVersionInfo = "";
    if (cli.isGaugeInstalled()) {
        gaugeVersionInfo = cli.gaugeVersionString();
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
