// Chopper Rescue on the joystick plate: while a call comes through static, the stick is the radio's
// fine-tuning wheel, by speed: 0.35 of the dial a second at a full push, the square of a smaller one,
// clamped as the keys are; let go, the dial stays; held in tune, it comes through. Without the plate
// the stick changes nothing.
const t=require("./harness").load("chopper-rescue");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check}=t;
  const tick=now=>w.chTick(now), near=(a,b,e)=>Math.abs(a-b)<=e;
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0);
  for(let k=0;k<80 && !a.tune;k++) await sleep(100);
  check("a call comes through static", !!a.tune);
  P.freeze(); const tn=a.tune; tn.at=Infinity;                             // no weak signal while the test turns the dial
  tn.target=.95;                                                           // the station far up the dial: not passed on the way
  check("the static says the stick tunes", /THE STICK/.test(a.radioEl.textContent));
  tn.dial=.5; w.eval("chDial(.5)"); P.drive(tick, 200, 20);
  P.stick(1); P.drive(tick, 200, 20);
  check("a full push turns the dial 0.35 a second", near(tn.dial, .5+.07, .002), tn.dial.toFixed(3));
  P.stick(0); const held=tn.dial; P.drive(tick, 200, 20);
  check("let go, the dial stays", tn.dial===held);
  tn.dial=.5; P.stick(-.5); const x=w.eval("jsXY().x"); P.drive(tick, 400, 20);
  check("half a push the other way: slower, the square of it", near(tn.dial, .5-x*x*.35*.4, .002), `${tn.dial.toFixed(3)} (x ${x.toFixed(2)})`);
  P.stick(-1); P.drive(tick, 4000, 20);
  check("held over, it stops at the dial's end", tn.dial===0);
  // steered into tune and held there: through
  P.stick(0); tn.dial=Math.max(0, tn.target-.05); w.eval(`chDial(${tn.dial})`);
  P.stick(.4); let now=P.drive(tick, 20, 20);
  for(let k=0;k<400 && a.tune && Math.abs(w.eval("chCents()"))>4;k++) now=P.drive(tick, 20, 20, now);
  P.stick(0); now=P.drive(tick, 700, 20, now);
  check("steered into tune and held there, it comes through", !a.tune && !!a.call);
  // without the plate
  P.connect({on:false}); await sleep(100);
  a.call=null; a.tune={...tn, dial:.5, at:Infinity, audio:null, heldAt:0};
  P.stick(1); P.drive(tick, 400, 20);
  check("without the plate the stick doesn't turn the dial", a.tune && a.tune.dial===.5);
  P.stick(0);
  if(P.standIn()) console.log("  (the shared joystick layer wasn't there: the test's stand-in played it)");
  t.done();
})();
