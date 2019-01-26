'use strict';

import * as os from 'os';
import * as path from 'path';
import { get } from 'https';

import * as fs from 'fs-extra';

import { Disposable, commands, window, Uri, workspace, Progress } from 'vscode';

import AdmZip = require('adm-zip');

import {
    VSCodeCommands, GaugeCommands, GaugeVSCodeCommands, GAUGE_TEMPLATE_URL} from "../constants";
import { FileListItem } from '../types/fileListItem';
import { execSync, spawn } from 'child_process';
import { GaugeCLI } from '../gaugeCLI';

export class ProjectInitializer extends Disposable {
    private readonly _disposable: Disposable;

    private readonly _templates: any = [
        { name: 'python', desc: "template for gauge-python projects", },
        { name: 'js', desc: "template for gauge-javascript projects", },
        { name: 'ruby', desc: "template for gauge-ruby projects", },
        { name: 'java', desc: "template for gauge-java projects", },
        { name: 'java_maven', desc: "template for gauge-java projects with maven as build tool.", },
        { name: 'java_maven_selenium', desc: "template for gauge-java selenium projects with maven as build tool.", }
    ];

    private readonly _archtypes: any = {
        java_maven: { archetypeArtifactId: 'gauge-archetype-java', archetypeGroupId: 'com.thoughtworks.gauge.maven' },
        java_maven_selenium: {
            archetypeArtifactId: 'gauge-archetype-selenium',
            archetypeGroupId: 'com.thoughtworks.gauge.maven'
        },
    };
    private readonly cli: GaugeCLI;

    constructor(cli: GaugeCLI) {
        super(() => this.dispose());
        this.cli = cli;
        this._disposable = commands.registerCommand(GaugeVSCodeCommands.CreateProject, async () => {
            await this.createProject();
        });
    }

    dispose() {
        this._disposable.dispose();
    }

    private async createProject() {
        const tmpl = await window.showQuickPick(this.getTemplatesList());
        if (!tmpl) return;
        let folders = await this.getTargetFolder();
        if (!folders) return;
        let options: any = { prompt: "Enter a name for your new project", placeHolder: "gauge-tests" };
        if (tmpl.label.includes("java_maven")) return this.createMavenProject(tmpl.label, folders[0].fsPath);
        const name = await window.showInputBox(options);
        if (!name) return;
        const projectFolderUri = Uri.file(path.join(folders[0].fsPath, name));
        if (fs.existsSync(projectFolderUri.fsPath)) {
            return this.handleError(
                null, `A folder named ${name} already exists in ${folders[0].fsPath}`, projectFolderUri.fsPath, false);
        }
        fs.mkdirSync(projectFolderUri.fsPath);
        return this.createProjectInDir(tmpl, projectFolderUri);
    }

    private async getTargetFolder() {
        let options = {
            canSelectFolders: true,
            openLabel: "Select a folder to create the project in",
            canSelectMany: false
        };
        const folders = await window.showOpenDialog(options);
        return folders;
    }

    private async createMavenProject(tmpl: string, targetDir: string) {
        try {
            if (!this.cli.isMavenInstalled()) throw new Error("Executable mvn not found.");
            let info = await this.captureMavenProjectInfo();
            if (!info) return;
            return await this.createProjectFromArchType(tmpl, info, targetDir);
        } catch (error) {
            throw new Error(`Failed to create gauge maven project.\n${error}`);
        }

    }

    private async createProjectFromArchType(tmpl: string, info: any, targetDir: string) {
        return window.withProgress({ location: 10 }, async (p: Progress<{}>) => {
            return new Promise(async (res, rej) => {
                let ph = new ProgressHandler(p, res, rej);
                let archtype = this._archtypes[tmpl];
                let args = ['-q', '-B', 'archetype:generate', `-DarchetypeArtifactId=${archtype.archetypeArtifactId}`,
                    `-DarchetypeGroupId=${archtype.archetypeGroupId}`];
                args.push(`-DgroupId=${info.groupID}`);
                args.push(`-DartifactId=${info.artifactID}`);
                args.push(`-Dversion=${info.version}`);
                ph.report("Creating project from maven archtyp...");
                let proc = spawn(this.cli.mavenCommand(), args, { cwd: targetDir, env: process.env });
                proc.addListener('error', async (err) => {
                    await this.handleError(ph, "Failed to create template. " + err.message, targetDir);
                });
                proc.addListener('close', async () => await ph.end(Uri.file(path.join(targetDir, info.artifactID))));
            });
        });
    }

