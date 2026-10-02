// Playing without a minichord on a touch screen: the instrument drawn under the game, played with the
// fingers. A front end on the virtual minichord (practice/virtual.js), as the computer keyboard is.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// The deck: the chord buttons, seven columns by three rows as on the instrument, with the modifier;
// and what the game plays besides, its harp (twelve strings, low to high, to pluck or strum), a d-pad
// where the game steers on the harp, and a knob where it steers on one. Each game shows what it needs.
//   chords   the chord buttons
//   harp     "notes": the twelve strings; "dpad": the harp as a game controller (arcade/controller.js),
//            drawn as a d-pad and A and B, each plucking the string the harp layout gives it
//   knob     a knob, turned by dragging along it
const TD_PROFILES={
  blaster:  {chords:1},
  command:  {chords:0, harp:"notes"},
  snake:    {chords:1, harp:"dpad"},
  asteroids:{chords:1, harp:"notes", knob:1},
  stack:    {chords:1, harp:"dpad"},                 // its knob slides the piece, as the d-pad does
  breakout: {chords:1, harp:"notes", knob:1},
  fifths:   {chords:1, harp:"notes", knob:1},
  chopper:  {chords:1, harp:"notes", knob:1},
  fleet:    {chords:1, harp:"notes"},
  sweeper:  {chords:1, harp:"dpad"},
  frets:    {chords:1, harp:"notes"},
  sight:    {chords:1, harp:"notes", knob:1},
  hunt:     {chords:1, harp:"notes"},
};
const TD_EVERYTHING={chords:1, harp:"notes"};                // the Practice Room's own games
const tdProfile=()=> (blast && blast.field && TD_PROFILES[blast.kind]) || TD_EVERYTHING;
// A finger near the line between two rows presses both, so one thumb plays the chords that take two
// buttons in a column and lie next to each other: major and minor (diminished), minor and seventh
// (minor seventh). The edge is this much of a button's height, on each side of the line.
const TD_EDGE=.22;
const td={on:false, deck:null, kind:null, touches:new Map(), knobV:.5, sharpLabels:""};
const tdOn=()=> td.on && vmOn();

// where a finger on the chord buttons is: its column, and the row or rows it presses
function tdZone(rect, x, y){
  if(!rect.width || !rect.height) return null;
  const fx=(x-rect.left)/rect.width, fy=(y-rect.top)/rect.height;
  if(fx<0 || fx>=1 || fy<0 || fy>=1) return null;
  const c=Math.floor(fx*7), ry=fy*3, r=Math.floor(ry), f=ry-r;
  const rows = f<TD_EDGE && r>0 ? [r-1,r] : f>1-TD_EDGE && r<2 ? [r,r+1] : [r];
  return {c, rows};
}
// the finger stays with what it pressed, wherever it slides (a pointer the browser no longer knows is let be)
const tdCapture=(el, e)=>{ try{ el.setPointerCapture(e.pointerId); }catch(x){} };
const tdBuzz=()=>{ try{ navigator.vibrate && navigator.vibrate(6); }catch(e){} };

function touchMinichord(on=true){
  if(on===td.on) return;
  td.on=on;
  virtualMinichord("touch", on);
  document.body.classList.toggle("tdplay", on);
  if(on){
    if(!document.getElementById("tdcss")){ const l=document.createElement("link"); l.id="tdcss"; l.rel="stylesheet"; l.href="touch.css"; document.head.appendChild(l); }
    tdBuild(); tdTimer=setInterval(tdSync, 400); td.leftCab=false; setTimeout(tdSync, 50);
  } else {
    clearInterval(tdTimer); td.touches.clear();
    const cab=document.querySelector(".fscab.phone"); if(cab){ cab.classList.remove("phone"); td.inCab=false; if(cab.classList.contains("pseudo")) fsExit(); else fsPlain(fsPlainWanted()); }
    tdWake();
    if(td.deck){ td.deck.remove(); td.deck=null; }
    document.documentElement.style.removeProperty("--td-h");
    vmKnobs(false);
  }
  const b=document.getElementById("touchBtn"); if(b) b.textContent = on ? "Put the screen minichord away" : "Play on the screen";
  if(typeof arcadeRelayout==="function") setTimeout(arcadeRelayout, 60);
}
let tdTimer=0;

