// Fux: Two Ships, the counterpoint written on the harp. Part of Fux (arcade/games/fux.js), and of
// Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the others as
// plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Two Ships ----------
// Fux's own exercise, played: the game sings one of his cantus firmi, and you write the counterpoint
// on the harp, a note at a time. The cantus is the blue ship, flying its fixed course; yours is the
// gold one. Pluck a string and your ship moves to that note, the line between the two ships taking the
// interval's colour (perfect gold, imperfect green, dissonant red); pluck another to change your mind,
// and press any chord button (or Enter, or tap the field) to commit it. Then the cantus moves on.
//
// What's committed is judged at once, by the same checker Patrol uses. Something forbidden outright
// (a dissonance, parallel fifths, a wrong start) is a crash: it costs a life and the note comes back
// to be written again. A fault (a hidden fifth, an unrecovered leap) leaves you off balance: it stands,
// but the combo goes. Contrary motion builds the combo. Land the cadence (a sixth to the octave, a
// third to the unison, the leading tone raised where the mode needs it, which the game does for you on
// the strings) and the ships dock; then Aloysius reviews the whole line, and his approval is the score.
//
// With HELP on, the line's colour shows as you choose, and a crash coming is warned of before you
// commit (LOCK-ON); with it off, only your ears. In the second species there are two notes a bar.
//
// The harp is tuned for each cantus: the mode's notes from the lowest string up (the custom scale on
// the key, harp mode 10), the window placed above the cantus or below it, sounding in its register by
// the harp octave (99). At the cadence the mode's seventh is raised on the strings for that note, a
// bit of the scale swapped so no string moves. A string is known by its place, from the note it sends.

const SH_ROUNDS=2;                                                  // cantus firmi a level
const shCanTune=()=> !canWrite() || !!mc.virtual || (hasSetting(236) && (mc.params[7]??0)>9);
// the strings' notes for this cantus, the seventh raised on them for the cadence's note
function shWindow(s, ficta){ return s.window.map(p=>ficta && s.mode.ficta!=null && mod(p-s.mode.final,12)===s.mode.ficta ? p+1 : p); }
// the notes to be written, in order: bar and beat (two a bar in the second species, one in the last)
function shSlots(s){ const out=[]; s.cantus.forEach((c,b)=>{ const n=s.species===2 && b<s.cantus.length-1 ? 2 : 1; for(let j=0;j<n;j++) out.push({bar:b, beat:j}); }); return out; }
const shCadence=(s, at)=>{ const sl=s.slots[at]; return !!sl && sl.bar===s.cantus.length-2 && s.slots[at+1] && s.slots[at+1].bar===s.cantus.length-1; };
// the counterpoint so far, as the checker takes it
function shShape(s, flat){ const cp=[]; flat.forEach((p,i)=>{ const sl=s.slots[i]; if(s.species===1) cp[sl.bar]=p; else (cp[sl.bar]||(cp[sl.bar]=[])).push(p); }); return cp; }
const shCheck=(s, flat)=>CP.check({cantus:s.cantus, cp:shShape(s,flat), mode:s.mode, species:s.species, above:s.above});
const shKey=f=>`${f.rule}:${f.bar}:${f.beat}`;
// a finding's name, with the bar's own notes (so a hidden fifth is told from a hidden octave)
function shName(s, f, flat){ const ps=shShape(s, flat)[f.bar]; return fuName(f, {c:s.cantus[f.bar], p: ps==null ? [] : Array.isArray(ps) ? ps : [ps]}); }

// ---------- the harp, tuned to the window ----------
// The key is the lowest string's note, the custom scale the mode's notes from there, and the harp
// octave puts the sound where the window is: the firmware sends the lowest string as middle C's
// octave (60 up) and transposes only upward, so a window lower than that sounds an octave down instead.
function shTune(s, ficta){
  const w=shWindow(s, ficta), r=mod(w[0],12);
  s.dev=w.map(p=>p-w[0]+60+r);                                     // what each string sends
  if(!canWrite()) return;
  const mask=w.reduce((m,p)=>m|(1<<mod(p-r,12)),0);
  const f=[0,1,2,3,4,5,-1,-2,-3,-4,-5,6].find(x=>mod(x*7,12)===r);
  borrow(98,0); if(hasSetting(30)) ensure(30,0);
  borrow(35, keyIndexOf(f)); borrow(236, mask);
  if(hasSetting(99)) borrow(99, Math.max(0, Math.min(4, 1+Math.round((w[0]-(60+r))/12))));
  borrow(36,10);                                                    // last: writing the harp mode retunes the strings
}
// which string a pluck was: told outright by the virtual minichord, found by its note from a real one
function shString(d){
  const s=blast.ship; if(!d || !s) return -1;
  if(d.string!=null) return d.string;
  const i=(s.dev||[]).indexOf(d.note);
  return i>=0 ? i : (d.note>=60 && d.note<72 && !canWrite() ? d.note-60 : -1);
}

