# kai-sound-lab — devlog

A running log of decisions, findings, insights, and setbacks, written for
developers. This file is canonical in the repo and rendered inside the app —
click the version badge to get here. The private role-scoped decision vault
(`.deban/`, not committed) holds the longer-form rationale; this log is the
public trail.

---

## 2026-08-27 — A Creators tab, and a licence that would not fit the floor

[decision] **Some sound work does not clear the Library's floor, and that is
the point of a second tab.** The curated library enforces CC0 or CC BY,
nothing else, checked by `tests/curated.test.ts`. That floor is what lets
every set be hosted, zipped and shipped. Daniel SoundsGood's *Free Laser
Weapon Sound Library* is licensed *"non-exclusive license – you're free to
use this library in your commercial games"*, with credit requested and no
right to claim it as your own work. That is a grant to **use**, not to
**redistribute** — so it does not belong in the Library, and folding it in
would have meant loosening the floor for everything else. Creators is a
third tab with its own prose-based licence model, and `curated.test.ts` was
not touched.

[decision] **Terms are quoted verbatim, never paraphrased into a badge.**
`licenseTerms` holds the creator's own sentence. Flattening prose terms into
an SPDX-shaped label is how attribution quietly goes wrong; the quote is the
artefact, and the panel renders it as a quote.

[decision] **The audio is gitignored, and the gate is a fact about the disk
rather than a flag.** `public/creators/**/*.wav` never enters the repo. The
app fires one cached HEAD per pack: files present, cards hydrate with
waveforms, audition and A/B; files absent, cards render as link-outs to the
creator and nothing else is fetched. Same build, same code path — a flag
would have been a second source of truth that could disagree with the disk.

[decision] **The import script is the only record of how the files were
made.** Because the bytes are uncommitted, `scripts/import-creator-pack.sh`
is what makes them reproducible: 48 kHz/32-bit float to the project's
44.1 kHz/16-bit convention, kebab-case renaming that preserves each file's
original ordinal so it traces back to the pack. It deliberately skips the
peak normalisation the curated sets get — re-levelling a creator's own mix
sits badly beside "no license to claim as your own work".

[setback] **A 200 is not proof a file exists.** The availability probe first
checked `r.ok`, and Vite's dev server answers a missing path with the SPA
`index.html` fallback at 200. So with the audio moved aside the probe
reported it present, all fifty cards fetched, all fifty failed, and the
whole rack went dead — `.is-unavailable` sets `pointer-events: none`, so the
symptom was cards that could not even be clicked. The content type is the
honest signal: `audio/*` when the file is really there, `text/html` when you
have been handed the app instead.

[setback] **Every cross-tab jump in dev had been a silent no-op, and the
cache-busting token was why.** Chasing the Creators A/B mirror link led to a
pre-existing bug: `bust.sh` appended `?v=<token>` to the `<script
type="module">` entry, and a dev server keys its module graph by full URL.
`./crosslink` reached through `main.ts?v=abc` and the same file reached
through `library.ts` resolved to two different module records, each with its
own module-level state. `main.ts` registered the tab switcher on one
instance; `library.ts` registered its jump handler on the other. `jumpTo`'s
optional-call syntax — `switchTab?.(tab)` — swallowed the mismatch without
an error, so it failed by doing nothing at all. Production was always fine,
because the bundler dedupes, which is exactly why it survived this long.
`transport.ts`'s voice registry and the asset caches were forking the same
way. Module entry points are no longer fingerprinted; content-hashed
bundles already give that guarantee without splitting the graph.

[insight] **Optional-call syntax is a good way to lose a bug.** `a?.(x)`
reads as defensive, but on a registry that is *supposed* to be populated it
converts a loud failure into silence. Both halves of `jumpTo` were guarded
that way, so a duplicated module produced no error, no warning, and no
behaviour — the hardest shape of bug to notice.

