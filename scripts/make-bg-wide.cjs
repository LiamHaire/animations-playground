// Builds public/patterns/bg-wide.svg: the jungle's surroundings for the zoom out, a 3x3-frame (5760x3240) picture with the
// real scene in the middle (the live frame sits over it). Either side is bg.svg mirrored, so its edges meet
// the original's seamlessly, with the volcano taken out so there's only ever the one. Sky above, ground below.
// node scripts/make-bg-wide.cjs
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "../public/patterns");
const src = fs.readFileSync(path.join(dir, "bg.svg"), "utf8");
const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// The volcano, by its Figma layer ids: the cone, its lava (three oranges) and the two streaks down its side. With it gone,
// the low bushes and hills that sat in front of it carry on across the gap.
const VOLCANO = ["Vector_114", "Vector_115", "Vector_116", "Vector_117", "Vector_119", "Vector_120"];
let tile = inner;
for (const id of VOLCANO) {
  const re = new RegExp(`<path id="${id}"[^>]*/>\\s*`);
  if (!re.test(tile)) throw new Error(`volcano layer ${id} not found in bg.svg`);
  tile = tile.replace(re, "");
}
// The ids must stay unique once the tile is used twice. The mirrored copies aren't clipped to their frame, so shapes cut
// by the frame's edge carry on under the middle copy, which is drawn last, and the join never shows as a hairline.
tile = tile.replace(/\sid="[^"]*"/g, "").replace(/\sclip-path="url\(#clip0_0_4\)"/g, "").replace(/<defs>[\s\S]*?<\/defs>/g, "");
const W = 1920, H = 1080;
// The real scene goes in the middle too, under the live frame (which covers it), so the hairline gaps the browser leaves
// where the pieces meet show the same picture rather than a seam. The ground starts a little up under the scene row for
// the same reason.
const real = inner.replace(/\sid="[^"]*"/g, (m) => (m.includes("clip0_0_4") ? m.replace("clip0_0_4", "clip_real") : ""))
  .replace(/url\(#clip0_0_4\)/g, "url(#clip_real)");
const svg = `<svg width="${3 * W}" height="${3 * H}" viewBox="0 0 ${3 * W} ${3 * H}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs><g id="tile">${tile}</g></defs>
<rect width="${3 * W}" height="${3 * H}" fill="#ffffff"/>
<rect y="${2 * H - 4}" width="${3 * W}" height="${H + 4}" fill="#ebecef"/>
<use href="#tile" transform="translate(${W} ${H}) scale(-1 1)"/>
<use href="#tile" transform="translate(${3 * W} ${H}) scale(-1 1)"/>
<g transform="translate(${W} ${H})">${real}</g>
</svg>
`;
fs.writeFileSync(path.join(dir, "bg-wide.svg"), svg);
console.log("wrote bg-wide.svg", svg.length, "bytes");
