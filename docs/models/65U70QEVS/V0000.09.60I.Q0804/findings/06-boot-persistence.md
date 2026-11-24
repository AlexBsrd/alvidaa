# 06 — Boot persistence via re_sshd service

**Date:** 2026-11-24
**Method:** custom JS service registered in the TV's serviceManager with
`autoStart: true`. Re-arms Dropbear by reinstalling the IPK through
the superwatch socket on every boot.

## Mechanism

The TV's `serviceManager.js` reads `serviceList.json` on boot and starts
each service with `autoStart: true` in order, awaiting the `'started'`
event before moving to the next.

We add a `re_sshd` service that:

1. Extends `BaseService` (from `@sdk/baseService.js`)
2. Calls `await super.start()` to emit `'started'` and unblock the chain
3. Fires `arm()` asynchronously in the background
4. `arm()` retries up to 36 times (3 minutes), each attempt sending two
   superwatch payloads: `90` (uninstall) then `91` (install)
5. The install re-runs the `postinst` as root (uid 0), which starts
   Dropbear, opens the firewall and applies ALV_BLOCK
6. `arm()` checks `/proc/net/tcp` for port 8008 (hex `1F48`) in LISTEN
   state after each attempt

## Deployed files

| Path | Purpose |
|---|---|
| `services/re_sshd/index.js` | Service implementation |
| `services/re_sshd/package.json` | Service metadata |
| `services/serviceList.json` | Added `re_sshd` entry |
| `services/serviceList.json.bak` | Pristine backup |

All paths relative to `/APPS/pkgs/tv.vidaa.jsservice.basic/CHA/`.

## serviceList.json entry

```json
{
    "id": "re_sshd",
    "autoStart": true,
    "isKeepAlive": false
}
```

## Build-specific adaptation (Q0804 vs Q0813)

The 75U8QTUK (Q0813) reference uses `constructor(entry)`. On this TV
(Q0804), the serviceManager passes `sid_path` and the existing services
use `constructor(dest)` with `super(dest)`. The service works with either
parameter name since it simply forwards to `super()`.

## Test result

Reboot on 2026-11-24:

```
22:14:07 re_sshd start pid=2624 uid=314
22:14:31 attempt 1 uninstall=[   90:0] install=[   91:0]
22:14:36 ARMED: dropbear up
```

- Service started by serviceManager as uid 314
- First arm attempt succeeded (both payloads returned `:0`)
- Dropbear confirmed listening 5 seconds later
- SSH accessible from LAN within ~30 seconds of boot
- Firewall rule (ACCEPT tcp :8008) restored
- ALV_BLOCK telemetry blocking restored

## Prerequisites

The following must survive reboots (stored on `/APPS/`, which is on the
config partition `/dev/mmcblk0p24`):

- `/APPS/installer.ipk` — the IPK with Dropbear binaries and postinst
- `/APPS/.re_sshd/` — marker dir, Dropbear binaries, host key, SSH pubkey
- The service files in the services directory

## Reversibility

To remove boot persistence:

1. Restore backup: `cp serviceList.json.bak serviceList.json`
2. Remove service: `rm -rf services/re_sshd/`
3. Reboot — Dropbear will not start automatically

To fully clean up (also removes SSH):

4. Remove installer: `rm /APPS/installer.ipk`
5. Remove re_sshd data: `rm -rf /APPS/.re_sshd /APPS/shell`
6. Reboot
