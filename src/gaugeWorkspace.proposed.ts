'use strict';

import { workspace, Disposable } from 'vscode';
import { DynamicFeature, RegistrationData, BaseLanguageClient, RequestType0 } from 'vscode-languageclient';

import { ClientCapabilities, InitializedParams } from 'vscode-languageserver-protocol';

import { SaveFilesRequest, GaugeClientCapabilities } from './protocol/gauge.proposed';

export class GaugeWorkspaceFeature implements DynamicFeature<undefined> {

    private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

    constructor(private _client: BaseLanguageClient) {
    }

    public get messages(): RequestType0<any, void> {
        return SaveFilesRequest.type;
    }

    public fillInitializeParams(params: InitializedParams): void {
    }

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        let workspaceCapabilities = capabilities as GaugeClientCapabilities;
        workspaceCapabilities.saveFiles = true;
    }

    public initialize(): void {
        let client = this._client;
        client.onRequest(SaveFilesRequest.type.method, () => {
            return workspace.saveAll(false).then(() => {
                return null;
            });
        });
    }

    public register(_message: RequestType0<any, void> , data: RegistrationData<undefined>): void {
    }

    public unregister(id: string): void {
        let disposable = this._listeners.get(id);
        if (disposable === void 0) {
            return;
        }
        this._listeners.delete(id);
        disposable.dispose();
    }

    public dispose(): void {
        for (let disposable of this._listeners.values()) {
            disposable.dispose();
        }
        this._listeners.clear();
    }
}