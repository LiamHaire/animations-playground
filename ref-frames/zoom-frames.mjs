// Full-size frames through the Patterns speed zoom out. node ref-frames/zoom-frames.mjs <tag> [ms after the zoom starts...]
import { chromium } from "playwright-core";
const [tag = "z", ...rest] = process.argv.slice(2);
const times = rest.length ? rest.map(Number) : [-50, 50, 100, 150, 200, 250, 300, 360, 450, 550, 650, 760, 1000];
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
// The speed streaks are the only 525ms animations (0.7 of the 750ms zoom); the first starts 60ms into it.
const z = await p.evaluate(() => Math.min(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => Math.abs(t.duration - 525) < 0.01).map((t) => t.delay))) - 60;
console.log("ZOOM_AT", z);
for (const t of times) {
  await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), z + t);
  await p.waitForTimeout(60);
  await p.screenshot({ path: `ref-frames/${tag}_${t}.png` });
}
await b.close();
