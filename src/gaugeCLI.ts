'use strict';

import { spawnSync } from 'child_process';
import { window, commands, Uri } from 'vscode';
import { GaugeCommands, VSCodeCommands } from './constants';
import { getGaugeCommand } from './util';

export class GaugeCLI {
    private _isInstalled: boolean;
    private readonly _version: string;
    private readonly _commitHash: string;
    private readonly _plugins: Array<any>;

    public constructor(isInstalled: boolean, v: string, commitHash: string, plugins: Array<any>) {
        this._isInstalled = isInstalled;
        this._version = v;
        this._commitHash = commitHash;
        this._plugins = plugins;
    }

    public isPluginInstalled(pluginName: string): boolean {
        return this._plugins.some((p: any) => p.name === pluginName);
    }

    public isInstalled(): boolean {
        return this._isInstalled;
    }
    public isVersionGreaterOrEqual(version: string): boolean {
        return this._version >= version;
    }

    public getPluginVersion(language: string): any {
        return this._plugins.find((p) => p.name === language).version;
    }

    public getVersion(): string {
        return this._version;
    }

    public async install(language: string, projectRoot: string): Promise<any> {
        let t = window.createTerminal();
        t.sendText("gauge install " + language);
        t.show();
        return commands.executeCommand(VSCodeCommands.OpenFolder, Uri.file(projectRoot));
    }

    public versionString(): string {
        let v = `Gauge version: ${this._version}`;
        let cm = this._commitHash && `Commit Hash: ${this._commitHash}` || '';
        let plugins = this._plugins
            .map((p: any) => p.name + ' (' + p.version + ')')
            .join('\n');
        plugins = `Plugins\n-------\n${plugins}`;
        return `${v}\n${cm}\n\n${plugins}`;
    }
}

export function getGaugeCLIHandler() {
    let gv = spawnSync(getGaugeCommand(), [GaugeCommands.Version, GaugeCommands.MachineReadable]);
    if (gv.error) {
        return new GaugeCLI(false, null, null, null);
    }
    let m = JSON.parse(gv.stdout.toString());
    return new GaugeCLI(true, m.version, m.commitHash, m.plugins);
}
