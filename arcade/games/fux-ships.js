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
// In the fourth, the counterpoint is syncopated: each note is struck on the upbeat and held over the
// bar line into the next. On the harp that's literal: pluck the note, and keep holding the string as
// you commit. Let go first and the tie breaks (the downbeat is yours to choose again, which Fux would
// rather you didn't). Held, it ties; and if the tied note now clashes with the cantus's next note
// it's a suspension: it glows, a clock runs, and you resolve it by plucking the string a step down,
// which commits by itself. Wrong, or too late, and it's a crash. Fux allows 7–6 and 4–3 above the
// cantus (9–8 grudgingly) and 2–3 below; LOCK-ON warns of one that can't resolve, or isn't allowed.
//
// The harp is tuned for each cantus: the mode's notes from the lowest string up (the custom scale on
// the key, harp mode 10), the window placed above the cantus or below it, sounding in its register by
// the harp octave (99). At the cadence the mode's seventh is raised on the strings for that note, a
// bit of the scale swapped so no string moves. A string is known by its place, from the note it sends.

const SH_ROUNDS=2;                                                  // cantus firmi a level
const shCanTune=()=> !canWrite() || !!mc.virtual || (hasSetting(236) && (mc.params[7]??0)>9);
// the strings' notes for this cantus, the seventh raised on them for the cadence's note
function shWindow(s, ficta){ return s.window.map(p=>ficta && s.mode.ficta!=null && mod(p-s.mode.final,12)===s.mode.ficta ? p+1 : p); }
// the notes to be written, in order: bar and beat (two a bar in the second species, one in the last;
// in the fourth, the upbeat after an opening rest, then the tie and the upbeat each bar, then the final)
function shSlots(s){
  const out=[], n=s.cantus.length;
  s.cantus.forEach((c,b)=>{
    if(s.species===4){ if(b===0) out.push({bar:0, beat:1}); else if(b<n-1) out.push({bar:b, beat:0, tie:true}, {bar:b, beat:1}); else out.push({bar:b, beat:0}); return; }
    const k=s.species===2 && b<n-1 ? 2 : 1; for(let j=0;j<k;j++) out.push({bar:b, beat:j});
  });
  return out;
}
const SH_SUSP=2.6;                                                   // seconds to resolve a suspension, at the Brisk speed
const shCadence=(s, at)=>{ const sl=s.slots[at]; return !!sl && sl.bar===s.cantus.length-2 && s.slots[at+1] && s.slots[at+1].bar===s.cantus.length-1; };
// the counterpoint so far, as the checker takes it
function shShape(s, flat){ const cp=[]; if(s.species===4 && flat.length) cp[0]=[null];             // the fourth species opens on a rest
  flat.forEach((p,i)=>{ const sl=s.slots[i]; if(s.species===1) cp[sl.bar]=p; else (cp[sl.bar]||(cp[sl.bar]=[])).push(p); }); return cp; }
const shCheck=(s, flat)=>CP.check({cantus:s.cantus, cp:shShape(s,flat), mode:s.mode, species:s.species, above:s.above});
const shKey=f=>`${f.rule}:${f.bar}:${f.beat}`;
// a finding's name, with the bar's own notes (so a hidden fifth is told from a hidden octave)
function shName(s, f, flat){ const ps=shShape(s, flat)[f.bar]; return fuName(f, {c:s.cantus[f.bar], p: ps==null ? [] : Array.isArray(ps) ? ps : [ps]}); }
// the string a step below a note, on the strings as they're tuned for that slot (null at the bottom)
function shBelow(s, p, at){ const w=shWindow(s, shCadence(s, at) && s.mode.ficta!=null).slice().sort((a,b)=>a-b); return w.filter(x=>x<p).pop() ?? null; }

