# Post-root surface map — 65A70LAVT / V0000.09.60A.Q0707

Read-only recon from a root shell on 2026-11-13. This is a map of what the
build exposes, not a set of instructions. The new classes are named without
the how for now; the rest is in full.

## Partitions and permissions

- `/APPS` — ext4, rw, **no `noexec`**, world-writable. Holds the app packages,
  the phoenix backend, and the boot hook.
- `/OAD` — ext4, rw, world-writable, 1.5 GB. OTA staging.
- `/var/local` — ext4, rw, **`noexec`**, world-writable. Holds the
  `otaTest.sh` symlink; `noexec` is bypassed because the kernel checks the
  target filesystem and `/APPS` is not `noexec`.
- `/tmp` — tmpfs, volatile.
- Rootfs — dm-verity squashfs, read-only.

**SELinux is enforcing** (`enforce=1`, `policyvers=33`, `deny_unknown=1`),
despite the config saying permissive. This is the first enforcing 09.60 unit in
the matrix, and it matters: a DAC-only mental model will predict access that
SELinux then denies.

**No SUID or SGID binaries anywhere.** The classic local-escalation path is
closed on this build.

## Listening services

| Port | Service | Bind | Note |
| --- | --- | --- | --- |
| 8008 | dropbear (root) | 0.0.0.0 | the backdoor |
| 9009 / 9888 | phoenix | 0.0.0.0 | HTTP / HTTPS + WSS |
| 1883 | mosquitto (DAB) | 0.0.0.0 | double-locked, see below |
| 10001 | mosquitto (RemoteNow WS) | 0.0.0.0 | |
| 11669 / 16669 / 36669 | mosquitto (mTLS) | 0.0.0.0 | client cert required |
| 11600 / 11601 / 16668 | mosquitto (inner) | 127.0.0.1 | |
| 9226 | Zenix CDP | 0.0.0.0 | see new classes |
| 12321 / 12322 | knode (kmqr2) | 127.0.0.1 | pkgmgr/system IPC |
| 20529 | Odin browser JSON-RPC | 0.0.0.0 | filtered from LAN |
| 7688 | voiceservice | 0.0.0.0 | |
| 7000 | AirPlay | 0.0.0.0 | |
| 3366 / 3367 | DIAL | 0.0.0.0 | |
| 4445 | SystemUI | 0.0.0.0 | |
| 18400 | dlna_service | LAN IP | |

## The MQTT broker

Eight listeners, `per_listener_settings true`. `:1883` is the interesting one:
the config says `allow_anonymous true`, but it is double-locked. iptables
filters it from the LAN, and `libmosq_extra_security.so` rejects every
credential tested — twelve combinations, all `CONNACK rc=5`. The mTLS
listeners require client certificates that were not extracted. The plugin's
auth logic was not reversed before the hardware was destroyed.

This is a useful negative: "anonymous allowed" in the config does not mean
anonymous works.

## The phoenix services

`hiutils`, `tvinfo`, `ipchandler`, and `FaaS` answer without authentication
when the calling app's appconfig has no `permissions` field — which is the case
for the TV Browser app. `serviceManager.js` passes immediately when the auth
map is empty. The `from='Unknown'` path skips the HTTP-layer check but not the
per-service ACL, so permission-gated keys still return 503.

## New classes

These are the ones that are new here. They were live when the TV died and
VIDAA hasn't seen them yet, so they're named without the how. Once they've had
a look — or a reasonable window passes with no answer — the detail goes in.

- **CDP on `:9226`** — the Zenix debug endpoint takes unauthenticated WebSocket
  connections from the LAN and exposes the whole browser context, including the
  `vowOS` bridge.
- **`debugInstall`** — pkgmgr installs an IPK from the OTA download directory
  without the signature check the normal `installApp` path does.
- **`from='Unknown'`** — the phoenix HTTP layer accepts a caller-supplied
  origin that skips its check.
- **FaaS SSRF** — the fetcher can be pointed at arbitrary URLs from the TV's
  network position.
- **`setSeleniumDebug`** — a no-auth write that turns on the debug surface.
- **`spotify_loader`** — loads an arbitrary URL in a privileged context.
- **`tilesService` key seed** — the Prime Video UUS decrypt key is a hardcoded
  seed in `define.js`. The key itself isn't here.

## What was not finished

The session ended when the TV was destroyed. Open gaps: the MQTT plugin's auth
logic, the knode protocol, the `security.node` `IDENTIFIER_KEY`, the FaaS
`cmd.sid` traversal (untested), and the full 124-API list on the `file://`
error page.
