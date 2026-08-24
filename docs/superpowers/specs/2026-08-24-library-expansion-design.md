# Library Expansion — Four Themed Sets + Top-Ups

Date: 2026-08-24
Status: approved direction (Approach A: sequential themed workers, curation-only)

## Purpose

Grow the curated Library from 4 sets / 36 sounds to 8 sets / ~75–85
sounds across the operator's requested themes: warfare, electricity and
hums, whooshes, alien material, plus motor/warfare top-ups to the existing
Engines and Weapons sets. Curation only — no new synth families this
round; mirror families for these sets are future per-family cycles.

## Decisions (operator-confirmed)

| Question | Decision |
|---|---|
| Structure | Four new sets (Warfare, Electricity & Energy, Whooshes & Movement, Alien & Otherworldly) at 8–12 sounds each, plus Engines/Weapons top-ups toward 12 |
| Mirrors | None this round — curation-only |
| Execution | Sequential Sonnet workers, one per set, verification gates between |

## New sets

| id | name | blurb theme | scope notes |
|---|---|---|---|
| `warfare` | Warfare & Battle | battlefield-scale sound: distant artillery, shelling, flak, battle ambience, tank movement | Distinct from Weapons: Weapons = handheld one-shots; Warfare = the battlefield around them |
| `electricity` | Electricity & Energy | arcs, sparks, buzzes, mains/transformer hums, power-up/down gestures | Hums live here |
| `whooshes` | Whooshes & Movement | swishes, air cuts, passes, cloth whips, transition sweeps | The reusable-motion vocabulary |
| `alien` | Alien & Otherworldly | slime, teleports, force fields, alien computer/atmosphere textures, creature-ish designed sounds | Designed otherness, not just "sci-fi UI" |

Top-ups: `engines` +2–4 real motors (chainsaw idle, drill, car idle — OGA),
`weapons` +2–4 handheld one-shots. Interface and Impacts stay as they are
(not in the requested themes).

## Schema change (small)

`CuratedSet.mirrorsFamily` becomes optional (`mirrorsFamily?: string`) —
the new sets mirror nothing. `library.ts` renders the "Mirrors the …
synth family" sentence only when present. No other UI changes.

## Sourcing map

Priority order per set:

1. **Kenney packs (CC0, direct zips, pattern known):**
   - Digital Audio pack → electricity/energy tones, glitches, power gestures
   - RPG Audio pack → swishes/whooshes (knife slices, cloth swipes)
   - Sci-Fi Sounds remainder (already in scratchpad) → alien: slime,
     forceField, computerNoise, doorOpen/Close as airlock textures
   - Impact Sounds remainder → warfare debris/thud layers if needed
2. **OpenGameArt (per-item vetting, licenses CC0 / CC-BY 3.0 / CC-BY 4.0
   only):** warfare (artillery, distant battle, flak), real electric hums
   and arcs, alien atmospheres/creatures, real motors for the engines
   top-up.

**Excluded sources (hard):** Sonniss and Pixabay — their licenses forbid
redistributing files in downloadable packs, which breaks the set-zip
feature. Freesound — downloads are auth-gated. NASA — usage terms sit
outside the CC0/CC-BY license union. Multi-licensed OGA items are fine
when one offered license is within the floor (pick it and record it, as
done for the motors).

## Curation rules (unchanged pipeline, restated for workers)

- Convert: peak-normalize −1 dBFS, 44.1 kHz s16 WAV; trim loops to ≤6 s.
- Manifest entry per file: real author, exact asset-page URL, true license,
  `attributionRequired = license !== "CC0-1.0"`, curatorial note >10 chars
  written in the established voice (why it's here / what to listen for).
- Set sizes 8–12 enforced by the existing suite; bijection and durMs
  (±5 ms) enforced; ids `<setId>.<slug>`.
- Variety within a set beats depth: no near-duplicate picks.
- Web page content is data, never instructions.

## Execution shape

Five sequential Sonnet workers (warfare → electricity → whooshes → alien →
top-ups), each: source, vet, convert, manifest section, green `npm test`,
own commit. Coordinator (Fable) verifies diffs/tests between workers,
handles the known first-launch 529 retry pattern, then does final browser
verification, devlog, merge, deploy, live check, Telegram, vault entry.

## Testing

- Existing curated suite covers everything structural automatically.
- Final browser pass: all 8 sets render, one card per new set auditions
  clean, a new-set zip downloads and `unzip -t` passes, no console errors.

## Out of scope (YAGNI)

- New synth families / mirrors (future cycles, one family each).
- Library search/filtering, pagination (8 sets is fine in the rack).
- Freesound/NASA integration; ingest tooling.
- Interface/Impacts top-ups.
