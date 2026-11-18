// Measures the orange dot against the outline circle it collapses into, on the title card. node ref-frames/dot-centre.mjs
// Checks the 1920px render and the in-app stage (smaller, so rounding shows more), at a few beats after the collapse.
import { chromium } from "playwright-core";
const BEAT = 60000 / 140;
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const ORANGE = "rgb(241, 93, 34)";
const measure = async (url, width) => {
  const p = await b.newPage({ viewport: { width, height: 1000 } });
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto(url);
  await p.waitForTimeout(1000);
  if (url.includes("/render/")) await p.evaluate(() => window.__go());
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  for (const beat of [12.2, 12.6, 13.2]) {
    const r = await p.evaluate(({ ms, ORANGE }) => {
      document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
      const divs = [...document.querySelectorAll("[data-stage] div")];
      const dot = divs.find((d) => getComputedStyle(d).backgroundColor === ORANGE && d.classList.contains("rounded-full"));
      const circle = divs.find((d) => {
        const s = getComputedStyle(d);
        return s.borderTopStyle === "solid" && s.borderTopColor === "rgb(250, 250, 250)" && s.borderRadius === "50%" && +s.opacity > 0.5;
      });
      const c = (el) => { const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width }; };
      const stage = document.querySelector("[data-stage]").getBoundingClientRect();
      return { dot: dot && c(dot), circle: circle && c(circle), stageW: stage.width };
    }, { ms: beat * BEAT, ORANGE });
    if (!r.dot || !r.circle) { console.log(width, beat, "not found", r); continue; }
    const dx = r.dot.x - r.circle.x, dy = r.dot.y - r.circle.y;
    const k = 1920 / r.stageW; // in 1920px frame units
    console.log(`stage ${Math.round(r.stageW)}px beat ${beat}: dot off by x ${dx.toFixed(2)}px y ${dy.toFixed(2)}px (frame units ${(dx * k).toFixed(1)}, ${(dy * k).toFixed(1)}); circle ${r.circle.w.toFixed(1)}px dot ${r.dot.w.toFixed(1)}px`);
  }
  await p.close();
};
await measure("http://localhost:3002/#/render/patterns-title", 1920);
await measure("http://localhost:3002/#/animations/patterns-title", 1400);
await b.close();
