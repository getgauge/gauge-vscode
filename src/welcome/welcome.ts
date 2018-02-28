import { Disposable, TextDocumentContentProvider, Uri, workspace,
    commands, ViewColumn, window, ExtensionContext } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "../constants";
import { getGaugeVersionInfo } from '../gaugeVersion';
import * as path from 'path';
import { spawnSync } from 'child_process';

const GAUGE_SUPPRESS_WELCOME = 'gauge.welcome.supress';
let welcomeUri = "gauge://authority/welcome";

export class WelcomePageProvider extends Disposable implements TextDocumentContentProvider {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;
    constructor(context: ExtensionContext, upgraded: boolean) {
        super(() => this.dispose());

        this._context = context;
        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider('gauge', this),
            commands.registerCommand(GaugeVSCodeCommands.Welcome, () => {
                return commands.executeCommand(VSCodeCommands.Preview,
                    welcomeUri, ViewColumn.Active, 'Welcome to Gauge').then((success) => {
                }, (reason) => {
                    window.showErrorMessage(reason);
                });
            }),
            commands.registerCommand(GaugeVSCodeCommands.ToggleWelcome, () => {
                this._context.globalState.update(GAUGE_SUPPRESS_WELCOME, !this.supressed());
            })
        );
        if (upgraded || !this.supressed()) {
            commands.executeCommand(GaugeVSCodeCommands.Welcome);
        }
    }

    supressed(): boolean {
        return this._context.globalState.get<boolean>(GAUGE_SUPPRESS_WELCOME);
    }

    getLinuxDistribution(): string {
        let dist = spawnSync('cat', ['/etc/issue']);
        if (dist.error) {
            return null;
        }
        return dist.stdout.toString();
    }

    getInstallCommandBasedOnOS(): any {
        let installCommand: any = {};
        switch (process.platform) {
            case "win32":
                installCommand.name = "Chocolatey";
                installCommand.command = "choco install gauge";
                return installCommand;
            case "darwin":
                installCommand.name = "Brew";
                installCommand.command = "brew install gauge";
                return installCommand;
            default:
                if (this.getLinuxDistribution().indexOf("Ubuntu") !== -1) {
                    installCommand.name = "apt-get";
                    installCommand.command = "sudo apt-get install gauge";
                    return installCommand;
                } else {
                    installCommand.name = "dnf";
                    installCommand.command = "sudo dnf install gauge";
                    return installCommand;
                }
        }
    }

    async provideTextDocumentContent(uri: Uri): Promise<string> {
        let rootPath = path.join('out', uri.path);
        let docPath = Uri.file(this._context.asAbsolutePath(path.join(rootPath, 'index.html')));
        const doc = await workspace.openTextDocument(docPath);
        let text =  doc.getText();
        let supress = this._context.globalState.get<Boolean>(GAUGE_SUPPRESS_WELCOME);
        return text
            .replace(/{{installCommand}}/g, encodeURI('command:gauge.createAndSendText.terminal?' +
                    JSON.stringify([this.getInstallCommandBasedOnOS().command])))
            .replace(/{{name}}/g, this.getInstallCommandBasedOnOS().name)
            .replace(/{{command}}/g, this.getInstallCommandBasedOnOS().command)
            .replace(/{{doNotShowWelcome}}/g, supress ? "checked" : "")
            .replace(/{{root}}/g, Uri.file(this._context.asAbsolutePath(rootPath)).toString());
    }

    dispose() {
        this._disposable.dispose();
    }
}
