'use strict';

import * as path from 'path';

import {
    workspace, Disposable, ExtensionContext, Uri, extensions, TextDocumentShowOptions, Position, Range,
    WorkspaceFolder, OutputChannel, commands, WorkspaceFoldersChangeEvent, window, StatusBarAlignment,
    CancellationTokenSource, version, TextDocument, TextEditor, languages, Terminal,
} from 'vscode';

import {
    LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind,
    TextDocumentIdentifier, Location as LSLocation, Position as LSPosition, RevealOutputChannelOn, DynamicFeature,
} from 'vscode-languageclient';

import { GaugeWorkspaceFeature } from './gaugeWorkspace.proposed';

import { escape } from "querystring";

import fs = require('fs');
import cp = require('child_process');
import opn = require('opn');
import {
    execute, runScenario, runSpecification, cancel, onBeforeExecute, onExecuted, setReportThemePath
} from "./execution/gaugeExecution";
import { Spec, Scenario, GaugeNode, SpecNodeProvider } from './explorer/specExplorer';
import {
    VSCodeCommands, GaugeVSCodeCommands, GaugeCommandContext, setCommandContext, LAST_REPORT_PATH, REPORT_URI
} from './constants';
import { getGaugeVersionInfo, GaugeVersionInfo } from './gaugeVersion';
import { PageProvider } from './pages/provider';
import { GenerateStubCommandProvider } from './annotator/generateStub';
import { clientLanguageMap } from './execution/debug';
import { FileWatcher } from './fileWatcher';

const DEBUG_LOG_LEVEL_CONFIG = 'enableDebugLogs';
const GAUGE_LAUNCH_CONFIG = 'gauge.launch';
const GAUGE_EXTENSION_ID = 'getgauge.gauge';
const GAUGE_VSCODE_VERSION = 'gauge.version';
const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';
const VIEW_REPORT = "View Report";
const RE_RUN_TESTS = "Repeat Last Run";
const RE_RUN_FAILED_TESTS = "Re-Run Failed Scenario(s)";

let specNodeProvider: SpecNodeProvider;
let activeSpecExplorerFolder: string;
let launchConfig;
let filesystemWatcher: FileWatcher;
let clients: Map<string, LanguageClient> = new Map();
let outputChannel: OutputChannel = window.createOutputChannel('gauge');

export function activate(context: ExtensionContext) {
    let currentExtensionVersion = extensions.getExtension(GAUGE_EXTENSION_ID)!.packageJSON.version;
    let hasUpgraded = hasExtensionUpdated(context, currentExtensionVersion);
    const pageProvider = new PageProvider(context, hasUpgraded);
    context.subscriptions.push(pageProvider);

    let gaugeVersionInfo = getGaugeVersionInfo();
    if (!gaugeVersionInfo || !gaugeVersionInfo.isGreaterOrEqual(MINIMUM_SUPPORTED_GAUGE_VERSION)) {
        return;
    }
    languages.setLanguageConfiguration('gauge', {
        wordPattern: /^(?:[*])([^*].*)$/g
    });

    setReportThemePath(context.asAbsolutePath(path.join('out', 'report-theme')));
    workspace.workspaceFolders.forEach((folder) => startServerFor(folder));
    filesystemWatcher = new FileWatcher(context, clients);
    setCommandContext(GaugeCommandContext.MultiProject, clients.size > 1);

    workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.added) onFolderAddition(event, context);
        if (event.removed) onFolderDeletion(event, context);
        setCommandContext(GaugeCommandContext.MultiProject, clients.size > 1);
    });

    registerStopExecution(context);
    registerExecutionStatus(context, pageProvider);
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.Execute, (spec) => {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        return execute(spec, { inParallel: false, status: spec, projectRoot: cwd });
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteInParallel, (spec) => {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        return execute(spec, { inParallel: true, status: spec, projectRoot: cwd });
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.Debug, (spec) => {
        let cwd = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri).uri.fsPath;
        return execute(spec, { inParallel: false, status: spec, projectRoot: cwd, debug: true });
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteFailed, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (ctx: ExtensionContext, selection: string) => {
                execute(null, { rerunFailed: true, status: "failed scenarios", projectRoot: selection });
            });
        return execute(null, { rerunFailed: true, status: "failed scenarios", projectRoot: getDefaultFolder() });
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteSpec, (spec: Spec) => {
        if (spec) {
            return execute(spec.file, {
                inParallel: false,
                status: spec.file,
                projectRoot: workspace.getWorkspaceFolder(Uri.file(spec.file)).uri.fsPath
            });
        }
        return runSpecification();
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecs, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (ctx: ExtensionContext, selection: string) => {
                runSpecification(selection);
            });
        return runSpecification(getDefaultFolder());
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteAllSpecExplorer, () => {
        return runSpecification(activeSpecExplorerFolder);
    }));

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteScenario, (scn: Scenario) => {
        if (scn) return execute(scn.executionIdentifier, {
            inParallel: false,
            status: scn.executionIdentifier,
            projectRoot: workspace.getWorkspaceFolder(Uri.file(scn.file)).uri.fsPath
        });
        return runScenario(clients, true);
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ExecuteScenarios, () => {
        return runScenario(clients, false);
    }));

    context.subscriptions.push(commands.registerCommand(
        GaugeVSCodeCommands.ShowReferencesAtCursor, showStepReferencesAtCursor(clients))
    );

    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.RepeatExecution, () => {
        if (clients.size > 1)
            return showProjectOptions(context, (ctx: ExtensionContext, selection: string) => {
                execute(null, { repeat: true, status: "previous run", projectRoot: selection });
            });
        return execute(null, { repeat: true, status: "previous run", projectRoot: getDefaultFolder() });
    }));

    context.subscriptions.push(commands.registerCommand(
        GaugeVSCodeCommands.ShowReferences, showStepReferences(clients))
    );
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.ReportIssue, () => {
        reportIssue(gaugeVersionInfo);
    }));
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.Open,
        (node: GaugeNode) => workspace.openTextDocument(node.file).then(showDocumentWithSelection(node)))
    );
    context.subscriptions.push(onConfigurationChange());
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.SwitchProject,
        () => showProjectOptions(context, (ctx: ExtensionContext, selection: string) => {
            activeSpecExplorerFolder = selection;
            specNodeProvider.changeClient(clients.get(Uri.file(selection).fsPath), selection);
        }))
    );

    context.subscriptions.push(new GenerateStubCommandProvider(clients));

    registerSpecNodeProvider(context);
}

