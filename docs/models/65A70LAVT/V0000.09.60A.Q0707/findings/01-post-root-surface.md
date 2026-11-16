# Post-root surface map — 65A70LAVT / V0000.09.60A.Q0707

Read-only recon from a root shell on 2026-11-13. This is a map of what the
build exposes, not a set of instructions. The working detail for the unfixed
classes is withheld under the publication policy; the properties are here so
the next model can be compared against them.

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

## New classes (property only)

These are the findings that are new to this repository and were unfixed when
the unit died. They are named, not described. Pending a report under the
existing `VIDAA-PSIRT-2026-005` thread; full write-ups follow a fix or a
"won't fix".

- **CDP on `:9226`** — the Zenix remote-debugging endpoint accepts
  unauthenticated WebSocket connections from the LAN and exposes the full
  browser context, including the `vowOS` bridge. The navigation technique and
  the request shapes are withheld.
- **`debugInstall`** — the pkgmgr service installs an IPK from the OTA download
  directory without the signature check that the normal `installApp` path
  performs. The call shape and package requirements are withheld.
- **`from='Unknown'`** — the phoenix HTTP layer accepts a caller-supplied
  origin that skips its check. Withheld.
- **FaaS SSRF** — the fetcher can be pointed at arbitrary URLs from the TV's
  network position. Withheld.
- **`setSeleniumDebug`** — a no-auth write that enables the debug surface.
  Withheld.
- **`spotify_loader`** — loads an arbitrary URL in a privileged context.
  Withheld.
- **`tilesService` key seed** — the Prime Video UUS decrypt key is a hardcoded
  seed in `define.js`. The key material is withheld; the property is recorded
  so the next unit can check whether it is still hardcoded.

## What was not finished

The session ended when the TV was destroyed. Open gaps: the MQTT plugin's auth
logic, the knode protocol, the `security.node` `IDENTIFIER_KEY`, the FaaS
`cmd.sid` traversal (untested), and the full 124-API list on the `file://`
error page.
