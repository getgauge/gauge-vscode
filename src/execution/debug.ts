'use strict';

import * as getPort from 'get-port';
import * as fs from 'fs-extra';
import * as path from 'path';
import { debug, DebugSession, window, workspace } from 'vscode';
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
                this.updateConfigFromLaunchJson(configobject);
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

    private updateConfigFromLaunchJson(configobject: ConfigObj) {
        let launchJsonPath = path.resolve(this.projectRoot, ".vscode", "launch.json");
        if (fs.existsSync(launchJsonPath)) {
            let { jsObject, lines }: {
                jsObject: string;
                lines: string[];
            } = this.getFileContent(launchJsonPath);
            jsObject = this.removeCommentsFromContent(lines, jsObject);
            try {
                let job: LaunchJsonConfigObj = JSON.parse(jsObject);
                configobject.sourceFileMap = job.configurations[0].sourceFileMap;
                configobject.justMyCode = job.configurations[0].justMyCode;
            } catch (ex) {
                console.log(ex);
            }
        }
    }

    private getFileContent(launchJsonPath: string) {
        let jsObject: string = fs.readFileSync(launchJsonPath, "UTF8");
        let lines: string[] = jsObject.split("\n");
        return { jsObject, lines };
    }

    private removeCommentsFromContent(lines: string[], jsObject: string) {
        lines.forEach((element) => {
            if (element.startsWith("//"))
                jsObject = jsObject.replace(element, "");
        });
        return jsObject;
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
            return getPort.default({ port: this.debugPort }).then((port) => {
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
            let folder = workspace.getWorkspaceFolder(window.activeTextEditor.document.uri);
            let root = this.clientsMap.get(window.activeTextEditor.document.uri.fsPath).project.root();
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
interface LaunchJsonConfigObj {
    configurations:
    [{
        name: string,
        type: string,
        request: string,
        processId: string,
        justMyCode: boolean,
        sourceFileMap: { [sourceFile: string]: string }
    }];

}

interface ConfigObj {
    name: string;
    type: string;
    request: string;
    processId: number;
    justMyCode: boolean;
    sourceFileMap: { [sourceFile: string]: string };
}