function registerSpecNodeProvider(context: ExtensionContext) {
    const defaultWorkspace = Uri.file(getDefaultFolder());
    const client = clients.get(workspace.getWorkspaceFolder(defaultWorkspace).uri.fsPath);
    activeSpecExplorerFolder = defaultWorkspace.fsPath;
    specNodeProvider = new SpecNodeProvider(context, defaultWorkspace.fsPath, filesystemWatcher, client);
}

export function deactivate(): Thenable<void> {
    let promises: Thenable<void>[] = [];
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}

function onFolderAddition(event: WorkspaceFoldersChangeEvent, context: ExtensionContext) {
    for (let folder of event.added) {
        if (!clients.has(folder.uri.fsPath)) {
            startServerFor(folder);
        }
    }
}

function onFolderDeletion(event: WorkspaceFoldersChangeEvent, context: ExtensionContext) {
    for (let folder of event.removed) {
        if (!clients.has(folder.uri.fsPath)) return;
        let client = clients.get(folder.uri.fsPath);
        clients.delete(folder.uri.fsPath);
        client.stop();
        const defaultWorkspace = getDefaultFolder();
        activeSpecExplorerFolder = defaultWorkspace;
        specNodeProvider.changeClient(clients.get(Uri.file(defaultWorkspace).fsPath), defaultWorkspace);
    }
}

function showDocumentWithSelection(node: GaugeNode): (value: TextDocument) => TextEditor | Thenable<TextEditor> {
    return (document) => {
        if (node instanceof Scenario) {
            let scenarioNode: Scenario = node;
            let options: TextDocumentShowOptions = {
                selection: new Range(new Position(scenarioNode.lineNo - 1, 0), new Position(scenarioNode.lineNo - 1, 0))
            };
            return window.showTextDocument(document, options);
        }
        if (node instanceof Spec) {
            let options: TextDocumentShowOptions = {
                selection: new Range(new Position(0, 0), new Position(0, 0))
            };
            return window.showTextDocument(document, options);
        }
        return window.showTextDocument(document);
    };
}

function startServerFor(folder: WorkspaceFolder) {
    if (!fs.existsSync(path.join(folder.uri.fsPath, "manifest.json"))) {
        return;
    }
    let serverOptions = {
        command: 'gauge',
        args: ["daemon", "--lsp", "--dir=" + folder.uri.fsPath],
    };

    launchConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
    if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
        serverOptions.args.push("-l");
        serverOptions.args.push("debug");
    }
    let clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'gauge', pattern: `${folder.uri.fsPath}/**/*` }],
        diagnosticCollectionName: 'gauge',
        workspaceFolder: folder,
        outputChannel,
        revealOutputChannelOn: RevealOutputChannelOn.Never,
    };
    let languageClient = new LanguageClient('gauge', 'Gauge', serverOptions, clientOptions);

    registerDynamicFeatures(languageClient);
    clients.set(folder.uri.fsPath, languageClient);
    languageClient.start();

    languageClient.onReady().then(() => { setLanguageId(languageClient, folder.uri.fsPath); });
}

