#!/usr/bin/env bash
# Fail if any path listed in scripts/payloads.deny is tracked in the tree, OR
# if any NEW file matches the exploit-payload / AI-scratchpad patterns below
# without being in the frozen scripts/payloads-legacy.allow list.
# See docs/DISCLOSURE.md for the publication boundary.
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
    echo "   FAIL payload (denylist): $f"
    fail=1
  done < <(git ls-files -- "$glob")
done < scripts/payloads.deny

python3 - <<'PY' || fail=1
import fnmatch, pathlib, subprocess, sys

PATS = (
    "*postinst*",
    "*rshell*",
    "*make_installer*",
    "*make_min_installer*",
    "*hookinstall*",
    "*hookswap*",
    "*hookrearm*",
    "*otaTest-hook*",
    "tools/batches/*",
    "tools/*/batches/*",
    "tools/*/faas/*",
    "tools/*/web/*install*",
    "tools/*/web/*trigger*",
    "tools/*/web/*rearm*",
    "tools/*/web/probes/*",
    "docs/models/*/*/source/re_sshd/*",
    "tools/*/re_sshd/*",
)

allow_file = pathlib.Path("scripts/payloads-legacy.allow")
allow = set()
if allow_file.exists():
    for raw in allow_file.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            allow.add(line)

files = subprocess.check_output(["git", "ls-files"]).decode().splitlines()
bad = []
for f in files:
    if f.endswith(".md") or f in allow:
        continue
    if any(fnmatch.fnmatch(f, p) for p in PATS):
        bad.append(f)

if bad:
    for f in bad:
        print(f"   FAIL new payload/scratch file: {f}")
    print("   -> Model report PRs should ship docs + JSON only (see docs/DISCLOSURE.md).")
    sys.exit(1)
PY

if [ "$fail" -eq 0 ]; then
  echo "   no payloads on the denylist or new payload/scratch files"
fi
exit "$fail"
