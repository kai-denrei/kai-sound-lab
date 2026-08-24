import { GENERATOR_VERSION } from "../lib";

export const proceduralProvenance = {
  type: "procedural-original",
  recordedSources: false,
  downloadedAudioSources: false,
  generatorVersion: GENERATOR_VERSION,
} as const;
