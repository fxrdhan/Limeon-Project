import { resolveRemoteNetworkEnv } from './network-exposure';

declare const Bun: any;

const remoteNetworkEnv = await resolveRemoteNetworkEnv('production');

const previewProcess = Bun.spawn(['bunx', 'vp', 'preview'], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    ...remoteNetworkEnv,
  },
});

process.exit(await previewProcess.exited);
