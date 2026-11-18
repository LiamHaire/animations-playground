// Plays the Patterns title card (and the full film) in real time, reporting errors and how many frames ran slow.
import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await p.goto("http://localhost:3002/#/render/patterns-title");
await p.waitForTimeout(1000);
await p.evaluate(() => document.fonts.ready);
const stats = await p.evaluate(() => new Promise((done) => {
  window.__go();
  const gaps = [];
  let last = performance.now();
  const t0 = last;
  const tick = (now) => {
    gaps.push(now - last);
    last = now;
    if (now - t0 < 10500) requestAnimationFrame(tick);
    else done({ frames: gaps.length, slow: gaps.filter((g) => g > 25).length, worst: Math.max(...gaps).toFixed(1) });
  };
  requestAnimationFrame(tick);
}));
console.log("title card, real time:", stats);
await p.screenshot({ path: "ref-frames/live_end.png" });
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(1500);
console.log("full film mounted, anims:", await p.evaluate(() => document.getAnimations().length));
await b.close();
