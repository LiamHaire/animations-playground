import { chromium } from "playwright-core";
import fs from "node:fs";
const [out, cols, ...files] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1920, height: 400 } });
const imgs = files.map((f) => "data:image/png;base64," + fs.readFileSync(`ref-frames/${f}.png`).toString("base64"));
await p.setContent(`<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">${imgs.map((s, i) => `<div style="position:relative"><img src="${s}" style="width:100%;display:block"><span style="position:absolute;left:6px;top:4px;font:600 16px sans-serif;color:#0f0">${files[i]}</span></div>`).join("")}</body>`);
await p.screenshot({ path: `ref-frames/${out}.png`, fullPage: true });
await b.close();
