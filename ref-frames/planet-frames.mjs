// Full-size frames of the "Zoom to planet" study at given ms. node ref-frames/planet-frames.mjs <tag> [ms...]
import { chromium } from "playwright-core";
const [tag = "zp", ...rest] = process.argv.slice(2);
const times = rest.length ? rest.map(Number) : [0, 800, 1000, 1150, 1300, 1450, 1600, 1750, 1900, 2000, 2400];
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/zoom-to-planet");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(800);
await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
for (const t of times) {
  await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
  await p.waitForTimeout(80);
  await p.screenshot({ path: `ref-frames/${tag}_${t}.png` });
}
await b.close();
