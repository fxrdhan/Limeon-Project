#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

let packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspacePackageDir = resolve(
  packageDir,
  '..',
  '..',
  'dev-tools',
  'convert-to-oklch'
);

if (existsSync(resolve(workspacePackageDir, 'Cargo.toml'))) {
  packageDir = workspacePackageDir;
}

const manifestPath = resolve(packageDir, 'Cargo.toml');
const binaryName =
  process.platform === 'win32' ? 'oklch-migrate.exe' : 'oklch-migrate';
const releaseBinary = resolve(packageDir, 'target', 'release', binaryName);
const debugBinary = resolve(packageDir, 'target', 'debug', binaryName);
const args = process.argv.slice(2);

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }

  process.exit(result.status ?? 1);
}

if (existsSync(releaseBinary)) {
  run(releaseBinary, args);
}

if (existsSync(debugBinary)) {
  run(debugBinary, args);
}

run('cargo', [
  'run',
  '--quiet',
  '--release',
  '--manifest-path',
  manifestPath,
  '--',
  ...args,
]);
