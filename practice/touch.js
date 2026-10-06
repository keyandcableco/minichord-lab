// Playing without a minichord on a touch screen: the instrument drawn under the game, played with the
// fingers. A front end on the virtual minichord (practice/virtual.js), as the computer keyboard is.
// And a phone with a real minichord plugged in: the phone's cabinet with the game's screen alone.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// The deck: the chord buttons, seven columns by three rows as on the instrument, with the modifier;
// and what the game plays besides, its harp (twelve strings, low to high, to pluck or strum), a d-pad
// where the game steers on the harp, and a knob where it steers on one. Each game shows what it needs.
//   chords   the chord buttons
//   harp     "notes": the twelve strings (or, for a player who knows a piano better, an octave of its
//            keys, C to B, each playing its string: saved.tdPiano); "dpad": the harp as a game controller (arcade/controller.js),
//            drawn as a d-pad and A and B, each plucking the string the harp layout gives it
//   knob     a knob, turned by dragging along it; Chord Asteroids in manual aim has two, one to orbit
//            the ship and one to aim it
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
  racer:    {chords:1, harp:"notes", knob:1},
  chomp:    {chords:1, harp:"dpad"},
  burger:   {chords:1, harp:"dpad", knob:2},            // its two knobs voice the chord: inversion and spacing
  kong:     {chords:1, harp:"dpad"},
  bros:     {chords:1, harp:"dpad"},
};
const TD_EVERYTHING={chords:1, harp:"notes"};                // the Practice Room's own games
function tdProfile(){
  const p=(blast && blast.field && TD_PROFILES[blast.kind]) || TD_EVERYTHING;
  if(blast && blast.kind==="asteroids" && (blast.aimManual || saved.asAim)) return {...p, knob:2};
  // a knob where the game wants one now: Chord Invaders' manual aim steers the ship on one, and a
  // bonus round tuned by a knob (TUNE IT) has one while it plays, whatever the game
  if(blast && blast.kind==="blaster" && (blast.aimManual || saved.invAim)) return {...p, knob:1};
  if(blast && blast.kind==="kong" && typeof dkKnobLift==="function" && dkKnobLift()) return {...p, knob:1};   // Dominant Kong's lifts: one is a knob
  if(blast && blast.bonus && !blast.bonus.over && blast.bonus.g && blast.bonus.g.knob && !p.knob) return {...p, knob:1};
  // and a bonus round played on the harp's notes (MISSING NOTE) has the strings while it plays, in a
  // game whose harp is a d-pad
  if(blast && blast.bonus && !blast.bonus.over && blast.bonus.g && blast.bonus.g.harp && p.harp!=="notes") return {...p, harp:"notes"};
  return p;
}
// what the deck is built for: when it changes (another game, or manual aim chosen), the deck's built again
const tdShape=()=>{ const p=tdProfile(); return (blast && blast.field ? blast.kind : "")+"|"+(p.knob||0)+"|"+(p.harp||"")+"|"+tdPianoOn(); };
// A finger near the line between two rows presses both, so one thumb plays the chords that take two
// buttons in a column and lie next to each other: major and minor (diminished), minor and seventh
// (minor seventh). The edge is this much of a button's height, on each side of the line.
const TD_EDGE=.22;
const td={on:false, deck:null, shape:null, touches:new Map(), knobV:{}, sharpLabels:"", latched:false, chordSinceMod:false, keyHold:null};
// One hand. A long press on the modifier latches it, held for the player till another long press (a
// double tap still flips it, latched or not); a long press on a chord button sets the key signature
// from it, as the key change combo does with both preset buttons held: the top row's the sharp keys
// (F♯ to B♯), the middle the naturals, the bottom the flats (F♭ to B♭). The button fills as it's held,
// from KEY_SHOW, naming the key, and the key's set at KEY_SET.
const TD_LATCH=500, TD_KEY_SHOW=250, TD_KEY_SET=1000;
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
    tdCss(); tdBuild(); tdTimer=setInterval(tdSync, 400); td.leftCab=false; setTimeout(tdSync, 50);
  } else {
    clearInterval(tdTimer); td.touches.clear();
    // put away for a minichord plugged in, the phone's cabinet stays up, the game's screen alone
    const cab=document.querySelector(".fscab.phone"); if(cab){ td.inCab=false;
      if(tdBareWanted()) tdBareUp(cab);
      else { cab.classList.remove("phone"); if(cab.classList.contains("pseudo")) fsExit(); else fsPlain(fsPlainWanted()); } }
    tdWake();
    if(td.deck){ td.deck.remove(); td.deck=null; }
    document.documentElement.style.removeProperty("--td-h");
    vmKnobs(false);
    td.latched=false; tdKeyHold(null);
  }
  const b=document.getElementById("touchBtn"); if(b) b.textContent = on ? "Put the screen minichord away" : "Play on the screen";
  if(typeof cabPress==="function") document.querySelectorAll(".cabpress").forEach(p=>p.textContent=cabPress());   // what wakes a title screen
  if(on) tdTip();
  if(typeof arcadeRelayout==="function") setTimeout(arcadeRelayout, 60);
}
let tdTimer=0;
const tdCss=()=>{ if(document.getElementById("tdcss")) return; const l=document.createElement("link"); l.id="tdcss"; l.rel="stylesheet"; l.href="touch.css"; document.head.appendChild(l); };

