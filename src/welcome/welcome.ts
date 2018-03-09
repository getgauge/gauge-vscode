import { Disposable, TextDocumentContentProvider, Uri, workspace,
    commands, ViewColumn, window, ExtensionContext, TextDocument} from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "../constants";
import * as path from 'path';
import { TerminalProvider } from "../terminal/terminal";
import { WelcomePageTokenReplace } from "./welcomePageTokenReplace";

const GAUGE_SUPPRESS_WELCOME = 'gauge.welcome.supress';
const WELCOME_FILE_NAME = "/welcome";
const IS_WELCOME_PAGE_OPNE = "isWelcomePageOpen";
const HAS_OPENED_BEFORE = "hasOpenedBefore";

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
            },
            new TerminalProvider(context))
        );

        workspace.onDidOpenTextDocument((doc: TextDocument) => {
            if (doc.fileName === WELCOME_FILE_NAME) {
                context.workspaceState.update(IS_WELCOME_PAGE_OPNE, true);
            }
        });
        workspace.onDidCloseTextDocument((doc: TextDocument) => {
            if (doc.fileName === WELCOME_FILE_NAME) {
                context.workspaceState.update(IS_WELCOME_PAGE_OPNE, false);
            }
        });

        let welcomePageConfig = workspace.getConfiguration('gauge.welcomePage');
        let showWelcomePageOn = workspace.getConfiguration('gauge.welcome').get<string>('showOn');
        if (welcomePageConfig && welcomePageConfig.get<boolean>('enabled')) {
            if ((showWelcomePageOn === "upgradeVersion" && upgraded) ||
            (showWelcomePageOn === "newProjectLoad" && !context.workspaceState.get(HAS_OPENED_BEFORE)) ||
            context.workspaceState.get(IS_WELCOME_PAGE_OPNE)) {
                commands.executeCommand(GaugeVSCodeCommands.Welcome);
            }
            context.workspaceState.update(HAS_OPENED_BEFORE, true);
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
