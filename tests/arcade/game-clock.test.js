// Every game's clock keeps true time on a slow machine: a frame is counted as up to a tenth of a
// second, so at ten frames a second the game runs at its own speed, choppy rather than in slow motion
// (it was a twentieth, a thirtieth in Chord Breakout, which a big full screen fell below).
const t=require("./harness").load("chord-breakout", {every:true});   // every game's files: it looks across them
(async()=>{
  const {w, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0);
  check("a game's clock takes up to a tenth of a second a frame", w.eval("DT_MAX")===.1);
  check("every game's tick uses it", w.eval("[blastTick, commandTick, snTick, asTick, stTick, boTick, fdTick, chTick, kfTick, swTick, frTick, slTick, hdTick, krTick].every(f=>/DT_MAX/.test(String(f)))"));
  // Breakout, ten frames a second against sixty: the ball covers the same ground
  const run=gap=>w.eval(`(()=>{ cancelAnimationFrame(blast.raf); const b=blast.ball; Object.assign(b,{stuck:false, caught:false, x:450, y:300, vx:0, vy:-100, speed:100, base:100}); blast.bricks.forEach(k=>k.alive=false);
    let t=performance.now()+100000; blast.last=t; for(let s=0;s<1000;s+=${gap}){ t+=${gap}; boTick(t); cancelAnimationFrame(blast.raf); } return 300-b.y; })()`);
  const fast=run(1000/60), slow=run(100);
  check("at ten frames a second Breakout's ball keeps its true speed", Math.abs(slow-fast)<8, `${Math.round(slow)} against ${Math.round(fast)} px`);
  t.done();
})();
