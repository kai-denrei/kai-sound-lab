import "./style.css";
import devlogRaw from "../../DEVLOG.md?raw";
import { allPresets, families } from "../presets";
import type { SfxRecipe } from "../lib/recipe";
import { audioBufferToWav, buildGraph, renderOffline } from "../lib";
import { drawWaveform } from "./draw";
import { renderMarkdown } from "./markdown";
import { initLibrary } from "./library";
import { markPlaying, sweepPlayhead } from "./scope";

/** The lab app is a consumer of src/lib — it holds no synthesis logic. */

let audioCtx: AudioContext | null = null;
const ensureCtx = (): AudioContext => {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
};

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

/* ---------- tabs & version badge ---------- */

type TabName = "lab" | "library" | "devlog";

function showTab(name: TabName): void {
  $("#view-lab").classList.toggle("is-hidden", name !== "lab");
  $("#view-library").classList.toggle("is-hidden", name !== "library");
  $("#view-devlog").classList.toggle("is-hidden", name !== "devlog");
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
    const active = b.dataset.tab === name;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}

function initTabs(): void {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) =>
    b.addEventListener("click", () => showTab(b.dataset.tab as TabName)),
  );
  // The version chip and the cache-busting corner badge both open the devlog:
  // the build token is the doorway to the story of how the build got here.
  $("#version-chip").addEventListener("click", () => showTab("devlog"));
  const token = document
    .querySelector<HTMLMetaElement>('meta[name="cb"]')
    ?.content?.slice(0, 8);
  if (token) $("#version-token").textContent = token;
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest?.("#cb-badge, .cb-badge, [data-cb-badge]");
    if (el) showTab("devlog");
  });
}

/* ---------- preset rack ---------- */

const thumbCache = new Map<string, AudioBuffer>();

async function thumbBuffer(recipe: SfxRecipe): Promise<AudioBuffer> {
  let buf = thumbCache.get(recipe.id);
  if (!buf) {
    buf = await renderOffline(recipe, { sampleRate: 24000 });
    thumbCache.set(recipe.id, buf);
  }
  return buf;
}

function buildRack(onSelect: (r: SfxRecipe) => void): void {
  const list = $("#preset-list");
  $(".rack-label").textContent =
    `${families.length} families · ${allPresets.length} presets`;
  families.forEach((family, idx) => {
    const group = document.createElement("li");
    group.className = "rack-group" + (idx === 0 ? "" : " is-collapsed");

    const head = document.createElement("button");
    head.className = "rack-family";
    head.setAttribute("aria-expanded", String(idx === 0));
    head.innerHTML = `<span class="chev" aria-hidden="true">▾</span>
      ${family.name} <span class="fam-count">${family.presets.length}</span>`;
    head.addEventListener("click", () => {
      const collapsed = group.classList.toggle("is-collapsed");
      head.setAttribute("aria-expanded", String(!collapsed));
    });

    const sub = document.createElement("ul");
    sub.className = "family-presets";
    for (const recipe of family.presets) buildCard(sub, recipe, onSelect);

    group.append(head, sub);
    list.append(group);
  });
}

function buildCard(
  list: HTMLElement,
  recipe: SfxRecipe,
  onSelect: (r: SfxRecipe) => void,
): void {
  {
    const li = document.createElement("li");
    const card = document.createElement("button");
    card.className = "preset-card";
    card.dataset.id = recipe.id;

    const canvas = document.createElement("canvas");
    canvas.width = 88;
    canvas.height = 36;

    const text = document.createElement("span");
    text.innerHTML = `<span class="p-name">${recipe.name}</span><br>
      <span class="p-meta">${recipe.id} · ${recipe.master.durMs}ms</span>`;

    card.append(canvas, text);
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".preset-card")
        .forEach((c) => c.classList.toggle("is-selected", c === card));
      onSelect(recipe);
    });
    li.append(card);
    list.append(li);

    void thumbBuffer(recipe).then((buf) => drawWaveform(canvas, buf));
  }
}

/* ---------- detail panel ---------- */

function layerRows(recipe: SfxRecipe): string {
  return recipe.layers
    .map((l) => {
      const src =
        l.source.kind === "osc"
          ? `${l.source.type} ${l.source.freqHz}Hz` +
            (l.pitchEnv ? ` → ${l.pitchEnv.toHz}Hz/${l.pitchEnv.timeMs}ms` : "")
          : `${l.source.color} noise`;
      const filt = l.filter ? `${l.filter.type} ${l.filter.freqHz}Hz Q${l.filter.q ?? 1}` : "—";
      return `<tr><td>${l.id}</td><td>${src}</td>
        <td>${l.ampEnv.attackMs}/${l.ampEnv.decayMs}ms ${l.ampEnv.curve}</td>
        <td>${filt}</td><td>${l.delayMs ?? 0}ms</td></tr>`;
    })
    .join("");
}

