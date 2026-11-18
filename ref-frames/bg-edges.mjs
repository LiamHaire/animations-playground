// Renders bg.svg on its own and samples its edge columns/rows, to see what an extension has to continue.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const svg = readFileSync("public/patterns/bg.svg", "utf8");
await p.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: "ref-frames/bg-full.png" });
const out = await p.evaluate(async () => {
  const svg = document.querySelector("svg");
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await img.decode();
  const c = document.createElement("canvas"); c.width = 1920; c.height = 1080;
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1920, 1080); ctx.drawImage(img, 0, 0);
  const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join(""); };
  const col = (x) => [0, 100, 200, 300, 400, 500, 600, 700, 760, 780, 800, 850, 900, 950, 1000, 1050, 1079].map((y) => `${y}:${px(x, y)}`).join(" ");
  const row = (y) => [0, 200, 400, 600, 800, 960, 1100, 1300, 1500, 1700, 1919].map((x) => `${x}:${px(x, y)}`).join(" ");
  return { left: col(0), right: col(1919), top: row(0), bottom: row(1079), ground: row(900) };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
