# 00 — Fingerprint

**Date:** 2026-11-24
**Method:** pushed `recon.html` and `recon-paths.html` to the TV browser via
the already-paired launcher server (`/api/open`); the TV's own user-agent
string reported the identity.

## Identity

| Field | Value |
|---|---|
| Model | `65U70QEVS` (marketing `65U7QE`) |
| SoC | MediaTek **MT9655** (`VIDAA-MTK9655` in UA) |
| Firmware | `V0000.09.60I.Q0804` |
| VIDAA | `9.0` (line `U09.60`) |
| Kernel arch | `aarch64` (64-bit ARM, per UA `Linux aarch64`) |
| Browser engine | Chromium 111 (`Odin/111.5563.5.1`) |
| Region | EU (Spain, inferred from launcher locale and store apps) |

Full UA:
```
Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko)
Chrome/111.0.0.0 Odin/111.5563.5.1 Safari/537.36
Model/VIDAA-MTK9655 VIDAA/9.0(Hisense;SmartTV;65U70QEVS;MTK9655/V0000.09.60I.Q0804;UHD;65U7QE;)
```

## Relationship to 100U7Q

The 100U7Q chain (`docs/models/100U7Q/V0000.09.60I.Q0813/`) targets the same
SoC (MT9655) and the same VIDAA line (U09.60), but a **different build suffix**:
Q0813 vs Q0804. Same firmware family, different patch level.

**Key difference in kernel arch:** the 100U7Q record states **32-bit ARM**
userland (`EM_ARM`), while this TV reports `aarch64` in its browser UA.
This means any static binary (Dropbear) must be compiled for **aarch64**,
not ARMv7 — the 100U7Q's ARM32 build will not run here.

## IP and pairing

TV IP: `192.168.19.90` (DHCP, stable).
MQTT/TLS pairing on port 36669 was established in a prior session and is
active via the launcher server at `192.168.19.201:8765`.
