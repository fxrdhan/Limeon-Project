# LSP message flow (stdio) for “go to definition”

This skill’s CLI implements the minimal, realistic sequence:

1. Spawn the server: `typescript-language-server --stdio`
2. `initialize` request
3. `initialized` notification
4. `textDocument/didOpen` notification
5. `textDocument/definition` request
6. `shutdown` request
7. `exit` notification

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
