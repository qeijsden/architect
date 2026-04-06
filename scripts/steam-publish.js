#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredEnv = [
  'STEAM_USERNAME',
  'STEAM_PASSWORD',
];

const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const hasMac = existsSync('src-tauri/target/release/bundle/macos/Architect.app');
const hasWin = existsSync('src-tauri/target/release/bundle/nsis');

if (!hasMac && !hasWin) {
  console.error('No export artifacts found. Run steam:export:mac and steam:export:win first.');
  process.exit(1);
}

const steamcmd = process.env.STEAMCMD_PATH || 'steamcmd';
const cmd = [
  '+login',
  process.env.STEAM_USERNAME,
  process.env.STEAM_PASSWORD,
  '+run_app_build_http',
  'steam/app_build.vdf',
  '+quit',
];

console.log('Running Steam publish via SteamCMD...');
const result = spawnSync(steamcmd, cmd, { stdio: 'inherit', shell: true, env: process.env });
if (result.status !== 0) {
  process.exit(result.status || 1);
}
console.log('Steam publish completed.');
