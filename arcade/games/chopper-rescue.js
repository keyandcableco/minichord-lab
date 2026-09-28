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
const CH_KEYS_NEAR=["C","G","F","D"], CH_KEYS_ALL=["C","G","D","A","E","F","B♭","E♭","A♭"];
const CH_LEVELS=[
  {n:"Flight school", keys:["C"], hint:true},
  {n:"Nearby keys", keys:CH_KEYS_NEAR, hint:true},
  {n:"Every key", keys:CH_KEYS_ALL},
  {n:"Sevenths and V of V", keys:CH_KEYS_NEAR, sevenths:true},
  {n:"Borrowed chords and routes", keys:CH_KEYS_NEAR, sevenths:true, borrowed:true, routes:true},
];
// a scale degree of a key, spelled: the root name
const chRoot=(key, semis)=>{ const letters={0:0,2:1,4:2,5:3,7:4,9:5,10:6,11:6,3:2,8:5}; return above(key, letters[semis]??0, semis) || key; };
// one call: what the radio says, and the chord (or chords, for a route) that answers it
function chCall(L){
  const key=rnd(L.keys), kind=Math.random();
  if(L.routes && kind<.22){   // a route: ii–V–I, or I–vi–IV–V's first three
    const route = Math.random()<.5 ? [[2,"m","ii"],[7,"","V"],[0,"","I"]] : [[0,"","I"],[9,"m","vi"],[5,"","IV"]];
    return {text:`ROUTE ${route.map(r=>r[2]).join("–")} IN ${key}`, legs:route.map(([st,q])=>({root:chRoot(key,st), q})), what:"WAYPOINTS"};
  }
  if(L.borrowed && kind<.4){
    const b=rnd([[10,"","♭VII"],[8,"","♭VI"],[5,"m","iv"]]);
    return {text:`FUEL AT ${b[2]} IN ${key}`, legs:[{root:chRoot(key,b[0]), q:b[1]}], what:"FUEL"};
  }
  if(L.sevenths && kind<.6){
    if(Math.random()<.5) return {text:`MEDIC AT V7 IN ${key}`, legs:[{root:chRoot(key,7), q:"7"}], what:"MEDIC"};
    return {text:`SUPPLIES AT V OF V IN ${key}`, legs:[{root:chRoot(key,2), q:"7"}], what:"SUPPLIES"};
  }
  const i=Math.floor(Math.random()*CH_DEG.length), [st,q]=CH_DEG[i];
  return {text:`SURVIVORS AT ${CH_NUM[i]} IN ${key}`, legs:[{root:chRoot(key,st), q}], what:"SURVIVORS"};
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
  arcadeSetup(()=>{ if(hasSetting(30)) ensure(30,0); });
}
function buildChopperField(box){
  const field=document.createElement("div"); field.className="field arcade chopper"; field.setAttribute("aria-label","The landing zones");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const radio=document.createElement("div"); radio.className="chradio"; radio.innerHTML=`<span class="chant">📻</span><span class="chtext">RADIO QUIET</span><span class="chfuel"><i></i></span>`; field.appendChild(radio);
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
];
// the little animated sprites: two frames each, swapped by CSS
const CH_SPRITES={
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
  if(f){ const [x,y]=chXY(f.col,f.row);
    h += f.empty ? `<span class="chnobody" style="left:${x}px;top:${y}px">?</span>`
      : `<span class="chsurv${f.saved?" saved":""}" style="left:${x}px;top:${y}px">${CH_PEOPLE}</span>`; }
  blast.mapEl.innerHTML=h;
}
const CH_PEOPLE=`<svg viewBox="0 0 22 12" shape-rendering="crispEdges" aria-hidden="true"><g fill="#F1E8D2"><rect x="1" y="0" width="3" height="3"/><rect x="0" y="4" width="5" height="4"/><rect x="1" y="8" width="1" height="4"/><rect x="3" y="8" width="1" height="4"/>
  <rect x="9" y="0" width="3" height="3"/><rect x="8" y="4" width="5" height="4"/><rect x="9" y="8" width="1" height="4"/><rect x="11" y="8" width="1" height="4"/><rect x="13" y="1" width="1" height="4"/></g>
  <g fill="#FF5AA0"><rect x="17" y="2" width="3" height="3"/><rect x="18" y="5" width="1" height="7"/></g></svg>`;
