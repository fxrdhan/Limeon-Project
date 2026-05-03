#!/usr/bin/env bun
/// <reference types="node" />

import { readFileSync, writeFileSync } from 'node:fs';
import {
  canonicalizeRoot,
  createDefaultBaseArgs,
  filePathFromUri,
  guessLanguageId,
  initializeParams,
  LspClient,
  parsePositiveInteger,
  readFlagValue,
  readTextFile,
  resolveFile,
  resolvePosition,
  runSharedSelfTests,
  toFileUri,
  toLspPosition,
  workspaceInfo,
  type BaseArgs,
  type JsonValue,
} from '../../ts-lsp-shared/lsp-client.ts';

interface Args extends BaseArgs {
  newName?: string;
  apply: boolean;
  skipPrepare: boolean;
}

interface LspPosition {
  line: number;
  character: number;
}

interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

interface TextEdit {
  range: LspRange;
  newText: string;
}

interface CollectedEdit {
  file: string;
  edit: TextEdit;
}

interface ApplyResult {
  changedFiles: string[];
  editCount: number;
}

function printHelp(): void {
  console.log(`ts_rename_symbol

TypeScript/JavaScript symbol rename via typescript-language-server (stdio).

Usage:
  ts_rename_symbol --file <path> --line <1-based> --character <1-based> --new-name <name> [--root <path>]
  ts_rename_symbol --file <path> --find <text> --new-name <name> [--occurrence <n>] [--root <path>]

Options:
  --new-name <name>        Required replacement symbol name
  --apply                  Apply supported file edits instead of only printing the WorkspaceEdit
  --skip-prepare           Skip textDocument/prepareRename
  --find <text>            When --line/--character are omitted, auto-picks the Nth match in the file
  --occurrence <n>         1-based; default: 1
  --server <cmd>           Default: typescript-language-server
  --server-arg <arg>       Repeatable; defaults include --stdio
  --self-test              Run local parser/normalizer tests

Output:
  JSON with prepare and edit. With --apply, also includes applied changedFiles and editCount.`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    ...createDefaultBaseArgs(),
    apply: false,
    skipPrepare: false,
  };
  const rest: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      rest.push(...argv.slice(index + 1));
      break;
    }

    switch (token) {
      case '--root':
        args.root = readFlagValue(argv, index, token);
        index += 1;
        break;
      case '--file':
        args.file = readFlagValue(argv, index, token);
        index += 1;
        break;
      case '--line':
        args.line = parsePositiveInteger(
          readFlagValue(argv, index, token),
          token
        );
        index += 1;
        break;
      case '--character':
        args.character = parsePositiveInteger(
          readFlagValue(argv, index, token),
          token
        );
        index += 1;
        break;
      case '--find':
        args.find = readFlagValue(argv, index, token);
        index += 1;
        break;
      case '--occurrence':
        args.occurrence = parsePositiveInteger(
          readFlagValue(argv, index, token),
          token
        );
        index += 1;
        break;
      case '--new-name':
        args.newName = readFlagValue(argv, index, token);
        index += 1;
        break;
      case '--apply':
        args.apply = true;
        break;
      case '--skip-prepare':
        args.skipPrepare = true;
        break;
      case '--server':
        args.server = readFlagValue(argv, index, token);
        index += 1;
        break;
      case '--server-arg':
        args.serverArgs.push(readFlagValue(argv, index, token));
        index += 1;
        break;
      case '--self-test':
        args.selfTest = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        rest.push(token);
        break;
    }
  }

  if (rest.length > 0) {
    throw new Error(
      `Unknown args: ${rest.join(' ')}\nUse --help to see supported flags.`
    );
  }

  return args;
}

function isObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positionFromJson(value: JsonValue): LspPosition | undefined {
  if (
    !isObject(value) ||
    typeof value.line !== 'number' ||
    typeof value.character !== 'number'
  ) {
    return undefined;
  }
  return { line: value.line, character: value.character };
}

function rangeFromJson(value: JsonValue): LspRange | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const start = positionFromJson(value.start);
  const end = positionFromJson(value.end);
  if (start === undefined || end === undefined) {
    return undefined;
  }
  return { start, end };
}

function textEditFromJson(value: JsonValue): TextEdit | undefined {
  if (!isObject(value) || typeof value.newText !== 'string') {
    return undefined;
  }

  const range = rangeFromJson(value.range);
  if (range === undefined) {
    return undefined;
  }
  return { range, newText: value.newText };
}

function collectEdits(workspaceEdit: JsonValue): CollectedEdit[] {
  if (!isObject(workspaceEdit)) {
    return [];
  }

  const collected: CollectedEdit[] = [];

  if (isObject(workspaceEdit.changes)) {
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      const file = filePathFromUri(uri);
      if (file === undefined) {
        throw new Error(`Cannot apply non-file URI edit: ${uri}`);
      }
      if (!Array.isArray(edits)) {
        throw new Error(`Invalid edits for ${uri}`);
      }
      for (const edit of edits) {
        const textEdit = textEditFromJson(edit);
        if (textEdit === undefined) {
          throw new Error(`Invalid text edit for ${uri}`);
        }
        collected.push({ file, edit: textEdit });
      }
    }
  }

  if (Array.isArray(workspaceEdit.documentChanges)) {
    for (const change of workspaceEdit.documentChanges) {
      if (!isObject(change)) {
        throw new Error('Invalid documentChanges item');
      }
      if (!isObject(change.textDocument)) {
        throw new Error('Cannot apply resource operation from documentChanges');
      }
      const uri = change.textDocument.uri;
      if (typeof uri !== 'string') {
        throw new Error('Missing documentChanges textDocument.uri');
      }
      const file = filePathFromUri(uri);
      if (file === undefined) {
        throw new Error(`Cannot apply non-file URI edit: ${uri}`);
      }
      if (!Array.isArray(change.edits)) {
        throw new Error(`Missing text edits for ${uri}`);
      }
      for (const edit of change.edits) {
        const textEdit = textEditFromJson(edit);
        if (textEdit === undefined) {
          throw new Error(`Invalid text edit for ${uri}`);
        }
        collected.push({ file, edit: textEdit });
      }
    }
  }

  return collected;
}

