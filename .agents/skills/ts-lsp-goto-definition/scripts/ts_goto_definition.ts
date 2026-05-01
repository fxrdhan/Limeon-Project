#!/usr/bin/env bun
/// <reference types="node" />

import {
  canonicalizeRoot,
  createDefaultBaseArgs,
  guessLanguageId,
  identifierAtPosition,
  identifierCandidate,
  initializeParams,
  LspClient,
  normalizeLocations,
  parsePositiveInteger,
  readFlagValue,
  readTextFile,
  refineCoarseLocations,
  resolveFile,
  resolvePosition,
  runSharedSelfTests,
  toFileUri,
  toLspPosition,
  workspaceInfo,
  type BaseArgs,
  type JsonValue,
  type Position,
} from '../../ts-lsp-shared/lsp-client.ts';

interface Args extends BaseArgs {
  mode: 'prefer-source' | 'source' | 'definition';
}

function printHelp(): void {
  console.log(`ts_goto_definition

TypeScript/JavaScript go-to-definition via typescript-language-server (stdio).

Usage:
  ts_goto_definition --file <path> --line <1-based> --character <1-based> [--root <path>]
  ts_goto_definition --file <path> --find <text> [--occurrence <n>] [--root <path>]

Options:
  --mode <prefer-source|source|definition>   Default: prefer-source
  --source                                   Alias for --mode source
  --definition                               Alias for --mode definition
  --find <text>                              When --line/--character are omitted, auto-picks the Nth match in the file
  --occurrence <n>                           1-based; default: 1
  --server <cmd>                             Default: typescript-language-server
  --server-arg <arg>                         Repeatable; defaults include --stdio
  --self-test                                Run local parser/normalizer tests

Output:
  JSON array of locations. Ranges are 0-based LSP ranges.`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    ...createDefaultBaseArgs(),
    mode: 'prefer-source',
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
      case '--mode': {
        const mode = readFlagValue(argv, index, token);
        if (!['prefer-source', 'source', 'definition'].includes(mode)) {
          throw new Error(`Invalid --mode: ${mode}`);
        }
        args.mode = mode as Args['mode'];
        index += 1;
        break;
      }
      case '--source':
        args.mode = 'source';
        break;
      case '--definition':
        args.mode = 'definition';
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

async function standardDefinition(
  client: LspClient,
  fileUri: string,
  position: Position
): Promise<JsonValue[]> {
  const result = await client.request('textDocument/definition', {
    textDocument: { uri: fileUri },
    position: toLspPosition(position),
  });
  return normalizeLocations(result);
}

async function sourceDefinition(
  client: LspClient,
  fileUri: string,
  position: Position
): Promise<JsonValue[]> {
  const result = await client.request('workspace/executeCommand', {
    command: '_typescript.goToSourceDefinition',
    arguments: [fileUri, toLspPosition(position)],
  });
  return normalizeLocations(result);
}

async function requestLocations(
  client: LspClient,
  mode: Args['mode'],
  fileUri: string,
  position: Position
): Promise<JsonValue[]> {
  if (mode === 'definition') {
    return standardDefinition(client, fileUri, position);
  }
  if (mode === 'source') {
    return sourceDefinition(client, fileUri, position);
  }

  try {
    const locations = await sourceDefinition(client, fileUri, position);
    if (locations.length > 0) {
      return locations;
    }
  } catch {
    // Older TypeScript versions may not expose source definition.
  }

  return standardDefinition(client, fileUri, position);
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfTest) {
    runSharedSelfTests();
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

  const symbol =
    identifierCandidate(args.find) ?? identifierAtPosition(text, position);
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
      initializeParams(info, 'ts-lsp-goto-definition', {
        textDocument: {
          definition: {
            dynamicRegistration: false,
            linkSupport: true,
          },
        },
        workspace: {
          workspaceFolders: true,
          configuration: true,
          executeCommand: {
            dynamicRegistration: false,
          },
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

    const locations = refineCoarseLocations(
      await requestLocations(client, args.mode, fileUri, position),
      symbol
    );
    console.log(JSON.stringify(locations, null, 2));
  } finally {
    await client.shutdown();
  }
}

run().catch(error => {
  console.error((error as Error).message);
  process.exit(1);
});
