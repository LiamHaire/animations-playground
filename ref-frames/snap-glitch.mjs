import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(500);
// glitch start = the act2 flicker animation's delay
const g = await p.evaluate(() => Math.max(...document.getAnimations().map((a) => a.effect.getTiming()).filter((t) => t.duration === 600).map((t) => t.delay)));
console.log("GLITCH_AT", g);
for (let i = 0; i < 24; i++) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), g + 12 + i * 25);
  await p.waitForTimeout(100);
  await p.screenshot({ path: `ref-frames/gl_${i}.png` });
}
await b.close();


