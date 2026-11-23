#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TV_IP="${1:-$(<"$SERVER_DIR/.host")}"
PORT="${2:-8765}"
PYTHON="$SERVER_DIR/venv/bin/python"

if [[ ! -x "$PYTHON" ]]; then
  printf 'Alvidaa Python environment not found: %s\n' "$PYTHON" >&2
  exit 1
fi
if [[ ! -f "$SERVER_DIR/keys/tokens.json" ]]; then
  printf 'TV pairing tokens not found in %s/keys\n' "$SERVER_DIR" >&2
  exit 1
fi
if ss -H -ltn "sport = :$PORT" | grep -q .; then
  printf 'Port %s is already listening. Check the existing Alvidaa server before starting another.\n' "$PORT" >&2
  exit 1
fi

if command -v konsole >/dev/null 2>&1; then
  exec konsole --separate --hold --workdir "$SERVER_DIR" -e "$PYTHON" "$SERVER_DIR/vidaa_server.py" "$TV_IP" "$PORT"
fi

printf 'Konsole is not installed; run this script from a visible terminal instead.\n' >&2
exec "$PYTHON" "$SERVER_DIR/vidaa_server.py" "$TV_IP" "$PORT"
