/**
 * Curated library manifest — the single source of truth for every file
 * under public/curated/. tests/curated.test.ts enforces the bijection:
 * no entry without a file, no file without an entry, licenses within
 * the floor (CC0 / CC BY only), attribution flags consistent.
 */

export type CuratedLicense = "CC0-1.0" | "CC-BY-4.0" | "CC-BY-3.0";

export interface CuratedSound {
  id: string;
  name: string;
  setId: string;
  /** Path under public/, e.g. "curated/interface/click-01.wav" */
  file: string;
  durMs: number;
  /** URL of the exact source asset/pack page */
  source: string;
  author: string;
  license: CuratedLicense;
  attributionRequired: boolean;
  /** Curatorial voice: why this sound is in the set */
  note: string;
}

export interface CuratedSet {
  id: string;
  name: string;
  blurb: string;
  /** The synth family this set mirrors, by family name */
  mirrorsFamily: string;
}

export const curatedSets: CuratedSet[] = [
  {
    id: "interface",
    name: "Interface & UI",
    blurb: "Recorded and designed UI feedback — the real-world counterpart of the UI family.",
    mirrorsFamily: "UI & Interface",
  },
  {
    id: "impacts",
    name: "Impacts & Materials",
    blurb: "Physical hits and material tells — compare against the modal synthesis in Melee & Materials.",
    mirrorsFamily: "Melee & Materials",
  },
  {
    id: "weapons",
    name: "Weapons & Sci-Fi",
    blurb: "Designed weapon fire and sci-fi energy — the sampled cousins of the Weapons family.",
    mirrorsFamily: "Weapons",
  },
];

const KENNEY_INTERFACE = "https://kenney.nl/assets/interface-sounds";
const KENNEY_IMPACT = "https://kenney.nl/assets/impact-sounds";
const KENNEY_SCIFI = "https://kenney.nl/assets/sci-fi-sounds";

const kenney = (
  setId: string,
  slug: string,
  name: string,
  durMs: number,
  source: string,
  note: string,
): CuratedSound => ({
  id: `${setId}.${slug}`,
  name,
  setId,
  file: `curated/${setId}/${slug}.wav`,
  durMs,
  source,
  author: "Kenney",
  license: "CC0-1.0",
  attributionRequired: false,
  note,
});

