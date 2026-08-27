/**
 * Creator packs — sound libraries published by named creators under their own
 * terms, deliberately kept separate from src/curated/manifest.ts.
 *
 * The curated library enforces a hard licence floor (CC0 / CC BY only, checked
 * by tests/curated.test.ts) because everything in it is redistributed: hosted,
 * zipped, shipped. Creator packs do not clear that floor. They are licensed for
 * *use*, not redistribution, so their audio is gitignored and the published
 * build hosts nothing — the tab credits the creator and links to the source.
 *
 * Folding these entries into curatedSounds would mean loosening that floor,
 * which is the one thing that must not happen. Hence a parallel module with a
 * looser, prose-based licence model: terms are quoted verbatim rather than
 * flattened into an SPDX identifier that does not exist for them.
 *
 * tests/creators.test.ts checks the structure always, and checks the manifest
 * against files on disk only when they happen to be present.
 */

export interface Creator {
  id: string;
  name: string;
  /** The handle a game developer credits, without the @ */
  handle: string;
  url: string;
  blurb: string;
  /** Ready to paste into a credits screen */
  creditLine: string;
}

export interface CreatorPack {
  id: string;
  creatorId: string;
  name: string;
  /** The pack's own page, not the creator's profile */
  url: string;
  blurb: string;
  /** Short human summary, e.g. "Free — commercial use, credit requested" */
  licenseSummary: string;
  /** The creator's own words. Never paraphrase licence text. */
  licenseTerms: string;
}

export interface CreatorSound {
  id: string;
  packId: string;
  name: string;
  /** Path under public/, e.g. "creators/daniel-soundsgood/laser-weapons/beam-01.wav" */
  file: string;
  durMs: number;
  /** Partitions a pack into readable runs in the rack */
  group: string;
  /** Curatorial voice: what this file is and what it is worth hearing for */
  note: string;
  /** Set only where a genuine synth counterpart exists — drives the A/B button */
  mirrorsPresetId?: string;
}

/** Rack divider labels, keyed by CreatorSound.group. */
export const groupLabels: Record<string, string> = {
  beam: "continuous beams",
  "heavy-blast": "heavy blasts",
  "light-blast": "light blasts",
  reload: "reloads",
  handling: "weapon handling",
};

export const creators: Creator[] = [
  {
    id: "daniel-soundsgood",
    name: "Daniel SoundsGood",
    handle: "danielsoundsgood",
    url: "https://danielsoundsgood.itch.io/",
    blurb:
      "Game audio designer publishing weapon, combat and spell libraries on itch.io — free cuts alongside the full paid packs.",
    creditLine: "@danielsoundsgood",
  },
];

export const creatorPacks: CreatorPack[] = [
  {
    id: "laser-weapons",
    creatorId: "daniel-soundsgood",
    name: "Free Laser Weapon Sound Library",
    url: "https://danielsoundsgood.itch.io/laser-weapon-sound-library",
    blurb:
      "Fifty designed laser weapon sounds — sustained beams, heavy and light blasts, and the mechanical half of the vocabulary: reloads and handling. The free cut of a larger paid library.",
    licenseSummary: "Free · commercial use permitted · credit requested",
    licenseTerms:
      "non-exclusive license – you're free to use this library in your commercial games. " +
      "The creator asks that you add @danielsoundsgood to your game credits. " +
      "No license to claim as your own work.",
  },
];

const PACK = "laser-weapons";
const CREATOR = "daniel-soundsgood";

const snd = (
  slug: string,
  name: string,
  durMs: number,
  group: string,
  note: string,
  mirrorsPresetId?: string,
): CreatorSound => ({
  id: `${PACK}.${slug}`,
  packId: PACK,
  name,
  file: `creators/${CREATOR}/${PACK}/${slug}.wav`,
  durMs,
  group,
  note,
  ...(mirrorsPresetId ? { mirrorsPresetId } : {}),
});

