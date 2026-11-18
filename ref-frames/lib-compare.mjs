// Captures the glitch and title-card morph frames under a tag, to check a refactor leaves the film pixel-identical.
// node ref-frames/lib-compare.mjs base   (before)   then   node ref-frames/lib-compare.mjs after base   (captures and compares)
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";
const [tag, against] = process.argv.slice(2);
const dir = `ref-frames/cmp-${tag}`;
mkdirSync(dir, { recursive: true });
const BEAT = 60000 / 140;
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
const seek = (t) => p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
const shots = [];

await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const g = await p.evaluate(() => Math.max(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => t.duration === 600).map((t) => t.delay)));
console.log("GLITCH_AT", g);
for (let i = 0; i < 24; i++) {
  await seek(g + 12 + i * 25);
  await p.waitForTimeout(60);
  shots.push(`gl_${i}.png`);
  await p.screenshot({ path: `${dir}/gl_${i}.png` });
}
// The scribbled lines (opening, a dino line, the dawn line) and the speed zoom out to Earth (750ms, ~7.4s before the glitch).
// The speed streaks are the only 525ms animations; the first starts 60ms into the zoom.
const zoomAt = await p.evaluate(() => Math.min(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => Math.abs(t.duration - 525) < 0.01).map((t) => t.delay))) - 60;
for (const t of [800, 1200, 1700, 7000, 7300, g - 3500, g - 3200, zoomAt - 100, zoomAt + 100, zoomAt + 250, zoomAt + 400, zoomAt + 600, zoomAt + 800]) {
  await seek(t);
  await p.waitForTimeout(60);
  shots.push(`f_${Math.round(t)}.png`);
  await p.screenshot({ path: `${dir}/f_${Math.round(t)}.png` });
}

await p.goto("http://localhost:3002/#/render/patterns-title");
await p.reload();
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
for (const t of [2.6, 6.6, 6.75, 6.9, 7.2, 8.2, 8.6, 8.75, 9.2, 10.2, 11.7, 16.25, 19.25]) {
  await seek(t * BEAT);
  await p.waitForTimeout(60);
  shots.push(`tf_${t}.png`);
  await p.screenshot({ path: `${dir}/tf_${t}.png` });
}
await b.close();

if (against) {
  let diff = 0;
  for (const s of shots) {
    const same = readFileSync(`${dir}/${s}`).equals(readFileSync(`ref-frames/cmp-${against}/${s}`));
    if (!same) { diff++; console.log("DIFFERS", s); }
  }
  console.log(diff ? `${diff} of ${shots.length} frames differ` : `all ${shots.length} frames identical`);
}
