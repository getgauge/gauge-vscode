import { CancellationToken, HandlerResult, RequestHandler0, RequestType0 } from 'vscode-languageclient';

export interface GaugeClientCapabilities {
    /**
     * The client supports saveFiles request sent from server to client
     */
    saveFiles?: boolean;
}

/**
 * The `workspace/saveFiles` notification is sent from the server to the client to save all open files in the workspace.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SaveFilesRequest {
    export const type = new RequestType0<any, void>('workspace/saveFiles');
    export type HandlerSignature = RequestHandler0<null, void>;
    export type MiddlewareSignature = (token: CancellationToken, next: HandlerSignature) => HandlerResult<null, void>;
}