[insight] **Gitignoring an asset is not the same as never shipping it.**
`vite build` copies all of `public/` into `dist/`, so a build run on the
machine that has the files put all fifty into the output. The gitignore only
ever protected a build made from a clone. A `closeBundle` hook now deletes
them after the copy, so the guarantee no longer depends on remembering which
machine deployed.

[finding] **Curatorial notes came from measurement, not impression.** Fifty
files is more than can be honestly described by ear in one pass, so peak,
RMS, attack time, zero-crossing rate and start-to-end energy ratio were
computed for each. The groups separated cleanly: heavy blasts are
low-centred and split between instant punches and slow telegraphed swells;
reloads are bright, quiet and often multi-part; four of the five beams end
at the level they start, which is what makes them loop under a held trigger.
Several notes cite those numbers directly.

---

## 2026-08-24 — Whooshes, and a STOP button that meant rethinking playback

[decision] **Whooshes family: four archetype mirrors.** Swish, air, wind,
sweep — one synth preset each, mirroring a curated whoosh recording. Motion
turns out to be almost entirely a filtered-noise sweep: a bandpass climbing
is the object cutting through air, the amplitude arc is its pass. No new
primitive — the wind gust is a filter LFO, the swishes are one-directional
filter envelopes. Everything the Engines work added carried straight over.

[decision] **STOP forced playback to grow a handle.** Until now `buildGraph`
and the library's `playBuffer` were fire-and-forget — they returned nothing,
so a 4-second wind bed or a running A/B could not be stopped. `buildGraph`
now returns a `Voice { stop(fadeMs) }` that ramps its master gain to zero
over 20ms (click-free) and stops its nodes, guarded so a double-stop is a
no-op. A tiny app-layer `transport` registry tracks live voices; STOP is
`stopAll()`. Both tabs share one AudioContext, so one registry silences
everything.

[insight] **The click ramp is the whole trick.** Calling `.stop()` on a
source mid-sample clicks — a hard discontinuity. Ramping the gain to zero
over 20ms first, then stopping the (now silent) source, is the difference
between a stop and a pop. Cheap, and it's why the Voice owns a gain node
rather than just a source reference.

[insight] **STOP mid-A/B exposed a hidden scheduler.** The A/B button plays
recording, waits, plays synth — that wait is a `setTimeout`. `stopAll()`
kills sounding voices but can't un-schedule a future one, so pressing STOP
during the gap would have fired the second sound into the silence. The fix
was to capture that timer id and clear it in the STOP handler. A reminder
that "stop everything" includes the things not playing *yet*.

## 2026-08-24 — Library doubles: four themed sets, curated in parallel

[decision] **The Library went from 4 sets to 8, 36 sounds to 82.** Four new
themed sets — Warfare & Battle, Electricity & Energy, Whooshes & Movement,
Alien & Otherworldly — plus top-ups that bring Weapons to 12 and Engines to
10. All CC0 or CC BY 3.0/4.0, every file attributed, every license vetted on
its own asset page.

[decision] **Warfare is not Weapons.** The line we drew: Weapons is the hand
(handheld one-shots — pistol, reload, shotgun, laser), Warfare is the
horizon (cannon fire, shell bursts, war drums, air-raid alarm, the storm
after). Two sets, one battlefield, no overlap — a taxonomy that tells the
user where to look.

[decision] **`mirrorsFamily` became optional.** These sets mirror no synth
family (curation-only this round), so the type dropped the requirement and
the detail pane renders the "Mirrors the … synth family" line only when a
pairing exists. One-line schema change, no migration.

[insight] **Curation parallelizes cleanly; the manifest is the bottleneck.**
Five workers, one per set, each sourcing and vetting independently — but all
writing the same `manifest.ts` and racing the same validation suite, so they
ran sequentially, not concurrently. The real work is download-and-vet bound,
not compute bound, so sequential cost little and the green-commit-per-set
gate caught nothing broken because each worker validated before landing.

