// A minichord without a minichord: the instrument, kept in the page, for playing with whatever's to
// hand. Its buttons, modifier, harp and knobs are pressed by a front end (the computer keyboard,
// practice/keyboard.js; a touch screen, later), and it answers as the instrument does: the chord its
// buttons make, by the firmware's own rules, sounded on the Lab's piano and reported the way a real
// minichord's MIDI is, so every game plays unaltered.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// The chord buttons are seven columns (F C G D A E B, round the circle of fifths) and three rows
// (major, minor, seventh); two or three held in a column make the rest.
const VM_COLS=["F","C","G","D","A","E","B"];
const VM_QUALITY={"0":"", "1":"m", "2":"7", "0,2":"maj7", "1,2":"m7", "0,1":"°", "0,1,2":"+"};
// The firmware's timings (firmware/src/main.cpp), so a hand moves on this one as on the instrument:
//   GRACE    a change to an established chord's buttons stands this long before it's believed, so
//            going from C to C7 (the seventh down a moment before the major's up) never sounds Cmaj7,
//            and letting go of a Cmaj7 never sounds the C on the way out (chord_type_grace)
//   SLASH    another column held this long under a chord makes it a slash chord, its bass that
//            column's root; shorter, it's a hand moving from one chord to the next (slash_grace)
//   RELEASE  letting go of a slash chord, the hands lift apart; within this, it ends as itself, not
//            as the bass's chord or the chord without its bass (slash_release_grace)
//   TAP      a chord tapped and let go at once still sounds this long, so the Lab hears it: a finger's
//            tap is shorter than the moment a chord takes to settle (a button's press never is)
const VM_GRACE=60, VM_SLASH=60, VM_RELEASE=80, VM_TAP=100;

const vm={
  on:false,
  fronts:new Set(),        // the front ends in use: "keys", "touch"
  presses:new Map(),       // a held button, by whatever's holding it (a key's code, a finger): {r, c, t}
  mod:new Set(),           // what's holding the modifier
  strings:new Map(),       // a held harp string, by what's holding it: its index
  // what the instrument believes: the chord's column and buttons, its slash, and since when
  col:-1, rows:"", slash:-1, believedAt:0,
  pend:null,               // a change to the chord's buttons waiting out the grace: {rows, since, grow}
  overlap:{col:-1, since:0}, bassGone:0, chordGone:0,
  sounding:"", soundAt:0, timer:0,
  listeners:new Set(),
};
const vmOn=()=> vm.on && !!(typeof mc!=="undefined" && mc.virtual);

// the settings a virtual minichord starts with: enough for every game to set up against
function vmDefaults(){
  const p={};
  for(let a=0;a<256;a++) p[a]=0;
  Object.assign(p, {2:80, 3:80, 7:0, 31:0, 35:0, 36:0, 39:0, 97:150, 112:12, 200:0, 201:0});
  return p;
}
// A front end takes the virtual minichord up, or puts it down; it's a minichord while any front end
// has it. It is a real minichord as far as the Lab is concerned, with settings a game can change and
// give back. What it isn't is a minichord for the high-score board: a game played this way is kept to
// this computer's board, the same as beginner mode.
function virtualMinichord(front, on=true){
  if(on) vm.fronts.add(front); else vm.fronts.delete(front);
  if(vm.fronts.size && !vm.on){
    vm.on=true; mc.virtual=true; mc.sysex=true;
    mc.out={id:"virtual", send(){}};                           // nothing leaves the page
    mc.writeParam=(a,v)=>{ mc.params[a]=v; mc.dispatchEvent(new Event("device")); return true; };
    mc.requestDump=()=>{};
    mc.control=()=>false;                                      // no push and pop: the Lab keeps its own bookkeeping
    mc.probePushPop=()=>Promise.resolve(false);
    Object.assign(mc.params, vmDefaults());
    mc.zone={type:"lower", members:15, known:false};           // one voice per note, as without MPE
    mc.dispatchEvent(new Event("device"));
  } else if(!vm.fronts.size && vm.on){
    vmReset();
    vm.on=false; mc.virtual=false; mc.virtualKnobs=false; mc.out=null; mc.sysex=false; mc.params.length=0;
    for(const k of ["writeParam","requestDump","control","probePushPop"]) delete mc[k];   // the real minichord's own again
    mc.dispatchEvent(new Event("device"));
  }
  vmTell();
}
// a front end that has knobs says so: the knob games then steer by them, as by a minichord's
function vmKnobs(on){ mc.virtualKnobs=!!on; }
// everything let go: a window losing focus, a front end put away
function vmReset(){
  vm.presses.clear(); vm.mod.clear(); vm.strings.clear(); vm.pend=null; clearTimeout(vm.timer);
  vm.col=-1; vm.rows=""; vm.slash=-1; vm.overlap={col:-1, since:0}; vm.bassGone=vm.chordGone=0;
  vm.soundAt=0; vmSound();                                     // silent at once, not after a tap's moment
}
// a front end that shows the instrument hears of every change
function vmListen(fn){ vm.listeners.add(fn); }
function vmTell(){ vm.listeners.forEach(fn=>fn()); }

