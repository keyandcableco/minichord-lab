// Chord Sweeper on the joystick plate: in play the game reads the stick itself (blast.jsOwn), a cursor
// eight ways, a diagonal moving both: a step at once, then after 250 ms every 110 ms; a flick through
// one axis on its way into a diagonal and out is one diagonal step. A sweeps, B flags;
// at NEXT FIELD, A goes on (through the edge path), and that press isn't a sweep too. Without the
// plate the stick does nothing.
const t=require("./harness").load("chord-sweeper");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); P.freeze();
  check("in play the game claims the stick", a.jsOwn===true);
  const tick=now=>w.swTick(now), at=()=>a.cur.join();
  a.cur=[3,2]; let now=w.performance.now(); tick(now);
  P.push("right"); now+=1; tick(now);
  check("a push right steps at once, once", at()==="4,2", at());
  now=P.drive(tick, 240, 10, now);
  check("held, nothing more till 250 ms", at()==="4,2", at());
  now=P.drive(tick, 20, 10, now);
  check("then it repeats", at()==="5,2", at());
  now=P.drive(tick, 110, 10, now);
  check("every 110 ms", at()==="6,2", at());
  P.push("rest"); now+=10; tick(now);
  a.cur=[3,2]; P.stick(-.9,.9); now+=10; tick(now);
  check("up-left: a diagonal step", at()==="2,1", at());
  P.push("rest"); now+=10; tick(now);
  // a thumb's flick up-right, a frame at a time: y ahead of x going out, x let go first coming back
  a.cur=[3,3]; const path=[];
  for(const [x,y] of [[0,.3],[.2,.6],[.6,.9],[.7,.9],[.2,.7],[0,.3],[0,0]]){ P.stick(x,y); now+=16; tick(now); path.push(at()); }
  check("a flick up-right through its one-axis states: one step up-right, never up twice", at()==="4,2" && !path.some(p=>/,1$/.test(p)), path.join(" "));
  // up-right held and right let go: no step for the letting go, and up repeats on
  a.cur=[3,3]; P.stick(.9,.9); now+=16; tick(now);
  check("up-right from rest: a diagonal step at once", at()==="4,2", at());
  P.stick(0,.9); now+=16; tick(now);
  check("right let go: no step", at()==="4,2", at());
  now=P.drive(tick, 250, 10, now);
  check("up still held repeats up", at()==="4,1", at());
  // a way added well after the first step is a step of its own, diagonal
  P.stick(.9,.9); now+=16; tick(now);
  check("right added later: a diagonal step at once", at()==="5,0", at());
  P.push("rest"); now+=10; tick(now);
  a.cur=[0,0]; P.push("up"); now+=10; tick(now);
  check("at the edge it stays on the field", at()==="0,0");
  P.push("rest"); now+=10; tick(now);
  // A sweeps, B flags
  a.cur=[6,4]; P.press("b");
  check("B flags", a.flags.has(w.eval("swKey(6,4)")));
  P.press("b");
  check("and again unflags", !a.flags.has(w.eval("swKey(6,4)")));
  a.cur=[0,0]; const n0=a.open.size; P.press("a");
  check("A sweeps the first square (the mines laid round it)", a.open.size>n0 && a.mines.length>0, `${a.open.size} open`);
  // the strip moves nothing
  const c0=at(); P.note(0); P.note(11); P.note(6);
  check("the strip moves nothing and sweeps nothing", at()===c0);
  // a mine goes off: at NEXT FIELD, A goes on, and only that
  const m=a.mines[0]; a.cur=[m.x,m.y]; P.press("a");
  check("a mine swept goes off", a.phase==="reveal");
  await sleep(1900);
  check("the field shown, NEXT FIELD waits", a.phase==="next");
  a.cur=[0,0];
  P.press("a"); await sleep(20);
  check("A goes on to the next field", a.phase==="play");
  check("and the same press sweeps nothing", a.open.size===0, `${a.open.size} open`);
  check("the rules say the stick", /THE STICK/.test(w.eval("SWMENU_G.rules()")));
  // without the plate
  P.connect({on:false}); await sleep(100);
  a.cur=[3,2]; P.push("right"); now+=10; tick(now); now=P.drive(tick, 400, 10, now); P.press("a"); P.press("b");
  check("without the plate the stick and A and B do nothing", at()==="3,2" && a.open.size===0 && a.flags.size===0);
  P.push("rest");
  t.note(3);
  check("and the harp steers as ever", at()==="4,2", at());
  sb.restoreAll();
  t.done();
})();
