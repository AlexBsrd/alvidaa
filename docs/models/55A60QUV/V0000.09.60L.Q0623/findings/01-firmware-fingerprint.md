# 01 — Firmware fingerprint

**Observed:** 2026-11-23
**Device:** Owner-reported rear label `55A6NV`; browser platform model `55A60QUV`.

## Read-only browser result

A temporary page opened through the existing paired server called only these
identity getters:

| Getter | Result |
| --- | --- |
| `Hisense_GetModelName()` | `55A60QUV` |
| `Hisense_GetFirmWareVersion()` | `V0000.09.60L.Q0623` |
| `Hisense_GetChipSetName()` | `MTK9603` |
| `Hisense_GetOSVersion()` | `U09.60` |
| `Hisense_GetCountryCode()` | `BRA` |
| `Hisense_GetRegion()` | `AM` |

The user-agent independently reports `55A60QUV`, `MTK9603`,
`V0000.09.60L.Q0623`, and Chromium `111.5563.5.1` (Odin, armv7l).

The owner-reported TV About screen shows software version
`V0000.09.60L.10623`, extended version `X0002.W01.Y01.J01`, minor version
`L.Q0623.9.61.00-aa20260727u`, and RC version `ERF2J38V1.05`. The official
browser getter and user-agent agree on `V0000.09.60L.Q0623`; the distinct
About software string is preserved as reported rather than silently
normalized.

## Unknowns

- An SSDP `M-SEARCH` produced no descriptor response from the TV in this
  environment. SSDP region and `transport_protocol` remain `?`.
- Build date remains `?`; the date-like substring in the About minor version
  has not been independently verified as the build date.
- The fingerprint made no writes to the TV. The Recon app installer and root
  hook were not invoked.
