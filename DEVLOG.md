# kai-sound-lab — devlog

A running log of decisions, findings, insights, and setbacks, written for
developers. This file is canonical in the repo and rendered inside the app —
click the version badge to get here. The private role-scoped decision vault
(`.deban/`, not committed) holds the longer-form rationale; this log is the
public trail.

---

## 2026-08-24 — Scaffold, core library, first ten sounds

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
