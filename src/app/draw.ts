/**
 * Waveform drawing — the catalog's artwork is rendered by the synthesis
 * engine itself. Min/max column reduction of the actual AudioBuffer, on an
 * oscilloscope-style millimeter grid.
 */

const GRID = "#e6ebef";
const TRACE = "#0b7a63";

export function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  const cell = 8;
  ctx.beginPath();
  for (let x = cell; x < w; x += cell) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
  for (let y = cell; y < h; y += cell) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
  ctx.stroke();

  const data = buffer.getChannelData(0);
  const mid = h / 2;
  const perCol = Math.max(1, Math.floor(data.length / w));

  ctx.fillStyle = TRACE;
  for (let x = 0; x < w; x++) {
    let min = 0, max = 0;
    const start = x * perCol;
    for (let i = start; i < Math.min(start + perCol, data.length); i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const y0 = mid - max * (mid - 3);
    const y1 = mid - min * (mid - 3);
    ctx.fillRect(x, y0, 1, Math.max(1, y1 - y0));
  }
}
