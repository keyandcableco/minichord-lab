// The harp as a game controller: the standard strip or the keymaster grid read as a d-pad.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the harp as a game controller ----------
// With the harp in chromatic mode each section plays one known note (string n, counted from the
// lowest, plays the nth note up from C), so a game can read the harp as a d-pad. Two layouts:
//
// The standard minichord's strip, twelve sections stacked with the high notes at the top: three
// for up, two left, A, B, two right, three down. The big zones at each end are easy to hit blind.
// The keymaster harp's four rows of three, a d-pad as it stands: the bottom row (strings 1-3)
// down, the top row (10-12) up, 4 and 7 left, 6 and 9 right, 5 is B and 8 is A.
//   standard, top to bottom      keymaster
//   12 11 10  ▲                  10 11 12   ▲ ▲ ▲
//    9  8     ◀                   7  8  9   ◀ A ▶
//    7        A                   4  5  6   ◀ B ▶
//    6        B                   1  2  3   ▼ ▼ ▼
//    5  4     ▶
//    3  2  1  ▼
const KM_LAYOUTS={
  strip:{byString:["down","down","down","right","right","B","A","left","left","up","up","up"], drawOrder:[11,10,9,8,7,6,5,4,3,2,1,0], cols:1},
  keymaster:{byString:["down","down","down","left","B","right","left","A","right","up","up","up"], drawOrder:[9,10,11,6,7,8,3,4,5,0,1,2], cols:3},
};
const kmLayout=()=>KM_LAYOUTS[saved.harpLayout==="keymaster" ? "keymaster" : "strip"];
const KM_GLYPH={up:"▲",left:"◀",A:"A",B:"B",right:"▶",down:"▼"};
const kmControl=pc=>kmLayout().byString[mod(pc,12)];

// The keymaster harp as it looks: a leaning black plate with its twelve white notes in four rising
// rows of three, strings 1 to 3 the lowest row, 10 to 12 the top. Positions are percentages of the
// plate, measured from a photograph of it.
const KM_PLATE_DOTS=[[19,87.5],[50,78.5],[81,68],[19,67],[50,57.5],[81,47.5],[19,46.5],[50,36.5],[81,27],[19,26],[50,16.5],[81,8.5]].map(([x,y])=>[x,y+1.5]);   // three even columns, centred on the plate
const KM_PLATE_SHAPE="1.5,23.6 72.9,0.3 98.5,5 98.5,76.4 26.3,99.3 1.5,96.3";
/** fill el with the plate; label(stringIndex) gives each note's text. Returns the notes by string. */
function kmPlate(el, label){
  el.classList.add("kmplate");
  el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="${KM_PLATE_SHAPE}" fill="#0C0B0F" stroke="#4A443C" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  const dots=[];
  KM_PLATE_DOTS.forEach(([x,y],sI)=>{ const d=document.createElement("span"); d.className="kdot"; d.dataset.pc=sI; d.style.left=x+"%"; d.style.top=y+"%"; d.textContent=label(sI); el.appendChild(d); dots[sI]=d; });
  return dots;
}
/** the controller drawn beside the field, as the harp is laid out, lit as it's touched */
function kmStrip(field){
  const L=kmLayout(), el=document.createElement("div"); el.setAttribute("aria-label","The harp as a controller");
  if(L.cols===3){   // the keymaster: its own plate, each note marked with what it does
    el.className="kmstrip plate";
    kmPlate(el, sI=>KM_GLYPH[L.byString[sI]]).forEach((d,sI)=>{ const z=L.byString[sI]; d.classList.add("km",`km-${z}`); d.dataset.zone=z; });
  } else {
    el.className="kmstrip line";
    L.drawOrder.forEach(pc=>{ const z=L.byString[pc], c=document.createElement("span"); c.className=`km km-${z}`; c.dataset.zone=z; c.dataset.pc=pc; c.textContent=KM_GLYPH[z]; el.appendChild(c); });
  }
  field.appendChild(el); return el;
}
// the harp layout changed: draw the controller beside the field again, and the minichord's with it
function kmRestrip(){
  if(!blast || !blast.field) return;
  (blast.stripOrig||blast.strip)?.remove(); blast.stripOrig=null;
  blast.strip=kmStrip(blast.field);
  if(blast.kind==="snake"){ snLayout(); snDraw(); }
  if(blast.kind==="sweeper"){ swLayout(); swDraw(); }
  helperSync(true);
}
function kmFlash(strip, pc){ if(!strip) return; const c=strip.querySelector(`[data-pc="${mod(pc,12)}"]`); if(!c) return; c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit"); }
// set the harp up as a controller: chromatic, first rank, untransposed, and as loud as the player chose
// A preset's harp shuffling (address 40) swaps strings round, so the section you touch plays another
// string's note: every game that reads the harp turns it off while it plays, and gives it back after.
const harpInOrder=()=>{ if(hasSetting(40)) ensure(40,0); };
function kmHarp(){
  if(!canWrite()) return;
  harpInOrder();
  if(hasSetting(116)) borrow(116,1);
  borrow(98,1); if(hasSetting(36)) borrow(36, mc.params[36] ?? 0);   // harp mode written last: the strings retune
  if(hasSetting(30)) ensure(30,0);
  const vol=[null,30,0][saved.harpSound??1]; if(vol!=null && hasSetting(97)) borrow(97,vol);
}
