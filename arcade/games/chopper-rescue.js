// Chopper Rescue: decode the radio's coordinates and fly to the chord. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chopper Rescue ----------
// A rescue flight that runs on decoding the radio. The radio calls coordinates in theory,
// "SURVIVORS AT vi IN G", and the player decodes them into a chord and plays it: the chopper lifts
// off the base, flies to where that chord lies, and if the call was decoded right, finds the
// survivors there, picks them up and brings them home. Nothing on the map gives the answer away.
// Every chord is a place on the ground, the same place every time (its column in fifths across,
// its row up the map), so a regular comes to know that E minor is out past the river, but the
// places aren't marked. A wrong chord flies somewhere empty ("NOBODY HERE") and back, burning time;
// a flare that burns out costs a life. Later calls use sevenths, secondary dominants, borrowed
// chords, and whole routes read as progressions. At the first levels the radio, after a while,
// says the chord outright, as training.
const CH_COLS="FCGDAEB", CH_ROWS=[["","MAJ"],["m","MIN"],["7","7"]];
const CH_DEG=[[0,""],[2,"m"],[4,"m"],[5,""],[7,""],[9,"m"]];            // I ii iii IV V vi in a major key
const CH_NUM=["I","ii","iii","IV","V","vi"];
const CH_KEYS_NEAR=["C","G","F","D"], CH_KEYS_ALL=["C","G","D","A","E","B","F","B♭","E♭","A♭","D♭"];
// Keys and degrees are dealt from shuffled bags, each used once before any comes round again, so no
// one call (vi in C, say) turns up more than its share; a bag is dealt afresh when a level changes it.
function chDeal(name, items){
  const bags=blast.bags||(blast.bags={}), id=name+":"+items.join(",");
  let b=bags[name]; if(!b || b.id!==id || !b.left.length) b=bags[name]={id, left:[...items].sort(()=>Math.random()-.5)};
  return b.left.pop();
}
// a call answers with chords the map and the harp can name plainly: no C♭, F♭, E♯ or B♯ roots, nothing doubly sharp or flat
const chPlain=call=>call.legs.every(l=>!/^[CF]♭|^[EB]♯|[𝄪𝄫]|♭♭|♯♯/.test(l.root) && !!spellChord(l.root, l.q));
// Every call now begins and ends with music. It comes in through static, over a station tone: tune
// the radio to it (a knob turns the dial, the arrow keys nudge it, or pluck the station's note on the
// harp) until the beating stops, and only then does the call come through and its clock start. And at
// the right place the survivors won't come up the winch until they're answered with their signal:
// the chord's notes plucked on the harp in order, root upward, and at the top level from the 3rd, the
// first inversion.
// Supply crates, flown out for by their chord, hold the power-ups: chopper-rescue-power.js.
const CH_LEVELS=[
  {n:"Flight school", keys:["C"], hint:true, arp:"root"},
  {n:"Nearby keys", keys:CH_KEYS_NEAR, hint:true, arp:"root"},
  {n:"Every key", keys:CH_KEYS_ALL, arp:"root"},
  {n:"Sevenths and V of V", keys:CH_KEYS_ALL, sevenths:true, arp:"root"},
  {n:"Borrowed chords and routes", keys:CH_KEYS_ALL, sevenths:true, borrowed:true, routes:true, arp:"inv1"},
];
const CH_TUNE_SECS=10, CH_TUNED=12;                 // seconds to tune in before the signal comes through weak; cents close enough
// a scale degree of a key, spelled: the root name
const chRoot=(key, semis)=>{ const letters={0:0,2:1,4:2,5:3,7:4,9:5,10:6,11:6,3:2,8:5}; return above(key, letters[semis]??0, semis) || key; };
// one call: what the radio says, and the chord (or chords, for a route) that answers it
function chCall(L){
  for(let k=0;k<30;k++){ const c=chCallOnce(L); if(chPlain(c)) return c; }
  return chCallOnce({...L, keys:["C"]});
}
function chCallOnce(L){
  const key=chDeal("key", L.keys), kind=Math.random();
  if(L.routes && kind<.22){   // a route: ii–V–I, or I–vi–IV–V's first three
    const route = Math.random()<.5 ? [[2,"m","ii"],[7,"","V"],[0,"","I"]] : [[0,"","I"],[9,"m","vi"],[5,"","IV"]];
    return {key, text:`ROUTE ${route.map(r=>r[2]).join("–")} IN ${key}`, legs:route.map(([st,q])=>({root:chRoot(key,st), q})), what:"WAYPOINTS"};
  }
  if(L.borrowed && kind<.4){
    const b=rnd([[10,"","♭VII"],[8,"","♭VI"],[5,"m","iv"]]);
    return {key, text:`FUEL AT ${b[2]} IN ${key}`, legs:[{root:chRoot(key,b[0]), q:b[1]}], what:"FUEL"};
  }
  if(L.sevenths && kind<.6){
    if(Math.random()<.5) return {key, text:`MEDIC AT V7 IN ${key}`, legs:[{root:chRoot(key,7), q:"7"}], what:"MEDIC"};
    return {key, text:`SUPPLIES AT V OF V IN ${key}`, legs:[{root:chRoot(key,2), q:"7"}], what:"SUPPLIES"};
  }
  const i=chDeal("deg", CH_DEG.map((_,j)=>j)), [st,q]=CH_DEG[i];
  return {key, text:`SURVIVORS AT ${CH_NUM[i]} IN ${key}`, legs:[{root:chRoot(key,st), q}], what:"SURVIVORS"};
}
// where a chord lands: its root letter's column, its quality's row
function chPad(root, q){ const col=CH_COLS.indexOf(root[0]); const row = q==="7" ? 2 : /^m/.test(q)&&q!=="maj7" ? 1 : 0; return {col, row}; }
function genChopper(){
  return {kind:"chopper", prompt:"Chopper Rescue", sub:"The chord buttons are your cockpit and the map below: seven columns in fifths, three rows. The radio calls coordinates in theory; fly there by playing that chord before the flare burns out.",
    answer:{type:"chopper", get name(){ const l=blast && blast.kind==="chopper" && blast.call ? blast.call.legs[blast.leg] : null; return l ? l.root+l.q : "the called chord"; }},
    get hint(){ const l=blast && blast.kind==="chopper" && blast.call ? blast.call.legs[blast.leg] : null; return l ? `${blast.call.text}: that's ${l.root}${l.q}.` : "Wait for the radio."; },
    context:0};
}
const chLevelOk=()=>true;
function startChopper(){
  blast={kind:"chopper", score:0, lives:3, level:0, rescues:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), call:null, leg:0, pos:{base:true}, found:null};
  chDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  chMenu();
  blast.raf=requestAnimationFrame(chTick);
}
function chDevice(){
  if(!blast || blast.kind!=="chopper" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(knobsReady()) borrow(238,1); });   // the harp chromatic (the station's note, the signal); the knobs sending MIDI, to turn the dial
}
function buildChopperField(box){
  const field=document.createElement("div"); field.className="field arcade chopper"; field.setAttribute("aria-label","The landing zones");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const radio=document.createElement("div"); radio.className="chradio"; radio.innerHTML=`<span class="chant">📻</span><span class="chtext">RADIO QUIET</span><span class="chmeter" aria-label="Signal"><i></i><i></i><i></i><i></i><i></i></span><span class="chfuel"><i></i></span>`; field.appendChild(radio);
  const map=document.createElement("div"); map.className="chmap"; field.appendChild(map);
  const heli=document.createElement("div"); heli.className="chheli"; heli.innerHTML=CH_HELI; field.appendChild(heli);
  box.append(field);
  if(blast && blast.kind==="chopper"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.radioEl=radio; blast.mapEl=map; blast.heliEl=heli; blast.fx=fxInit(field);
    setTimeout(()=>{ chLayout(); chDrawMap(); chPlace(true); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  chBar(); setTimeout(helperSync);
}
// the chopper: a pixel helicopter with a spinning rotor
const CH_HELI=`<svg viewBox="0 0 32 20" shape-rendering="crispEdges" aria-hidden="true">
  <rect class="rotor" x="2" y="1" width="28" height="1" fill="#F1E8D2"/><rect x="15" y="2" width="2" height="3" fill="#9A93B5"/>
  <rect x="8" y="5" width="14" height="8" fill="#FFD35A"/><rect x="6" y="7" width="2" height="5" fill="#FFD35A"/><rect x="10" y="6" width="5" height="4" fill="#7FE9FF"/>
  <rect x="22" y="7" width="8" height="2" fill="#E9A23B"/><rect x="29" y="5" width="2" height="5" fill="#F1E8D2"/>
  <rect x="9" y="13" width="1" height="3" fill="#9A93B5"/><rect x="19" y="13" width="1" height="3" fill="#9A93B5"/><rect x="6" y="16" width="17" height="1" fill="#F1E8D2"/></svg>`;
function chLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  const top=110, left=Math.max(120, W*.16), right=W-Math.max(30, W*.04), bottom=H-60;
  blast.cw=(right-left)/7; blast.rh=(bottom-top)/3; blast.mx=left; blast.my=top; blast.fh=H;
}
const chXY=(col,row)=>[blast.mx+(col+.5)*blast.cw, blast.my+(row+.5)*blast.rh];
// Emergencies on the ground. Each call is an emergency (a fire, a bear, a yeti, a boat going down,
// hikers stranded), and it shows on the map where it is, but never alone: the same kind of trouble
// breaks out in one or two other places too, so the map shows that something's wrong, and only the
// radio's coordinates say which one to fly to.
const CH_EMERG=[
  {k:"fire", say:"FIRE AT"}, {k:"bear", say:"BEAR SIGHTED AT"}, {k:"yeti", say:"YETI ATTACK AT"},
  {k:"boat", say:"BOAT SINKING AT"}, {k:"hikers", say:"HIKERS STRANDED AT"},
  // and the musicians
  {k:"drummer", say:"DRUMMER LOST AT"},
  {k:"bassist", say:"BASSIST NOBODY NOTICED AT"},
  {k:"banjo", say:"BANJO PLAYER STILL TUNING AT", what:"BANJO PLAYER"},
  {k:"bagpiper", say:"BAGPIPER NOBODY WILL GO NEAR AT"},
  {k:"roadie", say:"ROADIE BURIED IN CABLE AT"},
  {k:"engineer", say:"SOUND ENGINEER STILL LINE-CHECKING AT", what:"SOUND ENGINEER"},
  {k:"singer", say:"SINGER WAITING FOR APPLAUSE AT"},
];
// the little animated sprites: two frames each, swapped by CSS
const CH_SPRITES={
  // a kit: bass drum, snare, cymbal, the sticks flying
  drummer:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#F1E8D2" d="M4 8h6v1H4zM3 9h1v4H3zM10 9h1v4h-1zM4 13h6v1H4z"/><path fill="#FF4B3E" d="M4 9h6v4H4z"/><path fill="#F1E8D2" d="M6 10h2v2H6z"/><path fill="#FFD35A" d="M11 4h5v1h-5z"/><path fill="#9A93B5" d="M13 5h1v9h-1z"/><g class="f1"><path fill="#C9A06A" d="M1 2h1v1H1zM2 3h1v1H2zM3 4h1v1H3zM4 5h1v1H4zM7 1h1v1H7zM8 2h1v1H8zM9 3h1v1H9z"/><path fill="#F1E8D2" d="M0 1h1v1H0zM6 0h1v1H6z"/></g><g class="f2"><path fill="#C9A06A" d="M2 1h1v1H2zM3 2h1v1H3zM4 3h1v1H4zM5 4h1v1H5zM8 0h1v1H8zM9 1h1v1H9zM10 2h1v1h-1z"/><path fill="#F1E8D2" d="M1 0h1v1H1zM7 -1h1v1H7z"/></g></svg>`,
  // a bassist, the long neck of the bass, and nobody looking
  bassist:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#E8B48A" d="M4 2h3v3H4z"/><path fill="#6FA7D8" d="M3 5h5v5H3zM4 10h1v4H4zM6 10h1v4H6z"/><path fill="#6B4226" d="M6 7h4v4H6z"/><path fill="#C9A06A" d="M10 8h5v1h-5z"/><path fill="#F1E8D2" d="M14 7h1v1h-1zM15 8h1v1h-1z"/><g class="f2"><path fill="#6B6358" d="M11 5h2v2h-2zM13 1h1v5h-1zM14 1h1v2h-1z"/></g></svg>`,
  // a banjo, its tuning peg turning and turning
  banjo:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#C9C0A8" d="M3 7h6v6H3zM2 8h1v4H2zM9 8h1v4H9zM4 6h4v1H4zM4 13h4v1H4z"/><path fill="#F1E8D2" d="M4 8h4v4H4z"/><path fill="#6B4226" d="M9 9h5v2H9z"/><path fill="#F1E8D2" d="M14 8h2v4h-2z"/><g class="f1"><path fill="#C9C0A8" d="M15 6h1v2h-1z"/><path fill="#FFD35A" d="M1 4h2v2h-2zM3 0h1v5h-1zM4 0h1v2h-1z"/></g><g class="f2"><path fill="#C9C0A8" d="M14 7h2v1h-2z"/><path fill="#FFD35A" d="M2 5h2v2h-2zM4 1h1v5h-1zM5 1h1v2h-1z"/></g></svg>`,
  // a bagpiper's bag and drones, and a little space around them
  bagpiper:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#C0392B" d="M4 7h7v6H4zM5 6h5v1H5z"/><path fill="#16132A" d="M5 8h1v4H5zM8 8h1v4H8zM4 10h7v1H4z"/><path fill="#16132A" d="M6 1h1v6H6zM9 2h1v5H9zM11 3h1v4h-1z"/><path fill="#F1E8D2" d="M6 1h1v1H6zM9 2h1v1H9zM11 3h1v1h-1z"/><path fill="#C9A06A" d="M3 12h1v3H3z"/><g class="f1"><path fill="#9A93B5" d="M0 8h2v2h-2zM2 4h1v5h-1zM3 4h1v2h-1z"/></g><g class="f2"><path fill="#9A93B5" d="M12 7h2v2h-2zM14 3h1v5h-1zM15 3h1v2h-1z"/></g></svg>`,
  // a roadie under a heap of cable, one hand waving out of it
  roadie:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#16132A" d="M2 10h12v4H2zM3 9h10v1H3z"/><path fill="#9A93B5" d="M3 10h10v1H3zM2 12h12v1H2zM4 9h2v5H4zM9 9h2v5H9z"/><path fill="#FF5AA0" d="M13 11h2v1h-2zM14 12h1v2h-1z"/><g class="f1"><path fill="#E8B48A" d="M7 5h2v4H7zM6 4h1v1H6zM9 4h1v1H9z"/></g><g class="f2"><path fill="#E8B48A" d="M7 6h2v3H7zM6 5h1v1H6zM9 5h1v1H9z"/></g></svg>`,
  // a sound engineer's desk, one fader going up and down
  engineer:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#4A4E58" d="M1 7h14v6H1z"/><path fill="#16132A" d="M3 8h1v4H3zM6 8h1v4H6zM9 8h1v4H9zM12 8h1v4h-1z"/><path fill="#F1E8D2" d="M2 10h3v1H2zM5 9h3v1H5zM11 10h3v1h-3z"/><path fill="#FFD35A" d="M8 10h3v1H8z"/><g class="f1"><path fill="#7FE9FF" d="M5 4h2v2h-2zM7 0h1v5h-1zM8 0h1v2h-1z"/></g><g class="f2"><path fill="#7FE9FF" d="M9 4h2v2h-2zM11 0h1v5h-1zM12 0h1v2h-1z"/></g><path fill="#7FE08A" d="M2 5h1v1H2zM4 4h1v2H4z"/><path fill="#FF4B3E" d="M6 3h1v3H6z"/></svg>`,
  // a singer at the mic stand, arms out, waiting
  singer:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#E8B48A" d="M6 2h3v3H6zM3 6h2v1H3zM10 6h2v1h-2z"/><path fill="#FF5AA0" d="M5 5h5v5H5zM6 10h1v4H6zM8 10h1v4H8z"/><path fill="#9A93B5" d="M12 5h1v9h-1zM11 14h3v1h-3z"/><path fill="#16132A" d="M11 4h2v1h-2z"/><g class="f1"><path fill="#FFD35A" d="M0 6h2v2h-2zM2 2h1v5h-1zM3 2h1v2h-1zM13 8h2v2h-2zM15 4h1v5h-1zM16 4h1v2h-1z"/></g><g class="f2"><path fill="#FFD35A" d="M0 8h2v2h-2zM2 4h1v5h-1zM3 4h1v2h-1zM13 5h2v2h-2zM15 1h1v5h-1zM16 1h1v2h-1z"/></g></svg>`,
  fire:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><g class="f1"><path fill="#FF4B3E" d="M4 8h8v6H4zM5 5h2v3H5zM9 3h2v5H9zM7 6h2v2H7z"/><path fill="#FFD35A" d="M6 10h4v4H6zM7 8h2v2H7z"/></g><g class="f2"><path fill="#FF4B3E" d="M4 8h8v6H4zM6 4h2v4H6zM10 5h2v3h-2zM8 6h2v2H8z"/><path fill="#FFD35A" d="M6 10h4v4H6zM8 8h2v2H8z"/></g><path fill="#5A3418" d="M3 14h10v2H3z"/></svg>`,
  bear:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#6B4226" d="M3 6h9v5H3zM11 4h3v4h-3zM11 3h1v1h-1zM13 3h1v1h-1z"/><path fill="#000" d="M13 5h1v1h-1z"/><g class="f1"><path fill="#6B4226" d="M3 11h2v3H3zM10 11h2v3h-2z"/></g><g class="f2"><path fill="#6B4226" d="M4 11h2v3H4zM9 11h2v3H9z"/></g></svg>`,
  yeti:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#F1E8D2" d="M5 2h6v12H5zM6 1h4v1H6z"/><path fill="#7FE9FF" d="M6 4h1v1H6zM9 4h1v1H9z"/><path fill="#16132A" d="M7 6h2v1H7z"/><g class="f1"><path fill="#F1E8D2" d="M2 3h3v2H2zM11 3h3v2h-3z"/></g><g class="f2"><path fill="#F1E8D2" d="M2 7h3v2H2zM11 7h3v2h-3z"/></g><path fill="#F1E8D2" d="M5 14h2v2H5zM9 14h2v2H9z"/></svg>`,
  boat:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><g class="f1"><path fill="#E9A23B" d="M3 8h10l-2 3H5z"/><path fill="#F1E8D2" d="M7 3h1v5H7zM8 4h3v3H8z"/></g><g class="f2"><path fill="#E9A23B" d="M3 9h10l-2 3H5z"/><path fill="#F1E8D2" d="M7 4h1v5H7zM8 5h3v3H8z"/></g><path fill="#123A55" d="M1 12h14v3H1z"/><path fill="#7FE9FF" d="M2 12h2v1H2zM9 12h3v1H9z"/></svg>`,
  hikers:`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#9A93B5" d="M0 13h16v3H0zM3 10h10v3H3z"/><path fill="#F1E8D2" d="M5 4h2v2H5zM4 6h4v3H4zM9 5h2v2H9zM9 7h2v2H9z"/><g class="f1"><path fill="#F1E8D2" d="M3 3h1v3H3z"/></g><g class="f2"><path fill="#F1E8D2" d="M2 5h2v1H2z"/></g><path fill="#FF5AA0" d="M12 2h2v2h-2zM12 4h1v6h-1z"/></svg>`,
};
// where trouble breaks out this call: the real place, and one or two others that aren't it
function chEmergencies(kind, answer){
  const taken=new Set([answer.col+","+answer.row]), out=[{...answer, k:kind, real:true}];
  const decoys = (blast.level||0)===0 ? 1 : 2;
  for(let tries=0; out.length<1+decoys && tries<60; tries++){
    const col=Math.floor(Math.random()*7), row=Math.floor(Math.random()*3), key=col+","+row;
    if(taken.has(key)) continue; taken.add(key); out.push({col,row,k:kind});
  }
  return out.sort(()=>Math.random()-.5);
}

// the ground shows only the base, the emergencies, and what the chopper has found: survivors waving, or nobody
function chDrawMap(){
  if(!blast || !blast.mapEl) return;
  const [bx,by]=chBase(); let h=`<span class="chbase" style="left:${bx}px;top:${by}px">H</span>`;
  const f=blast.found;
  for(const e of (blast.emerg||[])){ if(f && !f.empty && e.real) continue;
    const [x,y]=chXY(e.col,e.row); h+=`<span class="chem ${e.k}" style="left:${x}px;top:${y}px">${CH_SPRITES[e.k]}</span>`; }
  const c=blast.crate; if(c){ const [x,y]=chXY(c.col,c.row); h+=`<span class="chcrateat" style="left:${x}px;top:${y}px">${chCrateLook(c.k, c.root+c.q)}</span>`; }
  if(f){ const [x,y]=chXY(f.col,f.row);
    h += f.empty ? `<span class="chnobody" style="left:${x}px;top:${y}px">?</span>`
      : `<span class="chsurv${f.saved?" saved":""}${f.ben?" ben":""}" style="left:${x}px;top:${y}px">${f.ben?CH_BEN:CH_PEOPLE}</span>`; }
  blast.mapEl.innerHTML=h;
}
const CH_PEOPLE=`<svg viewBox="0 0 22 12" shape-rendering="crispEdges" aria-hidden="true"><g fill="#F1E8D2"><rect x="1" y="0" width="3" height="3"/><rect x="0" y="4" width="5" height="4"/><rect x="1" y="8" width="1" height="4"/><rect x="3" y="8" width="1" height="4"/>
  <rect x="9" y="0" width="3" height="3"/><rect x="8" y="4" width="5" height="4"/><rect x="9" y="8" width="1" height="4"/><rect x="11" y="8" width="1" height="4"/><rect x="13" y="1" width="1" height="4"/></g>
  <g fill="#FF5AA0"><rect x="17" y="2" width="3" height="3"/><rect x="18" y="5" width="1" height="7"/></g></svg>`;
// Ben, holding the arcade's own pixel minichord (from pixel-minichord.txt, as on the INSERT MINICHORD sign) over his head
const CH_BEN=`<svg viewBox="0 0 36 35" shape-rendering="crispEdges" aria-hidden="true">
  <g>${PIXEL_MINICHORD_PATHS}</g>
  <rect x="21" y="18" width="2" height="10" fill="#E8B48A"/><rect x="29" y="18" width="2" height="10" fill="#E8B48A"/>
  <rect x="23" y="20" width="6" height="2" fill="#4A3020"/><rect x="23" y="22" width="6" height="4" fill="#E8B48A"/>
  <rect x="24" y="23" width="1" height="1" fill="#16132A"/><rect x="27" y="23" width="1" height="1" fill="#16132A"/><rect x="25" y="25" width="2" height="1" fill="#C0392B"/>
  <rect x="21" y="26" width="10" height="6" fill="#6FA7D8"/>
  <rect x="23" y="32" width="2" height="3" fill="#16132A"/><rect x="27" y="32" width="2" height="3" fill="#16132A"/></svg>`;
const chBase=()=>[Math.max(46, blast.mx*.55), (blast.fh || 420)-44];   // bottom left, where the chopper lives
function chPlace(instant){
  const [x,y]=blast.pos.base ? chBase() : chXY(blast.pos.col, blast.pos.row), el=blast.heliEl; if(!el) return;
  el.style.transition = instant ? "none" : "transform .55s cubic-bezier(.4,.1,.3,1)";
  el.style.transform=`translate(${x-24}px,${y-34}px)`;
}
function chBar(){
  if(!blast || blast.kind!=="chopper" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · RESCUES ${blast.rescues}${chPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}
const CHMENU_G={key:"chopper", title:"CHOPPER RESCUE",
  rules:()=>`<p>THE RADIO CALLS COORDINATES IN THEORY. DECODE THEM: "SURVIVORS AT vi IN G" IS Em.</p><p>TROUBLE BREAKS OUT IN MORE THAN ONE PLACE, AND ONLY THE RADIO SAYS WHICH. PLAY THE CHORD AND THE CHOPPER FLIES THERE.</p><p>A WRONG CHORD FLIES SOMEWHERE EMPTY AND BURNS TIME. DON'T LET THE FLARE BURN OUT.</p><p>NOW AND THEN A SUPPLY CRATE LANDS, MARKED WITH ITS CHORD. PLAY IT TO FLY OUT FOR A POWER-UP, IF THERE'S TIME.</p>`,
  stat:()=>`RESCUES ${blast.rescues}`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
  },
  levels:CH_LEVELS,
  begin:i=>beginChopper(i), demo:()=>chDemo(), modNote:"title"};
function chMenu(over){ arcadeMenu(CHMENU_G, over); }
function beginChopper(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, rescues:0, phase:"play", over:false, call:null, leg:0, modFor:null, pos:{base:true}, found:null, busy:false, recentCalls:[], lastAnswer:null, bags:null, crate:null, chPower:null,
    timeFor:11000*speedMul()*Math.pow(.93,level)});
  saved.chopperStart=level; save();
  stats.streak=0; scoreboard(); chLayout(); chPlace(true);
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(chTick);
  banner(`LEVEL ${level+1}`, `${CH_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); chBar();
  gameLater(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 1400);
}
// a new call on the radio: typed out with a crackle, the flare lit, the clock started
function chNewCall(){
  const L=CH_LEVELS[blast.level];
  // no repeats: not the same call as any of the last few, and never the same chord as the last answer
  const recent=blast.recentCalls||(blast.recentCalls=[]), lastAnswer=blast.lastAnswer;
  let call=chCall(L);
  for(let k=0;k<40;k++){
    const first=call.legs[0].root+call.legs[0].q;
    if(!recent.includes(call.text) && first!==lastAnswer) break;
    call=chCall(L);
  }
  recent.push(call.text); if(recent.length>4) recent.shift();
  blast.lastAnswer=call.legs[call.legs.length-1].root+call.legs[call.legs.length-1].q;
  let em=rnd(CH_EMERG);
  // Now and then (from the fourth rescue, one call in twenty or so, once a game) the stranded hikers
  // turn out, when the chopper gets there, to be Ben, waving a minichord: he made it.
  const ben = !blast.benDone && (blast.benNext || (blast.rescues>=3 && Math.random()<.05));
  if(ben){ em=CH_EMERG.find(e=>e.k==="hikers"); blast.benNext=false; }
  if(call.legs.length===1) call.text=call.text.replace(/^[A-Z ]+ AT /, em.say+" ");   // "FIRE AT vi IN G"
  call.what=(em.what||em.k).toUpperCase(); call.ben=ben;
  const last=call.legs[call.legs.length-1]; blast.emerg=chEmergencies(em.k, chPad(last.root,last.q));
  blast.pending=call; chTune();
}
// ---------- tuning in: the station's tone, the radio's, and the beating between them ----------
function chTune(){
  const station=48+Math.floor(Math.random()*12), target=.15+Math.random()*.7;   // its note; where on the dial it sits
  blast.tune={pc:station%12, hz:440*Math.pow(2,(station+12-69)/12), target, dial:target+(Math.random()<.5?-1:1)*(.18+Math.random()*.25), at:performance.now(), heldAt:0};
  blast.radioEl.classList.add("tuning");
  blast.radioEl.querySelector(".chtext").textContent="▒▒ STATIC ▒▒  TUNE IN: A KNOB, ←→, OR PLUCK THE STATION'S NOTE";
  const ctx=piano.ctx;
  if(ctx && settings.sounds){ try{
    const g=ctx.createGain(); g.gain.value=.09; g.connect(ctx.destination);
    const a=ctx.createOscillator(), b=ctx.createOscillator(); a.type="triangle"; b.type="triangle"; a.frequency.value=blast.tune.hz; a.connect(g); b.connect(g); a.start(); b.start();
    const n=ctx.createBufferSource(), buf=ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    n.buffer=buf; n.loop=true; const ng=ctx.createGain(); ng.gain.value=.03; n.connect(ng); ng.connect(ctx.destination); n.start();
    blast.tune.audio={a,b,g,n,ng}; }catch(e){} }
  chDial(blast.tune.dial);
}
const chCents=()=> (blast.tune.dial-blast.tune.target)*600;                     // the dial's whole width: a major 6th either side
function chDial(v){
  const t=blast.tune; if(!t) return; t.dial=Math.max(0,Math.min(1,v));
  const c=chCents(), off=Math.abs(c), bars=off>200?0:off>100?1:off>50?2:off>25?3:off>CH_TUNED?4:5;
  if(t.audio){ t.audio.b.frequency.value=t.hz*Math.pow(2,c/1200); t.audio.ng.gain.value=.03*Math.min(1,off/150); }
  blast.radioEl.querySelectorAll(".chmeter i").forEach((x,i)=>x.classList.toggle("on", i<bars));
  if(off<=CH_TUNED){ if(!t.heldAt) t.heldAt=performance.now(); } else t.heldAt=0;
}
function chTuned(how){
  const t=blast.tune; if(!t) return; blast.tune=null;
  if(t.audio){ try{ t.audio.a.stop(); t.audio.b.stop(); t.audio.n.stop(); t.audio.g.disconnect(); t.audio.ng.disconnect(); }catch(e){} }
  blast.radioEl.classList.remove("tuning"); blast.radioEl.querySelectorAll(".chmeter i").forEach(x=>x.classList.add("on"));
  const call=blast.pending; blast.pending=null; if(!call) return;
  if(how!=="weak"){ const pts=mulPts((how==="ear"?25:15)*(blast.level+1)); blast.score+=pts; const [bx,by]=chBase(); popup(bx,by-60,`TUNED IN +${pts}`,"#7FE9FF"); sfx("tuned"); chBar(); }
  chCallStart(call, how==="weak");
}
function chCallStart(call, weak){
  blast.call=call; call.weak=!!weak; blast.leg=0; blast.callAt=performance.now(); blast.deadline=blast.callAt+blast.timeFor*(blast.call.legs.length>1?1.8:1)*(weak?.7:1);
  const t=blast.radioEl.querySelector(".chtext"), txt=(weak?"(WEAK) ":"")+blast.call.text; t.textContent="";
  let i=0; const type=()=>{ if(!blast || blast.call===null || !t.isConnected) return; t.textContent=txt.slice(0,++i); if(i<txt.length) setTimeout(type, 28); };
  type(); sfx("radio");
  blast.found=null; chCrateDrop(call); chDrawMap(); chHelp();
  const L=CH_LEVELS[blast.level];
  if(chRadar(call)) return;                                          // decoded by radar: no need of the training hint
  if(L.hint){ const call=blast.call; gameLater(()=>{ if(blast && blast.call===call && blast.phase==="play"){   // training: the answer, half way through
    if(call.decoded) return; const l=call.legs[blast.leg]; const h=document.createElement("em"); h.className="chhint"; h.textContent=` … THAT'S ${l.root}${l.q}`; t.appendChild(h); } }, (blast.deadline-blast.callAt)*.5); }
}
function chHelp(){
  const l=blast.call && blast.call.legs[blast.leg];
  if(l){ arcadeMod(l.root); helpChord(l.root, l.q); } else helpChord(null);
}
function chTick(now){
  if(!blast || blast.kind!=="chopper") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && blast.tune){
    if(blast.tune.heldAt && now-blast.tune.heldAt>500) chTuned("dial");              // held in tune: through
    else if(now-blast.tune.at>CH_TUNE_SECS*1000) chTuned("weak");                   // never found: it comes through weak, less fuel
  }
  if(blast.phase==="play" && blast.signal && now>=blast.signal.until) chSignalLost();
  if(blast.phase==="play") chPowerTick(now, dt);
  if(blast.phase==="play" && blast.call){
    const left=Math.max(0,(blast.deadline-now)/(blast.deadline-blast.callAt));
    const bar=blast.fuelEl||(blast.fuelEl=blast.radioEl.querySelector(".chfuel i")), q=Math.round(left*200)/200;
    if(q!==blast.fuelQ){ blast.fuelQ=q; bar.style.transform=`scaleX(${q})`; const low=left<.3; if(low!==blast.fuelLow){ blast.fuelLow=low; bar.classList.toggle("low", low); } }
    if(now>=blast.deadline) chMissed();
  }
  blast.raf=requestAnimationFrame(chTick);
}
function chQuiet(){ if(blast && blast.tune && blast.tune.audio){ try{ const a=blast.tune.audio; a.a.stop(); a.b.stop(); a.n.stop(); a.g.disconnect(); a.ng.disconnect(); }catch(e){} } if(blast){ blast.tune=null; blast.pending=null; } }
function chMissed(){
  sfx("miss"); buzz(blast.field,true); blast.lives--; chBar();
  banner("TOO LATE", blast.lives>0 ? "THE FLARE BURNED OUT" : "");
  blast.call=null; blast.found=null; blast.emerg=[]; blast.crate=null; chDrawMap();
  if(blast.lives<=0){ chQuiet(); blast.phase="over"; blast.over=true; const best=Math.max(saved.best.chopper||0, blast.score); saved.best.chopper=best; save(); chMenu(true); return; }
  gameLater(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 1400);
}
function chopperKnob(v){ if(blast && blast.kind==="chopper" && blast.phase==="play" && blast.tune) chDial(v); }
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="chopper" || blast.phase!=="play" || !blast.tune || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowLeft:-1,ArrowRight:1}[e.code]; if(!d) return;
  e.preventDefault(); chDial(blast.tune.dial+d*(e.shiftKey?.04:.01));
});
// a harp note: the station's note tunes straight in; the chord's next note answers the survivors
function chopperNote(pc){
  if(!blast || blast.kind!=="chopper" || blast.phase!=="play") return;
  pc=mod(pc,12);
  if(blast.tune){ if(pc===blast.tune.pc){ heard(SHARP_NAMES[pc],true); chTuned("ear"); } else { heard(SHARP_NAMES[pc],false,"NOT THE STATION'S NOTE"); sfx("miss"); chDial(blast.tune.dial+(Math.random()<.5?-.05:.05)); } return; }
  const sg=blast.signal; if(!sg) return;
  if(pc===pcOfName(sg.tones[sg.i])){ sg.i++; heard(sg.tones[sg.i-1],true); sfx("signal"); chSignalDraw(); if(sg.i>=sg.tones.length) chSignalled(); }
  else { heard(SHARP_NAMES[pc],false,`NOT THEIR SIGNAL: NEXT IS THE ${sg.roles[sg.i]}`); sfx("miss"); buzz(blast.field,true); sg.until-=800; }
}
// ---------- the signal: the chord's notes, in order, before the winch comes down ----------
function chSignal(chord, pad, then){
  const L=CH_LEVELS[blast.level], t=spellChord(chord.root, chord.q)||[chord.root], inv=L.arp==="inv1";
  const degs=["ROOT","3RD","5TH","7TH"].slice(0,t.length);
  const tones = inv ? [...t.slice(1), t[0]] : t, roles = inv ? [...degs.slice(1), degs[0]] : degs;
  if(chWinch(tones.length, then)) return;
  blast.signal={tones, roles, i:0, order:L.arp, pad, then, until:performance.now()+4500+1400*tones.length};
  const [x,y]=chXY(pad.col,pad.row), el=document.createElement("div"); el.className="chsignal"; blast.field.appendChild(el); blast.signal.el=el;
  el.style.left=`${x}px`; el.style.top=`${y-58}px`;
  // what to pluck stays on the radio, in place of the call, until they're up: the inversion said plainly
  const name=chord.root+chord.q, how = inv ? `${name}, 1ST INVERSION: START ON THE 3RD, THEN ${roles.slice(1).join(", ")}` : `${name}, ROOT UP: ${roles.join(", ")}`;
  const rt=blast.radioEl.querySelector(".chtext"); rt.innerHTML=`<b class="chsigtext">SIGNAL THEM ON THE HARP · ${how}</b>`;
  banner(inv ? "1ST INVERSION" : "SIGNAL THEM", inv ? `PLUCK ${name} FROM ITS 3RD, THE ROOT LAST` : `PLUCK ${name} ROOT UP`);
  chSignalDraw(); helpString(pcOfName(tones[0]));
}
function chSignalDraw(){
  const sg=blast.signal; if(!sg) return;
  sg.el.innerHTML=sg.tones.map((n,i)=>`<b class="${i<sg.i?"got":i===sg.i?"next":""}">${i<sg.i?n:"?"}<small>${sg.roles[i]}</small></b>`).join("");
  if(sg.i<sg.tones.length) helpString(pcOfName(sg.tones[sg.i]));
}
function chSignalDone(){ const t=blast.radioEl && blast.radioEl.querySelector(".chtext"); if(t && t.querySelector(".chsigtext")) t.textContent="RADIO QUIET"; }
function chSignalled(){ const sg=blast.signal; blast.signal=null; sg.el.remove(); helpChord(null); chSignalDone();
  const pts=mulPts(10*sg.tones.length*(blast.level+1)); blast.score+=pts; sg.then(pts); }
