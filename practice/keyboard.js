// Playing without a minichord: the computer keyboard as one.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// The keyboard's three letter rows sit as the minichord's chord buttons do (practice/virtual.js), so
// what a player learns here is the instrument's own layout:
//
//     Q W E R T Y U      major
//     A S D F G H J      minor
//     Z X C V B N M      seventh          shift = the modifier      1…= = the harp's twelve strings
//
// Two keys in a column make the sevenths and the rest; a key in another column held under a chord
// makes it a slash chord. The keyboard is a front end on the virtual minichord, which does the rest.
const KB_ROWS=[["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU"],
               ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ"],
               ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM"]];
const KB_HARP=["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"];
// keyboard play: the letters are the instrument's, so a game's own letter keys step aside
const kbOn=()=> vmOn() && vm.fronts.has("keys");

function keyboardMinichord(on=true){
  virtualMinichord("keys", on);
  document.body.classList.toggle("kbplay", kbOn());
  kbCard();
  if(typeof fullLabels==="function") fullLabels();            // the SCREEN button's key changes with the mode
}
document.addEventListener("keydown", e=>{
  if(!kbOn() || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(e.code==="ShiftLeft" || e.code==="ShiftRight"){ vmModifier(e.code, true); return; }
  const h=KB_HARP.indexOf(e.code);
  if(h>=0){ e.preventDefault(); vmPluck(e.code, h); return; }
  const r=KB_ROWS.findIndex(row=>row.includes(e.code));
  if(r>=0){ e.preventDefault(); vmPress(e.code, r, KB_ROWS[r].indexOf(e.code)); }
}, true);
document.addEventListener("keyup", e=>{
  if(!kbOn()) return;
  if(e.code==="ShiftLeft" || e.code==="ShiftRight"){ vmModifier(e.code, false); return; }
  if(KB_HARP.includes(e.code)){ vmLetGo(e.code); return; }
  vmRelease(e.code);
}, true);

// the card that shows the layout, and which chord the held keys are making
vmListen(()=>kbCard());
function kbCard(){
  if(!kbOn()){ const old=document.getElementById("kbcard"); old && old.remove(); return; }
  let el=document.getElementById("kbcard");
  if(!el){ el=document.createElement("div"); el.id="kbcard"; el.className="kbcard"; document.body.appendChild(el); }
  const f=devFifths(), sharp=vmSharp(), held=new Set([...vm.presses.keys()]);
  el.innerHTML=`<b>KEYBOARD MINICHORD</b>
    <div class="kbgrid">${KB_ROWS.map((row,r)=>row.map((code,c)=>{
      const li=LETTERS.indexOf(VM_COLS[c]); let pc=mod(NAT[li]+keyAcc(li,f),12);
      if(sharp) pc=mod(pc+(mc.params[31]===1?-1:1),12);
      const label=vmNames()[pc]+["", "m", "7"][r];
      return `<span class="${held.has(code)?"on":""}"><i>${code.replace("Key","")}</i>${label}</span>`;
    }).join("")).join("")}</div>
    <p>HOLD TWO IN A COLUMN FOR maj7, m7 OR dim · ANOTHER COLUMN UNDER A CHORD FOR A SLASH · SHIFT ${sharp?"(ON)":""} IS THE MODIFIER · 1…= PLUCK THE HARP · F2 FOR FULL SCREEN</p>
    <p class="kbnow">${vmChordName()||"&nbsp;"}</p>`;
}
