#!/usr/bin/env bun
/// <reference types="node" />

import {
  canonicalizeRoot,
  createDefaultBaseArgs,
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
  item: number;
  mode: 'incoming' | 'outgoing' | 'both' | 'prepare';
}

function printHelp(): void {
  console.log(`ts_call_hierarchy

TypeScript/JavaScript Call Hierarchy via typescript-language-server (stdio).

Usage:
  ts_call_hierarchy --file <path> --line <1-based> --character <1-based> [--root <path>]
  ts_call_hierarchy --file <path> --find <text> [--occurrence <n>] [--root <path>]

Options:
  --mode <incoming|outgoing|both|prepare>   Default: both
  --item <n>                                1-based prepared item to inspect; default: 1
  --find <text>                             When --line/--character are omitted, auto-picks the Nth match in the file
  --occurrence <n>                          1-based; default: 1
  --server <cmd>                            Default: typescript-language-server
  --server-arg <arg>                        Repeatable; defaults include --stdio
  --self-test                               Run local parser/normalizer tests

Output:
  JSON with prepare, target, targetIndex, incoming, and/or outgoing.`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    ...createDefaultBaseArgs(),
    item: 1,
    mode: 'both',
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
      case '--item':
        args.item = parsePositiveInteger(
          readFlagValue(argv, index, token),
          token
        );
        index += 1;
        break;
      case '--mode': {
        const mode = readFlagValue(argv, index, token);
        if (!['incoming', 'outgoing', 'both', 'prepare'].includes(mode)) {
          throw new Error(`Invalid --mode: ${mode}`);
        }
        args.mode = mode as Args['mode'];
        index += 1;
        break;
      }
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
  if (args.item === 0) {
    throw new Error('--item must be >= 1');
  }

  return args;
}

function normalizeCallHierarchy(result: JsonValue): JsonValue[] {
  if (result === null) {
    return [];
  }
  return Array.isArray(result) ? result : [result];
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfTest) {
    runSharedSelfTests();
    if (normalizeCallHierarchy(null).length !== 0) {
      throw new Error('call hierarchy null normalization failed');
    }
    console.log('self-test passed');
    return;
  }
  if (args.file === undefined) {
    printHelp();
    throw new Error('Missing --file');
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
      initializeParams(info, 'ts-lsp-call-hierarchy', {
        textDocument: {
          callHierarchy: {
            dynamicRegistration: false,
          },
        },
        workspace: {
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

    const prepare = normalizeCallHierarchy(
      await client.request('textDocument/prepareCallHierarchy', {
        textDocument: { uri: fileUri },
        position: toLspPosition(position),
      })
    );

    const output: Record<string, JsonValue> = { prepare };
    if (prepare.length === 0) {
      if (args.mode === 'incoming' || args.mode === 'both') {
        output.incoming = [];
      }
      if (args.mode === 'outgoing' || args.mode === 'both') {
        output.outgoing = [];
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (args.item > prepare.length) {
      throw new Error(
        `--item ${args.item} is outside prepare result length ${prepare.length}`
      );
    }

    const target = prepare[args.item - 1];
    output.target = target;
    output.targetIndex = args.item;

    if (args.mode === 'prepare') {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (args.mode === 'incoming' || args.mode === 'both') {
      output.incoming = normalizeCallHierarchy(
        await client.request('callHierarchy/incomingCalls', { item: target })
      );
    }

    if (args.mode === 'outgoing' || args.mode === 'both') {
      output.outgoing = normalizeCallHierarchy(
        await client.request('callHierarchy/outgoingCalls', { item: target })
      );
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
