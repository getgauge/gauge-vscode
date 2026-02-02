'use strict';

import { Disposable, commands, Uri, CancellationTokenSource, window } from "vscode";
import { GaugeVSCodeCommands, VSCodeCommands } from "./constants";
import {
    LanguageClient, TextDocumentIdentifier, Location as LSLocation, Position as LSPosition
} from 'vscode-languageclient/node';
import { GaugeClients } from "./gaugeClients";

export class ReferenceProvider extends Disposable {
    private _disposable: Disposable;
    constructor(private clients: GaugeClients) {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            commands.registerCommand(
                GaugeVSCodeCommands.ShowReferencesAtCursor, this.showStepReferencesAtCursor(clients)),
            commands.registerCommand(
                GaugeVSCodeCommands.ShowReferences, this.showStepReferences(clients))
        );
    }

    private showStepReferences(clients: GaugeClients):
        (uri: string, position: LSPosition, stepValue: string) => Thenable<any> {
        return (uri: string, position: LSPosition, stepValue: string) => {
            let languageClient = clients.get(Uri.parse(uri).fsPath).client;
            return languageClient.sendRequest("gauge/stepReferences", stepValue, new CancellationTokenSource().token)
                .then(
                    (locations: LSLocation[]) => {
                        return this.showReferences(locations, uri, languageClient, position);
                    });
        };
    }

    private showStepReferencesAtCursor(clients: GaugeClients): () => Thenable<any> {
        return (): Thenable<any> => {
            let position = window.activeTextEditor.selection.active;
            let documentId = TextDocumentIdentifier.create(window.activeTextEditor.document.uri.toString());
            let activeEditor = window.activeTextEditor.document.uri;
            let languageClient = clients.get(activeEditor.fsPath).client;
            let params = { textDocument: documentId, position };
            return languageClient.sendRequest("gauge/stepValueAt", params, new CancellationTokenSource().token).then(
                (stepValue: string) => {
                    return this.showStepReferences(clients)(documentId.uri, position, stepValue);
                });
        };
    }

    private showReferences(locations: LSLocation[], uri: string, languageClient: LanguageClient, position: LSPosition):
        Thenable<any> {
        if (locations) {
            return commands.executeCommand(VSCodeCommands.ShowReferences, Uri.parse(uri),
                languageClient.protocol2CodeConverter.asPosition(position),
                locations.map(languageClient.protocol2CodeConverter.asLocation));
        }
        window.showInformationMessage('Action NA: Try this on an implementation.');
        return Promise.resolve(false);
    }
}