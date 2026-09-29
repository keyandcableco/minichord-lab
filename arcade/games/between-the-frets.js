// Between the Frets: a quarter-tone ear game, where the modifier means a quarter-tone.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Between the Frets ----------
// The notes between the notes. A note plays, then another: the same, a quarter-tone sharp, or a
// quarter-tone flat? Answer on the chord buttons, any column: the major row for sharp, the minor row
// for in tune, the 7 row for flat. Right, and off: then find that note in between, with the modifier,
// which in this game means a quarter-tone, not a semitone. Levels go from single notes to intervals,
// to the neutral third (a triad neither major nor minor, its third halfway), to whole riffs where one
// note bends.
//
// How the modifier means a quarter-tone: the game silences the minichord's own speaker (its output
// amplifier, address 97, which isn't the MIDI velocity) and makes every sound on the page, retuned.
// It holds the minichord at C, where the only way to a black-key chord is the modifier, so C-sharp
// means "C and the modifier", and the page sounds C a quarter-tone up. E and B have no black key above
// them (E sharpened plays F), nor C and F one below, so the game asks for quarter-sharps only on C, D,
// F, G and A, sharpening, and quarter-flats only on D, E, G, A and B, flattening: every letter one way
// or the other, the modifier's way set for each.
const FR_SHARPABLE=["C","D","F","G","A"], FR_FLATTABLE=["D","E","G","A","B"];
const FR_NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const FR_LEVELS=[
  {n:"Notes", kind:"note"},
  {n:"Intervals", kind:"interval"},
  {n:"The neutral third", kind:"neutral"},
  {n:"Riffs", kind:"riff"},
  {n:"Everything", kind:"mix", fast:true},
];
const FR_ROWS={note:["¼ SHARP","IN TUNE","¼ FLAT"], interval:["¼ SHARP","IN TUNE","¼ FLAT"], neutral:["MAJOR","MINOR","NEUTRAL"]};
function genFrets(){
  return {kind:"frets", prompt:"Between the Frets", sub:"A note plays, then another: the same, a quarter-tone sharp, or a quarter-tone flat? Answer on the chord buttons: the major row sharp, the minor row in tune, the 7 row flat. Then find the note in between, with the modifier.",
    answer:{type:"frets", name:"sharp, in tune or flat"}, hint:"The major row is sharp, the minor row in tune, the 7 row flat.", context:0};
}
function startFrets(){
  blast={kind:"frets", score:0, lives:3, level:0, right:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true, last:performance.now(), q:null};
  frDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  frMenu();
  blast.raf=requestAnimationFrame(frTick);
}
function frDevice(){
  if(!blast || blast.kind!=="frets" || !canWrite()) return;
  // the minichord's speaker silenced (the page makes the sounds, retuned), the key held at C
  arcadeSetup(()=>{ if(hasSetting(97)) borrow(97,0); if(hasSetting(35)) borrow(35, keyIndexOf(0)); if(hasSetting(30)) ensure(30,0); if(hasSetting(31)) borrow(31, mc.params[31]??0); });
}
function buildFretsField(box){
  const field=document.createElement("div"); field.className="field arcade frets"; field.setAttribute("aria-label","Between the frets");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const stage=document.createElement("div"); stage.className="frstage";
  stage.innerHTML=`<div class="frband"><span class="frplayer left">${FR_GUITARIST}</span><span class="frplayer right">${FR_DRUMMER}</span></div>
    <div class="frboard"></div><p class="frprompt"></p><div class="frrows"></div><div class="frtime"><i></i></div>`;
  field.appendChild(stage);
  box.append(field);
  if(blast && blast.kind==="frets"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.stageEl=stage; blast.fx=fxInit(field);
    if(blast.overlay) field.appendChild(blast.overlay);
    frDrawBoard();
  }
  frBar(); setTimeout(helperSync);
}
function frBar(){
  if(!blast || blast.kind!=="frets" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${FR_LEVELS[blast.level].n.toUpperCase()}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
// the fretboard: an octave from C, a fret for each semitone and a dotted one between each pair, with
// where the notes fall on it
function frDrawBoard(marks=[]){
  const el=blast && blast.stageEl && blast.stageEl.querySelector(".frboard"); if(!el) return;
  const W=600, x=m=>20+(m-60)/12*(W-40);
  let h=`<svg viewBox="0 0 ${W} 70" preserveAspectRatio="none" aria-hidden="true"><rect x="10" y="18" width="${W-20}" height="34" fill="#F1E8D2"/>`;
  for(let s=0;s<=12;s++) h+=`<rect x="${x(60+s)-1.5}" y="18" width="3" height="34" fill="#16132A"/>`;
  for(let s=0;s<12;s++) h+=`<rect x="${x(60.5+s)-.5}" y="18" width="1" height="34" fill="#16132A" opacity=".35"/>`;
  ["C","D","E","F","G","A","B","C"].forEach((l,i)=>{ const m=60+[0,2,4,5,7,9,11,12][i]; h+=`<text x="${x(m)}" y="66" text-anchor="middle" class="frlbl">${l}</text>`; });
  marks.forEach(mk=>{ const m=60+((mk.m-60)%12+12)%12; h+=`<circle cx="${x(m)}" cy="35" r="11" fill="${mk.c}" stroke="#16132A" stroke-width="3"/>${mk.t?`<text x="${x(m)}" y="12" text-anchor="middle" class="frtag">${mk.t}</text>`:""}`; });
  el.innerHTML=h+"</svg>";
}
const FRMENU_G={key:"frets", title:"BETWEEN THE FRETS",
  rules:()=>`<p>A NOTE PLAYS, THEN ANOTHER: THE SAME, A QUARTER-TONE SHARP, OR A QUARTER-TONE FLAT?</p><p>ANSWER ON ANY COLUMN: MAJOR ROW SHARP, MINOR ROW IN TUNE, 7 ROW FLAT. PLUCK THE HARP TO HEAR IT AGAIN.</p><p>THEN FIND THE NOTE IN BETWEEN: HERE THE MODIFIER MEANS A QUARTER-TONE.</p>`,
  stat:()=>`RIGHT ${blast.right}`,
  rows:row=>{ row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); }); },
  levels:FR_LEVELS, begin:i=>beginFrets(i), demo:()=>frDemo(), modNote:false};
