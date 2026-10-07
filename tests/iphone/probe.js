// The iPhone test's eyes, run inside the page (run.js puts it there). It looks at what's on the screen
// as a player would see it, not at the DOM as written: text and buttons hidden behind something opaque
// (the page under the phone's cabinet, a HUD under the options) don't count, and what's partly hidden
// does. probe(opts) returns what it found, each with its box in the viewport, for the report to draw.
//   opts.insets   the safe-area insets the phone has here {top, right, bottom, left}
//   opts.skipClip selectors whose insides move by design (the rules rolling up), not judged for clipping
//   opts.passing  selectors of what covers things only for a moment by design (the first visit's tip,
//                 gone at the first tap): what's under them isn't said to be covered
(function(){
const TAP_MIN=44, TAP_ERR=24;                 // Apple's 44 points; WCAG 2.2's 24 as the floor
const PIXEL_FONT=/press start 2p/i;           // Press Start 2P fills its em: 8px of it reads like 11px of a book face
const TEXT_MIN={pixel:{err:6, warn:8}, other:{err:9, warn:11}};
const INTERACTIVE="a[href],button,input,select,textarea,summary,[role=button],[onclick],.tdcell,.tdharp span,.tdz,.tdknob,.tdmod";

const cssPath=el=>{
  const parts=[];
  for(let e=el; e && e.nodeType===1 && parts.length<4; e=e.parentElement){
    let s=e.tagName.toLowerCase();
    if(e.id){ parts.unshift(s+"#"+e.id); break; }
    const cls=[...e.classList].filter(c=>!/^(on|lit|hint|blink|demo-on)$/.test(c)).slice(0,2);
    if(cls.length) s+="."+cls.join(".");
    parts.unshift(s);
  }
  return parts.join(" > ");
};
const alpha=c=>{ const m=c && c.match(/rgba?\(([^)]+)\)/); if(!m) return c==="transparent"?0:1; const p=m[1].split(/[ ,/]+/).filter(Boolean); return p.length>3 ? parseFloat(p[3]) : 1; };
// does this element hide what's under it? A see-through layer (a transparent overlay, the CRT's
// scanlines) doesn't; a background half opaque or more, a picture or a canvas does.
function opaque(e){
  if(/^(IMG|CANVAS|SVG|VIDEO|IFRAME)$/.test(e.tagName.toUpperCase())) return true;
  const cs=getComputedStyle(e);
  if(parseFloat(cs.opacity)<0.5) return false;
  return alpha(cs.backgroundColor)>=0.5 || (cs.backgroundImage && cs.backgroundImage!=="none");
}
// What's on top at a point, from el's point of view: "shown" if el (or something in it) is what's
// seen there, the element hiding it, or "gone" if el isn't there at all (clipped, or off the screen).
function seenAt(el, x, y){
  if(x<0 || y<0 || x>=innerWidth || y>=innerHeight) return "gone";
  for(const e of document.elementsFromPoint(x, y)){
    if(e===el || el.contains(e)) return "shown";
    if(e.contains(el)) return "gone";        // reached its own ancestors without meeting it: it isn't drawn here
    if(opaque(e)) return e;
  }
  return "gone";
}
// five points across a box, a little in from its edges
const samples=r=>{ const ix=Math.min(3, r.width/4), iy=Math.min(3, r.height/4);
  return [[r.left+r.width/2, r.top+r.height/2], [r.left+ix, r.top+iy], [r.right-ix, r.top+iy], [r.left+ix, r.bottom-iy], [r.right-ix, r.bottom-iy]]; };
function visibility(el, r){
  const seen=samples(r).map(([x,y])=>seenAt(el, x, y));
  const shown=seen.filter(s=>s==="shown").length;
  const hider=seen.find(s=>s && s.nodeType===1);
  return {shown, of:seen.length, hider, gone:seen.filter(s=>s==="gone").length};
}
const box=r=>[Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
// how much a transform (the cabinet scaling the game's screen) enlarges an element's text
const scaleOf=el=>{ const h=el.offsetHeight, r=el.getBoundingClientRect(); return h ? r.height/h : 1; };
const inside=(el, sels)=>sels.some(s=>el.closest(s));
// cut off only by the edge of a box that scrolls (the options, longer than the screen): that's what
// scrolling is, and the walk-through says so when it has to scroll to something
function scrolledOut(el, r){
  for(let p=el.parentElement; p && p!==document.body; p=p.parentElement){
    if(!/auto|scroll/.test(getComputedStyle(p).overflowY) || p.scrollHeight<=p.clientHeight+1) continue;
    const b=p.getBoundingClientRect(); return r.top<b.top-1 || r.bottom>b.bottom+1;
  }
  return false;
}

window.__iphoneProbe=function(opts={}){
  const ins={top:0, right:0, bottom:0, left:0, ...(opts.insets||{})}, skipClip=opts.skipClip||[], passing=opts.passing||[];
  const hiddenBy=h=>h && !passing.some(s=>h.closest(s)) ? h : null;
  const out=[], add=(sev, kind, msg, el, r, extra={})=>out.push({sev, kind, msg, sel:el ? cssPath(el) : "", box:r ? box(r) : null, ...extra});
  // pointer-events:none keeps an element out of elementsFromPoint; for looking, everything takes part
  const pe=document.createElement("style"); pe.textContent="*,*::before,*::after{pointer-events:auto!important}"; document.head.appendChild(pe);
  try{
    // ---- the page wider than the phone: it pans sideways under a thumb
    const sw=document.documentElement.scrollWidth;
    if(sw>innerWidth+1){
      const wide=[...document.body.querySelectorAll("*")].filter(e=>{ const r=e.getBoundingClientRect(); return r.width && r.right>innerWidth+1 && getComputedStyle(e).position!=="fixed"; })
        .filter((e,_,a)=>!a.some(o=>o!==e && o.contains(e))).slice(0,4);
      add("error", "h-scroll", `the page is ${sw}px wide on a ${innerWidth}px screen, so it pans sideways`, null, null, {culprits:wide.map(e=>cssPath(e)+` (to ${Math.round(e.getBoundingClientRect().right)}px)`)});
      wide.forEach(e=>add("error", "h-scroll", "sticks out past the right edge", e, e.getBoundingClientRect()));
    }
    // ---- text: big enough, and not cut off or half hidden
    const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode:n=>n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
    const seenEls=new Set(), lines=[];
    for(let n; (n=walker.nextNode());){
      const el=n.parentElement; if(!el || seenEls.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|TITLE|OPTION)$/.test(el.tagName)) continue;
      seenEls.add(el);
      if(el.checkVisibility && !el.checkVisibility({opacityProperty:true, visibilityProperty:true})) continue;
      const rg=document.createRange(); rg.selectNodeContents(n); const r=rg.getBoundingClientRect();
      if(r.width<1 || r.height<1) continue;
      const v=visibility(el, r); if(!v.shown) continue;           // hidden behind something, or off the screen: not seen
      const text=el.textContent.trim().replace(/\s+/g," ").slice(0,60);
      if(!inside(el, skipClip)) for(const lr of rg.getClientRects()) if(lr.width>2 && lr.height>2) lines.push({el, r:lr, text});
      const cs=getComputedStyle(el), px=parseFloat(cs.fontSize)*scaleOf(el), fam=PIXEL_FONT.test(cs.fontFamily) ? "pixel" : "other", lim=TEXT_MIN[fam];
      if(alpha(cs.color)<0.1 && !(cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth))) continue;   // see-through text (a block drawn by its box): nothing to read
      const icon=text.length<=2 && !/[A-Za-z0-9]/.test(text);                                                    // a symbol drawn as a glyph: an icon, not reading
      if(icon){} else if(px<lim.err) add("error", "tiny-text", `${px.toFixed(1)}px text (${fam==="pixel"?"pixel font, ":""}unreadable below ${lim.err}px)`, el, r, {text, px});
      else if(px<lim.warn) add("warn", "small-text", `${px.toFixed(1)}px text (${fam==="pixel"?"pixel font, ":""}hard to read below ${lim.warn}px)`, el, r, {text, px});
      if(v.shown<v.of && !inside(el, skipClip) && !scrolledOut(el, r)){
        if(v.hider){ if(hiddenBy(v.hider)) add("warn", "covered-text", `text partly covered by ${cssPath(v.hider)}`, el, r, {text}); }
        else add("warn", "clipped-text", "text cut off at the edge of its box or the screen", el, r, {text});
      }
      // its own box too narrow for it, and set to hide the rest
      if(el.scrollWidth>el.clientWidth+1 && el.clientWidth>0 && /hidden|clip/.test(cs.overflowX) && !inside(el, skipClip))
        add("warn", "clipped-text", `text wider than its box (${el.scrollWidth}px in ${el.clientWidth}px), the rest hidden`, el, r, {text});
      // under the notch or the home indicator, where viewport-fit=cover lets the page draw
      const unsafe=r.top<ins.top || r.left<ins.left || r.right>innerWidth-ins.right || r.bottom>innerHeight-ins.bottom;
      if(unsafe && (ins.top||ins.left||ins.right||ins.bottom))
        add("warn", "unsafe-area", "text under the notch, rounded corner or home indicator", el, r, {text});
    }
    // ---- text over text: two lines from different places drawn on top of each other
    const told=new Set();
    for(let i=0;i<lines.length;i++) for(let j=i+1;j<lines.length;j++){
      const a=lines[i], b=lines[j]; if(a.el===b.el || a.el.contains(b.el) || b.el.contains(a.el) || inside(a.el, passing) || inside(b.el, passing)) continue;
      const w=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left), h=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);
      if(w<=2 || h<=2 || w*h<0.15*Math.min(a.r.width*a.r.height, b.r.width*b.r.height)) continue;
      const k=cssPath(a.el)+"|"+cssPath(b.el); if(told.has(k)) continue; told.add(k);
      add("warn", "overlapping-text", `text drawn over other text: "${b.text.slice(0,30)}" (${cssPath(b.el)})`, a.el, a.r, {text:a.text});
    }
    // ---- a shape that's lost its proportions: an aspect-ratio asked for and not kept (a round button squashed flat)
    for(const el of document.body.querySelectorAll("*")){
      const ar=getComputedStyle(el).aspectRatio; if(!ar || ar==="auto") continue;
      const m=ar.match(/([\d.]+)\s*\/\s*([\d.]+)|^(?:auto\s+)?([\d.]+)$/); if(!m) continue;
      const want=m[1] ? parseFloat(m[1])/parseFloat(m[2]) : parseFloat(m[3]);
      const r=el.getBoundingClientRect(); if(r.width<8 || r.height<8 || !want) continue;
      const got=r.width/r.height, off=Math.abs(Math.log(got/want));
      if(off>Math.log(1.15) && visibility(el, r).shown) add("warn", "squashed", `drawn ${Math.round(r.width)}×${Math.round(r.height)}, though it asks to be ${ar} (${got>want?"stretched wide":"squeezed narrow"})`, el, r);
    }
    // ---- things to tap: big enough, all there, and not off in the unsafe area
    for(const el of document.querySelectorAll(INTERACTIVE)){
      if(el.closest("[hidden]") || (el.checkVisibility && !el.checkVisibility({opacityProperty:true, visibilityProperty:true}))) continue;
      if(el.matches(".tdharp span") || (el.matches(".tdz") && el.closest(".tddpad"))) continue;   // judged by their strip below
      const r=el.getBoundingClientRect(); if(r.width<1 || r.height<1) continue;
      const v=visibility(el, r); if(!v.shown) continue;
      const label=(el.getAttribute("aria-label") || el.textContent || el.value || "").trim().replace(/\s+/g," ").slice(0,40);
      const small=Math.min(r.width, r.height);
      if(small<TAP_ERR) add("error", "tiny-target", `tap target ${Math.round(r.width)}×${Math.round(r.height)}px (a finger needs ${TAP_MIN})`, el, r, {text:label});
      else if(small<TAP_MIN) add("warn", "small-target", `tap target ${Math.round(r.width)}×${Math.round(r.height)}px (Apple asks ${TAP_MIN}×${TAP_MIN})`, el, r, {text:label});
      if(v.shown<v.of && !scrolledOut(el, r)){
        if(v.hider){ if(hiddenBy(v.hider)) add("error", "covered-target", `button partly covered by ${cssPath(v.hider)}`, el, r, {text:label}); }
        else if(!inside(el, skipClip)) add("error", "clipped-target", "button partly off the screen or cut off", el, r, {text:label});
      }
      const unsafe=r.top<ins.top || r.left<ins.left || r.right>innerWidth-ins.right || r.bottom>innerHeight-ins.bottom;
      if(unsafe && (ins.top||ins.left||ins.right||ins.bottom)) add("warn", "unsafe-area", "tap target reaches under the notch, rounded corner or home indicator", el, r, {text:label});
      // Safari zooms the whole page in when a field under 16px is tapped
      if(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/^(button|submit|checkbox|radio|range|color|file|reset)$/.test(el.type||"") && parseFloat(getComputedStyle(el).fontSize)<16)
        add("warn", "ios-zoom", `a ${getComputedStyle(el).fontSize} field: Safari zooms the page when it's tapped (16px stops it)`, el, r, {text:label});
    }
    // the harp's strings, one strip shared out: each string needs a finger's width along it
    for(const h of document.querySelectorAll(".tdharp")){
      const r=h.getBoundingClientRect(), n=h.children.length; if(!n || !r.width) continue;
      const along=Math.max(r.width, r.height)/n, across=Math.min(r.width, r.height);
      if(along<TAP_ERR || across<TAP_ERR) add("error", "tiny-target", `harp strings ${along.toFixed(0)}px apart in a ${across.toFixed(0)}px strip`, h, r);
      else if(along<32) add("warn", "small-target", `harp strings only ${along.toFixed(0)}px apart`, h, r);
    }
    // ---- pictures that didn't load
    for(const img of document.images) if(img.complete && !img.naturalWidth && img.getBoundingClientRect().width) add("error", "broken-image", `image didn't load: ${img.getAttribute("src")}`, img, img.getBoundingClientRect());
    // ---- text drawn on canvases (Chord Chomp, Key Racer, Chord Hunt): its size as it lands on the screen
    for(const [cv, fonts] of (window.__canvasFonts||new Map())){
      if(!cv.isConnected) continue;
      const r=cv.getBoundingClientRect(); if(!r.width || !cv.width) continue;
      const k=r.width/cv.width;
      for(const f of fonts){ const m=f.match(/(\d+(?:\.\d+)?)px/); if(!m) continue;
        const px=parseFloat(m[1])*k, lim=PIXEL_FONT.test(f) ? TEXT_MIN.pixel : TEXT_MIN.other;
        if(px<lim.err) add("error", "tiny-text", `canvas text "${f}" lands at ${px.toFixed(1)}px`, cv, r, {px});
        else if(px<lim.warn) add("warn", "small-text", `canvas text "${f}" lands at ${px.toFixed(1)}px`, cv, r, {px}); }
    }
  } finally { pe.remove(); }
  return out;
};

// the canvases' fonts, as they're drawn with
if(window.CanvasRenderingContext2D && !window.__canvasFonts){
  window.__canvasFonts=new Map();
  const P=CanvasRenderingContext2D.prototype;
  for(const fn of ["fillText","strokeText"]){ const orig=P[fn];
    P[fn]=function(...a){ try{ let s=window.__canvasFonts.get(this.canvas); if(!s) window.__canvasFonts.set(this.canvas, s=new Set()); if(s.size<20) s.add(this.font); }catch(e){} return orig.apply(this, a); }; }
}
})();
