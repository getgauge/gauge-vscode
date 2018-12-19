'use strict';

import * as path from 'path';
import { WorkspaceFolder, TextDocument, TextEditor } from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE, GaugeCommands, MAVEN_POM, MAVEN_COMMAND } from './constants';
import { spawnSync } from 'child_process';

let gaugeCommand;
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

export function isDotnetProject(projectRoot) {
    const filePath = path.join(projectRoot, GAUGE_MANIFEST_FILE);
    let mainfest = JSON.parse(readFileSync(filePath, 'utf-8'));
    return mainfest.Language === 'dotnet';

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

export function hasActiveGaugeDocument(activeTextEditor: TextEditor) {
    return activeTextEditor && isGaugeDocument(activeTextEditor.document);
}

function isGaugeDocument(document: TextDocument) {
    return document.languageId === "gauge";
}

export function getExecutionCommand(projectRoot): string {
    if (isMavenProject(projectRoot)) return "mvn";
    return getGaugeCommand();
}

export function getGaugeCommand(): string {
    if (gaugeCommand) return gaugeCommand;
    gaugeCommand = GaugeCommands.Gauge;
    if (spawnSync(gaugeCommand).error) gaugeCommand = GaugeCommands.GaugeCmd;
    return gaugeCommand;
}

export function isMavenInstalled(): boolean {
    return !spawnSync(MAVEN_COMMAND).error;
}