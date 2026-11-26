# Publication policy

What this repository publishes, what it deliberately does not, and how a
contributor can tell the difference. Read this before adding a guide or a
payload.

The short version: **the launcher, blocklists, and findings are public; new
turnkey exploit payloads, device credentials, and vendor binaries are not
shipped, and every guide states what it includes and leaves out.**

## What is published

- **The launcher and owner tooling.** The no-root launcher, MQTT bridge and
  pairing client (using the official app's already-public LAN pairing flow),
  read-only fingerprint/recon probes, AdGuard/kernel telemetry blocklists, and
  post-root native-launcher tooling.
- **Findings and architecture.** What a build does, what was measured, what
  failed, and the evidence for each claim. Architecture, not incantation.
- **Evidence labels.** Every result is marked *verified* (observed on a
  project device), *community reported* (an owner's report, not reproduced
  here), *hypothesis* (proposed, untested) or *untested*. A claim without a
  device observation stays labelled as a claim.
- **Teardown paths.** How to undo whatever a guide describes. Reversibility is
  the design law, and a guide without a rollback is incomplete.

## What is not published

- **New turnkey exploit payloads.** New contributor guides and newly discovered
  classes do not ship packaged root-`postinst` IPKs, one-command arming tools,
  or unpatched persistence scripts. Guides describe *what* property of the
  firmware makes a chain possible, and contributors are always welcome to
  record a `rooted, method withheld` row when they prefer not to publish a
  chain. Enforced paths live in
  [scripts/payloads.deny](../scripts/payloads.deny) (which also documents the
  older cohort of already-disclosed reference scripts still in the tree from
  before this policy was enforced).
- **Device-specific key material.** No private SSH keys, paired device tokens,
  or per-TV certificates. `server/keys/` is gitignored and scanned by
  `scripts/check.sh`. (The generic LAN pairing protocol used by the no-root
  launcher is public prior art, not per-device key material.)
- **Vendor binaries and firmware dumps.** No redistributed vendor executables,
  libraries, APKs, IPKs, or partition images. `scripts/check.sh` scans for
  them and fails the build.
- **Unit identifiers.** Real MAC addresses, serials, and device codes are
  replaced with placeholders in published docs. (RFC1918 example/default LAN
  IPs in local helper scripts are fine when overridable via `TV_HOST`.)

## The line, stated by a contributor

The clearest formulation came from a contributor whose material arrived as a
private bundle, and it is worth quoting rather than paraphrasing:

> The docs in this bundle are publishable on their own. The payload and the
> exact chain are what shorten the window.

That is the boundary this repository uses. A guide may say *what* property of
the firmware makes a chain possible. It may not hand over the artefact that
executes it.

## Why this line

Two reasons, and they point the same way.

**It is the honest one.** The information is already public once a guide
describes the mechanism; the marginal risk of the payload is real, and the
marginal benefit to an owner who wants to understand their own TV is zero.

**It is the useful one.** A guide written to the boundary is a better guide.
It explains the shape of the failure, which is what transfers to the next
model, instead of a sequence of commands that only works on one build.

## Verification labels

| Label | Means |
| --- | --- |
| **verified** | observed on a project device, with the evidence recorded |
| **community reported** | an owner reported it; not independently reproduced here |
| **hypothesis** | proposed from static analysis; never run |
| **untested** | no result yet. Say so rather than implying success |

A failed observation applies only to the route and device that were tested. It
does not mean the build is secure, and it does not mean the route is closed
everywhere.

## Vendor coordination

The 2024+ VIDAA findings were reported to Hisense/VIDAA Product Security on
**2026-10-29** and logged as **`VIDAA-PSIRT-2026-005`** on **2026-11-07**, with
this repository published in parallel rather than held behind a 90-day embargo.

For the vendor's full assessment, why we declined to take the repository
private, and why we both reported the browser-reachable root vulnerability to
Hisense *and* keep the research public for enthusiasts (along with the OTA
tradeoff), see [SECURITY.md](../SECURITY.md).

The blog write-up carries the vendor's position at the top of the page and
stays at the architecture/findings level; status in this repository is updated
as firmware fixes land across models in the matrix.

## If you are a vendor

Open an issue or reach the repository owner. Findings will be annotated as
patched as firmware catches up, and any advisory or CVE reference will be
linked from the affected guide.

## If you are contributing

Write the guide to the boundary:

1. State the fingerprint (model, firmware, SoC, region) exactly as the TV
   reports it.
2. Describe the chain at the level of *what property makes it possible*.
3. Label every claim with one of the four evidence labels.
4. Include the teardown path.
5. Fill in the **What this guide includes and leaves out** section, so the next
   reader knows what you withheld and why.

The template is [docs/models/_TEMPLATE.md](models/_TEMPLATE.md).
