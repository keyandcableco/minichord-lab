// Chord Breakout's coda: with three bricks left the last ones open, their chords playable without a
// hit, a paddle bounce leaving them open; the bonus drains and what's left is scored when the wall
// clears; with six left, it begins once the ball has gone a while without touching a brick, and not
// before; the bonus round's pause moves its clock on.
const t=require("./harness").load("chord-breakout");
(async()=>{
  const {w, d, sleep, chord, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:0});
  const now=()=>w.performance.now();
  const park=()=>Object.assign(a.ball,{x:40, y:200, vx:0, vy:-60, stuck:false, caught:false, speed:60, base:60});   // the ball kept out of the way
  const leave=n=>{ a.bricks.filter(b=>b.alive).slice(n).forEach(b=>{ b.alive=false; b.el.remove(); }); a.bricks.forEach(b=>{ b.cap=null; b.power=false; }); };
  park(); leave(4); a.boTouchAt=now(); await sleep(100);
  check("four bricks left: no coda yet", !a.coda);
  const k4=a.bricks.find(b=>b.alive); k4.cracked=true; chord(k4.rootPc, k4.q); await sleep(60);
  check("three left: the coda opens them all", !!a.coda && a.bricks.filter(b=>b.alive).every(b=>b.open && b.cracked && b.el.classList.contains("open")) && /CODA \+\d+/.test(a.hud.textContent), a.hud.textContent);
  w.eval("boHeal()");
  check("a paddle bounce leaves them open", a.bricks.filter(b=>b.alive).every(b=>b.cracked));
  const k=a.bricks.find(b=>b.alive); chord(k.rootPc, k.q); await sleep(60);
  check("an open brick's chord breaks it, no hit needed", !k.alive);
  const pot=w.eval("boCodaLeft()"); await sleep(500);
  check("the coda's bonus drains", w.eval("boCodaLeft()")<pot, `${pot} → ${w.eval("boCodaLeft()")}`);
  const s0=a.score, left=w.eval("boCodaLeft()");
  for(const b of a.bricks.filter(b=>b.alive)){ chord(b.rootPc, b.q); await sleep(40); }
  check("the wall cleared: what's left of it is scored", a.score-s0>left && !a.coda, `+${a.score-s0}`);
  for(let i=0;i<30 && !a.bricks.some(b=>b.alive);i++) await sleep(100);
  // six left, and the ball's gone a while without touching a brick
  park(); leave(6); a.boTouchAt=now(); await sleep(200);
  check("six left and the ball busy: no coda", !a.coda);
  a.boTouchAt=now()-10000; await sleep(100);
  check("six left and nine seconds without a brick: the coda", !!a.coda && a.bricks.filter(b=>b.alive).every(b=>b.open));
  const until=a.coda.codaUntil; w.eval("bonusShift(blast, 3000)");
  check("a bonus round's pause moves its clock on", Math.round(a.coda.codaUntil-until)===3000);
  // the demo shows it
  t.done();
})();
