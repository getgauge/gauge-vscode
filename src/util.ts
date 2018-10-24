'use strict';

import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE, GaugeCommands } from './constants';
import { spawnSync } from 'child_process';

let gaugeCommand;
export function isGaugeProject(folder: WorkspaceFolder): boolean {
    const filePath = path.join(folder.uri.fsPath, GAUGE_MANIFEST_FILE);
    if (existsSync(filePath)) {
        try {
            const content = readFileSync(filePath);
            const data = JSON.parse(content.toString());
            return !!data.Language;
        } catch (e) {
            return false;
        }
    }
    return false;
}

export function isDotnetProject(projectRoot) {
    const filePath = path.join(projectRoot, GAUGE_MANIFEST_FILE);
    let mainfest = JSON.parse(readFileSync(filePath, 'utf-8'));
    return mainfest.Language === 'dotnet';

}

export function getGaugeCommand(): string {
    if (gaugeCommand) return gaugeCommand;
    gaugeCommand = GaugeCommands.Gauge;
    if (spawnSync(gaugeCommand).error) gaugeCommand = GaugeCommands.GaugeCmd;
    return gaugeCommand;
}