import { TextDocumentContentProvider, Disposable, Uri, Event, ExtensionContext, EventEmitter, workspace } from "vscode";
import { Page } from "./page";
import { WelcomePage } from "./welcome";
import { ReportPage } from "./report";

export class PageProvider extends Disposable implements TextDocumentContentProvider {
    private _onDidChange = new EventEmitter<Uri>();

    private readonly _pages: Map<string, Page>;

    constructor(context: ExtensionContext, upgraded: boolean) {
        super(() => this.dispose());

        this._pages = new Map<string, Page>([
            ['welcome', new WelcomePage(context, upgraded)],
            ['htmlreport', new ReportPage(context)]
        ]);
        workspace.registerTextDocumentContentProvider('gauge', this);
    }

    provideTextDocumentContent(uri: Uri): string | Thenable<string> {
        return this._pages.get(uri.path.replace('/', '')).content();
    }

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }

    dispose() {
        [].forEach(this._pages.values, (p) => p.dispose());
    }
}
