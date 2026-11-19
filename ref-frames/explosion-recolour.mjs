import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const files = [];
for (const theme of ["dark", "light"]) {
  for (const t of [10, 150, 300, 450, 600, 750, 900, 1050]) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on("pageerror", (e) => console.log("ERR", e.message));
    await p.goto(`http://localhost:3002/#/render/explosion${theme === "light" ? "?theme=light" : ""}`);
    await p.waitForTimeout(900);
    await p.evaluate(() => window.__go()); await p.waitForTimeout(1500);
    await p.waitForTimeout(200);
    await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), t);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.waitForTimeout(200);
    const f = `ref-frames/ex_${theme}_${t}.png`;
    await p.screenshot({ path: f });
    files.push(f);
    await p.close();
  }
}
await b.close();
const ff = "node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe";
const lay = files.map((_, i) => `${(i % 4) * 480}_${Math.floor(i / 4) * 270}`).join("|");
execFileSync(ff, ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
  files.map((_, i) => `[${i}]scale=480:270[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:layout=${lay}`, "ref-frames/explosion-recolour.png"]);