// ---------- a round ----------
function shStart(){
  const L=fuLevel();
  let pick=null;
  for(let t=0; t<CP.CANTUS.length*2 && !pick; t++){
    const ci=fuDeal("ships", CP.CANTUS.map((_,k)=>k)), above=!L.below;
    const clean=fuClean(ci, L.species, above);                     // a cantus this can be written to (two notes in the penultimate bar)
    if(clean && (L.species===1 || clean[clean.length-2].length===2)) pick={ci, above};
  }
  if(!pick){ banner("ALOYSIUS IS THINKING", "ONE MOMENT"); gameLater(()=>shStart(), 1500); return; }
  const c=CP.CANTUS[pick.ci], mode=CP.MODES[c.mode];
  const s={ci:pick.ci, cantus:c.cantus, mode, modeName:c.mode, above:pick.above, species:L.species,
    window:CP.harpWindow(mode, c.cantus, pick.above), at:0, flat:[], pick:null, combo:1, faults:0, crashes:0, contrary:0, view:0, done:false};
  s.slots=shSlots(s);
  blast.ship=s; blast.lineNo++;
  // the ladder spans the cantus and the strings
  const pos=s.window.concat(s.cantus).map(p=>CP.degree(mode,p).pos);
  blast.line={mode, modeName:c.mode, cantus:c.cantus, species:L.species, above:pick.above, lo:Math.min(...pos), hi:Math.max(...pos), ships:true, done:false};
  fuClearBars(); fuLayout();
  blast.bars=s.cantus.map((cn,i)=>{ const el=document.createElement("div"); el.className="fubar ship"; blast.field.appendChild(el); return {i, c:cn, p:[], el, bad:[], x:0}; });
  shTune(s, false);
  fuLadder(); fuSign(); shDrawAll(); fuBar();
  banner(`CANTUS ${blast.lineNo} OF ${SH_ROUNDS}`, `${c.mode.toUpperCase()} · YOUR LINE ${pick.above?"ABOVE":"BELOW"} IT`);
  // the cantus, sung through once first, as a singer would hear it before writing against it
  const per=.5; s.cantus.forEach((n,i)=>gameLater(()=>{ if(blast.ship===s) fuPiano([n], per*.95, 72); }, 1600+i*per*1000));
  gameLater(()=>{ if(blast.ship!==s) return; s.ready=true; shBegin(s); }, 1900+s.cantus.length*per*1000);
}
function shBegin(s){
  fuSay(s.species===2 ? "Two notes to each of mine. Begin on a perfect consonance." : "Begin on a perfect consonance. Then move against me.");
  shNow(s);
}
// the note to write now: the cantus sounds, and at the cadence the strings take the raised seventh
function shNow(s){
  const sl=s.slots[s.at];
  if(sl.beat===0) fuPiano([s.cantus[sl.bar]], 1.2, 72);
  const ficta=shCadence(s, s.at) && s.mode.ficta!=null;
  if(ficta!==!!s.ficta){ s.ficta=ficta; shTune(s, ficta);
    if(ficta){ heard(`${SHARP_NAMES[mod(s.mode.final+s.mode.ficta+1,12)]} ON THE HARP`, true, ""); fuSay("The cadence. I've raised the leading tone on your strings for it."); } }
  s.pick=null; s.lock=null; shDrawAll(); fuBar();
}
// the page's piano for a note or two (the cantus; the whole line at the end)
function fuPiano(notes, dur, vel=80, when=.02){
  if(!settings.sounds || !piano.ctx) return;
  const go=()=>piano.play(notes,{when, dur, vel});
  piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{});
  heardAt=performance.now();
}

