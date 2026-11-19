// Checks the explosion's resolved fills (every grey must be a neutral token) and saves a contact sheet per theme.
import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const NEUTRAL = new Set(["rgb(115, 115, 115)", "rgb(82, 82, 82)", "rgb(64, 64, 64)", "rgb(38, 38, 38)", "rgb(23, 23, 23)"]);
for (const theme of ["dark", "light"]) {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto(`http://localhost:3002/#/render/explosion?theme=${theme}`);
  await p.reload(); await p.waitForTimeout(800);
  // Pause at t=0 before anything plays: pausing mid-run leaves the frame that was live stuck in the screenshot.
  await p.evaluate(() => window.__go()); await p.waitForFunction(() => document.getAnimations().length > 0);
  await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
  const r = await p.evaluate(() => {
    const c = {};
    document.querySelectorAll("[data-stage] svg path").forEach((e) => { const f = getComputedStyle(e).fill; c[f] = (c[f] || 0) + 1; });
    return { fills: c, frames: document.querySelectorAll("[data-stage] svg").length, bg: getComputedStyle(document.querySelector("[data-stage]")).backgroundColor };
  });
  const greys = Object.entries(r.fills).filter(([f]) => { const [x, y, z] = f.match(/\d+/g).map(Number); return Math.max(x, y, z) - Math.min(x, y, z) < 30; });
  console.log(theme, "frames", r.frames, "stage bg", r.bg);
  console.log("  greys:", greys.map(([f, n]) => `${f}${NEUTRAL.has(f) ? "" : " NOT-NEUTRAL"} x${n}`).join(" | "));
  console.log("  distinct fills:", Object.keys(r.fills).length);
  for (const t of [100, 300, 500, 700, 900, 1080]) {
    await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
    await p.waitForTimeout(60);
    await p.screenshot({ path: `ref-frames/explosion-tokens-${theme}-${t}.png`, clip: { x: 0, y: 0, width: 1920, height: 1080 }, scale: "css" });
  }
  await p.close();
}
await b.close();