// ---------- the deck ----------
function tdBuild(){
  const p=tdProfile(); td.kind=blast && blast.field ? blast.kind : null;
  vmKnobs(!!p.knob);
  if(td.touches.size){ td.touches.clear(); vmReset(); }          // fingers on the old deck let go
  td.sharpLabels="";                                           // the new buttons are labelled afresh
  if(!td.deck){
    td.deck=document.createElement("div"); td.deck.id="tdeck"; td.deck.className="tdeck";
    td.deck.addEventListener("contextmenu", e=>e.preventDefault());
    td.deck.addEventListener("pointerup", ()=>{ piano.start(); tdFullAtTap(); tdWake(); });   // sound, full screen and staying awake may only start from a touch
    if(window.ResizeObserver) new ResizeObserver(()=>tdHeight()).observe(td.deck);
  }
  const deck=td.deck; deck.innerHTML=""; deck.dataset.harp=p.harp||""; deck.dataset.chords=p.chords?"1":""; deck.dataset.knob=p.knob?"1":"";
  // the modifier, held like the instrument's, beside the chord buttons
  const modBtn=document.createElement("button"); modBtn.type="button"; modBtn.className="tdmod"; modBtn.textContent="♯"; modBtn.setAttribute("aria-label","The modifier: hold it");
  tdHold(modBtn, id=>{ tdBuzz(); vmModifier("m"+id, true); }, id=>vmModifier("m"+id, false));
  if(p.chords) deck.appendChild(modBtn);
  const top=document.createElement("div"); top.className="tdtop"; deck.appendChild(top);
  if(p.harp==="notes") top.appendChild(tdHarp());
  if(p.harp==="dpad") top.appendChild(tdDpad());
  if(p.knob) top.appendChild(tdKnob());
  const now=document.createElement("span"); now.className="tdnow"; top.appendChild(now);
  if(p.chords){ const g=document.createElement("div"); g.className="tdgrid"; deck.appendChild(g); tdGrid(g); }
  tdPlace(); tdDraw(); tdHeight();
}
// the deck goes where the game is: on the page, or in the full-screen cabinet
function tdPlace(){
  if(!td.deck) return;
  const home=document.querySelector(".fscab") || document.body;
  if(td.deck.parentNode!==home) home.appendChild(td.deck);
}
// Held sideways (a short, wide screen) the deck stands either side of the game, chords on the left and
// the harp and knob on the right; otherwise it lies along the bottom, and its height is what the game
// makes room for. touch.css has the same query.
const TD_SIDE="(orientation: landscape) and (max-height: 520px)";
const tdSide=()=> !!(window.matchMedia && matchMedia(TD_SIDE).matches);
function tdHeight(){ if(td.deck) document.documentElement.style.setProperty("--td-h", (tdSide() ? 0 : td.deck.offsetHeight)+"px"); }
// the game changed, or the cabinet went up or down: the deck follows
function tdSync(){
  if(!td.on) return;
  const kind=blast && blast.field ? blast.kind : null;
  if(kind!==td.kind) tdBuild(); else tdPlace();
  tdPhone(); tdHeight();
}
// On a phone the game plays in the phone's cabinet: its screen and the minichord drawn round it, filling
// the window, and full screen from the first tap where the browser allows it. Left for the page (SCREEN),
// it stays left until asked for again.
const tdPhoneWanted=()=> !!(window.matchMedia && matchMedia("(pointer: coarse)").matches) && document.documentElement.classList.contains("arcadepage");
function tdPhone(){
  const cab=document.querySelector(".fscab");
  if(cab){ cab.classList.add("phone"); td.inCab=true; return; }
  if(td.inCab){ td.inCab=false; td.leftCab=true; }               // the player went back to the page
  if(!td.leftCab && tdPhoneWanted() && blast && blast.field && typeof toggleFull==="function") toggleFull(blast.field, {auto:true});
}
function tdFullAtTap(){
  const cab=document.querySelector(".fscab.phone.pseudo"); if(!cab || td.askedFull) return;
  td.askedFull=true;
  const req=cab.requestFullscreen || cab.webkitRequestFullscreen;
  try{ const p=req && req.call(cab); p && p.catch && p.catch(()=>{}); }catch(e){}
}
// the screen stays awake while the phone's cabinet is up
async function tdWake(){
  const want=td.on && !!document.querySelector(".fscab.phone") && !document.hidden;
  if(want && !td.lock && navigator.wakeLock){ try{ td.lock=await navigator.wakeLock.request("screen"); td.lock.addEventListener("release", ()=>{ td.lock=null; }); }catch(e){} }
  else if(!want && td.lock){ td.lock.release().catch(()=>{}); td.lock=null; }
}
document.addEventListener("visibilitychange", ()=>tdWake());
// a button held by a finger: down and up, however the finger leaves
function tdHold(el, down, up){
  el.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(el, e); el.classList.add("on"); down(e.pointerId); });
  const end=e=>{ if(!el.classList.contains("on")) return; el.classList.remove("on"); up(e.pointerId); };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", end);
}

