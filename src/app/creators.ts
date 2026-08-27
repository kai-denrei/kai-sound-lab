import {
  creatorPacks,
  creatorSounds,
  creators,
  groupLabels,
  soundsInPack,
  type Creator,
  type CreatorPack,
  type CreatorSound,
} from "../creators/manifest";
import { allPresets } from "../presets";
import { renderOffline } from "../lib";
import { drawWaveform } from "./draw";
import { markPlaying, sweepPlayhead } from "./scope";
import { jumpTo, registerJump } from "./crosslink";
import { addVoice, stopAll } from "./transport";
import { assetExists, assetUrl, decodeBuffer, playBuffer } from "./audio-assets";

/**
 * The creators tab: sound packs published by named creators under their own
 * terms.
 *
 * Unlike the curated library, this audio is gitignored — the packs are
 * licensed for use, not redistribution, so the published build hosts none of
 * it. A single HEAD probe per pack decides which of two states its cards
 * render in: hydrated and playable where the files are on disk, or a link-out
 * to the creator's own page where they are not. Same build, same code path;
 * only the filesystem differs.
 */

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Resolved once per pack, on first hydration. */
const packAvailable = new Map<string, Promise<boolean>>();

function isPackAvailable(pack: CreatorPack): Promise<boolean> {
  let p = packAvailable.get(pack.id);
  if (!p) {
    const first = soundsInPack(pack.id)[0];
    p = first ? assetExists(first.file) : Promise.resolve(false);
    packAvailable.set(pack.id, p);
  }
  return p;
}

const creatorOf = (pack: CreatorPack): Creator =>
  creators.find((c) => c.id === pack.creatorId)!;

const packOf = (s: CreatorSound): CreatorPack =>
  creatorPacks.find((p) => p.id === s.packId)!;

export function initCreators(ensureCtx: () => AudioContext): void {
  registerJump("creators", (id) => {
    const findCard = () =>
      document.querySelector<HTMLButtonElement>(
        `#creators-list .preset-card[data-id="${id}"]`,
      );
    let card = findCard();
    if (!card) {
      // Card not built yet — its pack is collapsed and unhydrated. Opening
      // every ancestor group hydrates it, then the card exists.
      const s = creatorSounds.find((x) => x.id === id);
      if (!s) return;
      const pack = document.querySelector<HTMLElement>(
        `#creators-list [data-pack="${s.packId}"]`,
      );
      for (const g of ancestorGroups(pack)) expand(g);
      card = findCard();
    }
    if (!card) return;
    for (const g of ancestorGroups(card)) expand(g);
    card.click();
    card.scrollIntoView({ block: "nearest" });
  });

  const list = $("#creators-list");
  $("#creators-label").textContent =
    `${creators.length} creator${creators.length === 1 ? "" : "s"} · ` +
    `${creatorPacks.length} pack${creatorPacks.length === 1 ? "" : "s"} · ` +
    `${creatorSounds.length} sounds`;

  creators.forEach((creator, idx) => {
    const packs = creatorPacks.filter((p) => p.creatorId === creator.id);
    const total = packs.reduce((n, p) => n + soundsInPack(p.id).length, 0);

    const group = document.createElement("li");
    group.className = "rack-group" + (idx === 0 ? "" : " is-collapsed");

    const head = document.createElement("button");
    head.className = "rack-family";
    head.setAttribute("aria-expanded", String(idx === 0));
    head.innerHTML = `<span class="chev" aria-hidden="true">▾</span>
      <span class="creator-name">${esc(creator.name)}
        <span class="creator-handle">@${esc(creator.handle)}</span></span>
      <span class="fam-count">${total}</span>`;
    head.addEventListener("click", () => toggle(group, head));

    const sub = document.createElement("ul");
    sub.className = "family-presets";
    for (const pack of packs) buildPackGroup(sub, pack, ensureCtx);

    group.append(head, sub);
    list.append(group);
  });
}

/* ---------- rack ---------- */

function toggle(group: HTMLElement, head: HTMLElement): boolean {
  const collapsed = group.classList.toggle("is-collapsed");
  head.setAttribute("aria-expanded", String(!collapsed));
  return !collapsed;
}

function expand(group: HTMLElement): void {
  if (group.classList.contains("is-collapsed"))
    group.querySelector<HTMLButtonElement>(".rack-family")?.click();
}

function ancestorGroups(el: HTMLElement | null): HTMLElement[] {
  // Outermost first, so a creator opens before the pack nested inside it.
  const out: HTMLElement[] = [];
  for (let n = el?.closest<HTMLElement>(".rack-group"); n; ) {
    out.unshift(n);
    n = n.parentElement?.closest<HTMLElement>(".rack-group") ?? null;
  }
  return out;
}

