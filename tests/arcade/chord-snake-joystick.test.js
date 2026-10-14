// Chord Snake on the joystick plate: the stick turns it (the arcade's edge path, a push as the layout's
// string), B drops the oldest note, and A held is the burst: twice the speed, and a cash-in made at it
// scores half as much again. Without the plate, A does nothing and the snake keeps its pace.
const t=require("./harness").load("chord-snake");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check, chord}=t;
  await sleep(150); P.connect(); await sleep(100);
  check("the plate is seen", w.eval("jsOn()"));
  const a=await t.start(0); P.freeze();
  const tick=now=>w.snTick(now);
  // the stick turns it, as the harp's d-pad does
  a.queue=[]; a.dir="right"; P.push("up");
  check("a push up turns the snake up", a.queue.join()==="up", a.queue.join());
  P.push("rest"); P.push("down");
  check("a push the opposite way of the turn waiting doesn't double back", a.queue.join()==="up", a.queue.join());
  P.push("rest"); P.push("left");
  check("another way queues behind it", a.queue.join()==="up,left", a.queue.join());
  P.push("rest"); a.queue=[];
  // B drops the oldest note
  a.tail=[{name:"C",pc:0},{name:"E",pc:4}]; const [hx,hy]=a.body[0]; a.body=[[hx,hy],[hx-1,hy],[hx-2,hy],[hx-3,hy],[hx-4,hy]];
  P.press("b");
  check("B drops the oldest note", a.tail.length===1 && a.tail[0].name==="C", a.tail.map(n=>n.name).join());
  // the pace: a step every stepMs (with 3% a carried note), half that with A held
  a.tiles=[]; a.tail=[]; a.body=[[2,2],[1,2],[0,2]]; a.dir="right"; a.queue=[]; a.cols=40; a.rows=20;
  let now=w.performance.now(); a.nextMove=now; tick(now);
  const gap=()=>a.nextMove-now;
  check("at its own pace a step every stepMs", Math.abs(gap()-a.stepMs)<1 && !a.burst, `${gap()} vs ${a.stepMs}`);
  P.button("a", true); now+=10; tick(now);
  check("A pressed between steps: this step comes at burst speed too", a.burst && Math.abs(a.nextMove-(now-10+a.stepMs/2))<1, `${a.nextMove-now+10}`);
  now=a.nextMove; tick(now);
  check("A held: a step every half stepMs", Math.abs(gap()-a.stepMs/2)<1 && a.burst, `${gap()}`);
  check("the head's ablaze", /box-shadow/.test(a.boardEl.querySelector(".snseg.head").style.cssText));
  // a cash-in made at burst speed: half as much again
  a.tail=[{name:"C",pc:0},{name:"E",pc:4},{name:"G",pc:7}]; a.body=[[8,2],[7,2],[6,2],[5,2],[4,2],[3,2]];
  let s0=a.score; chord("C");
  const fast=a.score-s0;
  P.button("a", false); now=a.nextMove; tick(now);
  check("let go, the pace comes back", !a.burst && Math.abs(gap()-a.stepMs)<1);
  a.tail=[{name:"C",pc:0},{name:"E",pc:4},{name:"G",pc:7}]; a.body=[[8,2],[7,2],[6,2],[5,2],[4,2],[3,2]];
  s0=a.score; chord("C"); const plain=a.score-s0;
  check("a cash-in at burst speed scores half as much again", plain>0 && fast===Math.round(plain*1.5), `${fast} vs ${plain}`);
  check("the rules say the stick steers and A bursts", /STICK/.test(w.eval("SNMENU_G.rules()")) && /BURST/.test(w.eval("SNMENU_G.rules()")));
  // without the plate
  P.connect({on:false}); await sleep(100);
  check("no plate, no joystick", !w.eval("jsOn()"));
  P.button("a", true); now=a.nextMove; tick(now);
  check("without the plate A held is no burst", !a.burst && Math.abs(gap()-a.stepMs)<1);
  P.button("a", false);
  check("and the rules speak of the harp", /HARP/.test(w.eval("SNMENU_G.rules()")) && !/STICK/.test(w.eval("SNMENU_G.rules()")));
  sb.restoreAll();
  t.done();
})();
