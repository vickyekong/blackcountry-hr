#!/bin/bash
# Next 14 hangs on Node 24 (default Homebrew node). Prefer the engines field (20.x).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE20="/usr/local/opt/node@20/bin/node"
if [[ -x "$NODE20" ]]; then
  export PATH="/usr/local/opt/node@20/bin:$PATH"
  exec "$NODE20" "$ROOT/node_modules/next/dist/bin/next" dev --hostname 127.0.0.1 --port 3000 "$@"
fi

echo "Node 20 is required (see package.json engines). Install with: brew install node@20" >&2
exit 1
