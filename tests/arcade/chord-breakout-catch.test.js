// Chord Breakout's own bonus round, CHORD CATCH, played with the paddle: the wall and ball hold still,
// a chord is called with a slot for each note, notes fall, and the paddle catches them: one of the
// chord's fills its slot, a wrong one costs two seconds, every slot full calls the next chord. The
// knob steers the paddle through it. Afterwards the field is clean and the game carries on.
const t=require("./harness").load("chord-breakout",{storage:{saved:{bonus:true}}});
(async()=>{
  const {w, d, sleep, check, knob}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(2, {speed:0});
  await sleep(200);
  const bx=a.ball.x, by=a.ball.y;
  w.eval(`arcadeBonus("catch")`); await sleep(80);
  const b=w.eval("blast.bonus");
  check("Chord Breakout plays its own round", b.g.id==="catch" && w.eval("BONUS_OWN.breakout.join()")==="catch");
  for(let i=0;i<60 && !b.ready;i++) await sleep(100);
  check("a slot waits for each of the chord's notes", d.querySelectorAll(".bonusround .bocards.tray .bocard.q").length===b.ans.tones.length, b.ans.sym);
  await sleep(1500);
  check("notes fall, spelled", b.drops.length>0 && b.drops.every(x=>x.el.classList.contains("bocatch")), b.drops.map(x=>x.name).join(" "));
  check("the ball holds still behind it", Math.hypot(a.ball.x-bx, a.ball.y-by)<20);
  knob(0); await sleep(300); const x0=a.paddle.x; knob(127); await sleep(300);
  check("the knob steers the paddle through it", a.paddle.x>x0+200);
  // a wrong note caught: two seconds gone
  const g=w.eval("blast.bonus.g");
  const fake=(name, part)=>{ const el=d.createElement("div"); a.field.appendChild(el); const dr={name, pc:w.eval(`pcOfName("${name}")`), part, x:a.paddle.x+a.paddle.w/2, y:a.padY, vy:0, el}; b.drops.push(dr); g.land(b, dr); return dr; };
  const wrong=w.eval("SHARP_NAMES")[[...Array(12).keys()].find(p=>!b.ans.pcs.has(p))];
  const t0=b.t0; fake(wrong, false);
  check("a wrong note caught costs two seconds", b.junk===1 && Math.round(b.t0-t0)===-2000, wrong);
  const s0=b.score, first=b.ans.tones[0]; fake(first, true);
  check("one of the chord's notes fills its slot", b.got.size>=1 && b.score>s0 && d.querySelectorAll(".bonusround .bocards.tray .bocard.done").length>=1, first);
  const built=b.built, sym=b.ans.sym;
  for(const n of b.ans.tones) if(!b.got.has(w.eval(`pcOfName("${n}")`))) fake(n, true);
  check("every slot full: the chord is caught", b.built===built+1, sym);
  for(let i=0;i<30 && b.between;i++) await sleep(100);
  check("and the next is called", !b.between && b.ans && b.got.size===0, b.ans.sym);
  // the real thing: a falling note of the chord, caught under the paddle
  await sleep(200); const was=b.caught;
  // (steered straight to it, the knob having had its own check above, and the round's clock kept full,
  // so a slow run can't time the round out first)
  for(let i=0;i<120 && b.caught===was;i++){ b.t0=w.performance.now(); const dr=b.drops.filter(x=>x.part).sort((p,q)=>q.y-p.y)[0]; if(dr) a.paddle.target=dr.x-a.paddle.w/2; await sleep(100); }
  check("a falling note of the chord, steered under, is caught", b.caught>was);
  w.eval("blast.bonus.finish()");
  for(let i=0;i<50 && a.phase!=="play";i++) await sleep(100);
  check("the tally counts chords, notes and wrong ones", b.tally.some(x=>x[0]==="CHORDS CAUGHT" && x[1]>=1) && b.tally.some(x=>x[0]==="WRONG NOTES"));
  check("afterwards the field is clean and the game carries on", a.phase==="play" && !d.querySelector(".bocatch") && a.bricks.some(x=>x.alive));
  // every level deals a fair chord
  const fair=w.eval(`(()=>{ const g=BONUS_GAMES.find(x=>x.id==='catch'); let bad=0, n=0;
    for(let L=0;L<BO_LEVELS.length;L++){ blast.level=L; const b={say(){}, drops:[], stage:document.createElement('div')}; g.start(b);
      for(let k=0;k<10;k++){ g.next(b); n++; if(!b.ans.tones.length || b.pool.some(p=>b.ans.pcs.has(p)) || !b.pool.length) bad++; }
      g.stop(b); }
    return bad+" of "+n; })()`);
  check("every chord it calls is fair, at every level", /^0 of/.test(fair), fair+" bad");
  t.done();
})();
