import type { SfxRecipe } from "../lib/recipe";
import { uiPresets } from "./ui";
import { mechPresets } from "./mech";
import { weaponPresets } from "./weapons";
import { meleePresets } from "./melee";
import { fxPresets } from "./fx";
import { enginePresets } from "./engines";
import { whooshPresets } from "./whooshes";

export interface PresetFamily {
  id: string;
  name: string;
  presets: SfxRecipe[];
}

export const families: PresetFamily[] = [
  { id: "ui", name: "UI", presets: uiPresets },
  { id: "mech", name: "Mechanical", presets: mechPresets },
  { id: "weapons", name: "Weapons", presets: weaponPresets },
  { id: "melee", name: "Melee & Materials", presets: meleePresets },
  { id: "fx", name: "Impacts & FX", presets: fxPresets },
  { id: "engines", name: "Engines", presets: enginePresets },
  { id: "whooshes", name: "Whooshes", presets: whooshPresets },
];

export const allPresets: SfxRecipe[] = families.flatMap((f) => f.presets);
