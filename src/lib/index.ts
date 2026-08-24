/**
 * kai-sound-lab — library entry point.
 * This is the product: the lab app is a consumer of this module, not the
 * other way around. Nothing in here may touch the DOM.
 */
export * from "./prng";
export * from "./recipe";
export * from "./noise";
export * from "./render";
export * from "./wav";
export * from "./zip";

export const GENERATOR_VERSION = "0.1.0";
