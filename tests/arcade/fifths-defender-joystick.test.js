// Fifths Defender on the joystick plate: Tempest's dial by angle. Pushed past 0.6 the stick aims down
// the spoke it points at (C up, G one step clockwise), with about 8° of give at each boundary so a
// thumb on the line doesn't flicker; a small push or letting go holds the aim; A steps one spoke back,
// B one on. Without the plate the stick and the buttons change nothing.
const t=require("./harness").load("fifths-defender");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check}=t;
  const tick=now=>w.fdTick(now), deg=x=>x*Math.PI/180, frame=()=>P.drive(tick, 16);
  await sleep(150); P.connect(); await sleep(100);
  check("the rules say the stick aims", /PUSH THE STICK TOWARD A KEY/.test(w.eval("FDMENU_G.rules()")));
  const a=await t.start(0); P.freeze(); a.foes=[]; a.next=Infinity;
  check("the aim starts on C", a.aim===0);
  P.toward(deg(30)); frame();
  check("pushed toward G (one step clockwise), it aims down G", a.aim===1, a.aim);
  P.toward(deg(-60)); frame();
  check("toward B♭, two steps back: B♭", a.aim===10, a.aim);
  P.toward(deg(180)); frame();
  check("straight down: F♯", a.aim===6, a.aim);
  // the give at a boundary: from G (30°), 47° stays G, 55° goes on to D
  P.toward(deg(30)); frame(); P.toward(deg(47)); frame();
  check("just past the line between G and D, it stays on G", a.aim===1, a.aim);
  P.toward(deg(55)); frame();
  check("well past it, D", a.aim===2, a.aim);
  P.toward(deg(40)); frame();
  check("back just over the line, it stays on D", a.aim===2, a.aim);
  P.toward(deg(35)); frame();
  check("well back, G again", a.aim===1, a.aim);
  // across C's seam at the top: no seam at all
  P.toward(deg(0)); frame(); P.toward(deg(-30)); frame();
  check("round through C to F, no seam", a.aim===11, a.aim);
  // a small push, or letting go, holds
  P.toward(deg(120), .45); frame();
  check("a small push doesn't aim", a.aim===11, a.aim);
  P.stick(0,0); frame();
  check("let go, the aim holds", a.aim===11);
  // A and B: one spoke back, one on
  P.button("b", true); P.button("b", false);
  check("B steps one spoke clockwise", a.aim===0, a.aim);
  P.button("a", true); P.button("a", false); P.button("a", true); P.button("a", false);
  check("A steps back, round the circle", a.aim===10, a.aim);
  // without the plate
  P.connect({on:false}); await sleep(100);
  check("without the plate the rules are as they were", !/STICK/.test(w.eval("FDMENU_G.rules()")));
  P.toward(deg(90)); frame();
  check("without the plate the stick doesn't aim", a.aim===10, a.aim);
  P.button("b", true); P.button("b", false);
  check("nor do the buttons", a.aim===10);
  P.stick(0,0);
  t.done();
})();
