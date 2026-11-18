const o=require("opentype.js");const f=o.parse(require("fs").readFileSync("amatic.ttf").buffer);
const size=96;
// Amatic SC's capital S is a thin swash that reads oddly next to M and D, so swaps can draw a glyph from another
// character scaled up to cap height (the small-cap s, enlarged, matches the other capitals' weight and shape).
const line=(text,swaps={})=>{let x=0;const paths=[];for(const ch of text){const sw=swaps[ch];const g=f.charToGlyph(sw?sw.ch:ch);const k=sw?sw.scale:1;
  const d=g.getPath(x,0,size*k).toPathData(2);if(d)paths.push(d);x=Math.round((x+g.advanceWidth*size*k/f.unitsPerEm)*100)/100;}
  let y1=0,y2=0;for(const ch of text){const sw=swaps[ch];const b=f.charToGlyph(sw?sw.ch:ch).getPath(0,0,size*(sw?sw.scale:1)).getBoundingBox();y1=Math.min(y1,b.y1);y2=Math.max(y2,b.y2);}
  return {text,w:Math.ceil(x),y0:Math.floor(y1),h:Math.ceil(y2-y1),paths};};
const CAP_S={S:{ch:"s",scale:74/66}};
const L={TITLE:line("In the beginning..."),MOSAIC:line("...there was Mosaic",CAP_S),MDS:line("Then came MDS",CAP_S),FIRST:line("The first of the design systems"),BIGGER:line("A more refined species"),PUI:line("PUI followed closely"),LOUDER:line("A formidable new force"),NOW:line("But now..."),DAWN:line("...a new era dawns")};
let s="// Amatic SC outlines at 96px, one path per glyph, generated with opentype.js.\nimport type { ScribbleLine as Line } from \"../../clips/Scribble\";\n";
for(const k in L) s+=`export const ${k}: Line = ${JSON.stringify(L[k])};\n`;
require("fs").writeFileSync(require("os").homedir()+"/animations-playground/src/animations/patterns/glyphs.ts",s);