function buildPackGroup(
  list: HTMLElement,
  pack: CreatorPack,
  ensureCtx: () => AudioContext,
): void {
  const sounds = soundsInPack(pack.id);

  const group = document.createElement("li");
  group.className = "rack-group is-pack";
  group.dataset.pack = pack.id;

  const head = document.createElement("button");
  head.className = "rack-family";
  head.setAttribute("aria-expanded", "false");
  head.innerHTML = `<span class="chev" aria-hidden="true">▾</span>
    ${esc(pack.name)} <span class="fam-count">${sounds.length}</span>`;

  const sub = document.createElement("ul");
  sub.className = "family-presets";

  // Lazy hydration: thumbnails fetch and decode audio, so a collapsed pack
  // costs nothing — not even the availability probe — until it is opened.
  let hydrated = false;
  const hydrate = async (): Promise<void> => {
    const available = await isPackAvailable(pack);
    addPackRow(sub, pack, available);
    let lastGroup = "";
    for (const s of sounds) {
      if (s.group !== lastGroup) {
        lastGroup = s.group;
        addGroupDivider(sub, s.group);
      }
      buildCard(sub, s, available, ensureCtx);
    }
  };

  head.addEventListener("click", () => {
    const open = toggle(group, head);
    if (open && !hydrated) {
      hydrated = true;
      void hydrate();
    }
  });

  group.classList.add("is-collapsed");
  group.append(head, sub);
  list.append(group);
}

function addGroupDivider(list: HTMLElement, group: string): void {
  const li = document.createElement("li");
  li.className = "rack-subgroup";
  li.textContent = groupLabels[group] ?? group;
  list.append(li);
}

function addPackRow(
  list: HTMLElement,
  pack: CreatorPack,
  available: boolean,
): void {
  const creator = creatorOf(pack);
  const li = document.createElement("li");
  li.className = "pack-row";
  li.innerHTML = `
    <a class="pack-link" href="${pack.url}" target="_blank" rel="noopener">
      ${available ? "Pack page ↗" : "Get the pack ↗"}
    </a>
    <button class="credit-copy" title="Copy the credit line">
      credit: ${esc(creator.creditLine)}
    </button>`;

  const btn = li.querySelector<HTMLButtonElement>(".credit-copy")!;
  btn.addEventListener("click", () => {
    void navigator.clipboard
      .writeText(creator.creditLine)
      .then(() => {
        btn.textContent = "copied ✓";
        window.setTimeout(() => {
          btn.textContent = `credit: ${creator.creditLine}`;
        }, 1400);
      })
      .catch(() => {
        btn.textContent = "copy failed";
      });
  });
  list.append(li);
}

function buildCard(
  list: HTMLElement,
  s: CreatorSound,
  available: boolean,
  ensureCtx: () => AudioContext,
): void {
  const li = document.createElement("li");
  const card = document.createElement("button");
  card.className = "preset-card" + (available ? "" : " is-linkout");
  card.dataset.id = s.id;

  const canvas = document.createElement("canvas");
  canvas.width = 88;
  canvas.height = 36;

  const text = document.createElement("span");
  text.innerHTML = `<span class="p-name">${esc(s.name)}</span><br>
    <span class="p-meta">${available ? `${Math.round(s.durMs)}ms` : "at the source ↗"}</span>`;

  card.append(canvas, text);
  card.addEventListener("click", () => {
    document
      .querySelectorAll("#creators-list .preset-card")
      .forEach((c) => c.classList.toggle("is-selected", c === card));
    if (available) selectAndAudition(s, ensureCtx);
    else showLinkOut(s);
  });
  li.append(card);
  list.append(li);

  // No fetch at all when the pack is absent — the probe already answered.
  if (available)
    void decodeBuffer(ensureCtx(), s.id, s.file)
      .then((buf) => drawWaveform(canvas, buf))
      .catch(() => card.classList.add("is-unavailable"));
}

/* ---------- panel ---------- */

function attributionBlock(pack: CreatorPack): string {
  const creator = creatorOf(pack);
  return `
    <div class="creator-block">
      <div class="section-label">Creator</div>
      <p class="attr-line"><strong>${esc(creator.name)}</strong> —
        <a href="${creator.url}" target="_blank" rel="noopener">${esc(creator.url.replace(/^https:\/\/|\/$/g, ""))}</a></p>
      <p class="creator-blurb">${esc(creator.blurb)}</p>
      <div class="section-label">Pack</div>
      <p class="attr-line"><a href="${pack.url}" target="_blank" rel="noopener">${esc(pack.name)} ↗</a>
        · <span class="license-badge">${esc(pack.licenseSummary)}</span></p>
      <blockquote class="license-terms">${esc(pack.licenseTerms)}</blockquote>
      <p class="credit-note">Credit as <code>${esc(creator.creditLine)}</code> when you ship it.</p>
    </div>`;
}