// ---------- the deck ----------
function tdBuild(){
  const p=tdProfile(); td.shape=tdShape();
  vmKnobs(!!p.knob);
  tdKeyHold(null);
  if(td.touches.size){ td.touches.clear(); vmReset(); }          // fingers on the old deck let go
  td.sharpLabels="";                                           // the new buttons are labelled afresh
  if(!td.deck){
    td.deck=document.createElement("div"); td.deck.id="tdeck"; td.deck.className="tdeck";
    td.deck.addEventListener("contextmenu", e=>e.preventDefault());
    td.deck.addEventListener("pointerup", ()=>{ piano.start(); tdFullAtTap(); tdWake(); });   // sound, full screen and staying awake may only start from a touch
    if(window.ResizeObserver) new ResizeObserver(()=>tdHeight()).observe(td.deck);
  }
  const deck=td.deck; deck.innerHTML=""; deck.dataset.harp=p.harp||""; deck.dataset.chords=p.chords?"1":""; deck.dataset.knob=p.knob?"1":""; deck.dataset.piano=p.harp==="notes" && tdPianoOn()?"1":"";
  // the modifier, held like the instrument's, beside the chord buttons
  const modBtn=document.createElement("button"); modBtn.type="button"; modBtn.className="tdmod"; modBtn.textContent="♯"; modBtn.setAttribute("aria-label","The modifier: hold it, or hold it a moment to latch it");
  // Latched, the modifier's already down, so a finger on it changes nothing the virtual minichord
  // sees: its press and release are handed to the double tap by hand. A long press latches (or lets go)
  // unless a chord's played under it, which is the modifier held as usual.
  let latchTimer=0;
  tdHold(modBtn, id=>{
    tdBuzz(); td.chordSinceMod=false;
    if(td.latched) vmTap(true);
    vmModifier("m"+id, true);
    clearTimeout(latchTimer);
    latchTimer=setTimeout(()=>{ if(!td.chordSinceMod && !vm.presses.size) tdLatch(!td.latched); }, TD_LATCH);
  }, id=>{
    clearTimeout(latchTimer);
    if(td.latched) vmTap(false);
    vmModifier("m"+id, false);
  });
  if(p.chords) deck.appendChild(modBtn);
  const top=document.createElement("div"); top.className="tdtop"; deck.appendChild(top);
  if(p.harp==="notes") top.appendChild(tdHarp());
  if(p.harp==="dpad") top.appendChild(tdDpad());
  if(p.knob===2 && blast && blast.kind==="burger"){ top.appendChild(tdKnob("INVERSION", ()=>steerKnob())); top.appendChild(tdKnob("SPACING", ()=>bkSpaceKnob())); }
  else if(p.knob===2){ top.appendChild(tdKnob("ORBIT", ()=>steerKnob())); top.appendChild(tdKnob("AIM", ()=>asAimKnob())); }
  else if(p.knob) top.appendChild(tdKnob("KNOB", ()=> blast && blast.kind==="chopper" ? 0 : steerKnob()));
  const now=document.createElement("span"); now.className="tdnow"; top.appendChild(now);
  if(p.chords){ const g=document.createElement("div"); g.className="tdgrid"; deck.appendChild(g); tdGrid(g); }
  deck.appendChild(tdMenuButton());
  tdPlace(); tdDraw(); tdHeight(); td.hintEls=null; tdWatchHints();
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
  if(tdShape()!==td.shape) tdBuild(); else tdPlace();
  tdPhone(); tdHeight(); tdWatchHints();
}
// Beginner mode and the demos light what to press on the game's own minichord. Played on the screen
// that one isn't shown (touch.css): the deck lights instead, the chord buttons, the modifier, a slash's
// bass, the string or the d-pad, as the game's lights them, the moment it does.
function tdWatchHints(){
  const els=[blast && blast.helpBoard && blast.helpBoard.el, blast && blast.helpHarp && blast.helpHarp.el].filter(e=>e && e.nodeType===1);
  if(td.hintEls && td.hintEls.length===els.length && td.hintEls.every((e,i)=>e===els[i])) return;
  td.hintObs && td.hintObs.disconnect(); td.hintEls=els;
  if(window.MutationObserver && els.length){
    td.hintObs=new MutationObserver(()=>{ if(!td.hintQueued){ td.hintQueued=true; requestAnimationFrame(()=>{ td.hintQueued=false; tdHints(); }); } });
    els.forEach(e=>td.hintObs.observe(e, {subtree:true, attributes:true, attributeFilter:["class"]}));
  }
  tdHints();
}
function tdHints(){
  const deck=td.deck; if(!deck) return;
  const hb=blast && blast.helpBoard, hh=blast && blast.helpHarp;
  const cell=(c,r)=> hb && hb.cells && hb.cells[c] && hb.cells[c][r];
  deck.querySelectorAll(".tdcell").forEach(b=>{ const c=cell(+b.dataset.c, +b.dataset.r);
    b.classList.toggle("hint", !!c && c.classList.contains("lit")); b.classList.toggle("slashhint", !!c && c.classList.contains("slashlit")); });
  const m=deck.querySelector(".tdmod"); if(m) m.classList.toggle("hint", !!(hb && hb.mod && hb.mod.classList.contains("lit")));
  const lit=new Set(); if(hh && hh.cells) hh.cells.forEach((c,i)=>{ if(c && c.classList.contains("lit")) lit.add(i); });
  deck.querySelectorAll(".tdharp span").forEach(s=>s.classList.toggle("hint", lit.has(+s.dataset.i)));
  const zones=new Set(); if(hb && hb.pad) hb.pad.querySelectorAll(".lit,.demo-on").forEach(e=>{ if(e.dataset.zone) zones.add(e.dataset.zone); });
  deck.querySelectorAll(".tdz").forEach(b=>b.classList.toggle("hint", zones.has(b.dataset.zone)));
}
// the first time on this device, a word on what isn't plain to see
function tdTip(){
  if(saved.tdTip2) return; saved.tdTip2=true; save();
  const tip=document.createElement("div"); tip.className="tdtip";
  tip.innerHTML="TAP THE CHORDS. A THUMB ON THE LINE BETWEEN TWO ROWS PLAYS BOTH: DIM, OR m7. DOUBLE-TAP ♯ TO FLIP SHARP AND FLAT; HOLD IT TO LOCK IT ON. HOLD A CHORD TO CHANGE KEY: TOP ROW ♯ KEYS, MIDDLE ♮, BOTTOM ♭.";
  (document.querySelector(".fscab") || document.body).appendChild(tip);
  const go=()=>{ tip.classList.add("gone"); setTimeout(()=>tip.remove(), 400); document.removeEventListener("pointerdown", go, true); };
  setTimeout(go, 8000); document.addEventListener("pointerdown", go, true);
}
// On a phone the game plays in the phone's cabinet: its screen and the minichord drawn round it, filling
// the window, and full screen from the first tap where the browser allows it. Left for the page (THE
// WHOLE PAGE, in the deck's menu), it stays left until asked for again (the page's SCREEN).
const tdPhoneWanted=()=> !!(window.matchMedia && matchMedia("(pointer: coarse)").matches) && document.documentElement.classList.contains("arcadepage");
function tdPhone(){
  const cab=document.querySelector(".fscab");
  if(cab){ cab.classList.add("phone"); td.inCab=true; return; }
  if(td.inCab){ td.inCab=false; td.leftCab=true; }               // the player went back to the page
  if(!td.leftCab && tdPhoneWanted() && blast && blast.field && typeof toggleFull==="function") toggleFull(blast.field, {auto:true});
}
// The installed app already has the whole screen (its manifest asks for it), so it isn't asked again:
// asking there only redraws the screen and has Android say once more how to leave full screen.
const tdInstalled=()=> !!(window.matchMedia && matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches);
function tdFullAtTap(){
  const cab=document.querySelector(".fscab.phone.pseudo"); if(!cab || td.askedFull) return;
  td.askedFull=true;
  if(tdInstalled()) return;
  const req=cab.requestFullscreen || cab.webkitRequestFullscreen;
  try{ const p=req && req.call(cab); p && p.catch && p.catch(()=>{}); }catch(e){}
}
// the screen stays awake while the phone's cabinet is up, played on the deck or on a minichord
async function tdWake(){
  const want=!!document.querySelector(".fscab.phone") && !document.hidden;   // the deck's, or the minichord's (tdBareUp)
  if(want && !td.lock && navigator.wakeLock){ try{ td.lock=await navigator.wakeLock.request("screen"); td.lock.addEventListener("release", ()=>{ td.lock=null; }); }catch(e){} }
  else if(!want && td.lock){ td.lock.release().catch(()=>{}); td.lock=null; }
}
document.addEventListener("visibilitychange", ()=>tdWake());

