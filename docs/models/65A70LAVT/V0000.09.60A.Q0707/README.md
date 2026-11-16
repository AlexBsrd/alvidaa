# 65A70LAVT / V0000.09.60A.Q0707 — root and post-root recon (MTK9603, AU)

**Status:** root achieved and boot-persistent on the owner's unit on 2026-11-13.
The TV was physically destroyed on 2026-11-14, so nothing here can be
re-verified. Every claim is *community reported* or *static analysis*, never
*verified*.

> **Applies to `65A70LAVT` (MTK9603/MT5896, VIDAA `U09.60`, region AU/EM_C)
> running `V0000.09.60A.Q0707`.** The same firmware string ships on the
> `43A5LE` and `55U67LEVS`; this guide records a third model. The root result
> differs from both: boot-persistent here, one-shot on `55U67LEVS`, not
> attempted on `43A5LE`.

> **Contributed by Cameron ([@sl3yr84](https://github.com/sl3yr84)).** Own
> device, 22 documents from a Claude-assisted session, closed when the TV was
> destroyed. Redacted for publication; the working payloads and the
> unredacted notes stay private.

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

1. **The browser bridge reaches the filesystem.** The phoenix backend runs as
   uid 314 from the writable `/APPS` partition, and `../` traversal reaches the
   real root. The write primitive is the FaaS fetcher (`fetchfile`), not the
   browser `fileWrite` — that path is gated on this generation.
2. **`rc.local` executes `/var/local/otaTest.sh` as root at every boot.**
3. **`/var/local` is `noexec`, but the hook is a symlink to
   `/APPS/boot_hook.sh`.** The kernel applies `noexec` to the target
   filesystem, and `/APPS` is not `noexec` — so the symlink is executable.
   This is the one detail this unit adds to the 50A51HUV record.

## What was measured

| Claim | Evidence | Source |
| --- | --- | --- |
| root SSH on :8008 as uid 0 | community reported | owner's session, 2026-11-13 |
| boot-persistent via the symlink trick | community reported | `/tmp/boot_hook.log`, 2026-11-13 |
| SELinux is **enforcing** on this build | community reported | `/sys/fs/selinux/enforce`, policyvers 33 |
| no SUID/SGID binaries anywhere | community reported | `find / -perm -4000/-2000` empty |
| `/APPS` and `/OAD` world-writable, `/APPS` not `noexec` | community reported | partition map |
| 8 MQTT listeners; `:1883` double-locked | community reported | `mosquitto.conf` + live probe |
| phoenix services answer without auth when appconfig has no permissions | community reported | service source + live calls |
| CDP endpoint on `:9226` accepts unauthenticated connections | community reported | live probe |
| `debugInstall` skips the signature check `installApp` performs | static analysis | `AppUpgrade.js` |
| the 09.60 `fileWrite` gate reproduces on a second unit | community reported | vidaa-edge #30, `V0000.09.60F.Q0528` |

## What this guide includes and leaves out

| Included | Left out |
| --- | --- |
| fingerprint and firmware constants | the boot hook script |
| the chain at the architecture level | the write primitive's exact call |
| the post-root surface map, at property level | request shapes, payloads, the CDP navigation technique |
| the teardown path | SSH keys, device identifiers |

The new technique classes found after root — the unauthenticated CDP endpoint,
the unsigned `debugInstall` path, the `from='Unknown'` bypass, the FaaS SSRF —
are named as properties only. They were unfixed at the time of writing and are
pending a report under the existing `VIDAA-PSIRT-2026-005` thread. Full
write-ups follow a fix or a "won't fix". See
[DISCLOSURE.md](../../../DISCLOSURE.md#new-technique-classes).

## Teardown

Remove the `/var/local/otaTest.sh` symlink, remove `/APPS/boot_hook.sh`, drop
the `:8008` ACCEPT rule from `FIREWALL_IN_EULAON`, kill the dropbear process,
and reboot. Verified boot stays green throughout; no read-only partition was
written.

## Further reading

- [Post-root surface map](findings/01-post-root-surface.md) — partitions,
  services, MQTT, phoenix, and the new classes at property level.
- [Identity-gate cross-confirmation](findings/02-identity-gate-cross-confirmation.md)
  — the same `fileWrite` wall on a second, unrelated unit.
