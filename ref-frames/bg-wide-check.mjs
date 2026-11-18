// Renders bg-wide.svg with the real bg.svg dropped into its middle, scaled to fit, to check the seams and that the
// mirrored sides have no volcano. node ref-frames/bg-wide-check.mjs
import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("http://localhost:3002/");
await p.setContent(`<body style="margin:0;background:#888">
  <div style="position:relative;width:1920px;height:1080px">
    <img src="http://localhost:3002/patterns/bg-wide.svg" style="position:absolute;inset:0;width:1920px;height:1080px">
    <img src="http://localhost:3002/patterns/bg.svg" style="position:absolute;left:640px;top:360px;width:640px;height:360px">
  </div></body>`);
await p.waitForTimeout(800);
await p.screenshot({ path: "ref-frames/bg-wide-check.png" });
await b.close();
