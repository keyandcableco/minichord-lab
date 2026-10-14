// High scores and the whole game: what the board goes by (the count of what the minichord played, the
// game's clock, its score multiplier and whether it was helped) is taken once, as a game begins. Chord
// Sweeper's next field and Key Fleet's next wave are the same game, so they keep it; Play Again starts
// it afresh. Key Fleet's torpedo option, changed in a game, waits for the next one, as the multiplier
// does. Beginner mode switched on mid-game takes the game off the board; switched off mid-game, it
// doesn't put a game begun with it back on.
const {spawnSync}=require("child_process");
const harness=require("./harness");
// the settings, opened in the middle of a game (they open any time), and BEGINNER stepped on or off
function beginner(t){
  const dlg=t.w.eval("arcadeSettings()"); dlg.showModal();
  dlg.querySelector('[data-opt="beginner"]').click(); dlg.close(); dlg.remove();
}
// until play comes back (a field or a wave set up after its pause), and a frame or two of it
async function backInPlay(t, a){ for(let i=0;i<200 && a.phase!=="play";i++) await t.sleep(25); await t.sleep(100); }
const state=(t, a)=>({phase:a.phase, midiIn:a.midiIn, startedAt:a.startedAt, mult:a.mult, helped:a.helped, eligible:t.w.eval("hsEligible()")});
// a JSON line from a run of this file in another mode (each game is its own page)
function run(mode){
  const r=spawnSync(process.execPath,[__filename,mode],{encoding:"utf8",timeout:90000});
  try{ return JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){ return {err:(r.stderr||r.stdout||"").slice(0,300)}; }
}
const same=(a,b)=> a && b && a.midiIn===b.midiIn && a.startedAt===b.startedAt && a.mult===b.mult && a.eligible && b.eligible;
const show=s=> s ? `${s.midiIn} in, clock ${s.startedAt|0}, ×${s.mult}, ${s.eligible?"for the board":"off it"}` : "";

