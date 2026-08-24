# kai-sound-lab — devlog

A running log of decisions, findings, insights, and setbacks, written for
developers. This file is canonical in the repo and rendered inside the app —
click the version badge to get here. The private role-scoped decision vault
(`.deban/`, not committed) holds the longer-form rationale; this log is the
public trail.

---

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
