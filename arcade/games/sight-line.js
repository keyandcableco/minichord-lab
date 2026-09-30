// Sight Line: sight-reading from the staff onto the minichord, notes and chords scrolling to a playhead.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Sight Line ----------
// Notes scroll right to left along a staff toward a playhead, as the eye moves along a page, and each
// is played as it reaches the line: a single note plucked on the harp, a chord (stacked on the staff)
// on the buttons. In time for a hit, dead on the line for double; hits in a row build a streak; a
// note that slips past costs a life, and a wrong one breaks the streak. Levels: the treble clef, the
// bass clef, ledger lines on both, sharps and flats, key signatures (where an F in G major is played
// F-sharp, the sharp only in the signature), chords, changing keys, inversions, both clefs, then tunes.
//   Key changes: a double bar and the new key signature scroll in; when they reach the line the staff
//   is in the new key, and on the test firmware the minichord is to be set to it with the key change
//   combo, as Chord Invaders' key bars ask, so the key's chords are plain buttons again.
//   Inversions: a chord written with its 3rd or 5th in the bass is played voiced that way: a knob (or
//   the up and down arrows) swings the minichord's chord inversion (address 37) between them.
// Notes are diatonic numbers, octave × 7 + letter (C 0 … B 6): E4 is 30, the treble's bottom line.
const SL_LETTERS="CDEFGAB", SL_NAT=[0,2,4,5,7,9,11];
const SL_LEVELS=[
  {n:"Treble clef", clefs:["treble"], range:{treble:[30,38]}},
  {n:"Bass clef", clefs:["bass"], range:{bass:[18,26]}},
  {n:"Ledger lines", clefs:["treble","bass"], range:{treble:[27,41], bass:[15,29]}},
  {n:"Sharps and flats", clefs:["treble"], range:{treble:[28,40]}, acc:.35},
  {n:"Key signatures", clefs:["treble"], range:{treble:[28,40]}, key:true},
  {n:"Chords", clefs:["treble"], range:{treble:[28,40]}, chords:.45},
  {n:"Changing keys", clefs:["treble"], range:{treble:[28,40]}, key:true, chords:.4, changes:true},
  {n:"Inversions", clefs:["treble"], range:{treble:[28,40]}, key:true, chords:.55, inversions:true, changes:true},
  {n:"Both clefs", clefs:["treble","bass"], range:{treble:[28,40], bass:[16,28]}, key:true, acc:.1, chords:.3, changes:true},
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
const SL_TONIC={0:"C",1:"G",2:"D",3:"A",4:"E",5:"B",6:"F♯","-1":"F","-2":"B♭","-3":"E♭","-4":"A♭","-5":"D♭","-6":"G♭"};
const SL_WIN=38, SL_DEAD=14;                               // pixels either side of the playhead: in time, and dead on
const SL_INV=["ROOT","1ST INV","2ND INV"];
const slSpeed=()=>(58+6*(blast.level||0))/speedMul();    // pixels a second, the same in the demo as in play
function genSight(){
  return {kind:"sight", prompt:"Sight Line", sub:"Notes scroll along the staff to the playhead: pluck each on the harp, and play each chord on the buttons, as it reaches the line. Clefs, key signatures, key changes, inversions and tunes.",
    answer:{type:"sight", name:"the note or chord at the playhead"}, hint:"Every Good Boy Deserves Fudge: the treble's lines, bottom up.", context:0};
}
function startSight(){
  blast={kind:"sight", score:0, lives:3, level:0, hits:0, streak:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), notes:[], keyF:0, genF:0, tune:null, inv:0};
  slDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  slMenu();
  blast.raf=requestAnimationFrame(slTick);
}
function slDevice(){
  if(!blast || blast.kind!=="sight" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(knobsReady()) borrow(238,1); });   // the harp chromatic; the knobs for inversions
  // a key change asked for, and the minichord now in that key: set
  const k=blast.keyWant;
  if(k!=null && blast.phase==="play" && devFifths()===k){ blast.keyWant=null; const pts=mulPts(25*(blast.level+1)); blast.score+=pts; sfx("key");
    banner(`KEY SET! +${pts}`, `${SL_TONIC[k]} MAJOR: ITS CHORDS ARE PLAIN BUTTONS NOW`); slBar(); }
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
// a key signature's sharps or flats on a staff, from x
function slSig(f, clef, x, parent){ const pos=f>0?SIG_SHARPS:SIG_FLATS;
  for(let i=0;i<Math.abs(f);i++){ const a=slSvg("text",{x:x+i*blast.SP*.8,y:slY(pos[i]-(clef==="bass"?14:0),clef),class:"sglyph"},parent); a.textContent=f>0?"\uE262":"\uE260"; } }
