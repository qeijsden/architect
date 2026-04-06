#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const releaseDir = path.join(projectRoot, 'src-tauri', 'target', 'release');
const stageDir = path.join(releaseDir, 'steam-windows');
const executableName = 'architect.exe';

const requiredFiles = [
  {
    src: path.join(releaseDir, executableName),
    dst: path.join(stageDir, executableName),
  },
  {
    src: path.join(projectRoot, 'src-tauri', 'steamworks', 'win64', 'steam_api64.dll'),
    dst: path.join(stageDir, 'steam_api64.dll'),
  },
];

for (const { src } of requiredFiles) {
  if (!existsSync(src)) {
    console.error(`Missing required Windows runtime file: ${src}`);
    process.exit(1);
  }
}

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

for (const { src, dst } of requiredFiles) {
  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}

for (const entry of readdirSync(releaseDir, { withFileTypes: true })) {
  if (!entry.isFile()) {
    continue;
  }

  const name = entry.name;
  const lowerName = name.toLowerCase();

  if (name === executableName || name === 'steam_appid.txt') {
    continue;
  }

  if (lowerName.endsWith('.dll')) {
    copyFileSync(path.join(releaseDir, name), path.join(stageDir, name));
  }
}

const resourcesDir = path.join(releaseDir, 'resources');
if (existsSync(resourcesDir)) {
  cpSync(resourcesDir, path.join(stageDir, 'resources'), { recursive: true });
}

console.log(`Staged Windows Steam payload at ${stageDir}`);