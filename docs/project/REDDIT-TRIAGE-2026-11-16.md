# Reddit triage — 2026-11-16

The two r/Hisense threads from the last two weeks (the original root post and
the seven-TVs follow-up) produced 25 substantive comments. This page is the
working queue: what each one actually asks, what the repo already knows, and
what the next action is. It is deliberately ordered by value, not by date, and
it is meant to be worked **one item at a time** — the queue is the state, so
nothing lives in a chat log.

Two threads, same audience:

- the original root post ([1xj3pc2](https://reddit.com/r/Hisense/comments/1xj3pc2/))
- the follow-up: seven TVs across six SoCs ([1xozwqi](https://reddit.com/r/Hisense/comments/1xozwqi/))

## How to use this page

Each item has the same four fields: **who**, **ask**, **what we know**, **next
action**, plus a paste-ready reply where one is warranted. When an item is
done, tick it and add the outcome — a reply that produced a firmware string
becomes an inventory row, a reply that produced a negative becomes a row too.
An item that produced nothing is closed with `no data`, not deleted.

## Queue

| # | Item | Who | State |
| --- | --- | --- | --- |
| 1 | HDMI text overlay for PS5 subtitles | u/ProposalWarm3573 (58E6KT, U9, MTK9602) | **reply drafted**, probe untested |
| 2 | Built-in **Media** app missing from the tile list | u/Koty97 | **reply drafted**, needs recon dump |
| 3 | Firmware dump for `09.01O.P0813` | u/Tall_Entry5920 | **reply drafted**, still withheld |
| 4 | U7K rooted by a JIT chain, method withheld | u/LulzTigre | **reply drafted**, wants build string only |
| 5 | 75E78QTUK + a 55" — wants it running | u/weneedalargership | **reply drafted**, needs firmware strings |
| 6 | "Do we still need an AI agent?" | u/arqueiro_, u/Several_Emergency_94 | **reply drafted** |
| 7 | Boot straight to one input, nothing else | u/ComaBlue | **reply drafted**, supported today |
| 8 | Tesla-branded VIDAA in the EU | u/paokkerkir | **reply drafted** |
| 9 | "A screenshot proves nothing" | u/Substantial_Dot5183 | **reply drafted**, concede |
| 10 | Launcher PR in progress | u/splendid_spleen | **reply drafted**, needs coordination |
| 11 | Reverse-engineered firmware download | u/xXLucyNyuXx | **reply drafted**, invite findings-only |
| 12 | Older / other models, no data | u/werokk, u/Resident-Climate-443, u/STNKMyyy | **reply drafted**, ask for strings |
| 13 | Stremio/Nuvio audio-track bugs on 55E8S | u/zaStef, u/Terrible-Base-673 | no reply yet — app-side, not launcher |
| 14 | GeForce Now at 4K/VRR | u/ayushere, u/QuantityElectronic51 | no reply yet — answer is hardware |
| 15 | DV7 FEL + lossless eARC passthrough | u/naaczej | no reply yet — answer is HAL |
| 16 | 50A7HAU report filed as an issue | u/gonzule | needs a PR, not a reply |
| 17 | Non-root launcher on an EU model | u/MrP3w, u/kyoukomiii | already answered in-thread |
| 18 | Thanks / motivation / name / noise | 9 commenters | close, no action |

---

## 1. HDMI text overlay for PS5 subtitles

**Who:** u/ProposalWarm3573 — 58E6KT, VIDAA U9, MTK9602. PS5 on HDMI, PC does
the capture and translation, the TV only needs to draw text.

**Ask:** can root draw a transparent text overlay over a live HDMI input, using
the native OSD, framebuffer or compositor?

**What we know** (all measured on the reference unit, same SoC):

- The home engine has **no canvas at all** — `HTMLCanvasElement` is undefined,
  `createElement("canvas")` returns a generic element with no `getContext`, and
  `<iframe>` is unsupported. Every UI-side overlay idea dies at that line. See
  [12-overlay-and-cobalt-runtime.md](../models/50A51HUV/09.01O.P0813/findings/12-overlay-and-cobalt-runtime.md) §7.
- `/dev/fb0` **writes reach the panel** — that is how Doom paints — but reads
  return nothing, and the display is composited through `mstar_fbdev_mi` +
  `mali_kbase`. fb0 is a legacy surface the compositor never fills.
  [DOOM.md](../models/50A51HUV/09.01O.P0813/DOOM.md) has the backend.
- The missing datapoint: **nobody has painted to fb0 while an HDMI input is
  live.** Writes are visible when the vendor UI is not drawing; whether the
  plane survives compositor repaints during playback is untested.

**Next action:** ask them to run the probe on their own set and report which of
three outcomes they get. That single result decides whether the whole overlay
class is possible on MTK9602, and it belongs in `docs/research/` either way.

**Reply:**

> Short answer: not through the framebuffer, and not through the home engine. But it's worth 20 minutes on your own set to be sure, because I only measured the pieces separately.
>
> What I measured on MTK9602 (50A51HUV, `09.01O.P0813`):
>
> - The home engine has no canvas at all. `typeof HTMLCanvasElement === "undefined"`, `createElement("canvas")` returns a plain element with no `getContext`. Starboard on this build is DOM-only, so every "draw a transparent overlay in the UI" idea dies at the same line. Iframe is unsupported too, so no realm escape.
> - `/dev/fb0` writes reach the panel but reads return nothing. That's how I ran Doom — open, mmap, paint. But `dd if=/dev/fb0` returns 0 bytes, and the display is composited through `mstar_fbdev_mi` + `mali_kbase`. So fb0 is a legacy surface the compositor never fills.
> - The two facts together are ambiguous for your case: writes are visible, but I've only ever painted with the vendor UI not drawing. I have not tested painting while an HDMI input is live.
>
> The probe, on your set, over SSH: start the PS5 input, then from a root shell write a solid rectangle into fb0 and watch the panel.
>
> ```sh
> # 1080p, 32bpp, stride 7680 — paint a 400x100 white block at 100,100
> python3 - <<'EOF'
> import mmap, os
> W,H,STRIDE,BPP = 1920,1080,7680,4
> fb = os.open("/dev/fb0", os.O_RDWR)
> m = mmap.mmap(fb, STRIDE*H)
> for y in range(100,200):
>     m[y*STRIDE+100*BPP : y*STRIDE+500*BPP] = b"\xff"*(400*BPP)
> m.flush()
> EOF
> ```
>
> Three outcomes, and each tells you something different: it appears and stays (fb0 is a real plane above video — then you have a path, and the work is a small daemon that draws text and survives compositor repaints); it appears and gets wiped within a frame or two (the compositor owns the plane — you'd need to fight it or stop it); nothing appears (the plane is below video, and the only route is the vendor's own OSD layer, which means reverse-engineering the subtitle renderer).
>
> One thing that will bite you regardless: HDCP on the HDMI input doesn't block a local OSD, but it does block any capture-based approach, so don't plan on grabbing the PS5 frame on the TV side. Your PC-side capture is the right architecture — the TV only needs to draw text.
>
> If you run the probe, post the result (firmware string + which of the three outcomes) and I'll add it to the findings. It's a genuinely useful datapoint and nobody has tested it.

## 2. Built-in Media app missing from the tile list

**Who:** u/Koty97 — tried the launcher without root, uses the TV's own **Media**
app daily, could not add it.

**Ask:** how to get the Media app onto the launcher.

**What we know:** the tile list comes from
`getAppList({sceneCode:"launcher"})` on the vendor side; apps the vendor keeps
out of that scene never appear. The launcher can pin, hide and rename by appId
via `only` / `hidden` / `rename` in
[server/config.json](../../server/config.json), but it can only pin something
the app list returns. The native lane has the same source
([NATIVE-ALVIDAA.md](../../tools/launcher-host/NATIVE-ALVIDAA.md)).

**Next action:** get a recon dump (`/recon.html` on the bridge) and check
whether Media appears in `applist` and what its appId is. If it is there, it is
a config change. If it is not, this becomes item **A** in the follow-on list
below — launch-by-appId for apps outside the launcher scene.

**Reply:**

> That one's probably not a launcher bug — the tile list comes from `getAppList({sceneCode:"launcher"})`, and apps the vendor keeps out of that scene never show up no matter what you do. `server/config.json` can pin or rename by appId (`only`, `hidden`, `rename`), but it can only pin something it can see.
>
> Can you open the recon tab (`/recon.html` on the bridge) and paste what `applist` returns? I want to know two things: whether Media appears at all, and its appId if it does. If it's there, adding it is a one-line config change. If it's not, the fix is launching it by appId directly, which I haven't wired up yet — and you'd be the second person to want it, so it's worth doing.
>
> Also: which model and firmware string? "Without root" on `09.60` is a different story than on `09.01`.

## 3. Firmware dump for `09.01O.P0813`

**Who:** u/Tall_Entry5920 — owns the same 50A51HUV, wants the dump to reverse
the binaries.

**Ask:** a copy of the firmware image.

**What we know:** the dump exists but is **not a tested recovery or rollback
image**, so publishing it invites a brick. The publication policy is in
[DISCLOSURE.md](../DISCLOSURE.md): findings public, payloads and vendor
binaries not shipped. There is a secret/PII scanner at
[tools/sanitize](../../tools/sanitize/README.md), but it is a guardrail, not a
proof.

**Next action:** answer with the honest status and offer the publishable
subset — partition map, init/boot chain, binary hashes — rather than the image.
The self-dump path is already public in
[07-root-summary.md](../models/50A51HUV/09.01O.P0813/findings/07-root-summary.md).

**Reply:**

> Still owe you this, and the honest status: I have the dump, but it's not a recovery image and I'm not going to publish something people might flash and brick with. What I can do is publish the parts that are actually useful for reversing — the partition map, the init/boot chain, and the vendor binaries' hashes — with unit identifiers stripped.
>
> There's a scanner in the repo that I run before anything goes public, but it's a guardrail, not a proof, so it's slow going.
>
> If you want to dig now, dumping your own set is the better path anyway — it's your hardware, and the root summary has the method. Happy to compare notes on what you find in the binaries.

## 4. U7K rooted by a JIT chain

**Who:** u/LulzTigre — says they rooted a U7K with a chained JIT vulnerability,
and is (reasonably) scared of it being patched.

**Ask:** none, yet — an offer with no detail.

**What we know:** the matrix wants the **build string**, not the chain. A row
that says "rooted, method withheld" is already within policy and is useful to
the next U7K owner. [DISCLOSURE.md](../DISCLOSURE.md) covers technique classes
and what a contributor may withhold.

**Next action:** ask for model, region and the full firmware string only. No
pressure on the chain.

**Reply:**

> No pressure on the chain — genuinely. But the build string alone would help a lot and gives nothing away: model, region, and the full firmware string (`V0000.xx.xxX.Pxxxx`) from Settings → About. That's enough to add a row saying "rooted, method withheld" so the next U7K owner knows it's possible on their build and doesn't assume it's a dead end.
>
> If you ever do want to publish, the useful part is which surface the JIT bug is in — not the exploit itself.

## 5. 75E78QTUK and a 55" — wants it running

**Who:** u/weneedalargership — two units, no firmware strings.

**Ask:** help getting the launcher (and presumably root) onto both.

**What we know:** neither model is in the matrix. The E78Q family is not
catalogued at all. Everything depends on the build string, because `09.60`
carries the `fileWrite` identity gate — three of our units plus the
independent vidaa-edge report on an 85U8Q, see
[02-identity-gate-cross-confirmation.md](../models/65A70LAVT/V0000.09.60A.Q0707/findings/02-identity-gate-cross-confirmation.md).

**Next action:** ask for both firmware strings, point at the matrix, and set the
expectation that a `09.60` unit gets the bridge lane rather than self-install.

**Reply:**

> Can do, but I need the firmware string for both — Settings → About → the `V0000.xx.xxX.Pxxxx` line. That decides everything.
>
> Two things worth knowing up front. If they're `09.60` builds, the launcher's self-install is gated (a 503 app-identity check, reproduced on three of mine plus an independent report on an 85U8Q), so plan on the bridge lane instead — it works fine, it just needs a Pi or NAS. And the 55" matters as much as the 75": the same retail family can ship different panels and different builds.
>
> If you post both strings I'll tell you which lane applies and whether anyone has done that build already.

## 6. "Do we still need an AI agent?"

**Who:** u/arqueiro_, followed up by u/Several_Emergency_94 asking about a
55" U7N.

**Ask:** is an agent still required, and does it work on a U7N.

**What we know:** root is still agent-shaped — the ladder is
[HACK-YOUR-OWN.md](HACK-YOUR-OWN.md), and the honest answer is "yes for now".
The launcher is not: lane 1 is a normal manual setup. U7N is not in the matrix.

**Next action:** answer plainly, then get the U7N firmware string.

**Reply:**

> For root, yes, for now — it's still a lot of probing and reading errnos, and an agent is genuinely faster at that than a person following a guide. The launcher is different: lane 1 (bridge on a Pi/NAS) is a normal manual setup, no agent needed.
>
> U7N 55": I don't have that model in the matrix yet, so I can't say. What's the full firmware string from Settings → About? If it's a `09.60` build, expect the launcher self-install to be gated and plan on the bridge instead.

## 7. Boot straight to one input, nothing else

**Who:** u/ComaBlue.

**Ask:** can the TV turn on to one input and do nothing else.

**What we know:** yes, today, without root — `hidden` drops app tiles and
`autoSwitch` jumps to the single live HDMI input on boot
([server/config.json](../../server/config.json), and the native lane has the
same toggle with a countdown HUD). The caveat is real: the vendor boot sequence
still runs first, so there is a flash of the stock home.

**Next action:** answer with the two config keys and the caveat. No repo work.

**Reply:**

> Yes, that's supported today without root. Two settings in `server/config.json`: `hidden` to drop every app tile you don't want, and `autoSwitch: true` so it jumps to the one live HDMI input on boot. Leave only that input visible and it boots to a clock plus that input.
>
> The one caveat: it can't stop the TV's own boot sequence from happening first, so you'll see a flash of the vendor home before the launcher takes over. If you want it truly invisible, that's the root lane.

## 8. Tesla-branded VIDAA in the EU

**Who:** u/paokkerkir.

**Ask:** is this Hisense-only, or does it work on Tesla-branded VIDAA sets.

**What we know:** not Hisense-only, and the matrix already has two
Toshiba/Vestel units — `50C350LS` rooted over the same superwatch family, and
`VS1165UD1_0400` where the browser file surface returned empty and root was not
achieved. The variable that showed up was the **brand string** in pairing
(`brand=tos`). See [docs/models/README.md](../models/README.md).

**Next action:** set the expectation that the guides do not transfer wholesale
and that recon comes first. Add a Tesla row if a firmware string arrives.

**Reply:**

> Not Hisense-only, but brand matters. Two Toshiba/Vestel VIDAA units are in the matrix: one rooted over the same superwatch family, and one where it didn't work. The difference showed up in pairing — the Toshiba needed `brand=tos`, and the browser bridge surface differed.
>
> So a Tesla set is worth a shot, but don't assume the Hisense guides transfer. Start with recon: what does the browser expose, and what does the bridge return. If you get a firmware string I'll add a row.

## 9. "A screenshot proves nothing"

**Who:** u/Substantial_Dot5183.

**Ask:** an implicit challenge — the Root Status tile could be faked.

**What we know:** they are right, and the tile is a convenience, not evidence.
The evidence standard is the per-model `EVIDENCE.md` files: firmware strings,
binary hashes, wire observations. The strongest counter is that seven units
across six SoCs have now reproduced it independently.

**Next action:** concede, point at the evidence files, do not overclaim.

**Reply:**

> Fair, and I agree — a screenshot of a status tile proves nothing. The tile exists because it's useful day to day, not as evidence.
>
> The evidence is in the per-model `EVIDENCE.md` files: firmware strings, binary hashes, and what was observed on the wire. It's still not cryptographic proof that it's my TV, and I'm not going to pretend otherwise. The real test is that other people have now done it on six different SoCs — that's much harder to fake than a screenshot.

## 10. Launcher PR in progress

**Who:** u/splendid_spleen — building a launcher, early, buggy, wants to PR.

**Ask:** implicit — is it wanted, and how does it land.

**What we know:** lane 3 now has **three** implementations on one scaffold
([IMPLEMENTATIONS.md](../../tools/launcher-host/IMPLEMENTATIONS.md)), so a
fourth needs to know which one is the closest base or the merge becomes a
rewrite. The lane split is in [LANES.md](../launcher/LANES.md).

**Next action:** follow up, ask which SDK calls they use, point at the closest
implementation.

**Reply:**

> Still want this. Before you go further, look at `tools/launcher-host/IMPLEMENTATIONS.md` — there are three lane-3 implementations on one scaffold now, and I'd rather fold yours in as a fourth than have us both rewrite the same component swap. Tell me which SDK calls you're using and I'll tell you which of the three is the closest base.

## 11. Reverse-engineered firmware download

**Who:** u/xXLucyNyuXx — reversed the upgrade mechanism, needs a cert dumped
from the TV and some extracted keys.

**Ask:** none directly, but they are sitting on the most useful unreleased
finding in the thread.

**What we know:** the repo publishes findings, not key material
([DISCLOSURE.md](../DISCLOSURE.md)). The *shape* of the upgrade mechanism —
endpoints, what is signed, what the TV presents — is publishable and is
currently missing from `firmware/`.

**Next action:** invite a findings-only writeup, explicitly not the cert or the
keys.

**Reply:**

> This is the most useful thing in the thread. I don't want the cert or the keys, and I won't ask for them — but the shape of the upgrade mechanism is publishable and it's exactly what's missing from the repo. If you're up for it, a findings-only writeup (endpoints, what's signed, what the TV presents, what you had to extract) would be a real contribution. No payload, no keys.

## 12. Older / other models, no data

**Who:** u/werokk (H50A6250UK), u/Resident-Climate-443 (A6HV),
u/STNKMyyy (a pre-VIDAA Opera-based set, already pointed at xXLucyNyuXx).

**Ask:** does it work on my older set.

**What we know:** none of the three is in the matrix, and the A6250 generation
predates the browser bridge the guides rely on. The Opera-based root that
xXLucyNyuXx mentions is **not** documented in this repo — if it lands, it is a
new technique class.

**Next action:** one reply covering all three; ask for exact model + firmware
string, and say plainly that pre-VIDAA sets are a different problem.

**Reply:**

> I can't say without the exact model and firmware string — Settings → About, the `V0000.xx.xxX.Pxxxx` line. Two of the three of you are on generations that predate the browser bridge these guides use, so the answer is probably "different problem, different method" rather than "yes, follow the guide".
>
> The pre-VIDAA Opera-based sets are the interesting case: nobody has written that one up here. If you get root on one, a findings-only report would be a new technique class in the matrix.

## 13. Stremio/Nuvio audio-track bugs on a 55E8S

**Who:** u/zaStef (55E8S), u/Terrible-Base-673 (asked whether the launcher
helps at all).

**Ask:** audio-track switching and subtitle overlap bugs after installing
Stremio/Nuvio via SIDEE.

**What we know:** this is app-side player behaviour, not the launcher. The
launcher only changes what is on screen and which app is launched; it does not
touch the decoder or the HLS track selection. Root would not fix it either —
the player still runs on the vendor runtime. The one useful variable is whether
the bug reproduces in the TV browser (odin) versus the installed app, because
those are different player stacks.

**Next action:** no reply drafted yet — decide whether to answer at all. If we
do, ask which player stack and whether it reproduces in the browser. Not a repo
item unless it turns out the launcher's install path causes it.

## 14. GeForce Now at 4K/VRR

**Who:** u/ayushere, answered by u/QuantityElectronic51 (can't even hold
1080p60).

**Ask:** can root add GFN at 4K with VRR.

**What we know:** there is no GFN app for VIDAA, and the browser on these
builds is old Chromium (88 on the MTK9602 reference). Root does not add a
modern browser, controller support or the decode profile GFN needs. The
commenter's own 1080p60 experience is the honest signal.

**Next action:** answer once, briefly, and set the expectation. No repo work.

## 15. DV7 FEL + lossless eARC passthrough

**Who:** u/naaczej.

**Ask:** add Dolby Vision 7 FEL decoding and lossless audio passthrough.

**What we know:** both are below userspace. FEL needs the SoC's DV pipeline to
expose dual-layer decoding to whatever is playing; passthrough needs the HDMI
output format set through the vendor HAL. The audio probe on the reference unit
found that the TV's audio never enters a userspace ALSA stream at all
([tools/audio](../../tools/audio/README.md)), which is a strong signal against
an easy passthrough path. No evidence either is reachable from root.

**Next action:** answer honestly — "not from userspace, and here is the
measurement that says so". No repo work.

## 16. 50A7HAU report filed as an issue

**Who:** u/gonzule — Australian 50A7HAU, submitted test results as a GitHub
issue.

**What we know:** the model is already in
[inventory.json](../research/inventory.json) as `untested`, and the repo takes
reports by **PR**, not issue
([TESTED-MODELS.md](../research/TESTED-MODELS.md)). `scripts/report.py` does
the scaffolding.

**Next action:** not a Reddit reply — convert the issue to a PR (or do it for
them and credit them). This is the only item in the queue that is a merge, not
a message.

## 17. Non-root launcher on an EU model

**Who:** u/MrP3w, u/kyoukomiii, u/TheRealCockzilla — German thread, taken to DM.

**State:** already answered in-thread (MrP3w has a launcher running on an EU
model without root). Closed — but the DM means the details are not in the repo.
If MrP3w's unit differs from anything catalogued, it is worth asking for the
firmware string in public so the row exists.

## 18. Closed — no action

Thanks, motivation, the name, and the deleted-account echo: u/ImInYourCupboard,
u/imewx, u/okamagsxer, u/Eingel_M, u/r-day, u/Impossible-Age-5196,
u/possibly_matt, u/Sidpoppin, u/[deleted]. Two of these are worth keeping in
mind rather than answering: u/possibly_matt's art-mode complaint is the same
class of fix as the launcher (ads over a static image), and
u/Impossible-Age-5196's "was this only about ads" got the long answer already.

---

## Follow-on work this queue implies

Not started. Each is small and lands on its own, which is why they are listed
separately from the queue.

- **A. Launch an app by appId when it is absent from the launcher scene.**
  Item 2's real fix. `only` / `hidden` cannot reach an app the vendor keeps out
  of `getAppList({sceneCode:"launcher"})`, and "my app isn't there" is a
  recurring report class. The bridge already has the launch path; this is the
  lookup.
- **B. Publish the fb0-over-live-HDMI probe.** Item 1's result, whichever way
  it goes. A 20-line script and three named outcomes in `docs/research/`. It
  decides whether the overlay class is possible on MTK9602, and right now the
  repo says "untested" without saying how to test it.
- **C. A "rooted, method withheld" row shape.** Item 4 will need it, and
  `DISCLOSURE.md` already permits it. The inventory needs a way to record a
  positive result with no method, without it looking like a hole.

## Data still missing

The queue is waiting on firmware strings, not on us. Every one of these is a
one-line ask and becomes an inventory row:

| Who | Unit | Waiting on |
| --- | --- | --- |
| u/ProposalWarm3573 | 58E6KT (U9, MTK9602) | firmware string + probe outcome |
| u/Koty97 | ? | model + firmware string + `applist` dump |
| u/LulzTigre | U7K | firmware string + region |
| u/weneedalargership | 75E78QTUK + 55" | two firmware strings |
| u/Several_Emergency_94 | 55" U7N | firmware string |
| u/werokk | H50A6250UK | firmware string |
| u/Resident-Climate-443 | A6HV | firmware string |
| u/paokkerkir | Tesla-branded VIDAA | model + firmware string |
| u/zaStef | 55E8S | firmware string (only if the bug turns out to be ours) |
