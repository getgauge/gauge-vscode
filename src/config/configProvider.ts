'use strict';

import { Disposable, ExtensionContext, window, commands, workspace, ConfigurationTarget } from "vscode";
import { VSCodeCommands, GaugeVSCodeCommands } from "../constants";

const FILE_ASSOCIATIONS_KEY = "files.associations";

export class ConfigProvider extends Disposable {
    private recommendedSettings = {
        "files.autoSave": "afterDelay",
        "files.autoSaveDelay": 500
    };

    private _disposable: Disposable;

    constructor(private context: ExtensionContext) {
        super(() => this.dispose());

        this.applyDefaultSettings();
        this._disposable = commands.registerCommand(GaugeVSCodeCommands.SaveRecommendedSettings,
            () => this.applyAndReload(this.recommendedSettings, ConfigurationTarget.Workspace));

        if (!this.verifyRecommendedConfig()) {
            let config = workspace.getConfiguration().inspect("gauge.recommendedSettings.options");
            if (config.globalValue === "Apply & Reload") {
                let settings = {...this.recommendedSettings};
                this.applyAndReload(settings, ConfigurationTarget.Workspace);
                return;
            }
            window.showInformationMessage("Gauge [recommends](https://docs.gauge.org/using.html#id31) " +
                "some settings for best experience with Visual Studio Code.",
                "Apply & Reload", "Remind me later", "Ignore")
                .then((option) => {
                    if (option === "Apply & Reload") {
                        this.applyAndReload(this.recommendedSettings, ConfigurationTarget.Workspace, false);
                        let settings = {"gauge.recommendedSettings.options": "Apply & Reload"};
                        return this.applyAndReload(settings, ConfigurationTarget.Global);
                    } else if (option === "Ignore") {
                        let settings = { "gauge.recommendedSettings.options": "Ignore" };
                        return this.applyAndReload(settings, ConfigurationTarget.Global, false);
                    } else if (option === "Remind me later") {
                        let config = workspace.getConfiguration().inspect("gauge.recommendedSettings.options");
                        if (config.globalValue !== "Remind me later") {
                            let settings = { "gauge.recommendedSettings.options": "Remind me later" };
                            return this.applyAndReload(settings, ConfigurationTarget.Global, false);
                        }
                    }
                });
        }
    }

    private applyDefaultSettings() {
        let workspaceConfig = workspace.getConfiguration().inspect(FILE_ASSOCIATIONS_KEY).workspaceValue;
        let recomendedConfig = {};
        if (!!workspaceConfig) recomendedConfig = workspaceConfig;
        recomendedConfig["*.spec"] = "gauge";
        recomendedConfig["*.cpt"] = "gauge";
        workspace.getConfiguration().update(FILE_ASSOCIATIONS_KEY, recomendedConfig, ConfigurationTarget.Workspace);
    }

    private verifyRecommendedConfig(): boolean {
        let config = workspace.getConfiguration().inspect("gauge.recommendedSettings.options");
        if (config.globalValue === "Ignore") return true;
        for (const key in this.recommendedSettings) {
            if (this.recommendedSettings.hasOwnProperty(key)) {
                let configVal = workspace.getConfiguration().inspect(key);
                if (!configVal.workspaceFolderValue && !configVal.workspaceValue &&
                    configVal.globalValue !== this.recommendedSettings[key]) {
                    return false;
                }
            }
        }
        return true;
    }

    private applyAndReload(settings: Object, configurationTarget: number, shouldReload: boolean = true): Thenable<any> {
        let updatePromises = [];
        for (const key in settings) {
            if (settings.hasOwnProperty(key)) {
                updatePromises.push(workspace.getConfiguration()
                    .update(key, settings[key], configurationTarget));
            }
        }
        if (!shouldReload) return;
        return Promise.all(updatePromises).then(() => commands.executeCommand(VSCodeCommands.ReloadWindow));
    }

    dispose() {
        this._disposable.dispose();
    }
}