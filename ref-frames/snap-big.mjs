import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(800);
// the big dino's pose animations: images under /patterns/big-
const t = await p.evaluate(() => {
  const a = [...document.querySelectorAll('img[src*="/patterns/big-"]')].flatMap((i) => i.getAnimations());
  const tm = a[0].effect.getTiming();
  return { at: tm.delay, dur: tm.duration };
});
console.log(t);
const step = 83;
const at = (k) => t.at + k * step + 20;
// run, stop, open, shut, then near the end (lookup)
const shots = [at(10), at(12), at(30), at(40), t.at + t.dur - 600, t.at + t.dur - 200];
const kf = await p.evaluate(() => {
  const img = document.querySelector('img[src*="big-open"]');
  const a = img.getAnimations()[0];
  const ks = a.effect.getKeyframes();
  const i = ks.findIndex((k) => k.opacity == 1);
  return ks[i].computedOffset * a.effect.getTiming().duration + a.effect.getTiming().delay;
});
shots.splice(4, 0, kf + 20, kf + 3 * step + 20);
for (const [i, s] of shots.entries()) {
  await p.evaluate((s) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = s; }), s);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `ref-frames/big_${i}.png`, clip: { x: 0, y: 380, width: 1920, height: 560 } });
}
await b.close();