// the chord buttons: each finger presses the buttons under it, and sliding moves to the next
function tdGrid(g){
  for(let r=0;r<3;r++) for(let c=0;c<7;c++){ const b=document.createElement("span"); b.className="tdcell"; b.dataset.r=r; b.dataset.c=c; g.appendChild(b); }
  g.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(g, e); tdFinger(e.pointerId, tdZone(g.getBoundingClientRect(), e.clientX, e.clientY)); });
  g.addEventListener("pointermove", e=>{ if(td.touches.has(e.pointerId)) tdFinger(e.pointerId, tdZone(g.getBoundingClientRect(), e.clientX, e.clientY)); });
  const end=e=>tdFinger(e.pointerId, null);
  g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end); g.addEventListener("lostpointercapture", end);
}
// a finger's buttons: the new ones pressed first, then the old let go, so moving to the next chord
// is the legato change the instrument knows, never a gap
function tdFinger(id, zone){
  const was=td.touches.get(id), key=zone ? zone.c+":"+zone.rows.join() : "";
  if((was ? was.key : "")===key){ if(!zone) td.touches.delete(id); return; }
  if(zone){ td.touches.set(id, {key, zone}); tdBuzz(); zone.rows.forEach(r=>vmPress(`t${id}:${r}`, r, zone.c)); }
  else td.touches.delete(id);
  if(was) was.zone.rows.filter(r=>!zone || !zone.rows.includes(r)).forEach(r=>vmRelease(`t${id}:${r}`));
}