// ---------- what the front ends press ----------
function vmPress(id, r, c){ if(!vmOn()) return; vm.presses.set(id, {r, c, t:performance.now()}); vmUpdate(); }
function vmRelease(id){ if(vm.presses.delete(id)) vmUpdate(); }
function vmModifier(id, on){
  if(!vmOn()) return;
  const was=vm.mod.size>0; on ? vm.mod.add(id) : vm.mod.delete(id);
  const now=vm.mod.size>0; if(was===now) return;
  vmTap(now);
  vmUpdate();
}
// The modifier's double tap, as the firmware has it: two taps, each shorter than VM_TAP_MAX and the
// second within VM_TAP_GAP of the first, with no chord button down (a tap with a chord held is a
// sharpen). It switches whatever the double tap is pointed at: each pair of settings names one to
// change (200, 209, 211) and the value to give it (201, 210, 212); the games point it at the
// modifier's direction (31). Another double tap puts back what it changed, unless something else
// has changed it since, which then stands.
const VM_TAP_MAX=250, VM_TAP_GAP=400, VM_TAP_PAIRS=[[200,201],[209,210],[211,212]];
function vmTap(down){
  const t=performance.now(), tap=vm.tap||(vm.tap={count:0, at:0, down:0, engaged:null});
  if(down){ tap.down=t; return; }
  if(t-tap.down>=VM_TAP_MAX || vm.presses.size){ tap.count=0; return; }     // a hold, or a chord down: not a tap
  if(tap.count===1 && t-tap.at<VM_TAP_GAP){ tap.count=0; vmDoubleTap(); }
  else { tap.count=1; tap.at=t; }
}
function vmDoubleTap(){
  const p=mc.params, tap=vm.tap;
  if(tap.engaged){
    for(const {a, saved, applied} of tap.engaged.reverse()) if(p[a]===applied) p[a]=saved;
    tap.engaged=null;
  } else {
    const done=[];
    for(const [ctl, val] of VM_TAP_PAIRS){
      const a=p[ctl]; if(!(a>=21 && a<=219) || VM_TAP_PAIRS.flat().includes(a) || done.some(d=>d.a===a)) continue;
      done.push({a, saved:p[a], applied:p[val]}); p[a]=p[val];
    }
    if(!done.length) return;
    tap.engaged=done;
  }
  mc.dispatchEvent(new Event("device"));                       // the Lab reads the settings as a minichord reports them
}
const vmSharp=()=> vm.mod.size>0;
// a harp string: its note (the twelve strings chromatic from middle C), and the same events a real
// pluck and release send
function vmPluck(id, i){
  if(!vmOn()) return;
  vm.strings.set(id, i);
  const note=60+i;
  mc.dispatchEvent(new CustomEvent("harp",{detail:{note, pitch:note, string:i, ch:0}}));
  vmPlay([note], {dur:.9, vel:70});
  vmTell();
}
function vmLetGo(id){
  if(!vm.strings.has(id)) return;
  const i=vm.strings.get(id); vm.strings.delete(id);
  if(![...vm.strings.values()].includes(i)) mc.dispatchEvent(new CustomEvent("harpoff",{detail:{note:60+i, ch:0}}));
  vmTell();
}
// a knob turned, 0 to 1: as the minichord sends it, "knobs send MIDI" on (CC 20, 21, 22)
function vmKnob(k, v){ if(!vmOn()) return; mc.handle([0xB0, 20+k, Math.max(0, Math.min(127, Math.round(v*127)))]); }

