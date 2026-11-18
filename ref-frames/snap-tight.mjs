import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(800);
const ts = [4000, 6000, 8500, 10500, 13500, 15800, 18500, 20200, 20900, 21400];
for (const [i, t] of ts.entries()) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `ref-frames/tt_${String(i).padStart(2, "0")}.png` });
}
await b.close();