function chSignalLost(){ const sg=blast.signal; blast.signal=null; sg.el.remove(); helpChord(null); chSignalDone();
  blast.found=null; blast.pos={base:true}; chPlace(false); blast.busy=false;
  sfx("miss"); buzz(blast.field,true); blast.lives--; chBar(); banner("THEY COULDN'T HOLD ON", blast.lives>0?"ANSWER THEIR SIGNAL IN TIME":"");
  blast.emerg=[]; chDrawMap();
  if(blast.lives<=0){ chQuiet(); blast.phase="over"; blast.over=true; const best=Math.max(saved.best.chopper||0, blast.score); saved.best.chopper=best; save(); chMenu(true); return; }
  gameLater(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 1400);
}
// a chord from the buttons: fly there; if it's the called one, a rescue
function chopperChord(voices){
  if(!blast || blast.kind!=="chopper") return;
  if(blast.phase==="demo" && blast.demo){ endChDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.busy) return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const root=spell(id.root, devFifths()), name=chordName(pitches, devFifths()), pad=chPad(root, id.quality==="6"?"":id.quality==="m6"?"m":id.quality);
  if(blast.tune){ heard(name,false,"TUNE THE RADIO IN FIRST"); return; }
  if(blast.signal){ heard(name,false,"ANSWER THEIR SIGNAL ON THE HARP"); return; }
  const l=blast.call && blast.call.legs[blast.leg];
  if(!l){ heard(name,false,"NO CALL YET"); return; }
  if(pad.col<0) return;
  const right=isChord(pitches, pcOfName(l.root), l.q);
  if(!right && chCrateFly(pitches, name)) return;                 // a detour for the supply crate
  if(right) Object.assign(pad, chPad(l.root, l.q));            // D♭ played in C spells as C♯: it still lands where D♭ is
  const decoy=!right && (blast.emerg||[]).some(e=>!e.real && e.col===pad.col && e.row===pad.row);
  heard(name, right, right ? "" : decoy ? "NOT THIS ONE" : "NOBODY THERE");
  blast.busy=true; blast.pos=pad; blast.found=null; chDrawMap(); chPlace(false); sfx("fly");
  const [x,y]=chXY(pad.col,pad.row);
  if(!right){                                                   // somewhere empty: a look round, and back to base
    blast.deadline-=1800;
    gameLater(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found={...pad, empty:true}; chDrawMap(); sfx("empty"); buzz(blast.field,true);
      gameLater(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found=null; blast.pos={base:true}; chDrawMap(); chPlace(false); blast.busy=false; }, 700); }, 600);
    return;
  }
  if(blast.leg<blast.call.legs.length-1){                         // a waypoint on a route: on to the next
    blast.leg++; const pts=mulPts(15*(blast.level+1)); blast.score+=pts;
    gameLater(()=>{ if(!blast || blast.kind!=="chopper") return; popup(x,y-30,`WAYPOINT +${pts}`,"#7FE9FF"); sfx("waypoint"); chHelp(); chBar(); blast.busy=false; }, 600);
    return;
  }
  const left=Math.max(0,(blast.deadline-performance.now())/(blast.deadline-blast.callAt));
  const pts=mulPts(Math.round((20+30*left)*(blast.level+1))*(blast.call.legs.length>1?2:1));
  const what=blast.call.what; blast.lastBen=!!blast.call.ben; blast.call=null;   // the clock stops: they're found
  gameLater(()=>{ if(!blast || blast.kind!=="chopper") return;
    const ben=l && blast.lastBen; blast.found={...pad, ben}; chDrawMap(); sfx("found");   // there they are: answer their signal
    // Ben takes a moment to appreciate: a card, him waving his minichord, before the signal starts
    const signal=()=>chSignal(l, pad, sigPts=>gameLater(()=>{ if(!blast || blast.kind!=="chopper") return;
      blast.found={...pad, saved:true, ben}; blast.emerg=[]; blast.crate=null; chDrawMap();   // aboard, and the other alarms were false
      let benPts=0; if(ben){ blast.benDone=true; benPts=mulPts(500); chBenCard("MERCI, BEN!", `BEN IS SAFE · +${benPts}`); sfx("level"); }
      blast.score+=pts; blast.rescues++; stats.streak=blast.rescues; scoreboard();
      blast.score+=benPts; popup(x,y-34,`${ben?"BEN":what} +${pts+sigPts+benPts}`,"#FFD35A"); chBar(); helpChord(null);
      blast.pos={base:true}; chPlace(false);                      // home
      gameLater(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found=null; chDrawMap(); blast.busy=false;
        const [bx,by]=chBase(); explode(bx,by-10,16,["#7FE08A","#FFD35A","#F1E8D2"]);
        if(blast.rescues%6===0 && blast.level<CH_LEVELS.length-1){ blast.level++; blast.timeFor*=.93; sfx("level"); banner(`LEVEL ${blast.level+1}`, CH_LEVELS[blast.level].n.toUpperCase()); }
        else if(blast.rescues%6===0){ blast.timeFor*=.93; banner("FASTER!"); }
        gameLater(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, ben ? CH_BEN_HOLD+900 : 900);   // after Ben's card
      }, 650);
    }, 400));
    if(ben){ chBenCard("IT'S BEN!", "HE MADE THE MINICHORD · SIGNAL HIM IN!"); sfx("level"); gameLater(signal, CH_BEN_HOLD); }
    else signal();
  }, 600);
}
// Ben's card: him, large and waving his minichord, in the middle of the field for a few seconds
const CH_BEN_HOLD=4200;
function chBenCard(title, sub){
  if(!blast || !blast.field) return;
  blast.field.querySelector(".chbencard")?.remove();
  const c=document.createElement("div"); c.className="chbencard";
  c.innerHTML=`<div class="chbenpic">${CH_BEN}</div><b class="rainbow">${title}</b><span>${sub}</span>`;
  blast.field.appendChild(c);
  setTimeout(()=>{ c.classList.add("going"); setTimeout(()=>c.remove(), 500); }, CH_BEN_HOLD-500);
}

