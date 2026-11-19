import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/explosion");
await p.waitForTimeout(800);
await p.evaluate(() => window.__go());
await p.waitForTimeout(300);
const info = await p.evaluate(() => {
  const an = document.getAnimations();
  const end = Math.max(...an.map((a) => a.effect.getComputedTiming().endTime));
  return { count: an.length, end };
});
console.log(info);
const times = [10, 80, 200, 350, 500, 650, 800, 950, 1050];
for (const t of times) {
  const r = await p.evaluate((t) => {
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
    const imgs = [...document.querySelectorAll("img")];
    return imgs.map((im, i) => [i + 1, +getComputedStyle(im).opacity]).filter(([, o]) => o > 0);
  }, t);
  console.log(t, JSON.stringify(r));
}
await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 330; }));
await p.waitForTimeout(150);
await p.screenshot({ path: "ref-frames/explosion-330.png" });
await b.close();
