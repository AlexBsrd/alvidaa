# Alvidaa project progress — 55A6NV (platform model 55A60QUV)

**Status snapshot:** 2026-11-23
**Purpose:** Give the TV owner, future readers, and AI agents a concise,
evidence-aware starting point for understanding the project's goal and current
progress. This is a living status note, not a new compatibility or security
claim.

## Project goal

Alvidaa aims to provide a simpler, owner-controlled VIDAA Home experience—with
a clock, inputs, and apps—without relying on the sponsored stock home screen.
The project also records what is and is not verified on each exact TV model and
firmware. Its two launcher paths are described in [LANES.md](../../../../../docs/launcher/LANES.md):

1. **External-server Home:** a reversible web app on the TV served by a
   computer on the local network.
2. **Native/on-TV path:** a more self-contained design that depends on
   model-specific TV capabilities and is not interchangeable between devices.

The project-wide entry point is the repository [README](../../../../../README.md).

## Current result on the owner's TV

### External Alvidaa Home — working, owner-confirmed

The owner confirmed that Alvidaa Home opens on the TV. The latest recorded
installation check says the TV loaded the launcher page, connected to `/ws`,
and received launcher resources. The Home watcher returns the TV to Alvidaa
after the stock VIDAA Home is opened; launching YouTube and returning with the
remote's Home button were also recorded as working.

The current deployment uses the Python server on the notebook. Its LAN address
is kept in the local server configuration and is not recorded here. The owner
reported that the TV worked with this setup. The server was last documented as
running in a visible Konsole window. This confirms the current external-server
route; it does not mean the server is an always-on service.

The server URL is centralized in `server/config.json` as `serverUrl`, and the
installer and migration pages consume that setting. The installed TV tile also
stores its own URL, so changing the host address requires updating that TV-side
entry using the documented migration flow. See [installation](../../../../../docs/launcher/ALVIDAA-HOME-INSTALL.md)
and [server migration](../../../../../docs/launcher/ALVIDAA-HOME-SERVER-MIGRATION.md).

### Host reliability — stable for current use; 24/7 migration deferred

The notebook remains the current host, with its LAN address configured locally.
The owner plans a dedicated 24/7 host later, but does not need to migrate now.
`server/start-visible.sh` documents a repeatable way to start the current
server; automatic startup is not enabled. Keep only one server connected to
the TV with the paired credentials at a time. The
[migration procedure](../../../../../docs/launcher/ALVIDAA-HOME-SERVER-MIGRATION.md)
is for the later move and retains a rollback path.

### Native Home on this model — not established

The project documents an on-TV launcher lane and work on reference devices, but
those results do not prove that the native lane is installed or working on
this exact TV and firmware. Treat this owner's working external-server Home
and the model-specific native/research lane as separate results.

## Model identity and compatibility record

The owner reports these values from **TV Settings → Support → About**
(2026-11-22):

- Model: `55A6NV`
- Software version: `V0000.09.60L.10623`
- Extended version: `X0002.W01.Y01.J01`
- Minor version: `L.Q0623.9.61.00-aa20260727u`
- RC version: `ERF2J38V1.05`

The owner reports that the rear label says `55A6NV`. The recon user-agent
reported platform `55A60QUV`, `MTK9603`, VIDAA `9.0`,
`V0000.09.60L.Q0623`, and Chromium `111.5563.5.1` (Odin, armv7l). A separate
read-only browser fingerprint called `Hisense_GetModelName()`,
`Hisense_GetChipSetName()`, `Hisense_GetOSVersion()`,
`Hisense_GetFirmWareVersion()`, `Hisense_GetCountryCode()`, and
`Hisense_GetRegion()`. The returned values were `55A60QUV`, `MTK9603`,
`U09.60`, `V0000.09.60L.Q0623`, `BRA`, and `AM`, respectively. The fingerprint
confirms the `55A6NV` product label and `55A60QUV` platform name refer to the
same TV; see [01-firmware-fingerprint.md](./01-firmware-fingerprint.md).

The About screen's software field says `V0000.09.60L.10623`, while its minor
version and the browser user-agent contain `Q0623`. The read-only
`Hisense_GetFirmWareVersion()` result is `V0000.09.60L.Q0623`, matching the
user-agent. Preserve both About and API strings as reported. An SSDP
`M-SEARCH` produced no descriptor response from the TV in this environment;
the SSDP region and `transport_protocol` therefore remain unknown. The
reported country and vendor region are `BRA` and `AM`, respectively.

The official [tested-models inventory](../../../../../docs/research/TESTED-MODELS.md)
now records the platform firmware `V0000.09.60L.Q0623` and the product/platform
model names together. Pairing, external launcher, and temporary root-shell
access are recorded with their limits; other capabilities remain untested.

## Next steps

1. Keep the working external Home path on the notebook; defer the 24/7 host
   migration until a destination is chosen.
2. The remaining unknown inventory fields are the SSDP region,
   `transport_protocol`, and build date. The SSDP query did not receive a
   descriptor; retry only if the TV later exposes one on the local network.
3. Use the project [TODO](../../../../../TODO.md) as the canonical list for
   broader engineering work rather than duplicating it here.

## Updating this note

Update the dated status when a new owner-confirmed observation or test changes
one of the states above. Separate direct device observations from plans and
inferences; link to the detailed record; preserve negative results; and do not
copy credentials, tokens, private keys, or other pairing secrets into findings.
