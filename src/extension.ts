    'use strict';

    import { debug, ExtensionContext, languages, window, workspace, ConfigurationTarget } from 'vscode';
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
    import { GaugeSemanticTokensProvider, legend } from './semanticTokensProvider';

    const MINIMUM_SUPPORTED_GAUGE_VERSION = '0.9.6';

    const clientsMap: GaugeProjectClientMap = new GaugeProjectClientMap();

    // This function reads Gauge-specific semantic token colors from the configuration
    // and then updates the editor.semanticTokenColorCustomizations setting.
    function updateGaugeSemanticTokenColors() {
        // Read Gauge settings from the gauge configuration section.
        const gaugeConfig = workspace.getConfiguration("gauge.semanticTokenColors");
        const colors = {
            argument: gaugeConfig.get("argument"),
            stepMarker: gaugeConfig.get("stepMarker"),
            step: gaugeConfig.get("step"),
            table: gaugeConfig.get("table"),
            tableHeaderSeparator: gaugeConfig.get("tableHeaderSeparator"),
            tableBorder: gaugeConfig.get("tableBorder"),
            tableKeyword: gaugeConfig.get("tableKeyword"),
            tagKeyword: gaugeConfig.get("tagKeyword"),
            tagValue: gaugeConfig.get("tagValue"),
            specification: gaugeConfig.get("specification"),
            scenario: gaugeConfig.get("scenario"),
            comment: gaugeConfig.get("comment"),
            disabledStep: gaugeConfig.get("disabledStep")
        };

        // Build a new set of semantic token color rules.
        const semanticTokenRules = {
            "argument": { "foreground": colors.argument },
            "stepMarker": { "foreground": colors.stepMarker },
            "step": { "foreground": colors.step },
            "table": { "foreground": colors.table },
            "tableHeaderSeparator": { "foreground": colors.tableHeaderSeparator },
            "tableBorder": { "foreground": colors.tableBorder },
            "tableKeyword": { "foreground": colors.tableKeyword },
            "tagKeyword": { "foreground": colors.tagKeyword },
            "tagValue": { "foreground": colors.tagValue },
            "specification": { "foreground": colors.specification },
            "scenario": { "foreground": colors.scenario },
            "gaugeComment": { "foreground": colors.comment },
            "disabledStep": { "foreground": colors.disabledStep }
        };

        // Get the current global editor configuration.
        const editorConfig = workspace.getConfiguration("editor");

        // Update the semantic token color customizations.
        editorConfig.update("semanticTokenColorCustomizations", { rules: semanticTokenRules }, ConfigurationTarget.Global);
    }

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
        updateGaugeSemanticTokenColors();

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
                }),
            languages.registerDocumentSemanticTokensProvider(
                { language: 'gauge' },
                new GaugeSemanticTokensProvider(),
                legend
            ),
            workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("gauge.semanticTokenColors")) {
                    updateGaugeSemanticTokenColors();
                }
            })
        );
    }

    export function deactivate(): Thenable<void> {
        const promises: Thenable<void>[] = [];

        for (const { client } of clientsMap.values()) {
            promises.push(client.stop());
        }
        return Promise.all(promises).then(() => undefined);
    }