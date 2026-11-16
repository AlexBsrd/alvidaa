# Evidence — 65A70LAVT / V0000.09.60A.Q0707

The unit was destroyed on 2026-11-14, one day after the root session. Nothing
below can be re-run. The labels are therefore the whole story: **community
reported** means the owner observed it and wrote it down; **static analysis**
means it was read from a file on the TV, not exercised.

| # | Claim | Label | Basis |
| --- | --- | --- | --- |
| 1 | Root shell on `:8008` as uid 0 | community reported | owner's session, 2026-11-13; `/proc/self/status` showed `Uid: 0 0 0 0` |
| 2 | Boot persistence via `rc.local` → `/var/local/otaTest.sh` symlink → `/APPS/boot_hook.sh` | community reported | `/tmp/boot_hook.log` line `=== v3 start Fri Nov 13 09:25:10 AEDT 2026 ===` |
| 3 | `noexec` on `/var/local` is bypassed by the symlink target | community reported | `/APPS` mounted without `noexec`; hook executed |
| 4 | SELinux **enforcing**, `policyvers=33`, `deny_unknown=1` | community reported | `/sys/fs/selinux/enforce` read as root |
| 5 | No SUID or SGID binaries | community reported | `find / -perm -4000` and `-perm -2000` both empty |
| 6 | `/APPS` and `/OAD` world-writable; `/APPS` not `noexec` | community reported | partition map from the root shell |
| 7 | Eight mosquitto listeners, `per_listener_settings true` | community reported | `/opt/iot/mosquitto/mosquitto.conf` |
| 8 | `:1883` is double-locked (iptables + plugin rejects all 12 credential sets) | community reported | live probe via SSH tunnel; every attempt `CONNACK rc=5` |
| 9 | phoenix services pass auth when the appconfig has no `permissions` field | static analysis | `serviceManager.js` fast-path + live calls |
| 10 | `:9226` serves an unauthenticated CDP endpoint | community reported | `/json/version` returned Chrome 111 / Protocol 1.3 |
| 11 | `debugInstall` installs from `/OAD/pkgs/download/` without `checkIpkSignature` | static analysis | `AppUpgrade.js` `debugInstall` → `opkgInstall`, bypassing `installApp` |
| 12 | `from='Unknown'` skips the phoenix HTTP-layer check but not the per-service ACL | community reported | live calls; permission-gated keys still returned 503 |
| 13 | `fileWrite` on `websdk/Appinfo.json` returns 503 `appconfig` | community reported | launcher install attempt |
| 14 | The 09.60 `fileWrite` gate reproduces on a second unit | community reported | vidaa-edge #30, 85U8Q / `V0000.09.60F.Q0528` |
| 15 | The security-code algorithm is reconstructible from public inputs | static analysis | `hiSecurity.js`; **not live-tested** before the TV was destroyed |
| 16 | `tilesService` decrypts Prime Video UUS content with a hardcoded key seed | static analysis | `define.js` + `uus.js`; key material withheld |

## What this does not establish

- That the chain works on any other `V0000.09.60A.Q0707` unit. The `55U67LEVS`
  row on the same firmware got a one-shot postinst and no shell; the
  `43A5LE` row never attempted root. Same string, different results.
- That the withheld classes are exploitable end to end. They were observed or
  read, not weaponised, and the hardware is gone.
- That the vendor has fixed any of it. `VIDAA-PSIRT-2026-005` covers the root
  path and the MQTT auth issue; the post-root classes are pending a separate
  report and no fix is confirmed.