function offsetForPosition(text: string, position: LspPosition): number {
  if (position.line < 0 || position.character < 0) {
    throw new Error('LSP range positions must be >= 0');
  }

  let line = 0;
  let offset = 0;
  while (line < position.line) {
    const newline = text.indexOf('\n', offset);
    if (newline === -1) {
      throw new Error(`LSP range line ${position.line} is outside the file`);
    }
    offset = newline + 1;
    line += 1;
  }

  const nextNewline = text.indexOf('\n', offset);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const contentEnd = text[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd;
  const lineLength = contentEnd - offset;
  if (position.character > lineLength) {
    throw new Error(
      `LSP range character ${position.character} is outside line ${position.line}`
    );
  }

  return offset + position.character;
}

function applyTextEdits(text: string, edits: TextEdit[]): string {
  const indexed = edits.map(edit => ({
    edit,
    start: offsetForPosition(text, edit.range.start),
    end: offsetForPosition(text, edit.range.end),
  }));

  indexed.sort((left, right) => {
    if (left.start !== right.start) {
      return right.start - left.start;
    }
    return right.end - left.end;
  });

  let nextText = text;
  let previousStart = text.length + 1;
  for (const item of indexed) {
    if (item.end > previousStart) {
      throw new Error('Overlapping text edits cannot be applied');
    }
    nextText =
      nextText.slice(0, item.start) +
      item.edit.newText +
      nextText.slice(item.end);
    previousStart = item.start;
  }

  return nextText;
}

function applyWorkspaceEdit(workspaceEdit: JsonValue): ApplyResult {
  const collected = collectEdits(workspaceEdit);
  const byFile = new Map<string, TextEdit[]>();

  for (const { file, edit } of collected) {
    const edits = byFile.get(file) ?? [];
    edits.push(edit);
    byFile.set(file, edits);
  }

  const changedFiles: string[] = [];
  for (const [file, edits] of byFile) {
    const text = readFileSync(file, 'utf8');
    const nextText = applyTextEdits(text, edits);
    if (nextText !== text) {
      writeFileSync(file, nextText);
      changedFiles.push(file);
    }
  }

  return {
    changedFiles,
    editCount: collected.length,
  };
}

function runSelfTests(): void {
  runSharedSelfTests();
  const text = 'const oldName = 1;\nconsole.log(oldName);\n';
  const nextText = applyTextEdits(text, [
    {
      range: {
        start: { line: 1, character: 12 },
        end: { line: 1, character: 19 },
      },
      newText: 'newName',
    },
    {
      range: {
        start: { line: 0, character: 6 },
        end: { line: 0, character: 13 },
      },
      newText: 'newName',
    },
  ]);
  if (nextText !== 'const newName = 1;\nconsole.log(newName);\n') {
    throw new Error('apply text edits failed');
  }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfTest) {
    runSelfTests();
    console.log('self-test passed');
    return;
  }
  if (args.file === undefined) {
    printHelp();
    throw new Error('Missing --file');
  }
  if (args.newName === undefined || args.newName.length === 0) {
    printHelp();
    throw new Error('Missing --new-name');
  }

  const root = canonicalizeRoot(args.root);
  const file = resolveFile(root, args.file);
  const text = readTextFile(file);
  const position = resolvePosition(
    text,
    args.line,
    args.character,
    args.find,
    args.occurrence
  );
  if (position === undefined) {
    printHelp();
    throw new Error('Missing --line/--character or --find');
  }

  const info = workspaceInfo(root);
  const fileUri = toFileUri(file);
  const client = new LspClient({
    server: args.server,
    serverArgs: args.serverArgs,
    cwd: root,
  });

  try {
    await client.request(
      'initialize',
      initializeParams(info, 'ts-lsp-rename-symbol', {
        textDocument: {
          rename: {
            dynamicRegistration: false,
            prepareSupport: true,
          },
        },
        workspace: {
          workspaceEdit: {
            documentChanges: true,
          },
          workspaceFolders: true,
          configuration: true,
        },
      })
    );
    client.notify('initialized', {});
    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: fileUri,
        languageId: guessLanguageId(file),
        version: 1,
        text,
      },
    });

    const output: Record<string, unknown> = {};
    if (!args.skipPrepare) {
      output.prepare = await client.request('textDocument/prepareRename', {
        textDocument: { uri: fileUri },
        position: toLspPosition(position),
      });
      if (output.prepare === null) {
        throw new Error('Symbol cannot be renamed at the selected position');
      }
    }

    const edit = await client.request('textDocument/rename', {
      textDocument: { uri: fileUri },
      position: toLspPosition(position),
      newName: args.newName,
    });
    output.edit = edit;

    if (args.apply) {
      output.applied = applyWorkspaceEdit(edit);
    }

    console.log(JSON.stringify(output, null, 2));
  } finally {
    await client.shutdown();
  }
}

run().catch(error => {
  console.error((error as Error).message);
  process.exit(1);
});
