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
