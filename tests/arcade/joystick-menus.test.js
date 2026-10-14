// The menus on the joystick plate: a title screen wakes at the stick or a button (but not at the rest
// report the minichord sends as "knobs send MIDI" comes on, nor the knobs' first reports); on the
// options the stick moves from line to line (repeating while held) and left and right change one; A
// presses a line, or with none chosen goes on to the levels, as Enter does; B goes back, as Escape does;
// A on a level starts it. Game over the same, and a demo is skipped.
const T=require("./harness").load("chord-snake");
(async()=>{
  const {w, d, mc, sleep, check, stick, button}=T;
  await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(150);
  const ov=()=>w.eval("blast.overlay"), stage=()=>ov().dataset.stage, page=()=>ov().dataset.optpage;
  const focused=()=>{ const a=d.activeElement; return a ? (a.dataset.opt || a.textContent.trim().slice(0,24)) : ""; };
  const push=async (x,y)=>{ stick(x,y); await sleep(5); stick(0,0); await sleep(5); };
  const press=async b=>{ button(b); await sleep(5); button(b,false); await sleep(5); };
  check("a title screen, waiting", stage()==="title");
  // what "knobs send MIDI" coming on sends: the stick at rest, the buttons up, the knobs where they are
  mc.handle([0xB0,112,64]); mc.handle([0xB0,113,64]); for(const c of [114,115,116]) mc.handle([0xB0,c,0]);
  for(const c of [20,21,22]) mc.handle([0xB0,c,90]); await sleep(10);
  check("the rest report as the stick's sent, and the knobs' first: it still waits", stage()==="title");
  check("its prompt says the stick", /MOVE THE STICK/.test(d.querySelector(".cabpress").textContent), d.querySelector(".cabpress").textContent);
  stick(.4,0); await sleep(5); stick(0,0); await sleep(5);
  check("a real move wakes it: the options", stage()==="options" && page()==="options");
  check("the options' hint says the stick", /THE STICK/.test(d.querySelector(".cab-optpage .opthint").textContent));
  await push(0,-.9);
  check("down: the first line", !!focused(), focused());
  const first=focused();
  await push(0,-.9);
  check("down again: the next", focused() && focused()!==first, `${first} → ${focused()}`);
  // to the speed, and change it
  for(let i=0;i<12 && focused()!=="speed";i++) await push(0,-.9);
  check("found the speed line", focused()==="speed");
  const sp=w.eval("+saved.speed||0");
  await push(.9,0);
  check("right changes it", w.eval("+saved.speed||0")===(sp+1)%5, `${sp} → ${w.eval("+saved.speed||0")}`);
  await push(-.9,0);
  check("left changes it back", w.eval("+saved.speed||0")===sp);
  // held: it repeats
  const at=()=>[...d.querySelectorAll(".cab-optpage button")].indexOf(d.activeElement);
  await push(0,.9); await push(0,.9); await push(0,.9);
  const a0=at(); stick(0,-.9); await sleep(1100); stick(0,0); await sleep(5);
  check("held down, it carries on down the list", at()-a0>=3, `${a0} → ${at()}`);
  // the harp layout's line, on the plate
  const harp=d.querySelector('.opt[data-opt="harp"]');
  check("the HARP line says JOYSTICK, and nothing else", harp && /JOYSTICK/.test(harp.textContent), harp && harp.textContent);
  const lay=w.eval("saved.harpLayout||'strip'"); harp.focus(); await push(.9,0);
  check("and stepping it changes nothing", w.eval("saved.harpLayout||'strip'")===lay && /JOYSTICK/.test(d.querySelector('.opt[data-opt="harp"]').textContent));
  check("no HARP SOUND line on the plate", !d.querySelector('.opt[data-opt="harpSound"]'));
  // A with nothing chosen: on to the levels
  d.activeElement && d.activeElement.blur();
  await press("a");
  check("A, nothing chosen: the levels, the first chosen", page()==="levels" && !!d.activeElement?.closest(".levels"), focused());
  await push(0,-.9);
  check("down: the next level", [...d.querySelectorAll(".cab-levelpage .levels button")].indexOf(d.activeElement)===1);
  await press("b");
  check("B: back to the options", page()==="options");
  await press("a"); await push(0,.9);
  check("A again, and up: the first level", [...d.querySelectorAll(".cab-levelpage .levels button")].indexOf(d.activeElement)===0);
  await press("a"); await sleep(150);
  check("A on a level starts it", w.eval("blast.phase")==="play" && w.eval("blast.level")===0);
  // game over: the stick and A again
  w.eval("blast.lives=1; snCrash('TEST')"); await sleep(4200);
  if(w.eval("blast.hsEntry")) w.eval("blast.hsEntry.skip()");
  await sleep(100);
  check("game over", w.eval("blast.phase")==="over" && !!ov(), w.eval("blast.phase"));
  await push(0,-.9);
  check("down: PLAY AGAIN first", /PLAY AGAIN/.test(d.activeElement?.textContent||""), focused());
  await press("a"); await sleep(150);
  check("A plays again", w.eval("blast.phase")==="play");
  // a demo: the stick skips it
  w.eval("stopBlaster(); nextQuestion()"); await sleep(200);
  w.eval("DEMO_FOR[cabKind()]()"); await sleep(300);
  check("a demo running", w.eval("blast.phase")==="demo");
  await press("a"); await sleep(300);
  check("A skips it", w.eval("blast.phase")!=="demo", w.eval("blast.phase"));
  T.done();
})();
