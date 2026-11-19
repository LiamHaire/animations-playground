// Where the explosion's first flash sits in its drawing, and how much of Earth each frame hides when that flash is placed
// on the Patterns impact point at a given scale. Usage: node ref-frames/explosion-cover.mjs [scale...]
import { chromium } from "playwright-core";
const scales = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage();
await p.goto("http://localhost:3002/");
const r = await p.evaluate(async (scales) => {
  const W = 1536, H = 860, IMPACT = [1100, 530], EARTH = [960, 540], ER = 191;
  const load = (n) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `/src/animations/explosion/frames/e${String(n).padStart(2, "0")}.svg`; });
  const alpha = [];
  for (let n = 1; n <= 23; n++) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.drawImage(await load(n), 0, 0, W, H);
    alpha.push(g.getImageData(0, 0, W, H).data);
  }
  // bbox of the first frame's ink
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[0][(y * W + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const origin = [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)];
  const out = { origin, bbox: [x0, y0, x1, y1], scales: {} };
  for (const s of scales) {
    const left = IMPACT[0] - origin[0] * s, top = IMPACT[1] - origin[1] * s;
    const cover = alpha.map((a) => {
      let hit = 0, n = 0;
      for (let y = EARTH[1] - ER; y <= EARTH[1] + ER; y += 4) for (let x = EARTH[0] - ER; x <= EARTH[0] + ER; x += 4) {
        if ((x - EARTH[0]) ** 2 + (y - EARTH[1]) ** 2 > ER * ER) continue;
        n++;
        const dx = Math.floor((x - left) / s), dy = Math.floor((y - top) / s);
        if (dx >= 0 && dy >= 0 && dx < W && dy < H && a[(dy * W + dx) * 4 + 3] > 0) hit++;
      }
      return Math.round((hit / n) * 1000) / 10;
    });
    out.scales[s] = { left: Math.round(left), top: Math.round(top), cover };
  }
  return out;
}, scales);
console.log("origin", r.origin, "bbox", r.bbox);
for (const [s, v] of Object.entries(r.scales)) console.log(`scale ${s} at (${v.left}, ${v.top}):`, v.cover.map((c, i) => `${i + 1}:${c}`).join(" "));
await b.close();
