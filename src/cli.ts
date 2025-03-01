'use strict';

import {CommonSpawnOptions, spawn, spawnSync} from 'child_process';
import {platform} from 'os';
import {window} from 'vscode';
import {GaugeCommands, GRADLE_COMMAND, MAVEN_COMMAND} from './constants';
import {OutputChannel} from './execution/outputChannel';

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

    public static getDefaultSpawnOptions(): CommonSpawnOptions {
        // should only deal with platform specific options
        let options: CommonSpawnOptions = {};
        if (platform() === "win32") {
            options.shell = true;
        }
        return options;
    }

    public static instance(): CLI {
        const gaugeCommand = this.getCommand(GaugeCommands.Gauge);
        const mvnCommand = this.getCommand(MAVEN_COMMAND);
        let gradleCommand = this.getGradleCommand();
        if (!gaugeCommand || gaugeCommand === '') return new CLI(gaugeCommand, {}, mvnCommand, gradleCommand);
        let options = this.getDefaultSpawnOptions();
        let gv = spawnSync(gaugeCommand, [GaugeCommands.Version, GaugeCommands.MachineReadable], options);
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
        return !!this._gaugeCommand && this._gaugeCommand !== '';
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
            let options = CLI.getDefaultSpawnOptions();
            let childProcess = spawn(this._gaugeCommand, [GaugeCommands.Install, language], options);
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
        return this._gradleCommand;
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

    public static getCommandCandidates(command: string): string[] {
        let validExecExt = [""];
        if (platform() === 'win32') {
            validExecExt.push(".exe", ".bat", ".cmd");
        }
        return validExecExt.map((ext) => `${command}${ext}`);
    }

    public static checkSpawnable(command: string): boolean {
        const result = spawnSync(command, [], CLI.getDefaultSpawnOptions());
        return result.status === 0 && !result.error;
    }

    private static getCommand(command: string): string {
        for (const candidate of this.getCommandCandidates(command)) {
            if (this.checkSpawnable(candidate)) return candidate;
        }
        window.showErrorMessage(`Unable to find executable launch command: ${command}`);
    }

    private static getGradleCommand() {
        if (platform() === 'win32') return `${GRADLE_COMMAND}.bat`;
        return `./${GRADLE_COMMAND}`;
    }
}