[insight] **The license floor does real filtering.** Workers rejected a
steady stream of near-misses on their own: CC-BY-SA explosion packs, BY-4.0
sword swings that were actually fine but flagged for review, .7z-only assets
that break the direct-download pipeline. The floor plus "direct file URL
only" turned out to be a strong, cheap quality filter — the junk never
entered the repo.

## 2026-08-24 — Engines: the first sustained textures, and the first mirrors

[decision] **The LFO is the engine primitive.** One optional per-layer
field — `lfo: { target: gain|freq|filter, rateHz, depth, shape }` — plus
`holdMs` on the amp envelope. That's the entire schema cost of moving from
one-shot events to sustained textures. Both renderers got it in one place
because the graph builder was already shared.

[decision] **Mirrors are a registry, not a field.** The 1:1 pairing between
curated recordings and synth presets lives in one file (`mirrors.ts`),
tested for existence in both directions. Neither the manifest nor the
recipe schema knows the other exists.

[decision] **Real motors entered the library** — two OpenGameArt CC-BY 3.0
loops (Nayckron's heavy vehicle, qubodup's toy car) join Kenney's sci-fi
drives. First attribution-required content; the A/B button now sits next
to a license badge that actually obligates.

[insight] **Rotation is amplitude modulation.** The circular engine
recording reads as "rotating machine" because one noise band swells ~4.5
times a second — and a sine LFO on bandpassed pink noise reproduces the
identity instantly. But A/B against the recording exposes the gap: the
real sweep is asymmetric (fast rise, slow fall), a sine is symmetric. The
mirror doesn't just demonstrate the technique; it locates precisely what
the technique still lacks.

[insight] **A recording's mess is its signature.** The synth idle is
cleaner than Kenney's engine-low, the synth motor steadier than the real
tank loop — and both sound cheaper for it. The curated set keeps making
the same argument from the other side: the imperfections are the fiction's
credibility.

## 2026-08-24 — The Library: curated recordings enter the building

[decision] **Third tab: Library.** Thirty curated open-source sounds
(Kenney, CC0) in three sets that mirror the synth families — Interface &
UI, Impacts & Materials, Weapons & Sci-Fi. The identity boundary holds:
recipes stay canonical in the Lab; the Library is explicitly *other
people's recordings*, attributed even though CC0 doesn't require it,
because provenance is part of the education.

[decision] **Manifest as source of truth.** Every file under
`public/curated/` must have a typed manifest entry; a test suite enforces
the bijection, the license floor (CC0/CC BY only), attribution-flag
consistency, and that each entry's stated duration matches the actual
RIFF header within 5ms. Curation errors are now build failures.

[decision] **Set downloads are zipped client-side** with a ~100-line
STORE-method ZIP writer — WAV barely compresses, so DEFLATE would buy
bytes we don't need at the cost of a dependency. Each zip carries a
generated CREDITS.txt whose per-sound lines are ready to paste into a
game's own credits.

[insight] **The parallel rack earns its keep.** Because curated files are
decoded to AudioBuffers, every existing affordance — waveform thumbnails,
the scope, the playhead sweep — worked on recordings without modification.
The comparison the tab exists for (synthesized vs. recorded, side by
side, same instruments) fell out of the architecture for free.

[insight] **Recorded references sharpen the synth ear.** Kenney's 40ms
`select` tick is a lesson in restraint no spec would teach: the designed
click is *softer* than our synth clicks, the designed punch has a low-end
sweetener no real fist produces. Fiction beats physics, and now the
evidence is one tab away.

## 2026-08-24 — Melee & Materials: the damping continuum

[decision] **Fifth family: Melee & Materials** — sword clash, mace vs wood /
stone / armor / flesh. 27 presets total.

[insight] **Materials are data, not code.** Every impact in the family is
the same four-part anatomy (contact + body + modes + texture); the material
is just the mode table. Metal = inharmonic ratios (1.0/1.47/2.13/3.82/5.19)
with long unequal decays; wood = near-harmonic modes killed in 60 ms; stone
= two modes under 25 ms plus fracture grit; flesh = no modes at all, only a
lowpass slamming shut. The five presets sit on one axis — the **damping
continuum** — and as decay approaches zero, material identity migrates from
the resonance into the noise texture. Not one new engine primitive was
needed.

