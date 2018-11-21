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
            () => this.applyAndReload(this.recommendedSettings));

        if (!this.verifyRecommendedConfig()) {
            window.showInformationMessage("Gauge [recommends](https://docs.gauge.org/using.html#id31) " +
                "some settings for best experience with Visual Studio Code.",
                "Apply & Reload", "Ignore", "Ignore Always")
                .then((option) => {
                    if (option === "Apply & Reload") {
                        return this.applyAndReload(this.recommendedSettings);
                    } else if (option === "Ignore Always") {
                        return this.applyAndReload({"gauge.showRecommendedSettings": false});
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
        if (!workspace.getConfiguration().get("gauge.showRecommendedSettings")) return true;
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

    private applyAndReload(settings: Object): Thenable<any> {
        let updatePromises = [];
        for (const key in settings) {
            if (settings.hasOwnProperty(key)) {
                updatePromises.push(workspace.getConfiguration()
                    .update(key, settings[key], ConfigurationTarget.Global));
            }
        }
        return Promise.all(updatePromises).then(() => commands.executeCommand(VSCodeCommands.ReloadWindow));
    }

    dispose() {
        this._disposable.dispose();
    }
}