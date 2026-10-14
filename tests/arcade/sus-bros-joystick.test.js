// Sus Bros. on the joystick plate: the stick walks left and right (kmHeld), pushing it up jumps as ↑
// does (the edge path, as the layout's up), and A and B jump. With the knob steering, only those jump,
// never the stick's left or right. Without the plate, nothing of the stick's does anything.
const t=require("./harness").load("sus-bros");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); await sleep(2200);
  check("playing", a.phase==="play" && a.st==="go", `${a.phase} ${a.st}`);
  P.push("left"); await sleep(20);
  check("the stick held left: the way walks", E("sbWays().join()")==="left");
  P.stick(-.9,-.9); await sleep(20);
  check("held down-left, still left (down is no way here)", E("sbWays().join()")==="left");
  P.push("rest"); await sleep(20);
  check("let go, it stops", E("sbWays().length")===0);
  const H=a.hero, ground=()=>Object.assign(H, {state:"walk", f:0, y:E("SB_FLOORS[0].y"), vx:0, vy:0});
  ground(); P.push("up"); await sleep(10);
  check("a push up jumps", H.state==="air");
  P.push("rest"); ground();
  P.press("a"); await sleep(10);
  check("A jumps", H.state==="air");
  ground(); P.press("b"); await sleep(10);
  check("B jumps", H.state==="air");
  ground(); P.note(6); P.note(10); await sleep(10);
  check("the strip doesn't", H.state==="walk");
  // steering on the knob, the stick's left and right don't jump
  E("saved.pfKnob=true");
  ground(); P.push("left"); P.push("rest"); P.push("right"); P.push("rest"); await sleep(10);
  check("steered on the knob, a push left or right isn't a jump", H.state==="walk");
  P.press("a"); await sleep(10);
  check("…and A still is", H.state==="air");
  E("saved.pfKnob=false");
  check("the rules say the stick", /WITH THE STICK/.test(E("SBMENU_G.rules()")));
  // without the plate
  P.connect({on:false}); await sleep(100);
  ground(); P.push("up"); P.push("rest"); P.press("a"); await sleep(10);
  check("without the plate the stick and A do nothing", H.state==="walk");
  sb.restoreAll();
  t.done();
})();
