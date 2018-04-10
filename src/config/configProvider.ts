import { Disposable, ExtensionContext, window, commands, workspace, ConfigurationTarget } from "vscode";
import { VSCodeCommands, GaugeVSCodeCommands } from "../constants";

export class ConfigProvider extends Disposable {
    private recommendedSettings = {
        "files.autoSave": "afterDelay",
        "files.autoSaveDelay": 500
    };

    private _disposable: Disposable;

    constructor(private context: ExtensionContext) {
        super(() => this.dispose());

        this._disposable = commands.registerCommand(GaugeVSCodeCommands.SaveRecommendedSettings,
            () => this.saveAndReload());

        if (!this.verify()) {
            window.showInformationMessage("Gauge [recommends](https://docs.gauge.org/using.html#id31) " +
                "some settings for best experience with Visual Studio Code.", "Save & Reload", "Ignore")
            .then((option) => {
                if (option === "Save & Reload") {
                    this.saveAndReload();
                }
            });
        }
    }

    private verify(): boolean {
        for (const key in this.recommendedSettings) {
            if (this.recommendedSettings.hasOwnProperty(key)) {
                if (workspace.getConfiguration().get(key) !== this.recommendedSettings[key]) {
                    return false;
                }
            }
        }
        return true;
    }

    private saveAndReload() {
        for (const key in this.recommendedSettings) {
            if (this.recommendedSettings.hasOwnProperty(key)) {
                workspace.getConfiguration().update(key, this.recommendedSettings[key], ConfigurationTarget.Global);
            }
        }
        commands.executeCommand(VSCodeCommands.ReloadWindow);
    }

    dispose() {
        this._disposable.dispose();
    }
}