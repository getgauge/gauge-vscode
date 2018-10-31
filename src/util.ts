'use strict';

import * as path from 'path';
import { WorkspaceFolder, Uri, workspace, ConfigurationTarget, commands } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE, VSCodeCommands } from './constants';
const GAUGE_PROJECTS_DIR_CONF = "gauge.projectsDir";

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
    const config = workspace.getConfiguration();
    let configuredGaugeProjects = config.inspect(GAUGE_PROJECTS_DIR_CONF).workspaceValue as Array<string> || [];
    if (!configuredGaugeProjects.length || folders.length > 1 ) return gaugeProjects;
    const pwd = folders[0];
    return configuredGaugeProjects.map( (dirName) => {
        let workspaceFolder = {
            uri: Uri.file(path.join(pwd.uri.fsPath, dirName))
        }  as  WorkspaceFolder;
        return workspaceFolder;
    });
}

export function getGaugeProject(uri: Uri): WorkspaceFolder {
    let projects = findGaugeProjects(workspace.workspaceFolders);
    return projects.find( (project) => !!uri.fsPath.match(project.uri.fsPath) );
}

export function setGaugeProjectRoot(absPath: string) {
    let pwd = workspace.workspaceFolders[0];
    let basePath = path.relative(pwd.uri.fsPath, absPath);
    const config = workspace.getConfiguration();
    let projectsDir = config.inspect(GAUGE_PROJECTS_DIR_CONF).workspaceValue as Array<String>;
    if (projectsDir) {
        projectsDir = projectsDir.concat(basePath);
    } else {
        projectsDir = [basePath];
    }
    config.update(GAUGE_PROJECTS_DIR_CONF, projectsDir, ConfigurationTarget.Workspace)
        .then(() => commands.executeCommand(VSCodeCommands.ReloadWindow));
}

export function isDotnetProject(projectRoot) {
    const filePath = path.join(projectRoot, GAUGE_MANIFEST_FILE);
    let mainfest = JSON.parse(readFileSync(filePath, 'utf-8'));
    return mainfest.Language === 'dotnet';

}