// ---------- the phone's menu ----------
// In the phone's cabinet the bezel's buttons (SOUND, RESET, SCREEN) would take a strip off the top of
// the game's screen, and they'd be too small for a thumb, so they're one button on the deck instead,
// ☰, beside the harp or d-pad (touch.css shows it only there). It opens a menu: the sound, a reset,
// the arcade's settings (on the page underneath, out of reach otherwise), full screen where the
// browser can do it (an iPhone can't, for anything but a video), more games, and the page itself.
const TD_MENU_ICON='<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 2h12v2H2zM2 6h12v2H2zM2 10h12v2H2z"/></svg>';
function tdMenuButton(){
  const b=document.createElement("button"); b.type="button"; b.className="tdmenu"; b.innerHTML=TD_MENU_ICON;
  b.setAttribute("aria-label", "Menu: connect a minichord, sound, reset, settings"); b.title="Menu";
  b.addEventListener("click", e=>{ e.stopPropagation(); tdMenu(); });
  return b;
}
const tdCanFull=()=>{ const cab=document.querySelector(".fscab"); return !!cab && !!(cab.requestFullscreen || cab.webkitRequestFullscreen) && !tdInstalled(); };
const tdIsFull=()=> !!(document.fullscreenElement || document.webkitFullscreenElement);
function tdMenu(){
  document.getElementById("tdMenuDlg")?.remove();
  const dlg=document.createElement("dialog"); dlg.id="tdMenuDlg"; dlg.className="arcadedlg tdmenudlg";
  dlg.innerHTML=`<h2>${(typeof TITLE_FOR!=="undefined" && TITLE_FOR[cabKind()]) || "MINICHORD ARCADE"}</h2><div class="tdmlist"></div><div class="aend"><button type="button" class="aclose">BACK TO THE GAME</button></div>`;
  const list=dlg.querySelector(".tdmlist");
  const row=(label, value, act)=>{
    const b=document.createElement("button"); b.type="button"; b.className="tdmrow";
    b.innerHTML=`<span>${label}</span><b>${value}</b>`; b.onclick=e=>{ e.stopPropagation(); sfx("press"); act(b); };
    list.appendChild(b); return b;
  };
  const shut=()=>dlg.close();
  const onOff=on=> on ? "ON" : `<em>OFF</em>`;
  if(navigator.requestMIDIAccess && !tdReal()) row("MINICHORD", mc.midi ? `<em>NOT FOUND</em>` : "CONNECT ▶", ()=>{ shut(); tdConnect(); });
  if(tdUsbAudio()!=null) row("SOUND OUT", TD_SOUND_OUT.find(o=>o.v===tdUsbAudio()).short, ()=>{ shut(); tdSoundOut(false); });
  row("SOUND", onOff(settings.sounds), b=>{
    const m=document.getElementById("muteBtn"); if(m) m.click(); else { settings.sounds=!settings.sounds; save(); }
    b.querySelector("b").innerHTML=onOff(settings.sounds);
  });
  row("RESET", "▶", ()=>{ shut(); coldBoot(); });
  row("SETTINGS", "▶", ()=>{ shut(); document.getElementById("arcadeDlg")?.remove(); arcadeSettings().showModal(); });
  if(tdCanFull()) row("FULL SCREEN", onOff(tdIsFull()), ()=>{
    shut(); const cab=document.querySelector(".fscab"); if(!cab) return;
    if(tdIsFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);   // the cabinet stays, filling the window
    else { const req=cab.requestFullscreen || cab.webkitRequestFullscreen; try{ const p=req.call(cab); p && p.catch && p.catch(()=>{}); }catch(e){} }
  });
  row("MORE GAMES", "▶", ()=>{ location.href=document.querySelector("#moreLink a")?.href || "../arcade/"; });
  row("THE WHOLE PAGE", "▶", ()=>{ shut(); fsExit(); });     // its SCREEN button brings the cabinet back
  dlg.querySelector(".aclose").onclick=shut;
  dlg.addEventListener("click", e=>{ if(e.target===dlg) shut(); });       // a tap outside closes it
  dlg.addEventListener("close", ()=>dlg.remove());
  document.body.appendChild(dlg); dlg.showModal();
}
// ---------- a phone with the minichord plugged in ----------
// An Android phone plays the arcade on the minichord itself, on a USB cable (an iPhone's browsers have
// no Web MIDI). A page can't see what's plugged in until the browser's allowed it MIDI, so the first
// time it's asked from the menu, MINICHORD, inside the cabinet; from then on the minichord's found by
// itself, when the page opens and the moment it's plugged in. Found, the deck steps aside (virtual.js)
// and the phone's cabinet is the game's screen alone, edge to edge: the minichord's the controller,
// and its chord buttons run the title screens. A small ☰ in the corner is the menu still. Unplugged,
// the deck comes back. Left for the page (THE WHOLE PAGE), it stays left, as the deck's cabinet does.
const tdReal=()=> !!vm.stepAsideFor || (!!mc.out && mc.out.id!=="virtual");
const tdBareWanted=()=> tdPhoneWanted() && tdReal();
// Connect, as the page's own button does it (room.js), but without putting the deck away first: if MIDI
// isn't allowed, or there's no minichord on the cable, the screen's minichord plays on.
async function tdConnect(){
  const c=document.getElementById("connect"); try{ piano.start(); }catch(e){}
  if(!mc.midi){
    if(c) c.disabled=true;
    const ok=await mc.connect();
    if(c){ if(ok) c.textContent="Connected"; else c.disabled=false; }
    if(!ok){ tdToast("MIDI NOT ALLOWED", "ALLOW IT IN THE SITE'S SETTINGS", 3200); return; }
  } else mc._ports();
  if(!tdReal()) tdToast("NO MINICHORD FOUND", "PLUG IT IN: IT'S FOUND BY ITSELF", 3200);
}
// the phone's cabinet, the deck gone: the game's screen alone, and the corner ☰
function tdBareUp(cab){
  tdCss(); cab.classList.add("phone","bare"); fsPlain(true);
  if(!cab.querySelector(":scope>.tdmenu")) cab.appendChild(tdMenuButton());
  if(!cab._bareTap){ cab._bareTap=true; cab.addEventListener("pointerup", ()=>{ if(cab.classList.contains("bare")){ tdFullAtTap(); tdWake(); } }); }
  td.bareIn=true; tdWake(); tdToast("MINICHORD CONNECTED", "PLAY ON THE INSTRUMENT");
  if(typeof arcadeRelayout==="function") setTimeout(arcadeRelayout, 60);
}
function tdBareDown(cab){ cab.classList.remove("bare"); cab.querySelector(":scope>.tdmenu")?.remove(); }
// kept up, or put up, as the minichord comes and goes
function tdBareSync(){
  if(td.on || !tdPhoneWanted()) return;
  const cab=document.querySelector(".fscab");
  if(cab && cab.classList.contains("bare")){
    if(!tdReal() && td.restartUntil && performance.now()<td.restartUntil) return;   // restarting for its USB audio: back in a moment
    if(!tdReal()){ tdBareDown(cab); td.bareIn=false; touchMinichord(true); tdToast("MINICHORD UNPLUGGED", "PLAY ON THE SCREEN"); }   // the deck moves into this cabinet
    return;
  }
  if(td.bareIn && !cab){ td.bareIn=false; td.bareLeft=true; }            // the player went back to the page
  if(!cab && !td.bareLeft && tdReal() && blast && blast.field && typeof toggleFull==="function") toggleFull(blast.field, {auto:true});
}
mc.addEventListener("ports", ()=>setTimeout(tdBareSync, 0));   // after the deck's stepped aside (virtual.js)
setInterval(tdBareSync, 500);                                    // and for a game that builds its field later

