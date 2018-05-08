import { Disposable, Uri, workspace, commands, ViewColumn, window, ExtensionContext, TextDocument } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands, WELCOME_PAGE_URI } from "../constants";
import * as path from 'path';
import { TerminalProvider } from "../terminal/terminal";
import { WelcomePageTokenReplace } from "./welcomePageTokenReplace";
import { Page } from "./page";
import { getGaugeVersionInfo } from '../gaugeVersion';

const GAUGE_SUPPRESS_WELCOME = 'gauge.welcome.supress';
const WELCOME_FILE_NAME = "/welcome";
const IS_WELCOME_PAGE_OPEN = "isWelcomePageOpen";
const HAS_OPENED_BEFORE = "hasOpenedBefore";

export class WelcomePage extends Disposable implements Page {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;
    private readonly _pages: Map<string, Page>;

    constructor(context: ExtensionContext) {
        super(() => this.dispose());
        this._context = context;
        this._disposable = Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.Welcome, () => {
                return commands.executeCommand(VSCodeCommands.Preview,
                    WELCOME_PAGE_URI, ViewColumn.Active, 'Welcome to Gauge').then((success) => {
                }, (reason) => {
                    window.showErrorMessage(reason);
                });
            },
            new TerminalProvider(context)),
        );

        workspace.onDidOpenTextDocument((doc: TextDocument) => {
            if (doc.fileName === WELCOME_FILE_NAME) {
                context.workspaceState.update(IS_WELCOME_PAGE_OPEN, true);
            }
        });
        workspace.onDidCloseTextDocument((doc: TextDocument) => {
            if (doc.fileName === WELCOME_FILE_NAME) {
                context.workspaceState.update(IS_WELCOME_PAGE_OPEN, false);
            }
        });
    }

    supressed(): boolean {
        return this._context.globalState.get<boolean>(GAUGE_SUPPRESS_WELCOME);
    }

    async content(activated: Boolean): Promise<string> {
        let rootPath = path.join('out', 'welcome');
        let root = Uri.file(this._context.asAbsolutePath(rootPath)).toString();
        let docPath = Uri.file(this._context.asAbsolutePath(path.join(rootPath, 'index.html')));
        try {
            const doc = await workspace.openTextDocument(docPath);
            let text =  doc.getText();
            return new WelcomePageTokenReplace().replaceText(text, this.supressed(), activated, root);
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    dispose() {
        this._disposable.dispose();
    }
}

export function showWelcomePage(context: ExtensionContext, upgraded: Boolean) {
    let welcomePageConfig = workspace.getConfiguration('gauge.welcomePage');
    let showWelcomePageOn = workspace.getConfiguration('gauge.welcome').get<string>('showOn');
    if (welcomePageConfig && welcomePageConfig.get<boolean>('enabled')) {
        if ((showWelcomePageOn === "versionUpgrade" && upgraded) ||
        (showWelcomePageOn === "newProjectLoad" && !context.workspaceState.get(HAS_OPENED_BEFORE)) ||
        context.workspaceState.get(IS_WELCOME_PAGE_OPEN) || !getGaugeVersionInfo()) {
            commands.executeCommand(GaugeVSCodeCommands.Welcome);
        }
        context.workspaceState.update(HAS_OPENED_BEFORE, true);
    }
}