// Chord Burger on the joystick plate: the stick walks the cook through kmHeld, eight ways, the vertical
// way first (up-left walks left and takes the first ladder up); A flips; B voices the chord its next
// inversion, round from root position after the third, in MINE voicing, and does nothing in SET FOR
// ME. The strip doesn't walk. Without the plate, B on the harp does nothing.
const t=require("./harness").load("chord-burger");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect({extra:{37:0, 38:0, 120:2, 111:1, 198:2, 117:0}}); await sleep(100);
  if(P.standIn()) console.log("  (the shared joystick layer isn't there yet: a stand-in to its contract)");
  E("saved.bkAuto=false");
  const a=await t.start(1); await sleep(100);
  P.push("left"); await sleep(20);
  check("the stick held: its way walks (kmHeld)", E("bkWays().join()")==="left", E("bkWays().join()"));
  P.stick(-.9,.9); await sleep(20);
  const ul=E("bkWays()");
  check("up-left: both ways held, up before left, so a walk left takes the first ladder up", ul.includes("up") && ul.includes("left") && ul.indexOf("up")<ul.indexOf("left"), ul.join());
  P.push("rest"); await sleep(20);
  check("let go, the cook stops", E("bkWays().length")===0);
  P.note(3); P.note(10); await sleep(20);
  check("the strip doesn't walk", E("bkWays().length")===0, E("bkWays().join()"));
  P.note(3,false); P.note(10,false);
  // A flips: the same as the harp's A
  let flips=0; const flip=w.bkFlip; w.bkFlip=()=>{ flips++; };
  P.press("a"); await sleep(20);
  check("A flips", flips===1);
  P.push("left"); P.push("rest"); P.push("up"); P.push("rest");
  check("the stick's pushes don't", flips===1);
  w.bkFlip=flip;
  // B: the next inversion, round again after the third
  a.voicing={inv:0, sp:0};
  const invs=[]; for(let k=0;k<4;k++){ P.press("b"); await sleep(10); invs.push(a.voicing.inv); }
  check("B: the next inversion each press, round to root position after the third", invs.join()==="1,2,3,0", invs.join());
  check("and the minichord's inversion (37) follows", t.mc.params[37]===0);
  P.press("b"); await sleep(10);
  check("…written to the minichord", t.mc.params[37]===1);
  E("saved.bkAuto=true"); a.voicing={inv:0, sp:0};
  P.press("b"); await sleep(10);
  check("in SET FOR ME, B does nothing", a.voicing.inv===0);
  E("saved.bkAuto=false");
  check("the rules say the stick", /WITH THE STICK/.test(E("BKMENU_G.rules()")) && /B \(OR ONE KNOB\)/.test(E("BKMENU_G.rules()")));
  // without the plate
  P.connect({on:false, extra:{37:0, 38:0, 120:2, 111:1, 198:2, 117:0}}); await sleep(100);
  P.push("left"); await sleep(20);
  check("without the plate the stick doesn't walk", E("bkWays().length")===0);
  P.push("rest");
  a.voicing={inv:0, sp:0}; t.note(5); await sleep(10);
  check("and the harp's B leaves the voicing be", a.voicing.inv===0);
  sb.restoreAll();
  t.done();
})();
