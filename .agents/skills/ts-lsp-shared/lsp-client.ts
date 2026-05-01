/// <reference types="node" />

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Readable, Writable } from 'node:stream';
import type { ChildProcessByStdio } from 'node:child_process';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Position {
  line: number;
  character: number;
}

export interface BaseArgs {
  root: string;
  file?: string;
  line?: number;
  character?: number;
  find?: string;
  occurrence: number;
  server: string;
  serverArgs: string[];
  help: boolean;
  selfTest: boolean;
}

export interface WorkspaceInfo {
  rootPath: string;
  rootUri: string;
  workspaceName: string;
}

interface LspClientOptions {
  server: string;
  serverArgs: string[];
  cwd: string;
}

export function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a number`);
  }
  return parsed;
}

export function readFlagValue(
  args: string[],
  index: number,
  flag: string
): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function createDefaultBaseArgs(): BaseArgs {
  return {
    root: process.cwd(),
    occurrence: 1,
    server: 'typescript-language-server',
    serverArgs: ['--stdio'],
    help: false,
    selfTest: false,
  };
}

export function canonicalizeRoot(root: string): string {
  try {
    return realpathSync(root);
  } catch (error) {
    throw new Error(`Failed to resolve --root ${root}: ${String(error)}`);
  }
}

export function resolveFile(root: string, file: string): string {
  const candidate = isAbsolute(file) ? file : resolve(root, file);
  try {
    return realpathSync(candidate);
  } catch (error) {
    throw new Error(`Failed to resolve --file ${candidate}: ${String(error)}`);
  }
}

export function readTextFile(path: string): string {
  return readFileSync(path, 'utf8');
}

export function toFileUri(path: string): string {
  return pathToFileURL(path).href;
}

export function filePathFromUri(uri: string): string | undefined {
  if (!uri.startsWith('file://')) {
    return undefined;
  }
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

export function guessLanguageId(filePath: string): string {
  if (filePath.endsWith('.tsx')) return 'typescriptreact';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.jsx')) return 'javascriptreact';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  return 'plaintext';
}

export function workspaceInfo(rootPath: string): WorkspaceInfo {
  const rootUri = toFileUri(rootPath);
  const segments = rootPath.split(/[\\/]/).filter(Boolean);
  return {
    rootPath,
    rootUri,
    workspaceName: segments.at(-1) ?? 'workspace',
  };
}

export function toLspPosition(position: Position): JsonValue {
  return {
    line: position.line - 1,
    character: position.character - 1,
  };
}

function lineAt(text: string, line: number): string | undefined {
  const raw = text.split('\n')[line - 1];
  return raw?.endsWith('\r') ? raw.slice(0, -1) : raw;
}

export function validatePosition(
  text: string,
  line: number,
  character: number
): Position {
  if (line === 0) {
    throw new Error('--line must be >= 1');
  }
  if (character === 0) {
    throw new Error('--character must be >= 1');
  }

  const currentLine = lineAt(text, line);
  if (currentLine === undefined) {
    throw new Error(`--line ${line} is outside the file`);
  }

  const maxCharacter = currentLine.length + 1;
  if (character > maxCharacter) {
    throw new Error(
      `--character ${character} is outside line ${line}; max is ${maxCharacter}`
    );
  }

  return { line, character };
}

function offsetInsideMatch(value: string): number {
  const chars = Array.from(value);
  if (chars.length <= 1) {
    return 0;
  }

  return chars.slice(0, Math.floor(chars.length / 2)).join('').length;
}

function positionForIndex(text: string, index: number): Position {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    character: (lines.at(-1) ?? '').length + 1,
  };
}

export function resolvePosition(
  text: string,
  line: number | undefined,
  character: number | undefined,
  find: string | undefined,
  occurrence: number
): Position | undefined {
  if (line !== undefined && character !== undefined) {
    return validatePosition(text, line, character);
  }
  if (line !== undefined) {
    throw new Error('--line requires --character');
  }
  if (character !== undefined) {
    throw new Error('--character requires --line');
  }

  if (find === undefined) {
    return undefined;
  }
  if (find.length === 0) {
    throw new Error('--find must be a non-empty string');
  }
  if (occurrence === 0) {
    throw new Error('--occurrence must be >= 1');
  }

  let matchIndex = -1;
  let searchStart = 0;
  for (let found = 0; found < occurrence; found += 1) {
    matchIndex = text.indexOf(find, searchStart);
    if (matchIndex === -1) {
      throw new Error(
        `--find text not found (occurrence=${occurrence}): ${find}`
      );
    }
    searchStart = matchIndex + find.length;
  }

  const targetIndex = matchIndex + offsetInsideMatch(find);
  const position = positionForIndex(text, targetIndex);
  return validatePosition(text, position.line, position.character);
}

function isIdentifierChar(value: string): boolean {
  return /^[A-Za-z0-9_$]$/.test(value);
}

export function identifierCandidate(
  value: string | undefined
): string | undefined {
  if (value === undefined || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
    return undefined;
  }
  return value;
}

function indexForPosition(
  text: string,
  position: Position
): number | undefined {
  const lines = text.split('\n');
  if (position.line > lines.length) {
    return undefined;
  }

  let index = 0;
  for (let line = 1; line < position.line; line += 1) {
    index += lines[line - 1].length + 1;
  }

  return index + position.character - 1;
}

export function identifierAtPosition(
  text: string,
  position: Position
): string | undefined {
  const index = indexForPosition(text, position);
  if (index === undefined) {
    return undefined;
  }

  let cursor = index;
  if (!isIdentifierChar(text[cursor] ?? '')) {
    if (cursor === 0 || !isIdentifierChar(text[cursor - 1] ?? '')) {
      return undefined;
    }
    cursor -= 1;
  }

  let start = cursor;
  while (start > 0 && isIdentifierChar(text[start - 1] ?? '')) {
    start -= 1;
  }

  let end = cursor + 1;
  while (end < text.length && isIdentifierChar(text[end] ?? '')) {
    end += 1;
  }

  return identifierCandidate(text.slice(start, end));
}

function hasIdentifierBoundary(
  line: string,
  start: number,
  symbol: string
): boolean {
  const end = start + symbol.length;
  const beforeOk = start === 0 || !isIdentifierChar(line[start - 1] ?? '');
  const afterOk = end >= line.length || !isIdentifierChar(line[end] ?? '');
  return beforeOk && afterOk;
}

function looksLikeDeclaration(line: string, symbolStart: number): boolean {
  const before = line.slice(0, symbolStart);
  const trimmed = before.trimStart();
  if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
    return false;
  }

  const declarationWords = new Set([
    'class',
    'function',
    'interface',
    'type',
    'enum',
    'const',
    'let',
    'var',
    'static',
    'async',
    'export',
    'default',
    'private',
    'protected',
    'public',
    'readonly',
  ]);

  return before
    .split(/[^A-Za-z0-9_$]+/)
    .some(word => declarationWords.has(word));
}

export function rangeForSymbolDeclaration(
  text: string,
  symbol: string
): JsonValue | undefined {
  let fallback: JsonValue | undefined;
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    let searchStart = 0;

    while (searchStart <= line.length) {
      const symbolStart = line.indexOf(symbol, searchStart);
      if (symbolStart === -1) {
        break;
      }
      searchStart = symbolStart + symbol.length;

      if (!hasIdentifierBoundary(line, symbolStart, symbol)) {
        continue;
      }

      const range: JsonValue = {
        start: { line: lineIndex, character: symbolStart },
        end: { line: lineIndex, character: symbolStart + symbol.length },
      };

      if (looksLikeDeclaration(line, symbolStart)) {
        return range;
      }

      fallback ??= range;
    }
  }

  return fallback;
}

function isLocationLink(value: Record<string, JsonValue>): boolean {
  return (
    value.targetUri !== undefined &&
    (value.targetSelectionRange !== undefined ||
      value.targetRange !== undefined)
  );
}

export function normalizeLocationItem(value: JsonValue): JsonValue | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  if (isLocationLink(value)) {
    return {
      uri: value.targetUri,
      range: value.targetSelectionRange ?? value.targetRange ?? null,
    };
  }

  if (value.uri !== undefined && value.range !== undefined) {
    return value;
  }

  return undefined;
}

export function normalizeLocations(result: JsonValue): JsonValue[] {
  if (result === null) {
    return [];
  }

  if (Array.isArray(result)) {
    return result.flatMap(item => {
      const normalized = normalizeLocationItem(item);
      return normalized === undefined ? [] : [normalized];
    });
  }

  const normalized = normalizeLocationItem(result);
  return normalized === undefined ? [] : [normalized];
}

function isZeroStartRange(location: JsonValue): boolean {
  if (
    location === null ||
    typeof location !== 'object' ||
    Array.isArray(location)
  ) {
    return false;
  }

  const range = location.range;
  if (range === null || typeof range !== 'object' || Array.isArray(range)) {
    return false;
  }

  const start = range.start;
  const end = range.end;
  if (
    start === null ||
    end === null ||
    typeof start !== 'object' ||
    typeof end !== 'object' ||
    Array.isArray(start) ||
    Array.isArray(end)
  ) {
    return false;
  }

  return (
    start.line === 0 &&
    start.character === 0 &&
    end.line === 0 &&
    end.character === 0
  );
}

export function refineCoarseLocations(
  locations: JsonValue[],
  symbol: string | undefined
): JsonValue[] {
  const candidate = identifierCandidate(symbol);
  if (candidate === undefined) {
    return locations;
  }

  return locations.map(location => {
    if (
      !isZeroStartRange(location) ||
      location === null ||
      typeof location !== 'object' ||
      Array.isArray(location) ||
      typeof location.uri !== 'string'
    ) {
      return location;
    }

    const path = filePathFromUri(location.uri);
    if (path === undefined || !existsSync(path)) {
      return location;
    }

    const range = rangeForSymbolDeclaration(readTextFile(path), candidate);
    if (range === undefined) {
      return location;
    }

    return { ...location, range };
  });
}

function findHeaderEnd(
  buffer: Buffer
): { index: number; delimiterLength: number } | undefined {
  const crlf = buffer.indexOf('\r\n\r\n');
  if (crlf !== -1) {
    return { index: crlf, delimiterLength: 4 };
  }

  const lf = buffer.indexOf('\n\n');
  if (lf !== -1) {
    return { index: lf, delimiterLength: 2 };
  }

  return undefined;
}

class LspReader {
  private buffer = Buffer.alloc(0);
  private readonly iterator: AsyncIterator<Buffer>;

  constructor(stream: NodeJS.ReadableStream) {
    this.iterator = stream[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
  }

  async readMessage(): Promise<JsonValue> {
    while (true) {
      const headerEnd = findHeaderEnd(this.buffer);
      if (headerEnd !== undefined) {
        const header = this.buffer.slice(0, headerEnd.index).toString('utf8');
        const contentLengthMatch = /^Content-Length:\s*(\d+)$/im.exec(header);
        if (contentLengthMatch === null) {
          throw new Error('Missing Content-Length');
        }

        const contentLength = Number(contentLengthMatch[1]);
        const bodyStart = headerEnd.index + headerEnd.delimiterLength;
        const bodyEnd = bodyStart + contentLength;
        if (this.buffer.length >= bodyEnd) {
          const body = this.buffer.slice(bodyStart, bodyEnd).toString('utf8');
          this.buffer = this.buffer.slice(bodyEnd);
          return JSON.parse(body) as JsonValue;
        }
      }

      const next = await this.iterator.next();
      if (next.done) {
        throw new Error('LSP stdout closed');
      }

      const chunk = Buffer.isBuffer(next.value)
        ? next.value
        : Buffer.from(next.value as unknown as Uint8Array);
      this.buffer = Buffer.concat([this.buffer, chunk]);
    }
  }
}

export class LspClient {
  private readonly child: ChildProcessByStdio<Writable, Readable, null>;
  private readonly reader: LspReader;
  private nextId = 1;

  constructor(options: LspClientOptions) {
    this.child = spawn(options.server, options.serverArgs, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    this.reader = new LspReader(this.child.stdout);
  }

  private send(payload: JsonValue): void {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const header = Buffer.from(
      `Content-Length: ${body.length}\r\n\r\n`,
      'utf8'
    );
    this.child.stdin.write(header);
    this.child.stdin.write(body);
  }

  async request(method: string, params: JsonValue): Promise<JsonValue> {
    const id = this.nextId;
    this.nextId += 1;
    this.send({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    while (true) {
      const message = await this.reader.readMessage();
      if (
        message !== null &&
        typeof message === 'object' &&
        !Array.isArray(message) &&
        message.id === id
      ) {
        if (message.error !== undefined) {
          throw new Error(JSON.stringify(message.error));
        }
        return message.result ?? null;
      }

      await this.respondToServerRequest(message);
    }
  }

  notify(method: string, params: JsonValue): void {
    this.send({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  private async respondToServerRequest(message: JsonValue): Promise<void> {
    if (
      message === null ||
      typeof message !== 'object' ||
      Array.isArray(message) ||
      message.id === undefined ||
      typeof message.method !== 'string'
    ) {
      return;
    }

    let result: JsonValue = null;
    if (message.method === 'workspace/configuration') {
      const items =
        message.params !== null &&
        typeof message.params === 'object' &&
        !Array.isArray(message.params) &&
        Array.isArray(message.params.items)
          ? message.params.items
          : [];
      result = items.map(() => null);
    }

    this.send({
      jsonrpc: '2.0',
      id: message.id,
      result,
    });
  }

  async shutdown(): Promise<void> {
    try {
      await this.request('shutdown', null);
      this.notify('exit', null);
    } catch {
      this.child.kill();
    }
  }
}

export function initializeParams(
  workspace: WorkspaceInfo,
  clientName: string,
  capabilities: JsonValue
): JsonValue {
  return {
    processId: process.pid,
    rootUri: workspace.rootUri,
    rootPath: workspace.rootPath,
    workspaceFolders: [
      {
        uri: workspace.rootUri,
        name: workspace.workspaceName,
      },
    ],
    capabilities,
    clientInfo: {
      name: clientName,
      version: '2.0.0',
    },
  };
}

function assertDeepEqual(
  actual: unknown,
  expected: unknown,
  label: string
): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, got ${actualJson}`);
  }
}