// the twelve strings, low to high: a finger plucks the string it lands on and each it crosses
function tdHarp(){
  const h=document.createElement("div"); h.className="tdharp"; h.setAttribute("aria-label","The harp");
  for(let i=0;i<12;i++){ const s=document.createElement("span"); s.dataset.i=i; s.textContent=SHARP_NAMES[i]; h.appendChild(s); }
  // lying along the bottom, low on the left; standing beside the game (a phone held sideways), high at
  // the top, as the instrument's
  const at=e=>{ const r=h.getBoundingClientRect(); if(!r.width || !r.height) return -1;
    if(r.height>r.width){ const f=(e.clientY-r.top)/r.height; return f<0||f>=1 ? -1 : 11-Math.floor(f*12); }
    const f=(e.clientX-r.left)/r.width; return f<0||f>=1 ? -1 : Math.floor(f*12); };
  const on=new Map();
  const go=(id,i)=>{ if(on.get(id)===i) return; if(on.has(id)) vmLetGo("h"+id); if(i<0){ on.delete(id); return; } on.set(id,i); tdBuzz(); vmPluck("h"+id, i); };
  h.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(h, e); go(e.pointerId, at(e)); });
  h.addEventListener("pointermove", e=>{ if(on.has(e.pointerId)) go(e.pointerId, at(e)); });
  const end=e=>{ if(on.has(e.pointerId)){ vmLetGo("h"+e.pointerId); on.delete(e.pointerId); } };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end); h.addEventListener("lostpointercapture", end);
  return h;
}
// the harp as a game controller: a d-pad and A and B, each plucking its string
function tdDpad(){
  const d=document.createElement("div"); d.className="tddpad"; d.setAttribute("aria-label","The harp as a controller");
  for(const z of ["up","left","right","down","B","A"]){
    const b=document.createElement("button"); b.type="button"; b.className="tdz tdz-"+z; b.dataset.zone=z; b.innerHTML=kmGlyph(z);
    tdHold(b, id=>{ const i=kmLayout().byString.indexOf(z); if(i<0) return; tdBuzz(); vmPluck("d"+id, i); }, id=>vmLetGo("d"+id));
    d.appendChild(b);
  }
  return d;
}
// the knob: dragged along, it turns by how far the finger goes, not where it lands, as a knob does
function tdKnob(){
  const k=document.createElement("div"); k.className="tdknob"; k.setAttribute("aria-label","The knob: drag along it");
  k.innerHTML="<i></i><b>KNOB</b>";
  let from=null;
  const which=()=> blast && blast.kind==="chopper" ? 0 : steerKnob();
  k.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(k, e); from={x:e.clientX, v:td.knobV, id:e.pointerId}; tdBuzz(); });
  k.addEventListener("pointermove", e=>{ if(!from || e.pointerId!==from.id) return; const w=k.getBoundingClientRect().width||1;
    td.knobV=Math.max(0, Math.min(1, from.v+(e.clientX-from.x)/w)); vmKnob(which(), td.knobV); tdDraw(); });
  const end=e=>{ if(from && e.pointerId===from.id) from=null; };
  k.addEventListener("pointerup", end); k.addEventListener("pointercancel", end);
  return k;
}

// what the deck shows: each button's chord in the key, the ones held lit, the chord playing
vmListen(()=>tdDraw());
function tdDraw(){
  const deck=td.deck; if(!deck || !td.on) return;
  const f=devFifths(), sharp=vmSharp(), names=f<0?FLAT_NAMES:SHARP_NAMES;
  const labels=f+"|"+sharp+"|"+(mc.params[31]??0);
  const held=new Set([...vm.presses.values()].map(p=>p.r+":"+p.c));
  deck.querySelectorAll(".tdcell").forEach(b=>{
    const r=+b.dataset.r, c=+b.dataset.c;
    if(td.sharpLabels!==labels){ const li=LETTERS.indexOf(VM_COLS[c]); let pc=mod(NAT[li]+keyAcc(li,f),12);
      if(sharp) pc=mod(pc+(mc.params[31]===1?-1:1),12);
      b.textContent=names[pc]+["","m","7"][r]; }
    b.classList.toggle("on", held.has(r+":"+c));
  });
  td.sharpLabels=labels;
  const lit=new Set(vm.strings.values());
  deck.querySelectorAll(".tdharp span").forEach(s=>s.classList.toggle("on", lit.has(+s.dataset.i)));
  const knob=deck.querySelector(".tdknob i"); if(knob) knob.style.width=(td.knobV*100)+"%";
  const now=deck.querySelector(".tdnow"); if(now) now.textContent=vmChordName();
}

// ---------- turning it on ----------
// a button beside the keyboard's, and on a touch screen with no minichord, on by itself in the arcade
(function(){
  const keys=document.getElementById("keysBtn"); if(!keys) return;
  const b=document.createElement("button"); b.type="button"; b.id="touchBtn"; b.title="Play the minichord drawn on the screen";
  b.textContent="Play on the screen"; b.onclick=()=>{ touchMinichord(!td.on); if(td.on) piano.start(); };
  keys.after(b);
  const coarse=window.matchMedia && matchMedia("(pointer: coarse)").matches;
  if(coarse && document.documentElement.classList.contains("arcadepage")) setTimeout(()=>{ if(!mc.out) touchMinichord(true); }, 300);
})();
