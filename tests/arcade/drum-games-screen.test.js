// The drum games' screen as the shared arcade code gives it. Trading Fours, an arcade screen of its own
// (pixel.js) but no game that steers on the harp's d-pad, has the field to itself: no room kept for a
// strip it doesn't draw, and in beginner mode only the helper's pads beside it, laid out again as they
// come. And on a phone's screen, whose deck under the drum games is their pads and no chord buttons,
// the levels are only tapped: no chord beside them, and no word of one.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- Trading Fours: the room its screen has
    const T=t.load("trading-fours"), {w, sleep}=T;
    await sleep(150); T.connect({firmware:60}); await sleep(100);
    await T.start(0); await sleep(300);
    const room=()=>w.eval("JSON.stringify(pxRoom())");
    const r0=JSON.parse(room());
    check("in play on a desktop: the whole field's width, no strip's room kept", r0.left===0 && r0.aw===900, room());
    w.eval("blast.layoutKey='laid out'");
    w.eval("optSet('beginner', 1)"); await sleep(20);
    const r1=JSON.parse(room()), hw=w.eval("blast.helpHarp && blast.helpHarp.el.isConnected");
    check("beginner mode: the helper's pads beside it, and only their room kept", hw && r1.left===0 && r1.aw>=900-120 && r1.aw<900, room());
    check("and it lays out again for them", w.eval("blast.layoutKey")!=="laid out", w.eval("blast.layoutKey"));
    w.eval("optSet('beginner', 0)"); await sleep(20);
    check("beginner mode off: the field's width again", JSON.parse(room()).aw===900, room());
  }
  { // ---- Chord Snake, which steers on the d-pad, keeps its strip's room as before
    const T=t.load("chord-snake"), {w, sleep}=T;
    await sleep(150); T.connect({firmware:60}); await sleep(100);
    await T.start(0); await sleep(200);
    const r=JSON.parse(w.eval("JSON.stringify(pxRoom())"));
    check("a d-pad game: the strip's room kept beside it", r.left===8 && r.aw===900-84-8, JSON.stringify(r));
  }
  for(const slug of ["time-pilot","trading-fours"]){ // ---- the levels, on a phone's screen
    const T=t.load(slug), {w, d, sleep, key}=T;
    await sleep(150); w.eval("touchMinichord(true); menuRebuild(blast.menuAgain)"); await sleep(80);   // (as a phone opens it: on the screen from the start)
    key("KeyJ"); await sleep(30);
    const lv=w.eval("blast.overlay").querySelector(".cab-levelpage"), hint=lv && lv.querySelector(".opthint");
    check(`${slug} on the screen's pads: TAP A LEVEL, no chord`, hint && hint.textContent==="TAP A LEVEL", hint && hint.textContent);
    const b=lv.querySelector(".levels button");
    check(`${slug}: no chord beside a level, its grid kept`, !lv.querySelector(".lvkey") && b.children.length===4, b && b.innerHTML);
    b.dispatchEvent(new w.Event("mouseenter"));
    check(`${slug}: a level under the finger says to tap it, nothing more`, /^LEVEL 1: TAP IT$/.test(hint.textContent), hint.textContent);
  }
  { // ---- and a game played on chord buttons keeps its chords
    const T=t.load("chord-snake"), {w, d, sleep, key}=T;
    await sleep(150); w.eval("touchMinichord(true); menuRebuild(blast.menuAgain)"); await sleep(80);
    key("KeyJ"); await sleep(30);
    const lv=w.eval("blast.overlay").querySelector(".cab-levelpage");
    check("Chord Snake on the screen: the chord beside each level still", !!lv.querySelector(".lvkey") && /CHORD BESIDE IT/.test(lv.querySelector(".opthint").textContent), lv.querySelector(".opthint").textContent);
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
