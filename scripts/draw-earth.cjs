// Usage (from public/patterns): node ../../scripts/draw-earth.cjs
// Earth from space in the dinosaurs' style: ink outline, muted sea and land, a thin pale-blue atmosphere glow.
// The jungle scene zooms out into the spot marked by SPOT (in this drawing's 1000x1000 frame).
const fs = require("fs");
// Muted, chalky colours so it reads as Earth while sitting with the greyscale scene.
const INK = "#2A2E36", SEA = "#a9c9e0", LAND = "#b9cfa6", LAND2 = "#a3bd8f", CLOUD = "#f6f7f8";
const S = 1000, C = 500, R = 400;
function blob(cx, cy, r, jit, n, seed, sx = 1, sy = 1) {
  let s = seed; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = r * (1 + (rnd() - 0.5) * jit); return [cx + Math.cos(a) * k * sx, cy + Math.sin(a) * k * sy]; });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).map(v => v.toFixed(1)).join(" ")}`;
  for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
  return d + "Z";
}
const sw = `stroke="${INK}" stroke-width="2.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"`;
// Continents: large lumpy blobs, clipped to the disc so they wrap off its edge.
const lands = [
  [380, 360, 150, 0.55, 14, 3, 1.2, 0.9], [610, 520, 130, 0.6, 13, 9, 0.9, 1.3], [300, 640, 90, 0.6, 11, 21, 1.3, 0.8],
  [720, 300, 70, 0.6, 10, 33, 1.1, 0.8], [520, 790, 80, 0.5, 10, 41, 1.6, 0.6],
];
const clouds = [[450, 250, 60, 0.4, 9, 5, 2.2, 0.35], [640, 680, 50, 0.4, 9, 13, 2.4, 0.3], [280, 480, 40, 0.4, 8, 17, 2, 0.3]];
const svg = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs><clipPath id="disc"><circle cx="${C}" cy="${C}" r="${R}"/></clipPath></defs>
<circle cx="${C}" cy="${C}" r="${R + 26}" fill="#bfe0ff" opacity="0.18"/>
<circle cx="${C}" cy="${C}" r="${R + 12}" fill="#bfe0ff" opacity="0.25"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="${SEA}"/>
<g clip-path="url(#disc)">
${lands.map((l, i) => `<path d="${blob(...l)}" fill="${i % 2 ? LAND2 : LAND}" ${sw}/>`).join("\n")}
${clouds.map(c => `<path d="${blob(...c)}" fill="${CLOUD}" ${sw}/>`).join("\n")}
<path d="M${C - R} ${C}A${R} ${R} 0 0 0 ${C + R} ${C}A${R * 1.05} ${R * 1.15} 0 0 1 ${C - R} ${C}Z" fill="${INK}" opacity="0.07" transform="rotate(-30 ${C} ${C})"/>
</g>
<circle cx="${C}" cy="${C}" r="${R}" ${sw}/>
</svg>`;
// earth.svg is now Liam's Figma drawing (259:577); only the stars are generated here.
// Faint stars, scattered once with a fixed seed.
let s = 77; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
const stars = Array.from({ length: 90 }, () => { const x = rnd() * 1920, y = rnd() * 1080, r = 0.8 + rnd() * 1.8; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`; });
fs.writeFileSync("stars.svg", `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">${stars.join("")}</svg>`);
