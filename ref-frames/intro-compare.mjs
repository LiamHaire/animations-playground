// Plays the portfolio's original intro (served from ~/portfolio/public) and the playground port side by side in real time,
// screenshotting both at the same ms. node ref-frames/intro-compare.mjs <ms...>
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const pub = path.join(process.env.USERPROFILE, "portfolio", "public");
const types = { ".html": "text/html", ".css": "text/css", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const f = path.join(pub, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(pub) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(3099);
const times = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const shoot = async (url, name, setup) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on("pageerror", (e) => console.log(name, "ERR", e.message));
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  const t0 = await setup(p);
  for (const [i, t] of times.entries()) {
    const left = t - (Date.now() - t0);
    if (left > 0) await p.waitForTimeout(left);
    await p.screenshot({ path: `ref-frames/${name}_${i}.png` });
  }
};
await Promise.all([
  shoot("http://localhost:3099/intro/hero-animation.html", "orig", async (p) => {
    await p.addStyleTag({ content: ".replay{display:none}" });
    await p.evaluate(() => document.querySelector(".replay").click()); // restart now, so both clocks line up
    return Date.now();
  }),
  shoot("http://localhost:3002/#/render/hero-intro", "port", async (p) => {
    await p.setViewportSize({ width: 1920, height: 1080 });
    await p.evaluate(() => Promise.all(["300 136px Satoshi", "500 136px Satoshi", "700 136px Satoshi", "400 67px \"Roboto Mono\""].map((f) => document.fonts.load(f))));
    await p.waitForTimeout(500);
    await p.evaluate(() => window.__go());
    return Date.now();
  }),
]);
server.close();
await b.close();

