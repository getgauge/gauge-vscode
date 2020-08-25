'use strict';

import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { commands, Disposable, Progress, Uri, window, workspace } from 'vscode';
import { CLI } from '../cli';
import { GaugeCommands, GaugeVSCodeCommands, INSTALL_INSTRUCTION_URI, VSCodeCommands } from "../constants";
import { FileListItem } from '../types/fileListItem';
export class ProjectInitializer extends Disposable {
    private readonly _disposable: Disposable;

    private readonly cli: CLI;

    constructor(cli: CLI) {
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
        if (!this.cli.isGaugeInstalled()) {
            window.showErrorMessage("Please install gauge to create a new Gauge project." +
                `For more info please refer the [install intructions](${INSTALL_INSTRUCTION_URI}).`);
            return;
        }
        const tmpl = await window.showQuickPick(await this.getTemplatesList());
        if (!tmpl) return;
        let folders = await this.getTargetFolder();
        if (!folders) return;
        let options: any = { prompt: "Enter a name for your new project", placeHolder: "gauge-tests" };
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

    private async createProjectInDir(template: FileListItem, projectFolder: Uri) {
        return window.withProgress({ location: 10 }, async (p: Progress<{}>) => {
            return new Promise(async (res, rej) => {
                let ph = new ProgressHandler(p, res, rej);
                await this.createFromCommandLine(template, projectFolder, ph);
            });
        });
    }

    private async createFromCommandLine(template: FileListItem, projectFolder: Uri, p: ProgressHandler) {
        let args = [GaugeCommands.Init, template.label];
        let options = { cwd: projectFolder.fsPath, env: process.env };
        p.report("Initializing project...");
        let proc = spawn(this.cli.gaugeCommand(), args, options);
        proc.addListener('error', async (err) => {
            this.handleError(p, "Failed to create template. " + err.message, projectFolder.fsPath);
        });
        proc.stdout.on('data', (m) => { console.log(m.toString()); });
        proc.on('close', async (code) => {
            if (code === 0) { p.cancel("Faile to initialize project."); }
            await p.end(projectFolder);
        });
    }

    private async getTemplatesList(): Promise<Array<FileListItem>> {
        let args = ["template", "--list", "--machine-readable"];
        let cp = spawnSync(this.cli.gaugeCommand(), args, { env: process.env });
        try {
            let _templates = JSON.parse(cp.stdout.toString());
            return _templates.map((tmpl) => new FileListItem(tmpl.key, tmpl.Description, tmpl.value));
        } catch (error) {
            await window.showErrorMessage("Failed to get list of templates.",
                " Try running 'gauge template --list ----machine-readable' from command line");
            return [];
        }
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
