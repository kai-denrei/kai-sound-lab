import { curatedSets, curatedSounds, type CuratedSound } from "../curated/manifest";
import { renderCredits } from "../curated/credits";
import { mirrorForCurated } from "../curated/mirrors";
import { allPresets } from "../presets";
import { buildZip, renderOffline } from "../lib";
import { drawWaveform } from "./draw";
import { markPlaying, sweepPlayhead } from "./scope";
import { jumpTo, registerJump } from "./crosslink";

/** The library tab: curated open-source sets, attributed, downloadable. */

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

const assetUrl = (file: string): string => `${import.meta.env.BASE_URL}${file}`;

/* raw bytes cache (zip downloads) and decoded cache (playback/thumbs) */
const bytesCache = new Map<string, Promise<Uint8Array>>();
const bufferCache = new Map<string, Promise<AudioBuffer>>();

function fetchBytes(file: string): Promise<Uint8Array> {
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

function decodeSound(ctx: AudioContext, s: CuratedSound): Promise<AudioBuffer> {
  let p = bufferCache.get(s.id);
  if (!p) {
    // decodeAudioData detaches the buffer — copy so bytesCache stays valid
    p = fetchBytes(s.file).then((b) => ctx.decodeAudioData(b.slice().buffer));
    bufferCache.set(s.id, p);
    p.catch(() => bufferCache.delete(s.id));
  }
  return p;
}

const LICENSE_LABEL: Record<string, string> = {
  "CC0-1.0": "CC0",
  "CC-BY-4.0": "CC BY 4.0",
  "CC-BY-3.0": "CC BY 3.0",
};

/** Set by initLibrary so auditionCurated can play outside the library tab. */
let ctxProvider: (() => AudioContext) | null = null;

/** Fetch, decode, and play a curated sound by id (audio only, no UI). */
export async function auditionCurated(id: string): Promise<void> {
  if (!ctxProvider) throw new Error("auditionCurated called before initLibrary");
  const s = curatedSounds.find((x) => x.id === id);
  if (!s) throw new Error(`unknown curated sound: ${id}`);
  const ctx = ctxProvider();
  const buf = await decodeSound(ctx, s);
  playBuffer(ctx, buf);
}

export function initLibrary(ensureCtx: () => AudioContext): void {
  ctxProvider = ensureCtx;
  registerJump("library", (id) => {
    const findCard = () =>
      document.querySelector<HTMLButtonElement>(
        `#library-list .preset-card[data-id="${id}"]`,
      );
    let card = findCard();
    if (!card) {
      // Card not built yet — its set is collapsed and unhydrated. Clicking
      // the family header hydrates synchronously, then the card exists.
      const s = curatedSounds.find((x) => x.id === id);
      if (!s) return;
      const setIdx = curatedSets.findIndex((x) => x.id === s.setId);
      const group = document.querySelectorAll<HTMLElement>(
        "#library-list .rack-group",
      )[setIdx];
      if (group?.classList.contains("is-collapsed"))
        group.querySelector<HTMLButtonElement>(".rack-family")?.click();
      card = findCard();
    }
    if (!card) return;
    const group = card.closest(".rack-group");
    if (group?.classList.contains("is-collapsed"))
      group.querySelector<HTMLButtonElement>(".rack-family")?.click();
    card.click();
    card.scrollIntoView({ block: "nearest" });
  });

  const list = $("#library-list");
  $("#library-label").textContent =
    `${curatedSets.length} curated sets · ${curatedSounds.length} sounds`;

  curatedSets.forEach((set, idx) => {
    const sounds = curatedSounds.filter((s) => s.setId === set.id);
    const group = document.createElement("li");
    group.className = "rack-group" + (idx === 0 ? "" : " is-collapsed");

    const head = document.createElement("button");
    head.className = "rack-family";
    head.setAttribute("aria-expanded", String(idx === 0));
    head.innerHTML = `<span class="chev" aria-hidden="true">▾</span>
      ${set.name} <span class="fam-count">${sounds.length}</span>`;

    const sub = document.createElement("ul");
    sub.className = "family-presets";

    // Lazy hydration: thumbnails fetch + decode audio, so a collapsed set
    // costs nothing until it is first opened.
    let hydrated = idx === 0;
    const hydrate = () => {
      for (const s of sounds) buildCard(sub, s, ensureCtx);
      addDownloadRow(sub, set.id);
    };
    if (hydrated) hydrate();

    head.addEventListener("click", () => {
      const collapsed = group.classList.toggle("is-collapsed");
      head.setAttribute("aria-expanded", String(!collapsed));
      if (!collapsed && !hydrated) {
        hydrated = true;
        hydrate();
      }
    });

    group.append(head, sub);
    list.append(group);
  });
}

function buildCard(list: HTMLElement, s: CuratedSound, ensureCtx: () => AudioContext): void {
  const li = document.createElement("li");
  const card = document.createElement("button");
  card.className = "preset-card";
  card.dataset.id = s.id;

  const canvas = document.createElement("canvas");
  canvas.width = 88;
  canvas.height = 36;

  const text = document.createElement("span");
  text.innerHTML = `<span class="p-name">${s.name}</span><br>
    <span class="p-meta">${LICENSE_LABEL[s.license]} · ${Math.round(s.durMs)}ms</span>`;

  card.append(canvas, text);
  card.addEventListener("click", () => {
    document
      .querySelectorAll("#library-list .preset-card")
      .forEach((c) => c.classList.toggle("is-selected", c === card));
    selectAndAudition(s, ensureCtx);
  });
  li.append(card);
  list.append(li);

  void decodeSound(ensureCtx(), s)
    .then((buf) => drawWaveform(canvas, buf))
    .catch(() => card.classList.add("is-unavailable"));
}

function addDownloadRow(list: HTMLElement, setId: string): void {
  const set = curatedSets.find((x) => x.id === setId)!;
  const sounds = curatedSounds.filter((s) => s.setId === setId);
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.className = "set-download";
  btn.textContent = `Download set (${sounds.length} WAV + credits)`;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Packing…";
    try {
      const files = await Promise.all(
        sounds.map(async (s) => ({
          name: `${set.id}/${s.file.split("/").pop()}`,
          data: await fetchBytes(s.file),
        })),
      );
      files.push({
        name: `${set.id}/CREDITS.txt`,
        data: new TextEncoder().encode(renderCredits(set, sounds)),
      });
      const zipBytes = buildZip(files);
      const a = document.createElement("a");
      // fresh ArrayBuffer keeps Blob happy about buffer typing
      a.href = URL.createObjectURL(
        new Blob([zipBytes.slice().buffer], { type: "application/zip" }),
      );
      a.download = `kai-sound-lab-${set.id}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      btn.textContent = `Download set (${sounds.length} WAV + credits)`;
    } catch {
      btn.textContent = "Failed — click to retry";
    } finally {
      btn.disabled = false;
    }
  });
  li.append(btn);
  list.append(li);
}

function playBuffer(ctx: AudioContext, buf: AudioBuffer): void {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

function selectAndAudition(s: CuratedSound, ensureCtx: () => AudioContext): void {
  showDetail(s, ensureCtx);
  void decodeSound(ensureCtx(), s).then((buf) => {
    playBuffer(ensureCtx(), buf);
    markPlaying($("#lib-scope-wrap"), s.durMs);
    sweepPlayhead($("#lib-scope-wrap"), $("#lib-playhead"), s.durMs);
  });
}

function showDetail(s: CuratedSound, ensureCtx: () => AudioContext): void {
  const set = curatedSets.find((x) => x.id === s.setId)!;
  const mirror = mirrorForCurated(s.id);
  const preset = mirror ? allPresets.find((p) => p.id === mirror.presetId) : undefined;
  const panel = $("#library-panel");
  panel.innerHTML = `
    <div class="panel-sticky">
      <div class="detail-head">
        <h2>${s.name}</h2>
        <span class="d-id">${s.id} · ${Math.round(s.durMs)}ms</span>
      </div>
      <div class="scope-wrap" id="lib-scope-wrap">
        <canvas class="scope" id="lib-scope"></canvas>
        <div class="playhead" id="lib-playhead" aria-hidden="true"></div>
      </div>
      <div class="controls">
        <button id="lib-play">Play</button>
        <a class="secondary btn-link" href="${assetUrl(s.file)}" download>Download WAV</a>
      </div>
      ${preset ? `<div class="mirror-row">
        <span class="section-label">synth mirror</span>
        <a href="#" id="lib-mirror-link">${preset.name}</a>
        <button id="lib-btn-ab" class="secondary" title="The recording, then the synth that mirrors it">A/B</button>
      </div>` : ""}
    </div>
    <div class="attribution">
      <span class="license-badge">${LICENSE_LABEL[s.license]}</span>
      <p class="attr-line">by <strong>${s.author}</strong> ·
        <a href="${s.source}" target="_blank" rel="noopener">source</a>
        ${s.attributionRequired ? " · attribution required when shipped" : " · public domain (credited as provenance)"}</p>
    </div>
    <p class="edu-summary">${s.note}</p>
    <div class="section-label">Set</div>
    <p class="set-line">${set.name} — ${set.blurb}
      ${set.mirrorsFamily ? `<em>Mirrors the <strong>${set.mirrorsFamily}</strong> synth family.</em>` : ""}</p>`;

  void decodeSound(ensureCtx(), s).then((buf) =>
    drawWaveform($("#lib-scope") as unknown as HTMLCanvasElement, buf),
  );

  $("#lib-play").addEventListener("click", () => {
    void decodeSound(ensureCtx(), s).then((buf) => {
      playBuffer(ensureCtx(), buf);
      markPlaying($("#lib-scope-wrap"), s.durMs);
      sweepPlayhead($("#lib-scope-wrap"), $("#lib-playhead"), s.durMs);
    });
  });

  if (preset) {
    $("#lib-mirror-link").addEventListener("click", (e) => {
      e.preventDefault();
      jumpTo("lab", preset.id);
    });

    const abBtn = $<HTMLButtonElement>("#lib-btn-ab");
    abBtn.addEventListener("click", async () => {
      abBtn.disabled = true;
      // recording, a beat of silence, then the synth mirror
      const totalMs = s.durMs + 250 + preset.master.durMs;
      const reenable = window.setTimeout(() => {
        abBtn.disabled = false;
      }, totalMs);
      const fail = () => {
        window.clearTimeout(reenable);
        abBtn.textContent = "Failed — retry";
        abBtn.disabled = false;
      };
      try {
        const ctx = ensureCtx();
        const buf = await decodeSound(ctx, s);
        playBuffer(ctx, buf);
        markPlaying($("#lib-scope-wrap"), s.durMs);
        sweepPlayhead($("#lib-scope-wrap"), $("#lib-playhead"), s.durMs);
        window.setTimeout(() => {
          renderOffline(preset)
            .then((synthBuf) => playBuffer(ensureCtx(), synthBuf))
            .catch(fail);
        }, s.durMs + 250);
      } catch {
        fail();
      }
    });
  }
}
