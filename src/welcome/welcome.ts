import { Disposable, TextDocumentContentProvider, Uri, workspace,
    commands, ViewColumn, window, ExtensionContext } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "../constants";
import * as path from 'path';
import { TerminalProvider } from "../terminal/terminal";
import { WelcomePageTokenReplace } from "./WelcomePageTokenReplace";

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
            },
            new TerminalProvider(context))
        );
        if (upgraded || !this.supressed()) {
            let welcomePageConfig = workspace.getConfiguration('gauge.welcomePage');
            if (welcomePageConfig && welcomePageConfig.get<boolean>('enabled')) {
                commands.executeCommand(GaugeVSCodeCommands.Welcome);
            }
        }
    }

    supressed(): boolean {
        return this._context.globalState.get<boolean>(GAUGE_SUPPRESS_WELCOME);
    }

    async provideTextDocumentContent(uri: Uri): Promise<string> {
        let rootPath = path.join('out', uri.path);
        let root = Uri.file(this._context.asAbsolutePath(rootPath)).toString();
        let docPath = Uri.file(this._context.asAbsolutePath(path.join(rootPath, 'index.html')));
        const doc = await workspace.openTextDocument(docPath);
        let text =  doc.getText();
        return new WelcomePageTokenReplace().replaceText(text, this.supressed(), root);
    }

    dispose() {
        this._disposable.dispose();
    }
}
