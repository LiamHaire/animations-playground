// Contact sheet of the new library cards on the Playground, seeked to a few times each. node ref-frames/lib-cards.mjs [light]
import { chromium } from "playwright-core";
const exe = process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe";
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await p.goto("http://localhost:3002/#/");
await p.waitForTimeout(1500);
if (process.argv[2] === "light") await p.getByRole("button", { name: "Light" }).click();
await p.evaluate(() => document.fonts.ready);
// Replay all, then pause straight away: finished fill:none animations drop out of getAnimations() and can't be seeked.
await p.getByRole("button", { name: "Replay all" }).click();
await p.waitForTimeout(100);
await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const CARDS = {
  "Glitch transition": [1212, 1287, 1337, 1387, 1437, 1487, 1537, 1612, 1687, 1787],
  "Scribble": [300, 700, 1100, 1700],
  "Stretch into shapes": [1300, 1550, 1700, 2000, 2200, 2500, 2900],
  "Roll up / roll down": [400, 850, 1250, 1600],
  "Zoom through": [800, 1050, 1200, 1350, 1700],
};
for (const [name, times] of Object.entries(CARDS)) {
  const card = p.locator("section").filter({ has: p.getByRole("heading", { name, exact: false }) }).locator("[data-stage]").first();
  await card.scrollIntoViewIfNeeded();
  for (const t of times) {
    await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
    await p.waitForTimeout(60);
    await card.screenshot({ path: `ref-frames/card_${name.replace(/[^a-z]+/gi, "-")}_${t}.png` });
  }
}
await b.close();
