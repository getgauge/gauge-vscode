import { RequestType0, RequestHandler0, HandlerResult, CancellationToken } from 'vscode-jsonrpc';
import { NotificationType0, NotificationHandler0 } from 'vscode-languageclient/lib/main';
import { RequestType } from 'vscode-jsonrpc/lib/messages';

export interface GaugeClientCapabilities {
/**
 * The client supports saveFiles request sent from server to client
 */
    saveFiles?: boolean;
}

/**
 * The `workspace/saveFiles` notification is sent from the server to the client to save all open files in the workspace.
 */
export namespace SaveFilesRequest {
    export const type = new RequestType0<null, void, void>('workspace/saveFiles');
    export type HandlerSignature = RequestHandler0<null, void>;
    export type MiddlewareSignature = (token: CancellationToken, next: HandlerSignature) => HandlerResult<null, void>;
}
