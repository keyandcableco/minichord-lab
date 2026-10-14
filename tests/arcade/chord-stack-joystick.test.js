// Chord Stack on the joystick plate: in play the game reads the stick itself (blast.jsOwn), as a
// falling-block game's d-pad: left and right step at once, then repeat after 170 ms every 50 ms; down
// drops a row and repeats every 40 ms; up rotates once a push; A rotates, B slams. The edge path and the
// strip move nothing then (no double steps). Without the plate, the stick and its buttons do nothing.
const t=require("./harness").load("chord-stack");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); P.freeze();
  check("in play the game claims the stick", a.jsOwn===true);
  const tick=now=>w.stTick(now);
  const fresh=()=>{ a.grid=w.eval("stEmpty()"); a.piece={kind:"T", cells:[[0,0],[1,0],[2,0],[1,1]], notes:[0,4,7,9], x:4, y:2}; a.nextFall=1e15; };
  fresh(); let now=w.performance.now(); tick(now);
  P.push("left"); now+=1; tick(now);
  check("a push left steps at once, once", a.piece.x===3, `x ${a.piece.x}`);
  now=P.drive(tick, 160, 10, now);
  check("held, nothing more till 170 ms", a.piece.x===3, `x ${a.piece.x}`);
  now=P.drive(tick, 20, 10, now);
  check("then it repeats", a.piece.x===2, `x ${a.piece.x}`);
  now=P.drive(tick, 100, 10, now);
  check("every 50 ms", a.piece.x===0, `x ${a.piece.x}`);
  P.push("rest"); now+=10; tick(now);
  fresh(); P.push("right"); now+=10; tick(now); now=P.drive(tick, 100, 10, now);
  check("let go and pushed again: a step at once, the repeat waiting again", a.piece.x===5, `x ${a.piece.x}`);
  P.push("rest"); now+=10; tick(now);
  fresh(); const y0=a.piece.y; P.push("down"); now+=1; tick(now);
  check("down drops a row at once", a.piece.y===y0+1);
  now=P.drive(tick, 120, 10, now);
  check("held, it keeps dropping, a row every 40 ms", a.piece.y===y0+4, `${a.piece.y-y0} rows`);
  P.push("rest"); now+=10; tick(now);
  fresh(); const cells=JSON.stringify(a.piece.cells); P.push("up"); now+=1; tick(now);
  const turned=JSON.stringify(a.piece.cells);
  check("up rotates", turned!==cells);
  now=P.drive(tick, 400, 10, now);
  check("once a push, never repeating", JSON.stringify(a.piece.cells)===turned);
  P.push("rest"); now+=10; tick(now);
  fresh(); P.press("a");
  check("A rotates", JSON.stringify(a.piece.cells)!==cells);
  fresh(); const locked=()=>a.grid.flat().filter(Boolean).length; P.press("b");
  check("B slams it to the bottom", locked()===4 && a.grid[17].some(Boolean));
  fresh(); P.note(3); P.note(7); P.note(6);
  check("the strip moves nothing", a.piece.x===4 && JSON.stringify(a.piece.cells)===cells);
  check("the rules say the stick", /THE STICK/.test(w.eval("STMENU_G.rules()")));
  a.phase="menu";
  check("out of play the stick isn't claimed (title screens, initials)", a.jsOwn===false);
  a.phase="play";
  // without the plate
  P.connect({on:false}); await sleep(100);
  fresh(); P.push("left"); now+=10; tick(now); now=P.drive(tick, 300, 10, now); P.press("a"); P.press("b");
  check("without the plate the stick and A and B do nothing", a.piece.x===4 && JSON.stringify(a.piece.cells)===cells && a.grid.flat().every(c=>!c));
  P.push("rest");
  t.note(3); 
  check("and the harp steers as ever", a.piece.x===5, `x ${a.piece.x}`);
  sb.restoreAll();
  t.done();
})();
