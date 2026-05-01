---
name: ts-lsp-call-hierarchy
description: Perform LSP Call Hierarchy for TypeScript/JavaScript by talking to `typescript-language-server` over stdio. Use when you need “who calls this?” / “what does this call?” answers that respect TS project semantics (re-exports, path aliases, overloads), instead of search-based heuristics.
---

# Ts Lsp Call Hierarchy

## Overview

Run a Bun/TypeScript CLI that executes the realistic LSP call hierarchy flow:

1. Start `typescript-language-server` (stdio)
2. Send `initialize`
3. Send `textDocument/didOpen`
4. Send `textDocument/prepareCallHierarchy`
5. Send `callHierarchy/incomingCalls` and/or `callHierarchy/outgoingCalls`

## Quick Start

### Prerequisites

- Bun available on PATH.
- `typescript-language-server` available on PATH, or use `./node_modules/.bin/typescript-language-server` in a TS workspace.

If you need to install it in a Bun-based repo:

```bash
bun add -d typescript typescript-language-server
```

### Incoming + outgoing calls (both)

```bash
./.agents/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode both
```

### Incoming + outgoing calls (both) without manual line/character

```bash
./.agents/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --find "symbolNameHere" \
  --mode both
```

### Only “who calls this?” (incoming)

```bash
./.agents/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode incoming
```

### Only “what does this call?” (outgoing)

```bash
./.agents/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode outgoing
```

### If server is not on PATH

```bash
./.agents/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --server ./node_modules/.bin/typescript-language-server \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode both
```

## Output shape

The CLI prints JSON with:

- `prepare`: CallHierarchyItem[] from `textDocument/prepareCallHierarchy`
- `target`: selected CallHierarchyItem used for incoming/outgoing calls
- `targetIndex`: 1-based selected item index
- `incoming`: CallHierarchyIncomingCall[] (when `--mode incoming|both`)
- `outgoing`: CallHierarchyOutgoingCall[] (when `--mode outgoing|both`)

The CLI uses 1-based `--line`/`--character` flags, but LSP payloads/returned ranges are 0-based.

## Notes

- `--file` is resolved relative to `--root` unless it is absolute.
- `--find` places the cursor inside the matched text, which is usually more reliable than the first byte of a token.
- The CLI uses the first item returned by `prepareCallHierarchy` by default. Use `--item <n>` to choose another prepared item.
- Treat `target.uri` and `target.selectionRange` as the source of truth for the selected symbol. Same-name text matches from `rg` are not necessarily call sites; they may resolve to a different import or package.
- If `incoming` is empty, first confirm the selected symbol is actually referenced semantically. Empty incoming calls are valid for unused symbols and for text matches that only share the same local name.
- See `references/flow.md` for the protocol flow.