// ---------- choosing, and committing ----------
function shPluck(d){
  const s=blast.ship; if(!s || !s.ready || s.done) return;
  const i=shString(d); if(i<0 || i>11){ heard("?", false, "NOT ONE OF THE STRINGS"); return; }
  const p=shWindow(s, s.ficta)[i];
  s.pick=p;
  // what committing it would bring: a crash coming is warned of, with help on
  const now=shCheck(s, s.flat.concat(p)), had=new Set(shCheck(s, s.flat).map(shKey));
  const fresh=now.filter(f=>!had.has(shKey(f)));
  const crash=fresh.find(f=>f.severity==="fatal");
  s.lock = crash && fuShowIv() ? crash : null;
  const I=CP.interval(s.mode, s.cantus[s.slots[s.at].bar], p);
  heard(`${SHARP_NAMES[mod(p,12)]} · ${I.name}`, !s.lock, s.lock ? `LOCK-ON: ${shName(s, crash, s.flat.concat(p))}` : "");
  if(s.lock) sfx("lock");
  shDrawAll();
}
function shCommit(){
  const s=blast.ship; if(!s || !s.ready || s.done) return;
  if(s.pick==null){ heard("COMMIT", false, "PLUCK A STRING FIRST"); return; }
  const flat=s.flat.concat(s.pick), now=shCheck(s, flat), had=new Set(shCheck(s, s.flat).map(shKey));
  const fresh=now.filter(f=>!had.has(shKey(f)));
  const crash=fresh.filter(f=>f.severity==="fatal");
  const sl=s.slots[s.at], x=fuShipX(), y=fuYOf(s.pick);
  if(crash.length){
    // a crash: the note (and any it depends on: the cadence's sixth, a dissonance that didn't pass) back
    const f=crash[0], back=Math.min(...crash.map(c=>s.slots.findIndex(q=>q.bar===c.bar && q.beat===(c.beat||0))).filter(i=>i>=0), s.at);
    s.crashes++; s.combo=1; blast.lives--;
    explode(x, y, 22, ["#FF4B3E","#FFD35A","#FFF4C2"]); sfx("crash"); buzz(blast.field,true);
    const name=shName(s, f, flat);
    heard(name, false, "CRASH");
    fuSay(FU_SAYS[f.rule] ? FU_SAYS[f.rule][1] : name, 4200);
    fuBar();
    if(blast.lives<=0){ s.done=true; gameLater(()=>fuOver(), 1600); return; }
    s.flat.length=back; s.at=back; shNow(s);
    return;
  }
  // it stands: faults put you off balance, contrary motion builds the combo
  const faults=fresh.filter(f=>f.severity==="fault"), contrary=fresh.some(f=>f.rule==="contrary");
  s.flat=flat;
  if(faults.length){ s.faults+=faults.length; s.combo=1; sfx("miss"); heard(shName(s, faults[0], flat), false, "OFF BALANCE");
    fuSay(FU_SAYS[faults[0].rule] ? FU_SAYS[faults[0].rule][0] : shName(s, faults[0], flat)); }
  else if(contrary){ s.contrary++; s.combo=Math.min(4, s.combo+1); sfx("hit"); heard(`CONTRARY MOTION`, true, ""); }
  else sfx("shoot");
  const pts=mulPts(10*s.combo*(blast.level+1)); blast.score+=pts; scoreboard(); fuBar();
  popup(x, y-24, `+${pts}${s.combo>1?` ×${s.combo}`:""}`);
  s.at++;
  if(s.at>=s.slots.length) return shDock(s);
  shNow(s);
}

// ---------- docking, and the review ----------
const SH_VERDICTS=[[90,"BENE!","Bene. Fux himself would sign it."],[70,"GOOD","Good. A few things to mend, but it sings."],[50,"ACCEPTABLE","Acceptable. Sing it to yourself and you'll hear where it limps."],[0,"AGAIN","No. Again, and listen to every interval."]];
function shDock(s){
  s.done=true; s.pick=null; shDrawAll();
  const all=shCheck(s, s.flat), style=all.filter(f=>f.severity==="style");
  const approval=Math.max(0, Math.min(100, 100-15*s.crashes-10*s.faults-4*style.length+2*s.contrary));
  const [,word,say]=SH_VERDICTS.find(v=>approval>=v[0]);
  sfx("dock"); explode(fuShipX(), fuYOf(s.flat[s.flat.length-1]), 18, ["#FFD35A","#7FB2FF","#FFF4C2"]);
  // the whole line, both voices, as it was written
  const per=.55; s.cantus.forEach((c,b)=>{ const ps=shShape(s,s.flat)[b]; const notes=Array.isArray(ps)?ps:[ps];
    fuPiano([c], per*.95, 66, .3+b*per); notes.forEach((p,j)=>fuPiano([p], per/notes.length*.95, 80, .3+b*per+j*per/notes.length)); });
  const pass=approval>=50, bonus=pass ? mulPts(3*approval*(blast.level+1)) : 0;
  blast.score+=bonus; scoreboard();
  const notes=all.filter(f=>CP.forbidden(f) || f.severity==="style").slice(0,4).map(f=>`<li>BAR ${f.bar+1}: ${shName(s, f, s.flat)}</li>`).join("");
  const el=document.createElement("div"); el.className="fureview";
  el.innerHTML=`<b class="${pass?"":"no"}">${word}</b><span>APPROVAL ${approval}${bonus?` · +${bonus}`:""}</span><em>${say}</em>${notes?`<ul>${notes}</ul>`:""}`;
  blast.field.appendChild(el); s.reviewEl=el;
  fuSay(say, 6000); fuBar();
  gameLater(()=>{ el.remove();
    if(!pass){ blast.lives--; fuBar(); buzz(blast.field,true); if(blast.lives<=0){ fuOver(); return; } blast.lineNo--; banner("AGAIN", "A NEW CANTUS"); gameLater(()=>shStart(), 2000); return; }
    if(blast.lineNo>=SH_ROUNDS){ blast.level++; blast.lineNo=0; sfx("level"); banner(`LEVEL ${blast.level+1}`, blast.level<FU_LEVELS.length ? fuLevel().n.toUpperCase() : "FASTER!"); fuBar(); gameLater(()=>fuLineStart(), 2600); return; }
    shStart();
  }, 6500);
}

