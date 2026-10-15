// Chord Asteroids' Barry Harris level, come on mid-game: Barry Harris mode switched on, and the rocks
// still out there whose chords the buttons can no longer play (major, minor, diminished) gone, costing
// nothing and scoring nothing, while the sevenths, augmented and the notes stay. RESOLUTION asks for the
// home chord as the major button plays it now, C6. A bonus round that asks for chords by name puts the
// mode aside while it runs and gives it back after; one played on the harp leaves it on.
const t=require("./harness").load("chord-asteroids",{storage:{saved:{bonus:true}}});
(async()=>{
  const {w, sleep, note, check}=t;
  await sleep(150); t.connect({key:0, extra:{33:0}}); await sleep(100);
  const a=await t.start(3, {speed:0});                                   // Diminished and augmented
  const play=pcs=>t.sb.answerChord(pcs.map((p,i)=>({pitch:48+p, voice:i})));
  a.next=w.performance.now()+1e9;                                         // nothing new comes in by itself
  const rock=(root, q, x)=>w.eval(`(()=>{ const r=asRock("chord", ${x}, 60, "${root}${q}", {root:"${root}", q:"${q}", tones:spellChord("${root}","${q}"), rootPc:pcOfName("${root}")}); r.vx=0; r.vy=0; return r.id; })()`);
  const noteRock=(name, x, y=380, left=2)=>w.eval(`(()=>{ const r=asRock("note", ${x}, ${y}, "${name}", {name:"${name}", pc:pcOfName("${name}"), group:{left:${left}, label:"X"}}); r.vx=0; r.vy=0; r.born=performance.now()-5000; return r.id; })()`);
  const R=id=>a.rocks.find(r=>r.id===id);
  const stale={C:rock("C","",80), Am:rock("A","m",180), "B°":rock("B","°",280)};
  const keep={G7:rock("G","7",380), Fmaj7:rock("F","maj7",480), Dm7:rock("D","m7",580), "E+":rock("E","+",680)};
  const loose=noteRock("F♯", 700, 400);                                  // a note of some other chord, still out
  const last=noteRock("B♭", 100, 400, 1);                                 // the last note of a chord: its clear is the sixth
  a.clears=5; const lives=a.lives;
  check("before the level, Barry Harris mode is off", t.mc.params[33]===0 && a.level===3);
  note(10); await sleep(400);
  check("the sixth clear brings the Barry Harris level, and switches the mode on", a.level===4 && t.mc.params[33]===1, `level ${a.level+1}, 33=${t.mc.params[33]}`);
  const gone=Object.entries(stale).filter(([,id])=>!R(id) || R(id).dead).map(([n])=>n);
  check("the rocks the buttons can't play any more are gone: major, minor, diminished", gone.length===3, `gone: ${gone.join(" ")}`);
  const kept=Object.entries(keep).filter(([,id])=>R(id) && !R(id).dead).map(([n])=>n);
  check("the sevenths and augmented, which still play, stay", kept.length===4, `kept: ${kept.join(" ")}`);
  check("so does a note still out, which the harp still plays", R(loose) && !R(loose).dead);
  check("they go without costing a life", a.lives===lives);
  // RESOLUTION: the home chord as the major button plays it now
  a.asPower={k:"resolve", powerUntil:0, pc:null}; w.eval("asBar()");
  check("RESOLUTION names the home chord as the buttons play it now", /RESOLUTION: PLAY C6/.test(a.hud.textContent), a.hud.textContent);
  play([0,4,7]); await sleep(60);
  check("a plain C, which the buttons can't play now, doesn't set it off", w.eval("asPowerOn('resolve')") && !R(keep.G7).dead);
  play([0,4,7,9]); await sleep(80);
  check("C6 does, and every rock goes", !a.asPower && Object.values(keep).every(id=>!R(id) || R(id).dead));
  // a bonus round that names chords: the mode put aside for it, and given back
  w.eval(`arcadeBonus("detective")`); await sleep(60);
  check("a round that asks for chords by name puts Barry Harris mode aside", t.mc.params[33]===0 && a.bonus.barryWas===1, `33=${t.mc.params[33]}`);
  w.eval("bonusEnd(blast.bonus)"); await sleep(60);
  check("and gives it back when it ends", t.mc.params[33]===1);
  for(let i=0;i<50 && a.bonus;i++) await sleep(100);
  w.eval(`arcadeBonus("salvage")`); await sleep(60);
  check("a round played on the harp leaves it on", t.mc.params[33]===1 && a.bonus.barryWas==null);
  w.eval("bonusEnd(blast.bonus)"); await sleep(60);
  check("and it's still on after", t.mc.params[33]===1);
  t.done();
})();