// ---------- the harp, tuned to the window ----------
// The key is the lowest string's note, the custom scale the mode's notes from there, and the harp
// octave puts the sound where the window is: the firmware sends the lowest string as middle C's
// octave (60 up) and transposes only upward, so a window lower than that sounds an octave down instead.
function shTune(s, ficta){
  const w=shWindow(s, ficta), r=mod(w[0],12);
  s.dev=w.map(p=>p-w[0]+60+r);                                     // what each string sends
  if(!canWrite() || blast.phase==="demo") return;                  // the demo plays on the page alone
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
  blast.lineNo++;
  const s=shSetup(pick.ci, pick.above, L.species), c=CP.CANTUS[pick.ci];
  banner(`CANTUS ${blast.lineNo} OF ${SH_ROUNDS}`, `${c.mode.toUpperCase()} · YOUR LINE ${pick.above?"ABOVE":"BELOW"} IT`);
  // the cantus, sung through once first, as a singer would hear it before writing against it
  const per=.5; s.cantus.forEach((n,i)=>gameLater(()=>{ if(blast.ship===s) fuPiano([n], per*.95, 72); }, 1600+i*per*1000));
  gameLater(()=>{ if(blast.ship!==s) return; s.ready=true; shBegin(s); }, 1900+s.cantus.length*per*1000);
}
// a cantus onto the field, ready to be written against: its bars, the ladder, the harp tuned to it
function shSetup(ci, above, species){
  const c=CP.CANTUS[ci], mode=CP.MODES[c.mode];
  const s={ci, cantus:c.cantus, mode, modeName:c.mode, above, species,
    window:CP.harpWindow(mode, c.cantus, above), at:0, flat:[], pick:null, combo:1, faults:0, crashes:0, contrary:0, view:0, done:false};
  s.slots=shSlots(s);
  blast.ship=s;
  // the ladder spans the cantus and the strings
  const pos=s.window.concat(s.cantus).map(p=>CP.degree(mode,p).pos);
  blast.line={mode, modeName:c.mode, cantus:c.cantus, species, above, lo:Math.min(...pos), hi:Math.max(...pos), ships:true, done:false};
  fuClearBars(); fuLayout();
  blast.bars=s.cantus.map((cn,i)=>{ const el=document.createElement("div"); el.className="fubar ship"; blast.field.appendChild(el); return {i, c:cn, p:[], el, bad:[], x:0}; });
  shTune(s, false);
  fuLadder(); fuSign(); shDrawAll(); fuBar();
  return s;
}
function shBegin(s){
  fuSay(s.species===4 ? "Syncopation. Strike on the upbeat and hold the string over the bar line as you commit." : s.species===2 ? "Two notes to each of mine. Begin on a perfect consonance." : "Begin on a perfect consonance. Then move against me.");
  shNow(s);
}
// the note to write now: the cantus sounds, and at the cadence the strings take the raised seventh
function shNow(s){
  const sl=s.slots[s.at];
  if(sl.bar!==s.soundBar){ s.soundBar=sl.bar; fuPiano([s.cantus[sl.bar]], 1.2, 72); }
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
  s.pick=p; s.held=true; s.heldString=i;                          // held until the string's let go
  if(s.susp){ shCommit(); return; }                                // a suspension: the pluck is its resolution, at once
  // what committing it would bring: a crash coming is warned of, with help on; and in the fourth
  // species, what the tie would make of it, held into the next bar
  const ahead=[p], tie=s.slots[s.at+1] && s.slots[s.at+1].tie;
  if(tie) ahead.push(p);
  const now=shCheck(s, s.flat.concat(ahead)), had=new Set(shCheck(s, s.flat).map(shKey));
  const fresh=now.filter(f=>!had.has(shKey(f)));
  let crash=fresh.find(f=>f.severity==="fatal") || (tie && fresh.find(f=>f.rule==="suspension"));
  if(!crash && tie){                                               // a suspension coming: can it step down to a consonance?
    const nb=s.slots[s.at+1].bar, I=CP.interval(s.mode, s.cantus[nb], p);
    if(I.class==="dissonant"){ const r=shBelow(s, p, s.at+2); if(r==null || CP.interval(s.mode, s.cantus[nb], r).class==="dissonant") crash={rule:"resolution", bar:nb, beat:0}; }
  }
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
    const demo=blast.phase==="demo";
    s.crashes++; s.combo=1; if(!demo) blast.lives--;
    explode(x, y, 22, ["#FF4B3E","#FFD35A","#FFF4C2"]); sfx("crash"); buzz(blast.field,true);
    const name=shName(s, f, flat);
    heard(name, false, "CRASH");
    fuSay(FU_SAYS[f.rule] ? FU_SAYS[f.rule][1] : name, 4200, "appalled");
    fuBar();
    if(!demo && blast.lives<=0){ s.done=true; gameLater(()=>fuOver(), 1600); return; }
    if(s.susp){ s.pick=null; shDrawAll(); return; }                 // a wrong resolution: the suspension's still waiting, its clock running
    s.flat.length=back; s.at=back; s.susp=null; shNow(s);
    return;
  }
  // it stands: faults put you off balance, contrary motion builds the combo
  const faults=fresh.filter(f=>f.severity==="fault"), contrary=fresh.some(f=>f.rule==="contrary");
  s.flat=flat;
  if(faults.length){ s.faults+=faults.length; s.combo=1; sfx("miss"); heard(shName(s, faults[0], flat), false, "OFF BALANCE");
    fuSay(FU_SAYS[faults[0].rule] ? FU_SAYS[faults[0].rule][0] : shName(s, faults[0], flat)); }
  else if(fresh.some(f=>f.rule==="suspended")){ s.contrary++; s.combo=Math.min(4, s.combo+1); sfx("hit"); heard("RESOLVED", true, ""); if(s.contrary===1 || Math.random()<.25) fuSay(rnd(["Resolved, as it should be.","Down by step. Good.","Tension, then rest. That is a suspension."]), 2800, "pleased"); }
  else if(contrary){ s.contrary++; s.combo=Math.min(4, s.combo+1); sfx("hit"); heard(`CONTRARY MOTION`, true, ""); }
  else sfx("shoot");
  s.susp=null;
  const pts=blast.phase==="demo" ? 10*s.combo : mulPts(10*s.combo*(blast.level+1));
  if(blast.phase!=="demo"){ blast.score+=pts; scoreboard(); fuBar(); }
  popup(x, y-24, `+${pts}${s.combo>1?` ×${s.combo}`:""}`);
  s.at++;
  if(s.at>=s.slots.length) return shDock(s);
  if(s.slots[s.at].tie) return shTie(s);
  shNow(s);
}
// The bar line, in the fourth species: the string still held, the note ties over; let go, and the
// tie's broken, the downbeat to be chosen afresh. A tied note that clashes is a suspension.
function shTie(s){
  const p=s.flat[s.flat.length-1];
  if(!s.held){ heard("TIE BROKEN", false, "HOLD THE STRING OVER THE BAR LINE"); fuSay("You let go. Hold the string as you commit, and the note ties over."); shNow(s); return; }
  const flat=s.flat.concat(p), now=shCheck(s, flat), had=new Set(shCheck(s, s.flat).map(shKey));
  const fresh=now.filter(f=>!had.has(shKey(f)));
  s.flat=flat; s.at++;
  const bad=fresh.find(f=>f.rule==="suspension");
  if(bad){ s.faults++; s.combo=1; heard(shName(s, bad, flat), false, "OFF BALANCE"); fuSay(FU_SAYS.suspension[0]); }
  const I=CP.interval(s.mode, s.cantus[s.slots[s.at-1].bar], p);
  shNow(s);
  if(I.class==="dissonant"){
    const secs=SH_SUSP*speedMul()*(blast.phase==="demo" ? 1.6 : 1);
    s.susp={left:secs, total:secs, from:p, bar:s.slots[s.at].bar};
    const lo=CP.interval(s.mode, s.cantus[s.susp.bar], shBelow(s,p,s.at) ?? p);
    heard(`SUSPENSION ${s.above ? `${I.simple===2?9:I.simple}–${lo.simple===1?8:lo.simple}` : `${I.simple}–${lo.simple}`}`, true, "STEP DOWN");
    sfx("lock"); shDrawAll();
  }
}
// a suspension left too long: a crash, and its resolution made for you (or, if it had none, the note
// before it to choose again)
function shSuspLate(s){
  const r=shBelow(s, s.susp.from, s.at), ok=r!=null && CP.interval(s.mode, s.cantus[s.susp.bar], r).class!=="dissonant";
  s.crashes++; s.combo=1; if(blast.phase!=="demo") blast.lives--;
  sfx("crash"); buzz(blast.field,true); heard("TOO LATE", false, "THE SUSPENSION HUNG"); fuSay(FU_SAYS.resolution[1], 4200, "appalled"); fuBar();
  if(blast.phase!=="demo" && blast.lives<=0){ s.done=true; gameLater(()=>fuOver(), 1600); return; }
  if(ok){ s.susp=null; s.held=true; shCommitAs(s, r); return; }     // resolved for you, and held on, so the line goes on as it would have
  s.susp=null; s.flat.length=Math.max(0, s.at-2); s.at=s.flat.length; shNow(s);
}
// a note committed for the player (a hung suspension's resolution), scored as nothing
function shCommitAs(s, p){ s.flat=s.flat.concat(p); s.at++; if(s.at>=s.slots.length) return shDock(s); if(s.slots[s.at].tie) return shTie(s); shNow(s); }