// ---------- where the sound goes, a minichord on a phone ----------
// From firmware 24 the minichord has a USB audio setting (address 244), the instrument's, not a
// preset's: 0 as it always was, offered to the phone as a speaker and playing nothing sent there, so
// the phone goes quiet; 1 the phone's sound played through the minichord, beside the instrument, to
// play along; 2 no speaker, so the phone keeps its own sound. Changing to or from 2 restarts the
// minichord, for the phone to see it. On an Android phone a minichord at 0 is asked about once, since
// its phone has just gone quiet ("leave it" is remembered); SOUND OUT in the menu changes it later.
// And at 2, the minichord's own sound can play through the phone too: the page plays what it sends
// over USB, which the browser treats as a microphone, so it asks for that.
const TD_USB_AUDIO=244;
const TD_SOUND_OUT=[
  {v:2, label:"THE PHONE", short:"PHONE", sub:"THE GAME'S SOUND STAYS ON THE PHONE"},
  {v:1, label:"THE MINICHORD", short:"MINICHORD", sub:"THE PHONE'S SOUND COMES OUT OF THE MINICHORD'S JACK, WITH ITS OWN: TO PLAY ALONG"},
  {v:0, label:"LEAVE IT", short:"<em>LOST</em>", sub:"AS IT WAS: THE PHONE'S SOUND GOES TO THE MINICHORD, WHICH DOESN'T PLAY IT"}];