if(process.argv[2]==="fleet"){
  const t=harness.load("key-fleet");
  (async()=>{ await t.sleep(150); t.connect(); await t.sleep(100); const a=await t.start(0); await t.sleep(100);
    a.midiIn=6; a.score=50;                    // six times through the minichord (what each would sink is up to the fleet)
    const s0=state(t,a), torps0=a.torps;
    t.w.eval('optSet("torps", 2)');           // FEW torpedoes, chosen mid-game
    t.w.eval("kfCleared()"); await t.sleep(100); const paused=a.phase; await backInPlay(t,a);
    const sunk={...state(t,a), paused, torps:a.torps};
    t.w.eval("kfOut()"); await t.sleep(100); const revealed=a.phase; await backInPlay(t,a);
    const out={...state(t,a), revealed, torps:a.torps};
    console.log(JSON.stringify({s0, torps0, sunk, out})); process.exit(0); })();
} else if(process.argv[2]==="beginner-on"){
  const t=harness.load("chord-stack");
  (async()=>{ await t.sleep(150); t.connect(); await t.sleep(100); const a=await t.start(0);
    for(let k=0;k<5;k++){ t.chord("C"); await t.sleep(10); } a.score=100; await t.sleep(100);
    const before={...state(t,a), helper:!!a.helpBoard};
    beginner(t); await t.sleep(100);
    const after={...state(t,a), helper:!!a.helpBoard, saved:t.w.eval("saved.beginner")};
    for(let i=0;i<300 && a.phase==="play";i++){ t.key("Space"); await t.sleep(5); } await t.sleep(300);
    const over={phase:a.phase, splash:!!t.d.querySelector(".hssplash"), note:a.hsNote};
    console.log(JSON.stringify({before, after, over})); process.exit(0); })();
} else if(process.argv[2]==="beginner-off"){
  const t=harness.load("key-fleet",{storage:{saved:{beginner:true}}});
  (async()=>{ await t.sleep(150); t.connect(); await t.sleep(100); const a=await t.start(0); await t.sleep(100);
    a.midiIn=6; a.score=50;
    const before=state(t,a);
    beginner(t); await t.sleep(100);
    const off={...state(t,a), saved:t.w.eval("saved.beginner")};
    t.w.eval("kfCleared()"); await t.sleep(100); await backInPlay(t,a);
    console.log(JSON.stringify({before, off, wave:state(t,a)})); process.exit(0); })();
} else {
  const t=harness.load("chord-sweeper");
  (async()=>{
    const {w, d, sleep, key, check}=t;
    await sleep(150); t.connect(); await sleep(100);
    const a=await t.start(0); await sleep(100);
    a.midiIn=6; a.score=50;                    // six times through the minichord (what each would sweep is up to the mines)
    const s0=state(t,a);
    // a field cleared: FIELD CLEAR!, then the next field
    w.eval("swCleared()"); await sleep(100); const cleared=a.phase; await backInPlay(t,a);
    const s1=state(t,a);
    check("Chord Sweeper's next field, after one cleared, is the same game: its count, clock and multiplier stand, and it's still for the board",
      cleared==="reveal" && s1.phase==="play" && same(s0,s1), `${cleared}, then ${show(s1)}; began ${show(s0)}`);
    // a mine: the field uncovered, NEXT FIELD, and the player goes on (the mines are laid at a field's
    // first sweep, so they're laid first)
    const boom=()=>w.eval("if(!blast.mines.length) swLay(...blast.cur); swBoom(blast.mines[0], 'A TEST')");
    boom();
    for(let i=0;i<120 && a.phase!=="next";i++) await sleep(25);
    const waited=a.phase; key("Enter"); await backInPlay(t,a);
    const s2=state(t,a);
    check("and after a mine, once the player goes on", waited==="next" && s2.phase==="play" && same(s0,s2), `${waited}, then ${show(s2)}`);
    // game over, and Play Again: a new game, counted afresh
    a.lives=1; a.score=0; boom();
    let again=null; for(let i=0;i<120 && !again;i++){ await sleep(25); again=t.overlay()?.querySelector("button.go"); }
    const done=a.hsDone; a.midiIn=6; again && again.click(); await sleep(150);
    const s3={...state(t,a), hsDone:a.hsDone};
    check("Play Again is a new game: the count, the clock and the board's checks start again",
      !!again && done===true && s3.phase==="play" && s3.midiIn===0 && s3.startedAt>s0.startedAt && s3.hsDone===false, show(s3));
    // Key Fleet: a fleet sunk, then out of torpedoes
    const f=run("fleet");
    check("Key Fleet's next wave, after a fleet sunk, is the same game", f.sunk && f.sunk.paused==="pause" && same(f.s0,f.sunk), f.err || `${show(f.sunk)}; began ${show(f.s0)}`);
    check("and after running out of torpedoes", f.out && f.out.revealed==="reveal" && f.out.phase==="play" && same(f.s0,f.out), f.err || show(f.out));
    check("its torpedo option, changed mid-game, waits for the next game as the multiplier does", f.sunk && f.sunk.torps===f.torps0 && f.out.torps===f.torps0,
      f.sunk && `${f.torps0} torpedoes at first, ${f.sunk.torps} and ${f.out.torps} after`);
    // beginner mode, switched on mid-game
    const b=run("beginner-on");
    check("beginner mode switched on mid-game lights the minichord on screen and takes the game off the board",
      b.before && !b.before.helper && b.before.eligible && b.after.saved && b.after.helper && b.after.helped===true && !b.after.eligible, b.err || JSON.stringify(b.after));
    check("and game over says why", b.over && b.over.phase==="over" && !b.over.splash && /BEGINNER/.test(b.over.note||""), b.err || (b.over && b.over.note));
    // and switched off mid-game
    const o=run("beginner-off");
    check("a game begun in beginner mode stays off the board when it's switched off, the next wave too",
      o.before && o.before.helped===true && o.off.saved===false && o.off.helped===true && o.wave.phase==="play" && o.wave.helped===true && !o.wave.eligible, o.err || JSON.stringify(o.wave));
    t.done();
  })();
}
