# LSP call hierarchy flow

This skill’s CLI uses the minimum realistic sequence over stdio:

1. Spawn `typescript-language-server --stdio`
2. `initialize` request
3. `initialized` notification
4. `textDocument/didOpen` notification
5. `textDocument/prepareCallHierarchy` request
6. `callHierarchy/incomingCalls` and/or `callHierarchy/outgoingCalls` request(s)
7. `shutdown` request
8. `exit` notification

## Why `prepareCallHierarchy` first?

Call hierarchy requests operate on a `CallHierarchyItem` (symbol-like object). You must obtain one via `textDocument/prepareCallHierarchy` at a position.

## Item selection

`prepareCallHierarchy` returns an array. The CLI chooses the first item (`prepare[0]`) as the target for incoming/outgoing requests.
