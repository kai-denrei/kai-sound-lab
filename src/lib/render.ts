import { generateNoise } from "./noise";
import { deriveSeed, mulberry32 } from "./prng";
import type { Layer, SfxRecipe } from "./recipe";
import { validateRecipe } from "./recipe";

/**
 * Graph builder shared by realtime preview (AudioContext) and deterministic
 * export (OfflineAudioContext). One code path, so what you hear in the lab
 * is what you export.
 */

export interface PlayOptions {
  /**
   * Seed for this instance's bounded variation. Defaults to the recipe seed
   * (canonical render). Pass a varying value to get the humanized family.
   */
  seed?: number;
  /** Scale variation ranges, 0..1+. 0 = canonical, exact render. */
  variationAmount?: number;
  when?: number;
  destination?: AudioNode;
}

interface InstanceVariation {
  pitchMul: number;
  gainMul: number;
  delayAddS: number;
}

function computeVariation(recipe: SfxRecipe, seed: number, amount: number): InstanceVariation {
  if (amount === 0) return { pitchMul: 1, gainMul: 1, delayAddS: 0 };
  const rng = mulberry32(seed);
  const bi = () => rng() * 2 - 1;
  const pitchMul = 1 + bi() * (recipe.variation.pitchPct / 100) * amount;
  const gainMul = Math.pow(10, (bi() * recipe.variation.gainDb * amount) / 20);
  const delayAddS = Math.max(0, bi() * (recipe.variation.timingMs / 1000) * amount);
  return { pitchMul, gainMul, delayAddS };
}

/**
 * Normalized tanh curve: y = tanh(kx)/tanh(k), k = 1 + drive·9.
 * Normalization keeps output within [-1,1] so drive raises density,
 * not level — the report's "saturation after gain control" advice.
 */
