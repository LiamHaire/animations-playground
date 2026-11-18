// Full-size frames of the Patterns title card at given beats. node ref-frames/title-frames.mjs 6.6 6.75 15.25 ...
import { chromium } from "playwright-core";
const BEAT = 60000 / 140;
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns-title");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
for (const t of process.argv.slice(2).map(Number)) {
  await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * BEAT);
  await p.waitForTimeout(60);
  await p.screenshot({ path: `ref-frames/tf_${t}.png` });
}
await b.close();