function slDrawStaff(){
  if(!blast || !blast.svg) return;
  const svg=blast.svg, W=blast.W, SP=blast.SP, L=SL_LEVELS[blast.level||0];
  svg.setAttribute("viewBox",`0 0 ${W} ${blast.field.clientHeight}`); svg.innerHTML="";
  for(const clef of L.clefs){
    const top = clef==="bass" ? blast.yB : blast.yT;
    for(let k=0;k<5;k++) slSvg("line",{x1:12,x2:W-12,y1:top+k*SP,y2:top+k*SP,class:"sline"});
    const g=slSvg("text",{x:18,y:clef==="bass" ? slY(24,"bass") : slY(32,"treble"),class:"sglyph clef"}); g.textContent=clef==="bass" ? "\uE062" : "\uE050";
    slSig(blast.keyF||0, clef, 62);
  }
  const top=blast.yT-SP, bot=(L.clefs.length>1?blast.yB:blast.yT)+5*SP;
  slSvg("rect",{x:blast.ph-SL_WIN,y:top,width:SL_WIN*2,height:bot-top,class:"swin"});
  slSvg("line",{x1:blast.ph,x2:blast.ph,y1:top-6,y2:bot+6,class:"shead"});
  if(L.inversions){ const t=slSvg("text",{x:blast.ph,y:top-14,class:"sinv"}); t.textContent=`VOICING: ${SL_INV[blast.inv||0]}`; blast.invEl=t; } else blast.invEl=null;
  blast.noteLayer=slSvg("g",{});
  for(const n of blast.notes) if(!n.gone) slNoteEl(n);
}
// an item on the staff, as one group moved along by transform: a note (head, accidental, ledger
// lines), a chord (its heads stacked), or a key change (a double bar and the new signature)
function slNoteEl(n){
  const SP=blast.SP, g=slSvg("g",{class:"snote"+(n.change?" schange":"")},blast.noteLayer); n.el=g;
  if(n.change){
    const L=SL_LEVELS[blast.level||0], top=blast.yT, bot=(L.clefs.length>1?blast.yB:blast.yT)+4*SP;
    slSvg("line",{x1:-6,x2:-6,y1:top,y2:bot,class:"sline"},g); slSvg("line",{x1:-2,x2:-2,y1:top,y2:bot,class:"sline bold"},g);
    for(const clef of L.clefs) slSig(n.f, clef, 6, g);
    if(!n.f){ const t=slSvg("text",{x:4,y:top-8,class:"sinv"},g); t.textContent="C"; }
  } else {
    const dns=n.dns||[n.dn], lo=Math.min(...dns), hi=Math.max(...dns), ledgers=[];
    if(n.clef==="treble"){ for(let d=28; d>=lo; d-=2) ledgers.push(d); for(let d=40; d<=hi; d+=2) ledgers.push(d); }
    else { for(let d=16; d>=lo; d-=2) ledgers.push(d); for(let d=28; d<=hi; d+=2) ledgers.push(d); }
    for(const d of ledgers) slSvg("line",{x1:-SP*.9,x2:SP*.9,y1:slY(d,n.clef),y2:slY(d,n.clef),class:"sline"},g);
    if(n.acc){ const a=slSvg("text",{x:-SP*1.9,y:slY(n.dn,n.clef),class:"sglyph"},g); a.textContent=n.acc>0?"\uE262":"\uE260"; }
    for(const d of dns){ const h=slSvg("text",{x:-SP*.6,y:slY(d,n.clef),class:"sglyph head"},g); h.textContent="\uE0A4"; }
  }
  g.setAttribute("transform",`translate(${n.x},0)`);
}
function slBar(){
  if(!blast || blast.kind!=="sight" || !blast.hud) return;
  const mult=Math.min(4,1+Math.floor(blast.streak/8));
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${SL_LEVELS[blast.level].n.toUpperCase()}${mult>1?` · STREAK ×${mult}`:""}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const SLMENU_G={key:"sight", title:"SIGHT LINE",
  rules:()=>`<p>NOTES SCROLL ALONG THE STAFF TO THE PLAYHEAD. PLUCK EACH ONE ON THE HARP, AND PLAY EACH CHORD ON THE BUTTONS, AS IT REACHES THE LINE: DEAD ON SCORES DOUBLE.</p><p>THE HARP FOLLOWS THE STAFF: A NOTE WRITTEN HIGH OR LOW SOUNDS IN ITS OWN OCTAVE.</p><p>A KEY SIGNATURE'S SHARPS AND FLATS APPLY TO EVERY NOTE ON THEIR LETTER. WHEN THE KEY CHANGES, SET THE MINICHORD TO IT.</p><p>A CHORD WITH ITS 3RD OR 5TH IN THE BASS IS AN INVERSION: SWING THE VOICING WITH A KNOB, OR ↑ ↓.</p>`,
  stat:()=>`NOTES ${blast.hits}`,
  rows:row=>{ row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); }); },
  levels:SL_LEVELS, begin:i=>beginSight(i), demo:()=>slDemo(), modNote:false};
