'use strict';

import * as path from 'path';
import { WorkspaceFolder, TextEditor } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE, GaugeCommands, MAVEN_POM, MAVEN_COMMAND_WINDOWS, MAVEN_COMMAND } from './constants';
import { spawnSync } from 'child_process';

let gaugeCommand;
let mavenCommand;

export function isGaugeProject(folder: WorkspaceFolder | string): boolean {
    const basePath = (typeof folder === 'string' ? folder : folder.uri.fsPath);
    const filePath = path.join(basePath, GAUGE_MANIFEST_FILE);
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

export function isProjectLanguage(projectRoot, language) {
    let mainfest = getManifest(projectRoot);
    return mainfest.Language === language;
}

function getManifest(projectRoot: any) {
    const filePath = path.join(projectRoot, GAUGE_MANIFEST_FILE);
    return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function isMavenProject(projectRoot) {
    return existsSync(path.join(projectRoot, MAVEN_POM));
}

export function getProjectRootFromSpecPath(specFilePath: string): string {
    let projectRoot = path.parse(specFilePath);
    while (!isGaugeProject(projectRoot.dir)) {
        projectRoot = path.parse(projectRoot.dir);
    }
    return projectRoot.dir;
}

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

export function getExecutionCommand(projectRoot): string {
    if (isMavenProject(projectRoot)) return getMavenCommand();
    return getGaugeCommand();
}

export function getGaugeCommand(): string {
    if (gaugeCommand) return gaugeCommand;
    gaugeCommand = GaugeCommands.Gauge;
    if (spawnSync(gaugeCommand).error) gaugeCommand = GaugeCommands.GaugeCmd;
    return gaugeCommand;
}

export function getMavenCommand(): string {
    if (mavenCommand) return mavenCommand;
    mavenCommand = MAVEN_COMMAND;
    if (spawnSync(mavenCommand).error) mavenCommand = MAVEN_COMMAND_WINDOWS;
    return mavenCommand;
}

export function isMavenInstalled(): boolean {
    return !spawnSync(getMavenCommand()).error;
}