const chBase=()=>[Math.max(46, blast.mx*.55), (blast.fh || 420)-44];   // bottom left, where the chopper lives
function chPlace(instant){
  const [x,y]=blast.pos.base ? chBase() : chXY(blast.pos.col, blast.pos.row), el=blast.heliEl; if(!el) return;
  el.style.transition = instant ? "none" : "transform .55s cubic-bezier(.4,.1,.3,1)";
  el.style.transform=`translate(${x-24}px,${y-34}px)`;
}
function chBar(){
  if(!blast || blast.kind!=="chopper" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · RESCUES ${blast.rescues}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const CHMENU_G={key:"chopper", title:"CHOPPER RESCUE",
  rules:()=>`<p>THE RADIO CALLS COORDINATES IN THEORY. DECODE THEM: "SURVIVORS AT vi IN G" IS Em.</p><p>TROUBLE BREAKS OUT IN MORE THAN ONE PLACE, AND ONLY THE RADIO SAYS WHICH. PLAY THE CHORD AND THE CHOPPER FLIES THERE.</p><p>A WRONG CHORD FLIES SOMEWHERE EMPTY AND BURNS TIME. DON'T LET THE FLARE BURN OUT.</p>`,
  stat:()=>`RESCUES ${blast.rescues}`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
  },
  levels:CH_LEVELS,
  begin:i=>beginChopper(i), demo:()=>chDemo(), modNote:"title"};
function chMenu(over){ arcadeMenu(CHMENU_G, over); }
function beginChopper(level){
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, rescues:0, phase:"play", over:false, call:null, leg:0, modFor:null, pos:{base:true}, found:null, busy:false, recentCalls:[], lastAnswer:null,
    timeFor:11000*speedMul()*Math.pow(.93,level)});
  saved.chopperStart=level; save();
  stats.streak=0; scoreboard(); chLayout(); chPlace(true);
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(chTick);
  banner(`LEVEL ${level+1}`, `${CH_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); chBar();
  setTimeout(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 1400);
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
  const em=rnd(CH_EMERG);
  if(call.legs.length===1) call.text=call.text.replace(/^[A-Z ]+ AT /, em.say+" ");   // "FIRE AT vi IN G"
  call.what=em.k.toUpperCase();
  const last=call.legs[call.legs.length-1]; blast.emerg=chEmergencies(em.k, chPad(last.root,last.q));
  blast.call=call; blast.leg=0; blast.callAt=performance.now(); blast.deadline=blast.callAt+blast.timeFor*(blast.call.legs.length>1?1.8:1);
  const t=blast.radioEl.querySelector(".chtext"), txt=blast.call.text; t.textContent="";
  let i=0; const type=()=>{ if(!blast || blast.call===null || !t.isConnected) return; t.textContent=txt.slice(0,++i); if(i<txt.length) setTimeout(type, 28); };
  type(); sfx("key");
  blast.found=null; chDrawMap(); chHelp();
  if(L.hint){ const call=blast.call; setTimeout(()=>{ if(blast && blast.call===call && blast.phase==="play"){   // training: the answer, half way through
    const l=call.legs[blast.leg]; const h=document.createElement("em"); h.className="chhint"; h.textContent=` … THAT'S ${l.root}${l.q}`; t.appendChild(h); } }, (blast.deadline-blast.callAt)*.5); }
}
function chHelp(){
  const l=blast.call && blast.call.legs[blast.leg];
  if(l){ arcadeMod(l.root); helpChord(l.root, l.q); } else helpChord(null);
}
function chTick(now){
  if(!blast || blast.kind!=="chopper") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && blast.call){
    const left=Math.max(0,(blast.deadline-now)/(blast.deadline-blast.callAt));
    const bar=blast.fuelEl||(blast.fuelEl=blast.radioEl.querySelector(".chfuel i")), q=Math.round(left*200)/200;
    if(q!==blast.fuelQ){ blast.fuelQ=q; bar.style.transform=`scaleX(${q})`; const low=left<.3; if(low!==blast.fuelLow){ blast.fuelLow=low; bar.classList.toggle("low", low); } }
    if(now>=blast.deadline) chMissed();
  }
  blast.raf=requestAnimationFrame(chTick);
}
function chMissed(){
  sfx("miss"); buzz(blast.field,true); blast.lives--; chBar();
  banner("TOO LATE", blast.lives>0 ? "THE FLARE BURNED OUT" : "");
  blast.call=null; blast.found=null; blast.emerg=[]; chDrawMap();
  if(blast.lives<=0){ blast.phase="over"; blast.over=true; const best=Math.max(saved.best.chopper||0, blast.score); saved.best.chopper=best; save(); chMenu(true); return; }
  setTimeout(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 1400);
}
// a chord from the buttons: fly there; if it's the called one, a rescue
function chopperChord(voices){
  if(!blast || blast.kind!=="chopper") return;
  if(blast.phase==="demo" && blast.demo){ endChDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.busy) return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const root=spell(id.root, devFifths()), name=chordName(pitches, devFifths()), pad=chPad(root, id.quality==="6"?"":id.quality==="m6"?"m":id.quality);
  const l=blast.call && blast.call.legs[blast.leg];
  if(!l){ heard(name,false,"NO CALL YET"); return; }
  if(pad.col<0) return;
  const right=isChord(pitches, pcOfName(l.root), l.q);
  const decoy=!right && (blast.emerg||[]).some(e=>!e.real && e.col===pad.col && e.row===pad.row);
  heard(name, right, right ? "" : decoy ? "NOT THIS ONE" : "NOBODY THERE");
  blast.busy=true; blast.pos=pad; blast.found=null; chDrawMap(); chPlace(false); sfx("shoot");
  const [x,y]=chXY(pad.col,pad.row);
  if(!right){                                                   // somewhere empty: a look round, and back to base
    blast.deadline-=1800;
    setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found={...pad, empty:true}; chDrawMap(); sfx("miss"); buzz(blast.field,true);
      setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found=null; blast.pos={base:true}; chDrawMap(); chPlace(false); blast.busy=false; }, 700); }, 600);
    return;
  }
  if(blast.leg<blast.call.legs.length-1){                         // a waypoint on a route: on to the next
    blast.leg++; const pts=mulPts(15*(blast.level+1)); blast.score+=pts;
    setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return; popup(x,y-30,`WAYPOINT +${pts}`,"#7FE9FF"); sfx("key"); chHelp(); chBar(); blast.busy=false; }, 600);
    return;
  }
  const left=Math.max(0,(blast.deadline-performance.now())/(blast.deadline-blast.callAt));
  const pts=mulPts(Math.round((20+30*left)*(blast.level+1))*(blast.call.legs.length>1?2:1));
  const what=blast.call.what; blast.call=null;                    // the clock stops: they're found
  setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return;
    blast.found={...pad}; chDrawMap(); sfx("bonus");               // there they are
    setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return;
      blast.found={...pad, saved:true}; blast.emerg=[]; chDrawMap();   // aboard, and the other alarms were false
      blast.score+=pts; blast.rescues++; stats.streak=blast.rescues; scoreboard();
      popup(x,y-34,`${what} +${pts}`,"#FFD35A"); chBar(); helpChord(null);
      blast.pos={base:true}; chPlace(false);                      // home
      setTimeout(()=>{ if(!blast || blast.kind!=="chopper") return; blast.found=null; chDrawMap(); blast.busy=false;
        const [bx,by]=chBase(); explode(bx,by-10,16,["#7FE08A","#FFD35A","#F1E8D2"]);
        if(blast.rescues%6===0 && blast.level<CH_LEVELS.length-1){ blast.level++; blast.timeFor*=.93; sfx("level"); banner(`LEVEL ${blast.level+1}`, CH_LEVELS[blast.level].n.toUpperCase()); }
        else if(blast.rescues%6===0){ blast.timeFor*=.93; banner("FASTER!"); }
        setTimeout(()=>{ if(blast && blast.kind==="chopper" && blast.phase==="play") chNewCall(); }, 900);
      }, 650);
    }, 700);
  }, 600);
}