export function runSharedSelfTests(): void {
  assertDeepEqual(
    resolvePosition('abc FooBar def', undefined, undefined, 'FooBar', 1),
    { line: 1, character: 8 },
    'find positions inside match'
  );
  assertDeepEqual(
    resolvePosition('x 😀 Foo', undefined, undefined, 'Foo', 1),
    { line: 1, character: 7 },
    'positions use UTF-16 units'
  );

  let partialPositionError = '';
  try {
    resolvePosition('const x = 1;', 1, undefined, undefined, 1);
  } catch (error) {
    partialPositionError = String((error as Error).message);
  }
  assertDeepEqual(
    partialPositionError,
    '--line requires --character',
    'partial position error'
  );

  assertDeepEqual(
    normalizeLocations([
      {
        targetUri: 'file:///tmp/example.ts',
        targetRange: {
          start: { line: 1, character: 0 },
          end: { line: 10, character: 0 },
        },
        targetSelectionRange: {
          start: { line: 3, character: 7 },
          end: { line: 3, character: 14 },
        },
      },
    ]),
    [
      {
        uri: 'file:///tmp/example.ts',
        range: {
          start: { line: 3, character: 7 },
          end: { line: 3, character: 14 },
        },
      },
    ],
    'location links prefer selection range'
  );

  assertDeepEqual(
    rangeForSymbolDeclaration(
      "import { Foo } from './foo';\n\nexport class Foo {\n}",
      'Foo'
    ),
    {
      start: { line: 2, character: 13 },
      end: { line: 2, character: 16 },
    },
    'coarse source ranges refine to declarations'
  );
}
