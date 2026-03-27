#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const defaultSdkPath = "/Users/skullkin9og/Downloads/sdk";
const sdkPath = process.env.STEAMWORKS_SDK_PATH || defaultSdkPath;

const mappings = [
  {
    src: path.join(sdkPath, "redistributable_bin", "win64", "steam_api64.dll"),
    dst: path.join(projectRoot, "src-tauri", "steamworks", "win64", "steam_api64.dll"),
  },
  {
    src: path.join(sdkPath, "redistributable_bin", "win64", "steam_api64.lib"),
    dst: path.join(projectRoot, "src-tauri", "steamworks", "win64", "steam_api64.lib"),
  },
  {
    src: path.join(sdkPath, "redistributable_bin", "osx", "libsteam_api.dylib"),
    dst: path.join(projectRoot, "src-tauri", "steamworks", "osx", "libsteam_api.dylib"),
  },
];

for (const { src, dst } of mappings) {
  if (!existsSync(src)) {
    if (existsSync(dst)) {
      console.log(`SDK source missing, using vendored file: ${dst}`);
      continue;
    }

    console.error(`Missing Steam SDK file: ${src}`);
    process.exit(1);
  }

  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log(`Imported ${path.basename(src)} -> ${dst}`);
}

console.log("Steam SDK runtime files imported successfully.");
