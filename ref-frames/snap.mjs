import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:3002/#/render/meteor-impact");
await p.waitForTimeout(800);
await p.evaluate(() => window.__go());
await p.waitForTimeout(300);
const times = [2700, 3100, 3600, 3900, 4200, 4500, 4800, 5100, 5400, 5800, 6500];
const files = [];
for (const t of times) {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
  await p.waitForTimeout(120);
  const f = `ref-frames/m_${t}.png`;
  await p.screenshot({ path: f });
  files.push(f);
}
await b.close();
const ff = "node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe";
execFileSync(ff, ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
  files.map((_, i) => `[${i}]scale=640:-1[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0|0_h0+h1|w0_h0+h1|w0+w1_h0+h1|0_h0+h1+h2|w0_h0+h1+h2`, "ref-frames/mine.png"]);


