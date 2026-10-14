// Chord Chomp on the joystick plate: the stick is its d-pad (the arcade's edge path, each push the
// layout's string): a push sets the way wanted, a push straight back turns round at once, and the stick
// let go keeps it going. A lets go of a latched chord without playing it again. The strip's places
// don't steer there. Without the plate, the harp's A zone does nothing, as ever.
const t=require("./harness").load("chord-chomp");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check, chord}=t;
  await sleep(150); P.connect(); await sleep(100);
  if(P.standIn()) console.log("  (the shared joystick layer isn't there yet: a stand-in to its contract)");
  const a=await t.start(0); await sleep(1900);
  check("READY, then play", a.st==="go" && a.phase==="play");
  P.push("up"); await sleep(20);
  check("a push up: up is wanted", a.want==="up");
  P.push("rest"); await sleep(20);
  check("the stick let go keeps the way wanted", a.want==="up");
  P.push("down"); await sleep(20);
  check("a push down: down", a.want==="down");
  P.stick(.7,-.6); await sleep(20);
  check("a push that strays to the diagonal doesn't flicker to another way", a.want==="down", a.want);
  P.push("rest"); P.push("left"); await sleep(20);
  check("left", a.want==="left");
  P.push("rest");
  P.note(11); await sleep(20);
  check("a place on the strip isn't a way", a.want==="left");
  // A lets go of a latched chord
  chord("C"); await sleep(20);
  check("a chord played latches", !!a.latched);
  P.press("a"); await sleep(20);
  check("A lets it go", a.latched==null);
  check("the rules say the stick steers and A lets go", /STICK/.test(w.eval("CCMENU_G.rules()")) && /A LETS GO/.test(w.eval("CCMENU_G.rules()")));
  // without the plate: the harp's A zone (string 6 on the strip) does nothing
  P.connect({on:false}); await sleep(100);
  chord("C"); await sleep(20);
  t.note(6); await sleep(20);
  check("without the plate the harp's A leaves the chord latched", !!a.latched);
  check("and the rules speak of the harp", !/STICK/.test(w.eval("CCMENU_G.rules()")));
  sb.restoreAll();
  t.done();
})();
