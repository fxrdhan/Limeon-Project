---
name: ts-lsp-rename-symbol
description: Perform TypeScript/JavaScript symbol rename through `typescript-language-server` over stdio. Use when you need workspace-aware rename edits that respect imports, path aliases, re-exports, overloads, and TypeScript project semantics instead of text replacement.
---

# Ts Lsp Rename Symbol

## Overview

Run a Bun/TypeScript CLI that executes the normal LSP rename flow:

1. Start `typescript-language-server` (stdio)
2. Send `initialize`
3. Send `textDocument/didOpen`
4. Send `textDocument/prepareRename`
5. Send `textDocument/rename`
6. Print the returned `WorkspaceEdit`, or apply supported file edits with `--apply`

## Quick Start

### Prerequisites

- Bun available on PATH.
- `typescript-language-server` available on PATH, or use `./node_modules/.bin/typescript-language-server` in a TS workspace.

If you need to install it in a Bun-based repo:

```bash
bun add -d typescript typescript-language-server
```

### Preview rename edits

```bash
./.agents/skills/ts-lsp-rename-symbol/scripts/ts_rename_symbol \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --new-name renamedSymbol
```

### Preview rename edits without manual line/character

```bash
./.agents/skills/ts-lsp-rename-symbol/scripts/ts_rename_symbol \
  --root . \
  --file src/path/to/file.ts \
  --find "oldSymbol" \
  --new-name renamedSymbol
```

### Apply rename edits

```bash
./.agents/skills/ts-lsp-rename-symbol/scripts/ts_rename_symbol \
  --root . \
  --file src/path/to/file.ts \
  --find "oldSymbol" \
  --new-name renamedSymbol \
  --apply
```

### If server is not on PATH

```bash
./.agents/skills/ts-lsp-rename-symbol/scripts/ts_rename_symbol \
  --server ./node_modules/.bin/typescript-language-server \
  --root . \
  --file src/path/to/file.ts \
  --line 12 \
  --character 8 \
  --new-name renamedSymbol
```

## Output shape

Without `--apply`, the CLI prints JSON with:

- `prepare`: raw `textDocument/prepareRename` result
- `edit`: raw `WorkspaceEdit` from `textDocument/rename`

With `--apply`, output also includes:

- `applied.changedFiles`: file paths written
- `applied.editCount`: total text edits applied

## Notes

- `--file` is resolved relative to `--root` unless it is absolute.
- `--line`/`--character` CLI flags are 1-based; LSP payloads and returned ranges are 0-based.
- `--find` places the cursor inside the matched text, which is usually more reliable than the first byte of a token.
- By default, `textDocument/prepareRename` must succeed before rename. Use `--skip-prepare` only when the server does not support prepare-rename.
- `--apply` supports file URI text edits from `changes` and `documentChanges`. It intentionally fails on non-file URIs or resource operations.
- See `references/flow.md` for protocol details.
