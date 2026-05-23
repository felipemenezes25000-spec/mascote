#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SOURCE="$REPO_ROOT/app/mobile/assets/mascot-3d"
TARGET="$SCRIPT_DIR/../Assets/Mascote/StreamingAssets/mascot-3d"

mkdir -p "$(dirname "$TARGET")"

if [[ -L "$TARGET" || -e "$TARGET" ]]; then
  echo "Destino já existe: $TARGET"
  exit 0
fi

ln -s "$SOURCE" "$TARGET"
echo "OK: $TARGET -> $SOURCE"
