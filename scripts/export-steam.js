#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status || 1);
};

if (process.platform === "darwin") {
  run("npm", ["run", "steam:export:mac"]);
} else if (process.platform === "win32") {
  run("npm", ["run", "steam:export:win"]);
} else {
  console.error("steam:export supports macOS and Windows only.");
  process.exit(1);
}
