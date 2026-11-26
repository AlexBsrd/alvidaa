---
name: community-triage
description: Triage and close out alvidaa GitHub PRs, GitHub Issues, and Reddit threads in one consistent workflow. Use whenever the user asks to review/merge open PRs, reply to GitHub issues, catch up on Reddit comments via browse MCP, enforce the docs+JSON-only model-report policy, or run a community maintenance sweep.
---

# Community Triage (`community-triage`)

End-to-end maintainer workflow for **GitHub PRs**, **GitHub Issues**, and
**Reddit threads** on `carteakey/alvidaa`, enforcing the publication boundary
in `docs/DISCLOSURE.md`, `SECURITY.md`, and `scripts/check-payloads.sh`.

Always pass `-R carteakey/alvidaa` to `gh` commands (the local clone may not
have a default `gh` repo set).

---

## 1. Open GitHub PRs

### Inspect & classify

```sh
gh pr list -R carteakey/alvidaa --state open \
  --json number,title,author,isDraft,changedFiles,files \
  --jq '.[] | "PR #\(.number) [\(.author.login)] \(.title) (files=\(.changedFiles))\n" + (.files | map("  - " + .path) | join("\n")) + "\n"'
```

Fetch PR heads locally to inspect diffs cleanly:

```sh
git fetch origin pull/<N>/head:pr/<N>
```

Classify every PR into one of three buckets:

1. **Product PR** (`launcher/`, `server/`, `bridge/`, `tools/launcher-host/`):
   - Review code changes and run tests (`cd bridge && go test ./...`,
     `python3 -m unittest server.test_watcher_settings`, etc.).
   - Merge with `git merge --no-ff --no-commit refs/heads/pr/<N>`.
   - Resolve `docs/research/inventory.json` and `docs/research/exploits.json`
     conflicts programmatically (keep both `HEAD` and PR rows; never hand-edit
     generated tables).
   - Reset generated markdown files to `HEAD`, then regenerate:
     ```sh
     python3 scripts/gen-inventory.py && python3 scripts/gen-exploits.py
     ```
   - Ensure any new `docs/models/<Model>/<FW>/README.md` is indexed in
     `docs/models/README.md`.
   - Verify `./scripts/check.sh` passes **10/10**, then commit (`git merge`
     preserves the PR head as second parent so GitHub marks the PR **MERGED**).

2. **Model Report PR with payload/scratch dumps (common AI-session pattern)**:
   - Model report PRs must ship **docs + JSON only** (`docs/models/<Model>/<FW>/`,
     `docs/models/README.md`, `inventory.json`, `exploits.json`, regenerated
     tables).
   - Watch for AI-session scratchpads: new `tools/<model>/` exploit harnesses,
     `postinst*`, `rshell*`, `make_installer*`, `batches/`, `web/probes/*`,
     `web/*install*`, `web/*trigger*`, `source/re_sshd/`, or unrelated edits to
     `AGENTS.md` / `TODO.md`.
   - **Never merge payload blobs into `main` history.** Instead:
     1. Checkout only the clean doc paths:
        `git checkout refs/heads/pr/<N> -- docs/models/<Model>/<FW>/README.md docs/models/<Model>/<FW>/findings/`
        (omitting `source/re_sshd/` or arming HTML).
     2. Scan for real unit MAC addresses and redact them to placeholders:
        `grep -rnE "([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}" docs/models/<Model>/`
     3. Update the guide's **What this guide includes and leaves out** table if
        any stripped scripts were mentioned, and index the guide in
        `docs/models/README.md`.
     4. Merge the PR's `inventory.json` / `exploits.json` entries and run
        `python3 scripts/gen-inventory.py && python3 scripts/gen-exploits.py && ./scripts/check.sh`.
     5. Commit on `main` with `Closes #<N>` and full `Co-authored-by: <Name> <email>`
        from `git log -1 --format="%an <%ae>" refs/heads/pr/<N>`.
     6. After pushing `main`, post a friendly `gh pr comment -R carteakey/alvidaa <N>`
        citing the landed commit SHA and explaining cleanly what was omitted per
        `docs/DISCLOSURE.md` (GitHub auto-closes the PR from `Closes #<N>`).

3. **Hand-edited `TESTED-MODELS.md` PR**:
   - Fold the device into `docs/research/inventory.json` (merge into an existing
     firmware row if that firmware ID already exists — one firmware, one row).
   - Run **both** `python3 scripts/gen-inventory.py` and
     `python3 scripts/gen-exploits.py` (`EXPLOITS.md` renders model labels from
     `inventory.json`).
   - Run `./scripts/check.sh`, commit with `Closes #<N>` + `Co-authored-by:`,
     push, and comment on the PR.

Clean up temporary local `pr/*` branches after pushing (`git branch -D pr/<N>`).

---

## 2. Open GitHub Issues

### Pull & filter unanswered community issues

```sh
gh issue list -R carteakey/alvidaa --state open --limit 50 \
  --json number,title,author,createdAt,labels,comments,body
```

