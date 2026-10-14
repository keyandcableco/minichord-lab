// Chord Asteroids on the joystick plate, and its glides. The ship glides round its orbit (and, in manual
// aim, turns to face) to its want as it is, so a knob flicked faster than the glide is followed its own
// way round; the wants that jump (the stick, a knob after laps steered by something else, the demo's
// end) are each kept within half a turn of the ship, so the glide goes the short way to them. Auto aim: where
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
  // the glide follows a want as it's set, laps and all: a knob flicked faster than the ship glides is
  // followed round its own way, never back the short way against it
  w.eval("asKnob(.2)"); P.drive(tick, 1000); const k0=a.orbitA; let back=0, prev=k0;
  w.eval("asKnob(.5); asKnob(.8)");
  P.drive(now=>{ tick(now); back=Math.min(back, a.orbitA-prev); prev=a.orbitA; }, 1000);
  check("a knob flicked from 0.2 to 0.8 in a frame: the ship follows it round its way, never back", back>=0 && Math.abs(a.orbitA-k0-1.2*Math.PI)<.02, `${(a.orbitA-k0).toFixed(2)} round, back ${back.toFixed(3)}`);
  // steered laps round by something else, the knob's next report is the nearest lap of where it points
  a.orbitA=a.orbitWant=6*Math.PI+.3; let far=0;
  w.eval("asKnob(.3)"); P.drive(now=>{ tick(now); far=Math.max(far, Math.abs(a.orbitA-(6*Math.PI+.3))); }, 800);
  check("laps from the knob's own, its next turn goes to the nearest lap, not round them all", far<.1 && same(a.orbitA, .1*Math.PI), `went ${far.toFixed(2)}`);
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
  // the aim knob the same: laps from its own, the nearest lap
  a.shipAng=a.aimWant=4*Math.PI+.1; far=0; w.eval("asAim(.5)");
  P.drive(now=>{ tick(now); far=Math.max(far, Math.abs(a.shipAng-(4*Math.PI+.1))); }, 600);
  check("the aim knob after laps: the nearest lap, not round them all", same(a.shipAng, -Math.PI/2) && far<=Math.PI, far.toFixed(2));
  // A and B held fly the orbit
  const w0=a.orbitWant??a.orbitA??Math.PI/2;
  P.button("a", true); P.drive(tick, 400, 20); P.button("a", false);
  check("A held flies the orbit anticlockwise, 2.5 radians a second", Math.abs(a.orbitWant-(w0-1))<.02, (a.orbitWant-w0).toFixed(2));
  const w1=a.orbitWant; P.button("b", true); P.drive(tick, 200, 20); P.button("b", false); P.drive(tick, 100, 20);
  check("B held, clockwise", Math.abs(a.orbitWant-(w1+.5))<.02, (a.orbitWant-w1).toFixed(2));
  // the demo's end sends the ship home the short way
  a.orbitA=a.orbitWant=4*Math.PI+Math.PI/2+.4; w.eval("blast.demo={el:document.createElement('div')}; endAsDemo(blast.demo)");
  check("the demo's end: home the short way, not laps round", same(a.orbitWant, Math.PI/2) && Math.abs(a.orbitWant-a.orbitA)<=Math.PI, (a.orbitWant-a.orbitA).toFixed(2));
  // without the plate
  P.connect({on:false}); await sleep(100);
  w.eval("saved.asAim=0; beginAsteroids(0)"); a=w.eval("blast"); a.next=Infinity;
  P.drive(tick, 200); const o0=a.orbitWant;
  P.toward(0); P.drive(tick, 400);
  check("without the plate the stick doesn't fly the ship", a.orbitWant===o0);
  P.stick(0,0);
  t.done();
})();
