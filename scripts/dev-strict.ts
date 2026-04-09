/// <reference types="node" />

import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localNetworkEnv, resolveRemoteNetworkEnv } from './network-exposure';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bunExecutable = process.execPath;
const shutdownSignals = ['SIGINT', 'SIGTERM'] as const;
const forceKillDelayMs = 5_000;
const shouldExposeRemote = process.argv.includes('--remote');
const devServerEnv = shouldExposeRemote
  ? {
      ...process.env,
      ...(await resolveRemoteNetworkEnv('development')),
    }
  : {
      ...process.env,
      ...localNetworkEnv,
    };

type ShutdownSignal = (typeof shutdownSignals)[number];

interface ManagedProcess {
  label: string;
  child: ChildProcess;
}

const spawnManagedProcess = (
  label: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env
): ManagedProcess => ({
  label,
  child: spawn(bunExecutable, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  }),
});

const managedProcesses = [
  spawnManagedProcess('dev server', ['x', 'vp', 'dev'], devServerEnv),
  spawnManagedProcess('typecheck watch', [
    'x',
    '--bun',
    'tsc',
    '-b',
    '--noEmit',
    '--watch',
    '--preserveWatchOutput',
  ]),
];

let shuttingDown = false;

const waitForExit = (child: ChildProcess) =>
  new Promise<void>(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.once('error', () => resolve());
  });

const stopProcess = async (
  managedProcess: ManagedProcess,
  signal: ShutdownSignal
) => {
  const { child } = managedProcess;
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill(signal);

  const forceKillTimer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
  }, forceKillDelayMs);

  await waitForExit(child);
  clearTimeout(forceKillTimer);
};

const shutdown = async (
  exitCode: number,
  signal: ShutdownSignal = 'SIGTERM'
) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await Promise.all(
    managedProcesses.map(process => stopProcess(process, signal))
  );
  process.exit(exitCode);
};

for (const signal of shutdownSignals) {
  process.once(signal, () => {
    void shutdown(0, signal);
  });
}

const exitPromises = managedProcesses.map(
  managedProcess =>
    new Promise<number>(resolve => {
      managedProcess.child.once('error', (error: Error) => {
        console.error(
          `[dev:strict] Failed to start ${managedProcess.label}:`,
          error
        );
        resolve(1);
      });

      managedProcess.child.once('exit', (code: number | null) => {
        resolve(code ?? 1);
      });
    })
);

const exitCode = await Promise.race(exitPromises);
await shutdown(exitCode);
