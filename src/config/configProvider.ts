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
            () => this.applyAndReload());

        if (!this.verify()) {
            window.showInformationMessage("Gauge [recommends](https://docs.gauge.org/using.html#id31) " +
                "some settings for best experience with Visual Studio Code.", "Apply & Reload", "Ignore")
                .then((option) => {
                    if (option === "Apply & Reload") {
                        return this.applyAndReload();
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

    private verify(): boolean {
        for (const key in this.recommendedSettings) {
            if (this.recommendedSettings.hasOwnProperty(key)) {
                if (workspace.getConfiguration().inspect(key).globalValue !== this.recommendedSettings[key]) {
                    return false;
                }
            }
        }
        return true;
    }

    private applyAndReload(): Thenable<any> {
        let updatePromises = [];
        for (const key in this.recommendedSettings) {
            if (this.recommendedSettings.hasOwnProperty(key)) {
                updatePromises.push(workspace.getConfiguration()
                    .update(key, this.recommendedSettings[key], ConfigurationTarget.Global));
            }
        }
        return Promise.all(updatePromises).then(() => commands.executeCommand(VSCodeCommands.ReloadWindow));
    }

    dispose() {
        this._disposable.dispose();
    }
}