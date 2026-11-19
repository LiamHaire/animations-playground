// Full-size frames around the Patterns meteor impact. node ref-frames/impact-frames.mjs <tag> [ms after impact...]
// CLIP=<animation id> picks the version (default patterns-act1-v2, the explosion; patterns-act1 is the white cut).
// Impact is found from the zoom (ZOOM_AT + 1000 meteor start + 1100 flight), same lookup as zoom-frames.mjs.
import { chromium } from "playwright-core";
const clip = process.env.CLIP ?? "patterns-act1-v2";
const [tag = "imp", ...rest] = process.argv.slice(2);
const times = rest.length ? rest.map(Number) : [-100, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1050, 1200, 1600, 2300, 3200, 4200];
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto(`http://localhost:3002/#/render/${clip}`);
await p.reload();
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForFunction(() => document.getAnimations().length > 0);
await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const z = await p.evaluate(() => Math.min(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => Math.abs(t.duration - 770) < 0.01).map((t) => t.delay))) - 60;
const hit = z + 1000 + 1100;
console.log("ZOOM_AT", z, "HIT_AT", hit);
for (const t of times) {
  await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), hit + t);
  await p.waitForTimeout(80);
  await p.screenshot({ path: `ref-frames/${tag}_${t}.png` });
}
await b.close();