function setLanguageId(languageClient: LanguageClient, projectRoot: string) {
    languageClient.sendRequest("gauge/getRunnerLanguage", new CancellationTokenSource().token).then(
        (language: string) => {
            clientLanguageMap.set(projectRoot, language);
        }
    );
}

function registerDynamicFeatures(languageClient: LanguageClient) {
    let result: Array<(DynamicFeature<any>)> = [];
    result.push(new GaugeWorkspaceFeature(languageClient));
    languageClient.registerFeatures(result);
}

function registerStopExecution(context: ExtensionContext) {
    let stopExecution = window.createStatusBarItem(StatusBarAlignment.Left, 2);
    stopExecution.command = GaugeVSCodeCommands.StopExecution;
    stopExecution.tooltip = 'Click to Stop Run';
    context.subscriptions.push(stopExecution);
    onBeforeExecute((s) => {
        stopExecution.text = `$(primitive-square) Running ${s}`;
        stopExecution.show();
    });
    onExecuted(() => stopExecution.hide());
    context.subscriptions.push(commands.registerCommand(GaugeVSCodeCommands.StopExecution, () => { cancel(); }));
}

function registerExecutionStatus(context: ExtensionContext, provider: PageProvider) {
    let executionStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
    executionStatus.command = GaugeVSCodeCommands.ShowReport;
    context.subscriptions.push(executionStatus);
    let root;
    onBeforeExecute(() => {
        executionStatus.hide();
    });
    onExecuted((projectRoot, aborted, reportPath) => {
        if (aborted) {
            executionStatus.hide();
        } else {
            provider.update(Uri.parse(REPORT_URI));
            root = projectRoot;
            let languageClient = clients.get(Uri.file(projectRoot).fsPath);
            return languageClient.sendRequest("gauge/executionStatus", {}, new CancellationTokenSource().token).then(
                (val: any) => {
                    let status = '#999999';
                    if (val.sceFailed > 0)
                        status = '#E73E48';
                    else if (val.scePassed > 0)
                        status = '#66ff66';
                    executionStatus.color = status;
                    executionStatus.text = `$(check) ` + val.scePassed + `  $(x) ` + val.sceFailed +
                        `  $(issue-opened) ` + val.sceSkipped;
                    executionStatus.tooltip = "Specs : " + val.specsExecuted + " Executed, "
                        + val.specsPassed + " Passed, " + val.specsFailed + " Failed, " + val.specsSkipped
                        + " Skipped" + "\n" + "Scenarios : " + val.sceExecuted + " Executed, " + val.scePassed
                        + " Passed, " + val.sceFailed + " Failed, " + val.sceSkipped + " Skipped";
                    executionStatus.show();
                    context.workspaceState.update(LAST_REPORT_PATH, reportPath.trim());
                }
            );
        }
    });
}

function getDefaultFolder() {
    let projects: any = [];
    clients.forEach((v, k) => projects.push(k));
    return projects.sort((a: any, b: any) => a > b)[0];
}

function showProjectOptions(context: ExtensionContext, onChange: Function) {
    let projectItems = [];
    clients.forEach((v, k) => projectItems.push({ label: path.basename(k), description: k }));
    return window.showQuickPick(projectItems).then((selected) => {
        if (selected) {
            return onChange(context, selected.description);
        }
    }, (err) => {
        window.showErrorMessage('Unable to select project.', err);
    });
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

function onConfigurationChange() {
    return workspace.onDidChangeConfiguration((params) => {
        let newConfig = workspace.getConfiguration(GAUGE_LAUNCH_CONFIG);
        if (launchConfig.get(DEBUG_LOG_LEVEL_CONFIG) !== newConfig.get(DEBUG_LOG_LEVEL_CONFIG)) {
            let msg = 'Gauge Language Server configuration changed, please restart VS Code.';
            let action = 'Restart Now';
            launchConfig = newConfig;
            window.showWarningMessage(msg, action).then((selection) => {
                if (action === selection) {
                    commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });
}

function hasExtensionUpdated(context: ExtensionContext, latestVersion: string): boolean {
    const gaugeVsCodePreviousVersion = context.globalState.get<string>(GAUGE_VSCODE_VERSION);
    context.globalState.update(GAUGE_VSCODE_VERSION, latestVersion);
    return !gaugeVsCodePreviousVersion || gaugeVsCodePreviousVersion === latestVersion;
}