function slMenu(over){ arcadeMenu(SLMENU_G, over); }
function beginSight(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, hits:0, streak:0, phase:"play", over:false, notes:[], tune:null, modFor:null, harpOct:null});
  saved.sightStart=level; save(); stats.streak=0; scoreboard();
  slLevelStart();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(slTick);
  banner(`LEVEL ${level+1}`, SL_LEVELS[level].n.toUpperCase()); sfx("start");
}
function slLevelStart(){
  const L=SL_LEVELS[blast.level];
  blast.keyF = blast.genF = L.key ? rnd(SL_KEYS) : 0; blast.tune=null; blast.tuneAt=0; blast.sinceChange=0; blast.keyWant=null;
  // chords are played on the buttons: the minichord set to the staff's key, so they're plain buttons, and to root position
  if(L.chords && canWrite()){ if(hasSetting(35)) borrow(35, keyIndexOf(blast.keyF)); if(hasSetting(37)) borrow(37,0); blast.inv=0; }
  for(const n of blast.notes) n.el && n.el.remove(); blast.notes=[];
  slLayout(); slDrawStaff(); slBar();
}
// the pitch class a note sounds: its letter, its own accidental, and the key signature's
const slAcc=(li,acc,f)=> acc ? acc : keyAcc(li, f);
function slPc(dn, acc, f=blast.keyF){ const li=dn%7; return (SL_NAT[li]+slAcc(li,acc,f)+120)%12; }
function slMidi(dn, acc, f=blast.keyF){ const li=dn%7; return 12*(Math.floor(dn/7)+1)+SL_NAT[li]+slAcc(li,acc,f); }
function slName(dn, acc, f=blast.keyF){ const li=dn%7, a=slAcc(li,acc,f); return SL_LETTERS[li]+(a>0?"♯":a<0?"♭":""); }
// a chord of the key: a degree's triad, I to vi, voiced in root position or an inversion
function slChord(f, inv){
  const tonicLi=SL_LETTERS.indexOf(SL_TONIC[f][0]), deg=rnd([0,1,2,3,4,5]), li=(tonicLi+deg)%7, rootDn=28+li;
  const tones=[rootDn, rootDn+2, rootDn+4], dns = inv===1 ? [rootDn+2, rootDn+4, rootDn+7] : inv===2 ? [rootDn+4, rootDn+7, rootDn+9] : tones;
  const pcs=tones.map(d=>slPc(d,0,f)), q = ((pcs[1]-pcs[0]+12)%12)===4 ? "" : "m";
  const root=slName(rootDn,0,f), bassDn=dns[0];
  return {chord:true, dns, dn:bassDn, clef:"treble", rootPc:pcs[0], q, inv, bassPc:slPc(bassDn,0,f), name:root+q+(inv?"/"+slName(bassDn,0,f):"")};
}
function slSpawn(){
  const L=SL_LEVELS[blast.level];
  let n;
  if(L.changes && blast.sinceChange>=10){ blast.sinceChange=0;           // a key change scrolls in
    const f=rnd(SL_KEYS.concat([0]).filter(k=>k!==blast.genF)); blast.genF=f; n={change:true, f, x:blast.W+20}; }
  else if(L.tunes){
    if(!blast.tune || blast.tuneAt>=blast.tune.n.length){ blast.tune=rnd(SL_TUNES.filter(t=>t!==blast.lastTune)); blast.lastTune=blast.tune; blast.tuneAt=0; }
    const dn=blast.tune.n[blast.tuneAt++];
    n={dn, clef:"treble", acc:0, pc:slPc(dn,0,0), name:slName(dn,0,0), midi:slMidi(dn,0,0), tune:blast.tune, last:blast.tuneAt===blast.tune.n.length, x:blast.W+20};
  } else if(L.chords && Math.random()<L.chords){
    n={...slChord(blast.genF, L.inversions ? rnd([0,1,2]) : 0), x:blast.W+20}; blast.sinceChange++;
  } else {
    const clef=rnd(L.clefs), [lo,hi]=L.range[clef], prev=blast.notes.filter(x=>x.clef===clef && !x.chord && !x.change).slice(-1)[0];
    let dn, acc=0; do{ dn=lo+Math.floor(Math.random()*(hi-lo+1)); }while(prev && dn===prev.dn && Math.random()<.7);   // seldom the same note twice
    if(L.acc && Math.random()<L.acc){ const li=dn%7; acc = [2,6].includes(li) ? -1 : [0,3].includes(li) ? 1 : rnd([1,-1]); }   // no E♯, B♯, C♭ or F♭
    n={dn, clef, acc, pc:slPc(dn,acc,blast.genF), name:slName(dn,acc,blast.genF), midi:slMidi(dn,acc,blast.genF), x:blast.W+20}; blast.sinceChange++;
  }
  blast.notes.push(n); if(blast.noteLayer) slNoteEl(n);
  return n;
}
function slTick(now){
  if(!blast || blast.kind!=="sight") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if((blast.phase==="play" || (blast.phase==="demo" && blast.demoScroll)) && blast.W){
    const gap=Math.max(84, blast.SP*7), lastX=blast.notes.length ? blast.notes[blast.notes.length-1].x : -1e9;
    if(lastX < blast.W-gap){ if(blast.phase==="play") slSpawn(); else if(blast.demoQueue && blast.demoQueue.length) slDemoSpawn(); }
    for(const n of blast.notes){ if(n.gone) continue;
      n.x-=slSpeed()*dt; n.el && n.el.setAttribute("transform",`translate(${n.x},0)`);
      if(n.change && !n.done && n.x<=blast.ph){ n.done=true; slKeyChange(n.f, n); }
      if(blast.phase==="demo" && !n.done && !n.change && Math.abs(n.x-blast.ph)<=4) slDemoHit(n);
      if(blast.phase==="play" && !n.done && !n.change && n.x < blast.ph-SL_WIN) slMiss(n);
      if(n.x < -40){ n.gone=true; n.el && n.el.remove(); } }
    blast.notes=blast.notes.filter(n=>!n.gone);
    const next=blast.notes.find(n=>!n.done && !n.change);
    if(next && next!==blast.helped){ blast.helped=next; if(next.chord) helpChord(SHARP_NAMES[next.rootPc], next.q); else helpString(next.pc);
      if(blast.phase==="play") slHarpFor(next); }
  }
  blast.raf=requestAnimationFrame(slTick);
}
// The harp plays the register the note is written in: its octave change (address 99) moves the
// chromatic strings a whole octave at a time, the C string sounding C3 at 0, C4 (middle C) at 1, C5 at
// 2, C6 at 3 and C7 at 4. So the treble staff's middle C, the C in its third space and the C two
// ledger lines up are three different Cs on the harp, as written. The bass staff's lowest notes, below
// C3, sound an octave up: the harp goes no lower.
const slHarpOctave=midi=> Math.max(0, Math.min(4, Math.floor((midi-48)/12)));
function slHarpFor(n){
  if(!n || n.chord || n.midi==null || !canWrite() || !hasSetting(99)) return;
  const o=slHarpOctave(n.midi); if(o===blast.harpOct) return;
  blast.harpOct=o; borrow(99,o);
}
// the key change reaching the line: the staff's in the new key, and the minichord's to be set to it
function slKeyChange(f, n){
  blast.keyF=f; slDrawStaff();
  const nm=`${SL_TONIC[f]} MAJOR`;
  if(blast.phase==="demo" && n && n.demoCaption && blast.demo){ const d=blast.demo.el; d.querySelector(".demotitle").textContent=n.demoCaption[0]; d.querySelector(".democap").textContent=n.demoCaption[1]; }
  if(blast.phase==="play" && keyComboReady()){ blast.keyWant=f; banner("KEY CHANGE", `SET THE MINICHORD TO ${nm}`); }
  else if(blast.phase==="play" && SL_LEVELS[blast.level].chords && canWrite() && hasSetting(35)){ borrow(35, keyIndexOf(f)); banner("KEY CHANGE", `${nm}: THE MINICHORD FOLLOWS`); }   // no combo on this firmware
  else banner("KEY CHANGE", f ? `${nm}: ${Math.abs(f)} ${f>0?"SHARP":"FLAT"}${Math.abs(f)>1?"S":""}` : "C MAJOR: NO SHARPS OR FLATS");
  sfx("level");
}
// what's at the line, if anything
const slAt=()=>blast.notes.filter(n=>!n.done && !n.change && Math.abs(n.x-blast.ph)<=SL_WIN).sort((a,b)=>a.x-b.x)[0];
function slScore(n){
  n.done=true; n.el && n.el.classList.add("hit");
  const dead=Math.abs(n.x-blast.ph)<=SL_DEAD, mult=Math.min(4,1+Math.floor(blast.streak/8));
  const pts=mulPts(10*(blast.level+1)*mult*(dead?2:1)*(n.chord?2:1)); blast.score+=pts; blast.hits++; blast.streak++;
  stats.streak=blast.hits; scoreboard(); heard(n.name,true); sfx("shoot");
  popup(blast.ph, slY(n.dn,n.clef)-18, `${dead?"DEAD ON ":""}+${pts}`, dead?"#FFD35A":undefined);
  if(n.last){ const t=n.tune; banner(t.name, t.by); sfx("level"); blast.score+=mulPts(100*(blast.level+1)); }
  slBar();
  if(!SL_LEVELS[blast.level].tunes && blast.hits%20===0 && blast.level<SL_LEVELS.length-1){ blast.level++; banner(`LEVEL ${blast.level+1}`, SL_LEVELS[blast.level].n.toUpperCase()); sfx("level"); slLevelStart(); }
}
function slWrong(said, n, why){ heard(said,false,why); sfx("miss"); blast.streak=0; slBar(); n && n.el && n.el.classList.add("wrong"); }
// a harp string: the note at the line, if it's that note
function sightNote(pc){
  if(!blast || blast.kind!=="sight") return;
  if(blast.phase==="demo" && blast.demo){ endSlDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  pc=mod(pc,12); const n=slAt();
  if(!n){ slWrong(SHARP_NAMES[pc], null, "NOTHING AT THE LINE YET"); return; }
  if(n.chord){ slWrong(SHARP_NAMES[pc], n, "A CHORD: PLAY IT ON THE BUTTONS"); return; }
  if(n.pc!==pc){ slWrong(SHARP_NAMES[pc], n, `THAT'S ${n.name}`); return; }
  if(settings.sounds && piano.ctx) piano.play([n.midi],{when:.01,dur:.5,vel:80});        // the note as written
  slScore(n);
}
// a chord from the buttons: the chord at the line, voiced as written where the level asks
function sightChord(voices){
  if(!blast || blast.kind!=="sight") return;
  if(blast.phase==="demo" && blast.demo){ endSlDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches, devFifths()); if(!chordId(pitches)) return;
  const n=slAt();
  if(!n){ slWrong(name, null, "NOTHING AT THE LINE YET"); return; }
  if(!n.chord){ slWrong(name, n, "A SINGLE NOTE: PLUCK IT ON THE HARP"); return; }
  if(!isChord(pitches, n.rootPc, n.q)){ slWrong(name, n, `THAT'S ${n.name}`); return; }
  const bass=mod(Math.min(...pitches),12);
  if(SL_LEVELS[blast.level].inversions && bass!==n.bassPc){ slWrong(name, n, `${SL_INV[n.inv]}: ${SHARP_NAMES[n.bassPc]} IN THE BASS`); return; }
  slScore(n);
}
// inversions: a knob, or the up and down arrows, swings the minichord's chord inversion
function slInvert(v){
  if(!blast || blast.kind!=="sight" || !SL_LEVELS[blast.level].inversions || !canWrite() || !hasSetting(37)) return;
  const inv=Math.max(0,Math.min(2,v)); if(inv===blast.inv) return;
  blast.inv=inv; borrow(37,inv); if(blast.invEl) blast.invEl.textContent=`VOICING: ${SL_INV[inv]}`; sfx("press");
}
function sightKnob(v){ slInvert(Math.min(2,Math.floor(v*3))); }
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="sight" || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowUp:1,ArrowDown:-1}[e.code]; if(!d) return;
  e.preventDefault(); slInvert((blast.inv||0)+d);
});
function slMiss(n){
  n.done=true; n.el && n.el.classList.add("missed");
  blast.lives--; blast.streak=0; slBar(); sfx("miss"); buzz(blast.field,true); heard(n.name,false,"MISSED");
  if(blast.lives<=0){ blast.phase="over"; blast.over=true; saved.best.sight=Math.max(saved.best.sight||0, blast.score); save(); slMenu(true); }
}

