'use strict';

import { spawnSync, spawn } from 'child_process';
import { window } from 'vscode';
import { GaugeCommands, MAVEN_COMMAND, GRADLE_COMMAND } from './constants';
import { OutputChannel } from './execution/outputChannel';
import { platform } from 'os';

export class CLI {
    private readonly _gaugeVersion: string;
    private readonly _gaugeCommitHash: string;
    private readonly _gaugePlugins: Array<any>;
    private readonly _gaugeCommand: string;
    private readonly _mvnCommand: string;
    private readonly _gradleCommand: string;

    public constructor(cmd: string, manifest: any, mvnCommand: string, gradleCommand: string) {
        this._gaugeCommand = cmd;
        this._mvnCommand = mvnCommand;
        this._gradleCommand = gradleCommand;
        this._gaugeVersion = manifest.version;
        this._gaugeCommitHash = manifest.commitHash;
        this._gaugePlugins = manifest.plugins;
    }

    public static instance(): CLI {
        const gaugeCommand = this.getCommand(GaugeCommands.Gauge);
        let mvnCommand = this.getCommand(MAVEN_COMMAND);
        let gradleCommand = this.getGradleCommand();
        if (!gaugeCommand || gaugeCommand === '') return new CLI(gaugeCommand, {}, mvnCommand, gradleCommand);
        let gv = spawnSync(gaugeCommand, [GaugeCommands.Version, GaugeCommands.MachineReadable]);
        let gaugeVersionInfo;
        try {
            gaugeVersionInfo = JSON.parse(gv.stdout.toString());
        } catch (e) {
            window.showErrorMessage(`Error fetching Gauge and plugins version information. \n${gv.stdout.toString()}`);
            return;
        }
        return new CLI(gaugeCommand, gaugeVersionInfo, mvnCommand, gradleCommand);
    }

    public isPluginInstalled(pluginName: string): boolean {
        return this._gaugePlugins.some((p: any) => p.name === pluginName);
    }

    public gaugeCommand(): string {
        return this._gaugeCommand;
    }

    public isGaugeInstalled(): boolean {
        return !!this.gaugeCommand && this._gaugeCommand !== '';
    }

    public isGaugeVersionGreaterOrEqual(version: string): boolean {
        return this._gaugeVersion >= version;
    }

    public getGaugePluginVersion(language: string): any {
        return this._gaugePlugins.find((p) => p.name === language).version;
    }

    public getGaugeVersion(): string {
        return this._gaugeVersion;
    }

    public async installGaugeRunner(language: string): Promise<any> {
        let oc = window.createOutputChannel("Gauge Install");
        let chan = new OutputChannel(oc, `Installing gauge ${language} plugin ...\n`, "");
        return new Promise((resolve, reject) => {
            let childProcess = spawn(this._gaugeCommand, [GaugeCommands.Install, language]);
            childProcess.stdout.on('data', (chunk) => chan.appendOutBuf(chunk.toString()));
            childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
            childProcess.on('exit', (code) => {
                let postFailureMessage = '\nRefer https://docs.gauge.org/plugin.html' +
                    ' to install manually';
                chan.onFinish(resolve, code, "", postFailureMessage, false);
            });
        });
    }

    public isMavenInstalled(): boolean {
        return !!this._mvnCommand && this._mvnCommand !== '';
    }

    public mavenCommand(): string {
        return this._mvnCommand;
    }

    public gradleCommand() {
        return  this._gradleCommand;
    }

    public gaugeVersionString(): string {
        let v = `Gauge version: ${this._gaugeVersion}`;
        let cm = this._gaugeCommitHash && `Commit Hash: ${this._gaugeCommitHash}` || '';
        let plugins = this._gaugePlugins
            .map((p: any) => p.name + ' (' + p.version + ')')
            .join('\n');
        plugins = `Plugins\n-------\n${plugins}`;
        return `${v}\n${cm}\n\n${plugins}`;
    }

    private static getCommand(command: string): string {
        let validExecExt = [""];
        if (platform() === 'win32') validExecExt.push(".bat", ".exe", ".cmd");
        for (const ext of validExecExt) {
            let executable = `${command}${ext}`;
            if (!spawnSync(executable).error) return executable;
        }
    }

    private static getGradleCommand() {
        if (platform() === 'win32') return `${GRADLE_COMMAND}.bat`;
        return `./${GRADLE_COMMAND}`;
    }
}