function frMenu(over){ arcadeMenu(FRMENU_G, over); }
function beginFrets(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, right:0, phase:"play", over:false, q:null, modFor:null});
  saved.fretsStart=level; save(); stats.streak=0; scoreboard(); frBar();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(frTick);
  banner(`LEVEL ${level+1}`, FR_LEVELS[level].n.toUpperCase()); sfx("start");
  if(!settings.sounds) banner("TURN THE SOUND ON", "THIS ONE'S ALL EARS");
  gameLater(()=>frAsk(), 1600);
}
// ---------- the questions ----------
const frOk=(letter,dir)=> dir>0 ? FR_SHARPABLE.includes(letter) : dir<0 ? FR_FLATTABLE.includes(letter) : true;
function frPickOff(){ return rnd([0,50,-50]); }
function frQuestion(kind){
  const off=frPickOff(), dir=Math.sign(off);
  if(kind==="note"){ let l; do{ l=rnd(Object.keys(FR_NAT)); }while(!frOk(l,dir));
    const m=60+FR_NAT[l]; return {kind, off, letter:l, ref:[[m]], test:[[m+off/100]], answer:dir>0?0:dir<0?2:1, show:{ref:m, test:m+off/100}}; }
  if(kind==="interval"){ for(let k=0;k<60;k++){
      const lo=rnd(["C","D","E","F","G","A"]), iv=rnd([[4,7,"A 5TH"],[3,5,"A 4TH"],[2,4,"A MAJOR 3RD"],[2,3,"A MINOR 3RD"]]), up=above(lo,iv[0],iv[1]);
      if(!up || up.length!==1 || !frOk(up,dir)) continue;
      const a=60+FR_NAT[lo], b=a+iv[1];
      return {kind, off, letter:up, what:iv[2], ref:[[a],[b],[a,b]], test:[[a],[b+off/100],[a,b+off/100]], answer:dir>0?0:dir<0?2:1, show:{ref:b, test:b+off/100}}; } }
  if(kind==="neutral"){ const l=rnd(["C","D","F","G","A"]), a=60+FR_NAT[l], t=rnd([0,1,2]), third=[4,3,3.5][t];
    return {kind, off:0, letter:l, ref:[[a,a+third,a+7]], test:null, answer:t, show:{test:a+third}}; }
  if(kind==="riff"){ for(let k=0;k<60;k++){
      const notes=Array.from({length:4},()=>rnd(["C","D","E","G","A"])), i=Math.floor(Math.random()*4), d=rnd([1,-1]);
      if(!frOk(notes[i],d)) continue;
      const ms=notes.map(n=>60+FR_NAT[n]), bent=ms.map((m,j)=>j===i?m+d/2:m);
      return {kind, off:d*50, letter:notes[i], riff:notes, idx:i, ref:ms.map(m=>[m]), test:bent.map(m=>[m]), answer:i, show:{ref:ms[i], test:bent[i]}}; } }
  return frQuestion("note");
}
// play a question: the reference, then the test, a beat apart
function frPlay(q){
  if(!settings.sounds || !piano.ctx) return 0;
  const go=()=>{ let t=.05;
    q.ref.forEach(ch=>{ piano.play(ch,{when:t,dur:.55,vel:90}); t+=.62; });
    if(q.test){ t+=.35; q.test.forEach(ch=>{ piano.play(ch,{when:t,dur:.55,vel:90}); t+=.62; }); } };
  piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{});
  return (q.ref.length+(q.test?q.test.length:0))*620+400;
}
function frAsk(){
  if(!blast || blast.phase!=="play") return;
  const L=FR_LEVELS[blast.level], kind = L.kind==="mix" ? rnd(["note","interval","neutral","riff"]) : L.kind;
  const q=frQuestion(kind); blast.q=q; q.step="answer";
  const legend = kind==="riff" ? ["NOTE 1: F COLUMN","NOTE 2: C","NOTE 3: G","NOTE 4: D"] : FR_ROWS[kind].map((t,i)=>`${["MAJ","MIN","7"][i]} ROW: ${t}`);
  blast.stageEl.querySelector(".frrows").innerHTML=legend.map(t=>`<span>${t}</span>`).join("");
  const say = kind==="note" ? "THE SAME, ¼ SHARP OR ¼ FLAT?" : kind==="interval" ? `${q.what} UP: IS ITS TOP NOTE IN TUNE?` : kind==="neutral" ? "MAJOR, MINOR, OR NEUTRAL: THE THIRD HALFWAY?" : "THE RIFF, THEN AGAIN: WHICH NOTE BENT?";
  frSay(say); frDrawBoard(q.show.ref!=null ? [{m:q.show.ref, c:"#F1E8D2", t:"REF"}] : []);
  const len=frPlay(q); q.at=performance.now()+len; q.limit=(L.fast?6000:9000)*speedMul();
}
function frSay(t){ const p=blast.stageEl && blast.stageEl.querySelector(".frprompt"); if(p) p.textContent=t; }
function frTick(now){
  if(!blast || blast.kind!=="frets") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  const q=blast.q;
  if(blast.phase==="play" && q && q.at){
    const left=Math.max(0,1-(now-q.at)/q.limit), bar=blast.stageEl.querySelector(".frtime i"); if(bar) bar.style.transform=`scaleX(${now<q.at?1:left})`;
    if(now>q.at && left<=0){ if(q.step==="answer") frWrong("TOO SLOW"); else frFound(false); }
  }
  blast.raf=requestAnimationFrame(frTick);
}
// ---------- answers ----------
function fretsNote(){ if(blast && blast.kind==="frets" && blast.phase==="play" && blast.q && blast.q.step==="answer"){ const len=frPlay(blast.q); blast.q.at=performance.now()+len; } }
function fretsChord(voices){
  if(!blast || blast.kind!=="frets") return;
  if(blast.phase==="demo" && blast.demo){ endFrDemo(blast.demo); return; }
  const q=blast.q; if(blast.phase!=="play" || !q || performance.now()<q.at-400) return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const row = ["","6"].includes(id.quality) ? 0 : ["m","m6"].includes(id.quality) ? 1 : id.quality==="7" ? 2 : -1;
  if(q.step==="find"){
    const want=(FR_NAT[q.letter]+Math.sign(q.off)+12)%12;
    if(id.root===want) frFound(true); else { heard(SHARP_NAMES[id.root],false,`${q.letter} AND THE MODIFIER`); sfx("miss"); }
    return;
  }
  const said = q.kind==="riff" ? "FCGD".indexOf(SHARP_NAMES[id.root]) : row;
  if(said<0){ heard(chordName(pitches,0),false, q.kind==="riff"?"THE F, C, G OR D COLUMN":"THE MAJOR, MINOR OR 7 ROW"); return; }
  if(said===q.answer) frRight(); else frWrong("NOT QUITE", q.kind==="riff" ? `NOTE ${said+1}` : FR_ROWS[q.kind][said]);
}
function frRight(){
  const q=blast.q, pts=mulPts(20*(blast.level+1)); blast.score+=pts; blast.right++; stats.streak=blast.right; scoreboard(); frBar();
  sfx("key"); heard(q.kind==="riff"?`NOTE ${q.idx+1}`:(FR_ROWS[q.kind]||[])[q.answer]||"",true);
  frReveal(q);
  const find = q.off!==0 && q.kind!=="neutral";
  if(find){ q.step="find"; q.at=performance.now(); if(canWrite() && hasSetting(31)) borrow(31, q.off>0?0:1);   // the modifier's way, for this one
    frSay(`RIGHT! NOW PLAY IT: ${q.letter} ${q.off>0?"HALF-SHARP":"HALF-FLAT"}, ${q.letter} AND THE MODIFIER`); return; }
  frNext();
}
function frFound(ok){
  const q=blast.q;
  if(ok){ const pts=mulPts(30*(blast.level+1)); blast.score+=pts; frBar(); heard(`${q.letter}${q.off>0?" +¼":" −¼"}`,true); sfx("bonus");
    if(settings.sounds && piano.ctx) piano.play([60+FR_NAT[q.letter]+q.off/100],{when:.02,dur:.9});   // the note in between, as the modifier made it
    frSay(`THAT'S IT: THE NOTE BETWEEN THE FRETS. +${pts}`); }
  else frSay(`IT WAS ${q.letter} AND THE MODIFIER`);
  frNext(1600);
}
function frWrong(why, said){
  const q=blast.q; q.step="done"; blast.lives--; frBar(); sfx("miss"); buzz(blast.field,true);
  const was = q.kind==="riff" ? `NOTE ${q.idx+1} BENT ${q.off>0?"SHARP":"FLAT"}` : (FR_ROWS[q.kind]||[])[q.answer];
  heard(said||"TIME",false,`${why}: IT WAS ${was}`); frReveal(q); frPlay(q);
  if(blast.lives<=0){ gameLater(()=>{ blast.phase="over"; blast.over=true; saved.best.frets=Math.max(saved.best.frets||0, blast.score); save(); frMenu(true); }, 2600); return; }
  frNext(3200);
}
function frReveal(q){ if(q.show.test!=null) frDrawBoard([...(q.show.ref!=null?[{m:q.show.ref, c:"#F1E8D2", t:"REF"}]:[]), {m:q.show.test, c:"#FF5AA0", t:q.off>0?"+¼":q.off<0?"−¼":q.kind==="neutral"?["MAJ","MIN","NEUTRAL"][q.answer]:"SAME"}]); }
function frNext(ms=1400){
  blast.q.step="done"; blast.q.at=0;
  if(blast.right && blast.right%6===0 && blast.level<FR_LEVELS.length-1 && blast.lives>0){ blast.level++; banner(`LEVEL ${blast.level+1}`, FR_LEVELS[blast.level].n.toUpperCase()); sfx("level"); frBar(); ms+=1200; }
  gameLater(()=>{ if(blast && blast.phase==="play") frAsk(); }, ms);
}
// the band, in pixels: a double-necked guitarist and a drummer, in polka dots with big round heads
const FR_DOTS=(x,y,w,h)=>{ let s=""; for(let j=y+1;j<y+h;j+=3) for(let i=x+((j-y)%6?1:2);i<x+w;i+=3) s+=`<rect x="${i}" y="${j}" width="1" height="1"/>`; return s; };
const FR_GUITARIST=`<svg viewBox="0 0 24 34" shape-rendering="crispEdges" aria-hidden="true"><circle cx="12" cy="7" r="7" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(6,1,12,12)}</g>
  <rect x="7" y="14" width="10" height="12" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(7,14,10,12)}</g><rect x="8" y="26" width="3" height="8" fill="#F1E8D2"/><rect x="13" y="26" width="3" height="8" fill="#F1E8D2"/>
  <rect x="1" y="17" width="22" height="2" fill="#16132A"/><rect x="1" y="21" width="22" height="2" fill="#16132A"/><rect x="15" y="16" width="6" height="8" fill="#16132A"/></svg>`;