// ---------- drawing ----------
// the bars sit along the ladder, the one being written at the ships' place, those written to its left
// and the cantus still to come, faint, to its right
const fuShipX=()=> blast.L ? blast.L.W*.4 : 300;
function shDrawAll(){ const s=blast.ship; if(!s || !blast.bars) return; blast.bars.forEach(b=>shBarDraw(s,b)); }
function shBarDraw(s, b){
  const L=blast.L, w=L.barW, cur=s.slots[Math.min(s.at, s.slots.length-1)].bar;
  const shape=shShape(s, s.flat), have=shape[b.i]==null ? [] : Array.isArray(shape[b.i]) ? shape[b.i].slice() : [shape[b.i]];
  const now=!s.done && b.i===cur, n=s.species===2 && b.i<s.cantus.length-1 ? 2 : 1;
  if(now && s.pick!=null) have.push(s.pick);
  const cy=fuYOf(b.c), help=fuShowIv();
  let h=`<span class="funote c${now?" now":""}" style="left:0;top:${cy}px;width:${Math.round(w*.78)}px">${SHARP_NAMES[mod(b.c,12)]}</span>`;
  const ivs=[];
  have.forEach((p,j)=>{
    const dx = n>1 ? (j? 1 : -1)*w*.2 : 0, py=fuYOf(p), I=CP.interval(s.mode, b.c, p), tent=now && j===have.length-1 && s.pick!=null;
    ivs.push(I.number);
    const col = help ? ` ${I.class}` : "", lock = tent && s.lock ? " lock" : "";
    h+=`<span class="fubeam${col}${lock}" style="left:${dx}px;top:${Math.min(cy,py)}px;height:${Math.abs(cy-py)}px"></span>`;
    h+=`<span class="funote p${tent?" now":""}${lock}" style="left:${dx}px;top:${py}px;width:${Math.round(w*(n>1?.36:.6))}px">${SHARP_NAMES[mod(p,12)]}</span>`;
    if(tent && s.lock) h+=`<span class="futag" style="top:${Math.min(cy,py)-14}px;left:${dx}px">LOCK-ON · ${shName(s, s.lock, s.flat.concat(s.pick))}</span>`;
  });
  if(help && ivs.length) h+=`<span class="fuiv" style="top:${L.bottom+8}px">${ivs.join(" ")}</span>`;
  b.el.className=`fubar ship${b.i>cur && !s.done ? " future" : ""}${now?" now":""}`;
  b.el.innerHTML=h;
}
// the bars glide so the one being written stays at the ships' place
function shTick(dt){
  const s=blast.ship, L=blast.L; if(!s || !L) return;
  const cur=s.done ? s.cantus.length-1 : s.slots[s.at].bar;
  s.view+=(cur-s.view)*Math.min(1, dt*6);
  for(const b of blast.bars){ b.x=fuShipX()+(b.i-s.view)*L.barW; b.el.style.transform=`translateX(${Math.round(b.x)}px)`; b.el.hidden=b.x<-L.barW || b.x>L.W+L.barW; }
}
function shClear(){
  const s=blast && blast.ship; if(!s) return;
  if(s.reviewEl) s.reviewEl.remove();
  blast.ship=null;
}
// Enter or the space bar commits, as a chord button does
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="fux" || blast.phase!=="play" || !blast.ship || e.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(e.code==="Enter" || e.code==="Space" || e.code==="NumpadEnter"){ e.preventDefault(); shCommit(); }
});
