// Real-time (unseeked) check of the Patterns impact: lets the film play and grabs frames at set ms after impact.
// node ref-frames/impact-live.mjs [ms after impact...]
import { chromium } from "playwright-core";
const times = process.argv.slice(2).map(Number);
const at = times.length ? times : [150, 450, 1600, 3300];
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto(`http://localhost:3002/#/render/${process.env.CLIP ?? "patterns-act1-v2"}`);
await p.reload();
await p.waitForTimeout(1500);
await p.evaluate(() => window.__go());
await p.waitForFunction(() => document.getAnimations().length > 0);
const hit = await p.evaluate(() => Math.min(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => Math.abs(t.duration - 770) < 0.01).map((t) => t.delay)) - 60 + 2100);
const t0 = await p.evaluate(() => document.timeline.currentTime - Math.max(...document.getAnimations().map((a) => a.currentTime ?? 0)));
console.log("HIT_AT", hit);
for (const ms of at) {
  await p.waitForFunction(([t0, target]) => document.timeline.currentTime - t0 >= target, [t0, hit + ms], { timeout: 120000, polling: 16 });
  const now = await p.evaluate((t0) => Math.round(document.timeline.currentTime - t0), t0);
  await p.screenshot({ path: `ref-frames/implive_${ms}.png` });
  console.log("grabbed", ms, "at clip time", now, "(", Math.round(now - hit), "after impact )");
}
await b.close();
