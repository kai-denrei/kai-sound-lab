import { describe, expect, it } from "vitest";
import { renderCredits } from "../src/curated/credits";
import type { CuratedSet, CuratedSound } from "../src/curated/manifest";

const set: CuratedSet = {
  id: "interface",
  name: "Interface & UI",
  blurb: "b",
  mirrorsFamily: "UI & Interface",
};

const cc0: CuratedSound = {
  id: "ui.click-01",
  name: "Click 01",
  setId: "interface",
  file: "curated/interface/click-01.wav",
  durMs: 120,
  source: "https://kenney.nl/assets/interface-sounds",
  author: "Kenney",
  license: "CC0-1.0",
  attributionRequired: false,
  note: "a clean reference click",
};

const ccby: CuratedSound = {
  ...cc0,
  id: "ui.blip-02",
  name: "Blip 02",
  file: "curated/interface/blip-02.wav",
  source: "https://opengameart.org/content/example",
  author: "Jane Doe",
  license: "CC-BY-4.0",
  attributionRequired: true,
};

describe("renderCredits", () => {
  const text = renderCredits(set, [cc0, ccby]);

  it("names the set and the lab", () => {
    expect(text).toContain("Interface & UI");
    expect(text).toContain("kai sound lab");
  });
  it("credits every sound with author, source, and license", () => {
    for (const s of [cc0, ccby]) {
      expect(text).toContain(s.name);
      expect(text).toContain(s.author);
      expect(text).toContain(s.source);
      expect(text).toContain(s.license);
    }
  });
  it("notes the modifications made during curation", () => {
    expect(text.toLowerCase()).toContain("converted to wav");
  });
  it("spells out the CC BY attribution obligation", () => {
    expect(text).toContain("requires attribution");
  });
});
