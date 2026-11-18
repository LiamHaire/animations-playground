// Contact sheets of the Patterns title card: seeks every animation to each time, screenshots, then tiles the frames
// (labelled in beats) into sheets. node ref-frames/title-sheet.mjs [stepBeats] [fromBeat] [toBeat] [name]
import { chromium } from "playwright-core";
const [step = 0.25, from = 0, to = 20.5, name = "ts"] = process.argv.slice(2).map((v, i) => (i < 3 ? +v : v));
const BEAT = 60000 / 140;
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns-title");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const shots = [];
for (let t = from; t <= to + 1e-9; t += step) {
  await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * BEAT);
  await p.waitForTimeout(60);
  shots.push({ t, src: "data:image/png;base64," + (await p.screenshot()).toString("base64") });
}
const per = 20, cols = 4;
const sheet = await b.newPage({ viewport: { width: cols * 480, height: 1080 } });
for (let s = 0; s * per < shots.length; s++) {
  const chunk = shots.slice(s * per, s * per + per);
  await sheet.setContent(`<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(${cols},480px);gap:0">${chunk
    .map((c) => `<div style="position:relative;width:480px;height:270px;outline:1px solid #555"><img src="${c.src}" style="width:480px;height:270px;display:block"><span style="position:absolute;left:6px;top:4px;font:600 16px sans-serif;color:#0f0">b${c.t.toFixed(2)}</span></div>`)
    .join("")}</body>`);
  await sheet.waitForTimeout(200);
  await sheet.screenshot({ path: `ref-frames/${name}_${s}.png`, fullPage: true });
}
console.log(shots.length, "frames");
await b.close();