[insight] **Size transposes, material persists.** The armor hit reuses the
sword's exact mode ratios at a 480 Hz base instead of 1120 Hz — bigger
object, lower modes, same fingerprint. That one substitution makes blade and
plate audibly the same material but audibly different objects, which is the
modal model earning its keep.

[insight] **The causal garnish sells the event.** Sword scrape, falling
stone debris, the single dulled bone knock in the flesh hit — small noise
layers that resonance can't express but that recruit the listener's whole
causal interpretation. Cheap to add, disproportionate in effect.

[decision] **POC validated → scope opens to three new families.** Mechanical
(aircraft switch, tactile/clicky keyboard), Weapons (three lasers, 9mm,
.50 cal), Impacts & FX (close/distant explosion, mortar launch, gore splat).
Twelve new presets, 22 total. The rack now groups by family.

[decision] **Two engine primitives added, and only two.** `drive` (a
normalized tanh waveshaper per layer — gunshot crack, explosion density) and
filter envelopes (cutoff ramps — collapsing explosion tails, wet squelches).
The tanh curve is normalized by `tanh(k)` so drive raises spectral density
without raising level — saturation after gain control, per the report.
Granular, FM, and delay lines stayed out; nothing in these twelve sounds
needed them.

[insight] **A damped sine layer IS a modal resonator.** The planned "modal
resonator bank" primitive turned out to be unnecessary: a sine oscillator
with a 1 ms attack and exponential decay is exactly one mode. The aircraft
switch's metal ring is three inharmonic sine layers (1560/2470/3890 Hz) with
unequal decays — the modal-synthesis result from the impact-perception
literature, expressed in primitives the engine already had.

[insight] **Caliber is spectrum, not volume.** The .50 cal is the 9mm plus:
a concussion layer whose lowpass collapses 900→250 Hz, a 48 Hz sub, double
decay, heavier drive — at a *lower* master gain than the pistol. Size lives
in low-frequency energy and decay length; if "bigger gun" is only "louder",
the mix is already lost. Same lesson inverted for distance: the distant
explosion is defined by what's *removed* (the crack, the highs).

[insight] **Organic = irregular timing.** The gore splat's three squish
blips land at 30/70/115 ms — deliberately uneven. Regular spacing reads as
mechanical; irregular micro-events read as liquid/organic. That plus a
fast-closing lowpass is the entire "wet" illusion — no samples, three
bandpassed noise bursts.

[finding] **Loud-but-short needs headroom management.** Multi-layer
transients (crack at 0.95 + blast at 0.7 + thump at 0.6) sum past full
scale at onset; master gains for weapons/explosions sit at 0.7–0.8 to
compensate. A proper peak-normalization pass on export (render once,
measure, scale) is the obvious next engine step — noted, not yet built.

[decision] **The recipe is the canonical asset, not the WAV.** A sound in
this library is `synthesis graph + parameters + taxonomy + perceptual target
+ education claims + bounded variation + provenance + seed`. WAV files are
reproducible *exports*. This comes straight from the deep-research report's
central recommendation, and it is what makes the library diffable, testable,
and expandable.

[decision] **Library-first architecture.** `src/lib/` is the product: pure
TypeScript + Web Audio, zero DOM access, exportable as a package. The lab app
(`src/app/`) is its first consumer. If the import ever has to flow the other
way, something has gone wrong.

[decision] **Two-tier provenance is project law.** Tier one:
`procedural-original` — pure math, no recorded or downloaded sources, ever.
Tier two: `external-cc0` — imported CC0 assets with full license provenance.
The TypeScript provenance union keeps them structurally apart; validation
rejects a procedural recipe that claims any recorded source. All ten
Milestone-1 presets are tier one.

