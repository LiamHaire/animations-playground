// Usage: node scripts/fill-dino.mjs <name>[:biteRegion[:gap]] ...
// gap (px, frame scale) closes breaks in the outline up to about twice that wide, for drawings whose line isn't sealed.
// Gives a Figma outline-only dinosaur drawing a solid fill so it hides the scene behind it. Every region enclosed by the
// ink is filled with the ground colour; an optional region index (find it by colouring the labels) gets the bite colour.
// The fill is embedded as a PNG under the original vector ink, so the line work stays crisp.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
const GROUND = [0xf6, 0xf7, 0xf8];
const BITE = [0xe9, 0xa8, 0xa4]; // soft red for teeth marks
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" }); const p = await b.newPage();
await p.goto("http://localhost:3002/");
for (const arg of process.argv.slice(2)) {
  const [n, biteArg, gapArg] = arg.split(":"); const bite = biteArg || undefined, gap = +(gapArg ?? 0);
  const svg = readFileSync(`public/patterns/${n}.svg`, "utf8").replace(/<image[^>]*\/>/, "");
  const png = await p.evaluate(async ({ svg, bite, gap, GROUND, BITE }) => {
    const S = 4, img = new Image(); img.src = "data:image/svg+xml;base64," + btoa(svg); await img.decode();
    const P = 8 * S; // padding so ink touching the frame edge still encloses its regions
    const W = img.width * S + 2 * P, H = img.height * S + 2 * P, c = new OffscreenCanvas(W, H), x = c.getContext("2d");
    x.drawImage(img, P, P, img.width * S, img.height * S); const d = x.getImageData(0, 0, W, H).data;
    const wall = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) wall[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    // Square dilation, done as separable running maxes.
    const grow = (m, r) => { const t = new Uint8Array(W * H), o = new Uint8Array(W * H);
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) { let v = 0; for (let k = Math.max(0, X - r); k <= Math.min(W - 1, X + r) && !v; k++) v = m[Y * W + k]; t[Y * W + X] = v; }
      for (let X = 0; X < W; X++) for (let Y = 0; Y < H; Y++) { let v = 0; for (let k = Math.max(0, Y - r); k <= Math.min(H - 1, Y + r) && !v; k++) v = t[k * W + X]; o[Y * W + X] = v; }
      return o; };
    if (gap > 0) {
      // Thicken the ink to seal gaps, flood the outside, then grow the outside back so the fill stops at the real line.
      const R = Math.round(gap * S), thick = grow(wall, R), outside = new Uint8Array(W * H), q = [0]; outside[0] = 1;
      while (q.length) { const i = q.pop(), X = i % W; for (const j of [X > 0 ? i - 1 : -1, X < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !thick[j] && !outside[j]) { outside[j] = 1; q.push(j); } }
      const out2 = grow(outside, R), o = new OffscreenCanvas(W, H), ox = o.getContext("2d"), im = ox.createImageData(W, H);
      for (let i = 0; i < W * H; i++) if (!out2[i]) im.data.set([...GROUND, 255], i * 4);
      ox.putImageData(im, 0, 0);
      const crop = new OffscreenCanvas(W - 2 * P, H - 2 * P); crop.getContext("2d").drawImage(o, -P, -P);
      const blob = await crop.convertToBlob({ type: "image/png" }); const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ""; for (const v of buf) s += String.fromCharCode(v); return { b64: btoa(s), w: img.width, h: img.height };
    }
    // Label every ink-bounded region; regions touching the frame edge are outside.
    const lab = new Int32Array(W * H).fill(-1), edge = []; let id = 0;
    for (let s = 0; s < W * H; s++) { if (wall[s] || lab[s] >= 0) continue; let out = false; const q = [s]; lab[s] = id;
      while (q.length) { const i = q.pop(), X = i % W, Y = (i / W) | 0; if (X === 0 || Y === 0 || X === W - 1 || Y === H - 1) out = true;
        for (const j of [X > 0 ? i - 1 : -1, X < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !wall[j] && lab[j] < 0) { lab[j] = id; q.push(j); } }
      edge.push(out); id++; }
    const o = new OffscreenCanvas(W, H), ox = o.getContext("2d"), im = ox.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const L = lab[i]; if (L >= 0 && edge[L]) continue;
      im.data.set([...(bite !== undefined && L === +bite ? BITE : GROUND), 255], i * 4);
    }
    ox.putImageData(im, 0, 0);
    const crop = new OffscreenCanvas(W - 2 * P, H - 2 * P); crop.getContext("2d").drawImage(o, -P, -P); const out = crop;
    const blob = await out.convertToBlob({ type: "image/png" }); const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (const v of buf) s += String.fromCharCode(v); return { b64: btoa(s), w: img.width, h: img.height };
  }, { svg, bite, gap, GROUND, BITE });
  writeFileSync(`public/patterns/${n}.svg`, svg.replace(/(<svg[^>]*>)/, `$1<image href="data:image/png;base64,${png.b64}" width="${png.w}" height="${png.h}"/>`));
}
await b.close();
