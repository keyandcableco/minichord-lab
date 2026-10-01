// Chord Asteroids' demo shows a power-up: a pedal point capsule cracked by its chord, then every E rock
// shot down by the held note; and nothing of it is left behind when the demo ends.
const t=require("./harness").load("chord-asteroids");
(async()=>{
  const {w, d, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  t.key("KeyJ"); await sleep(30);
  t.overlay().querySelector("button.howto").click();
  const cap=()=>(d.querySelector(".field .demo")||{}).textContent||"";
  let capsule=false, held=false, most=0, shot=false;
  const es=()=>w.eval("blast.rocks.filter(r=>!r.dead && r.kind==='note' && r.name==='E').length");
  for(let i=0;i<450 && !shot;i++){ await sleep(100);
    if(/POWER-UPS/.test(cap())){
      capsule = capsule || w.eval("blast.rocks.some(r=>!r.dead && r.power==='pedal' && r.el.classList.contains('pu-pedal'))");
      const on=w.eval("!!(blast.asPower && blast.asPower.k==='pedal' && blast.asPower.pc===4)"); held = held || on;
      most=Math.max(most, es()); if(on && most>=3 && es()===0) shot=true; } }
  check("the demo's POWER-UPS scene shows a pedal point capsule", capsule);
  check("cracked, it holds E", held);
  check("and every E rock is shot down", shot, `${most} E rocks`);
  for(let i=0;i<150 && w.eval("blast.phase")!=="menu";i++) await sleep(100);
  check("when it ends no power is left running, and the score is clear", w.eval("blast.phase")==="menu" && !w.eval("blast.asPower") && w.eval("blast.score")===0 && w.eval("blast.clears")===0);
  t.done();
})();
