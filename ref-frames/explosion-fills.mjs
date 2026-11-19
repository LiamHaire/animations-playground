import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("http://localhost:3002/#/render/explosion");
await p.reload(); await p.waitForTimeout(800);
await p.evaluate(() => window.__go()); await p.waitForTimeout(300);
for (const t of [10, 150, 300]) {
  const r = await p.evaluate((t) => {
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
    const vis = [...document.querySelectorAll("[data-stage] .absolute.inset-0 > div")].map((d, i) => [i + 1, +getComputedStyle(d).opacity]).filter(([, o]) => o > 0);
    return vis;
  }, t);
  console.log(t, JSON.stringify(r));
}
const fills = await p.evaluate(() => {
  const c = {};
  document.querySelectorAll("[data-stage] svg path").forEach((e) => { const f = getComputedStyle(e).fill; c[f] = (c[f] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12);
});
console.log(fills);
await b.close();