function driveCurve(drive: number): Float32Array {
  const n = 1025;
  const k = 1 + drive * 9;
  const norm = Math.tanh(k);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

function buildLayer(
  ctx: BaseAudioContext,
  layer: Layer,
  layerIndex: number,
  recipe: SfxRecipe,
  v: InstanceVariation,
  out: AudioNode,
  when: number,
): void {
  const t0 = when + (layer.delayMs ?? 0) / 1000 + v.delayAddS;
  const durS = layer.durMs / 1000;
  const { attackMs, decayMs, peak, curve } = layer.ampEnv;
  const attackS = Math.max(attackMs / 1000, 0.0015);
  const peakGain = Math.min(1, peak * v.gainMul);

  let source: AudioScheduledSourceNode;
  if (layer.source.kind === "osc") {
    const osc = new OscillatorNode(ctx, {
      type: layer.source.type,
      frequency: layer.source.freqHz * v.pitchMul,
    });
    if (layer.pitchEnv) {
      const { toHz, timeMs, curve: pCurve } = layer.pitchEnv;
      const target = Math.max(1, toHz * v.pitchMul);
      if (pCurve === "exp") {
        osc.frequency.exponentialRampToValueAtTime(target, t0 + timeMs / 1000);
      } else {
        osc.frequency.linearRampToValueAtTime(target, t0 + timeMs / 1000);
      }
    }
    source = osc;
  } else {
    const frames = Math.ceil(durS * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const noiseSeed = deriveSeed(recipe.seed, layerIndex);
    buffer.copyToChannel(generateNoise(layer.source.color, frames, noiseSeed) as Float32Array<ArrayBuffer>, 0);
    source = new AudioBufferSourceNode(ctx, { buffer });
  }

  const gain = new GainNode(ctx, { gain: 0 });
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + attackS);
  const holdS = (layer.ampEnv.holdMs ?? 0) / 1000;
  const decayStart = t0 + attackS + holdS;
  const endT = decayStart + decayMs / 1000;
  if (curve === "exp") {
    gain.gain.setValueAtTime(peakGain, decayStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, endT);
  } else {
    gain.gain.setValueAtTime(peakGain, decayStart);
    gain.gain.linearRampToValueAtTime(0, endT);
  }

  let head: AudioNode = source;
  let filterNode: BiquadFilterNode | undefined;
  if (layer.filter) {
    filterNode = new BiquadFilterNode(ctx, {
      type: layer.filter.type,
      frequency: layer.filter.freqHz,
      Q: layer.filter.q ?? 1,
      gain: layer.filter.gainDb ?? 0,
    });
    if (layer.filter.env) {
      const { toHz, timeMs, curve: fCurve } = layer.filter.env;
      filterNode.frequency.setValueAtTime(layer.filter.freqHz, t0);
      if (fCurve === "exp") {
        filterNode.frequency.exponentialRampToValueAtTime(Math.max(10, toHz), t0 + timeMs / 1000);
      } else {
        filterNode.frequency.linearRampToValueAtTime(Math.max(10, toHz), t0 + timeMs / 1000);
      }
    }
    head.connect(filterNode);
    head = filterNode;
  }
  if (layer.drive) {
    const shaper = new WaveShaperNode(ctx, {
      curve: driveCurve(layer.drive),
      oversample: "2x",
    });
    head.connect(shaper);
    head = shaper;
  }
  head.connect(gain);
  gain.connect(out);

  if (layer.lfo) {
    const { target, rateHz, depth, shape } = layer.lfo;
    const lfoOsc = new OscillatorNode(ctx, { type: shape, frequency: rateHz });
    const scale = new GainNode(ctx, { gain: 0 });
    lfoOsc.connect(scale);
    if (target === "gain") {
      // env drives gain.gain to peakGain; recenter so output swings
      // peakGain·(1−depth) .. peakGain: subtract depth/2, modulate ±depth/2.
      const mod = new GainNode(ctx, { gain: 1 - depth / 2 });
      // reroute: head → mod → gain instead of head → gain
      head.disconnect(gain);
      head.connect(mod);
      mod.connect(gain);
      scale.gain.value = depth / 2;
      scale.connect(mod.gain);
    } else if (target === "freq" && source instanceof OscillatorNode) {
      scale.gain.value = depth; // cents
      scale.connect(source.detune);
    } else if (target === "filter" && filterNode) {
      scale.gain.value = depth; // Hz
      scale.connect(filterNode.frequency);
    }
    lfoOsc.start(t0);
    lfoOsc.stop(t0 + durS + 0.05);
  }

  source.start(t0);
  source.stop(t0 + durS + 0.05);
}

/** Build the full recipe graph into any context. */
export function buildGraph(
  ctx: BaseAudioContext,
  recipe: SfxRecipe,
  opts: PlayOptions = {},
): void {
  validateRecipe(recipe);
  const when = opts.when ?? ctx.currentTime;
  const seed = opts.seed ?? recipe.seed;
  const amount = opts.variationAmount ?? 0;
  const v = computeVariation(recipe, seed, amount);

  const master = new GainNode(ctx, { gain: recipe.master.gain });
  const pan = new StereoPannerNode(ctx, { pan: recipe.master.pan ?? 0 });
  master.connect(pan);
  pan.connect(opts.destination ?? ctx.destination);

  recipe.layers.forEach((layer, i) => buildLayer(ctx, layer, i, recipe, v, master, when));
}

/**
 * Deterministic export path. Same recipe + same seed should produce the same
 * buffer — modulo browser float differences, which is an open QA question,
 * not a settled fact.
 */
export async function renderOffline(
  recipe: SfxRecipe,
  opts: { sampleRate?: number; seed?: number; variationAmount?: number } = {},
): Promise<AudioBuffer> {
  const sampleRate = opts.sampleRate ?? 48000;
  const frames = Math.ceil((recipe.master.durMs / 1000) * sampleRate);
  const ctx = new OfflineAudioContext(2, frames, sampleRate);
  buildGraph(ctx, recipe, { when: 0, seed: opts.seed, variationAmount: opts.variationAmount });
  return ctx.startRendering();
}
