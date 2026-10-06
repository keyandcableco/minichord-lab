// The old arcade's resolution, shared by the games drawn at it (Chord Chomp, Chord Burger, Dominant Kong,
// Sus Bros.): sprites drawn pixel by pixel from rows of characters, the arcade's lettering made all or
// nothing, pixel by pixel, and the screen zoomed and pointed past where the view follows the player.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- sprites ----------
// each drawn once from rows of characters, a colour for each, and kept
const PX_SPR=new Map();
function pxSprite(key, rows, pal){
  let cv=PX_SPR.get(key); if(cv) return cv;
  cv=document.createElement("canvas"); cv.width=rows[0].length; cv.height=rows.length;
  const g=cv.getContext("2d");
  if(g && g.fillRect) rows.forEach((r,y)=>[...r].forEach((c,x)=>{ const col=pal[c]; if(col){ g.fillStyle=col; g.fillRect(x,y,1,1); } }));
  PX_SPR.set(key, cv); return cv;
}

// ---------- the arcade's lettering ----------
// Press Start 2P, the arcade's font, is an eight-pixel font: each letter drawn once at eight pixels and
// made all or nothing, pixel by pixel, so none comes out soft. Sharps, flats and the diminished ring,
// which it hasn't got, drawn to match.
const PX_HAND={
  "♭":[".#......",".#......",".#......",".####...",".#..#...",".#.#....",".##.....","........"],
  "♯":["..#.#...",".#####..","..#.#...","..#.#...",".#####..","..#.#...","........","........"],
  "°":[".##.....","#..#....",".##.....","........","........","........","........","........"],
};
const PX_GLYPH=new Map();
let pxFontAsked=false;
function pxGlyph(ch, col){
  const key=ch+"|"+col; let cv=PX_GLYPH.get(key); if(cv) return cv;
  if(PX_HAND[ch]) return pxSprite("hand|"+key, PX_HAND[ch], {"#":col});
  const fonts=document.fonts, face='8px "Press Start 2P"';
  if(fonts && fonts.check && !fonts.check(face)){ if(!pxFontAsked && fonts.load){ pxFontAsked=true; fonts.load(face).then(()=>PX_GLYPH.clear()).catch(()=>{}); } return null; }
  cv=document.createElement("canvas"); cv.width=8; cv.height=8;
  const g=cv.getContext("2d"); if(!g || !g.fillText) return cv;
  g.font=face; g.textBaseline="top"; g.fillStyle=col; g.fillText(ch, 0, 0);
  const im=g.getImageData && g.getImageData(0,0,8,8);
  if(im && im.data && im.data.length){ for(let i=3;i<im.data.length;i+=4) im.data[i]=im.data[i]>=110 ? 255 : 0; g.putImageData(im,0,0); }
  PX_GLYPH.set(key, cv); return cv;
}
// a line of lettering, centred on x, its top at y, black round it so it reads over the picture
function pxText(g, text, cx, y, col, outline=true){
  const chars=[...text], x0=Math.round(cx-chars.length*4); y=Math.round(y);
  if(outline) for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]]) chars.forEach((ch,i)=>{ const m=pxGlyph(ch,"#000"); if(m) g.drawImage(m, x0+i*8+dx, y+dy); });
  chars.forEach((ch,i)=>{ const m=pxGlyph(ch,col); if(m) g.drawImage(m, x0+i*8, y); });
}

// ---------- the screen, zoomed ----------
// An upright arcade screen on a wide field (a desktop) fits its height long before its width, and a whole
// number of screen pixels a pixel leaves it a narrow strip. So zoomed further, as far as its whole width
// still fits and at least PX_SEEN of its height is in view, the view following the player up and down.
const PX_SEEN=.7;
function pxZoom(k, aw, ah, W, H){ return Math.max(k, Math.min(Math.floor(aw/W), Math.floor(ah/(H*PX_SEEN)))); }
// What's out of the view: a pointer at its edge nearest each, in its colour, with its chord, so what's
// coming is seen before it's on you. things: {x, y (its feet), col, label, ink}, in the screen's pixels.
const PX_POINT=["...#","..##",".###","####",".###","..##","...#"];
function pxOffscreen(g, v, ox, oy, things){
  for(const e of things){
    const x=ox+e.x, y=oy+e.y-5, out= y<0 ? "up" : y>v.h ? "down" : x<0 ? "left" : x>v.w ? "right" : null;
    if(!out) continue;
    const rows= out==="left" ? PX_POINT : out==="right" ? PX_POINT.map(r=>[...r].reverse().join(""))
      : [0,1,2,3].map(i=>PX_POINT.map(r=>r[out==="up" ? i : 3-i]).join(""));      // turned, its tip to the edge
    const arrow=pxSprite(`pxpoint|${out}|${e.col}`, rows, {"#":e.col}), n=[...e.label].length*4;
    if(out==="up" || out==="down"){
      const ax=Math.round(Math.max(n+2, Math.min(v.w-n-2, x))), ay= out==="up" ? 1 : v.h-1-arrow.height;
      g.drawImage(arrow, ax-3, ay); pxText(g, e.label, ax, out==="up" ? ay+arrow.height+1 : ay-9, e.ink);
    } else {
      const ay=Math.round(Math.max(8, Math.min(v.h-8, y))), ax= out==="left" ? 1 : v.w-1-arrow.width;
      g.drawImage(arrow, ax, ay-3); pxText(g, e.label, out==="left" ? ax+arrow.width+2+n : ax-2-n, ay-4, e.ink);
    }
  }
}
