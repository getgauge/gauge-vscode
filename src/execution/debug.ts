'use strict';

import { window, workspace, debug } from 'vscode';
import getPort = require('get-port');

export let clientLanguageMap: Map<string, string> = new Map();

export function setDebugConf(config: any, debugPort: string): Thenable<any> {
    let env = Object.create(process.env);
    if (config.debug) {
        env.DEBUGGING = true;
        return getPort({ port: debugPort }).then((port) => {
            env.DEBUG_PORT = port;
            GaugeDebugger.attach(clientLanguageMap.get(config.projectRoot), port, config.projectRoot);
            return env;
        });
    } else {
        return Promise.resolve(env);
    }
}

class GaugeDebugger {
    python(port: number, projectRoot: string): void {
        let debugConfig = {
            type: "python",
            name: "Gauge Debugger",
            request: "attach",
            port: port,
            localRoot: projectRoot
        };
        setTimeout(() => {
            debug.startDebugging(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri),
                debugConfig);
        }, 1500);
    }

    javascript(port: number, projectRoot: string) {
        let debugConfig = {
            type: "node",
            name: "Gauge Debugger",
            request: "attach",
            port: port,
            protocol: "inspector"
        };

        debug.startDebugging(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri),
            debugConfig);
    }

    ruby(port: number, projectRoot: string) {
        let debugConfig = {
            name: "Gauge Debugger",
            type: "Ruby",
            request: "attach",
            cwd: projectRoot,
            remoteWorkspaceRoot: projectRoot,
            remoteHost: "127.0.0.1",
            remotePort: port
        };
        debug.startDebugging(workspace.getWorkspaceFolder(window.activeTextEditor.document.uri),
            debugConfig);
    }

    static attach(language: string, port: number, projectPath: string) {
        this.prototype[language](port, projectPath);
    }
}