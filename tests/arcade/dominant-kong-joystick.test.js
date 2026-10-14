// Dominant Kong on the joystick plate: the stick walks (kmHeld), A or B jumps, taking the stick's left
// or right; on the lift stages the strip's twelve places send the right lift up and down its shaft (the
// bottom place the bottom, the top the top), knobs or none, and never jump; the steering knob, still
// sending, doesn't move it from there. Without the plate the strip is the harp's d-pad as ever, and the
// knob the lift's.
const t=require("./harness").load("dominant-kong");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(3); await sleep(2200);                         // level 4: the lifts
  check("the lift stage, its right lift the strip's", a.stage.kind==="lifts" && E("dkKnobLift()"));
  check("the banner and the shaft say STRIP", E("dkJs()"));
  P.push("right"); await sleep(20);
  check("the stick held: its way walks (kmHeld)", E("dkWays().join()")==="right", E("dkWays().join()"));
  P.push("rest"); await sleep(20);
  check("let go, it stops", E("dkWays().length")===0);
  // the strip: the lift's height, bottom to top
  const S=a.stage, F=S.floors[S.plats.find(f=>S.floors[f].knob)];
  P.note(0); P.note(0,false);
  check("the bottom place: the bottom of the shaft", a.liftKnob===0);
  P.note(11); P.note(11,false);
  check("the top place: the top", a.liftKnob===1);
  P.note(6); P.note(6,false);
  check("a middle place: that far up", Math.abs(a.liftKnob-6/11)<1e-9);
  t.knob(127); await sleep(10); t.knob(3); await sleep(10);
  check("the steering knob brushed: the lift stays where the strip put it", Math.abs(a.liftKnob-6/11)<1e-9, a.liftKnob);
  const H=a.hero, st=H.state;
  P.note(5); P.note(5,false);
  check("and a strip place never jumps (its middle is A and B on the harp)", H.state===st && H.state!=="air");
  check("the lift goes there", (()=>{ const y0=F.yL; for(let k=0;k<200;k++) E("dkLifts(0.05)"); const want=S.bottom-4-(5/11)*(S.bottom-S.top-4); return Math.abs(F.yL-want)<1 && F.yL!==y0; })());
  // A and B jump, taking the stick's way
  Object.assign(H, {state:"walk", f:0, x:40, y:E("dkSurf(0,40)"), vx:0, vy:0}); a.st="go";
  P.push("left"); P.press("a"); await sleep(10);
  check("A jumps, taking the stick's left", H.state==="air" && H.vx<0, `${H.state} vx ${H.vx}`);
  P.push("rest"); Object.assign(H, {state:"walk", f:0, x:40, y:E("dkSurf(0,40)"), vx:0, vy:0});
  P.press("b"); await sleep(10);
  check("B jumps too", H.state==="air" && H.vx===0);
  Object.assign(H, {state:"walk", f:0, x:40, y:E("dkSurf(0,40)"), vx:0, vy:0});
  P.push("up"); P.push("rest"); P.push("left"); P.push("rest");
  check("a push of the stick never jumps", H.state==="walk");
  check("the rules say the stick and the strip", /WITH THE STICK/.test(E("DKMENU_G.rules()")) && /THE STRIP/.test(E("DKMENU_G.rules()")));
  // without the plate: the strip is the d-pad; its places don't move the lift
  P.connect({on:false}); await sleep(100);
  a.liftKnob=.5; t.note(0);
  check("without the plate the strip doesn't send the lift", a.liftKnob===.5);
  t.knob(127); await sleep(10);
  check("…the steering knob does", a.liftKnob===1, a.liftKnob);
  P.push("right"); await sleep(20);
  check("nor does the stick walk", E("dkWays().length")===0);
  P.push("rest");
  sb.restoreAll();
  t.done();
})();