const tdUsbAudio=()=> tdReal() && canWrite() && (mc.params[7]??0)>=24 && Number.isFinite(mc.params[TD_USB_AUDIO]) ? mc.params[TD_USB_AUDIO] : null;
const tdAndroid=()=> /Android/i.test(navigator.userAgent||"");
// the card: asked (the phone's just gone quiet), or from the menu
function tdSoundOut(ask){
  document.getElementById("tdMenuDlg")?.remove();
  const now=tdUsbAudio(); if(now==null) return;
  const dlg=document.createElement("dialog"); dlg.id="tdMenuDlg"; dlg.className="arcadedlg tdmenudlg tdsoundout";
  dlg.innerHTML=`<h2>SOUND OUT</h2>${ask ? `<p class="tdmsay">THE PHONE IS SENDING ITS SOUND TO THE MINICHORD, WHICH DOESN'T PLAY IT. WHERE SHOULD IT GO?</p>` : ""}<div class="tdmlist"></div><div class="aend"><button type="button" class="aclose">BACK TO THE GAME</button></div>`;
  const list=dlg.querySelector(".tdmlist"), shut=()=>dlg.close();
  for(const o of TD_SOUND_OUT){
    const b=document.createElement("button"); b.type="button"; b.className="tdmrow tdmopt"+(o.v===now ? " on" : ""); b.dataset.v=o.v;
    b.innerHTML=`<span>${o.label}<small>${o.sub}</small></span><b>${o.v===now ? "✓" : ""}</b>`;
    b.onclick=e=>{ e.stopPropagation(); sfx("press"); shut();
      if(o.v===0 && ask){ saved.usbAudioLeft=true; save(); }
      if(o.v!==now) tdUsbAudioSet(o.v); };
    list.appendChild(b);
  }
  if(now===2 && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    const b=document.createElement("button"); b.type="button"; b.className="tdmrow";
    b.innerHTML=`<span>THE MINICHORD ON THE PHONE TOO<small>ITS OWN SOUND THROUGH THE PHONE'S SPEAKER (THE BROWSER ASKS FOR THE MICROPHONE)</small></span><b>${saved.mcMonitor ? "ON" : "<em>OFF</em>"}</b>`;
    b.onclick=e=>{ e.stopPropagation(); sfx("press"); shut(); tdMonitor(!saved.mcMonitor); };
    list.appendChild(b);
  }
  dlg.querySelector(".aclose").onclick=shut;
  dlg.addEventListener("click", e=>{ if(e.target===dlg) shut(); });
  dlg.addEventListener("close", ()=>dlg.remove());
  document.body.appendChild(dlg); dlg.showModal();
}
// written to the minichord, which restarts when the phone has to be told: the cabinet waits for it,
// and the game sets it up afresh when it's back (a restart forgets what the game had set)
function tdUsbAudioSet(v){
  const was=mc.params[TD_USB_AUDIO];
  if(!mc.writeParam(TD_USB_AUDIO, v)) return;
  if((was===2)!==(v===2)){ td.restartUntil=performance.now()+12000; td.restartLost=false; tdMonitor(false, true);
    tdToast("MINICHORD RESTARTING", "A MOMENT, FOR THE PHONE TO SEE IT", 2600); }
}
mc.addEventListener("ports", ()=>{
  if(!td.restartUntil) return;
  if(!tdReal()){ td.restartLost=true; return; }
  if(td.restartLost){ td.restartUntil=0; td.restartLost=false; if(typeof newInstrument==="function") newInstrument(); }
});
// asked once, when a minichord at 0 is found on an Android phone
function tdUsbAsk(){
  if(td.usbAsked || !tdAndroid() || !tdPhoneWanted() || saved.usbAudioLeft || tdUsbAudio()!==0 || document.querySelector("dialog[open]")) return;
  td.usbAsked=true; tdSoundOut(true);
}
mc.addEventListener("device", ()=>setTimeout(()=>{ tdUsbAsk(); if(saved.mcMonitor && !td.mon && !td.monStarting && tdUsbAudio()===2) tdMonitor(true, true); }, 0));
// The minichord's own sound through the phone: what it sends over USB, played by the page. The
// browser lists it as a microphone, and only names its inputs once one's been allowed, so it asks,
// then picks the minichord's (the USB one), and plays it as it comes, untouched (no echo cancelling,
// no noise suppression, no levelling, which are for voices). quiet: put back by itself, not asked for.
async function tdMonitor(on, quiet=false){
  if(!quiet){ saved.mcMonitor=on; save(); }
  if(!on){ if(td.mon){ td.mon.stop(); td.mon=null; } return; }
  if(td.mon || td.monStarting) return;
  td.monStarting=true;
  const raw={echoCancellation:false, noiseSuppression:false, autoGainControl:false};
  let stream=null;
  try{
    try{ piano.start(); }catch(e){}
    stream=await navigator.mediaDevices.getUserMedia({audio:raw});
    const ins=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="audioinput");
    const dev=ins.find(d=>/minichord/i.test(d.label)) || ins.find(d=>/usb/i.test(d.label));
    if(!dev){ stream.getTracks().forEach(t=>t.stop()); if(!quiet) tdToast("NO MINICHORD SOUND FOUND", "IS IT PLUGGED IN, AND ON?", 3000); return; }
    if(stream.getAudioTracks()[0]?.getSettings?.().deviceId!==dev.deviceId){
      stream.getTracks().forEach(t=>t.stop());
      stream=await navigator.mediaDevices.getUserMedia({audio:{...raw, deviceId:{exact:dev.deviceId}}});
    }
    const ctx=piano.ctx; if(!ctx){ stream.getTracks().forEach(t=>t.stop()); return; }
    const src=ctx.createMediaStreamSource(stream); src.connect(ctx.destination);
    const s=stream; td.mon={stop(){ try{ src.disconnect(); }catch(e){} s.getTracks().forEach(t=>t.stop()); }};
    s.getAudioTracks()[0]?.addEventListener("ended", ()=>{ if(td.mon){ td.mon.stop(); td.mon=null; } });   // unplugged, or restarting
    if(!quiet) tdToast("THE MINICHORD ON THE PHONE", "ITS SOUND THROUGH THE PHONE'S SPEAKER", 2200);
  }catch(e){
    if(stream) stream.getTracks().forEach(t=>t.stop());
    if(!quiet){ saved.mcMonitor=false; save(); tdToast("MICROPHONE NOT ALLOWED", "THE PAGE NEEDS IT TO HEAR THE MINICHORD", 3000); }
  } finally { td.monStarting=false; }
}

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
  if(zone){ td.touches.set(id, {key, zone}); tdBuzz(); td.chordSinceMod=true; zone.rows.forEach(r=>vmPress(`t${id}:${r}`, r, zone.c)); }
  else td.touches.delete(id);
  if(was) was.zone.rows.filter(r=>!zone || !zone.rows.includes(r)).forEach(r=>vmRelease(`t${id}:${r}`));
  // one finger, still, on one button is a key change on the way; anything else isn't
  tdKeyHold(zone && zone.rows.length===1 && td.touches.size===1 ? {id, c:zone.c, r:zone.rows[0]} : null);
}

