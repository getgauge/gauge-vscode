'use strict';

import { TextEditor } from 'vscode';
import { spawnSync, exec } from 'child_process';
import { platform } from 'os';

export function getActiveGaugeDocument(activeTextEditor: TextEditor): Promise<any> {
    return new Promise((resolve) => {
        if (activeTextEditor && activeTextEditor.document.languageId === "gauge") {
            resolve(activeTextEditor.document.uri.fsPath);
        }
    });
}

export function hasActiveGaugeDocument(activeTextEditor: TextEditor): boolean {
    return activeTextEditor && activeTextEditor.document.languageId === "gauge";
}

export function getCommand(command: string): string {
    if (platform() !== 'win32') return command;
    let validExecExt = ["", ".bat", ".exe", ".cmd"];
    for (const ext of validExecExt) {
        let executable = `${command}${ext}`;
        if (!spawnSync(executable).error) return executable;
    }
}
