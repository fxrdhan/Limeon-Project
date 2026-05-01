# LSP message flow (stdio) for “go to definition”

This skill’s Bun/TypeScript CLI implements the minimal, realistic sequence:

1. Spawn the server: `typescript-language-server --stdio`
2. `initialize` request
3. `initialized` notification
4. `textDocument/didOpen` notification
5. `workspace/executeCommand` request with `_typescript.goToSourceDefinition` when using `--mode source|prefer-source`
6. `textDocument/definition` request when using `--mode definition`, or when `--mode prefer-source` needs a fallback
7. `shutdown` request
8. `exit` notification

## JSON-RPC framing over stdio

Each message is:

- ASCII headers (at least `Content-Length`)
- blank line (`\r\n\r\n`)
- UTF-8 JSON payload of exactly `Content-Length` bytes

Example header:

```
Content-Length: 1234

{...json...}
```

## Definition response shapes

Servers may respond with:

- `Location`
- `Location[]`
- `LocationLink[]`

The CLI normalizes these into `Location[]` with `{ uri, range }`.

For `LocationLink`, the CLI prefers `targetSelectionRange` over `targetRange`.

## Position handling

- CLI input positions are 1-based.
- LSP payload positions are 0-based UTF-16 positions.
- `--file` is resolved relative to `--root`.
- `--find` targets a position inside the matched text, not the byte before the token.
- Coarse `0:0` source-definition ranges are refined by scanning the target file for a matching declaration name.