// the modifier latched, or let go: held under its own name, apart from any finger
function tdLatch(on){
  td.latched=on; vmModifier("latch", on);
  try{ navigator.vibrate && navigator.vibrate(on ? [12,50,12] : 25); }catch(e){}
  tdDraw();
}
// The key a chord button sets, held: the column's letter (round the circle of fifths, F to B, so its
// natural key is its place less one), sharpened on the top row, flattened on the bottom.
const tdKeyFifths=(c,r)=> c-1+[7,0,-7][r];
function tdKeyHold(h){
  const k=td.keyHold;
  if(k && h && k.id===h.id && k.c===h.c && k.r===h.r) return;
  if(k){ clearTimeout(k.show); clearTimeout(k.set); k.cell && k.cell.classList.remove("keying"); td.keyHold=null; k.after.forEach(go=>go()); }   // no key change: what waited on it goes ahead
  if(!h || !td.deck) return;
  const cell=td.deck.querySelector(`.tdcell[data-c="${h.c}"][data-r="${h.r}"]`); if(!cell) return;
  const f=tdKeyFifths(h.c, h.r);
  cell.dataset.key=KEY_NAMES_BY_FIFTHS[f]; cell.dataset.rel=tdNoteAt(f+3)+"m";   // and its relative minor: C♭ is A♭ minor's key
  td.keyHold={...h, cell, after:[],
    show:setTimeout(()=>{ if(tdHoldTaken()) tdKeyHold(null); else cell.classList.add("keying"); }, TD_KEY_SHOW),
    set:setTimeout(()=>{ if(tdHoldTaken()){ tdKeyHold(null); return; } td.keyHold=null; cell.classList.remove("keying"); tdFinger(h.id, null); tdSetKey(f); }, TD_KEY_SET)};
}
// A game that acts on a chord the moment it's played can wait instead to see whether it's a key change
// (Chord Hunt: a button held between ducks). go runs now if no button's held that way,
// or when the hold ends short of setting the key (the finger lifted or moved), and never if it sets it.
function tdAfterHold(go){ const k=tdOn() && td.keyHold; if(k) k.after.push(go); else go(); }
// a chord held for the game's own sake isn't a key change: Chord Invaders' beam, earned or burning,
// Chord Chomp's chords, held to sing the dots and catch the ghosts (except while a key's up to be set),
// Chord Hunt's shots, at a duck or the dog's tag (the key's set between them), Key Fleet's, whose
// chart is the buttons in C (a ship's called by playing it), and Sight Line's, Chord Burger's and
// Dominant Kong's, except while the key they ask for is still to be set
const tdHoldTaken=()=> typeof blast!=="undefined" && !!blast && blast.phase==="play" && (!!(blast.beamArmed || blast.beamOn) || (blast.kind==="chomp" && !blast.fruit) || (blast.kind==="hunt" && !!(blast.duck || blast.tag)) || blast.kind==="fleet"
  || (blast.kind==="sight" && blast.keyWant==null) || ((blast.kind==="burger" || blast.kind==="kong") && !!blast.keySet));
const KEY_NAMES_BY_FIFTHS={"-8":"F♭","-7":"C♭","-6":"G♭","-5":"D♭","-4":"A♭","-3":"E♭","-2":"B♭","-1":"F","0":"C","1":"G","2":"D","3":"A","4":"E","5":"B",
  "6":"F♯","7":"C♯","8":"G♯","9":"D♯","10":"A♯","11":"E♯","12":"B♯"};
// a note by its place on the line of fifths, F to B round again, with a flat or sharp (or two) for each
// time round: the relative minors of the far sharp keys want double sharps (B♯ major's is G𝄪 minor)
const tdNoteAt=f=>{ const n=Math.floor((f+1)/7); return "FCGDAEB"[mod(f+1,7)]+(n<0 ? "♭".repeat(-n) : "♯".repeat(n)).replace("♭♭","𝄫").replace("♯♯","𝄪"); };
// The key set, as the instrument sets it for itself: the Lab hears it the way it hears the combo, a
// game asking for a key takes it, and the deck says so, over the game, with the new key's chord.
function tdSetKey(f){
  const i=keyIndexOf(f); if(i<0 || !vmOn()) return;
  // as the key change combo reports it, so a game that listens for the combo hears a key that's
  // already set, C held in C too
  mc.unasked=true; mc.changed=new Set([35]);
  mc.writeParam(35, i);
  mc.unasked=false; mc.changed=new Set();
  try{ navigator.vibrate && navigator.vibrate([20,60,40]); }catch(e){}
  const root=mod(f*7, 12); vmPlay([60+root, 64+root, 67+root].map(n=>n>71 ? n-12 : n), {dur:.9, vel:70});
  const g=td.deck && td.deck.querySelector(".tdgrid");
  if(g){ g.classList.remove("keyset"); void g.offsetWidth; g.classList.add("keyset"); }
  tdToast(`KEY OF ${KEY_NAMES_BY_FIFTHS[f]}`, `${tdNoteAt(f+3)}m · ${sigText(f).toUpperCase()}`);
}
// a word over the game, gone in a moment: a key set, a minichord found
function tdToast(big, small, ms=1600){
  tdCss(); document.querySelectorAll(".tdkey").forEach(e=>e.remove());
  const b=document.createElement("div"); b.className="tdkey";
  b.innerHTML=`${big}<small>${small}</small>`;
  (document.querySelector(".fscab") || document.body).appendChild(b);
  setTimeout(()=>b.classList.add("gone"), ms); setTimeout(()=>b.remove(), ms+500);
}