// ---------- Chopper Rescue's demo ----------
function chDemo(){
  if(!blast || blast.kind!=="chopper") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; chLayout(); blast.pos={base:true}; blast.found=null; chPlace(true); chDrawMap();
  const {el, token, say, sleep, step}=demoShell(endChDemo);
  const play=demoPlay;
  const radio=txt=>{ blast.radioEl.querySelector(".chtext").textContent=txt; sfx("radio"); };
  sfx("attract");
  (async()=>{
    const trouble=(k,col,row)=>{ blast.emerg=chEmergencies(k,{col,row}); chDrawMap(); };
    // flying there, and, when asked, the survivors' signal plucked note by note before the winch
    const fly=async(col,row,notes,signal)=>{ play(notes); blast.pos={col,row}; chPlace(false); sfx("fly"); await step(700); blast.emerg=[];
      blast.found={col,row}; chDrawMap(); sfx("found"); await step(800);
      if(signal){ const [x,y]=chXY(col,row), sg=document.createElement("div"); sg.className="chsignal"; sg.style.left=`${x}px`; sg.style.top=`${y-58}px`; blast.field.appendChild(sg);
        const draw=i=>{ sg.innerHTML=signal.map((n,k)=>`<b class="${k<i?"got":k===i?"next":""}">${k<i?n:"?"}</b>`).join(""); };
        for(let i=0;i<=signal.length;i++){ draw(i); if(i<signal.length){ await step(700); play([60+pcOfName(signal[i])]); sfx("signal"); } }
        await step(500); sg.remove(); }
      blast.found={col,row,saved:true}; chDrawMap();
      blast.pos={base:true}; chPlace(false); await step(700); blast.found=null; chDrawMap(); };
    try{
      say("CHOPPER RESCUE","THE RADIO CALLS COORDINATES IN THEORY. DECODE THEM INTO A CHORD."); await step(3800);
      // tuning in: static, the meter climbing as the dial comes round, then the call
      say("TUNE IN","EACH CALL COMES THROUGH STATIC. TURN A KNOB TILL THE BEATING STOPS, OR PLUCK THE STATION'S NOTE.");
      blast.radioEl.classList.add("tuning"); radio("▒▒ STATIC ▒▒  TUNE IN: A KNOB, ←→, OR PLUCK THE STATION'S NOTE");
      const bars=blast.radioEl.querySelectorAll(".chmeter i");
      for(const [j,n] of [0,1,1,2,3,2,3,4,4,5].entries()){ bars.forEach((b,i)=>b.classList.toggle("on", i<n)); helpKnob(steerKnob(), .2+j*.05); await step(420); }   // the dial coming round on a knob
      blast.radioEl.classList.remove("tuning"); sfx("tuned"); await step(900);
      radio("FIRE AT V IN C"); trouble("fire",2,0); say("DECODE","FIRES IN THREE PLACES, BUT THE RADIO SAYS WHICH: V IN C IS G."); await step(3800);
      say("SIGNAL THEM","FOUND! THEY ONLY COME UP WHEN YOU PLUCK THEIR CHORD ON THE HARP, ROOT UP: G, B, D.");
      await fly(2,0,[55,59,62,67],["G","B","D"]); await step(1200);
      radio("YETI ATTACK AT vi IN G"); trouble("yeti",5,1); say("","vi IN G IS E MINOR."); await step(2800); await fly(5,1,[52,55,59,64]); await step(1600);
      radio("BEAR SIGHTED AT V OF V IN C"); trouble("bear",3,2); say("LATER","SEVENTHS, SECONDARY DOMINANTS, BORROWED CHORDS AND WHOLE ROUTES. V OF V IN C IS D7."); await step(3600);
      await fly(3,2,[50,54,57,60]); await step(1600);
      say("READY?","A WRONG CHORD FLIES SOMEWHERE EMPTY. BEAT THE FLARE."); sfx("level"); await step(2600);
      endChDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endChDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); chQuiet(); blast.phase="menu"; blast.call=null; blast.found=null; blast.emerg=[]; blast.pos={base:true}; chPlace(true); blast.radioEl.querySelector(".chtext").textContent="RADIO QUIET"; chDrawMap();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
