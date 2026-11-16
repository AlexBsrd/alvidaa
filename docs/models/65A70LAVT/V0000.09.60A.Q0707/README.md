# 65A70LAVT / V0000.09.60A.Q0707 — root and post-root recon (MTK9603, AU)

Root, boot-persistent SSH, and a full post-root recon on an Australian
65A70LAVT. The TV was destroyed the day after the session, so none of this can
be re-checked. Treat it as a good field report, not a verified guide.

Contributed by u/sl3yr84 on Reddit. Own device, 22 documents from a
Claude-assisted session, closed when the TV died. Redacted for publication;
the working payloads and the unredacted notes stay private.

## Device fingerprint

| Field | Value |
| --- | --- |
| Model | 65A70LAVT (serial type 65A7NA) |
| SoC | MTK9603 / MT5896 |
| Panel | 3840×2160, ULED (ScreenType 0, MachineType 3) |
| Region | AU (EM_C, countryID AUS) |
| VIDAA OS | U09.60 |
| Firmware | `V0000.09.60A.Q0707` |
| Kernel | Linux 5.15.189 (built 2026-07-06) |
| Browser | Chromium 111.5563.5.1 "Odin" (armv7l) |
| SDK | 1.5.0 |
| HDR | Dolby Vision, HDR10 |

## What the chain rests on

Same family as the [50A51HUV chain](../../50A51HUV/09.01O.P0813/README.md),
with one addition:

1. **The browser bridge reaches the filesystem.** phoenix runs as uid 314 from
   the writable `/APPS` partition, and `../` traversal reaches the real root.
   The write primitive here is the FaaS fetcher (`fetchfile`), not the browser
   `fileWrite` — that path is gated on this generation.
2. **`rc.local` runs `/var/local/otaTest.sh` as root at every boot.**
3. **`/var/local` is `noexec`, but the hook is a symlink to
   `/APPS/boot_hook.sh`.** The kernel applies `noexec` to the target
   filesystem, and `/APPS` is not `noexec` — so the symlink runs. That's the
   one thing this unit adds to the 50A51HUV record.

## What was measured

| Claim | How it was seen |
| --- | --- |
| root SSH on :8008 as uid 0 | owner's session, 2026-11-13 |
| boot-persistent via the symlink trick | `/tmp/boot_hook.log`, 2026-11-13 |
| SELinux **enforcing** on this build | `/sys/fs/selinux/enforce`, policyvers 33 |
| no SUID/SGID binaries anywhere | `find / -perm -4000/-2000` empty |
| `/APPS` and `/OAD` world-writable, `/APPS` not `noexec` | partition map |
| 8 MQTT listeners; `:1883` double-locked | `mosquitto.conf` + live probe |
| phoenix services answer without auth when appconfig has no permissions | service source + live calls |
| CDP on `:9226` accepts unauthenticated connections | live probe |
| `debugInstall` skips the signature check `installApp` does | `AppUpgrade.js` |
| the 09.60 `fileWrite` gate reproduces on a second unit | vidaa-edge #30, `V0000.09.60F.Q0528` |

## What this guide includes and leaves out

| Included | Left out |
| --- | --- |
| fingerprint and firmware constants | the boot hook script |
| the chain at the architecture level | the exact write call |
| the post-root surface map | request shapes and payloads |
| the teardown path | SSH keys and device identifiers |

The new classes found after root — CDP on `:9226`, `debugInstall`, the
`from='Unknown'` bypass, the FaaS SSRF — are named but not described. They were
live when the TV died, and VIDAA hasn't had a look yet. The rest of the recon
is here in full.

## Teardown

Remove the `/var/local/otaTest.sh` symlink, remove `/APPS/boot_hook.sh`, drop
the `:8008` ACCEPT rule from `FIREWALL_IN_EULAON`, kill dropbear, reboot.
Verified boot stays green; no read-only partition was written.

## Further reading

- [Post-root surface map](findings/01-post-root-surface.md) — partitions,
  services, MQTT, phoenix, and the new classes.
- [Identity-gate cross-confirmation](findings/02-identity-gate-cross-confirmation.md)
  — the same `fileWrite` wall on a second, unrelated unit.
