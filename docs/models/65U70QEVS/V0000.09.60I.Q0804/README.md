# Hisense 65U70QEVS — V0000.09.60I.Q0804

| Property | Value |
|---|---|
| Model | 65U70QEVS (EU, marketed as 65U7QE) |
| SoC | MediaTek MT9655 (Cortex-A73, ARMv8/aarch64) |
| Firmware | V0000.09.60I.Q0804 |
| VIDAA | 9.0 |
| Kernel | 5.15.192 (Clang 17, Android toolchain) |
| Browser | Chromium 111.0 (Odin) |
| Root method | 100U7Q chain (unchanged) |
| Root status | **persistent** (2026-11-24) |

## Root chain

The 100U7Q chain (by @oOHiyoriOo) transplants directly to this model
and firmware build with one change: the Dropbear binary must be **aarch64
static** instead of ARM32.

### Prerequisites

- Launcher server paired via MQTT (port 36669)
- HTTP server reachable from the TV (the launcher serves files)

### Steps

1. **Start the fetcher** FaaS via WebSocket to `wss://localhost:9888`
2. **Place sw2.js** into the FaaS function tree via `fetchFile`
3. **Download installer.ipk** to `/APPS/installer.ipk` via `fetchFile`
4. **Trigger superwatch** (command 83 uninstall + 82 install) via
   `POST https://localhost:9888/function/basic/fetch/sw2`
5. **Postinst runs as root** (uid 0, full capabilities):
   - Deploys Dropbear aarch64 to `/APPS/.re_sshd/`
   - Generates ed25519 host key
   - Opens `/dev/ptmx` for pty support
   - Starts Dropbear on port 8008 (key-only auth)
   - Opens firewall (iptables ACCEPT on port 8008)
   - Installs ALV_BLOCK telemetry/ad blocking chain

### Connect

```
ssh -p 8008 root@<TV-IP>
```

### Key architectural difference from 100U7Q

The 100U7Q is documented as 32-bit ARM userland, but this TV runs
**native aarch64**. It has armhf compatibility (`ld-linux-armhf.so.3`)
so ARM32 userspace programs like bash work, but Dropbear must be a 64-bit
static binary. We built it with zig cc targeting `aarch64-linux-musl`.

## Findings

| # | Title | File |
|---|---|---|
| 00 | TV fingerprint | [00-fingerprint.md](findings/00-fingerprint.md) |
| 01 | API surface recon | [01-recon-surface.md](findings/01-recon-surface.md) |
| 02 | Fetcher arbitrary write | [02-fetcher-write.md](findings/02-fetcher-write.md) |
| 03 | Superwatch socket | [03-superwatch-socket.md](findings/03-superwatch-socket.md) |
| 04 | Architecture detection | [04-arch-detection.md](findings/04-arch-detection.md) |
| 05 | Root SSH achieved | [05-root-ssh.md](findings/05-root-ssh.md) |
| 06 | Boot persistence | [06-boot-persistence.md](findings/06-boot-persistence.md) |

## Boot persistence

Root SSH survives reboots via the `re_sshd` service, which re-arms
Dropbear through the superwatch socket ~30 seconds after boot. No manual
intervention required.
