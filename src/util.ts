'use strict';

import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE } from './constants';

export function isGaugeProject(folder: WorkspaceFolder): boolean {
    const filePath = path.join(folder.uri.fsPath, GAUGE_MANIFEST_FILE);
    if (existsSync(filePath)) {
        try {
            const content = readFileSync(filePath);
            const data = JSON.parse(content.toString());
            return !data.Language ? false : true;
        } catch (e) {
            return false;
        }
    }
    return false;
}