// In keyboard play the letters are the minichord's chord buttons, so a game's own letter controls
// step aside for them: Chord Breakout's and Fifths Defender's A and D (Fm and Gm), Chord Snake's X
// and B (C7 and A7), Chord Sweeper's X (C7). With a minichord plugged in they work as before, and the
// arrows work either way; in keyboard play the harp's B (the number row) drops and flags.
const harness=require("./harness");
const games=["chord-breakout","fifths-defender","chord-snake","chord-sweeper"].map(s=>harness.load(s));
const t=games[games.length-1], {check}=t;
(async()=>{
  const {sleep}=t;
  await sleep(200);
  for(const g of games){ g.connect(); } await sleep(100);
  const [bo, fd, sn, sw]=games;
  // a spy on a game's own action, so the test sees whether a key reached it
  const spy=(g,fn)=>g.w.eval(`window.__n=0; { const was=${fn}; ${fn}=function(){ window.__n++; return was.apply(this, arguments); }; }`);
  const count=g=>g.w.eval("window.__n");
  const keyboard=(g,on)=>g.w.eval(`keyboardMinichord(${on})`);
  const up=(g,code)=>g.d.dispatchEvent(new g.w.KeyboardEvent("keyup",{code, bubbles:true}));

  // Chord Breakout: A and D steer
  { const a=await bo.start(0);
    bo.key("KeyA"); await sleep(20);
    check("Breakout: with a minichord, A steers", a.keyDir===-1, String(a.keyDir)); up(bo,"KeyA");
    keyboard(bo,true); await sleep(40); a.keyDir=0;
    bo.key("KeyA"); bo.key("KeyD"); await sleep(20);
    check("Breakout: in keyboard play, A and D are chords, not steering", !a.keyDir, String(a.keyDir));
    bo.key("ArrowLeft"); await sleep(20);
    check("Breakout: the arrows still steer", a.keyDir===-1, String(a.keyDir));
    up(bo,"KeyA"); await sleep(20);
    check("Breakout: letting go of a chord key doesn't stop the arrow's steering", a.keyDir===-1, String(a.keyDir)); }

  // Fifths Defender: A and D aim
  { const a=await fd.start(0); spy(fd,"fdAimAt");
    fd.key("KeyD"); await sleep(20);
    check("Fifths: with a minichord, D aims", count(fd)===1, String(count(fd)));
    keyboard(fd,true); await sleep(40); a.phase="play";
    fd.key("KeyA"); fd.key("KeyD"); await sleep(20);
    check("Fifths: in keyboard play, A and D are chords, not aiming", count(fd)===1, String(count(fd)));
    fd.key("ArrowRight"); await sleep(20);
    check("Fifths: the arrows still aim", count(fd)===2, String(count(fd))); }

  // Chord Snake: X and B drop a note
  { await sn.start(0); spy(sn,"snDrop");
    sn.key("KeyX"); await sleep(20);
    check("Snake: with a minichord, X drops", count(sn)===1, String(count(sn)));
    keyboard(sn,true); await sleep(40); sn.w.eval("blast.phase='play'");
    sn.key("KeyX"); sn.key("KeyB"); await sleep(20);
    check("Snake: in keyboard play, X and B are chords, not drops", count(sn)===1, String(count(sn))); }

  // Chord Sweeper: X flags
  { await sw.start(0); spy(sw,"swFlag");
    sw.key("KeyX"); await sleep(20);
    check("Sweeper: with a minichord, X flags", count(sw)===1, String(count(sw)));
    keyboard(sw,true); await sleep(40); sw.w.eval("blast.phase='play'");
    sw.key("KeyX"); await sleep(20);
    check("Sweeper: in keyboard play, X is a chord, not a flag", count(sw)===1, String(count(sw)));
    sw.key("ArrowRight"); await sleep(20);
    check("Sweeper: the arrows still move", sw.w.eval("blast.cur[0]")===4, String(sw.w.eval("blast.cur"))); }

  t.done();                                          // every game's checks are on the last one's tally
})();
