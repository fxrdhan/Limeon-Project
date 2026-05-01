---
name: ts-lsp-goto-definition
description: Perform TypeScript/JavaScript “go to definition” by talking to `typescript-language-server` over stdio (real LSP JSON-RPC). Use when you need accurate symbol resolution across a TS project and want to avoid heuristic search (ripgrep), especially for re-exports, path aliases, overloads, and workspace-aware resolution.
---

# Ts Lsp Goto Definition

## Overview

Run a small Bun/TypeScript LSP client that does the realistic LSP flow:

1. Start `typescript-language-server` (stdio)
2. Send `initialize`
3. Send `textDocument/didOpen`
4. Send TypeScript source-definition first, then fall back to `textDocument/definition`

## Quick Start

### Prerequisites

- Bun available on PATH.
- `typescript-language-server` available on PATH, or use `./node_modules/.bin/typescript-language-server` in a TS workspace.

If you need to install it in a Bun-based repo, use:

```bash
bun add -d typescript typescript-language-server
```

### Go to definition

Run the script and pass a 1-based cursor position:

```bash
./.agents/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8
```

### Go to definition without manual line/character

```bash
./.agents/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --root . \
  --file src/path/to/file.ts \
  --find "symbolNameHere"
```

By default the CLI uses `--mode prefer-source`, which asks TypeScript for source definitions and falls back to standard LSP definitions. This avoids stopping at import aliases for common TypeScript code.

If you specifically want raw LSP `textDocument/definition` behavior:

```bash
./.agents/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
  --root . \
  --file src/path/to/file.ts \
  --find "symbolNameHere" \
  --mode definition
```

If the server binary is not on PATH:

```bash
./.agents/skills/ts-lsp-goto-definition/scripts/ts_goto_definition \
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
- `--file` is resolved relative to `--root` unless it is absolute.
- LSP uses 0-based line/character; the CLI flags are 1-based for convenience.
- `--find` places the cursor inside the matched text, which is usually more reliable than the first byte of a token.
- If TypeScript returns a coarse `0:0` source-definition range, the CLI refines it by locating a matching declaration name in the target file.
- For protocol details and the message flow, see `references/flow.md`.
