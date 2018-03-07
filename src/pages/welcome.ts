import { Disposable, Uri, workspace, commands, ViewColumn, window, ExtensionContext, TextDocument } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "../constants";
import * as path from 'path';
import { TerminalProvider } from "../terminal/terminal";
import { WelcomePageTokenReplace } from "./welcomePageTokenReplace";
import { Page } from "./page";

const GAUGE_SUPPRESS_WELCOME = 'gauge.welcome.supress';
const WELCOME_FILE_NAME = "/welcome";
const IS_WELCOME_PAGE_OPNE = "isWelcomePageOpen";
const HAS_OPENED_BEFORE = "hasOpenedBefore";

let welcomeUri = "gauge://authority/welcome";

export class WelcomePage extends Disposable implements Page {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;
    private readonly _pages: Map<string, Page>;

    constructor(context: ExtensionContext, upgraded: boolean) {
        super(() => this.dispose());
        this._context = context;
        this._disposable = Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.Welcome, () => {
                return commands.executeCommand(VSCodeCommands.Preview,
                    welcomeUri, ViewColumn.Active, 'Welcome to Gauge').then((success) => {
                }, (reason) => {
                    window.showErrorMessage(reason);
                });
            },
            new TerminalProvider(context)),
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
            if ((showWelcomePageOn === "versionUpgrade" && upgraded) ||
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

    async content(): Promise<string> {
        let supress = this._context.globalState.get<Boolean>(GAUGE_SUPPRESS_WELCOME);
        let rootPath = path.join('out', 'welcome');
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