// The harp as a piano's keys instead: one octave, C to B, the white keys side by side and the black
// keys over the lines between them, each key playing the string of its note. Chosen in the game's
// options; the strings are the instrument's, the keys for a player who knows a keyboard.
const tdPianoOn=()=> !!saved.tdPiano;
const TD_WHITE=[0,2,4,5,7,9,11], TD_BLACK_W=.6, TD_BLACK_L=.6;   // a black key's width (of a white key's) and length (of the keys')
// a black key sits over the line after the white key below it
const tdBlackAt=i=> TD_WHITE.indexOf(i-1)+1;
/** the key at f along the keys from the lowest (0 to 1) and g across them from the black keys' end: -1 if off them */
function tdKeyAt(f, g){
  if(!(f>=0 && f<1 && g>=0 && g<1)) return -1;
  const w=f*7;
  if(g<TD_BLACK_L) for(let i=1;i<12;i++) if(!TD_WHITE.includes(i) && Math.abs(w-tdBlackAt(i))<TD_BLACK_W/2) return i;
  return TD_WHITE[Math.floor(w)];
}
// the twelve strings, low to high: a finger plucks the string it lands on and each it crosses (on the
// piano's keys, plays the key it lands on and each it slides onto)
function tdHarp(){
  const piano=tdPianoOn(), h=document.createElement("div"); h.className="tdharp"+(piano?" tdpiano":""); h.setAttribute("aria-label", piano ? "The harp, as a piano's keys" : "The harp");
  for(let i=0;i<12;i++){ const s=document.createElement("span"); s.dataset.i=i; s.textContent=SHARP_NAMES[i];
    if(piano){ const wi=TD_WHITE.indexOf(i), black=wi<0;   // where along the keys it starts, and how wide it is, of a white key
      s.className=black?"b":"w"; s.style.setProperty("--a", ((black ? tdBlackAt(i)-TD_BLACK_W/2 : wi)/7*100)+"%"); s.style.setProperty("--s", ((black ? TD_BLACK_W : 1)/7*100)+"%"); }
    h.appendChild(s); }
  // lying along the bottom, low on the left; standing beside the game (a phone held sideways), high at
  // the top, as the instrument's (the piano's black keys on the far side, or standing, on the left)
  const at=e=>{ const r=h.getBoundingClientRect(); if(!r.width || !r.height) return -1;
    const fy=(e.clientY-r.top)/r.height, fx=(e.clientX-r.left)/r.width;
    if(piano) return r.height>r.width ? tdKeyAt(1-fy, fx) : tdKeyAt(fx, fy);
    if(r.height>r.width) return fy<0||fy>=1 ? -1 : 11-Math.floor(fy*12);
    return fx<0||fx>=1 ? -1 : Math.floor(fx*12); };
  const on=new Map();
  const go=(id,i)=>{ if(on.get(id)===i) return; if(on.has(id)) vmLetGo("h"+id); if(i<0){ on.delete(id); return; } on.set(id,i); tdBuzz(); vmPluck("h"+id, i); };
  h.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(h, e); go(e.pointerId, at(e)); });
  h.addEventListener("pointermove", e=>{ if(on.has(e.pointerId)) go(e.pointerId, at(e)); });
  const end=e=>{ if(on.has(e.pointerId)){ vmLetGo("h"+e.pointerId); on.delete(e.pointerId); } };
  h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end); h.addEventListener("lostpointercapture", end);
  return h;
}
// The harp as a game controller: a d-pad and A and B, each plucking its string, silently: it steers,
// it isn't music. The d-pad is read as a thumb stick, as the emulators have it: the whole square of
// it, the gaps and corners too, is one pad, and the way is where the thumb is from its middle, there as
// soon as it lands and changing as it slides (up to left without lifting, which the maze games need).
// A tap on an arrow is still that arrow. The way changes only once the thumb is clearly past the
// diagonal, so it doesn't flicker between two, and near the middle it's no way at all, so a flick out,
// back and out again is two steps for the games that move a square a pluck. A dot follows the thumb.
const TD_STICK_DEAD=.15, TD_STICK_LEAN=1.25;   // the middle, as a share of the pad's width; how much one axis must beat the other to change
function tdDpad(){
  const d=document.createElement("div"); d.className="tddpad"; d.setAttribute("aria-label","The harp as a controller");
  const pluck=(id,z)=>{ const i=kmLayout().byString.indexOf(z); if(i<0) return; tdBuzz(); vmPluck("d"+id, i, true); };
  const arrows={}, ring=document.createElement("i"); ring.className="tdstickring"; d.appendChild(ring);
  for(const z of ["up","left","right","down","B","A"]){
    const b=document.createElement("button"); b.type="button"; b.className="tdz tdz-"+z; b.dataset.zone=z; b.innerHTML=kmGlyph(z);
    if(z==="A" || z==="B") tdHold(b, id=>pluck(id,z), id=>vmLetGo("d"+id)); else arrows[z]=b;
    d.appendChild(b);
  }
  const dot=document.createElement("i"); dot.className="tdstickdot"; d.appendChild(dot);
  // the pad: the box round the four arrows, measured as the thumb lands (the deck may have moved)
  const padBox=()=>{ const rs=Object.values(arrows).map(b=>b.getBoundingClientRect()), l=Math.min(...rs.map(r=>r.left)), t=Math.min(...rs.map(r=>r.top)),
    rr=Math.max(...rs.map(r=>r.right)), bb=Math.max(...rs.map(r=>r.bottom)); return {l, t, w:rr-l, h:bb-t, cx:(l+rr)/2, cy:(t+bb)/2}; };
  let stick=null;                                       // {id, box, way}
  const wayAt=(e, was)=>{
    const b=stick.box; if(!b.w || !b.h) return was;        // nothing laid out to measure (the tests' page): the arrow it landed on
    const dx=e.clientX-b.cx, dy=e.clientY-b.cy, r=Math.min(b.w,b.h);
    if(Math.hypot(dx,dy)<r*TD_STICK_DEAD) return null;
    const ax=Math.abs(dx), ay=Math.abs(dy), h=dx<0?"left":"right", v=dy<0?"up":"down";
    if(was===h || was===v) return was===h ? (ay>ax*TD_STICK_LEAN ? v : h) : (ax>ay*TD_STICK_LEAN ? h : v);   // held past the diagonal to change
    return ax>ay ? h : v;
  };
  const show=(e)=>{
    for(const [z,b] of Object.entries(arrows)) b.classList.toggle("on", !!stick && stick.way===z);
    const b=stick && stick.box; if(!b || !b.w){ dot.hidden=true; return; }
    const r=d.getBoundingClientRect(), max=Math.min(b.w,b.h)/2, dx=e.clientX-b.cx, dy=e.clientY-b.cy, k=Math.min(1, max/(Math.hypot(dx,dy)||1));
    dot.hidden=false; dot.style.left=(b.cx-r.left+dx*k)+"px"; dot.style.top=(b.cy-r.top+dy*k)+"px";
  };
  const go=(e, way)=>{ if(way===stick.way) return; vmLetGo("d"+stick.id); stick.way=way; if(way) pluck(stick.id, way); };
  dot.hidden=true;
  d.addEventListener("pointerdown", e=>{
    if(e.target.closest(".tdz-A,.tdz-B") || stick) return;
    const box=padBox(), on=e.target.closest(".tdz");
    const inPad = on || (box.w && e.clientX>=box.l && e.clientX<=box.l+box.w && e.clientY>=box.t && e.clientY<=box.t+box.h);
    if(!inPad) return;
    e.preventDefault(); tdCapture(d, e);
    stick={id:e.pointerId, box, way:null};
    go(e, wayAt(e, on ? on.dataset.zone : null) ?? (box.w ? null : on && on.dataset.zone)); show(e);
  });
  d.addEventListener("pointermove", e=>{ if(!stick || e.pointerId!==stick.id) return; go(e, wayAt(e, stick.way)); show(e); });
  const end=e=>{ if(!stick || e.pointerId!==stick.id) return; vmLetGo("d"+stick.id); stick=null; show(e); };
  d.addEventListener("pointerup", end); d.addEventListener("pointercancel", end); d.addEventListener("lostpointercapture", end);
  return d;
}
// the knob: dragged along, it turns by how far the finger goes, not where it lands, as a knob does
function tdKnob(name, which){
  const k=document.createElement("div"); k.className="tdknob"; k.setAttribute("aria-label",`The ${name.toLowerCase()} knob: drag along it`);
  k.innerHTML=`<i></i><b>${name}</b>`; k.dataset.name=name;
  const v=()=> td.knobV[name] ?? .5;
  let from=null;
  k.addEventListener("pointerdown", e=>{ e.preventDefault(); tdCapture(k, e); from={x:e.clientX, v:v(), id:e.pointerId}; tdBuzz(); });
  k.addEventListener("pointermove", e=>{ if(!from || e.pointerId!==from.id) return; const w=k.getBoundingClientRect().width||1;
    td.knobV[name]=Math.max(0, Math.min(1, from.v+(e.clientX-from.x)/w)); vmKnob(which(), td.knobV[name]); tdDraw(); });
  const end=e=>{ if(from && e.pointerId===from.id) from=null; };
  k.addEventListener("pointerup", end); k.addEventListener("pointercancel", end);
  return k;
}

