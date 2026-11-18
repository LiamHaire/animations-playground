// Usage: node scripts/render.mjs [animationId] [dark|light|both] [fps]
// Steps every Web Animation to an exact time and screenshots each frame, so the output is deterministic.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const id = process.argv[2] ?? "connectors";
const which = process.argv[3] ?? "both";
const fps = Number(process.argv[4] ?? 60);
const base = process.env.BASE_URL ?? "http://localhost:3002";
const themes = which === "both" ? ["dark", "light"] : [which];
const TAIL_MS = 600;

mkdirSync("out", { recursive: true });

async function render(theme) {
  // Playwright's own Chromium, the one the ref-frames checks use, so the render matches what was checked.
  const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/#/render/${id}?theme=${theme}`);
  await page.waitForFunction(() => typeof window.__go === "function");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__go());
  await page.waitForTimeout(500);

  const total = await page.evaluate(() => {
    const anims = document.getAnimations();
    anims.forEach((a) => a.pause());
    return Math.max(...anims.map((a) => a.effect.getComputedTiming().endTime));
  });
  // Optional 5th arg cuts the clip at that many ms (no tail).
  const endMs = process.argv[5] ? Number(process.argv[5]) : total + TAIL_MS;
  const frames = Math.ceil((endMs / 1000) * fps);
  console.log(`[${theme}] ${Math.round(total)}ms of animation, ${frames} frames at ${fps}fps`);

  const out = `out/${id}-${theme}${process.argv[5] ? `-${process.argv[5]}ms` : ""}.mp4`;
  const ff = spawn(
    ffmpegPath,
    ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "14", "-preset", "slow", "-movflags", "+faststart", out],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const done = new Promise((resolve, reject) => {
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });

  for (let f = 0; f < frames; f++) {
    const t = (f / fps) * 1000;
    await page.evaluate((time) => document.getAnimations().forEach((a) => (a.currentTime = time)), t);
    const png = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 120 === 0) console.log(`[${theme}] ${f}/${frames}`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`[${theme}] wrote ${out}`);
}

await Promise.all(themes.map(render));
