import { loadEnv } from 'vite-plus';

declare const Bun: any;

const decode = async (stream: ReadableStream<Uint8Array> | null) => {
  if (!stream) return '';
  return await new Response(stream).text();
};

const localEnv = loadEnv('development', process.cwd(), '');
const configuredAllowedHosts = (
  process.env.PHARMASYS_ALLOWED_HOSTS ??
  localEnv.PHARMASYS_ALLOWED_HOSTS ??
  ''
).trim();
const configuredExposeNetwork =
  process.env.PHARMASYS_EXPOSE_NETWORK ??
  localEnv.PHARMASYS_EXPOSE_NETWORK ??
  '';

let resolvedAllowedHosts = configuredAllowedHosts;

if (!resolvedAllowedHosts) {
  const tailscaleStatus = Bun.spawn(['tailscale', 'status', '--json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [statusExitCode, statusStdout, statusStderr] = await Promise.all([
    tailscaleStatus.exited,
    decode(tailscaleStatus.stdout),
    decode(tailscaleStatus.stderr),
  ]);

  if (statusExitCode !== 0) {
    console.error(statusStderr.trim() || 'Failed to read Tailscale status');
    process.exit(statusExitCode);
  }

  try {
    const status = JSON.parse(statusStdout) as {
      Self?: { DNSName?: string | null };
    };
    resolvedAllowedHosts = status.Self?.DNSName?.replace(/\.$/, '') ?? '';
  } catch (error) {
    console.error('Failed to parse Tailscale status JSON', error);
    process.exit(1);
  }
}

if (!resolvedAllowedHosts) {
  console.error('Tailscale DNS host is unavailable');
  process.exit(1);
}

const devProcess = Bun.spawn(['bunx', 'vp', 'dev'], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    PHARMASYS_EXPOSE_NETWORK: configuredExposeNetwork || 'true',
    PHARMASYS_ALLOWED_HOSTS: resolvedAllowedHosts,
  },
});

process.exit(await devProcess.exited);
