import type { Voice } from "../lib";

/**
 * Shared asset plumbing for the tabs that play files rather than synthesise
 * them — the curated library and the creator packs. Fetching, caching,
 * decoding and buffer playback are identical for both; only the manifests
 * they read from differ.
 */

export const assetUrl = (file: string): string =>
  `${import.meta.env.BASE_URL}${file}`;

/* raw bytes cache (zip downloads) and decoded cache (playback/thumbs) */
const bytesCache = new Map<string, Promise<Uint8Array>>();
const bufferCache = new Map<string, Promise<AudioBuffer>>();
const existsCache = new Map<string, Promise<boolean>>();

export function fetchBytes(file: string): Promise<Uint8Array> {
  let p = bytesCache.get(file);
  if (!p) {
    p = fetch(assetUrl(file)).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} fetching ${file}`);
      return new Uint8Array(await r.arrayBuffer());
    });
    bytesCache.set(file, p);
    p.catch(() => bytesCache.delete(file)); // allow retry after failure
  }
  return p;
}

/** Decode a file to an AudioBuffer, cached under a caller-supplied key. */
export function decodeBuffer(
  ctx: AudioContext,
  key: string,
  file: string,
): Promise<AudioBuffer> {
  let p = bufferCache.get(key);
  if (!p) {
    // decodeAudioData detaches the buffer — copy so bytesCache stays valid
    p = fetchBytes(file).then((b) => ctx.decodeAudioData(b.slice().buffer));
    bufferCache.set(key, p);
    p.catch(() => bufferCache.delete(key));
  }
  return p;
}

/**
 * Is this asset actually served? Creator pack audio is gitignored, so the
 * published build has none of it — one cached HEAD per pack decides whether
 * its cards hydrate or render as link-outs, rather than fifty 404s.
 */
export function assetExists(file: string): Promise<boolean> {
  let p = existsCache.get(file);
  if (!p) {
    p = fetch(assetUrl(file), { method: "HEAD" })
      .then((r) => r.ok)
      .catch(() => false);
    existsCache.set(file, p);
  }
  return p;
}

/** Play a decoded buffer, returning a Voice the transport registry can stop. */
export function playBuffer(ctx: AudioContext, buf: AudioBuffer): Voice {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  let stopped = false;
  return {
    stop(fadeMs = 20) {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      const end = now + fadeMs / 1000;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, end);
      } catch { /* torn down */ }
      try { src.stop(end); } catch { /* already stopped */ }
    },
  };
}
