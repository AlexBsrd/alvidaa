# 03 — Superwatch socket confirmed

**Date:** 2026-11-24
**Method:** pushed `recon-sw.html` to TV browser.

## Procedure

1. Fetcher started via WS to `wss://localhost:9888` (confirmed in finding 02).
2. Used `fetchFile` to place `sw2.js` (the superwatch helper from
   `tools/u7q/faas/`) into the FaaS function tree at
   `/APPS/pkgs/tv.vidaa.jsservice.basic/CHA/functions/fetch/sw2.js`.
   - Verification via `fileRead`: 1285 bytes read back (matches source).
3. Triggered sw2 via POST to
   `https://localhost:9888/function/basic/fetch/sw2` with a deliberately
   **invalid** command (`999:999:999`).

## Result

```json
{
  "result": true,
  "out": [{
    "payload": "999:999:999",
    "len": 11,
    "text": "\u0007\u0000\u0000\u0000999:604",
    "hex": "070000003939393a363034"
  }]
}
```

Response `999:604` = **error code 604 (invalid id)**, exactly as documented
in the 100U7Q chain. This confirms:

- `/var/run/superwatch_socket` exists and accepts connections.
- The FaaS process (uid 314) has the right group membership (group 616) to
  connect.
- The daemon reads the message, validates the command ID, and returns a
  properly formatted error.
- The trigger URL `https://localhost:9888/function/basic/fetch/sw2` works.

## Chain status after this finding

| Step | 100U7Q chain | 65U70QEVS Q0804 |
|---|---|---|
| 0. MQTT pair | ✅ | ✅ (launcher server) |
| 1. Phoenix WS | ✅ | ✅ |
| 2. fetchFile write | ✅ | ✅ |
| 3. sw2 → superwatch | ✅ | ✅ (604 response) |
| 4. IPK install + root | ✅ | ⏳ untested |

## Next step

Build a minimal architecture-detection IPK (`postinst` runs `uname -m`,
`file /bin/sh`, dumps `/proc/self/status`) to determine whether the
userland is ARM32 or aarch64 before building the real Dropbear binary.
The browser UA says `aarch64` but the 100U7Q (same SoC) is documented
as 32-bit ARM.
