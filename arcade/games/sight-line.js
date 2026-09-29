// Sight Line: sight-reading from the staff onto the harp, notes scrolling to a playhead.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Sight Line ----------
// Notes scroll right to left along a staff toward a playhead, as the eye moves along a page, and each
// is plucked on the harp as it reaches the line: in time for a hit, dead on it for double. Hits in a
// row build a streak multiplier; a note that slips past costs a life, and a wrong string breaks the
// streak. Levels: the treble clef, the bass clef, ledger lines on both, sharps and flats, then key
// signatures, where the sharp or flat is only in the signature (an F in G major is played F-sharp),
// then both clefs with everything, then tunes: public-domain melodies, named once they're read.
// Notes are diatonic numbers, octave × 7 + letter (C 0 … B 6): E4 is 30, the treble's bottom line.
const SL_LETTERS="CDEFGAB", SL_NAT=[0,2,4,5,7,9,11];
const SL_LEVELS=[
  {n:"Treble clef", clefs:["treble"], range:{treble:[30,38]}},
  {n:"Bass clef", clefs:["bass"], range:{bass:[18,26]}},
  {n:"Ledger lines", clefs:["treble","bass"], range:{treble:[27,41], bass:[15,29]}},
  {n:"Sharps and flats", clefs:["treble"], range:{treble:[28,40]}, acc:.35},
  {n:"Key signatures", clefs:["treble"], range:{treble:[28,40]}, key:true},
  {n:"Both clefs", clefs:["treble","bass"], range:{treble:[28,40], bass:[16,28]}, key:true, acc:.15},
  {n:"Tunes", clefs:["treble"], tunes:true},
];
// public-domain melodies, in C, as treble diatonic numbers
const SL_TUNES=[
  {name:"ODE TO JOY", by:"BEETHOVEN", n:[30,30,31,32,32,31,30,29,28,28,29,30,30,29,29]},
  {name:"TWINKLE, TWINKLE", by:"FRENCH FOLK TUNE", n:[28,28,32,32,33,33,32,31,31,30,30,29,29,28]},
  {name:"FRÈRE JACQUES", by:"TRADITIONAL", n:[28,29,30,28,28,29,30,28,30,31,32,30,31,32]},
  {name:"MARY HAD A LITTLE LAMB", by:"TRADITIONAL", n:[30,29,28,29,30,30,30,29,29,29,30,32,32]},
  {name:"AMAZING GRACE", by:"TRADITIONAL", n:[32,35,37,35,37,36,35,33,32]},
  {name:"WHEN THE SAINTS", by:"TRADITIONAL", n:[28,30,31,32,28,30,31,32,28,30,31,32,30,28,30,29]},
];
const SL_KEYS=[1,2,3,4,-1,-2,-3,-4];                      // key signatures, in fifths: G D A E, F B♭ E♭ A♭
const SL_WIN=38, SL_DEAD=14;                               // pixels either side of the playhead: in time, and dead on
function genSight(){
  return {kind:"sight", prompt:"Sight Line", sub:"Notes scroll along the staff to the playhead: pluck each on the harp as it reaches the line. Treble, bass, ledger lines, accidentals, key signatures and tunes.",
    answer:{type:"sight", name:"the note at the playhead"}, hint:"Every Good Boy Deserves Fudge: the treble's lines, bottom up.", context:0};
}
function startSight(){
  blast={kind:"sight", score:0, lives:3, level:0, hits:0, streak:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), notes:[], keyF:0, tune:null};
  slDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  slMenu();
  blast.raf=requestAnimationFrame(slTick);
}
function slDevice(){
  if(!blast || blast.kind!=="sight" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); });              // the harp chromatic, every note there
}
function buildSightField(box){
  const field=document.createElement("div"); field.className="field arcade sight"; field.setAttribute("aria-label","The staff");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("class","slstaff"); field.appendChild(svg);
  box.append(field);
  if(blast && blast.kind==="sight"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.svg=svg; blast.fx=fxInit(field);
    setTimeout(()=>{ slLayout(); slDrawStaff(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  slBar(); setTimeout(helperSync);
}
// the staff's geometry: one staff in the middle, or treble over bass as a grand staff
function slLayout(){
  const W=blast.field.clientWidth, H=blast.field.clientHeight, L=SL_LEVELS[blast.level||0], grand=L.clefs.length>1;
  blast.W=W; blast.SP=grand ? Math.min(13, H/26) : Math.min(16, H/18);
  const SP=blast.SP, mid=H*.55;
  blast.yT = grand ? mid-7*SP : mid-2*SP;                  // the treble's top line
  blast.yB = grand ? blast.yT+10*SP : blast.yT;             // the bass's top line
  blast.ph=W*.28;                                           // the playhead
}
const slY=(dn,clef)=> clef==="bass" ? blast.yB+(26-dn)*blast.SP/2 : blast.yT+(38-dn)*blast.SP/2;
function slSvg(tag, attrs, parent){ const e=document.createElementNS("http://www.w3.org/2000/svg",tag); for(const k in attrs) e.setAttribute(k,attrs[k]); (parent||blast.svg).appendChild(e); return e; }
function slDrawStaff(){
  if(!blast || !blast.svg) return;
  const svg=blast.svg, W=blast.W, SP=blast.SP, L=SL_LEVELS[blast.level||0];
  svg.setAttribute("viewBox",`0 0 ${W} ${blast.field.clientHeight}`); svg.innerHTML="";
  for(const clef of L.clefs){
    const top = clef==="bass" ? blast.yB : blast.yT;
    for(let k=0;k<5;k++) slSvg("line",{x1:12,x2:W-12,y1:top+k*SP,y2:top+k*SP,class:"sline"});
    const g=slSvg("text",{x:18,y:clef==="bass" ? slY(24,"bass") : slY(32,"treble"),class:"sglyph clef"}); g.textContent=clef==="bass" ? "\uE062" : "\uE050";
    // the key signature, a sharp or flat on each of its lines and spaces (a line lower in the bass)
    const f=blast.keyF||0, pos=f>0?SIG_SHARPS:SIG_FLATS;
    for(let i=0;i<Math.abs(f);i++){ const a=slSvg("text",{x:62+i*SP*.8,y:slY(pos[i]-(clef==="bass"?14:0),clef),class:"sglyph"}); a.textContent=f>0?"\uE262":"\uE260"; }
  }
  const top=blast.yT-SP, bot=(L.clefs.length>1?blast.yB:blast.yT)+5*SP;
  slSvg("rect",{x:blast.ph-SL_WIN,y:top,width:SL_WIN*2,height:bot-top,class:"swin"});
  slSvg("line",{x1:blast.ph,x2:blast.ph,y1:top-6,y2:bot+6,class:"shead"});
  blast.noteLayer=slSvg("g",{});
  for(const n of blast.notes) if(!n.gone) slNoteEl(n);
}
// a note: its head, any accidental, and ledger lines, as one group moved along by transform
function slNoteEl(n){
  const SP=blast.SP, y=slY(n.dn,n.clef), g=slSvg("g",{class:"snote"},blast.noteLayer); n.el=g;
  const ledgers=[];
  if(n.clef==="treble"){ for(let d=28; d>=n.dn; d-=2) ledgers.push(d); for(let d=40; d<=n.dn; d+=2) ledgers.push(d); }
  else { for(let d=16; d>=n.dn; d-=2) ledgers.push(d); for(let d=28; d<=n.dn; d+=2) ledgers.push(d); }
  for(const d of ledgers) slSvg("line",{x1:-SP*.9,x2:SP*.9,y1:slY(d,n.clef),y2:slY(d,n.clef),class:"sline"},g);
  if(n.acc){ const a=slSvg("text",{x:-SP*1.9,y,class:"sglyph"},g); a.textContent=n.acc>0?"\uE262":"\uE260"; }
  const h=slSvg("text",{x:-SP*.6,y,class:"sglyph head"},g); h.textContent="\uE0A4";
  g.setAttribute("transform",`translate(${n.x},0)`);
}
function slBar(){
  if(!blast || blast.kind!=="sight" || !blast.hud) return;
  const mult=Math.min(4,1+Math.floor(blast.streak/8));
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${SL_LEVELS[blast.level].n.toUpperCase()}${mult>1?` · STREAK ×${mult}`:""}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const SLMENU_G={key:"sight", title:"SIGHT LINE",
  rules:()=>`<p>NOTES SCROLL ALONG THE STAFF TO THE PLAYHEAD. PLUCK EACH ONE ON THE HARP AS IT REACHES THE LINE: DEAD ON SCORES DOUBLE.</p><p>HITS IN A ROW BUILD A STREAK. A NOTE THAT SLIPS PAST COSTS A LIFE.</p><p>IN A KEY SIGNATURE, ITS SHARPS AND FLATS APPLY TO EVERY NOTE ON THAT LETTER.</p>`,
  stat:()=>`NOTES ${blast.hits}`,
  rows:row=>{ row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); }); },
  levels:SL_LEVELS, begin:i=>beginSight(i), demo:()=>slDemo(), modNote:false};
function slMenu(over){ arcadeMenu(SLMENU_G, over); }
function beginSight(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, hits:0, streak:0, phase:"play", over:false, notes:[], tune:null, modFor:null});
  saved.sightStart=level; save(); stats.streak=0; scoreboard();
  slLevelStart();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(slTick);
  banner(`LEVEL ${level+1}`, SL_LEVELS[level].n.toUpperCase()); sfx("start");
}
function slLevelStart(){
  const L=SL_LEVELS[blast.level];
  blast.keyF = L.key ? rnd(SL_KEYS) : 0; blast.tune=null; blast.tuneAt=0;
  for(const n of blast.notes) n.el && n.el.remove(); blast.notes=[];
  slLayout(); slDrawStaff(); slBar();
}
// the pitch class a note sounds: its letter, its own accidental, and the key signature's
function slPc(dn, acc){ const li=dn%7; return (SL_NAT[li]+(acc||0)+(acc ? 0 : keyAcc(li, blast.keyF||0))+120)%12; }
function slMidi(dn, acc){ const li=dn%7, a=acc||keyAcc(li, blast.keyF||0); return 12*(Math.floor(dn/7)+1)+SL_NAT[li]+a; }
function slName(dn, acc){ const li=dn%7, a=acc||keyAcc(li, blast.keyF||0); return SL_LETTERS[li]+(a>0?"♯":a<0?"♭":""); }
function slSpawn(){
  const L=SL_LEVELS[blast.level];
  let dn, clef, acc=0;
  if(L.tunes){
    if(!blast.tune || blast.tuneAt>=blast.tune.n.length){ blast.tune=rnd(SL_TUNES.filter(t=>t!==blast.lastTune)); blast.lastTune=blast.tune; blast.tuneAt=0; blast.tuneStart=true; }
    dn=blast.tune.n[blast.tuneAt++]; clef="treble";
  } else {
    clef=rnd(L.clefs); const [lo,hi]=L.range[clef];
    const prev=blast.notes.filter(n=>n.clef===clef).slice(-1)[0];
    do{ dn=lo+Math.floor(Math.random()*(hi-lo+1)); }while(prev && dn===prev.dn && Math.random()<.7);   // seldom the same note twice
    if(L.acc && Math.random()<L.acc){ const li=dn%7; acc = [2,6].includes(li) ? -1 : [0,3].includes(li) ? 1 : rnd([1,-1]); }   // no E♯, B♯, C♭ or F♭
  }
  const n={dn, clef, acc, pc:slPc(dn,acc), name:slName(dn,acc), midi:slMidi(dn,acc), x:blast.W+20, tune:blast.tune, last: blast.tune && blast.tuneAt===blast.tune.n.length};
  blast.notes.push(n); if(blast.noteLayer) slNoteEl(n);
}
function slTick(now){
  if(!blast || blast.kind!=="sight") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && blast.W){
    const L=SL_LEVELS[blast.level], speed=(62+8*blast.level)/speedMul(), gap=Math.max(78, blast.SP*6.5);
    const lastX=blast.notes.length ? blast.notes[blast.notes.length-1].x : -1e9;
    if(lastX < blast.W-gap) slSpawn();
    for(const n of blast.notes){ if(n.gone) continue;
      n.x-=speed*dt; n.el && n.el.setAttribute("transform",`translate(${n.x},0)`);
      if(!n.done && n.x < blast.ph-SL_WIN) slMiss(n);
      if(n.x < -40){ n.gone=true; n.el && n.el.remove(); } }
    blast.notes=blast.notes.filter(n=>!n.gone);
    const next=blast.notes.find(n=>!n.done); if(next && next!==blast.helped){ blast.helped=next; helpString(next.pc); }
  }
  blast.raf=requestAnimationFrame(slTick);
}
// a harp string: the note at the playhead, if it's that note
function sightNote(pc){
  if(!blast || blast.kind!=="sight") return;
  if(blast.phase==="demo" && blast.demo){ endSlDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  pc=mod(pc,12);
  const n=blast.notes.filter(n=>!n.done && Math.abs(n.x-blast.ph)<=SL_WIN).sort((a,b)=>a.x-b.x)[0];
  if(!n){ heard(SHARP_NAMES[pc],false,"NOTHING AT THE LINE YET"); blast.streak=0; slBar(); return; }
  if(n.pc!==pc){ heard(SHARP_NAMES[pc],false,`THAT'S ${n.name}`); sfx("miss"); blast.streak=0; slBar(); n.el && n.el.classList.add("wrong"); return; }
  n.done=true; n.el && n.el.classList.add("hit");
  const dead=Math.abs(n.x-blast.ph)<=SL_DEAD, mult=Math.min(4,1+Math.floor(blast.streak/8));
  const pts=mulPts(10*(blast.level+1)*mult*(dead?2:1)); blast.score+=pts; blast.hits++; blast.streak++;
  stats.streak=blast.hits; scoreboard(); heard(n.name,true); sfx("shoot");
  popup(blast.ph, slY(n.dn,n.clef)-18, `${dead?"DEAD ON ":""}+${pts}`, dead?"#FFD35A":undefined);
  if(settings.sounds && piano.ctx) piano.play([n.midi],{when:.01,dur:.5,vel:80});   // the note as written
  if(n.last){ const t=n.tune; banner(t.name, t.by); sfx("level"); blast.score+=mulPts(100*(blast.level+1)); }
  slBar();
  if(!L_TUNES_LEVEL() && blast.hits%20===0 && blast.level<SL_LEVELS.length-1){ blast.level++; banner(`LEVEL ${blast.level+1}`, SL_LEVELS[blast.level].n.toUpperCase()); sfx("level"); slLevelStart(); }
}
const L_TUNES_LEVEL=()=>!!SL_LEVELS[blast.level].tunes;
function slMiss(n){
  n.done=true; n.el && n.el.classList.add("missed");
  blast.lives--; blast.streak=0; slBar(); sfx("miss"); buzz(blast.field,true); heard(n.name,false,"MISSED");
  if(blast.lives<=0){ blast.phase="over"; blast.over=true; saved.best.sight=Math.max(saved.best.sight||0, blast.score); save(); slMenu(true); }
}

// ---------- Sight Line's demo ----------
function slDemo(){
  if(!blast || blast.kind!=="sight") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {el, token, say, sleep, step}=demoShell(endSlDemo);
  blast.phase="demo"; blast.level=0; blast.keyF=0; blast.notes=[]; slLayout(); slDrawStaff();
  const show=(dn,x,acc=0)=>{ const n={dn, clef:"treble", acc, pc:slPc(dn,acc), name:slName(dn,acc), x}; blast.notes.push(n); slNoteEl(n); return n; };
  const slide=async(n,to)=>{ const from=n.x; for(let t=0;t<=1;t+=.05){ n.x=from+(to-from)*t; n.el.setAttribute("transform",`translate(${n.x},0)`); await step(40); } };
  sfx("attract");
  (async()=>{
    try{
      say("SIGHT LINE","NOTES SCROLL ALONG THE STAFF TO THE PLAYHEAD, AS YOUR EYE MOVES ALONG A PAGE."); await step(3600);
      const a=show(32, blast.W-60); await slide(a, blast.ph);
      say("PLUCK IT","THAT'S G, ON THE SECOND LINE. PLUCK G ON THE HARP AS IT REACHES THE LINE."); helpString(7); demoPlay([67]); a.el.classList.add("hit"); await step(3000);
      const b=show(37, blast.W-60); await slide(b, blast.ph);
      say("","E, THE TOP SPACE. DEAD ON THE LINE SCORES DOUBLE."); helpString(4); demoPlay([76]); b.el.classList.add("hit"); await step(3000);
      blast.keyF=1; slDrawStaff(); const c=show(38, blast.W-60); await slide(c, blast.ph);
      say("KEY SIGNATURES","IN G MAJOR THE SIGNATURE'S SHARP IS ON F: THIS F IS PLAYED F♯."); helpString(6); demoPlay([78]); c.el.classList.add("hit"); await step(3600);
      say("READY?","LEDGER LINES, THE BASS CLEF, ACCIDENTALS, AND TUNES TO READ."); sfx("level"); await step(2600);
      endSlDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endSlDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.notes=[]; blast.keyF=0; helpChord(null); slDrawStaff();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
