import { TextDocumentContentProvider, Disposable, Uri, Event, ExtensionContext, EventEmitter, workspace } from "vscode";
import { Page } from "./page";
import { WelcomePage } from "./welcome";
import { ReportPage } from "./report";

export class PageProvider extends Disposable implements TextDocumentContentProvider {
    activated: Boolean;
    private _onDidChange = new EventEmitter<Uri>();
    private readonly _disposable: Disposable;
    private readonly _pages: Map<string, Page>;

    constructor(context: ExtensionContext, isGaugeInstalled: boolean) {
        super(() => this.dispose());
        this._disposable = workspace.registerTextDocumentContentProvider('gauge', this);
        this._pages = new Map<string, Page>([
            ['welcome', new WelcomePage(context)]
        ]);
        if (isGaugeInstalled) {
            this._pages.set('htmlreport', new ReportPage(context));
        }
    }

    provideTextDocumentContent(uri: Uri): string | Thenable<string> {
        return this._pages.get(uri.path.replace('/', '')).content(this.activated);
    }

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }

    dispose() {
        [].forEach(this._pages.values, (p) => p.dispose());
        this._disposable.dispose();
    }
}
