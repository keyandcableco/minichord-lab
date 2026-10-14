// Key Racer on the joystick plate: STEER offers STICK (a quarter more) only there; with it the stick is
// a wheel by speed (2.4 of the road's half-width a second at a full push, the square of a smaller one,
// clamped just off the road), letting go holds the line, and the stick pulled down brakes to half the
// top speed; the strip and the knobs don't steer then. The rules say the strip's bottom is the road's
// left. Without the plate STICK isn't offered, and a STICK chosen before steers on the harp.
const t=require("./harness").load("key-racer");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check, note, knob}=t;
  const step=(secs, dt=.02)=>{ for(let k=0;k<Math.round(secs/dt);k++) w.krStep(dt); }, near=(a,b,e)=>Math.abs(a-b)<=e;
  const steerVals=()=>w.eval(`ARCADE_OPTS.find(o=>o.id==="steer").vals("racer").map(v=>v[0]).join(" ")`);
  await sleep(150); P.connect(); await sleep(100);
  check("on the plate STEER offers the stick", steerVals()==="HARP KNOB STICK", steerVals());
  check("the rules say the strip's bottom is the road's left", /THE STRIP: ITS BOTTOM IS THE LEFT OF THE ROAD/.test(w.eval("KRMENU_G.rules()")));
  w.eval(`optSet("steer", 2)`);
  check("STICK chosen: the stick steers, a quarter more", w.eval("krSteer()")==="stick" && saved().krSteer===2 && w.eval(`optGet(ARCADE_OPTS.find(o=>o.id==="steer"),"racer")`)===2);
  function saved(){ return w.eval("saved"); }
  const a=await t.start(0); P.freeze();
  for(let i=0;i<60 && !a.segs.length;i++) await sleep(50);
  check("the mult counts it", a.mult>=1.25, a.mult);
  // an empty road: nothing to drive through, nobody ahead, no line, no clock
  const clear=()=>Object.assign(a, {cars:[], rowAt:new w.Map(), capAt:new w.Map(), checks:[], finishZ:0, time:null, spinUntil:0, boostUntil:0});
  Object.assign(a, {st:"race", x:0, targetX:0, speed:a.max}); clear();
  P.stick(1); step(.24);
  check("a full push right: the wheel turns 2.4 a second", near(a.targetX, 2.4*.24, .01), a.targetX.toFixed(3));
  P.stick(0); const line=a.targetX; step(.5);
  check("let go, it holds the line", a.targetX===line && near(a.x, line, .01));
  a.targetX=0; P.stick(-.5); const x=w.eval("jsXY().x"); step(.5);
  check("half a push left: slower, the square of it", near(a.targetX, -x*x*2.4*.5, .01), `${a.targetX.toFixed(3)} (x ${x.toFixed(2)})`);
  P.stick(1); step(2);
  check("held over, it stops just off the road", a.targetX===1.12);
  P.stick(0); a.targetX=a.x=0; step(.2);
  // the brake (no rival ahead to hold it back)
  clear(); a.speed=a.max; P.stick(0,-1); step(3);
  check("pulled down, it brakes to half the top speed", near(a.speed, a.max*.5, a.max*.03), (a.speed/a.max).toFixed(2));
  P.stick(0,0); clear(); step(3);
  check("let go, it's back up to speed", a.speed>a.max*.9, (a.speed/a.max).toFixed(2));
  // the strip and the knob leave it alone
  a.targetX=0; note(0); knob(0);
  check("the strip and the knobs don't steer with the stick", a.targetX===0);
  // without the plate
  P.connect({on:false}); await sleep(100);
  check("without the plate STEER doesn't offer it", steerVals()==="HARP KNOB", steerVals());
  check("and a STICK chosen before steers on the harp", w.eval("krSteer()")==="harp" && w.eval(`optGet(ARCADE_OPTS.find(o=>o.id==="steer"),"racer")`)===0);
  a.targetX=0; P.stick(1); step(.25);
  check("the stick does nothing", a.targetX===0);
  note(0);
  check("the harp steers", a.targetX<-1);
  P.stick(0); clear(); a.x=a.targetX=0; a.speed=a.max; P.stick(0,-1); step(2);
  check("nor does it brake", a.speed>a.max*.9);
  P.stick(0,0);
  if(P.standIn()) console.log("  (the shared joystick layer wasn't there: the test's stand-in played it)");
  t.done();
})();
