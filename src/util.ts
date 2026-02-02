'use strict';

import { TextEditor } from 'vscode';

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
