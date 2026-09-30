// Chord Invaders, manual aim: the knobs made inert (firmware 19), the steering knob slides the ship, a
// chord fires straight up from it, a chord that isn't above the ship goes wide, and it all counts double.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, sleep, chord, check, knob, mc}=t;
  await sleep(150); t.connect({extra:{7:19, 117:0, 238:1}}); await sleep(100);
  w.eval("saved.invAim=1"); const a=await t.start(0, {speed:1});
  check("manual aim puts the knobs on inert alternates", mc.params[117]===1 && mc.params[16]===215);
  check("and the score multiplier counts it: × 2 on top of the speed", a.mult===w.eval("MULT_SPEED[+saved.speed||0]")*2, `× ${a.mult}`);
  knob(0,22); await sleep(500); const left=a.shipF; knob(127,22); await sleep(700);
  check("the steering knob slides the ship", left<.2 && a.shipF>.8, `${left.toFixed(2)} → ${a.shipF.toFixed(2)}`);
  // wait for chords to fall, then try one away from the ship and one under it
  for(let i=0;i<80 && a.items.filter(x=>!x.done).length<1;i++) await sleep(100);
  const it=a.items.find(x=>!x.done); const W=a.field.clientWidth||900;
  // the test's page has no layout, so give this chord a real place: the middle, 60 pixels wide
  Object.defineProperty(it.el,"offsetLeft",{value:W*.5, configurable:true}); Object.defineProperty(it.el,"offsetWidth",{value:60, configurable:true});
  Object.defineProperty(a.field,"clientWidth",{value:W, configurable:true});
  const pos=.5, far=.94;
  a.shipWant=far; await sleep(1200);
  chord(it.rootPc, it.q); await sleep(60);
  check("a chord that isn't above the ship goes wide", !it.done && /WIDE/.test(t.heard()), t.heard());
  a.shipWant=Math.max(.06,Math.min(.94,pos)); await sleep(1500); const s0=a.score;
  chord(it.rootPc, it.q); await sleep(300);
  check("under it, the chord fires and hits", it.done && a.score>s0, t.heard());
  t.done();
})();