// ---------- the chord, by the firmware's rules ----------
// Which column is the chord and which the slash: the first column pressed is the chord (current_line),
// and stays the chord however many others are pressed. Another column held with it for VM_SLASH is the
// slash's bass, the rightmost if there are several, and moving the bass to another column follows it.
// Letting go of the chord's column while another is held moves the chord there (the next chord,
// pressed before this one's let go), unless a slash is ending: then the bass gets VM_RELEASE to follow.
function vmUpdate(){
  clearTimeout(vm.timer); vm.timer=0;
  const now=performance.now(), wake=[];
  const cols=new Map();
  for(const p of vm.presses.values()) (cols.get(p.c)||cols.set(p.c,new Set()).get(p.c)).add(p.r);
  const rowsOf=c=>[...(cols.get(c)||[])].sort().join();
  if(!cols.size){ vm.col=-1; vm.rows=""; vm.slash=-1; vm.pend=null; vm.overlap={col:-1, since:0}; vm.bassGone=vm.chordGone=0; }
  else {
    if(vm.col<0){                                              // from silence: the first column pressed, as its buttons land
      vm.col=[...vm.presses.values()].sort((a,b)=>a.t-b.t)[0].c; vm.rows=rowsOf(vm.col); vm.believedAt=now; vm.pend=null;
    } else if(!cols.has(vm.col)){                              // the chord's column let go, another held
      if(vm.slash>=0){
        if(!vm.chordGone) vm.chordGone=now;
        if(now-vm.chordGone<VM_RELEASE) wake.push(vm.chordGone+VM_RELEASE);   // the slash ends as itself if the bass follows
        else { vm.slash=-1; vm.chordGone=0; }
      }
      if(vm.slash<0){ vm.col=Math.min(...cols.keys()); vm.rows=rowsOf(vm.col); vm.believedAt=now; vm.pend=null; vm.overlap={col:-1, since:0}; }
    } else vm.chordGone=0;
    // the chord's buttons: a change to an established chord waits out the grace
    if(cols.has(vm.col)){
      const rows=rowsOf(vm.col);
      if(rows===vm.rows) vm.pend=null;
      else {
        const n=rows.split(",").length, was=vm.rows.split(",").length, take=()=>{ vm.rows=rows; vm.believedAt=now; vm.pend=null; };
        if(n>was && !vm.pend && now-vm.believedAt<VM_GRACE) take();          // still landing: taken at once
        else if(vm.pend && vm.pend.grow && n===was) take();                  // one down as another came up: a change of chord
        else {                                                               // an addition, or a letting go: if it stands
          if(!vm.pend || vm.pend.grow!==(n>was)) vm.pend={since:now, grow:n>was};
          if(now-vm.pend.since>=VM_GRACE) take(); else wake.push(vm.pend.since+VM_GRACE);
        }
      }
    }
    // the slash
    const others=[...cols.keys()].filter(c=>c!==vm.col);
    if(!others.length){
      if(vm.slash>=0 && cols.has(vm.col)){                     // the bass let go, the chord held: the plain chord, unless the chord follows
        if(!vm.bassGone) vm.bassGone=now;
        if(now-vm.bassGone>=VM_RELEASE){ vm.slash=-1; vm.bassGone=0; } else wake.push(vm.bassGone+VM_RELEASE);
      }
      vm.overlap={col:-1, since:0};
    } else if(cols.has(vm.col)){
      vm.bassGone=0;
      const held=Math.max(...others);
      if(held!==vm.overlap.col) vm.overlap={col:held, since:now};
      if(vm.slash>=0) vm.slash=held;                           // already slashing: the bass follows
      else if(now-vm.overlap.since>=VM_SLASH) vm.slash=held;
      else wake.push(vm.overlap.since+VM_SLASH);
    }
  }
  if(wake.length) vm.timer=setTimeout(vmUpdate, Math.max(1, Math.min(...wake)-now+1));
  vmSound();
  vmTell();
}
// the chord the instrument believes it's playing: its root and quality, and a slash's bass, as pitch
// classes, sharpened or flattened by the key signature and by the modifier, as on the instrument
function vmChordNow(){
  if(vm.col<0) return null;
  const q=VM_QUALITY[vm.rows]; if(q==null) return null;
  const f=devFifths(), sharp=vmSharp() ? (mc.params[31]===1 ? -1 : 1) : 0;
  const pcOf=c=>{ const li=LETTERS.indexOf(VM_COLS[c]); return mod(NAT[li]+keyAcc(li,f)+sharp, 12); };
  return {pc:pcOf(vm.col), q, bass: vm.slash>=0 ? pcOf(vm.slash) : null};
}
// the chord's name as the Lab spells it, for a front end to show
function vmChordName(){
  const ch=vmChordNow(); if(!ch) return "";
  const names=devFifths()<0 ? FLAT_NAMES : SHARP_NAMES;
  return names[ch.pc]+ch.q+(ch.bass!=null ? "/"+names[ch.bass] : "");
}
// What the instrument would send: four voices, as the firmware voices them, a slash's bass in place
// of the lowest (slash voice on the bass), and the Lab's own piano so it can be heard. The voices go
// in as a minichord's notes do, so the Lab reads them the same way: settled into a "chord" a moment
// after the last change, and "voices" while they sound.
function vmSound(){
  const ch=vmChordNow(), now=performance.now();
  const key=ch ? `${ch.pc}|${ch.q}|${ch.bass}` : "";
  if(key===vm.sounding) return;
  if(!ch && now-vm.soundAt<VM_TAP){ clearTimeout(vm.timer); vm.timer=setTimeout(vmUpdate, vm.soundAt+VM_TAP-now+1); return; }   // a tap: it sounds a moment yet
  vm.sounding=key; if(ch) vm.soundAt=now;
  let v=[];
  if(ch){
    const tones=(VL_TONES[ch.q]||FORM[ch.q].map(f=>f[1]));
    v=firmwareVoicing(ch.pc, tones, null, mc.params[112]??12).map(x=>x+48);
    if(ch.bass!=null){ const rest=v.slice(1), low=Math.min(...rest); let b=low-mod(low-ch.bass,12); if(b===low) b-=12; v=[b, ...rest]; }
  }
  mc.notes.clear();
  v.forEach(note=>mc.notes.set("0:"+note, {ch:0, note, vel:100, t:performance.now()}));
  if(!v.length) mc._lastChordKey="";                         // the same chord again is a new press
  mc._changed(true);
  if(v.length) vmPlay(v, {dur:1.4});
}
// the Lab's piano, heard if it can be: a browser that won't make a sound yet mustn't stop the chord
function vmPlay(notes, opts){ try{ piano.start(); piano.play(notes, opts); }catch(e){} }
addEventListener("blur", ()=>{ if(vmOn()){ vmReset(); vmTell(); } });
// a real minichord connected: the virtual one steps aside first, every front end put away
document.getElementById("connect")?.addEventListener("click", ()=>{
  if(!vm.on) return;
  if(typeof kbOn==="function" && kbOn()) document.getElementById("keysBtn")?.click();
  if(typeof touchMinichord==="function") touchMinichord(false);
}, true);
