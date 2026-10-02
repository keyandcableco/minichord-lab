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
//
// On firmware 18 and up, the minichord does it itself: the game sets it to 24-EDO (temperament 11),
// where the modifier moves a note a quarter-tone, and to MPE, where each voice's exact pitch arrives
// as a bend, and leaves its speaker on. Then the player hears the instrument play the note between the
// frets, and any letter can go either way.
const frInstrument=()=> canWrite() && (mc.params[7]??0)>=18 && hasSetting(237) && hasSetting(110);
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
  // the key held at C; then either the minichord in 24-EDO and MPE, playing the quarter-tones itself,
  // or its speaker silenced and the page making the sounds, retuned
  arcadeSetup(()=>{ if(hasSetting(35)) borrow(35, keyIndexOf(0)); if(hasSetting(30)) ensure(30,0); if(hasSetting(31)) borrow(31, mc.params[31]??0);
    if(frInstrument()){ blast.instrument=true; borrow(237, mc.temperamentValue(11)); borrow(110,1); asHarp(); }   // 24-EDO, the harp chromatic in quarter-tones
    else if(hasSetting(97)) borrow(97,0); });
}
function buildFretsField(box){
  const field=document.createElement("div"); field.className="field arcade frets"; field.setAttribute("aria-label","Between the frets");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const stage=document.createElement("div"); stage.className="frstage";
  stage.innerHTML=`<div class="frband"><span class="frplayer left">${FR_GUITARIST}</span><span class="frplayer right">${FR_DRUMMER}</span></div>
    <div class="frboard"></div><div class="frstaff"></div><p class="frprompt"></p><div class="frrows"></div><div class="frtime"><i></i></div><button class="fragain" type="button">▶ AGAIN</button>`;
  field.appendChild(stage);
  box.append(field);
  if(blast && blast.kind==="frets"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.stageEl=stage; blast.fx=fxInit(field);
    stage.querySelector(".fragain").onclick=()=>frReplay();
    if(blast.overlay) field.appendChild(blast.overlay);
    frDrawBoard();
  }
  frBar(); setTimeout(helperSync);
}
function frBar(){
  if(!blast || blast.kind!=="frets" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${FR_LEVELS[blast.level].n.toUpperCase()}</span><span class="lives">${livesHtml()}</span>`;
}
// the fretboard: an octave from C, a fret for each semitone and a dotted one between each pair, with
// where the notes fall on it
function frDrawBoard(marks=[]){
  const el=blast && blast.stageEl && blast.stageEl.querySelector(".frboard"); if(!el) return;
  const W=600, x=m=>20+(m-60)/12*(W-40);
  let h=`<svg viewBox="0 0 ${W} 84" preserveAspectRatio="none" aria-hidden="true"><rect x="10" y="18" width="${W-20}" height="34" fill="#F1E8D2"/>`;
  for(let s=0;s<=12;s++) h+=`<rect x="${x(60+s)-1.5}" y="18" width="3" height="34" fill="#16132A"/>`;
  for(let s=0;s<12;s++) h+=`<rect x="${x(60.5+s)-.5}" y="18" width="1" height="34" fill="#16132A" opacity=".35"/>`;
  ["C","D","E","F","G","A","B","C"].forEach((l,i)=>{ const m=60+[0,2,4,5,7,9,11,12][i]; h+=`<text x="${x(m)}" y="66" text-anchor="middle" class="frlbl">${l}</text>`; });
  // the reference labelled above the fretboard, the test below it, so the two never collide
  marks.forEach((mk,k)=>{ const m=60+((mk.m-60)%12+12)%12; h+=`<circle cx="${x(m)}" cy="35" r="11" fill="${mk.c}" stroke="#16132A" stroke-width="3"/>${mk.t?`<text x="${x(m)}" y="${mk.below?81:12}" text-anchor="middle" class="frtag">${mk.t}</text>`:""}`; });
  el.innerHTML=h+"</svg>";
}
// The notes on a treble staff, spelled the way the questions are: a natural letter, or a letter with
// a quarter-tone accidental (Stein–Zimmermann: the half-sharp is a sharp with one upright, the
// half-flat a flat turned round). notes: [{m, c}], m a MIDI pitch that may end in .5.
const FR_LETTERS=[["C",0],["D",2],["E",4],["F",5],["G",7],["A",9],["B",11]];
// Spelled from a letter where there is one: a note is its letter and whatever accidental reaches the
// pitch, so the minor third above F is A-flat (two letters up), not G-sharp, and a quarter-tone below
// C is C half-flat, not B half-sharp. With no letter to go by (a harp string plucked while exploring),
// the nearest natural, then a quarter-tone from one, then a sharp or a flat as the modifier leans.
function frSpell(m, li=null, flat=frFlatLean()){
  if(li!=null){ const nat=FR_LETTERS[li][1], oct=Math.round((m-nat)/12)-1; return {li, oct, acc:m-(12*(oct+1)+nat)}; }
  const tryLetter=(pc,acc)=>{ const k=FR_LETTERS.findIndex(([,p])=>p===((pc%12)+12)%12); return k<0 ? null : frSpell(m, k); };
  const pc=((m%12)+12)%12;
  return tryLetter(pc,0) || (flat ? tryLetter(pc+.5)||tryLetter(pc-.5) : tryLetter(pc-.5)||tryLetter(pc+.5))
      || (flat ? tryLetter(pc+1) : tryLetter(pc-1));
}
// flats when the modifier flattens, sharps when it sharpens
const frFlatLean=()=> typeof mc!=="undefined" && mc.params && mc.params[31]===1;
const frFifths=()=> frFlatLean() ? -1 : 1;
function frDrawStaff(notes=[]){
  const el=blast && blast.stageEl && blast.stageEl.querySelector(".frstaff"); if(!el) return;
  const SPc=7, top=12, y=(li,oct)=>top+4*SPc-((li+7*oct)-(2+7*4))*SPc/2;      // E4 on the bottom line
  const W=Math.max(170, 70+notes.length*44);
  let h=`<svg viewBox="0 0 ${W} 58" aria-hidden="true">`;
  for(let k=0;k<5;k++) h+=`<line x1="4" x2="${W-4}" y1="${top+k*SPc}" y2="${top+k*SPc}"/>`;
  h+=`<text class="glyph" x="8" y="${top+3*SPc}">\uE050</text>`;
  notes.forEach((n,i)=>{ const sp=frSpell(n.m, n.li), yy=y(sp.li,sp.oct), x=58+i*44;
    if(sp.li+7*sp.oct<=7*4+0) h+=`<line x1="${x-8}" x2="${x+16}" y1="${top+5*SPc}" y2="${top+5*SPc}"/>`;   // middle C's ledger line
    const acc = sp.acc===.5 ? "\uE282" : sp.acc===-.5 ? "\uE280" : sp.acc===1 ? "\uE262" : sp.acc===-1 ? "\uE260" : "";
    if(acc) h+=`<text class="glyph acc" x="${x-15}" y="${yy}" style="fill:${n.c}">${acc}</text>`;
    h+=`<text class="glyph" x="${x}" y="${yy}" style="fill:${n.c}">\uE0A2</text>`; });
  el.innerHTML=h+"</svg>";
}
const FRMENU_G={key:"frets", title:"BETWEEN THE FRETS",
  rules:()=>`<p>A NOTE PLAYS, THEN ANOTHER: THE SAME, A QUARTER-TONE SHARP, OR A QUARTER-TONE FLAT?</p><p>ANSWER ON ANY COLUMN: MAJOR ROW SHARP, MINOR ROW IN TUNE, 7 ROW FLAT. PLUCK THE HARP TO HEAR IT AGAIN.</p><p>THEN FIND THE NOTE IN BETWEEN: HERE THE MODIFIER MEANS A QUARTER-TONE.</p><p>${frInstrument() ? "YOUR MINICHORD PLAYS THE QUARTER-TONES ITSELF, IN 24-EDO." : "THE PAGE PLAYS THEM; FIRMWARE 18 LETS THE MINICHORD PLAY THEM ITSELF."}</p>`,
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
const frOk=(letter,dir)=> blast && blast.instrument ? true : dir>0 ? FR_SHARPABLE.includes(letter) : dir<0 ? FR_FLATTABLE.includes(letter) : true;
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
  frSay(say); frDrawBoard(q.show.ref!=null ? [{m:q.show.ref, c:"#F1E8D2", t:"REF"}] : []); frDrawStaff(frStaffNotes(q, false));
  frHarpRank(q);
  if(frHarpAnswers(q)) blast.stageEl.querySelector(".frrows").insertAdjacentHTML("beforeend", `<span class="harp">OR PLUCK IT ON THE HARP</span>`);
  const len=frPlay(q); q.at=performance.now()+len; q.limit=(L.fast?6000:9000)*speedMul()*(frHarpAnswers(q)?1.5:1);   // finding it on the harp takes a little longer
}
// On firmware 18 the harp can answer a note, an interval's top note or a riff's bent note: pluck the
// test note itself, on the chromatic harp in 24-EDO. Each harp rank there is half an octave of
// quarter-tones, so the game sets the rank that holds the answer; which of its strings is the
// player's to find, by ear.
const frHarpAnswers=q=> !!(blast && blast.instrument && q && ["note","interval","riff"].includes(q.kind));
function frHarpRank(q){ if(!frHarpAnswers(q) || !hasSetting(116)) return; const step=Math.round(mod(q.show.test,12)*2); borrow(116, step<12 ? 1 : 2); }
function frReplay(){ if(blast && blast.kind==="frets" && blast.phase==="play" && blast.q && blast.q.step==="answer"){ const len=frPlay(blast.q); blast.q.at=performance.now()+len; } }
document.addEventListener("keydown", e=>{ if(blast && blast.kind==="frets" && e.code==="KeyR" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")){ e.preventDefault(); frReplay(); } });
function frSay(t){ const p=blast.stageEl && blast.stageEl.querySelector(".frprompt"); if(p) p.textContent=t; }
function frTick(now){
  if(!blast || blast.kind!=="frets") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  const q=blast.q;
  if(blast.phase==="play" && q && q.at){
    const left=Math.max(0,1-(now-q.at)/q.limit), bar=blast.stageEl.querySelector(".frtime i"); if(bar) bar.style.transform=`scaleX(${now<q.at?1:left})`;
    if(now>q.at && left<=0){ if(q.step==="answer") frWrong("TOO SLOW"); else frFound(false); }
  }
  blast.raf=requestAnimationFrame(frTick);
}
// ---------- hearing yourself ----------
// With the minichord's speaker off (page mode) the page sounds what's held on the chord buttons, for as
// long as it's held, retuned: a black-key note is the modifier, so it sounds a quarter-tone from its
// letter, up if the modifier sharpens and down if it flattens. Holding a chord and tapping the modifier
// wobbles between the note and the one between the frets, which is what everyone does first.
const frHeld=new Map();
function frEcho(){
  if(!blast || blast.kind!=="frets" || blast.instrument || !settings.sounds || !piano.ctx || blast.phase==="menu") return frSilence();
  const ctx=piano.ctx, sharpens=(mc.params[31]??0)!==1, want=new Map();
  for(const v of mc.voices){ const n=v.note ?? Math.round(v.pitch), pc=((n%12)+12)%12, black=[1,3,6,8,10].includes(pc);
    want.set(`${v.ch}:${n}`, black ? n+(sharpens?-.5:.5) : n); }
  for(const [k,o] of frHeld) if(!want.has(k)){ try{ o.g.gain.setTargetAtTime(0,ctx.currentTime,.05); o.osc.stop(ctx.currentTime+.3); }catch(e){} frHeld.delete(k); }
  for(const [k,m] of want) if(!frHeld.has(k)){ try{
    const g=ctx.createGain(); g.gain.value=0; g.gain.setTargetAtTime(.07,ctx.currentTime,.01); g.connect(piano.out||ctx.destination);
    const osc=ctx.createOscillator(); osc.type="triangle"; osc.frequency.value=440*Math.pow(2,(m-69)/12); osc.connect(g); osc.start();
    frHeld.set(k,{osc,g}); }catch(e){} }
}
function frSilence(){ for(const [,o] of frHeld){ try{ o.osc.stop(); }catch(e){} } frHeld.clear(); }
mc.addEventListener("voices", frEcho);
// ---------- answers ----------
function fretsNote(){
  if(!blast || blast.kind!=="frets" || blast.phase!=="play" || !blast.q) return;
  const q=blast.q;
  if(frHarpAnswers(q) && (q.step==="answer" || q.step==="find") && mc.lastHarp && mc.lastHarp.pitch!=null){
    const at=mod(mc.lastHarp.pitch,12), want=mod(q.show.test,12), off=Math.min(Math.abs(at-want),12-Math.abs(at-want));
    if(off<.2){ if(q.step==="answer" && !q.off) frRight();                                // in tune: simply right
      else { if(q.step==="answer") frRight(true); frFound(true); } }                      // the note between the frets, found by ear
    else heard(frNoteName(at),false,"NOT THAT ONE: LISTEN AGAIN");                        // exploring costs nothing; the clock runs
    return;
  }
  if(q.step==="answer") frReplay();
}
const frNoteName=m=>{ const s=frSpell(m); return FR_LETTERS[s.li][0]+(s.acc===.5?" +¼":s.acc===-.5?" −¼":s.acc===1?"♯":s.acc===-1?"♭":""); };
function fretsChord(voices){
  if(!blast || blast.kind!=="frets") return;
  if(blast.phase==="demo" && blast.demo){ endFrDemo(blast.demo); return; }
  const q=blast.q; if(blast.phase!=="play" || !q || performance.now()<q.at-400) return;
  const pitches=voices.map(v=>v.note ?? Math.round(v.pitch)), id=chordId(pitches); if(!id) return;   // named from the note numbers; bends are the quarter-tones
  const row = ["","6"].includes(id.quality) ? 0 : ["m","m6"].includes(id.quality) ? 1 : id.quality==="7" ? 2 : -1;
  if(q.step==="find"){
    if(blast.instrument){                                                         // the minichord's own quarter-tone: the root voice's exact pitch
      const rv=voices.find(v=>mod(v.note ?? Math.round(v.pitch),12)===id.root), at=rv ? mod(rv.pitch,12) : -1, want=mod(FR_NAT[q.letter]+q.off/100,12);
      if(rv && Math.min(Math.abs(at-want), 12-Math.abs(at-want))<.2) frFound(true); else { heard(chordName(pitches,frFifths()),false,`${q.letter} AND THE MODIFIER`); sfx("miss"); }
      return;
    }
    const want=(FR_NAT[q.letter]+Math.sign(q.off)+12)%12;
    if(id.root===want) frFound(true); else { heard((frFlatLean()?FLAT_NAMES:SHARP_NAMES)[id.root],false,`${q.letter} AND THE MODIFIER`); sfx("miss"); }
    return;
  }
  const said = q.kind==="riff" ? "FCGD".indexOf(SHARP_NAMES[id.root]) : row;
  if(said<0){ heard(chordName(pitches,frFifths()),false, q.kind==="riff"?"THE F, C, G OR D COLUMN":"THE MAJOR, MINOR OR 7 ROW"); return; }
  if(said===q.answer) frRight(); else frWrong("NOT QUITE", q.kind==="riff" ? `NOTE ${said+1}` : FR_ROWS[q.kind][said]);
}
function frRight(byHarp){
  const q=blast.q, pts=mulPts(20*(blast.level+1)); blast.score+=pts; blast.right++; stats.streak=blast.right; scoreboard(); frBar();
  if(byHarp){ frReveal(q); q.step="find"; return; }                                        // found on the harp: the find follows at once
  sfx("tick"); heard(q.kind==="riff"?`NOTE ${q.idx+1}`:(FR_ROWS[q.kind]||[])[q.answer]||"",true);
  frReveal(q);
  const find = q.off!==0 && q.kind!=="neutral";
  if(find){ q.step="find"; q.at=performance.now(); if(canWrite() && hasSetting(31)) borrow(31, q.off>0?0:1);   // the modifier's way, for this one
    frSay(`RIGHT! NOW PLAY IT: ${q.letter} ${q.off>0?"HALF-SHARP":"HALF-FLAT"}, ${q.letter} AND THE MODIFIER`); return; }
  frNext();
}
function frFound(ok){
  const q=blast.q;
  if(ok){ const pts=mulPts(30*(blast.level+1)); blast.score+=pts; frBar(); heard(`${q.letter}${q.off>0?" +¼":" −¼"}`,true); sfx("right");
    if(!blast.instrument && settings.sounds && piano.ctx) piano.play([60+FR_NAT[q.letter]+q.off/100],{when:.02,dur:.9});   // the note in between (the minichord played it itself, in 24-EDO)
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
function frReveal(q){
  if(q.show.test!=null) frDrawBoard([...(q.show.ref!=null?[{m:q.show.ref, c:"#F1E8D2", t:"REF"}]:[]), {m:q.show.test, c:"#FF5AA0", below:true, t:q.off>0?"+¼":q.off<0?"−¼":q.kind==="neutral"?["MAJ","MIN","NEUTRAL"][q.answer]:"SAME"}]);
  frDrawStaff(frStaffNotes(q, true));
}
// what the staff shows: the reference always; the test once answered, in pink
function frStaffNotes(q, reveal){
  const L=FR_LETTERS.findIndex(([n])=>n===q.letter);
  if(q.kind==="neutral"){ const r=q.ref[0][0], third=(L+2)%7, fifth=(L+4)%7;       // a third is two letters up, a fifth four
    return reveal ? [{m:r,c:"#F1E8D2",li:L},{m:r+[4,3,3.5][q.answer],c:"#FF5AA0",li:third},{m:r+7,c:"#F1E8D2",li:fifth}] : [{m:r,c:"#F1E8D2",li:L},{m:r+7,c:"#F1E8D2",li:fifth}]; }
  if(q.kind==="riff") return q.ref.map((n,i)=>{ const bent=reveal && i===q.idx; return {m: bent ? q.test[i][0] : n[0], c: bent ? "#FF5AA0" : "#F1E8D2", li: FR_LETTERS.findIndex(([nm])=>nm===q.riff[i])}; });
  const ref=q.show.ref;
  return reveal ? [{m:ref,c:"#F1E8D2"},{m:q.show.test,c:"#FF5AA0",li:q.off?L:null}] : [{m:ref,c:"#F1E8D2"}];
}
function frNext(ms=1400){
  blast.q.step="done"; blast.q.at=0;
  if(blast.right && blast.right%6===0 && blast.level<FR_LEVELS.length-1 && blast.lives>0){ blast.level++; banner(`LEVEL ${blast.level+1}`, FR_LEVELS[blast.level].n.toUpperCase()); sfx("level"); frBar(); ms+=1200; }
  gameLater(()=>{ if(blast && blast.phase==="play") frAsk(); }, ms);
}
// the band, in pixels: a double-necked guitarist and a drummer, in polka dots with big round heads
const FR_DOTS=(x,y,w,h)=>{ let s=""; for(let j=y+1;j<y+h;j+=3) for(let i=x+((j-y)%6?1:2);i<x+w;i+=3) s+=`<rect x="${i}" y="${j}" width="1" height="1"/>`; return s; };
// the guitarist: a triangle head, point up, and a double neck with a soundhole and frets; the drummer:
// a tall rectangle head, sticks in hand, behind a hi-hat, a snare and a bass drum
const FR_GUITARIST=`<svg viewBox="0 0 26 38" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#F1E8D2" d="M13 0L22 14H4Z"/><g fill="#16132A">${FR_DOTS(7,6,12,8)}</g>
  <rect x="8" y="15" width="10" height="13" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(8,15,10,13)}</g>
  <rect x="9" y="28" width="3" height="10" fill="#F1E8D2"/><rect x="14" y="28" width="3" height="10" fill="#F1E8D2"/>
  <rect x="0" y="18" width="24" height="2" fill="#16132A"/><rect x="0" y="23" width="24" height="2" fill="#16132A"/>
  <rect x="17" y="17" width="7" height="10" fill="#16132A"/>
  <rect x="19" y="20" width="3" height="3" fill="#C9C0A8"/>
  <rect x="3" y="18" width="1" height="2" fill="#9A93B5"/><rect x="7" y="18" width="1" height="2" fill="#9A93B5"/><rect x="11" y="18" width="1" height="2" fill="#9A93B5"/>
  <rect x="3" y="23" width="1" height="2" fill="#9A93B5"/><rect x="7" y="23" width="1" height="2" fill="#9A93B5"/><rect x="11" y="23" width="1" height="2" fill="#9A93B5"/>
  <rect x="14" y="22" width="2" height="4" fill="#E8B48A"/>
  <rect x="0" y="17" width="2" height="9" fill="#FF5AA0"/>
</svg>`;
const FR_DRUMMER=`<svg viewBox="0 0 40 38" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="15" y="0" width="8" height="15" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(15,0,8,15)}</g>
  <rect x="16" y="10" width="2" height="2" fill="#16132A"/><rect x="20" y="10" width="2" height="2" fill="#16132A"/>
  <rect x="14" y="16" width="10" height="9" fill="#F1E8D2"/><g fill="#16132A">${FR_DOTS(14,16,10,9)}</g>
  <rect x="7" y="17" width="7" height="2" fill="#F1E8D2"/><rect x="24" y="19" width="8" height="2" fill="#F1E8D2"/>
  <rect x="4" y="14" width="1" height="1" fill="#C9A06A"/><rect x="5" y="15" width="1" height="1" fill="#C9A06A"/><rect x="6" y="16" width="1" height="1" fill="#C9A06A"/>
  <rect x="32" y="17" width="1" height="1" fill="#C9A06A"/><rect x="33" y="18" width="1" height="1" fill="#C9A06A"/><rect x="31" y="16" width="1" height="1" fill="#C9A06A"/>
  <rect x="0" y="13" width="10" height="2" fill="#FFD35A"/><rect x="1" y="16" width="8" height="1" fill="#FFD35A"/><rect x="4" y="15" width="2" height="23" fill="#9A93B5"/>
  <rect x="28" y="22" width="11" height="5" fill="#F1E8D2"/><rect x="28" y="22" width="11" height="1" fill="#FF5AA0"/><rect x="33" y="27" width="1" height="11" fill="#9A93B5"/>
  <circle cx="19" cy="31" r="7" fill="#16132A" stroke="#F1E8D2" stroke-width="2"/><circle cx="19" cy="31" r="2" fill="#FF5AA0"/>
  <rect x="12" y="37" width="14" height="1" fill="#F1E8D2"/>
