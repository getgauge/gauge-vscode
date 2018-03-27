import * as os from 'os';
import * as path from 'path';
import { get } from 'https';

import * as fs from 'fs-extra';

import { ExtensionContext, Disposable, commands, window, Uri, workspace, QuickPickItem, Progress } from 'vscode';

import AdmZip = require('adm-zip');

import { VSCodeCommands, GaugeCommands, GaugeVSCodeCommands, GAUGE_TEMPLATE_URL } from "../constants";
import { FileListItem } from '../types/fileListItem';
import { spawnSync, execSync, spawn } from 'child_process';

export class ProjectInitializer extends Disposable {
    private isGaugeInstalled: boolean;
    private readonly _disposable: Disposable;

    private readonly _templates: any = [
        { name: 'python', desc: "template for gauge-python projects", },
        { name: 'js', desc: "template for gauge-javascript projects", },
        { name: 'ruby', desc: "template for gauge-ruby projects", },
    ];

    constructor(isGaugeInstalled: boolean) {
        super(() => this.dispose());
        this.isGaugeInstalled = isGaugeInstalled;
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
        let options: any = { prompt: "Enter a name for your new project", placeHolder: "gauge-tests" };
        const name = await window.showInputBox();
        if (!name) return;
        options = { canSelectFolders: true, openLabel: "Select a folder to create the project in" };
        const folders = await window.showOpenDialog(options);
        if (!folders || folders.length !== 1) return;
        const projectFolderUri = Uri.file(path.join(folders[0].fsPath, name));
        if (fs.existsSync(projectFolderUri.fsPath)) {
            return this.handleError(null, `A folder named ${name} already exists in ${folders[0].fsPath}`);
        }
        fs.mkdirSync(projectFolderUri.fsPath);
        return this.createProjectInDir(tmpl, projectFolderUri);
    }

    private async createProjectInDir(template: FileListItem, projectFolder: Uri) {
        return window.withProgress({ location: 10 }, async (p: Progress<{}>) => {
            return new Promise(async (res, rej) => {
                let ph = new ProgressHandler(p, res, rej);
                if (this.isGaugeInstalled) await this.createFromCommandLine(template, projectFolder, ph);
                else await this.createFromTemplate(template, projectFolder, ph);
            });
        });
    }

    private async createFromCommandLine(template: FileListItem, projectFolder: Uri, p: ProgressHandler) {
        let args = [GaugeCommands.Init, template.label];
        let options = { cwd: projectFolder.fsPath, env: process.env };
        p.report("Initializing project...");
        let proc = spawn(GaugeCommands.Gauge, args, options);
        proc.addListener('err', p.cancle);
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
        let req = get(GAUGE_TEMPLATE_URL + `${GAUGE_TEMPLATE_URL}/${tmpl.value}`, (res) => {
            res.on('data', (d) => fs.appendFileSync(tmpFilePath, d));
            res.on('end', async () => await this.extractZipAndCopyFiles(tmpFilePath, tmpDir, tmpl.label, destUri, p));
        });
        req.on('error', (err) => p.cancle("Failed to download template. " + err.message));
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
            p.cancle(err);
            return this.handleError(p, err);
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
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }
        return tmpDir;
    }

    private handleError(p: ProgressHandler, err: string) {
        if (p) p.cancle(err);
        return window.showErrorMessage("Failed to create project. " + err);
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

    cancle(message: string | Buffer) {
        this.reject(message.toString());
    }
}