// ---------- Chopper Rescue's demo ----------
function chDemo(){
  if(!blast || blast.kind!=="chopper") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; chLayout(); blast.pos={base:true}; blast.found=null; chPlace(true); chDrawMap();
  const {el, token, say, sleep, step}=demoShell(endChDemo);
  const play=demoPlay;
  const radio=txt=>{ blast.radioEl.querySelector(".chtext").textContent=txt; sfx("key"); };
  sfx("attract");
  (async()=>{
    const trouble=(k,col,row)=>{ blast.emerg=chEmergencies(k,{col,row}); chDrawMap(); };
    const fly=async(col,row,notes)=>{ play(notes); blast.pos={col,row}; chPlace(false); sfx("shoot"); await step(700); blast.emerg=[];
      blast.found={col,row}; chDrawMap(); sfx("bonus"); await step(800); blast.found={col,row,saved:true}; chDrawMap();
      blast.pos={base:true}; chPlace(false); await step(700); blast.found=null; chDrawMap(); };
    try{
      say("CHOPPER RESCUE","THE RADIO CALLS COORDINATES IN THEORY. DECODE THEM INTO A CHORD."); await step(3800);
      radio("FIRE AT V IN C"); trouble("fire",2,0); say("DECODE","FIRES IN THREE PLACES, BUT THE RADIO SAYS WHICH: V IN C IS G."); await step(3800);
      await fly(2,0,[55,59,62,67]); await step(1600);
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
  stopDemo(); blast.phase="menu"; blast.call=null; blast.found=null; blast.emerg=[]; blast.pos={base:true}; chPlace(true); blast.radioEl.querySelector(".chtext").textContent="RADIO QUIET"; chDrawMap();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