// ---------- Sight Line's demo ----------
// The staff scrolls exactly as it does in play, the demo reading each note and chord as it reaches the
// line: two notes on the harp, a chord on the buttons, a key change into G, an F read as F-sharp, and
// an inversion swung into place with the knob, a caption as each arrives.
function slDemo(){
  if(!blast || blast.kind!=="sight") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {el, token, say, sleep, step}=demoShell(endSlDemo);
  blast.phase="demo"; blast.level=7; blast.keyF=blast.genF=0; blast.inv=0; blast.notes=[]; slLayout(); slDrawStaff();
  const N=(dn,words)=>({dn, clef:"treble", acc:0, words});
  blast.demoQueue=[
    {...N(32), say:["SIGHT LINE","NOTES SCROLL TO THE PLAYHEAD, AS YOUR EYE MOVES ALONG A PAGE. G, THE SECOND LINE: PLUCK IT ON THE HARP."]},
    {...N(37), say:["","E, THE TOP SPACE. IN TIME FOR A HIT, DEAD ON THE LINE FOR DOUBLE."]},
    {chordOf:[0,0], say:["CHORDS","STACKED NOTES ARE A CHORD: C, E AND G. PLAY C MAJOR ON THE BUTTONS."]},
    {change:1, say:["KEY CHANGE","A DOUBLE BAR AND A NEW SIGNATURE: G MAJOR. SET THE MINICHORD TO IT WITH THE KEY CHANGE COMBO."]},
    {...N(31), say:["","IN G MAJOR, THE SIGNATURE'S SHARP IS ON F: THIS F IS PLAYED F♯."]},
    {chordOf:[4,1], say:["INVERSIONS","THE 3RD IN THE BASS: D/F♯, THE FIRST INVERSION. SWING THE VOICING WITH A KNOB, THEN PLAY D."]},
    {...N(35), say:["READY?","BOTH CLEFS, LEDGER LINES, KEY CHANGES AND TUNES TO READ."]},
  ];
  blast.demoToken=token; blast.demoScroll=true; blast.demoLeft=blast.demoQueue.filter(q=>q.change==null).length;
  sfx("attract");
  say("SIGHT LINE","READING THE STAFF ONTO THE MINICHORD.");
}
// the demo's next item onto the staff, and the demo reading it at the line
function slDemoSpawn(){
  const q=blast.demoQueue.shift(); let n;
  if(q.change!=null){ blast.genF=q.change; n={change:true, f:q.change, x:blast.W+20}; }
  else if(q.chordOf){ const [deg,inv]=q.chordOf, f=blast.genF, tonicLi=SL_LETTERS.indexOf(SL_TONIC[f][0]), li=(tonicLi+deg)%7, rootDn=28+li;
    const dns = inv===1 ? [rootDn+2,rootDn+4,rootDn+7] : [rootDn,rootDn+2,rootDn+4], pcs=[rootDn,rootDn+2,rootDn+4].map(d=>slPc(d,0,f));
    n={chord:true, dns, dn:dns[0], clef:"treble", rootPc:pcs[0], q:((pcs[1]-pcs[0]+12)%12)===4?"":"m", inv, bassPc:slPc(dns[0],0,f), name:slName(rootDn,0,f), x:blast.W+20}; }
  else n={...q, pc:slPc(q.dn,0,blast.genF), name:slName(q.dn,0,blast.genF), midi:slMidi(q.dn,0,blast.genF), x:blast.W+20};
  n.say=q.say; n.changeSay=q.change!=null;
  blast.notes.push(n); if(blast.noteLayer) slNoteEl(n);
  if(q.change!=null) n.demoCaption=q.say;
}
function slDemoHit(n){
  const d=blast.demo; if(!d) return;
  const [t,c]=n.say||["",""]; if(d.el) { const tt=d.el.querySelector(".demotitle"), cc=d.el.querySelector(".democap"); if(tt) tt.textContent=t; if(cc) cc.textContent=c; }
  n.done=true; n.el && n.el.classList.add("hit"); sfx("shoot");
  if(n.chord){ if(n.inv){ blast.inv=n.inv; if(blast.invEl) blast.invEl.textContent=`VOICING: ${SL_INV[n.inv]}`; }
    helpChord(SHARP_NAMES[n.rootPc], n.q); demoPlay(n.dns.map(d=>slMidi(d,0,blast.keyF))); }
  else { helpString(n.pc); demoPlay([n.midi]); }
  if(--blast.demoLeft<=0) gameLater(()=>{ if(blast.demo===d) endSlDemo(d); }, 3800);
}
function endSlDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoScroll=false; blast.demoQueue=null; blast.notes=[]; blast.level=0; blast.keyF=blast.genF=0; blast.inv=0; helpChord(null);
  slLayout(); slDrawStaff();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