function claimBlocks(recipe: SfxRecipe): string {
  return recipe.education.claims
    .map(
      (c) => `<div class="claim">
        <span class="basis ${c.basis}">${c.basis}</span>
        <span>${c.text}${c.source ? `<span class="c-source">${c.source}</span>` : ""}</span>
      </div>`,
    )
    .join("");
}

function showDetail(recipe: SfxRecipe): void {
  const panel = $("#detail-panel");
  panel.innerHTML = `
    <div class="panel-sticky">
      <div class="detail-head">
        <h2>${recipe.name}</h2>
        <span class="d-id">${recipe.id} · v${recipe.version} · seed ${recipe.seed}</span>
      </div>
      <div class="scope-wrap" id="scope-wrap">
        <canvas class="scope" id="scope"></canvas>
        <div class="playhead" id="playhead" aria-hidden="true"></div>
      </div>
      <div class="controls">
        <button id="btn-play">Play</button>
        <button id="btn-family" class="secondary" title="Five plays with bounded variation">Play ×5 varied</button>
        <label>seed <input type="number" id="in-seed" value="${recipe.seed}"></label>
        <label>variation <input type="range" id="in-var" min="0" max="1" step="0.05" value="0"> <span id="var-out">0.00</span></label>
        <button id="btn-export" class="secondary">Export WAV</button>
      </div>
    </div>
    <p class="edu-summary">${recipe.education.summary}</p>
    <div class="section-label">Why it works</div>
    ${claimBlocks(recipe)}
    <div class="section-label">Signal path</div>
    <table class="params">
      <tr><th>layer</th><th>source</th><th>env a/d</th><th>filter</th><th>delay</th></tr>
      ${layerRows(recipe)}
    </table>`;

  const scope = $<HTMLCanvasElement>("#scope");
  const scopeWrap = $("#scope-wrap");
  const playhead = $("#playhead");
  const seedInput = $<HTMLInputElement>("#in-seed");
  const varInput = $<HTMLInputElement>("#in-var");
  const varOut = $("#var-out");

  const currentSeed = () => Number(seedInput.value) || recipe.seed;
  const currentVar = () => Number(varInput.value);

  const redraw = async () => {
    const buf = await renderOffline(recipe, {
      seed: currentSeed(),
      variationAmount: currentVar(),
    });
    drawWaveform(scope, buf);
  };
  void redraw();

  varInput.addEventListener("input", () => {
    varOut.textContent = currentVar().toFixed(2);
    void redraw();
  });
  seedInput.addEventListener("change", () => void redraw());

  $("#btn-play").addEventListener("click", () => {
    const ctx = ensureCtx();
    buildGraph(ctx, recipe, { seed: currentSeed(), variationAmount: currentVar() });
    markPlaying(scopeWrap, recipe.master.durMs);
    sweepPlayhead(scopeWrap, playhead, recipe.master.durMs);
  });

  $("#btn-family").addEventListener("click", () => {
    const ctx = ensureCtx();
    const amount = currentVar() || 0.6;
    const spacingMs = recipe.master.durMs + 90;
    for (let i = 0; i < 5; i++) {
      buildGraph(ctx, recipe, {
        seed: currentSeed() + i * 7919,
        variationAmount: amount,
        when: ctx.currentTime + (i * spacingMs) / 1000,
      });
      sweepPlayhead(scopeWrap, playhead, recipe.master.durMs, i * spacingMs);
    }
    markPlaying(scopeWrap, 4 * spacingMs + recipe.master.durMs);
  });

  $("#btn-export").addEventListener("click", async () => {
    const buf = await renderOffline(recipe, {
      seed: currentSeed(),
      variationAmount: currentVar(),
    });
    const blob = new Blob([audioBufferToWav(buf)], { type: "audio/wav" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${recipe.id.replace(/\./g, "_")}_v${recipe.version}_seed${currentSeed()}.wav`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

/* ---------- boot ---------- */

/** Selecting a card auditions it immediately — Play is at distance zero. */
function selectAndAudition(recipe: SfxRecipe): void {
  showDetail(recipe);
  const ctx = ensureCtx();
  buildGraph(ctx, recipe);
  markPlaying($("#scope-wrap"), recipe.master.durMs);
  sweepPlayhead($("#scope-wrap"), $("#playhead"), recipe.master.durMs);
}

$("#devlog-body").innerHTML = renderMarkdown(devlogRaw);
initTabs();
buildRack(selectAndAudition);
initLibrary(ensureCtx);
