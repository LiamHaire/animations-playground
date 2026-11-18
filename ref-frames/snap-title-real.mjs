import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/animations/patterns");
await p.waitForTimeout(28500);
for (let i = 0; i < 8; i++) { await p.screenshot({ path: `ref-frames/tr_${i}.png` }); await p.waitForTimeout(500); }
const st = await p.evaluate(() => [...document.querySelectorAll("p")].filter((x) => x.textContent.includes("new era")).map((x) => { let o = 1, e = x; while (e) { o *= +getComputedStyle(e).opacity; e = e.parentElement; } return o; }));
console.log("dawn text opacities:", st);
await b.close();