// What the deck shows: each button's chord in the key (or nothing, played bare, as on the instrument:
// a quarter more points), the harp's strings named (or bare too), the ones held lit, the chord playing,
// and the modifier's way, sharp or flat.
// Again whenever the minichord's settings change: a key set, the modifier double-tapped.
vmListen(()=>tdDraw());
mc.addEventListener("device", ()=>tdDraw());
const tdBare=()=> !!saved.tdBare, tdHarpBare=()=> !!saved.tdHarpBare;
function tdDraw(){
  const deck=td.deck; if(!deck || !td.on) return;
  const f=devFifths(), sharp=vmSharp(), names=vmNames(), bare=tdBare();
  const labels=f+"|"+sharp+"|"+(mc.params[31]??0)+"|"+bare+"|"+(mc.params[33]??0);
  if(td.latched && !vm.mod.has("latch")) td.latched=false;   // everything let go (the window left): the latch too
  const m=deck.querySelector(".tdmod"); if(m){ m.textContent = mc.params[31]===1 ? "♭" : "♯"; m.classList.toggle("latched", td.latched); }
  const held=new Set([...vm.presses.values()].map(p=>p.r+":"+p.c));
  deck.querySelectorAll(".tdcell").forEach(b=>{
    const r=+b.dataset.r, c=+b.dataset.c;
    if(td.sharpLabels!==labels){ const li=LETTERS.indexOf(VM_COLS[c]); let pc=mod(NAT[li]+keyAcc(li,f),12);
      if(sharp) pc=mod(pc+(mc.params[31]===1?-1:1),12);
      b.textContent = bare ? "" : names[pc]+vmQuality(String(r)); }
    b.classList.toggle("on", held.has(r+":"+c));
  });
  td.sharpLabels=labels;
  const lit=new Set(vm.strings.values()), hb=tdHarpBare();
  deck.querySelectorAll(".tdharp span").forEach(s=>{ s.classList.toggle("on", lit.has(+s.dataset.i)); s.textContent = hb ? "" : SHARP_NAMES[+s.dataset.i]; });
  deck.querySelectorAll(".tdknob").forEach(k=>{ k.querySelector("i").style.width=((td.knobV[k.dataset.name] ?? .5)*100)+"%"; });
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
