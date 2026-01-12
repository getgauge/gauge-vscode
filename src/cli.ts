'use strict';

import { ChildProcess, CommonSpawnOptions, spawn, spawnSync, SpawnSyncReturns } from 'child_process';
import { platform } from 'os';
import { window } from 'vscode';
import { GaugeCommands, GRADLE_COMMAND, MAVEN_COMMAND } from './constants';
import { OutputChannel } from './execution/outputChannel';

export class CLI {
    private readonly _gaugeVersion: string;
    private readonly _gaugeCommitHash: string;
    private readonly _gaugePlugins: Array<any>;
    private readonly _gaugeCommand: Command;
    private readonly _mvnCommand: Command;
    private readonly _gradleCommand: Command;

    public constructor(cmd: Command, manifest: any, mvnCommand: Command, gradleCommand: Command) {
        this._gaugeCommand = cmd;
        this._mvnCommand = mvnCommand;
        this._gradleCommand = gradleCommand;
        this._gaugeVersion = manifest.version;
        this._gaugeCommitHash = manifest.commitHash;
        this._gaugePlugins = manifest.plugins;
    }

    public static instance(): CLI {
        const gaugeCommand = this.getCommand(GaugeCommands.Gauge);
        const mvnCommand = this.getCommand(MAVEN_COMMAND);
        const gradleCommand = this.getGradleCommand();
        if (!gaugeCommand) return new CLI(undefined, {}, mvnCommand, gradleCommand);
        let gv = gaugeCommand.spawnSync([GaugeCommands.Version, GaugeCommands.MachineReadable]);
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

    public gaugeCommand(): Command {
        return this._gaugeCommand;
    }

    public isGaugeInstalled(): boolean {
        return !!this._gaugeCommand;
    }

    public isGaugeVersionGreaterOrEqual(version: string): boolean {
        return this._gaugeVersion >= version;
    }

    public getGaugePluginVersion(language: string): any {
        return this._gaugePlugins.find((p) => p.name === language).version;
    }

    public async installGaugeRunner(language: string): Promise<any> {
        let oc = window.createOutputChannel("Gauge Install");
        let chan = new OutputChannel(oc, `Installing gauge ${language} plugin ...\n`, "");
        return new Promise((resolve, reject) => {
            let childProcess = this._gaugeCommand.spawn([GaugeCommands.Install, language]);
            childProcess.stdout.on('data', (chunk) => chan.appendOutBuf(chunk.toString()));
            childProcess.stderr.on('data', (chunk) => chan.appendErrBuf(chunk.toString()));
            childProcess.on('exit', (code) => {
                let postFailureMessage = '\nRefer to https://docs.gauge.org/plugin.html to install manually';
                chan.onFinish(resolve, code, "", postFailureMessage, false);
            });
        });
    }

    public mavenCommand(): Command {
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

    public static getCommandCandidates(command: string): Command[] {
        return platform() === 'win32' ? [
            new Command(command, ".exe"),
            new Command(command, ".bat", true),
            new Command(command, ".cmd", true),
        ] : [
            new Command(command)
        ]
    }

    public static isCommandInPath(command: Command): boolean {
        const checkCommand = platform() === 'win32' ? 'where' : 'which';
        const result = spawnSync(checkCommand, [command.command]);

        if (result.error)
            return false;

        return result.status === 0;
    }

    private static getCommand(command: string): Command | undefined {
        for (const candidate of this.getCommandCandidates(command)) {
            if (this.isCommandInPath(candidate)) return candidate;
        }
    }

    private static getGradleCommand() {
        return platform() === 'win32' ? new Command(GRADLE_COMMAND, ".bat", true) : new Command(`./${GRADLE_COMMAND}`);
    }
}

export type PlatformDependentSpawnOptions = {
    shell?: boolean
}

export class Command {
    public readonly command: string
    public readonly defaultSpawnOptions: PlatformDependentSpawnOptions

    constructor(public readonly cmdPrefix: string, public readonly cmdSuffix: string = "", public readonly shellMode: boolean = false) {
        this.command = this.cmdPrefix + this.cmdSuffix;
        this.defaultSpawnOptions = this.shellMode ? { shell: true } : {};
    }

    spawn(args: string[] = [], options: CommonSpawnOptions = {}): ChildProcess {
        return spawn(this.command, this.argsForSpawnType(args), { ...options, ...this.defaultSpawnOptions });
    }

    spawnSync(args: string[] = [], options: CommonSpawnOptions = {}): SpawnSyncReturns<Buffer> {
        return spawnSync(this.command, this.argsForSpawnType(args), { ...options, ...this.defaultSpawnOptions });
    }

    // See https://github.com/nodejs/node/issues/38490
    argsForSpawnType(args: string[]): string[] {
        return this.shellMode ? args.map(arg => arg.indexOf(" ") !== -1 ? `"${arg}"` : arg) : args;
    }
}
