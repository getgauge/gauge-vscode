import { Disposable, TextDocumentContentProvider, Uri, workspace,
    commands, ViewColumn, window, ExtensionContext } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "../commands";
import * as path from 'path';

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

    async provideTextDocumentContent(uri: Uri): Promise<string> {
        let rootPath = path.join('out', uri.path);
        let docPath = Uri.file(this._context.asAbsolutePath(path.join(rootPath, 'index.html')));
        const doc = await workspace.openTextDocument(docPath);
        let text =  doc.getText();
        let supress = this._context.globalState.get<Boolean>(GAUGE_SUPPRESS_WELCOME);
        return text
            .replace(/{{doNotShowWelcome}}/g, supress ? "checked" : "")
            .replace(/{{root}}/g, Uri.file(this._context.asAbsolutePath(rootPath)).toString());
    }

    dispose() {
        this._disposable.dispose();
    }
}
