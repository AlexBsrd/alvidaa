# Evidence — 65A70LAVT / V0000.09.60A.Q0707

The TV died on 2026-11-14, the day after the root session, so nothing here can
be re-run. This is one owner's report, not a guide someone else has reproduced.
Where a claim was read from a file rather than exercised, it says so.

| # | Claim | How it was seen |
| --- | --- | --- |
| 1 | Root shell on `:8008` as uid 0 | owner's session, 2026-11-13; `/proc/self/status` showed `Uid: 0 0 0 0` |
| 2 | Boot persistence via `rc.local` → `/var/local/otaTest.sh` symlink → `/APPS/boot_hook.sh` | `/tmp/boot_hook.log`, `=== v3 start Fri Nov 13 09:25:10 AEDT 2026 ===` |
| 3 | `noexec` on `/var/local` is bypassed by the symlink target | `/APPS` mounted without `noexec`; the hook ran |
| 4 | SELinux **enforcing**, `policyvers=33`, `deny_unknown=1` | `/sys/fs/selinux/enforce`, read as root |
| 5 | No SUID or SGID binaries | `find / -perm -4000` and `-perm -2000` both empty |
| 6 | `/APPS` and `/OAD` world-writable; `/APPS` not `noexec` | partition map from the root shell |
| 7 | Eight mosquitto listeners, `per_listener_settings true` | `/opt/iot/mosquitto/mosquitto.conf` |
| 8 | `:1883` is double-locked — iptables plus a plugin that rejected all 12 credential sets | live probe over an SSH tunnel; every attempt `CONNACK rc=5` |
| 9 | phoenix services pass auth when the appconfig has no `permissions` field | `serviceManager.js` fast-path + live calls |
| 10 | `:9226` serves an unauthenticated CDP endpoint | `/json/version` returned Chrome 111 / Protocol 1.3 |
| 11 | `debugInstall` installs from `/OAD/pkgs/download/` without `checkIpkSignature` | `AppUpgrade.js`; the debug path skips `installApp` |
| 12 | `from='Unknown'` skips the phoenix HTTP check but not the per-service ACL | live calls; gated keys still returned 503 |
| 13 | `fileWrite` on `websdk/Appinfo.json` returns 503 `appconfig` | launcher install attempt |
| 14 | The 09.60 `fileWrite` gate reproduces on a second unit | vidaa-edge #30, 85U8Q / `V0000.09.60F.Q0528` |
| 15 | The security-code algorithm is reconstructible from public inputs | `hiSecurity.js`; not live-tested before the TV died |
| 16 | `tilesService` decrypts Prime Video UUS content with a hardcoded key seed | `define.js` + `uus.js`; key material withheld |

## What this doesn't prove

- That the chain works on another `V0000.09.60A.Q0707` unit. The `55U67LEVS`
  row on the same firmware got a one-shot postinst and no shell; `43A5LE` never
  tried root. Same string, different results.
- That the withheld classes are exploitable end to end. They were seen or read,
  not weaponised, and the hardware is gone.
- That VIDAA has fixed anything. `VIDAA-PSIRT-2026-005` covers the root path and
  the MQTT auth issue; the post-root classes haven't been sent yet.
