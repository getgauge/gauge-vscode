'use strict';

import { commands, ExtensionContext, extensions, languages, version, window, workspace, Uri, env} from 'vscode';
import { GenerateStubCommandProvider } from './annotator/generateStub';
import { CLI } from './cli';
import { ConfigProvider } from './config/configProvider';
import { GaugeVSCodeCommands } from './constants';
import { ReferenceProvider } from './gaugeReference';
import { GaugeWorkspace } from './gaugeWorkspace';
import { ProjectInitializer } from './init/projectInit';
import { ProjectFactory } from './project/projectFactory';
import { hasActiveGaugeDocument } from './util';
import { GaugeState } from './gaugeState';
import { showInstallGaugeNotification, showWelcomeNotification } from './welcomeNotifications';

const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

export async function activate(context: ExtensionContext) {
    let cli = CLI.instance();
    if (!cli) {
        return;
    }
    let folders = workspace.workspaceFolders;
    let hasGaugeProject = folders && folders.some((f) => ProjectFactory.isGaugeProject(f.uri.fsPath));
    if (!hasActiveGaugeDocument(window.activeTextEditor) && !hasGaugeProject) return;
    if (!cli.isGaugeInstalled() || !cli.isGaugeVersionGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return showInstallGaugeNotification();
    }
    showWelcomeNotification(context);
    languages.setLanguageConfiguration('gauge', { wordPattern: /^(?:[*])([^*].*)$/g });

    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context), cli);

    let clientsMap = gaugeWorkspace.getClientsMap();

    context.subscriptions.push(
        gaugeWorkspace,
        new ReferenceProvider(clientsMap),
        new GenerateStubCommandProvider(clientsMap),
        new ConfigProvider(context)
    );
}
