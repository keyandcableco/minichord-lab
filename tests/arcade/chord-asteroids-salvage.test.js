// Chord Asteroids' own bonus round, SALVAGE RUN, played in its field: the game's rocks hold still and
// dim, and wreckage drifts round the ship. Plucking one of the called chord's notes hauls that piece in
// and fills its slot; junk is hauled in, thrown out, and costs two seconds; every slot full rebuilds the
// chord and calls the next. Afterwards the field is clean and the game carries on with its own rocks.
const t=require("./harness").load("chord-asteroids",{storage:{saved:{bonus:true}}});
(async()=>{
  const {w, d, sleep, check, note}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(2, {speed:0});
  await sleep(200);
  const own=w.eval(`(()=>{ const r=asRock("chord", 120, 80, "Cm", {root:"C", q:"m", tones:["C","E♭","G"], rootPc:0}); r.vx=10; r.vy=0; return r.id; })()`);
  w.eval(`arcadeBonus("salvage")`); await sleep(80);
  const b=w.eval("blast.bonus");
  check("Chord Asteroids plays its own round", b.g.id==="salvage" && w.eval("BONUS_OWN.asteroids.join()")==="salvage");
  for(let i=0;i<60 && !b.ready;i++) await sleep(100);
  await sleep(200);
  const parts=b.mine.filter(r=>r.part), junk=b.mine.filter(r=>!r.part);
  check("wreckage drifts in the game's own field: the chord's notes and junk", parts.length===b.ans.tones.length && junk.length>=3 && b.mine.every(r=>a.rocks.includes(r) && r.el.classList.contains("bonuschord")),
    `${b.ans.sym}: ${b.mine.map(r=>r.name).join(" ")}`);
  check("no piece of junk is in the chord, and none repeats", junk.every(r=>!b.ans.pcs.has(r.pc)) && new Set(b.mine.map(r=>r.pc)).size===b.mine.length);
  check("a slot waits for each of the chord's notes", d.querySelectorAll(".bonusround .bocards.tray .bocard.q").length===b.ans.tones.length);
  const p0=parts[0], x0=p0.x, y0=p0.y; await sleep(300);
  check("the wreckage drifts", Math.hypot(p0.x-x0, p0.y-y0)>1);
  const mine=a.rocks.find(r=>r.id===own), mx=mine.x; await sleep(300);
  check("the game's own rocks hold still behind it", mine.x===mx);
  // junk: hauled in, thrown out, two seconds gone
  const t0=b.t0; note(junk[0].pc); await sleep(1500);
  check("junk is hauled in and thrown out, costing two seconds", junk[0].dead && b.junk===1 && Math.round(b.t0-t0)===-2000, `${junk[0].name}`);
  // a part: its slot fills
  const s0=b.score; note(p0.pc); await sleep(1500);
  check("a part is hauled in and fills its slot", p0.dead && b.got.has(p0.pc) && b.score>s0 && d.querySelectorAll(".bonusround .bocards.tray .bocard.done").length===1, `${p0.name}: +${b.score-s0}`);
  note(p0.pc); await sleep(50);
  check("its note again finds nothing more to haul", /ALREADY IN/.test(t.heard()), t.heard());
  // a string with nothing out there jams the beam, so the rest of a sweep hauls nothing
  const p1=parts[1]; note(p1.pc); await sleep(50);
  check("an empty string jams the beam: the next pluck hauls nothing", !p1.towed && /JAMMED/.test(t.heard()), t.heard());
  await sleep(1100);
  // the rest: the chord is rebuilt and the next is called
  const sym=b.ans.sym, built=b.built;
  for(const r of parts.slice(1)){ note(r.pc); await sleep(100); }
  for(let i=0;i<40 && b.built===built;i++) await sleep(100);
  check("every part in rebuilds the chord, for a bonus", b.built===built+1, sym);
  for(let i=0;i<30 && b.between;i++) await sleep(100); await sleep(300);
  check("and the next chord is called, with fresh wreckage", b.mine.length>0 && b.mine.every(r=>!r.dead), b.ans.sym);
  // a sweep across all twelve strings: it stalls at the first string with nothing there
  const before=b.mine.filter(r=>r.towed).length; for(let pc=0;pc<12;pc++) note(pc); await sleep(30);
  const towed=b.mine.filter(r=>r.towed).length-before, firstEmpty=[...Array(12).keys()].findIndex(pc=>!b.mine.some(r=>r.pc===pc));
  check("a sweep across the harp hauls in only what comes before its first empty string", towed===firstEmpty && towed<b.mine.length, `${towed} of ${b.mine.length}`);
  w.eval("blast.bonus.finish()");
  for(let i=0;i<50 && a.phase!=="play";i++) await sleep(100);
  check("the tally counts chords, parts and junk", b.tally.some(x=>x[0]==="CHORDS REBUILT" && x[1]===1) && b.tally.some(x=>x[0]==="JUNK"));
  check("afterwards the field is clean and the game carries on", a.phase==="play" && !a.rocks.some(r=>r.kind==="salvage") && !d.querySelector(".salvage") && a.rocks.some(r=>r.id===own && !r.dead));
  // every level deals a fair set: every part of the chord there once, and no junk in it
  const fair=w.eval(`(()=>{ const g=BONUS_GAMES.find(x=>x.id==='salvage'); let bad=0, n=0;
    for(let L=0;L<AS_LEVELS.length;L++){ blast.level=L; const b={say(){}, mine:[], stage:document.createElement('div'), el:document.createElement('div')}; g.start(b);
      for(let k=0;k<10;k++){ g.clear(b); g.next(b); n++;
        const ps=b.mine.filter(r=>r.part).map(r=>r.pc), js=b.mine.filter(r=>!r.part).map(r=>r.pc);
        if(ps.length!==b.ans.pcs.size || ps.some(p=>!b.ans.pcs.has(p)) || js.some(p=>b.ans.pcs.has(p)) || new Set(js).size!==js.length || !b.ans.tones.length) bad++;
        if(b.tier.near && js.some(j=>![...b.ans.pcs].some(p=>Math.abs(((j-p)%12+12)%12)===1 || ((j-p)%12+12)%12===11))) bad++; }
      g.stop(b); }
    return bad+" of "+n; })()`);
  check("every set it deals is fair, at every level", /^0 of/.test(fair), fair+" bad");
  t.done();
})();
