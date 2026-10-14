// Chord Invaders on the joystick plate: in manual aim the stick is the ship's speed (the square of the
// push, 1.3 of the field a second at full), the same however fast the frames come, clamped to the
// field; at rest it holds; the AIM option and the banner say the stick steers. In auto aim, or without
// the plate, the stick changes nothing.
const t=require("./harness").load("invaders");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check}=t;
  const tick=now=>w.blastTick(now), near=(a,b,e=.005)=>Math.abs(a-b)<=e;
  await sleep(150); P.connect(); await sleep(100);
  w.eval("saved.invAim=1");
  check("on the plate the AIM option says the stick steers", /THE STICK STEERS/.test(w.eval(`ARCADE_OPTS.find(o=>o.id==="aim").vals("blaster")[1][2]`)));
  let a=await t.start(0); P.freeze();
  check("manual aim is on", a.aimManual===true);
  await sleep(1400);
  check("the banner says the stick steers", /STEER THE SHIP WITH THE STICK/.test(w.document.querySelector(".field").textContent));
  a.shipWant=.5; P.drive(tick, 50);
  P.stick(1); P.drive(tick, 200, 20);
  check("a full push right moves the ship 1.3 of the field a second", near(a.shipWant, .5+1.3*.2, .01), a.shipWant.toFixed(3));
  P.stick(0); const held=a.shipWant; P.drive(tick, 300);
  check("let go, the ship holds where it is", a.shipWant===held);
  // half a push: the square of it, after the dead zone
  a.shipWant=.5; P.stick(.5); const x=w.eval("jsXY().x"); P.drive(tick, 400);
  check("half a push goes slower, by the square of the push", near(a.shipWant, .5+x*x*1.3*.4, .01) && a.shipWant<.5+.15, `${a.shipWant.toFixed(3)} (x ${x.toFixed(2)})`);
  // frame-rate independent: the same push for the same time, in big frames and small
  a.shipWant=.3; P.stick(.8); P.drive(tick, 480, 8); const fine=a.shipWant;
  a.shipWant=.3; P.drive(tick, 480, 40); const coarse=a.shipWant;
  check("the same however fast the frames come", near(fine, coarse, .003), `${fine.toFixed(4)} ${coarse.toFixed(4)}`);
  P.stick(-1); P.drive(tick, 2000);
  check("pushed left it stops at the field's edge", a.shipWant===.06);
  P.stick(1); P.drive(tick, 2000);
  check("and at the right", a.shipWant===.94);
  // a long gap between frames (a pause, a hidden page) moves it not at all
  P.stick(-1); const g0=a.shipWant, n=P.drive(tick, 16); tick(n+2000);
  check("a gap between frames doesn't throw the ship", a.shipWant>g0-.05, `${g0.toFixed(2)} → ${a.shipWant.toFixed(2)}`);
  P.stick(0);
  // auto aim: the ship isn't steered, the stick does nothing
  w.eval("saved.invAim=0; beginBlast(0)"); a=w.eval("blast");
  a.shipWant=.5; P.stick(1); P.drive(tick, 400);
  check("in auto aim the stick does nothing", a.shipWant===.5);
  P.stick(0);
  // without the plate: manual aim as it was
  P.connect({on:false}); await sleep(100);
  check("without the plate the AIM option reads as before", !/STICK/.test(w.eval(`ARCADE_OPTS.find(o=>o.id==="aim").vals("blaster")[1][2]`)));
  w.eval("saved.invAim=1; beginBlast(0)"); a=w.eval("blast");
  a.shipWant=.5; P.stick(1); P.drive(tick, 400);
  check("without the plate the stick does nothing", a.shipWant===.5);
  t.key("ArrowRight");
  check("and the arrow keys still steer", near(a.shipWant, .56));
  if(P.standIn()) console.log("  (the shared joystick layer wasn't there: the test's stand-in played it)");
  t.done();
})();
