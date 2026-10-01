// The modifier in the arcade: a double tap flips it and the game takes that up rather than putting it
// back (a preset load still resets it); the game sets it for the chord you need next, unless MODIFIER
// is BY HAND, which scores a quarter more; and in the bonus round it follows the chord above the ship.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, mc, sleep, check}=t;
  await sleep(150); t.connect({extra:{7:19}}); await sleep(100);
  const a=await t.start(0, {speed:1});
  await sleep(150);
  check("a game points the double tap at the modifier", mc.params[200]===31 && mc.params[201]===(mc.params[31]===1?0:1));
  // the player double-taps: the firmware flips the modifier and reports, unasked
  const was=mc.params[31], flip=was===1?0:1;
  // (as the firmware reports it: an unasked report in which only the modifier changed)
  mc.params[31]=flip; mc.unasked=true; mc.changed=new Set([31]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set(); await sleep(80);
  check("a double tap flips the modifier, and the game doesn't put it back", mc.params[31]===flip, `was ${was}, now ${mc.params[31]}`);
  check("and the next double tap is pointed the other way", mc.params[201]===was, `201 is ${mc.params[201]}`);
  // a preset loaded on the instrument still puts back what the game holds
  // (a preset load: an unasked report in which many settings changed)
  mc.params[31]=was; mc.params[39]=1; mc.params[2]=60; mc.params[3]=60; mc.unasked=true; mc.changed=new Set([31,39,2,3,184]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set(); await sleep(80);
  check("a preset load still puts back what the game holds", mc.params[39]===0);
  // by hand: the game leaves the modifier alone, and scores a quarter more
  w.eval("saved.invAim=0; saved.speed=0; saved.autoMod=true"); const m1=w.eval("diffMult('blaster')");
  w.eval("saved.autoMod=false"); const m2=w.eval("diffMult('blaster')");
  check("setting the modifier by hand scores a quarter more", Math.abs(m2/m1-1.25)<.01, `×${m1} → ×${m2}`);
  w.eval("blast.modFor=null"); const before=mc.params[31];
  w.eval("arcadeMod(blast.modFor===null ? (mc.params[31]===0 ? 'B♭' : 'F♯') : 'B♭')"); await sleep(30);
  check("by hand, the game doesn't set it", mc.params[31]===before);
  w.eval("saved.autoMod=true; blast.modFor=null");
  // the bonus round: it follows the chord above the ship
  w.eval(`arcadeBonus("oddout")`); await sleep(80);
  const b=w.eval("blast.bonus"); for(let i=0;i<60 && !b.ready;i++) await sleep(100);
  // put a chord needing a flat above the ship, and one needing a sharp away from it
  const W=900; Object.defineProperty(a.field,"clientWidth",{value:W, configurable:true});
  const [c1,c2]=b.mine; c1.root="B♭"; c1.el.textContent="B♭"; c2.root="F♯"; c2.el.textContent="F♯";
  Object.defineProperty(c1.el,"offsetLeft",{value:450, configurable:true}); Object.defineProperty(c2.el,"offsetLeft",{value:100, configurable:true});
  b.mine.slice(2).forEach(it=>Object.defineProperty(it.el,"offsetLeft",{value:800, configurable:true}));
  a.shipF=.5; w.eval("blast.modFor=null"); await sleep(120);
  check("in the bonus round, the game sets the modifier for the chord above the ship", mc.params[31]===1, `modifier ${mc.params[31]===1?"flat":"sharp"} for B♭`);
  a.shipF=100/W; w.eval("blast.modFor=null"); await sleep(120);
  check("and follows the ship to the next", mc.params[31]===0, `modifier ${mc.params[31]===1?"flat":"sharp"} for F♯`);
  w.eval("blast.bonus.finish()");
  t.done();
})();
