// Playing with no minichord: the computer keyboard becomes one. Its three letter rows are the chord
// buttons (two held in a column give the sevenths and the rest, another column under a chord a slash),
// shift is the modifier, the number row
// plucks the harp; a game plays unaltered and sets its settings on the virtual instrument; its letter
// controls step aside; and a score made this way stays on this computer's board.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {w, d, sleep, check, mc}=t;
  await sleep(200);
  w.eval("keyboardMinichord(true)"); await sleep(100);
  check("with no minichord, the keyboard is one", mc.virtual===true && w.eval("canWrite()")===true && !!d.getElementById("kbcard"));
  w.eval("window.__heard=[]; mc.addEventListener('chord', e=>window.__heard.push(e.detail.map(v=>v.pitch).join()))");
  const said=()=>(d.querySelector(".kbnow")||{}).textContent;
  t.key("KeyW"); await sleep(80);
  check("a key in the major row plays that column's chord", said()==="C" && w.eval("window.__heard.length")===1, `${said()} · ${w.eval("window.__heard[0]")}`);
  t.key("KeyX"); await sleep(100);
  check("held with the seventh row, a major seventh", said()==="Cmaj7", said());
  w.eval("document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyX'})); document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}))"); await sleep(80);
  t.key("KeyS"); await sleep(100);
  check("the minor row, the same column", said()==="Cm", said());
  t.key("KeyA"); await sleep(120);
  check("a second column held under it makes a slash chord, as on the instrument", said()==="Cm/F", said());
  w.eval("document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyA'})); document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyS'}))"); await sleep(80);
  // the harp
  w.eval("window.__plucked=null; mc.addEventListener('harp', e=>window.__plucked=e.detail.note)");
  t.key("Digit1"); await sleep(40);
  check("the number row plucks the harp", w.eval("window.__plucked")===60, String(w.eval("window.__plucked")));
  // a game plays, and sets its settings on the virtual instrument
  // playing a chord on the title screen starts a game, as it does with a real minichord
  for(let i=0;i<40 && w.eval("blast.phase")!=="play";i++){
    const ov=t.overlay();
    if(ov){ const lv=[...ov.querySelectorAll(".levels button")].filter(b=>!b.disabled); if(lv.length){ lv[0].click(); } else t.key("KeyJ"); }
    await sleep(60);
  }
  const a=w.eval("blast");
  check("a chord on the title screen starts a game, as a minichord's does", a.phase==="play");
  check("a game sets up against it as if it were a minichord", Object.keys(w.eval("borrowed")).length>0 && mc.params[35]!==undefined);
  // its letter controls step aside: S is the instrument, the arrows steer
  // S is the instrument here, not "down": the snake keeps its heading
  a.queue.length=0; const dir0=a.dir; t.key("KeyS"); await sleep(40);
  check("the game's letter controls step aside for the instrument", a.dir===dir0 && !a.queue.length, `${dir0} → ${a.dir}, ${a.queue.length} turns queued`);
  // the arrows still steer: the turn is queued, then taken on the next step
  t.key(a.dir==="right"||a.dir==="left" ? "ArrowUp" : "ArrowLeft");
  let turned=a.queue.length>0; for(let i=0;i<30 && !turned;i++){ await sleep(40); turned=a.queue.length>0 || a.dir!==dir0; }
  check("but the arrows still steer", turned, `${dir0} → ${a.dir}`);
  check("and a score made this way stays on this computer's board", w.eval("mc.virtual")===true && w.eval("typeof scoresOnline==='function'"));
  w.eval("keyboardMinichord(false)"); await sleep(50);
  check("put away, the page is as it was", !mc.virtual && !d.getElementById("kbcard"));
  t.done();
})();
