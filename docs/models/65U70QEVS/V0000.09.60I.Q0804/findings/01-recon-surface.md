# 01 — Recon: API surface and filesystem

**Date:** 2026-11-24
**Method:** pushed `recon-paths.html` and `recon-phoenix.html` to the TV
browser via `/api/open`; all operations read-only.

## HiUtils_createRequest fileRead (jail test)

`HiUtils_createRequest("fileRead", ...)` resolves paths relative to `/APPS`
and **rejects `..` traversal** with an explicit string check (`"invalid path"`).
Paths starting with `/` are also resolved under `/APPS` (e.g. `/proc/uptime`
becomes `/APPS//proc/uptime`).

| Path tried | Result |
|---|---|
| `proc/uptime` | ENOENT `/APPS/proc/uptime` |
| `/proc/uptime` | ENOENT `/APPS//proc/uptime` |
| `./proc/uptime` | ENOENT `/APPS/./proc/uptime` |
| `../proc/uptime` | `"invalid path"` (blocked) |
| `../../proc/uptime` | `"invalid path"` (blocked) |

**Conclusion:** this API cannot read or write anything outside `/APPS` on
build Q0804. The HE40-style root hook (`recon.html` v8's "INSTALL ROOT HOOK"
button, which writes `../var/local/otaTest.sh`) would fail here.

## vowOS.service.syncExecute — present and working

| API | Present |
|---|---|
| `vowOS` | ✅ |
| `vowOS.service` | ✅ |
| `vowOS.service.syncExecute` | ✅ |
| `vowOS.service.execute` | ✅ |
| `HiUtils_createRequest` | ✅ |
| `WebSDK_createFileRequest` | ❌ |

`vowOS.service.syncExecute("hiutils", {api:"fileRead", ...})` works identically
to `HiUtils_createRequest` for `/APPS`-jailed reads. This is the same API the
100U7Q chain's `install.html` uses.

## fileRead inside /APPS (via vowOS)

| Path (relative to /APPS) | Result |
|---|---|
| `pkgs/tv.vidaa.jsservice.basic/CHA/package.json` | ENOENT |
| `pkgs/tv.vidaa.jsservice.basic/CHA/functions/` | **EISDIR** (exists) |
| `pkgs/tv.vidaa.jsservice.basic/CHA/functions/fetch/` | **EISDIR** (exists) |
| `pkgs/tv.vidaa.jsservice.basic/CHA/functions/fetch/fetchfile.js` | **✅ read** (full source, ~4KB) |
| `pkgs/tv.vidaa.jsservice.basic/CHA/control` | ENOENT |
| `pkgs/tv.vidaa.jsservice.system/CHA/package.json` | ENOENT |
| `pkgs/tv.vidaa.jsservice.system/current/package.json` | ENOENT |
| `pkgs/tv.vidaa.jsservice.system/current/functions/` | ENOENT |
| `pkgs/tv.vidaa.jsservice.system/current/functions/fetch/` | ENOENT |
| `pkgs/tv.vidaa.jsservice.system/current/faas.json` | ENOENT |
| `websdk/Appinfo.json` | **✅ read** (app registry, 6 entries) |
| `.re_sshd/` | ENOENT (no prior root install) |

The fetcher function tree lives in the **BASIC** jsservice package, not
SYSTEM. The `fetchfile.js` source confirms the same `fetchFile(args)` API
documented for the 100U7Q chain: takes `url`, `directory`, `permission`,
downloads via axios, writes via `fs.createWriteStream(directory)`.

## Phoenix service

| Endpoint | Result |
|---|---|
| `wss://localhost:9888` | **✅ CONNECTED** |
| `ws://localhost:9009` | ❌ onerror |
| `http://localhost:9009/` | 200, `"service register failed"` |
| `http://localhost:9009/service/basic/fetcher` | 200, `"Not supported api"` |
| `https://localhost:9888/` | 200, `"service register failed"` |
| `https://localhost:9888/service/basic/fetcher` | 200, `"Not supported api"` |

The phoenix WebSocket endpoint is alive on port 9888 (TLS). The HTTP routes
respond but report "Not supported api" for bare GETs (expected: the fetcher
only exposes `fetchFile` as an API).

`vowOS.service.syncExecute("basic/fetcher", {api:"getInfo"})` → "Not supported
api" (confirms the service exists but only `fetchFile` is valid).
