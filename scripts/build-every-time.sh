#!/usr/bin/env bash
set -euo pipefail

npm ci
npm run clean
npm run build
