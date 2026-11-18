import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/patterns");
await p.waitForTimeout(1000);
await p.evaluate(() => window.__go());
await p.waitForTimeout(500);
// The blast clock lasts HIT_AT + 4200.
const hit = await p.evaluate(() => {
  const a = document.querySelector("canvas").getAnimations()[0];
  return a.effect.getTiming().duration - 4200;
});
console.log("HIT_AT", hit);
const rel = [-900, -300, 60, 300, 700, 1200, 1700, 2200, 2700, 3300, 4300, 5000];
const files = [];
for (const r of rel) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), hit + r);
  await p.waitForTimeout(150);
  const f = `ref-frames/p_${r}.png`;
  await p.screenshot({ path: f });
  files.push(f);
}
await b.close();
const ff = "node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe";
execFileSync(ff, ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
  files.map((_, i) => `[${i}]scale=640:-1[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:grid=3x4`, "ref-frames/patterns.png"]);
