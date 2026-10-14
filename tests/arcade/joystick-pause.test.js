// Pause: the joystick plate's click (or P, or PAUSE in the phone's menu) stops a game where it is, as a
// bonus round does. The game's clock and moves stop, its timers (gameLater) wait, nothing the player
// does reaches it, and going on moves every time it keeps by how long it stood, so nothing jumps.
// Only in play. Chord Breakout and Harp Command, whose serve, spawns and falling notes are on timers.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- Chord Breakout, on the joystick plate: the click
    const T=t.load("chord-breakout"), {w, d, sleep, button, key}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(100);
    button("click"); button("click",false); await sleep(20);
    check("the click on a title screen: no pause, it wakes it", w.eval("blast.phase")==="menu" && w.eval("blast.overlay.dataset.stage")==="options");
    await T.start(0); await sleep(300);
    w.eval("window.__f=0; gameLater(()=>{ __f++; }, 150)");
    const serve0=w.eval("blast.serveAt"), touch0=w.eval("blast.boTouchAt");
    button("click"); await sleep(5); button("click",false);
    check("the click in play: paused", w.eval("blast.phase")==="pause");
    const pz=d.querySelector(".field .jspause");
    check("PAUSED, and how to go on", !!pz && /PAUSED/.test(pz.textContent) && /CLICK THE STICK OR P TO GO ON/.test(pz.textContent), pz && pz.textContent);
    const ball=w.eval("JSON.stringify(blast.balls.map(b=>[b.x,b.y]))");
    await sleep(600);
    check("nothing moves while it's paused", w.eval("JSON.stringify(blast.balls.map(b=>[b.x,b.y]))")===ball);
    check("a timer set before waits", w.eval("__f")===0);
    w.eval("breakoutChord && 0"); const sc=w.eval("blast.score");
    T.chord("C"); T.note(0); key("ArrowLeft"); await sleep(30);
    check("chords, the harp and the keys reach nothing", w.eval("blast.score")===sc && w.eval("blast.phase")==="pause" && !w.eval("blast.keyDir"));
    const at=w.eval("performance.now()");
    button("click"); button("click",false); await sleep(5);
    const shift=w.eval("blast.serveAt")-serve0, took=at-w.eval("blast.pauseStart");
    check("the click again: going on", w.eval("blast.phase")==="play" && !d.querySelector(".field .jspause"));
    check("the serve's clock moved on by the time it stood", Math.abs(shift-took)<120 && w.eval("blast.boTouchAt")-touch0>500, `${Math.round(shift)} ms for ${Math.round(took)} ms paused`);
    await sleep(300);
    check("and the timer that waited fires", w.eval("__f")===1);
    key("KeyP"); await sleep(5);
    check("P pauses too", w.eval("blast.phase")==="pause");
    key("KeyP"); await sleep(5);
    check("and P goes on", w.eval("blast.phase")==="play");
    d.dispatchEvent(new w.KeyboardEvent("keydown",{code:"KeyP", bubbles:true})); await sleep(5);
    d.querySelector(".field .jspause").dispatchEvent(new w.MouseEvent("click",{bubbles:true})); await sleep(5);
    check("a click on PAUSED goes on", w.eval("blast.phase")==="play");
  }
  { // ---- Harp Command, no plate: P
    const T=t.load("harp-command"), {w, d, sleep, key}=T;
    await sleep(150); T.connect({firmware:60}); await sleep(100);
    await T.start(0); await sleep(1500);
    const n0=w.eval("blast.next"), items0=w.eval("JSON.stringify(blast.items.filter(i=>!i.done).map(i=>i.t0))");
    check("Harp Command: notes falling", w.eval("blast.items.filter(i=>!i.done).length")>0, items0);
    key("KeyP"); await sleep(5);
    const pz=d.querySelector(".field .jspause");
    check("P: paused, and P (or a click) to go on", w.eval("blast.phase")==="pause" && /PRESS P/.test(pz.textContent), pz && pz.textContent);
    const y0=w.eval("JSON.stringify(blast.items.filter(i=>!i.done).map(i=>Math.round(i.y)))"), sc=w.eval("blast.score");
    await sleep(700);
    w.eval("blast.items.filter(i=>!i.done).forEach(i=>answerNote(i.string))"); await sleep(20);
    check("the notes don't fall, and the harp shoots none", w.eval("JSON.stringify(blast.items.filter(i=>!i.done).map(i=>Math.round(i.y)))")===y0 && w.eval("blast.score")===sc);
    const at=w.eval("performance.now()-blast.pauseStart");
    key("KeyP"); await sleep(5);
    const n1=w.eval("blast.next"), items1=JSON.parse(w.eval("JSON.stringify(blast.items.filter(i=>!i.done).map(i=>i.t0))")), items0p=JSON.parse(items0);
    check("going on: the next note's time and every falling note's moved on by the pause", Math.abs(n1-n0-at)<120 && items1.length===items0p.length && items1.every((x,i)=>Math.abs(x-items0p[i]-at)<120), `${Math.round(n1-n0)} for ${Math.round(at)}; ${JSON.stringify(items0p)} → ${JSON.stringify(items1)}`);
    { const y1=w.eval("JSON.stringify(blast.items.filter(i=>!i.done).map(i=>Math.round(i.y)))"); check("so nothing jumped down the screen", JSON.parse(y1).every((y,i)=>Math.abs(y-JSON.parse(y0)[i])<4), `${y0} → ${y1}`); }
    // only in play
    w.eval("blast.phase='over'"); key("KeyP"); await sleep(5);
    check("not at game over", w.eval("blast.phase")==="over" && !d.querySelector(".field .jspause"));
    w.eval("blast.phase='play'");
    // the phone's menu has it
    w.eval("tdMenu()"); await sleep(5);
    const rows=[...d.querySelectorAll("#tdMenuDlg .tdmrow")].map(r=>r.textContent);
    check("the phone's menu: PAUSE, while a game plays", rows.some(r=>/^PAUSE/.test(r)), rows.join(" | "));
    [...d.querySelectorAll("#tdMenuDlg .tdmrow")].find(r=>/^PAUSE/.test(r.textContent)).click(); await sleep(5);
    check("which pauses it", w.eval("blast.phase")==="pause");
    w.eval("tdMenu()"); await sleep(5);
    const go=[...d.querySelectorAll("#tdMenuDlg .tdmrow")].find(r=>/^GO ON/.test(r.textContent));
    check("and GO ON goes on", !!go && (go.click(), w.eval("blast.phase")==="play"));
    // a game's own "pause" (Key Fleet's, between waves) isn't the arcade's: its timers run, its input counts
    w.eval("window.__g=0; blast.phase='pause'; gameLater(()=>{ __g++; }, 50)"); await sleep(300);
    check("a game's own pause phase isn't the arcade's: its timers still fire", w.eval("__g")===1 && !w.eval("jsPaused()"));
    w.eval("blast.phase='play'");
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