    private async captureMavenProjectInfo() {
        let groupID = "example";
        let artifactID = await window.showInputBox({
            prompt: "Enter name for your new project",
            placeHolder: "gauge-tests"
        });
        if (!artifactID) return;
        let version = "1.0-SNAPSHOT";
        return { groupID: groupID, artifactID: artifactID, version: version };
    }

    private async createProjectInDir(template: FileListItem, projectFolder: Uri) {
        return window.withProgress({ location: 10 }, async (p: Progress<{}>) => {
            return new Promise(async (res, rej) => {
                let ph = new ProgressHandler(p, res, rej);
                if (this.cli.isInstalled()) await this.createFromCommandLine(template, projectFolder, ph);
                else await this.createFromTemplate(template, projectFolder, ph);
            });
        });
    }

    private async createFromCommandLine(template: FileListItem, projectFolder: Uri, p: ProgressHandler) {
        let args = [GaugeCommands.Init, template.label];
        let options = { cwd: projectFolder.fsPath, env: process.env };
        p.report("Initializing project...");
        let proc = spawn(this.cli.command(), args, options);
        proc.addListener('error', async (err) => {
            this.handleError(p, "Failed to create template. " + err.message, projectFolder.fsPath);
        });
        proc.addListener('close', async () => await p.end(projectFolder));
    }

    private getTemplatesList(): Array<FileListItem> {
        return this._templates.map((tmpl) => new FileListItem(tmpl.name, tmpl.desc, tmpl.name + ".zip"));
    }

    private async createFromTemplate(tmpl: FileListItem, destUri: Uri, p: ProgressHandler) {
        let tmpDir = this.createTempDir();
        let tmpFilePath = path.join(tmpDir, tmpl.value);
        p.report('Downloading template...');
        await this.downloadTemplateAndSetup(tmpl, tmpFilePath, tmpDir, destUri, p);
    }

    private async downloadTemplateAndSetup(tmpl: FileListItem, tmpFilePath, tmpDir, destUri: Uri, p: ProgressHandler) {
        let req = get(`${GAUGE_TEMPLATE_URL}/${tmpl.value}`, (res) => {
            res.on('data', (d) => fs.appendFileSync(tmpFilePath, d));
            res.on('end', async () => await this.extractZipAndCopyFiles(tmpFilePath, tmpDir, tmpl.label, destUri, p));
        });
        req.on('error', (err) => {
            this.handleError(p, "Failed to download template. " + err.message, destUri.fsPath);
        });
    }

    private async extractZipAndCopyFiles(zip, tmpDir, tmpl: string, destUri: Uri, p: ProgressHandler) {
        try {
            p.report("Extracting template...");
            new AdmZip(zip).extractAllTo(tmpDir, true);
            p.report("Copying files to " + destUri.fsPath);
            await fs.copy(path.join(tmpDir, tmpl), destUri.fsPath);
            this.runPostInstall(destUri.fsPath, p);
            p.end(destUri);
        } catch (err) {
            return this.handleError(p, "Failed to extract template. " + err.message, destUri.fsPath);
        }
    }

    private runPostInstall(projectFolder: string, p: ProgressHandler) {
        let metadataFile = path.join(projectFolder, 'metadata.json');
        let cmd = JSON.parse(fs.readFileSync(metadataFile, 'UTF-8')).postInstallCmd;
        fs.unlinkSync(metadataFile);
        if (!cmd) return;
        p.report('Running post install commands to setup project...');
        execSync(cmd, { cwd: projectFolder });
    }

    private createTempDir() {
        let tmpDir = path.join(os.tmpdir(), 'gauge');
        fs.removeSync(tmpDir);
        fs.mkdirSync(tmpDir);
        return tmpDir;
    }

    private handleError(p: ProgressHandler, err, dirPath: string, removeDir: boolean = true) {
        if (removeDir) fs.removeSync(dirPath);
        if (p) p.cancel(err);
        return window.showErrorMessage(err);
    }
}

class ProgressHandler {
    private progress: Progress<{ message: string }>;
    resolve: (value?: {} | PromiseLike<{}>) => void;
    reject: (reason?: any) => void;

    constructor(progress, resolve, reject) {
        this.progress = progress;
        this.resolve = resolve;
        this.reject = reject;
    }

    report(message) {
        this.progress.report({ message: message });
    }

    async end(uri: Uri) {
        this.resolve();
        commands.executeCommand(VSCodeCommands.OpenFolder, uri, !!workspace.workspaceFolders);
    }

    cancel(message: string | Buffer) {
        this.reject(message.toString());
    }
}
