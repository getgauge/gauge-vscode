'use strict';

import {
    workspace, ExtensionContext, Uri, extensions, Position,
     commands,  window, CancellationTokenSource, version, languages,
} from 'vscode';

import {
    LanguageClient, TextDocumentIdentifier, Location as LSLocation, Position as LSPosition
} from 'vscode-languageclient';

import opn = require('opn');
import { GaugeExecutor} from "./execution/gaugeExecutor";
import { VSCodeCommands, GaugeVSCodeCommands } from './constants';
import { getGaugeVersionInfo, GaugeVersionInfo } from './gaugeVersion';
import { PageProvider } from './pages/provider';
import { GenerateStubCommandProvider} from './annotator/generateStub';
import { GaugeWorkspace } from './gaugeWorkspace';
import { GaugeState } from './gaugeState';

const GAUGE_EXTENSION_ID = 'getgauge.gauge';
const GAUGE_VSCODE_VERSION = 'gauge.version';
const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

export function activate(context: ExtensionContext) {
    let currentExtensionVersion = extensions.getExtension(GAUGE_EXTENSION_ID)!.packageJSON.version;
    let hasUpgraded = hasExtensionUpdated(context, currentExtensionVersion);
    context.subscriptions.push(new PageProvider(context, hasUpgraded));
    let gaugeWorkspace = new GaugeWorkspace(new GaugeState(context));
    context.subscriptions.push(gaugeWorkspace);

    let clients = gaugeWorkspace.getClients();
    let gaugeVersionInfo = getGaugeVersionInfo();
    if (!gaugeVersionInfo || !gaugeVersionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return;
    }
    languages.setLanguageConfiguration('gauge', {
        wordPattern: /^(?:[*])([^*].*)$/g
    });

    context.subscriptions.push(commands.registerCommand(
        GaugeVSCodeCommands.ShowReferencesAtCursor, showStepReferencesAtCursor(clients))
    );

    context.subscriptions.push(commands.registerCommand(
        GaugeVSCodeCommands.ShowReferences, showStepReferences(clients))
    );
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => {
        reportIssue(gaugeVersionInfo);
    }));

    context.subscriptions.push(new GenerateStubCommandProvider(clients));
}

function notifyToInstallGauge(message: string) {
    window.showWarningMessage(message, 'Install').then((selected) => {
        if (selected === 'Install') {
            opn('https://getgauge.io/get-started.html');
        }
    });
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

function showStepReferences(clients: Map<string, LanguageClient>):
    (uri: string, position: LSPosition, stepValue: string) => Thenable<any> {
    return (uri: string, position: LSPosition, stepValue: string) => {
        let languageClient = clients.get(workspace.getWorkspaceFolder(Uri.parse(uri)).uri.fsPath);
        return languageClient.sendRequest("gauge/stepReferences", stepValue, new CancellationTokenSource().token).then(
            (locations: LSLocation[]) => {
                return showReferences(locations, uri, languageClient, position);
            });
    };
}

function showStepReferencesAtCursor(clients: Map<string, LanguageClient>): () => Thenable<any> {
    return (): Thenable<any> => {
        let position = window.activeTextEditor.selection.active;
        let documentId = TextDocumentIdentifier.create(window.activeTextEditor.document.uri.toString());
        let activeEditor = window.activeTextEditor.document.uri;
        let languageClient = clients.get(workspace.getWorkspaceFolder(activeEditor).uri.fsPath);
        let params = { textDocument: documentId, position };
        return languageClient.sendRequest("gauge/stepValueAt", params, new CancellationTokenSource().token).then(
            (stepValue: string) => {
                return showStepReferences(clients)(documentId.uri, position, stepValue);
            });
    };
}

function showReferences(locations: LSLocation[], uri: string, languageClient: LanguageClient, position: LSPosition):
    Thenable<any> {
    if (locations) {
        return commands.executeCommand(VSCodeCommands.ShowReferences, Uri.parse(uri),
            languageClient.protocol2CodeConverter.asPosition(position),
            locations.map(languageClient.protocol2CodeConverter.asLocation));
    }
    window.showInformationMessage('No reference found!');
    return Promise.resolve(false);
}

function hasExtensionUpdated(context: ExtensionContext, latestVersion: string): boolean {
    const gaugeVsCodePreviousVersion = context.globalState.get<string>(GAUGE_VSCODE_VERSION);
    context.globalState.update(GAUGE_VSCODE_VERSION, latestVersion);
    return !gaugeVsCodePreviousVersion || gaugeVsCodePreviousVersion === latestVersion;
}
