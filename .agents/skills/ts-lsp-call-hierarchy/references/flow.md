# LSP call hierarchy flow

This skill’s Bun/TypeScript CLI uses the minimum realistic sequence over stdio:

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

`prepareCallHierarchy` returns an array. The CLI chooses the first item (`prepare[0]`) by default and exposes it as `target`.

Use `--item <n>` to select another prepared item. The output includes `targetIndex` so it is clear which item powered incoming/outgoing requests.

## Interpreting empty incoming calls

`callHierarchy/incomingCalls` is semantic. It reports calls to the selected `CallHierarchyItem`, not every text occurrence of the same name.

When `incoming` is empty:

- Check `target.uri` and `target.selectionRange` first. They identify the exact symbol the language server selected.
- Do not treat `rg "symbolName("` output as proof of callers. A file can use the same local name for a different import, including an npm package.
- For smoke tests, choose a symbol with known semantic callers and confirm those callers resolve to the same declaration.

## Position handling

- CLI input positions are 1-based.
- LSP payload positions are 0-based UTF-16 positions.
- `--file` is resolved relative to `--root`.
- `--find` targets a position inside the matched text, not the byte before the token.
