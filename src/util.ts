'use strict';

import * as path from 'path';
import { WorkspaceFolder, WorkspaceConfiguration, Uri, workspace } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE } from './constants';

export function isGaugeProject(folder: WorkspaceFolder): boolean {
    const filePath = path.join( folder.uri.fsPath, GAUGE_MANIFEST_FILE);
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

export function findGaugeProjects( folders: WorkspaceFolder[]): WorkspaceFolder [] {
    let gaugeProjects = [];
    if (folders.some(isGaugeProject)) return folders;
    let configuredGaugeProjects = workspace.getConfiguration("gauge").projectsDir;
    if (!configuredGaugeProjects.length || folders.length > 1 ) return gaugeProjects;
    const pwd = folders[0];
    return configuredGaugeProjects.map( (dirName) => {
        let workspaceFolder = {
            uri: Uri.file(path.join(pwd.uri.fsPath, dirName))
        }  as  WorkspaceFolder;
        return workspaceFolder;
    });
}

export function isDotnetProject(projectRoot) {
    const filePath = path.join(projectRoot, GAUGE_MANIFEST_FILE);
    let mainfest = JSON.parse(readFileSync(filePath, 'utf-8'));
    return mainfest.Language === 'dotnet';

}