#### Gauge Workspace

_Client Capabilities_:

The client sets the following capability if it is supporting workspace save files request.

\`\`\`ts
/**
* The client supports saveFiles request sent from server to client
*/
saveFiles?: boolean;
\`\`\`

##### SaveFiles Request

The `workspace/saveFiles` request is sent from the client to the server to inform the client about workspace folder configuration changes.

_Request_:

* method: 'workspace/saveFiles'
* params: null

_Response_:

result: void | null.
error: code and message set in case an exception happens during the request.

