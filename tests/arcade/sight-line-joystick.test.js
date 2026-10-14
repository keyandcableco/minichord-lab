// Sight Line on the joystick plate: the stick held is the voicing for the chord about to be pressed:
// up the 1st inversion, down the 2nd, let go root position, written to the minichord (37) as it moves,
// with a little hysteresis; only the stick's changes count, so the arrows still work beside it. The
// strip is the harp. Without the plate the stick does nothing.
const t=require("./harness").load("sight-line");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check, key}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
  if(P.standIn()) console.log("  (the shared joystick layer isn't there yet: a stand-in to its contract)");
  const a=await t.start(7); await sleep(100);                        // level 8: inversions
  check("the inversions level, in root position", E("SL_LEVELS[blast.level].inversions") && a.inv===0);
  P.stick(0,.9); await sleep(10);
  check("the stick held up: 1st inversion, on the minichord", a.inv===1 && t.mc.params[37]===1);
  P.stick(0,.5); await sleep(10);
  check("eased back a little, it holds", a.inv===1);
  P.stick(0,0); await sleep(10);
  check("let go: root position", a.inv===0 && t.mc.params[37]===0);
  P.stick(0,-.9); await sleep(10);
  check("held down: 2nd inversion", a.inv===2 && t.mc.params[37]===2);
  P.stick(.3,-.85); await sleep(10);
  check("a little sideways, still the 2nd", a.inv===2);
  P.stick(0,0); await sleep(10);
  key("ArrowUp"); await sleep(10);
  check("the stick at rest, the arrows still swing it", a.inv===1);
  P.stick(.9,0); await sleep(10);
  check("a push sideways changes nothing", a.inv===1);
  P.stick(0,0);
  check("the rules say the stick", /HOLD THE STICK/.test(E("SLMENU_G.rules()")));
  // without the plate
  P.connect({on:false}); await sleep(100);
  a.inv=0; P.stick(0,.9); await sleep(10);
  check("without the plate the stick does nothing", a.inv===0);
  P.stick(0,0);
  check("and the rules don't speak of it", !/STICK/.test(E("SLMENU_G.rules()")));
  sb.restoreAll();
  t.done();
})();
