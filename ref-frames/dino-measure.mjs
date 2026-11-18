import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage();
await p.goto("http://localhost:3002/");
for (const n of ["neutral", "fwd", "back", "open", "shut", "lookup"]) {
  const r = await p.evaluate(async (n) => {
    const img = new Image(); img.src = `/patterns/big-${n}.svg?v=${Math.random()}`; await img.decode();
    const W = Math.round(img.width), H = Math.round(img.height), c = new OffscreenCanvas(W, H), x = c.getContext("2d");
    x.drawImage(img, 0, 0, W, H); const d = x.getImageData(0, 0, W, H).data;
    // ink = dark pixels (the fill is light)
    const ink = (X, Y) => { const i = (Y * W + X) * 4; return d[i + 3] > 128 && d[i] < 120; };
    let bottom = 0; for (let Y = H - 1; Y >= 0 && !bottom; Y--) for (let X = 0; X < W; X++) if (ink(X, Y)) { bottom = Y; break; }
    // columns with ink in the bottom 6 rows = where the feet touch the ground
    const cols = []; for (let X = 0; X < W; X++) for (let Y = bottom - 6; Y <= bottom; Y++) if (ink(X, Y)) { cols.push(X); break; }
    // group into runs (separate feet)
    const runs = []; for (const X of cols) { const r = runs[runs.length - 1]; if (r && X - r[1] <= 4) r[1] = X; else runs.push([X, X]); }
    let left = W; for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) if (ink(X, Y)) { if (X < left) left = X; break; }
    return { W, H, bottom, gapBelow: H - 1 - bottom, feet: runs.filter((r) => r[1] - r[0] > 6), tailLeft: left };
  }, n);
  console.log(n, JSON.stringify(r));
}
await b.close();
