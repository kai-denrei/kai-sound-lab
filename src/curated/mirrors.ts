/**
 * The 1:1 pairing between curated recordings and the synth presets that
 * mirror them. One file owns the relationship; tests/mirrors.test.ts
 * verifies both sides exist and neither repeats.
 */

export interface MirrorPair {
  curatedId: string;
  presetId: string;
}

export const mirrors: MirrorPair[] = [
  { curatedId: "engines.engine-low", presetId: "eng.idle-low" },
  { curatedId: "engines.engine-circular", presetId: "eng.circular" },
  { curatedId: "engines.thruster", presetId: "eng.thruster" },
  { curatedId: "engines.space-small", presetId: "eng.space-small" },
  { curatedId: "engines.space-large", presetId: "eng.space-large" },
  { curatedId: "engines.motor", presetId: "eng.motor" },
  { curatedId: "whooshes.swish-short", presetId: "whoosh.swish" },
  { curatedId: "whooshes.air-whoosh", presetId: "whoosh.air" },
  { curatedId: "whooshes.wind-whoosh-loop", presetId: "whoosh.wind" },
  { curatedId: "whooshes.erase-sweep", presetId: "whoosh.sweep" },
];

export const mirrorForCurated = (id: string): MirrorPair | undefined =>
  mirrors.find((m) => m.curatedId === id);
export const mirrorForPreset = (id: string): MirrorPair | undefined =>
  mirrors.find((m) => m.presetId === id);
