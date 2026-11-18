import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const big = [...document.querySelectorAll('img[src*="/patterns/big-"]')];
  const on = (name) => {
    const img = big.find((i) => i.src.includes(`big-${name}`));
    const a = img.getAnimations()[0], tm = a.effect.getTiming();
    return a.effect.getKeyframes().filter((k, i, ks) => k.opacity == 1 && (i === 0 || ks[i - 1].opacity != 1)).map((k) => Math.round(tm.delay + k.computedOffset * tm.duration));
  };
  const lines = [...document.querySelectorAll("svg[aria-label]")].map((s) => {
    const g = s.querySelector("[data-g]");
    const a = g?.getAnimations()[0];
    return [s.getAttribute("aria-label"), a ? Math.round(a.effect.getTiming().delay) : null];
  });
  return { open: on("open"), shut: on("shut"), lookup: on("lookup"), lines };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
