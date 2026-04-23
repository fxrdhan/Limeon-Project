import { localNetworkEnv } from "./network-exposure";

declare const Bun: any;

const devProcess = Bun.spawn(["vp", "dev"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    ...localNetworkEnv,
  },
});

process.exit(await devProcess.exited);
