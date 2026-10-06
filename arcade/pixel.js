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

// Steered on a knob (pfKnob, controls.js): where it points, a little gold mark along the bottom of the view
const PX_MARK=["..#..",".###.","#####"];
function pxKnobMark(g, x, h){
  if(x==null || typeof pfKnob!=="function" || !pfKnob()) return;
  g.drawImage(pxSprite("pxmark", PX_MARK, {"#":"#FFD35A"}), Math.round(x-2), h-PX_MARK.length-1);
}

// ---------- the screen, zoomed ----------
// An upright arcade screen on a wide field (a desktop) fits its height long before its width, and a whole
// number of screen pixels a pixel leaves it a narrow strip. So zoomed further, as far as its whole width
// still fits and at least PX_SEEN of its height is in view, the view following the player up and down.
const PX_SEEN=.7;
function pxZoom(k, aw, ah, W, H){ return Math.max(k, Math.min(Math.floor(aw/W), Math.floor(ah/(H*PX_SEEN)))); }

// ---------- the screen, fitted ----------
// The room an arcade screen has in the field: beside the strip of harp sections if there is one (and
// with nothing beside it, right to the field's sides), under the score and over the bar along the foot.
// Gives its left edge and its width and height, in CSS pixels.
function pxRoom(){
  const fw=fieldW(), fh=fieldH(), strip=kmStripShown();
  const left= strip ? 8 : 0, side= !strip ? 0 : (saved.beginner || blast.phase==="demo") ? Math.ceil(Math.min(fw*.3, 300))+20 : (kmLayout().cols===3 ? 150 : 84);
  return {left, aw:fw-side-left, ah:fh-40-28};
}
// Where an arcade screen of its own (W by H pixels) goes in the field, and how big: a whole number of
// the screen's own pixels a pixel, not only of CSS pixels, so on a phone (three of its pixels to a CSS
// pixel) it can be four or five thirds of a CSS pixel a pixel, and an upright screen fills the phone's
// width as an arcade cabinet's does. The whole of it in view where that's at least `least` CSS pixels
// a pixel; where it isn't, that size, the view following the player. With nothing beside it (no strip
// of harp sections) it may go right to the field's sides; on a wide field, zoomed further (pxZoom).
// `fill`: on a phone's dense screen (two or more of its pixels to a CSS pixel), exactly as big as fits,
// not a whole number of the screen's pixels, so it meets the room's sides on any phone (one at 2.625 of
// its pixels to a CSS pixel loses a fifth of its width to a whole number), a pixel of the picture a
// screen pixel wider here and there than the next, too little to see; where the whole of it won't fit
// at `least`, as wide as the room, the view following the player up and down, so long as half its
// height is in view. A whole number still where that's within a twentieth of it, and always on a
// desktop's screen, where a pixel twice as wide as the next would show.
// Gives k (CSS pixels a pixel), the view's w and h, and where it sits, left and top.
function pxFit(W, H, least, zoom, fill){
  const {left, aw, ah}=pxRoom(), dpr=window.devicePixelRatio||1;
  let k;
  if(fill && dpr>=2){
    k=Math.min(aw/W, ah/H); if(k<least) k=Math.max(least, Math.min(aw/W, ah/(H/2)));
    const whole=Math.floor(k*dpr+1e-9)/dpr; if(whole>=k*.95 && whole>=least) k=whole;
  } else {
    let d=Math.max(1, Math.floor(Math.min(aw/W, ah/H)*dpr), Math.ceil(least*dpr-1e-9));       // screen pixels a pixel
    if(zoom) d=Math.max(d, Math.min(Math.floor(aw/W*dpr), Math.floor(ah/(H*PX_SEEN)*dpr)));
    k=d/dpr;
  }
  const w=Math.min(W, Math.floor(aw/k+1e-9)), h=Math.min(H, Math.floor(ah/k+1e-9)), on=v=>Math.round(v*dpr)/dpr;   // on a screen pixel
  return {k, w, h, left:on(left+(aw-w*k)/2), top:on(40+(ah-h*k)/2)};
}
// the screen's canvas put where pxFit says, at its size
function pxPlace(s, f){ if(s){ s.width=f.w; s.height=f.h; s.style.cssText=`left:${f.left}px;top:${f.top}px;width:${f.w*f.k}px;height:${f.h*f.k}px`; } }
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
