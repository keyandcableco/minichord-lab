// Sight Line on the joystick plate: the stick held is the voicing for the chord about to be pressed:
// up the 1st inversion, down the 2nd, let go root position, written to the minichord (37) as it moves,
// with a little hysteresis; only the stick's changes count, so the arrows still work beside it. The
// strip is the harp. The stick is read afresh as a game or level begins, let go in the menus or held
// through. Without the plate the stick does nothing.
const t=require("./harness").load("sight-line");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check, key}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
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
  P.stick(0,0); await sleep(10);
  // held as a game ends and let go in the menus: the next game's push up is heard
  P.stick(0,.9); await sleep(10);
  E("blast.phase='over'"); P.stick(0,0); await sleep(10);
  E("beginSight(7)"); await sleep(50);
  check("a new game: root position, the stick let go", E("blast.inv")===0 && t.mc.params[37]===0 && !E("blast.slStick"), `${E("blast.inv")} ${t.mc.params[37]} ${E("blast.slStick")}`);
  P.stick(0,.9); await sleep(10);
  check("…and the stick pushed up there is the 1st inversion (let go in the menus, it was let go)", E("blast.inv")===1 && t.mc.params[37]===1, `${E("blast.inv")} ${t.mc.params[37]}`);
  // held through a level's start: the root position written, then the stick's voicing again
  E("slLevelStart()"); await sleep(10);
  check("held through a level's start, the voicing is still the stick's", E("blast.inv")===1 && t.mc.params[37]===1 && E("blast.slStick")===1, `${E("blast.inv")} ${t.mc.params[37]}`);
  P.stick(0,0); await sleep(10);
  check("and let go then, root position", E("blast.inv")===0 && t.mc.params[37]===0);
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
