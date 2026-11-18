import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await p.goto("http://localhost:3002/#/animations/patterns");
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const c = document.querySelectorAll("canvas");
  return [...c].map((x) => ({ w: x.width, cw: x.clientWidth, ch: x.clientHeight, anims: x.getAnimations().map((a) => a.effect.getTiming()) }));
});
console.log(JSON.stringify(info));
const hit = 28103.6;
for (const r of [60, 400, 900, 1800]) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), hit + r);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `ref-frames/live_${r}.png` });
}
await b.close();
