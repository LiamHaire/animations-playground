import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto("http://localhost:3002/#/animations/patterns");
await p.waitForTimeout(28300);
for (const k of [0, 1, 2, 3, 4, 5, 6, 7]) { await p.screenshot({ path: `ref-frames/real_${k}.png` }); await p.waitForTimeout(550); }
await b.close();
