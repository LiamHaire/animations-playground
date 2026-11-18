import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const sheet = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const files = process.argv.slice(2);
const imgs = await Promise.all(files.map(async (f) => "data:image/png;base64," + (await import("node:fs")).readFileSync(`ref-frames/tf_${f}.png`).toString("base64")));
await sheet.setContent(`<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(4,480px)">${imgs.map((s, i) => `<div style="position:relative;height:200px;overflow:hidden"><img src="${s}" style="width:960px;margin:-150px 0 0 -240px"><span style="position:absolute;left:6px;top:4px;font:600 16px sans-serif;color:#0f0">b${files[i]}</span></div>`).join("")}</body>`);
await sheet.screenshot({ path: "ref-frames/labels.png", fullPage: true });
await b.close();