Filter to issues where `author.login != "carteakey"` **and** the latest comment
author is not `"carteakey"` (skip self-filed roadmap items and already-replied
threads).

### Reply guidelines (`gh issue comment -R carteakey/alvidaa <N> -b "..."`)

- Ground every technical answer in verified repo measurements (never guess):
  - **Read-only Windows fingerprinting:** `python -m http.server 8765` inside
    `launcher/` → open `http://<pc-ip>:8765/fingerprint-full.html` (explicitly
    write-free) + read-only PowerShell SSDP `M-SEARCH` to `239.255.255.250:1900`.
  - **No-root HDMI OSD overlays:** No known unprivileged VIDAA OSD API; browser
    suspends on HDMI switch; MQTT `36669` has no OSD toast action; even rooted
    `hisenseUI` (Cobalt Starboard) has no `<canvas>` or `<iframe>`.
  - **Killing the ~50 s stock Home boot flash (rooted):** Watcher ceiling on
    Lanes 1–2; clean fix is **Lane 3 (Native Home)** (`docs/launcher/LANES.md`,
    `tools/launcher-host/IMPLEMENTATIONS.md`, `tools/launcher-host/models.json`).
    On Lane 2, starting `alvidaa-bridge` early before LAN wait cuts cold boot
    to ~15 s.
  - **Android flashing / audio / GFN limits:** Verified boot stays locked/green
    (no Android flashing); ALSA capture returns `EIO` (audio never enters
    userspace ALSA); browser is older Chromium (~111), no native GFN/VRR.
- **Proactive PR-policy heads-up:** Whenever an issue author offers to submit a
  PR with an IPK builder, boot hook, or uploader script, thank them and mention
  up front that Model Report PRs are **docs + JSON only** (`scripts/check-payloads.sh`
  enforces this in CI), so those details belong in prose inside `docs/models/`.

---

## 3. Reddit Triage via `browse` MCP

Canonical r/Hisense threads (plus any URLs the user supplies):
- Update thread: `https://www.reddit.com/r/Hisense/comments/1xozwqi/`
- Original root thread: `https://www.reddit.com/r/Hisense/comments/1xj3pc2/`

### Step 1 — Check connection & fetch full comment trees

1. Call `browse:status`. If `pairingState` is `paired-offline`, retry once
   after a couple of seconds for the extension to reconnect.
2. Open one background tab on `https://www.reddit.com/r/Hisense/comments/1xozwqi/`
   (note: Reddit redirects to the full slug URL; wait for `domcontentloaded`
   before running `page.evaluate`).
3. Inside `page.evaluate`, fetch the logged-in user and full JSON comment trees
   using the browser's authenticated session cookies:
   - `fetch('/api/me.json', { credentials: 'include' })` → gives `data.name` and
     `data.modhash` (`uh`).
   - `fetch('/r/Hisense/comments/<id>.json?limit=500&depth=10&sort=new', { credentials: 'include' })`
     → walk every `t1` node recursively and collect comments from non-OP users
     with no reply from `carteakey`.
   - If the user linked a specific `?context=3` comment URL, fetch its JSON
     explicitly as well so it cannot be missed in a `more` stub.

### Step 2 — Draft replies first (always get user approval before posting)

- Skip pure one-liner cheers/noise ("Good job", "Awesome", "DM inbound") unless
  the user asks otherwise.
- Present numbered, paste-ready drafts grouped by thread, including each
  commenter's handle and question summary.
- Keep the background browser tab open while waiting for approval.

### Step 3 — Post paced replies & close the tab

Once approved, post in batches inside `page.evaluate` on the open Reddit tab:

```js
const body = new URLSearchParams({
  api_type: "json",
  thing_id: "t1_<comment_id>",
  text: replyText,
  uh,
});
const r = await fetch("/api/comment", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Modhash": uh,
  },
  body: body.toString(),
});
```

- Pace requests with a **2.5 s** delay between comments.
- Inspect `j?.json?.errors` after every call; **stop immediately** on any error
  (e.g. `RATELIMIT`) and report exact posted vs. remaining items.
- **Always close the background tab (`await page.close()`)** after the final
  batch finishes, and report every posted `t1_<newId>`.

---

## 4. Disclosure & Tone Guardrails

- Direct, technical, calm, zero snark.
- When answering disclosure criticism ("why report to Hisense?" or "why tone
  down the blog post?"), stay strictly accurate to `SECURITY.md` and
  `docs/DISCLOSURE.md`:
  1. The launcher, MQTT tooling, telemetry blocklists, and model findings are
     public and open source (30+ models in the matrix).
  2. Per `VIDAA-PSIRT-2026-005`, Hisense confirmed the root bridge path had
     **already been reported earlier** and was already patched on most newer
     builds.
  3. An unauthenticated `localhost:9009` file-write API with
     `Access-Control-Allow-Origin: *` chained to a root boot hook is a real
     browser-reachable vulnerability for non-technical owners; reporting gets
     everyday owners patched while publishing in parallel (and declining
     Hisense's request to go private) lets enthusiasts block OTAs deliberately.
