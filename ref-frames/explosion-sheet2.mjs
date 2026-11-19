// Contact sheet of the raw explosion frame files, plus the live component with one frame forced visible at a time.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
await p.goto("http://localhost:3002/");
const cells = Array.from({ length: 23 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `<div style="position:relative;width:380px;height:213px;background:#0a0a0a"><img src="http://localhost:3002/src/animations/explosion/frames/e${n}.svg" style="width:100%;height:100%"><span style="position:absolute;left:4px;top:2px;color:#fff;font:14px monospace">${n}</span></div>`;
}).join("");
await p.setContent(`<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(4,380px);gap:6px;padding:6px">${cells}</body>`);
await p.waitForTimeout(1500);
await p.screenshot({ path: "ref-frames/explosion-new-files.png", fullPage: true });

const q = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await q.goto("http://localhost:3002/#/render/explosion"); await q.reload(); await q.waitForTimeout(800);
await q.evaluate(() => window.__go()); await q.waitForTimeout(300);
for (const n of [13, 20, 23]) {
  await q.evaluate((n) => {
    document.getAnimations().forEach((a) => a.cancel());
    document.querySelectorAll("[data-stage] .absolute.inset-0 > div").forEach((d, i) => { d.style.opacity = i + 1 === n ? "1" : "0"; });
  }, n);
  await q.waitForTimeout(200);
  await q.screenshot({ path: `ref-frames/explosion-forced-${n}.png`, scale: "css" });
}
await b.close();
