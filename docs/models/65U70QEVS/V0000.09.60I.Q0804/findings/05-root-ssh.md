# 05 — Root SSH achieved

**Date:** 2026-11-24
**Method:** full 100U7Q chain via `install-root.html`.

## Chain execution

The complete chain ran successfully in ~30 seconds:

| Step | Status | Detail |
|---|---|---|
| 1. Start fetcher | ✅ | WS to `wss://localhost:9888` |
| 2. Place sw2.js | ✅ | fetchFile to FaaS tree |
| 3. Download installer.ipk | ✅ | 384 KB to `/APPS/installer.ipk` |
| 4. Superwatch install | ✅ | cmds 83+82, both returned `:0` (success) |
| 5. Postinst as root | ✅ | uid 0, CapEff 000001ffffffffff |

## Dropbear status

- **Binary**: aarch64 static-pie, Dropbear 2022.83, key-only auth
- **Port**: 8008 (firewall rule added to `FIREWALL_IN_EULAON`)
- **PID**: 20686
- **Listening**: confirmed via `/proc/net/tcp` (`:1F48` in LISTEN state)

## SSH connection

```
$ ssh -p 8008 root@192.168.19.90
root@SmartTV-c40826a3c333
```

Connected as root. No password — ed25519 key-only authentication.

## System information

| Property | Value |
|---|---|
| Kernel | 5.15.192-g3d895bad6314-dirty |
| Arch | aarch64 (confirmed `busybox uname -m`) |
| Compiler | Android Clang 17.0.2 (r487747c) |
| Root FS | 168.7M (read-only, 100% used) |
| RAM | ~600M total (tmpfs 300M shm + 100M crash) |
| eMMC | /dev/mmcblk0 (multiple partitions) |
| Config | /dev/mmcblk0p24, 45.2M, 77% used |
| Available tools | busybox, bash 3.2.57 (armhf compat) |

## Key differences from 100U7Q

| Property | 100U7Q | 65U70QEVS |
|---|---|---|
| Firmware build | Q0813 | Q0804 |
| Userland arch | ARM32 | **aarch64** |
| Dropbear binary | arm32 static | aarch64 static-pie |
| Bash | bash (armhf) | bash 3.2.57 (armhf, compat layer) |
| `uname` in postinst | available | not in PATH (use busybox) |

## Firewall

The TV runs iptables with these chains:
- `INPUT` → `SYN_FLOOD`, `ICMP_FLOOD`, `CC_FLOOD`, `FIREWALL_IN_EULAON`
- `FIREWALL_IN_EULAON`: our `ACCEPT tcp dpt:8008` at position 1
- `ALV_BLOCK`: 15 telemetry/ad blocking rules (injected by postinst)
- `CC_FLOOD`: rate-limits on debug ports (4635-7000 range)

## Telemetry blocking (ALV_BLOCK)

The installer's postinst creates the `ALV_BLOCK` chain in OUTPUT with
REJECT rules for known telemetry and ad endpoints, plus DoH bypass
blocking on 8.8.8.8/8.8.4.4:443. 15 rules active.

## Reversibility

To tear down:
1. Kill dropbear: `kill $(cat /APPS/.re_sshd/dropbear.pid)`
2. Remove firewall rules: `iptables -D FIREWALL_IN_EULAON 1`
3. Flush ALV_BLOCK: `iptables -F ALV_BLOCK; iptables -D OUTPUT -j ALV_BLOCK`
4. Uninstall package: sw2 command 83 with `re.installer`
5. Remove files: `rm -rf /APPS/.re_sshd /APPS/shell`

A TV reboot also clears all iptables rules and kills dropbear. The
install is **not persistent across reboots** — the postinst must be
re-triggered to restore SSH access.
