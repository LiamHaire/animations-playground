import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/animations/patterns");
await p.waitForTimeout(28300);
const shots = [0, 900, 2600, 3300, 4600, 5200, 5300, 5400, 5500, 5600, 5800, 6800];
let last = 0;
for (const [i, t] of shots.entries()) { await p.waitForTimeout(t - last); last = t; await p.screenshot({ path: `ref-frames/end_${String(i).padStart(2, "0")}.png` }); }
await b.close();