/** Panel for a sound whose audio is not hosted here. */
function showLinkOut(s: CreatorSound): void {
  const pack = packOf(s);
  $("#creators-panel").innerHTML = `
    <div class="panel-sticky">
      <div class="detail-head">
        <h2>${esc(s.name)}</h2>
        <span class="d-id">${esc(s.id)} · ${Math.round(s.durMs)}ms</span>
      </div>
      <p class="linkout-note">This pack is licensed for use, not redistribution,
        so the audio is not hosted here. It is free from the creator:</p>
      <div class="controls">
        <a class="btn-link" href="${pack.url}" target="_blank" rel="noopener">Get the pack from ${esc(creatorOf(pack).name)} ↗</a>
      </div>
    </div>
    <p class="edu-summary">${esc(s.note)}</p>
    ${attributionBlock(pack)}`;
}

function selectAndAudition(s: CreatorSound, ensureCtx: () => AudioContext): void {
  showDetail(s, ensureCtx);
  void decodeBuffer(ensureCtx(), s.id, s.file).then((buf) => {
    const voice = playBuffer(ensureCtx(), buf);
    addVoice(voice, s.durMs);
    markPlaying($("#cr-scope-wrap"), s.durMs);
    sweepPlayhead($("#cr-scope-wrap"), $("#cr-playhead"), s.durMs);
  });
}

function showDetail(s: CreatorSound, ensureCtx: () => AudioContext): void {
  const pack = packOf(s);
  const preset = s.mirrorsPresetId
    ? allPresets.find((p) => p.id === s.mirrorsPresetId)
    : undefined;

  $("#creators-panel").innerHTML = `
    <div class="panel-sticky">
      <div class="detail-head">
        <h2>${esc(s.name)}</h2>
        <span class="d-id">${esc(s.id)} · ${Math.round(s.durMs)}ms</span>
      </div>
      <div class="scope-wrap" id="cr-scope-wrap">
        <canvas class="scope" id="cr-scope"></canvas>
        <div class="playhead" id="cr-playhead" aria-hidden="true"></div>
      </div>
      <div class="controls">
        <button id="cr-play">Play</button>
        <button id="cr-btn-stop" class="secondary">Stop</button>
        <a class="secondary btn-link" href="${assetUrl(s.file)}" download>Download WAV</a>
      </div>
      ${preset ? `<div class="mirror-row">
        <span class="section-label">synth mirror</span>
        <a href="#" id="cr-mirror-link">${esc(preset.name)}</a>
        <button id="cr-btn-ab" class="secondary" title="The recording, then the synth that mirrors it">A/B</button>
      </div>` : ""}
    </div>
    <p class="edu-summary">${esc(s.note)}</p>
    ${attributionBlock(pack)}`;

  void decodeBuffer(ensureCtx(), s.id, s.file).then((buf) =>
    drawWaveform($<HTMLCanvasElement>("#cr-scope"), buf),
  );

  let abTimer: number | undefined;

  const play = () => {
    void decodeBuffer(ensureCtx(), s.id, s.file).then((buf) => {
      const voice = playBuffer(ensureCtx(), buf);
      addVoice(voice, s.durMs);
      markPlaying($("#cr-scope-wrap"), s.durMs);
      sweepPlayhead($("#cr-scope-wrap"), $("#cr-playhead"), s.durMs);
    });
  };

  $("#cr-play").addEventListener("click", play);

  $("#cr-btn-stop").addEventListener("click", () => {
    if (abTimer !== undefined) { clearTimeout(abTimer); abTimer = undefined; }
    stopAll();
    $("#cr-scope-wrap").classList.remove("is-playing");
  });

  if (preset) {
    $("#cr-mirror-link").addEventListener("click", (e) => {
      e.preventDefault();
      jumpTo("lab", preset.id);
    });

    const abBtn = $<HTMLButtonElement>("#cr-btn-ab");
    abBtn.addEventListener("click", async () => {
      abBtn.disabled = true;
      // the recording, a beat of silence, then the synth mirror
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
        const buf = await decodeBuffer(ctx, s.id, s.file);
        addVoice(playBuffer(ctx, buf), s.durMs);
        markPlaying($("#cr-scope-wrap"), s.durMs);
        sweepPlayhead($("#cr-scope-wrap"), $("#cr-playhead"), s.durMs);
        abTimer = window.setTimeout(() => {
          abTimer = undefined;
          renderOffline(preset)
            .then((synthBuf) => {
              addVoice(playBuffer(ensureCtx(), synthBuf), preset.master.durMs);
            })
            .catch(fail);
        }, s.durMs + 250);
      } catch {
        fail();
      }
    });
  }
}
