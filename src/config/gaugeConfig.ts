import { join } from "path";
import { homedir } from "os";

export default class GaugeConfig {
    private _platform: string;
    constructor(platform: string) {
        this._platform = platform;
    }

    pluginsPath() {
        let gaugeHome = this.homeDir();
        return join(gaugeHome, 'plugins');
    }

    private homeDir() {
        let customGaugeHomeDir = process.env.GAUGE_HOME;
        if (customGaugeHomeDir !== undefined) {
            return customGaugeHomeDir;
        }
        if (this._platform.match(/win\d+/i)) {
            let appDataDir = process.env.APPDATA;
            return join(appDataDir, 'Gauge');
        }
        return join(homedir(), '.gauge');
    }
}