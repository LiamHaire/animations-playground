// Plays a ported clip in the playground page in real time and screenshots its stage at the given ms.
// node ref-frames/port-check.mjs <id> <name> [light] <ms...>
import { chromium } from "playwright-core";
const [id, name, ...rest] = process.argv.slice(2);
const light = rest[0] === "light";
const times = (light ? rest.slice(1) : rest).map(Number);
const b = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1248/chrome-win64/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await p.goto(`http://localhost:3002/#/animations/${id}`);
await p.waitForTimeout(800);
if (light) await p.getByRole("button", { name: "Light" }).click();
await p.evaluate(() => document.fonts.ready);
await p.getByRole("button", { name: "Replay" }).click();
const t0 = Date.now();
const stage = p.locator("[data-stage]");
for (const [i, t] of times.entries()) {
  const left = t - (Date.now() - t0);
  if (left > 0) await p.waitForTimeout(left);
  await stage.screenshot({ path: `ref-frames/${name}_${i}.png` });
}
await b.close();
