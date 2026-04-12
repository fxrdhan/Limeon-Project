---
name: ts-lsp-goto-definition
description: Perform TypeScript/JavaScript “go to definition” by talking to `typescript-language-server` over stdio (real LSP JSON-RPC). Use when you need accurate symbol resolution across a TS project and want to avoid heuristic search (ripgrep), especially for re-exports, path aliases, overloads, and workspace-aware resolution.
---

# Ts Lsp Goto Definition

## Overview

Run a small Rust LSP client that does the realistic LSP flow:

1. Start `typescript-language-server` (stdio)
2. Send `initialize`
3. Send `textDocument/didOpen`
4. Send `textDocument/definition`

## Quick Start

### Prerequisites

- Rust toolchain available (`cargo`).
- `typescript-language-server` available on PATH, or use `./node_modules/.bin/typescript-language-server` in a TS workspace.

If you need to install it in a Bun-based repo, use:

```bash
bun add -d typescript typescript-language-server
```

### Go to definition

Run the script and pass a 1-based cursor position:

```bash
/home/fxrdhan/.codex/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8
```

### Go to definition without manual line/character

```bash
/home/fxrdhan/.codex/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --root . \
  --file src/path/to/file.ts \
  --find "symbolNameHere"
```

If the server binary is not on PATH:

```bash
/home/fxrdhan/.codex/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --server ./node_modules/.bin/typescript-language-server \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8
```

The script prints a JSON array of normalized locations:

- `uri`: target document URI (usually `file://...`)
- `range`: `{ start: { line, character }, end: { line, character } }` (0-based; LSP-native)

## Notes

- This is workspace-aware and generally more accurate than search-based approaches.
- LSP uses 0-based line/character; the CLI flags are 1-based for convenience.
- For protocol details and the message flow, see `references/flow.md`.
