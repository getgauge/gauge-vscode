'use strict';

import { spawnSync, spawn } from 'child_process';
import { window } from 'vscode';
import { GaugeCommands, MAVEN_COMMAND } from './constants';
import { OutputChannel } from './execution/outputChannel';
import { platform } from 'os';

export class GaugeCLI {
    private _isInstalled: boolean;
    private readonly _version: string;
    private readonly _commitHash: string;
    private readonly _plugins: Array<any>;
    private readonly _command: string;
    private readonly _mvnCommand: string;

    public constructor(cmd: string, isInstalled: boolean, manifest: any, mvnCommand: string) {
        this._command = cmd;
        this._mvnCommand = mvnCommand;
        this._isInstalled = isInstalled;
        this._version = manifest.version;
        this._commitHash = manifest.commitHash;
        this._plugins = manifest.plugins;
    }

    public isPluginInstalled(pluginName: string): boolean {
        return this._plugins.some((p: any) => p.name === pluginName);
    }

    public command(): string {
        return this._command;
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
        let oc = window.createOutputChannel("Gauge Install");
        let chan = new OutputChannel(oc, `Installing gauge ${language} plugin ...\n`, "");
        return new Promise((resolve, reject) => {
            let childProcess = spawn(this._command, ["install", language]);
            childProcess.stdout.on('data', (chunk) => chan.appendOutBuf(chunk.toString()));
            childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
            childProcess.on('exit', (code) => {
                let postFailureMessage = '\nRefer https://docs.gauge.org/latest/installation.html' +
                    '#language-plugins to install manually';
                chan.onFinish(resolve, code, "", postFailureMessage, false);
            });
        });
    }

    public isMavenInstalled(): boolean {
        return this._mvnCommand !== '';
    }

    public mavenCommand(): string {
        return this._mvnCommand;
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
    const command = getCommand(GaugeCommands.Gauge);
    let gv = spawnSync(command, [GaugeCommands.Version, GaugeCommands.MachineReadable]);
    let mvnCommand = getCommand(MAVEN_COMMAND);
    let mv = spawnSync(mvnCommand, [GaugeCommands.Version]);
    mvnCommand = !mv.error ? mvnCommand : '';
    if (gv.error) return new GaugeCLI(command, false, {}, mvnCommand);
    return new GaugeCLI(command, true, JSON.parse(gv.stdout.toString()), mvnCommand);
}

function getCommand(command: string): string {
    if (platform() === 'win32') command = `${command}.cmd`;
    return command;
}