</svg>`;

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
      say("LISTEN","AN A, THEN ANOTHER. THE SECOND IS A LITTLE HIGH: BETWEEN A AND B♭."); frDrawBoard([{m:69,c:"#F1E8D2",t:"REF"}]); frDrawStaff(frStaffNotes(q,false)); frPlay(q); await step(3200);
      say("ANSWER","ANY COLUMN: THE MAJOR ROW FOR SHARP. THE FRETBOARD AND THE STAFF SHOW WHERE IT SITS: A HALF-SHARP."); await step(1600); helpChord("A",""); await step(800); frReveal(q); sfx("key"); await step(2600); helpChord(null);
      say("FIND IT","HERE THE MODIFIER MEANS A QUARTER-TONE: A AND THE MODIFIER PLAYS A HALF-SHARP."); await step(2400);
      helpChord("A",""); helpMod(true); demoPlay([69.5]); sfx("right"); await step(2400);
      say("HEAR THE WOBBLE","HOLD A CHORD AND TAP THE MODIFIER ON AND OFF: THE NOTE, THEN THE ONE BETWEEN THE FRETS.");
      helpChord("A","");
      for(const m of [69,69.5,69,69.5]){ helpMod(m%1!==0); demoPlay([m]); await step(700); } await step(900); helpMod(false); helpChord(null);
      say("ON THE HARP","ON FIRMWARE 18 THE MINICHORD PLAYS THEM ITSELF, IN 24-EDO: PLUCK THE NOTE BETWEEN THE FRETS ON THE HARP."); await step(3600);
      say("READY?","LEVELS GO FROM NOTES TO INTERVALS, THE NEUTRAL THIRD, AND RIFFS THAT BEND."); sfx("level"); await step(2800);
      endFrDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endFrDemo(token){
  if(!blast || blast.demo!==token) return;
  frDrawStaff();
  stopDemo(); blast.phase="menu"; frDrawBoard(); frSay(""); const r=blast.stageEl&&blast.stageEl.querySelector(".frrows"); if(r) r.innerHTML="";
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
