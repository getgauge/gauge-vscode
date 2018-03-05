import { WorkspaceEdit, window, workspace, TextDocument, TextEdit, Uri, TextEditor,
    TextDocumentShowOptions, Position, Range } from "vscode";
import { existsSync } from 'fs';
export class WorkspaceEditor {
    private readonly _edit: WorkspaceEdit;

    constructor(edit: WorkspaceEdit) {
        this._edit = edit;
    }

    applyChanges() {
        this._edit.entries().forEach((tuple: [Uri, TextEdit[]]) => {
            this.writeToFileInTextEditor(tuple[0].fsPath, tuple[1]);
        });
    }

    private writeInDocument(document: TextDocument, edit: TextEdit[]) {
        let lineNumberToFocus = edit[0].range.start.line;
        let options: TextDocumentShowOptions = {
            selection: new Range(new Position(lineNumberToFocus, 0), new Position(lineNumberToFocus, 0))
        };
        window.showTextDocument(document, options).then((editor: TextEditor) => {
            let newFileEdits = new WorkspaceEdit();
            newFileEdits.set(document.uri, edit);
            workspace.applyEdit(newFileEdits);
        });
    }

    private writeToFileInTextEditor(fileName: string, fileEdit: TextEdit[]): void {
        if (!existsSync(fileName)) {
            workspace.openTextDocument().then((document: TextDocument) => {
                this.writeInDocument(document, fileEdit);
            });
        } else {
            workspace.openTextDocument(fileName).then((document: TextDocument) => {
                this.writeInDocument(document, fileEdit);
            });
        }
    }
}