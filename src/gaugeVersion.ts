'use strict';

import { spawnSync } from 'child_process';
import { GaugeCommands } from './constants';
import { getGaugeCommand } from './util';

export class GaugeVersionInfo {
    public version: string;
    public commitHash: string;
    public plugins: Array<GaugePluginVersionInfo>;

    public constructor(v: string, commitHash: string, plugins: Array<{ name: string, version: string }>) {
        this.version = v;
        this.commitHash = commitHash;
        this.plugins = plugins.map(
            (plugin) => new GaugePluginVersionInfo(plugin.name, plugin.version)
        );
    }

    public isGreaterOrEqual(version: string): boolean {
        return this.version >= version;
    }

    public getVersion(): string {
        return this.version;
    }

    public toString(): string {
        let v = `Gauge version: ${this.version}`;
        let cm = this.commitHash && `Commit Hash: ${this.commitHash}` || '';
        let plugins = this.plugins
            .map((p: any) => p.toString())
            .join('\n');
        plugins = `Plugins\n-------\n${plugins}`;
        return `${v}\n${cm}\n\n${plugins}`;
    }
}

class GaugePluginVersionInfo {
    name: String;
    version: String;
    constructor(name, version) {
        this.name = name;
        this.version = version;
    }

    hasName(name: String) {
        return this.name.toLowerCase() === name.toLowerCase();
    }

    toString() {
        return `${this.name} (${this.version})`;
    }
}

export function getGaugeVersionInfo(): GaugeVersionInfo {
    let gv = spawnSync(getGaugeCommand(), [GaugeCommands.Version, GaugeCommands.MachineReadable]);
    if (gv.error) {
        return null;
    }
    let m = JSON.parse(gv.stdout.toString());
    return new GaugeVersionInfo(m.version, m.commitHash, m.plugins);
}
