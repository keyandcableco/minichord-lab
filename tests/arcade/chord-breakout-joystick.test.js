// Chord Breakout on the joystick plate: the stick's push is the paddle's speed (the arrow keys' 560
// pixels a second at a full push, the square of a smaller one); let go, the paddle stops where it is
// and the keys still work; A or B serves a waiting ball at once and lets a caught one go. Without the
// plate the stick changes nothing.
const t=require("./harness").load("chord-breakout");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check, key, d}=t;
  const tick=now=>w.boTick(now), near=(a,b,e)=>Math.abs(a-b)<=e;
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); P.freeze();
  const p=a.paddle, mid=(a.W||900)/2-p.w/2;
  p.x=p.target=mid; P.drive(tick, 40, 20);
  P.stick(1); P.drive(tick, 200, 20);
  check("a full push right: the paddle's target goes at 560 pixels a second", a.keyDir===1 && near(p.target, mid+112, 2), `${Math.round(p.target-mid)} px`);
  P.stick(0); P.drive(tick, 20, 20); const stop=p.target; P.drive(tick, 300, 20);
  check("let go, it stops where it is", a.keyDir===0 && p.target===stop && near(p.x, stop, 1));
  p.x=p.target=mid; P.stick(-.5); const x=w.eval("jsXY().x"); P.drive(tick, 200, 20);
  check("half a push left: slower, by the square of the push", a.keyDir<0 && near(p.target, mid-560*x*x*.2, 2), `${Math.round(p.target-mid)} px (x ${x.toFixed(2)})`);
  P.stick(0); P.drive(tick, 20, 20);
  // the keys beside it: a key held isn't undone by the stick at rest
  key("ArrowLeft"); P.drive(tick, 60, 20);
  check("the arrow keys still push it, the stick at rest", a.keyDir===-1);
  d.dispatchEvent(new w.KeyboardEvent("keyup",{code:"ArrowLeft", bubbles:true}));
  // A serves the waiting ball at once
  w.eval("boServe()"); const b=a.balls[0], now=w.performance.now();
  check("a new ball waits on the paddle", b.stuck && !b.caught && a.serveAt>now+1000);
  P.button("a", true); P.button("a", false); P.drive(tick, 40, 20, now);
  check("A serves it at once", !b.stuck && b.vy<0);
  // B lets a caught ball go (FERMATA)
  w.eval("boCatch(blast.balls[0], performance.now())");
  check("a caught ball is held", b.caught && b.stuck);
  P.button("b", true); P.button("b", false);
  check("B lets it go", !b.caught && !b.stuck);
  // without the plate: nothing
  P.connect({on:false}); await sleep(100);
  p.x=p.target=mid; a.keyDir=0; P.stick(1); P.drive(tick, 200, 20);
  check("without the plate the stick does nothing", a.keyDir===0 && p.target===mid);
  w.eval("boServe()"); const b2=a.balls[0]; P.button("a", true); P.button("a", false);
  check("nor does A", b2.stuck && a.serveAt>w.performance.now()+1000);
  P.stick(0);
  if(P.standIn()) console.log("  (the shared joystick layer wasn't there: the test's stand-in played it)");
  t.done();
})();