// ---------- docking, and the review ----------
const SH_VERDICTS=[[90,"BENE!","Bene. Fux himself would sign it."],[70,"GOOD","Good. A few things to mend, but it sings."],[50,"ACCEPTABLE","Acceptable. Sing it to yourself and you'll hear where it limps."],[0,"AGAIN","No. Again, and listen to every interval."]];
function shDock(s){
  s.done=true; s.pick=null; shDrawAll();
  const all=shCheck(s, s.flat), style=all.filter(f=>f.severity==="style");
  const approval=Math.max(0, Math.min(100, 100-15*s.crashes-10*s.faults-4*style.length+2*s.contrary));
  const [,word,say]=SH_VERDICTS.find(v=>approval>=v[0]), mood = approval>=70 ? "pleased" : approval>=50 ? "neutral" : "appalled";
  sfx("dock"); explode(fuShipX(), fuYOf(s.flat[s.flat.length-1]), 18, ["#FFD35A","#7FB2FF","#FFF4C2"]);
  // the whole line, both voices, as it was written
  const per=.55, cp=shShape(s,s.flat);
  s.cantus.forEach((c,b)=>{ const notes=Array.isArray(cp[b])?cp[b]:[cp[b]], nx=Array.isArray(cp[b+1])?cp[b+1]:[cp[b+1]];
    fuPiano([c], per*.95, 66, .3+b*per);
    notes.forEach((p,j)=>{ if(p==null || (s.species===4 && j===0 && b>0 && p===(Array.isArray(cp[b-1])?cp[b-1].at(-1):cp[b-1]))) return;   // a rest, or still sounding from the tie
      const held = s.species===4 && j===notes.length-1 && nx[0]===p;
      fuPiano([p], per/notes.length*(held?1.95:.95), 80, .3+b*per+j*per/notes.length); }); });
  const demo=blast.phase==="demo", pass=approval>=50, bonus=pass && !demo ? mulPts(3*approval*(blast.level+1)) : 0;
  if(bonus){ blast.score+=bonus; scoreboard(); }
  const notes=all.filter(f=>CP.forbidden(f) || f.severity==="style").slice(0,4).map(f=>`<li>BAR ${f.bar+1}: ${shName(s, f, s.flat)}</li>`).join("");
  const el=document.createElement("div"); el.className="fureview";
  el.innerHTML=`<span class="fuport big">${fuFace(mood)}</span><b class="${pass?"":"no"}">${word}</b><span>APPROVAL ${approval}${bonus?` · +${bonus}`:""}</span><em>${say}</em>${notes?`<ul>${notes}</ul>`:""}`;
  blast.field.appendChild(el); s.reviewEl=el;
  fuSay(say, 6000, mood); fuBar();
  if(demo) return;                                                    // the demo says what comes next itself
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
  const now=!s.done && b.i===cur, two=(s.species===2 || s.species===4) && b.i<s.cantus.length-1;
  // the bar's notes, by the slots they fill: written, then the one being chosen
  const items=[];
  s.slots.forEach((sl,i)=>{ if(sl.bar!==b.i) return; if(i<s.flat.length) items.push({p:s.flat[i], j:sl.beat, tie:!!sl.tie && s.flat[i]===s.flat[i-1]}); else if(i===s.at && !s.done && s.pick!=null) items.push({p:s.pick, j:sl.beat, tent:true}); });
  const cy=fuYOf(b.c), help=fuShowIv();
  let h=`<span class="funote c${now?" now":""}" style="left:0;top:${cy}px;width:${Math.round(w*.78)}px">${SHARP_NAMES[mod(b.c,12)]}</span>`;
  const ivs=[];
  items.forEach(({p,j,tie,tent})=>{
    const dx = two ? (j? 1 : -1)*w*.2 : 0, py=fuYOf(p), I=CP.interval(s.mode, b.c, p);
    const susp = tie && s.susp && now && I.class==="dissonant";
    ivs.push(I.number);
    const col = help || susp ? ` ${I.class}` : "", lock = tent && s.lock ? " lock" : "";
    h+=`<span class="fubeam${col}${lock}${susp?" susp":""}" style="left:${dx}px;top:${Math.min(cy,py)}px;height:${Math.abs(cy-py)}px"></span>`;
    h+=`<span class="funote p${tent?" now":""}${lock}${tie?" tied":""}${susp?" susp":""}" style="left:${dx}px;top:${py}px;width:${Math.round(w*(two?.36:.6))}px;--tie:${Math.round(w*.62)}px">${SHARP_NAMES[mod(p,12)]}</span>`;
    if(tent && s.lock) h+=`<span class="futag" style="top:${Math.min(cy,py)-14}px;left:${dx}px">LOCK-ON · ${s.lock.rule==="resolution" && !s.lock.severity ? "CAN'T RESOLVE" : shName(s, s.lock, s.flat.concat(s.pick))}</span>`;
    if(susp) h+=`<span class="fususp" style="top:${Math.min(cy,py)-18}px;left:${dx}px"><b>STEP DOWN</b><i><u></u></i></span>`;
  });
  if(help && ivs.length) h+=`<span class="fuiv" style="top:${L.bottom+8}px">${ivs.join(" ")}</span>`;
  b.el.className=`fubar ship${b.i>cur && !s.done ? " future" : ""}${now?" now":""}`;
  b.el.innerHTML=h;
}
// the bars glide so the one being written stays at the ships' place
function shTick(dt){
  const s=blast.ship, L=blast.L; if(!s || !L) return;
  if(s.susp && !s.done && (blast.phase==="play" || blast.phase==="demo")){
    s.susp.left-=dt;
    const bar=blast.field.querySelector(".fususp u"); if(bar) bar.style.width=`${Math.max(0, 100*s.susp.left/s.susp.total)}%`;
    if(s.susp.left<=0) shSuspLate(s);
  }
  const cur=s.done ? s.cantus.length-1 : s.slots[s.at].bar;
  s.view+=(cur-s.view)*Math.min(1, dt*6);
  for(const b of blast.bars){ b.x=fuShipX()+(b.i-s.view)*L.barW; b.el.style.transform=`translateX(${Math.round(b.x)}px)`; b.el.hidden=b.x<-L.barW || b.x>L.W+L.barW; }
}
function shClear(){
  const s=blast && blast.ship; if(!s) return;
  if(s.reviewEl) s.reviewEl.remove();
  blast.ship=null;
}
// a string let go: the note isn't held over the bar line any more
mc.addEventListener("harpoff", e=>{ const s=blast && blast.kind==="fux" && blast.ship; if(!s) return; if(shString(e.detail)===s.heldString) s.held=false; });
// Enter or the space bar commits, as a chord button does
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="fux" || blast.phase!=="play" || !blast.ship || e.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(e.code==="Enter" || e.code==="Space" || e.code==="NumpadEnter"){ e.preventDefault(); shCommit(); }
});
