#!/usr/bin/env bash
# Fail if any path listed in scripts/payloads.deny is tracked in the tree.
# The denylist is the publication policy in executable form: if a file is on
# it, the build stops. Comments and blank lines are ignored.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

fail=0
while IFS= read -r line || [ -n "$line" ]; do
  glob="${line%%#*}"
  # trim surrounding whitespace
  glob="$(printf '%s' "$glob" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$glob" ] && continue
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    echo "   FAIL payload: $f"
    fail=1
  done < <(git ls-files -- "$glob")
done < scripts/payloads.deny

if [ "$fail" -eq 0 ]; then
  echo "   no payloads on the denylist"
fi
exit "$fail"
