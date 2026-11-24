# 04 — Architecture detection: aarch64 native

**Date:** 2026-11-24
**Method:** installed a minimal IPK (`alvidaa.archdetect`) via the full
chain (fetcher → sw2 → superwatch cmd 82), read the output via `fileRead`.

## Procedure

1. Built a no-op IPK whose `postinst` (runs as root, uid 0) writes system
   info to `/APPS/.alvidaa-arch-test`.
2. Chain: start fetcher → place `sw2.js` → `fetchFile` the IPK to
   `/APPS/arch-detect.ipk` → trigger sw2 with commands `83` (uninstall,
   idempotent) then `82` (install).
3. Read back the output file via `fileRead` from the TV browser.
4. Cleanup: uninstall command `83` (confirmed `80:0` = success).

## Result: root execution confirmed

```
Uid:    0    0    0    0
Gid:    0    0    0    0
CapEff: 000001ffffffffff
```

The IPK `postinst` runs as **uid 0 (root)** with the full capability set.
This is the same privilege level as the 100U7Q chain.

## Result: aarch64 userland

### /proc/cpuinfo

| Field | Value |
|---|---|
| CPU implementer | 0x41 (ARM) |
| CPU architecture | **8** (ARMv8 / AArch64) |
| CPU part | 0xd09 (Cortex-A73) |
| CPU variant | 0x1 |
| Features | fp asimd evtstrm aes pmull sha1 sha2 crc32 cpuid |

### Dynamic linkers

| Path | Size | Type |
|---|---|---|
| `/lib/ld-linux-aarch64.so.1` | 202864 | native aarch64 loader |
| `/lib/ld-2.31.so` | 111104 | armhf compat loader |
| `/lib/ld-linux-armhf.so.3` → `ld-2.31.so` | — | symlink |

### /lib64/ (aarch64 system libraries)

- `libc.so.6` — 1651112 bytes (glibc 2.31 aarch64)
- `libgcc_s.so.1` — 133472 bytes
- `libm.so.6` — 591944 bytes
- `libstdc++.so` → `libstdc++.so.6`
- `libatomic.so.1.2.0` — 67632 bytes

### Conclusions

1. **This TV has an aarch64 (64-bit) userland**, unlike the 100U7Q which
   is documented as 32-bit ARM (`EM_ARM`). The UA string `Linux aarch64`
   is accurate.
2. **ARM32 binaries can still run** via the armhf compat loader
   (`ld-linux-armhf.so.3`), but the native path is aarch64.
3. **Dropbear must be built as a static aarch64 binary.** The 100U7Q's
   ARM32 build script (`build_dropbear_a7k.sh`) needs an aarch64 variant.
4. **PATH is minimal** in the opkg postinst environment — `uname` and
   `file` are not found. The postinst should use absolute paths or embed
   the binary path.

## Chain status (complete)

| Step | 100U7Q chain | 65U70QEVS Q0804 | Status |
|---|---|---|---|
| 0. MQTT pair | ✅ | ✅ (launcher server) | ✅ |
| 1. Phoenix WS | ✅ | ✅ | ✅ |
| 2. fetchFile write | ✅ | ✅ | ✅ |
| 3. sw2 → superwatch | ✅ | ✅ | ✅ |
| 4. IPK install as root | ✅ | **✅ (uid 0, full caps)** | ✅ |

All five steps of the 100U7Q chain are confirmed on the 65U70QEVS Q0804.

## Next step

Build a **static aarch64 Dropbear** (patched with `fill_passwd` fallback
and `/APPS/shell` path override), then build the full installer IPK.