[decision] **Education metadata ships in v1 as data, not essays.** Every
preset carries a `summary` plus claims tagged `evidence` (backed by
psychoacoustics research) or `convention` (learned interface grammar). The
app renders the two differently — teal vs amber — because presenting a
convention as science is exactly the failure mode the research report warns
about. Example: roughness-as-danger is evidence; rising-pitch-as-positive is
convention.

[finding] **The widely-copied Paul Kellet pink-noise snippet clips.** With
the usual `* 0.25` output scaling, measured peaks hit **1.89** (nearly +6 dB
over full scale) across 50 seeds × 1 s. The property test caught it on the
first run. Fixed by scaling to 0.11 and hard-clamping as an explicit
contract: `generateNoise` output is always within [-1, 1]. If you've pasted
that snippet from the internet into your own project, measure it.

[insight] **Noise must come from the seeded PRNG, never `Math.random()`.**
Web Audio has no noise node, so noise lives in generated buffers — and one
`Math.random()` call anywhere in the render path silently breaks the whole
"same recipe + same seed = same sound" promise. Same reason every layer gets
a *derived* sub-seed: independent streams, no accidental correlation between
a preset's transient and its body.

[insight] **One graph builder for preview and export.** `buildGraph()` takes
any `BaseAudioContext`, so the realtime preview (`AudioContext`) and the
deterministic export (`OfflineAudioContext`) share one code path. What you
hear in the lab is what you export — there is no second implementation to
drift.

[setback] **Offline-render determinism across browsers is unverified.** The
reproducibility promise currently holds within one browser; whether two
browsers (or two versions) produce bit-identical `OfflineAudioContext`
output is an open question — float rounding and node implementations differ.
Until the cross-browser spike runs, treat exported WAVs as reproducible *per
environment*, and expect QA to need spectral-feature comparison rather than
sample-exact diffing.

[setback] **kainode's usage monitor is broken.** `check-usage.sh --quiet`
died with a Python syntax error (`print(int(max(, )))`) and printed empty
percentages. Built this session without a budget reading. Needs a fix on the
ops side; logged so it doesn't get forgotten.

[decision] **The devlog lives in the app.** This file is imported raw at
build time, rendered by a ~70-line markdown subset renderer (escaped first,
no dependencies), and opens when you click the cache-busting version badge.
Rationale: the version token tells you *which* build you're looking at; the
devlog tells you *why* the build is the way it is. Same doorway.

[decision] **Milestone 1 scope: the UI family, ten presets.** Hover, click,
confirm, cancel, error, disabled, toggle-on/off, slider-tick, modal-open.
Smallest family that exercises the full pipeline (recipe → render → export →
metadata) and is immediately reusable in web projects. The report's full
30-preset set waits until the recipe format has survived contact with these
ten.

[insight] **The catalog draws itself.** Preset thumbnails are rendered by
the synthesis engine through `OfflineAudioContext` at load — the waveform on
each card *is* the sound, not an illustration of it. A nice side effect:
if a recipe change breaks a sound's envelope, the catalog shows it before
you press play.

---

## 2026-08-24 — Project inception (pre-code)

[decision] **Research intake before architecture.** Started from a deep
research report on game SFX as designed information-bearing signals:
perception → taxonomy → synthesis recipes → procedural mapping → tooling.
Key adopted principles: onsets carry timing, timbre carries identity,
roughness is reserved for danger, repetition needs bounded variation that
preserves identity, masking is an information-design problem.

[finding] **The research covers games deeply, web thinly.** The psychology
of sound in *web* design — notification fatigue, autoplay hostility, audio
accessibility — is nearly absent from the founding report. Flagged as a
follow-up research pass before the educational layer grows web-specific
claims it can't back.

[decision] **Stack: TypeScript + Web Audio API + JSON-serializable recipes
+ seeded PRNG (mulberry32) + Vite + Vitest.** No framework, no audio
dependencies, no font CDN. The report's recommendation, adopted after
confirming it fits a library-first shape. Pure Data / SuperCollider /
middleware are downstream targets, not the canonical format.
