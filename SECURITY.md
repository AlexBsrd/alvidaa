# Security & disclosure

## Scope of this project

alvidaa is a custom home-screen launcher for Hisense VIDAA TVs. It uses the
same RemoteNow control channel as the official mobile app (MQTT/TLS on port
36669, the app's own client certificate, dynamic credentials and PIN pairing)
and VIDAA's own web-app installation APIs. It runs entirely on a TV you own,
on your LAN, and modifies nothing outside the TV's user-writable space.

## Vulnerability disclosure

During the research that produced this launcher, weaknesses in VIDAA
(2024+ firmware) were identified — most notably the TV browser exposing
privileged install/file APIs to arbitrary pages, and content-recognition /
telemetry endpoints reachable without meaningful authentication.

The researcher's position on publication: **a vulnerability report was sent to
VIDAA and Hisense Product Security (`VIDAASecurity@vidaa.com`,
`report@connectlife.io`) on 2026-10-29, and this repository is published in
parallel rather than waiting on a 90-day window.** If/when Hisense patches or
responds, findings and status will be annotated here.

## Vendor response

**2026-11-07 — logged as `VIDAA-PSIRT-2026-005`.** VIDAA Product Security
acknowledged the report and gave this assessment:

- The **root path** (unauthenticated localhost bridge, `../` traversal,
  `/var/local` boot hook) was **reported to them earlier** and is **already
  fixed on most devices**. Remaining devices, including the reference
  `50A51HUV` on `V0000.09.01O.P0813`, are to receive the fix by OTA update.
- The **MQTT authentication issue** (client-certificate identity gate and the
  dynamic credential derivation) is **new to them** and under investigation.

They asked for this repository to be taken private and for the exploitation
detail to be removed from the write-up until the fixes ship. **The repository
stays public**: the material has been public since 2026-10-29, is forked and
mirrored, and is discussed in public threads, so making it private now would
remove the one maintained copy without removing the information. The blog
write-up carries the vendor's position at the top of the page and stays at the
architecture/findings level instead.

Status will be updated here as fixes land and as other models in the matrix
report in.

## Why report to Hisense *and* keep this public for enthusiasts?

This project sits between two audiences that often pull in opposite directions:
security practitioners who ask *"why publish without a 90-day embargo?"* and
hardware modders who ask *"why tell the vendor at all if they'll patch root?"*
Here is the reasoning on both sides, stated plainly so you can weigh it
yourself:

### Why we reported the vulnerabilities to Hisense

- **This isn't a harmless developer toggle — it is a real browser-reachable
  vulnerability.** The TV's local file bridge (`localhost:9009`) requires no
  authentication and answers with `Access-Control-Allow-Origin: *`, and on
  unpatched builds it can write directly to a root-executed boot hook. Any
  malicious page loaded in the TV's browser could potentially abuse that chain
  without the attacker even being on the LAN. (The full remote attack path has
  not been independently verified; do not expose the TV browser to untrusted
  pages.) Leaving a live drive-by root path unreported leaves millions of
  non-technical TV owners exposed.
- **Disclosing did not burn a secret root method.** Per `VIDAA-PSIRT-2026-005`,
  VIDAA Product Security confirmed the root chain had already been reported to
  them earlier and was already patched on most newer firmware builds.

### Why we published in parallel and kept the repo public

- **Owner autonomy and defensive value.** Publishing the launcher, telemetry
  blocklists, and technical findings in parallel lets owners inspect what their
  hardware does, block unwanted telemetry, and choose how to run their own TVs
  instead of waiting indefinitely behind an embargo. At the time of initial
  publication on 2026-10-29, the vendor had no track record of responding to
  VIDAA research reports (they subsequently replied on 2026-11-07).
- **Informed choice on OTA updates.** On OTA, this repository states a
  **tradeoff, not a recommendation**: accepting Hisense's fixes means giving up
  root; blocking OTA updates to keep root means declining future security
  patches (including fixes for this local bridge). Reporting the bug gets
  everyday owners patched, while keeping the research public lets enthusiasts
  make the OTA tradeoff deliberately on an isolated LAN.
- **No DRM or piracy.** No DRM or technical protection measure is circumvented;
  verified boot stays locked and green, and nothing here helps pirate content.

If you are from Hisense and want to discuss any of this: open an issue here
or reach the repo owner — details will be updated, and findings will be
annotated as patched as firmware catches up.

## Reporting issues in this project

If you find a problem in alvidaa itself (not in VIDAA firmware), open a
GitHub issue. Please do not include tokens, certificates or captures of your
own TV's traffic in issues.

## Publication hygiene (for maintainers)

- `server/keys/` (client certs, `tokens.json`, private SSH keys) and
  `server/iconcache/` are gitignored — never commit device-specific credentials.
- No real MAC addresses, serials, device codes, or auth tokens in committed
  code or docs; use placeholders (`<tv-wifi-mac>`) in documentation. RFC1918
  example/default LAN IPs in local helper scripts are fine when overridable
  via env vars (`TV_HOST`).
- Firmware dumps and extracted vendor binaries stay private — describe
  behavior, do not redistribute vendor code.
- See [docs/DISCLOSURE.md](docs/DISCLOSURE.md) for what this repo publishes,
  what it withholds in new contributions, and how `scripts/payloads.deny` is
  enforced.
