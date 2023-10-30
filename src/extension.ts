'use strict';

import { debug, ExtensionContext, languages, window, workspace } from 'vscode';
import { GenerateStubCommandProvider } from './annotator/generateStub';
import { CLI } from './cli';
import { ConfigProvider } from './config/configProvider';
import { ReferenceProvider } from './gaugeReference';
import { GaugeState } from './gaugeState';
import { GaugeWorkspace } from './gaugeWorkspace';
import { ProjectInitializer } from './init/projectInit';
import { ProjectFactory } from './project/projectFactory';
import { hasActiveGaugeDocument } from './util';
import { showInstallGaugeNotification, showWelcomeNotification } from './welcomeNotifications';
import { GaugeClients as GaugeProjectClientMap } from './gaugeClients';

const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

const clientsMap: GaugeProjectClientMap = new GaugeProjectClientMap();

export async function activate(context: ExtensionContext) {
    let cli = CLI.instance();
    if (!cli) {
        return;
    }
    let folders = workspace.workspaceFolders;
    context.subscriptions.push(new ProjectInitializer(cli));
    let hasGaugeProject = folders && folders.some((f) => ProjectFactory.isGaugeProject(f.uri.fsPath));
    if (!hasActiveGaugeDocument(window.activeTextEditor) && !hasGaugeProject) return;
    if (!cli.isGaugeInstalled() || !cli.isGaugeVersionGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return showInstallGaugeNotification();
    }
    showWelcomeNotification(context);
    languages.setLanguageConfiguration('gauge', { wordPattern: /^(?:[*])([^*].*)$/g });
    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context), cli, clientsMap);

    context.subscriptions.push(
        gaugeWorkspace,
        new ReferenceProvider(clientsMap),
        new GenerateStubCommandProvider(clientsMap),
        new ConfigProvider(context),
        debug.registerDebugConfigurationProvider('gauge',
            {
                resolveDebugConfiguration: () => {
                    throw Error("Starting with the Gauge debug configuration is not supported. Please use the 'Gauge' commands instead.");
                }
            })
    );
}

export function deactivate(): Thenable<void> {
    const promises: Thenable<void>[] = [];

    for (const {client} of clientsMap.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}