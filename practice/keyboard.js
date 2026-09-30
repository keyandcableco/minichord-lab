// Playing without a minichord: the computer keyboard as one.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// The minichord's chord buttons are seven columns (F C G D A E B, round the circle of fifths) and
// three rows (major, minor, seventh), and holding two or three of a column together gives the rest:
// major and seventh make a major seventh, minor and seventh a minor seventh, major and minor a
// diminished chord, all three an augmented one. The keyboard's three letter rows sit the same way, so
// what a player learns here is the instrument's own layout:
//
//     Q W E R T Y U      major
//     A S D F G H J      minor
//     Z X C V B N M      seventh          shift = the modifier      1…= = the harp's twelve strings
//
// It is a real minichord as far as the Lab is concerned: a virtual one, with settings a game can
// change and give back, so every game plays unaltered. What it isn't is a minichord for the high-score
// board: a game played this way is kept to this computer's board, the same as beginner mode.
const KB_COLS=["F","C","G","D","A","E","B"];                  // the chord buttons, left to right
const KB_ROWS=[["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU"],
               ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ"],
               ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM"]];
const KB_HARP=["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"];
// which chord each combination of rows plays, as the firmware does it
const KB_QUALITY={"0":"", "1":"m", "2":"7", "0,2":"maj7", "1,2":"m7", "0,1":"°", "0,1,2":"+"};
const kbOn=()=> !!(typeof mc!=="undefined" && mc.virtual);
const kbHeld=new Set();
let kbSounding=null, kbShift=false;

// the settings a virtual minichord starts with: enough for every game to set up against
function kbDefaults(){
  const p={};
  for(let a=0;a<256;a++) p[a]=0;
  Object.assign(p, {2:80, 3:80, 7:0, 31:0, 35:0, 36:0, 39:0, 97:150, 112:12, 200:0, 201:0});
  return p;
}
function keyboardMinichord(on=true){
  if(!on){ mc.virtual=false; mc.out=null; mc.sysex=false; mc.params.length=0; kbHeld.clear(); kbShift=false; kbSounding=null;
    document.body.classList.remove("kbplay"); kbCard();
    if(typeof fullLabels==="function") fullLabels();
    mc.dispatchEvent(new Event("device")); return; }
  mc.virtual=true; mc.sysex=true;
  mc.out={id:"keyboard", send(){}};                            // nothing leaves the page
  mc.writeParam=(a,v)=>{ mc.params[a]=v; mc.dispatchEvent(new Event("device")); return true; };
  mc.requestDump=()=>{};
  mc.control=()=>false;                                        // no push and pop: the Lab keeps its own bookkeeping
  mc.probePushPop=()=>Promise.resolve(false);
  Object.assign(mc.params, kbDefaults());
  mc.statusText="Playing with the keyboard";
  document.body.classList.add("kbplay");
  mc.dispatchEvent(new Event("device"));
  if(typeof fullLabels==="function") fullLabels();          // the SCREEN button's key changes with the mode
  kbCard();
}
// the chord the held keys make, as this minichord would play it: the column's letter, sharpened or
// flattened by the key signature (and by the modifier, as on the instrument), voiced as the firmware voices it
function kbChordNow(){
  const cols=new Map();
  for(const code of kbHeld){
    const r=KB_ROWS.findIndex(row=>row.includes(code)); if(r<0) continue;
    const c=KB_ROWS[r].indexOf(code);
    (cols.get(c)||cols.set(c,[]).get(c)).push(r);
  }
  if(!cols.size) return null;
  const [c,rows]=[...cols.entries()][0];
  const q=KB_QUALITY[[...new Set(rows)].sort().join()]; if(q==null) return null;
  const f=devFifths(), li=LETTERS.indexOf(KB_COLS[c]);
  let pc=mod(NAT[li]+keyAcc(li,f),12);
  if(kbShift) pc=mod(pc + (mc.params[31]===1 ? -1 : 1), 12);   // the modifier, the way the preset has it
  return {pc, q};
}
// what the instrument would send: four voices, and the Lab's own piano so it can be heard
function kbPlay(){
  const ch=kbChordNow();
  const key=ch ? ch.pc+"|"+ch.q : "";
  if(key===kbSounding) return;
  kbSounding=key;
  if(!ch){ mc.notes.clear(); mc.dispatchEvent(new Event("device")); return; }
  const tones=(VL_TONES[ch.q]||FORM[ch.q].map(f=>f[1]));
  const v=firmwareVoicing(ch.pc, tones, null, mc.params[112]??12).map(x=>x+48);
  piano.start(); piano.play(v, {dur:1.4});
  mc.dispatchEvent(new CustomEvent("chord",{detail:v.map((pitch,voice)=>({pitch, voice, note:Math.round(pitch)}))}));
}
// a harp string plucked: its note, and the same event a real pluck sends
function kbPluck(i){
  const base=mc.params[98]===1 || !kbChordNow() ? 60 : 60;      // the twelve strings, chromatic from middle C
  const note=base+i;
  piano.start(); piano.play([note], {dur:.9, vel:70});
  mc.dispatchEvent(new CustomEvent("harp",{detail:{note, pitch:note, string:i}}));
}
document.addEventListener("keydown", e=>{
  if(!kbOn() || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(e.code==="ShiftLeft" || e.code==="ShiftRight"){ kbShift=true; kbCard(); return; }
  const h=KB_HARP.indexOf(e.code);
  if(h>=0){ e.preventDefault(); kbPluck(h); return; }
  if(KB_ROWS.some(r=>r.includes(e.code))){ e.preventDefault(); kbHeld.add(e.code); kbPlay(); kbCard(); }
}, true);
document.addEventListener("keyup", e=>{
  if(!kbOn()) return;
  if(e.code==="ShiftLeft" || e.code==="ShiftRight"){ kbShift=false; kbCard(); return; }
  if(kbHeld.delete(e.code)){ kbPlay(); kbCard(); }
}, true);
addEventListener("blur", ()=>{ if(kbOn()){ kbHeld.clear(); kbShift=false; kbPlay(); kbCard(); } });

// the card that shows the layout, and which chord the held keys are making
function kbCard(){
  if(!kbOn()){ const old=document.getElementById("kbcard"); old && old.remove(); return; }
  let el=document.getElementById("kbcard");
  if(!el){ el=document.createElement("div"); el.id="kbcard"; el.className="kbcard"; document.body.appendChild(el); }
  const ch=kbChordNow(), f=devFifths();
  const name=ch ? (f<0?FLAT_NAMES:SHARP_NAMES)[ch.pc]+ch.q : "";
  el.innerHTML=`<b>KEYBOARD MINICHORD</b>
    <div class="kbgrid">${KB_ROWS.map((row,r)=>row.map((code,c)=>{
      const li=LETTERS.indexOf(KB_COLS[c]); let pc=mod(NAT[li]+keyAcc(li,f),12);
      if(kbShift) pc=mod(pc+(mc.params[31]===1?-1:1),12);
      const label=(f<0?FLAT_NAMES:SHARP_NAMES)[pc]+["", "m", "7"][r];
      return `<span class="${kbHeld.has(code)?"on":""}"><i>${code.replace("Key","")}</i>${label}</span>`;
    }).join("")).join("")}</div>
    <p>HOLD TWO IN A COLUMN FOR maj7, m7 OR dim · SHIFT ${kbShift?"(ON)":""} IS THE MODIFIER · 1…= PLUCK THE HARP · F2 FOR FULL SCREEN</p>
    <p class="kbnow">${name||"&nbsp;"}</p>`;
}
