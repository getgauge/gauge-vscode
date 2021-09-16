'use strict';

import getPort = require('get-port');
import { debug, DebugSession, Uri, workspace } from 'vscode';
import { GaugeRunners } from '../constants';
import { GaugeClients } from '../gaugeClients';
import { ExecutionConfig } from './executionConfig';

const GAUGE_DEBUGGER_NAME = "Gauge Debugger";
const REQUEST_TYPE = "attach";

export class GaugeDebugger {

    private debugPort: number;
    private languageId: string;
    private projectRoot: string;
    private debug: boolean;
    private dotnetProcessID: number;
    private config: ExecutionConfig;
    private clientsMap: GaugeClients;

    constructor(clientLanguageMap: Map<string, string>, clientsMap: GaugeClients, config: ExecutionConfig) {
        this.languageId = clientLanguageMap.get(config.getProject().root());
        this.clientsMap = clientsMap;
        this.config = config;
        this.projectRoot = this.config.getProject().root();
        this.debug = config.getDebug();
    }

    private getDebuggerConf(): any {
        switch (this.languageId) {
            case "python": {
                return {
                    type: "python",
                    name: GAUGE_DEBUGGER_NAME,
                    request: REQUEST_TYPE,
                    port: this.debugPort,
                    localRoot: this.projectRoot
                };
            }

            case "javascript": {
                return {
                    type: "node",
                    name: GAUGE_DEBUGGER_NAME,
                    request: REQUEST_TYPE,
                    port: this.debugPort,
                    protocol: "inspector"
                };
            }
            case "typescript": {
                return {
                    type: "node",
                    name: GAUGE_DEBUGGER_NAME,
                    runtimeArgs: ["--nolazy", "-r", "ts-node/register"],
                    request: REQUEST_TYPE,
                    sourceMaps: true,
                    port: this.debugPort,
                    protocol: "inspector"
                };
            }

            case "ruby": {
                return {
                    name: GAUGE_DEBUGGER_NAME,
                    type: "Ruby",
                    request: REQUEST_TYPE,
                    cwd: this.projectRoot,
                    remoteWorkspaceRoot: this.projectRoot,
                    remoteHost: "127.0.0.1",
                    remotePort: this.debugPort
                };
            }
            case "csharp": {
                let configobject: ConfigObj;
                configobject = {
                    name: GAUGE_DEBUGGER_NAME,
                    type: "coreclr",
                    request: REQUEST_TYPE,
                    processId: this.dotnetProcessID,
                    justMyCode: true,
                    sourceFileMap: {}
                };
                this.updateConfigFromVscodeDebugConfig(configobject);
                return configobject;

            }
            case "java": {
                return {
                    name: GAUGE_DEBUGGER_NAME,
                    type: "java",
                    request: REQUEST_TYPE,
                    hostName: "127.0.0.1",
                    port: this.debugPort
                };
            }
        }
    }

    private updateConfigFromVscodeDebugConfig(configobject: ConfigObj) {
        try {
            let workspacePath = workspace.workspaceFolders.find((f) => f.uri.fsPath === this.projectRoot).uri;
            const config = workspace.getConfiguration('launch', workspacePath);
            const values = config.get('configurations');
            configobject.sourceFileMap = values[0].sourceFileMap;
            configobject.justMyCode = values[0].justMyCode;
        } catch (ex) {
            console.log(ex);
        }
    }

    addProcessId(pid: number): any {
        this.dotnetProcessID = pid;
    }

    public addDebugEnv(): Thenable<any> {
        let env = Object.create(process.env);
        if (this.debug) {
            env.DEBUGGING = true;
            env.use_nested_specs = "false";
            env.SHOULD_BUILD_PROJECT = "true";
            return getPort({ port: this.debugPort }).then((port) => {
                if (this.config.getProject().isProjectLanguage(GaugeRunners.Dotnet)) {
                    env.GAUGE_CSHARP_PROJECT_CONFIG = "Debug";
                }
                if (this.config.getProject().isProjectLanguage(GaugeRunners.Java)) env.GAUGE_DEBUG_OPTS = port;
                env.DEBUG_PORT = port;
                this.debugPort = port;
                return env;
            });
        } else {
            return Promise.resolve(env);
        }
    }

    public startDebugger() {
        return new Promise((res, rej) => {
            const root = this.config.getProject().root();
            const folder = workspace.getWorkspaceFolder(Uri.file(root));
            if (!folder) {
                throw new Error(`The debugger does not work for a stand alone file. Please open the folder ${root}.`);
            }
            setTimeout(() => {
                debug.startDebugging(folder, this.getDebuggerConf()).then(res, rej);
            }, 100);
        });
    }

    public registerStopDebugger(callback) {
        debug.onDidTerminateDebugSession((e: DebugSession) => {
            callback(e);
        });
    }

    public stopDebugger(): void {
        if (debug.activeDebugSession) {
            debug.activeDebugSession.customRequest("disconnect");
        }
    }

}

interface ConfigObj {
    name: string;
    type: string;
    request: string;
    processId: number;
    justMyCode: boolean;
    sourceFileMap: { [sourceFile: string]: string };
}
