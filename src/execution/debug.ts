'use strict';

import { window, workspace, debug } from 'vscode';
import getPort = require('get-port');

const PYTHON_DEBUG_TIMEOUT = 1500;
const PYTHON_LANGUAGE_ID = "python";
const JAVASCRIPT_LANGUAGE_ID = "javascript";

export let clientLanguageMap: Map<string, string> = new Map();

export function setDebugConf(config: any, debugPort: string): Thenable<any> {
    let env = Object.create(process.env);
    if (config.debug) {
        env.DEBUGGING = true;
        return getPort({ port: debugPort}).then((port) => {
            env.DEBUG_PORT = port;
            setLanguageDebugConf(clientLanguageMap.get(config.projectRoot), port, config.projectRoot);
            return env;
        });
    } else {
        return Promise.resolve(env);
    }
}

function setLanguageDebugConf(language: string, port: number, projectRoot: string): void {
    switch (language) {
        case JAVASCRIPT_LANGUAGE_ID: {
            setNodeDebugConf(port, projectRoot);
            break;
        }
        case PYTHON_LANGUAGE_ID: {
            setPythonDebugConf(port, projectRoot);
            break;
        }
    }
}

function setPythonDebugConf(port: number, projectRoot: string): void {
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
    }, PYTHON_DEBUG_TIMEOUT);
}

function setNodeDebugConf(port: number, projectRoot: string): void {
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