export const curatedSounds: CuratedSound[] = [
  // ---- Interface & UI (Kenney Interface Sounds, CC0) ----
  kenney("interface", "click-01", "Click", 97, KENNEY_INTERFACE,
    "The canonical designed click — compare its soft attack against the synth UI family's sharper sine-thump clicks."),
  kenney("interface", "select-01", "Select", 40, KENNEY_INTERFACE,
    "Forty milliseconds, in and out. A reference point for how little a selection tick actually needs."),
  kenney("interface", "toggle-01", "Toggle", 136, KENNEY_INTERFACE,
    "Two-state feel in a single gesture — the pitch step communicates on/off without any visual."),
  kenney("interface", "switch-01", "Switch", 608, KENNEY_INTERFACE,
    "A longer mechanical throw with real travel time; note how duration alone implies a heavier control."),
  kenney("interface", "confirm-01", "Confirmation", 539, KENNEY_INTERFACE,
    "Rising two-note confirmation — the interval does the semantic work, exactly what the synth confirm preset imitates."),
  kenney("interface", "error-01", "Error", 104, KENNEY_INTERFACE,
    "Short, dry, slightly dissonant. Errors that nag get muted; this one informs and leaves."),
  kenney("interface", "back-01", "Back", 91, KENNEY_INTERFACE,
    "Falling contour for backward navigation — direction encoded in pitch, the mirror of a confirm."),
  kenney("interface", "open-01", "Open", 148, KENNEY_INTERFACE,
    "Panel-open whoosh-click hybrid; the noise component carries the sense of motion."),
  kenney("interface", "close-01", "Close", 148, KENNEY_INTERFACE,
    "The paired close to open-01 — same length, inverted gesture. Pairs teach more than singles."),
  kenney("interface", "question-01", "Question", 330, KENNEY_INTERFACE,
    "Rising inflection as audio punctuation — the interrogative contour borrowed straight from speech."),

  // ---- Impacts & Materials (Kenney Impact Sounds, CC0) ----
  kenney("impacts", "wood-heavy", "Wood, heavy", 310, KENNEY_IMPACT,
    "Recorded wood: near-harmonic knock killed fast — the real-world target of the synth family's 60ms wood modes."),
  kenney("impacts", "metal-heavy", "Metal, heavy", 114, KENNEY_IMPACT,
    "Bright inharmonic clang; hear the unequal partial decays the modal presets approximate with ratio tables."),
  kenney("impacts", "glass-heavy", "Glass, heavy", 238, KENNEY_IMPACT,
    "Glass reads as material almost entirely through its noisy fracture spectrum, not pitch."),
  kenney("impacts", "soft-heavy", "Soft body, heavy", 569, KENNEY_IMPACT,
    "The no-modes case: pure damped thud. This is the flesh end of the damping continuum."),
  kenney("impacts", "punch-heavy", "Punch, heavy", 649, KENNEY_IMPACT,
    "Designed combat punch — note the added low sweetener no real fist produces. Fiction beats physics."),
  kenney("impacts", "plank-medium", "Plank", 779, KENNEY_IMPACT,
    "Loose board with rattle-back — the secondary bounces sell the object's freedom to move."),
  kenney("impacts", "bell-heavy", "Bell", 1741, KENNEY_IMPACT,
    "Long inharmonic ring — maximum sustain on the damping continuum, the opposite pole from flesh."),
  kenney("impacts", "plate-heavy", "Plate armor", 494, KENNEY_IMPACT,
    "Layered metal clatter; compare against the synth armor hit's single-object modal ring."),
  kenney("impacts", "tin-medium", "Tin", 156, KENNEY_IMPACT,
    "Thin cheap metal — fast decay plus buzzy partials read as 'hollow and light', not 'small'."),
  kenney("impacts", "mining-pick", "Mining pick", 805, KENNEY_IMPACT,
    "Tool-on-rock with debris tail — the causal garnish (falling grit) does the storytelling."),

  // ---- Weapons & Sci-Fi (Kenney Sci-Fi Sounds, CC0) ----
  kenney("weapons", "laser-small", "Laser, small", 236, KENNEY_SCIFI,
    "Compact descending zap — the archetype the synth laser presets chase with pitch envelopes."),
  kenney("weapons", "laser-retro", "Laser, retro", 255, KENNEY_SCIFI,
    "Deliberately 8-bit-flavored; hear the stepped pitch that signals 'videogame' rather than 'weapon'."),
  kenney("weapons", "laser-large", "Laser, large", 721, KENNEY_SCIFI,
    "Big-bore energy shot: longer body, lower center, wide noise layer — size is duration plus bandwidth."),
  kenney("weapons", "explosion-crunch", "Explosion, crunch", 777, KENNEY_SCIFI,
    "Mid-field explosion with crunchy transient cluster — compare the synth family's close explosion."),
  kenney("weapons", "explosion-low", "Explosion, low", 1000, KENNEY_SCIFI,
    "Almost pure low-frequency event; distance rendered as spectrum, exactly like the synth distant-explosion preset."),
  kenney("weapons", "forcefield", "Force field", 954, KENNEY_SCIFI,
    "Sustained energy shimmer — a texture, not an event; useful contrast to the one-shot presets."),
  kenney("weapons", "thruster", "Thruster", 5000, KENNEY_SCIFI,
    "Five-second loopable thrust bed; listen for the loop point the pure one-shots never need."),
  kenney("weapons", "metal-ricochet", "Metal ricochet", 777, KENNEY_SCIFI,
    "Projectile-on-hull impact with a whining tail — impact and flight fused into one gesture."),
  kenney("weapons", "engine-circular", "Engine, circular", 5000, KENNEY_SCIFI,
    "Rotating machine drone — periodic amplitude motion reads as circular mechanics."),
  kenney("weapons", "engine-low", "Engine, low", 5000, KENNEY_SCIFI,
    "Low idle rumble bed — the ambience end of the sci-fi palette, against which one-shots are mixed."),
];
