# The 09.60 `fileWrite` gate reproduces on a second unit

The `client request permission check error, please check appconfig` wall on
`fileWrite` was first recorded on the EU_A `43A5LE` and `55U67LEVS` units. A
separate project, [vidaa-edge](https://github.com/weinzii/vidaa-edge), hit the
same wall on a different unit with different tooling:

- **Unit:** Hisense 85U8Q, firmware `V0000.09.60F.Q0528` (built 2026-05-18).
- **Context:** DNS rewrite of `vidaahub.com`, then the Cloudflare-tunnel
  workaround; the page loaded both ways.
- **Result:** both the legacy `Hisense_installApp` path and the newer
  `HiUtils_createRequest` `fileWrite` path failed with the same 503 appconfig
  message. No fix was found in the thread.

That is meaningful corroboration. A second, unrelated report on different
hardware and different tooling hitting the same gate says the gate is a
**09.60-generation property**, not an EU_A quirk. It also downgrades the
expectation for the launcher self-install on any 09.60 build: the server-side
watcher bounce is the fallback, not the install.

The `65A70LAVT` unit in this directory hit the same wall independently, which
makes three units and two toolchains.

Source: vidaa-edge issue #30 (open, unresolved as of 2026-09).

## Why this is worth recording

The matrix already carries `identity_gate: working` on several 09.60 rows, but
each was one unit. A cross-project reproduction is the cheapest kind of
evidence: it costs nothing, it cannot be faked by a single unit's quirks, and
it tells the next reporter what to expect before they spend an evening on it.
