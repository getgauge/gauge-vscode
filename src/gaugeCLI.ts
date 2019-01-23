'use strict';

import { spawnSync, spawn } from 'child_process';
import { window, commands, Uri } from 'vscode';
import { GaugeCommands, VSCodeCommands } from './constants';
import { getGaugeCommand, getExecutionCommand } from './util';
import { OutputChannel } from './execution/outputChannel';
import { print } from 'util';

export class GaugeCLI {
    private _isInstalled: boolean;
    private readonly _version: string;
    private readonly _commitHash: string;
    private readonly _plugins: Array<any>;
    private readonly outputChannel = window.createOutputChannel("Gauge Install");

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

    public async install(language: string): Promise<any> {
        let chan = new OutputChannel(this.outputChannel, `Installing gauge ${language} plugin ...\n`, "");
        return new Promise((resolve, reject) => {
            let childProcess = spawn(getGaugeCommand(), ["install", language]);
            childProcess.stdout.on('data', (chunk) => chan.appendOutBuf(chunk.toString()));
            childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
            childProcess.on('exit', (code) => {
                let postFailureMessage = '\nRefer https://docs.gauge.org/latest/installation.html' +
                    '#language-plugins to install manually';
                chan.onFinish(resolve, code, "", postFailureMessage, false);
            });
        });
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
