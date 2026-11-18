import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(800);
const g = await p.evaluate(() => Math.max(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => t.duration === 600).map((t) => t.delay)));
const out = g + 600 + 1200, intro = out + 600, title = intro + 340 + 250;
console.log({ g, out, intro, title });
const ts = [out - 100, out + 250, intro + 120, intro + 400, title + 120, title + 260, title + 500, title + 1500];
for (const [i, t] of ts.entries()) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `ref-frames/tc_${i}.png` });
}
await b.close();
