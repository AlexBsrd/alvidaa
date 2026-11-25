# 100U7SAU / V02.09.50U.Q0311 — lane 3 native Home; boot-persistent root SSH (MT9655, AU)

**Status:** verified on the owner's own TV, 2026-11-25. Fingerprint, pairing,
lane 2 (loopback bridge + watcher), lane 3 (native Home route swap in the
vendor home engine), and boot-persistent root SSH all work on this exact
build. Lane 2 was retired after lane 3 verified. OTA is frozen on this unit
by the owner (`/var/local/nightupdate.ini`: `dcm_update=0`,
`dcm_standby_update=0`, `dcm_tkgs_update=0`).

> **Applies to `100U7SAU` (SSDP `modelName` **100U7QE**, friendlyName
> "Living Room TV", MT9655, kernel 5.15.180 aarch64, aarch64 userland) running
> `V02.09.50U.Q0311`**, Extended Version `U.Q0311.X0001.W01.Y01.J01.9.05.00`,
> OperationUI `9.05.00` (package `9.05.00-a20260228q`, CodeBranch
> `VIDAA_UI_MT9655_U950_EU_MP_20251124`). This is the 2025 U950 / AU build;
> whether the same UI bundle ships on other 2025 U950 SKUs is untested.
> Region: Australia (EUEM AUS).
>
> **Contributed by [@rtype-cpu](https://github.com/rtype-cpu).** Own TV; the
> whole record (fingerprint → pairing → lane 2 → lane 3 → teardown of lane 2)
> was carried out on the device itself.

## What the chain rests on

1. **The OperationUI channel layout is writable and single-channel.**
   `/APPS/pkgs/tv.vidaa.app.operationui/current -> ./CHA` is a symlink with
   only `./CHA` present (`DualChannel: true` in packageinfo, but no CHB).
   The launcher bundle `CHA/apps/launcher/js/app.js` (314,042 bytes,
   sha256 `96dc95be…`) is writable by root and read-only for everyone else.
2. **The vendor UI engine loads its Home from that file at process start**,
   so a patched bundle takes effect after an engine restart / reboot —
   no boot-hook needed for lane 3.
3. **The SDK contract this build exposes is the 75U8QTUK one, not the
   55A7KAU one**: `app-service.getAppList({sceneCode:"launcher"})`,
   `all-inputs.getAllInputsData` + `changeSourceTo`, the
   `o2n://` message bus (`o2n://sdk/init-finished`,
   `o2n://app-service/all-apps-changed`, `o2n://all-inputs/inputs-data-changed`,
   `o2n://sdk/str-resuming`, `o2n://launcher/show`), `setting.open("settings")`,
   `app-service.getAppInfo`, and `apc.CMDMETHOD.LAUNCHER_RECOMMEND`. This
   build has **no** `getCurrentShowApps` and **no** `getAppInfoByAppId`, so
   the 55A7KAU-style adapter does not run here.
4. **The root path is the superwatch family** (fetcher FaaS write →
   pkgmgr hook → vendor opkg → postinst runs uid 0). The `re_sshd`
   BaseService in `tv.vidaa.jsservice.basic/CHA/services/` with one
   `autoStart` entry in `serviceList.json` re-arms the whole IPK at every
   boot, so root SSH is persistent without touching boot scripts.

## What was measured

| Claim | Evidence | Label |
| --- | --- | --- |
| Firmware `V02.09.50U.Q0311` | About screen (owner photo) + `packageinfo.json` | verified |
| SoC MT9655, aarch64 | `uname`, aarch64 dropbear runs | verified |
| SSDP descriptor: stub on `:3366`; `modelName` 100U7QE; no `transport_protocol` | `dd.xml` fetch | verified |
| LAN surface: `:18400`, `:7000`, `:9080`, `:36669` answer; other ports drop | port sweep (FG-Home side clean of TV WAN) | verified |
| Pairing works (modern profile) | MQTT session established; bridge connected | verified |
| One MQTT session per TV | bridge ↔ Sidee kick each other off the broker | verified |
| Lane 2 (alvidaa-bridge on TV loopback :8770) installs, runs, launches its tile via `launchapp` | owner-confirmed render; `Home` tile in registry launched; icon cache solved the WAN-blocked icon timeouts | verified |
| Lane 3 native Home renders as Home directly | owner-confirmed after `app.js` component swap + reboot | verified |
| Lane 3 survives reboot | reboot → SSH re-arms, `app.js` hash unchanged, Home loads | verified |
| Lane 2 fully retired | bridge killed, `/var/local/alvidaa` + `/APPS/.alvidaa` removed, tile removed from `allAppsInfo.txt`, bridge autostart removed from postinst | verified |
| OTA frozen | `/var/local/nightupdate.ini`: all `dcm_*_update=0`; `/OAD/AppUpgradeSwitch.json` absent | verified |
| `fileRead` from TV browser context works (`/proc`, registry) | recon reads | verified |
| `fileWrite` / traversal probes | not run on this build | untested |
| lane 2 watcher correctness (`vidaa-home` vs `alvidaa-home` match bug) | bridge log; fix required a case-insensitive appId match and any-case `url` key handling | verified |
| Icon-fetch stall | root cause of multi-second first paint: icon cache miss → outbound CDN fetch with 8 s timeout on a WAN-blocked TV; fixed by pre-staging all store icons into the bridge icon cache | verified |

## What this guide includes and leaves out

| Included | Left out |
| --- | --- |
| the fingerprint, SDK contract and the swap point | working payloads |
| the chain at the architecture level | the candidate binary and the exact install script |
| the evidence for each claim | key material, tokens, client IDs, MACs |
| the teardown path | vendor binaries (the stock bundle never enters the repo) |

The line falls here because the mechanism (route component swap in the vendor
home bundle) is already public in this repo; what stays out is the artefact
and anything identifying this unit.

## Teardown

1. **Lane 3 rollback:** copy the stock bundle back over
   `/APPS/pkgs/tv.vidaa.app.operationui/CHA/apps/launcher/js/app.js` from the
   off-TV backup (`sha256 96dc95be…`, md5 `dce3eeba…`), then reboot. The
   vendor engine reloads stock Home on next start. A byte-identical
   `/var/local/app.js.stock-2026-11-25` copy was left on the TV as an
   in-place fallback.
2. **Boot persistence:** restore `serviceList.json` from
   `serviceList.json.pristine` (kept at `/APPS/.re_sshd/`), remove the
   `re_sshd` service directory, remove `/APPS/.re_sshd` and `/APPS/sshd.ipk`,
   and drop the inbound `ACCEPT` rule for port 8009
   (`iptables -D INPUT -p tcp --dport 8009 -j ACCEPT`).
3. **Registry:** restore `/APPS/hisenseUI_shared_data/launcher/allAppsInfo.txt`
   from `/var/local/allAppsInfo.txt.bak-2026-11-25` if any app entries were
   altered (the `alvidaa-home` tile was already removed and verified gone).
4. **Bridge remnants:** none — lane 2 was fully removed 2026-11-25 (see
   inventory). Off-TV backups of the removed state are
   `lane2-uninstall-backup/lane2-backup.tar.gz`.

If any step cannot be undone, say so plainly: a TV that flashes
`operationui` via vendor service would overwrite the patched bundle with
stock — harmless, it just reverts lane 3.

## Open items

- `fileBridge` (traversal/write) and the `euladpp`/`devtools` lanes are
  untested on this build; it may well behave like the sibling U950 family.
- `transport_protocol` is not exposed by the SSDP stub; not measured.
- Long-term stability of the route swap across a vendor reinstall of
  OperationUI (OTA is frozen, so this is theoretical on this unit).
- The lane-2 watcher bug (case-sensitive `appId` match, lowercase-only `url`
  key) is fixed in the current bridge source but untested post-retirement.

## Cross-reference

- Sibling U95 family: [55E7QTUK](../../55E7QTUK/V0000.09.09D.P1001/README.md)
- Lane 3 scaffold and native port notes: `docs/launcher/FREE-MY-TV-NATIVE-PORT.md`, `tools/launcher-host/`
- Publication policy: [DISCLOSURE.md](https://github.com/carteakey/alvidaa/blob/main/docs/DISCLOSURE.md)
