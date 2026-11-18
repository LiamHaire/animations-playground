import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(500);
const g = await p.evaluate(() => [...new Set(document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => t.duration === 600).map((t) => t.delay))].sort((a, b) => a - b));
console.log(g);
const [g1, g2] = g;
const roll = g1 + 600 + 1200;
const ts = [g1 + 700, roll + 120, roll + 240, roll + 360, roll + 700, g2 + 150, g2 + 350, g2 + 800];
for (const [i, t] of ts.entries()) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `ref-frames/rv_${i}.png` });
}
await b.close();
