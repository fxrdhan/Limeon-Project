# LSP rename flow

This skill's Bun/TypeScript CLI uses the minimum realistic sequence over stdio:

1. Spawn `typescript-language-server --stdio`
2. `initialize` request
3. `initialized` notification
4. `textDocument/didOpen` notification
5. `textDocument/prepareRename` request unless `--skip-prepare` is set
6. `textDocument/rename` request
7. `shutdown` request
8. `exit` notification

## Why preview first?

LSP rename returns a `WorkspaceEdit`. Previewing the edit before applying it makes it possible to inspect the exact files and ranges selected by TypeScript. This is safer than global text replacement because the server resolves the symbol semantically.

## Supported WorkspaceEdit shapes

The CLI can apply text edits from:

- `changes`: `{ [uri]: TextEdit[] }`
- `documentChanges`: `TextDocumentEdit[]`

Resource operations such as create, rename, and delete file are rejected. Symbol rename in TypeScript normally returns text edits only.

## Position handling

- CLI input positions are 1-based.
- LSP payload positions are 0-based UTF-16 positions.
- `--file` is resolved relative to `--root`.
- `--find` targets a position inside the matched text, not the byte before the token.
