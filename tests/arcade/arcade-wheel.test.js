// The arcade wheel in the core and the shared layer: on harp plate 9 (firmware 99) CC 23 and 24 on
// the harp port (or the chord port, in single port mode) become mc.wheel and "wheel" events — the
// bearing 0 to 1 clockwise from the top, the touch as the finger lands and leaves, the angle holding
// where it was let go — and controller.js reads them as a bearing (whAngle), a signed turn (whTurn)
// and a d-pad with hysteresis (whWay4, whWays8). On any other plate the same CCs say nothing, and the
// ring's notes stay ordinary harp notes throughout.
const t=require("./harness").load("fifths-defender");
const P=require("./wheel-plate").wheelOf(t);
(async()=>{
  const {w, mc, sleep, check}=t;
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e, step=360/128;
  await sleep(150); P.connect(); await sleep(100);
  check("on the plate the wheel layer is on", w.eval("whOn()")===true);
  let events=[];
  mc.addEventListener("wheel", e=>events.push({...e.detail}));
  // a finger lands at the top
  P.land(0);
  check("a finger landing is touched at the top", mc.wheel.touched===true && mc.wheel.angle===0);
  check("the change is one event, timed (the bearing hasn't moved)", events.length===1 && events[0].angle===0 && events[0].touched===true && events[0].t>0);
  // and slides round: 90° is a quarter turn clockwise
  events=[]; P.move(90);
  check("a quarter turn clockwise reads 0.25", near(mc.wheel.angle, .25) && events.length===1);
  check("whAngle has it in radians from the top", near(w.eval("whAngle().a"), Math.PI/2) && w.eval("whAngle().on")===true);
  check("whTurn: a quarter turn right is +π/2", near(w.eval("whTurn()"), Math.PI/2));
  check("whWay4 says right, whWays8 agrees", w.eval("whWay4()")==="right" && w.eval("whWays8().join()")==="right");
  P.move(90);
  check("the same bearing again isn't a change", events.length===1);
  // anticlockwise of the top the turn is negative
  P.move(270);
  check("a quarter turn the other way is -π/2", near(w.eval("whTurn()"), -Math.PI/2, .001) && w.eval("whWay4()")==="left");
  // the d-pad's give at a boundary: from up, 50° stays up, 56° goes over to right
  P.move(0); w.eval("whWay4(); whWays8()");
  check("at the top: up", w.eval("whWay4()")==="up");
  P.move(50);
  check("just past the line to right, it stays up", w.eval("whWay4()")==="up");
  P.move(56);
  check("well past it, right", w.eval("whWay4()")==="right");
  // eight ways, with the same give
  P.move(45);
  check("the eighth between: up then right", w.eval("whWays8().join()")==="up,right");
  P.move(135);
  check("down the other diagonal: down then right", w.eval("whWays8().join()")==="down,right");
  // let go: the touch ends, the angle holds where it was
  events=[]; P.lift();
  check("lifted, it isn't touched and the angle holds", events.length===1 && mc.wheel.touched===false && near(mc.wheel.angle, P.value(135)/128));
  check("untouched, the layer reads nothing", w.eval("whAngle().on")===false && w.eval("whTurn()")===0 && w.eval("whWay4()")===null && w.eval("whWays8().length")===0);
  P.lift();
  check("lifted again isn't a change", events.length===1);
  // a bearing with no landing first (the landing missed) still counts as a touch
  P.move(180);
  check("a bearing alone is a touch", mc.wheel.touched===true && near(mc.wheel.angle, .5));
  // in single port mode the same CCs come down the chord port, through handle()
  P.lift(); events=[];
  mc.handle([0xB0,24,127]); mc.handle([0xB0,23,P.value(90)]);
  check("the chord port's path reads them too", events.length===2 && mc.wheel.touched===true && near(mc.wheel.angle, .25));
  // the ring's notes are still notes
  let plucked=null; mc.addEventListener("harp", e=>plucked=e.detail.note);
  mc._harp([0x90,60,100]);
  check("a ring note is still a harp note", plucked===60);
  // the plate changed in a dump while a finger was down: the touch is let go, the angle holds
  events=[];
  const d=[0xF0]; for(let a=0;a<256;a++){ const v=a===243 ? 0 : Math.max(0,Math.min(16383, mc.params[a]|0)); d.push(v&127, v>>7); } d.push(0xF7);
  mc._dump(d); await sleep(50);
  check("the plate changed: the finger counts as gone", mc.params[243]===0 && mc.wheel.touched===false && events.some(e=>e.touched===false));
  // without the plate nothing listens
  P.connect({on:false}); await sleep(100);
  events=[];
  check("without the plate the layer is off", w.eval("whOn()")===false);
  P.land(90);
  check("and the CCs say nothing", events.length===0 && mc.wheel.touched===false);
  mc.handle([0xB0,23,64]);
  check("down the chord port too", events.length===0 && mc.wheel.touched===false);
  t.done();
})();
