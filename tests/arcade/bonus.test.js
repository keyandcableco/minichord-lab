// Bonus rounds: every two levels a mini-game takes over, and each can be won; while it plays the
// game underneath is paused, and afterwards it carries on where it was, with the bonus in its score.
const t=require("./harness").load("chord-snake", {storage:{saved:{bonus:true}}});
(async()=>{
  const {w, sleep, chord, note, key, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0); await sleep(300);
  const bonus=()=>w.eval("blast && blast.bonus");
  // it falls due two levels on
  a.level=a.bonusAt; await sleep(120);
  check("two levels on, a bonus round starts", !!bonus() && a.phase==="bonus", bonus() && bonus().g.name);
  check("it warns first: the rules and a count down, nothing counted yet", bonus() && !bonus().ready && t.d.querySelector(".bonusround.intro .bocount"));
  const endIt=async()=>{ for(let i=0;i<60 && bonus();i++) await sleep(100); };
  w.eval("clearInterval(blast.bonus.timer); blast.bonus.over=true; blast.bonus.el.remove(); blast.bonus=null; blast.phase='play'");
  const play=async(id, fn)=>{
    const s0=a.score; w.eval(`arcadeBonus("${id}")`); await sleep(80); const b=bonus();
    for(let i=0;i<60 && !b.ready;i++) await sleep(100);                        // the warning first
    await fn(b); await endIt();
    return {gained:a.score-s0, back:a.phase==="play", result:b.result, tallyText:(b.el.querySelector(".botally")||{}).textContent||""};
  };
  let r=await play("tune", async b=>{ for(let i=0;i<200 && Math.abs(b.cents)>.6;i++){ key(b.cents<0?"ArrowUp":"ArrowDown"); await sleep(2); } chord("C"); });
  check("TUNE IT: tuned to A 440 and locked in", r.gained>0 && r.back, r.result);
  // tuned by a knob instead: any knob, not only the steering one, with the knobs switched on to send
  t.mc.params[238]=0;
  r=await play("tune", async b=>{ const c0=b.cents; t.knob(40,20); await t.sleep(20); t.knob(90,20); await t.sleep(20);
    check("TUNE IT: the knobs are switched on, and the chord knob retunes it", t.mc.params[238]===1 && Math.abs(b.cents-c0)>5, `${c0.toFixed(1)} → ${b.cents.toFixed(1)} cents`);
    // held against its stop, the knob keeps tuning that way
    // from the middle, so there's room either way (the tuning stops at 60 cents)
    w.eval("blast.bonus.g.set(blast.bonus, 0); blast.bonus.base=null"); await t.sleep(30);
    t.knob(127,20); await t.sleep(30); const c1=b.cents; await t.sleep(1400);
    check("TUNE IT: a knob held at its stop keeps tuning, as Fifths Defender's does", Math.abs(b.cents-c1)>3, `${c1.toFixed(1)} → ${b.cents.toFixed(1)} cents`); chord("C"); });
  r=await play("missing", async b=>{ for(let i=0;i<4;i++){ note(t.PC[b.ans]); await sleep(20); } });
  check("MISSING NOTE: four notes found", r.gained>0 && r.back, r.result);
  r=await play("odd", async b=>{ for(let i=0;i<3;i++){ chord(t.PC[b.ans.root], b.ans.q); await sleep(20); } });
  check("ODD ONE OUT: three intruders caught", r.gained>0 && r.back, r.result);
  r=await play("detective", async b=>{ for(let i=0;i<3;i++){ chord(t.PC[b.ans.root]); await sleep(20); } });
  check("KEY DETECTIVE: three keys named", r.gained>0 && r.back, r.result);
  r=await play("simon", async b=>{ for(let k=0;k<2;k++){ for(let i=0;i<60 && !b.listening;i++) await sleep(100); for(const c of b.seq){ chord(t.PC[c.root], c.q); await sleep(20); } await sleep(100); } for(let i=0;i<60 && !b.listening;i++) await sleep(100); const c=b.seq[0]; chord((t.PC[c.root]+1)%12, "m"); });
  check("SIMON SAYS: sequences played back", r.gained>0 && r.back, r.result);
  // the snake paused through all that, and moves again after
  const head=JSON.stringify(a.body[0]); await sleep(900);
  check("the game carries on where it was", a.phase==="play" && JSON.stringify(a.body[0])!==head);
  // Chord Invaders' own round: chosen for that game, harder chords as the level rises, and a tally
  const r2=await play("oddout", async b=>{
    for(let k=0;k<4 && !b.over;k++){ const a=b.ans; chord(a.root, a.q); await t.sleep(120); }
  });
  check("ODD ONE OUT: every intruder caught, and a tally of them", r2.gained>0 && /EVERY INTRUDER|OF 4 CAUGHT/.test(r2.result||"") && /INTRUDERS CAUGHT/.test(r2.tallyText||""), `${r2.result} · ${r2.tallyText}`);
  const tiers=w.eval(`(()=>{ const g=BONUS_GAMES.find(x=>x.id==='oddout'), b={say(){}, stage:document.createElement('div')};
    blast.level=0; g.start(b); const easy=b.tier.qs.length+"/"+b.tier.n;
    blast.level=9; g.start(b); return easy+" then "+b.tier.qs.length+"/"+b.tier.n; })()`);
  check("the chords it uses get harder as the game does", tiers==="1/4 then 5/6", tiers);
  check("Chord Invaders picks its own round, and keeps it to itself", w.eval(`(()=>{ const was=blast.kind;
    blast.kind="blaster"; const mine=[...Array(6)].map(()=>{ blast.bonus=null; arcadeBonus(); const id=blast.bonus.g.id; blast.bonus.over=true; blast.bonus=null; blast.phase="play"; return id; });
    blast.kind=was; const others=[...Array(8)].map(()=>{ blast.bonus=null; arcadeBonus(); const id=blast.bonus.g.id; blast.bonus.over=true; blast.bonus=null; blast.phase="play"; return id; });
    return [...new Set(mine)].join()+" | "+(others.includes("oddout")?"LEAKED":"kept out"); })()`)==="oddout | kept out");
  t.done();
})();