const FR_DRUMMER=`<svg viewBox="0 0 28 34" shape-rendering="crispEdges" aria-hidden="true"><circle cx="14" cy="7" r="7" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(8,1,12,12)}</g>
  <rect x="9" y="14" width="10" height="10" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(9,14,10,10)}</g>
  <rect x="4" y="22" width="20" height="10" fill="#16132A"/><rect x="6" y="24" width="16" height="6" fill="#F1E8D2"/><rect x="0" y="16" width="7" height="2" fill="#F1E8D2"/><rect x="21" y="16" width="7" height="2" fill="#F1E8D2"/></svg>`;

// ---------- Between the Frets' demo ----------
function frDemo(){
  if(!blast || blast.kind!=="frets") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {el, token, say, sleep, step}=demoShell(endFrDemo);
  blast.phase="demo";
  const q={kind:"note", off:50, letter:"A", ref:[[69]], test:[[69.5]], answer:0, show:{ref:69, test:69.5}};
  sfx("attract");
  (async()=>{
    try{
      say("BETWEEN THE FRETS","THE NOTES BETWEEN THE NOTES: A QUARTER-TONE, HALF A SEMITONE."); frDrawBoard(); await step(3800);
      frSay("THE SAME, ¼ SHARP OR ¼ FLAT?"); blast.stageEl.querySelector(".frrows").innerHTML=["MAJ ROW: ¼ SHARP","MIN ROW: IN TUNE","7 ROW: ¼ FLAT"].map(t=>`<span>${t}</span>`).join("");
      say("LISTEN","AN A, THEN ANOTHER. THE SECOND IS A LITTLE HIGH: BETWEEN A AND B♭."); frDrawBoard([{m:69,c:"#F1E8D2",t:"REF"}]); frPlay(q); await step(3200);
      say("ANSWER","ANY COLUMN: THE MAJOR ROW FOR SHARP."); await step(2400); frReveal(q); sfx("key"); await step(1600);
      say("FIND IT","HERE THE MODIFIER MEANS A QUARTER-TONE: A AND THE MODIFIER PLAYS A HALF-SHARP."); await step(2400);
      demoPlay([69.5]); sfx("bonus"); await step(2400);
      say("READY?","LEVELS GO FROM NOTES TO INTERVALS, THE NEUTRAL THIRD, AND RIFFS THAT BEND."); sfx("level"); await step(2800);
      endFrDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endFrDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; frDrawBoard(); frSay(""); const r=blast.stageEl&&blast.stageEl.querySelector(".frrows"); if(r) r.innerHTML="";
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
