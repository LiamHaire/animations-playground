import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/animations/patterns");
await p.waitForTimeout(29500);
const out = await p.evaluate(() => {
  const c = document.querySelector("canvas");
  const a = c.getAnimations()[0];
  const stage = c.closest("[data-stage]") || c.parentElement.parentElement;
  const els = [...c.parentElement.parentElement.querySelectorAll("*")].slice(0, 0);
  const chain = [];
  let e = c;
  while (e && chain.length < 6) {
    const s = getComputedStyle(e);
    chain.push({ tag: e.tagName, cls: e.className?.toString().slice(0, 40), op: s.opacity, vis: s.visibility, tf: s.transform, anims: e.getAnimations().map((x) => [x.playState, x.currentTime]) });
    e = e.parentElement;
  }
  const flash = [...document.querySelectorAll(".inset-0.bg-white")].map((x) => x.getAnimations().map((y) => ({ st: y.playState, t: y.currentTime, tm: y.effect.getComputedTiming(), kf: y.effect.getKeyframes() })));
  return { clock: a ? [a.playState, a.currentTime] : null, chain, flash };
});
console.log(JSON.stringify(out, null, 1));
await b.close();

