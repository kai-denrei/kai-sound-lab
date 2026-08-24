import type { SfxRecipe } from "../lib/recipe";
import { uiPresets } from "./ui";
import { mechPresets } from "./mech";
import { weaponPresets } from "./weapons";
import { fxPresets } from "./fx";

export interface PresetFamily {
  id: string;
  name: string;
  presets: SfxRecipe[];
}

export const families: PresetFamily[] = [
  { id: "ui", name: "UI", presets: uiPresets },
  { id: "mech", name: "Mechanical", presets: mechPresets },
  { id: "weapons", name: "Weapons", presets: weaponPresets },
  { id: "fx", name: "Impacts & FX", presets: fxPresets },
];

export const allPresets: SfxRecipe[] = families.flatMap((f) => f.presets);
