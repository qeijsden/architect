#!/usr/bin/env zsh
set -e
PROJECT="$( cd -- "$(dirname "$0")/.." && pwd )"
cd "$PROJECT"

# Install gh CLI if missing
if ! command -v gh &>/dev/null; then
  if command -v brew &>/dev/null; then
    echo "Installing GitHub CLI..."
    brew install gh
  else
    echo ""
    echo "GitHub CLI ('gh') is required for the cross-platform workflow."
    echo "Homebrew is not installed, so this script cannot install it automatically."
    echo ""
    echo "Install one of these first, then rerun the script:"
    echo "  1. Homebrew: https://brew.sh"
    echo "     then: brew install gh"
    echo "  2. GitHub CLI directly: https://cli.github.com/"
    echo ""
    exit 1
  fi
fi

# Require gh auth
if ! gh auth status &>/dev/null; then
  echo "Login to GitHub CLI first:"
  gh auth login
fi

# Require git remote
if ! git remote get-url origin &>/dev/null; then
  echo ""
  echo "No git remote found. Add one first:"
  echo "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  echo "  git push -u origin main"
  echo ""
  exit 1
fi

# ── Build macOS locally ────────────────────────────────────
echo ""
echo "[1/4] Building macOS app..."
source "$HOME/.cargo/env"
npm run steam:sdk:import
npm run build
npm exec tauri build -- --bundles app,dmg
echo "macOS build done."

# ── Push to trigger Windows CI ────────────────────────────
echo ""
echo "[2/4] Pushing to GitHub to trigger Windows build..."
git add -A
git diff --cached --quiet || git commit -m "chore: build all platforms"
git push

# ── Wait for Windows CI job ───────────────────────────────
echo ""
echo "[3/4] Waiting for Windows CI build to finish..."
RUN_ID=$(gh run list --workflow=build-releases.yml --limit=1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status

# ── Download Windows artifact ─────────────────────────────
echo ""
echo "[4/4] Downloading Windows Steam payload..."
mkdir -p src-tauri/target/release/steam-windows
gh run download "$RUN_ID" --name windows-steam --dir src-tauri/target/release/steam-windows

echo ""
echo "Done. Both platforms are ready."
echo ""
echo "Now run the publish command:"
echo ""
echo "  macOS:   /Users/skullkin9og/Downloads/sdk/tools/ContentBuilder/builder_osx/steamcmd.sh +login skullkin9 YOUR_PASSWORD +run_app_build \"\$PWD/steam/app_build_macos_only.vdf\" +quit"
echo ""
echo "  Windows: /Users/skullkin9og/Downloads/sdk/tools/ContentBuilder/builder_osx/steamcmd.sh +login skullkin9 YOUR_PASSWORD +run_app_build \"\$PWD/steam/app_build_windows_only.vdf\" +quit"
echo ""
echo "  Both:    /Users/skullkin9og/Downloads/sdk/tools/ContentBuilder/builder_osx/steamcmd.sh +login skullkin9 YOUR_PASSWORD +run_app_build \"\$PWD/steam/app_build.vdf\" +quit"
