// Key Racer on the arcade wheel: STEER offers WHEEL (a quarter more) only there; with it the ring is
// a steering wheel by how far it's turned from the top (2.4 of the road's half-width a second at a
// quarter turn, the square of less, nothing past the quarter), letting go holds the line, and the
// strip and the knobs don't steer then. Without the plate WHEEL isn't offered, and a WHEEL chosen
// before steers on the harp.
const t=require("./harness").load("key-racer");
const P=require("./wheel-plate").wheelOf(t);
(async()=>{
  const {w, sleep, check, note, knob}=t;
  const step=(secs, dt=.02)=>{ for(let k=0;k<Math.round(secs/dt);k++) w.krStep(dt); }, near=(a,b,e)=>Math.abs(a-b)<=e;
  const steerVals=()=>w.eval(`ARCADE_OPTS.find(o=>o.id==="steer").vals("racer").map(v=>v[0]).join(" ")`);
  function saved(){ return w.eval("saved"); }
  await sleep(150); P.connect(); await sleep(100);
  check("on the plate STEER offers the wheel", steerVals()==="HARP KNOB WHEEL", steerVals());
  check("the rules say the wheel steers", /STEER ON THE WHEEL/.test(w.eval("KRMENU_G.rules()")));
  w.eval(`optSet("steer", 2)`);
  check("WHEEL chosen: the wheel steers, a quarter more", w.eval("krSteer()")==="wheel" && saved().krSteer===2 && w.eval(`optGet(ARCADE_OPTS.find(o=>o.id==="steer"),"racer")`)===2);
  const a=await t.start(0); P.freeze();
  for(let i=0;i<60 && !a.segs.length;i++) await sleep(50);
  check("the mult counts it", a.mult>=1.25, a.mult);
  // an empty road: nothing to drive through, nobody ahead, no line, no clock
  const clear=()=>Object.assign(a, {cars:[], rowAt:new w.Map(), capAt:new w.Map(), checks:[], finishZ:0, time:null, spinUntil:0, boostUntil:0});
  Object.assign(a, {st:"race", x:0, targetX:0, speed:a.max}); clear();
  P.land(90); step(.24);
  check("a quarter turn right: full lock, 2.4 a second", near(a.targetX, 2.4*.24, .01), a.targetX.toFixed(3));
  P.lift(); const line=a.targetX; step(.5);
  check("let go, it holds the line", a.targetX===line && near(a.x, line, .01));
  a.targetX=0; P.land(315); const turn=w.eval("whTurn()")/(Math.PI/2); step(.5);
  check("an eighth of a turn left: slower, the square of it", near(a.targetX, -turn*turn*2.4*.5, .01), `${a.targetX.toFixed(3)} (turn ${turn.toFixed(2)})`);
  P.move(120); a.targetX=0; step(.24);
  check("past the quarter turn it adds nothing: still full lock", near(a.targetX, 2.4*.24, .01), a.targetX.toFixed(3));
  P.move(90); step(2);
  check("held over, it stops just off the road", a.targetX===1.12);
  P.move(0); a.targetX=a.x=0; step(.5);
  check("straight up is straight on", a.targetX===0);
  // the strip and the knob leave it alone
  P.lift(); a.targetX=0; note(0); knob(0);
  check("the strip and the knobs don't steer with the wheel", a.targetX===0);
  // without the plate
  P.connect({on:false}); await sleep(100);
  check("without the plate STEER doesn't offer it", steerVals()==="HARP KNOB", steerVals());
  check("and a WHEEL chosen before steers on the harp", w.eval("krSteer()")==="harp" && w.eval(`optGet(ARCADE_OPTS.find(o=>o.id==="steer"),"racer")`)===0);
  a.targetX=0; P.land(90); step(.25);
  check("the bearing does nothing", a.targetX===0);
  note(0);
  check("the harp steers", a.targetX<-1);
  t.done();
})();
