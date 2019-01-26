'use strict';

import { debug, DebugSession, window, workspace } from 'vscode';
import { GaugeRunners } from '../constants';
import { ExecutionConfig } from './executionConfig';
import getPort = require('get-port');

const GAUGE_DEBUGGER_NAME = "Gauge Debugger";
const REQUEST_TYPE = "attach";
const DEBUG_PORT = 'debugPort';

export class GaugeDebugger {

    private debugPort: number;
    private languageId: string;
    private projectRoot: string;
    private debug: boolean;
    private dotnetProcessID: number;
    private config: ExecutionConfig;

    constructor(clientLanguageMap: Map<string, string>, config: ExecutionConfig) {
        this.languageId = clientLanguageMap.get(config.getProject().root());
        this.config = config;
        this.debug = config.getDebug();
    }

    private setDebuggerConf(): any {
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
                return {
                    name: GAUGE_DEBUGGER_NAME,
                    type: "coreclr",
                    request: REQUEST_TYPE,
                    processId: this.dotnetProcessID,
                    justMyCode: true
                };
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

    addProcessId(pid: number): any {
        this.dotnetProcessID = pid;
    }

    public addDebugEnv(): Thenable<any> {
        let env = Object.create(process.env);
        if (this.debug) {
            env.DEBUGGING = true;
            return getPort({ port: DEBUG_PORT }).then((port) => {
                if (this.config.getProject().isProjectLanguage(GaugeRunners.Dotnet))
                    env.GAUGE_CSHARP_PROJECT_CONFIG = "Debug";
                if (this.config.getProject().isProjectLanguage(GaugeRunners.Java)) env.GAUGE_DEBUG_OPTS = port;
                env.DEBUG_PORT = port;
                this.debugPort = port;
                return env;
            });
        } else {
            return Promise.resolve(env);
        }
    }

    public startDebugger(): void {
        setTimeout(() => {
            debug.startDebugging(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri),
                this.setDebuggerConf());
        }, 100);
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