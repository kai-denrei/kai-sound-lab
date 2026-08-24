import type { CuratedSet, CuratedSound } from "./manifest";

const LICENSE_URLS: Record<string, string> = {
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-3.0": "https://creativecommons.org/licenses/by/3.0/",
};

/** Render the CREDITS.txt bundled into a set's zip download. */
export function renderCredits(set: CuratedSet, sounds: CuratedSound[]): string {
  const lines: string[] = [
    `${set.name} — curated sound set`,
    `from kai sound lab (https://kai-denrei.github.io/kai-sound-lab/)`,
    ``,
    `All sounds are open-licensed by their original creators. Files were`,
    `converted to WAV and peak-normalized for this set; no other changes.`,
    `Sounds under CC BY require attribution when you ship them — the`,
    `per-sound credits below are ready to copy into your own credits.`,
    ``,
  ];
  for (const s of sounds) {
    lines.push(
      `${s.name}`,
      `  by ${s.author}`,
      `  source: ${s.source}`,
      `  license: ${s.license} (${LICENSE_URLS[s.license]})` +
        (s.attributionRequired ? " — requires attribution" : ""),
      ``,
    );
  }
  return lines.join("\n");
}
