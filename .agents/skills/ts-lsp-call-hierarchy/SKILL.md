---
name: ts-lsp-call-hierarchy
description: Perform LSP Call Hierarchy for TypeScript/JavaScript by talking to `typescript-language-server` over stdio. Use when you need “who calls this?” / “what does this call?” answers that respect TS project semantics (re-exports, path aliases, overloads), instead of search-based heuristics.
---

# Ts Lsp Call Hierarchy

## Overview

Run a Rust CLI that executes the realistic LSP call hierarchy flow:

1. Start `typescript-language-server` (stdio)
2. Send `initialize`
3. Send `textDocument/didOpen`
4. Send `textDocument/prepareCallHierarchy`
5. Send `callHierarchy/incomingCalls` and/or `callHierarchy/outgoingCalls`

## Quick Start

### Prerequisites

- Rust toolchain available (`cargo`).
- `typescript-language-server` available on PATH, or use `./node_modules/.bin/typescript-language-server` in a TS workspace.

If you need to install it in a Bun-based repo:

```bash
bun add -d typescript typescript-language-server
```

### Incoming + outgoing calls (both)

```bash
/home/fxrdhan/.codex/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode both
```

### Incoming + outgoing calls (both) without manual line/character

```bash
/home/fxrdhan/.codex/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --find "symbolNameHere" \
  --mode both
```

### Only “who calls this?” (incoming)

```bash
/home/fxrdhan/.codex/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode incoming
```

### Only “what does this call?” (outgoing)

```bash
/home/fxrdhan/.codex/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --mode outgoing
```

### If server is not on PATH

```bash
/home/fxrdhan/.codex/skills/ts-lsp-call-hierarchy/scripts/ts_call_hierarchy \
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
- `incoming`: CallHierarchyIncomingCall[] (when `--mode incoming|both`)
- `outgoing`: CallHierarchyOutgoingCall[] (when `--mode outgoing|both`)

The CLI uses 1-based `--line`/`--character` flags, but LSP payloads/returned ranges are 0-based.

## Notes

- The CLI currently uses the first item returned by `prepareCallHierarchy` as the target (see `references/flow.md`).