export const creatorSounds: CreatorSound[] = [
  // ---- Continuous beams ----
  // Held tones rather than events: the first four end at roughly the level
  // they start, which is what makes them loopable under a trigger held down.
  snd("beam-01", "Continuous Beam 01", 2755, "beam",
    "Bright sustained beam — the energy at the end matches the start almost exactly, so it loops under a held trigger without a seam."),
  snd("beam-02", "Continuous Beam 02", 5589, "beam",
    "The longest hold in the pack at five and a half seconds, and the most tonal: low crossing rate, closer to a pitched drone than to noise.",
    "weapon.laser-beam"),
  snd("beam-03", "Continuous Beam 03", 2459, "beam",
    "Sustained but not static — it sheds a few dB across its length, giving a beam that reads as draining rather than infinite."),
  snd("beam-04", "Continuous Beam 04", 4519, "beam",
    "The airiest of the beams: high crossing rate over the quietest body, useful when the beam should sit under dialogue."),
  snd("beam-05", "Continuous Beam 05", 4684, "beam",
    "The one beam with a real release — a fast onset and then nearly thirty dB of decay, so it can end a burst instead of looping it."),

  // ---- Heavy blasts ----
  // Low-frequency dominant, and split between two designs: a handful of fast
  // punches and a majority built on a slow swell into the hit.
  snd("heavy-blast-01", "Heavy Blast 01", 910, "heavy-blast",
    "Almost no attack ramp — full level in under three milliseconds. The heaviest immediate punch here, with no charge-up to telegraph it."),
  snd("heavy-blast-02", "Heavy Blast 02", 1080, "heavy-blast",
    "Fast onset into a long clean fall. The standard-issue heavy shot: reads as powerful without occupying a full second of headroom."),
  snd("heavy-blast-03", "Heavy Blast 03", 2081, "heavy-blast",
    "A slow 180ms swell before the hit — the design telegraphs itself, which is what you want on an enemy's charged attack."),
  snd("heavy-blast-04", "Heavy Blast 04", 1201, "heavy-blast",
    "Hits full scale at the peak and drops thirty dB after. Compact, loud, and unambiguously the biggest thing in the mix for a moment."),
  snd("heavy-blast-05", "Heavy Blast 05", 1869, "heavy-blast",
    "Swell, hit, and a forty-four dB tail. Nearly two seconds of decay is a room being described, not just a weapon firing."),
  snd("heavy-blast-06", "Heavy Blast 06", 1285, "heavy-blast",
    "Mid-weight with a 160ms wind-up. Sits between the instant punches and the fully cinematic charges."),
  snd("heavy-blast-07", "Heavy Blast 07", 1105, "heavy-blast",
    "The quietest of the heavies by RMS — a heavy shot heard from a step back, useful for a secondary weapon in a firefight."),
  snd("heavy-blast-08", "Heavy Blast 08", 1955, "heavy-blast",
    "The lowest-centred sound in the pack. Almost all its energy is sub-bass, which is exactly the trick the synth Laser — Heavy preset imitates with its sub layer.",
    "weapon.laser-heavy"),
  snd("heavy-blast-09", "Heavy Blast 09", 1036, "heavy-blast",
    "Brighter than its siblings — more grit in the body, so it cuts through a busy mix where the sub-heavy blasts get buried."),
  snd("heavy-blast-10", "Heavy Blast 10", 1605, "heavy-blast",
    "Nearly fifty dB of decay from a modest body. Most of this file is tail, which is what sells the scale."),
  snd("heavy-blast-11", "Heavy Blast 11", 2615, "heavy-blast",
    "Two and a half seconds, full-scale peak, bright body. The pack's showpiece heavy shot."),
  snd("heavy-blast-12", "Heavy Blast 12", 2253, "heavy-blast",
    "The deepest tail here — fifty-two dB of fall over two seconds, and the second-lowest centre. A siege weapon rather than a rifle."),
  snd("heavy-blast-13", "Heavy Blast 13", 657, "heavy-blast",
    "Short, dense, and it ends louder than it starts. No tail at all — a heavy hit designed to be cut off, or layered under something else."),
  snd("heavy-blast-14", "Heavy Blast 14", 685, "heavy-blast",
    "The tightest usable heavy: under 700ms, fast attack, minimal decay. Repeatable at a fire rate the longer blasts cannot sustain."),
  snd("heavy-blast-15", "Heavy Blast 15", 1555, "heavy-blast",
    "Moderate swell into a twenty-eight dB fall. The middle of the heavy family in every measure — a reasonable default."),

  // ---- Light blasts ----
  // Faster and mid-centred. Where the heavies describe a room, these describe
  // a trigger pull.
  snd("light-blast-01", "Light Blast 01", 549, "light-blast",
    "Mid-bright, quick, twenty-two dB of fall. The generic light shot the rest of this group varies around."),
  snd("light-blast-02", "Light Blast 02", 550, "light-blast",
    "Same length as the first but a faster attack and a longer fall — a crisper trigger with more air behind it."),
  snd("light-blast-03", "Light Blast 03", 390, "light-blast",
    "The shortest blast in the pack. At under 400ms it can repeat fast enough to read as automatic fire."),
  snd("light-blast-04", "Light Blast 04", 475, "light-blast",
    "Fast onset over a dense body — the closest recorded analogue to the synth Laser — Zap preset's pitch-swept sine.",
    "weapon.laser-zap"),
  snd("light-blast-05", "Light Blast 05", 950, "light-blast",
    "An outlier: by far the lowest crossing rate here, almost no high content. A light weapon that still moves air."),
  snd("light-blast-06", "Light Blast 06", 694, "light-blast",
    "The brightest of the light blasts, with a 115ms ramp — thin and whining rather than percussive."),
  snd("light-blast-07", "Light Blast 07", 785, "light-blast",
    "Mid-weight with a moderate ramp. Reads as a charged shot from a small weapon rather than a snap."),
  snd("light-blast-08", "Light Blast 08", 798, "light-blast",
    "Barely decays across its length — a light blast that sustains, sitting between this group and the beams."),
  snd("light-blast-09", "Light Blast 09", 1090, "light-blast",
    "The longest light blast, with a 160ms swell and a thirty-four dB tail. Borrows the heavy blasts' shape at a smaller scale."),
  snd("light-blast-10", "Light Blast 10", 899, "light-blast",
    "A slow 170ms build into a modest fall. The most obviously 'charging' of the light group."),
  snd("light-blast-11", "Light Blast 11", 415, "light-blast",
    "Short and dense — the highest RMS of any light blast in the least time. The one to reach for when a small weapon needs to feel present."),

  // ---- Reloads ----
  // The mechanical half of the vocabulary: bright, detailed, quiet, and often
  // multi-part — a magazine out, in, and a charging handle, inside one file.
  snd("reload-01", "Reload 01", 862, "reload",
    "Bright mechanical detail over a fifty-six dB fall. The cleanest single-gesture reload here."),
  snd("reload-02", "Reload 02", 914, "reload",
    "Near-identical in shape to the first but quieter at the peak — the pair works as a two-variant set to avoid repetition."),
  snd("reload-03", "Reload 03", 717, "reload",
    "Runs backwards from the rest: it ends far louder than it begins, a build into a seating click rather than a click and a tail."),
  snd("reload-04", "Reload 04", 1114, "reload",
    "Full-scale peak, lower crossing rate than its neighbours — a heavier, less brittle mechanism."),
  snd("reload-05", "Reload 05", 849, "reload",
    "Bright and restrained at the peak. A reload for a weapon that is not trying to announce itself."),
  snd("reload-06", "Reload 06", 1405, "reload",
    "A 425ms ramp before the loudest moment — this is two gestures in one file, with real space between them."),
  snd("reload-07", "Reload 07", 735, "reload",
    "The brightest short reload: high crossing rate, tight, metallic. Small-arms rather than heavy weapon."),
  snd("reload-08", "Reload 08", 1438, "reload",
    "The slowest build in the pack — half a second before it reaches full level, and only six dB of fall after. A deliberate, weighty reload."),
  snd("reload-09", "Reload 09", 1025, "reload",
    "Full-scale peak two hundred milliseconds in, then a measured fall. A middle-weight mechanism with good separation between parts."),
  snd("reload-10", "Reload 10", 785, "reload",
    "Fast and very bright, with the steepest fall of the group at over fifty dB. The snappiest reload here."),
  snd("reload-11", "Reload 11", 1488, "reload",
    "The highest crossing rate in the pack and effectively no net decay — dense mechanical detail sustained across a second and a half."),
  snd("reload-12", "Reload 12", 1603, "reload",
    "Long, bright, full-scale. The most cinematic reload of the set, with room for a whole magazine change."),
  snd("reload-13", "Reload 13", 1147, "reload",
    "Bright and sustained, ending near the level it started. Layers well under a longer animation."),

  // ---- Weapon handling ----
  // The quietest material in the pack — foley-scale gestures rather than
  // events. Their original ordinals are non-contiguous because this is the
  // free cut of a larger library.
  snd("handling-12", "Handling 12", 777, "handling",
    "A quiet handling gesture with a thirty-five dB fall — the kind of sound a player notices only when it is missing."),
  snd("handling-19", "Handling 19", 560, "handling",
    "The quietest file in the pack by a wide margin, and among the brightest. Pure incidental detail."),
  snd("handling-26", "Handling 26", 448, "handling",
    "Short, bright and barely decaying — a mechanical contact worth A/B-ing against the synth heavy switch, which solves the same problem with modal ringing.",
    "mech.switch-heavy"),
  snd("handling-37", "Handling 37", 549, "handling",
    "Fast contact into a forty-three dB fall. Reads as something small being set down or latched."),
  snd("handling-44", "Handling 44", 912, "handling",
    "The longest handling gesture, with a 140ms ramp — a movement rather than a single contact."),
  snd("handling-48", "Handling 48", 484, "handling",
    "Mid-bright and quick. The most neutral of the handling sounds, and the safest to repeat."),
];

export const packsByCreator = (creatorId: string): CreatorPack[] =>
  creatorPacks.filter((p) => p.creatorId === creatorId);

export const soundsInPack = (packId: string): CreatorSound[] =>
  creatorSounds.filter((s) => s.packId === packId);

export const creatorForPack = (packId: string): Creator | undefined => {
  const pack = creatorPacks.find((p) => p.id === packId);
  return pack ? creators.find((c) => c.id === pack.creatorId) : undefined;
};
