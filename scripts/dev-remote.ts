import { resolveRemoteNetworkEnv } from "./network-exposure";

declare const Bun: any;

const remoteNetworkEnv = await resolveRemoteNetworkEnv("development");

const devProcess = Bun.spawn(["vp", "dev"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    ...remoteNetworkEnv,
  },
});

process.exit(await devProcess.exited);
