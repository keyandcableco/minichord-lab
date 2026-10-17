// Fifths Defender on the arcade wheel: the dial under the finger itself. The ring is the circle of
// fifths, C at the top, and a finger on it aims down the spoke at its bearing, with the stick's give
// at the boundaries; lifted, the aim holds. On the harp level the ring's notes are the gun, so the
// wheel doesn't aim there; on the chord levels a slide's plucks say nothing. Without the plate the
// bearing changes nothing.
const t=require("./harness").load("fifths-defender");
const P=require("./wheel-plate").wheelOf(t);
(async()=>{
  const {w, mc, sleep, check}=t;
  const tick=now=>w.fdTick(now), frame=()=>P.drive(tick, 16);
  await sleep(150); P.connect(); await sleep(100);
  check("the rules say the ring aims", /RING IS THE CIRCLE OF FIFTHS/.test(w.eval("FDMENU_G.rules()")));
  const a=await t.start(0); P.freeze(); a.foes=[]; a.next=Infinity;
  check("the aim starts on C", a.aim===0);
  P.land(30); frame();
  check("a finger at 30° (one step clockwise) aims down G", a.aim===1, a.aim);
  P.move(300); frame();
  check("round at 300°, two steps back: B♭", a.aim===10, a.aim);
  P.move(180); frame();
  check("the bottom: F♯", a.aim===6, a.aim);
  // the give at a boundary: from G (30°), 47° stays G, 56° goes on to D
  P.move(30); frame(); P.move(47); frame();
  check("just past the line between G and D, it stays on G", a.aim===1, a.aim);
  P.move(56); frame();
  check("well past it, D", a.aim===2, a.aim);
  P.move(39); frame();
  check("back just over the line, it stays on D", a.aim===2, a.aim);
  P.move(34); frame();
  check("well back, G again", a.aim===1, a.aim);
  // across C's seam at the top: no seam at all
  P.move(0); frame(); P.move(330); frame();
  check("round through C to F, no seam", a.aim===11, a.aim);
  // lifted, the aim holds
  P.lift(); frame(); frame();
  check("let go, the aim holds", a.aim===11);
  // a slide's plucks say nothing on the chord levels
  mc._harp([0x90,64,100]); mc._harp([0x80,64,0]); frame();
  check("a ring pluck doesn't jam the gun", !a.jamUntil && a.aim===11);
  // on the harp level the notes are the gun: the wheel stands aside
  a.level=4; P.land(90); frame();
  check("on the harp level the wheel doesn't aim", a.aim===11, a.aim);
  a.level=0; frame();
  check("back on a chord level it does", a.aim===3, a.aim);
  // without the plate
  P.lift(); P.connect({on:false}); await sleep(100);
  check("without the plate the rules are as they were", !/RING/.test(w.eval("FDMENU_G.rules()")));
  P.land(180); frame();
  check("without the plate the bearing doesn't aim", a.aim===3, a.aim);
  t.done();
})();
