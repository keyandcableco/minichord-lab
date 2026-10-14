// Chord Asteroids on the joystick plate, and its glides. The ship glides round its orbit (and, in manual
// aim, turns to face) the short way, whatever steers it: never more than half a turn. Auto aim: where
// the stick points (pushed past half way) is where the ship sits on its orbit, and let go, it stays.
// Manual aim: where it points is where the ship faces, the orbit left alone; A and B held fly the orbit
// anticlockwise and clockwise at 2.5 radians a second. Without the plate the stick changes nothing.
const t=require("./harness").load("chord-asteroids");
const P=require("./analog-plate").plateOf(t);
(async()=>{
  const {w, sleep, check}=t;
  const tick=now=>w.asTick(now), deg=x=>x*Math.PI/180, TAU=2*Math.PI;
  const turn=(a,b)=>w.eval(`asTurn(${a},${b})`), same=(a,b,e=.02)=>Math.abs(turn(a,b))<=e;
  await sleep(150); P.connect(); await sleep(100);
  let a=await t.start(0); P.freeze(); a.next=Infinity; a.rocks.forEach(r=>r.dead=true);
  // the short way round: from just below the right to just above it, a lap's worth apart in numbers
  a.orbitA=.1; a.orbitWant=TAU-.1; let far=0;
  P.drive(now=>{ tick(now); far=Math.max(far, Math.abs(turn(a.orbitA, 0))); }, 800);
  check("the orbit glides the short way round, a lap apart or not", same(a.orbitA, -.1) && far<=.11, `went ${far.toFixed(2)} from the right`);
  // auto aim: the stick is where the ship sits
  P.toward(0); P.drive(tick, 800);
  check("pushed up, the ship flies round to the top", same(a.orbitA, -Math.PI/2) && a.cy<a.hy && Math.abs(a.cx-a.hx)<2, `${a.orbitA.toFixed(2)}`);
  check("the want kept within half a turn of the ship", Math.abs(a.orbitWant-a.orbitA)<=Math.PI);
  P.stick(0,0); P.drive(tick, 300);
  check("let go, it stays at the top", same(a.orbitA, -Math.PI/2));
  P.toward(deg(270)); P.drive(tick, 800);
  check("pushed left, round to the left", same(a.orbitA, Math.PI) && a.cx<a.hx);
  P.toward(deg(90), .4); P.drive(tick, 400);
  check("a small push doesn't move it", same(a.orbitA, Math.PI));
  P.toward(deg(160)); P.drive(tick, 800);
  check("anywhere round, not only four ways", same(a.orbitA, deg(160)-Math.PI/2));
  P.stick(0,0);
  // manual aim
  w.eval("saved.asAim=1; beginAsteroids(0)"); a=w.eval("blast"); a.next=Infinity;
  P.drive(tick, 200); const orbit=a.orbitA??Math.PI/2;
  P.toward(deg(90)); P.drive(tick, 600);
  check("manual aim: the stick points the ship", same(a.shipAng, 0), a.shipAng.toFixed(2));
  check("and leaves the orbit alone", same(a.orbitA??Math.PI/2, orbit));
  P.toward(deg(-135)); P.drive(tick, 600);
  check("pointed down-left: it faces down-left, the short way", same(a.shipAng, deg(135)), a.shipAng.toFixed(2));
  P.stick(0,0); P.drive(tick, 200); const aim=a.shipAng;
  P.drive(tick, 300);
  check("let go, it keeps facing that way", same(a.shipAng, aim));
  // the aim's glide wraps too, whatever sets it
  a.shipAng=.1; a.aimWant=TAU-.1; far=0; P.drive(now=>{ tick(now); far=Math.max(far, Math.abs(turn(a.shipAng, 0))); }, 600);
  check("the aim turns the short way round too", same(a.shipAng, -.1) && far<=.11, far.toFixed(2));
  // A and B held fly the orbit
  const w0=a.orbitWant??a.orbitA??Math.PI/2;
  P.button("a", true); P.drive(tick, 400, 20); P.button("a", false);
  check("A held flies the orbit anticlockwise, 2.5 radians a second", Math.abs(a.orbitWant-(w0-1))<.02, (a.orbitWant-w0).toFixed(2));
  const w1=a.orbitWant; P.button("b", true); P.drive(tick, 200, 20); P.button("b", false); P.drive(tick, 100, 20);
  check("B held, clockwise", Math.abs(a.orbitWant-(w1+.5))<.02, (a.orbitWant-w1).toFixed(2));
  // without the plate
  P.connect({on:false}); await sleep(100);
  w.eval("saved.asAim=0; beginAsteroids(0)"); a=w.eval("blast"); a.next=Infinity;
  P.drive(tick, 200); const o0=a.orbitWant;
  P.toward(0); P.drive(tick, 400);
  check("without the plate the stick doesn't fly the ship", a.orbitWant===o0);
  P.stick(0,0);
  if(P.standIn()) console.log("  (the shared joystick layer wasn't there: the test's stand-in played it)");
  t.done();
})();
