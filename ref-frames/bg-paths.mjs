// Lists bg.svg's paths with their bounding boxes and fills, to pick out the volcano (and its smoke) for removal.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.setContent(`<body style="margin:0">${readFileSync("public/patterns/bg.svg", "utf8")}</body>`);
const rows = await p.evaluate(() => [...document.querySelectorAll("svg path")].map((el, i) => {
  const b = el.getBBox();
  return { i, id: el.id, fill: el.getAttribute("fill"), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}));
// Anything reaching up past the bushes into the volcano's peak, or with the smoke's colours.
for (const r of rows) {
  if (r.y < 560 && r.x < 1500 && r.x + r.w > 1150) console.log(JSON.stringify(r));
}
console.log("total", rows.length);
await b.close();
