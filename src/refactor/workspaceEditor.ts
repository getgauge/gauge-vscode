import { WorkspaceEdit, window, workspace, TextDocument, TextEdit, Uri } from "vscode";
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

    private writeInDocument(document, edit) {
        window.showTextDocument(document).then(() => {
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