// Timers belong to the run that set them: a game's play, a demo, a title screen. One set with
// gameLater fires while its run goes on, and never once a new run has begun or the game was replaced;
// every game's start, demo and title screen begins a run; and no arcade code guards a timer only by
// asking what kind of game is running (the pattern that let an old game's timer reach a new one).
const fs=require("fs"), path=require("path");
const t=require("./harness").load("chord-snake");
(async()=>{
  const {w, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const run=()=>w.eval("blast && blast.gen");
  w.eval("window.__f=[]; gameLater(()=>__f.push('kept'), 200)"); await sleep(300);
  check("a timer fires while its run goes on", w.__f.includes("kept"));
  w.eval("gameLater(()=>__f.push('stale'), 200); newRun()"); await sleep(300);
  check("a timer from an earlier run doesn't", !w.__f.includes("stale"));
  w.eval("gameLater(()=>__f.push('replaced'), 200); stopBlaster(); nextQuestion()"); await sleep(300);
  check("nor one from a game that's been replaced", !w.__f.includes("replaced"));
  const r0=run(); await t.start(0); const r1=run();
  check("starting a game begins a run", r1>r0, `${r0} → ${r1}`);
  // no timer in the arcade asks only "is a game of this kind running?"
  const root=path.resolve(__dirname,"../../arcade"), files=[...fs.readdirSync(root).filter(f=>f.endsWith(".js")).map(f=>path.join(root,f)),
    ...fs.readdirSync(path.join(root,"games")).map(f=>path.join(root,"games",f))];
  const loose=files.flatMap(f=>{ const s=fs.readFileSync(f,"utf8"); return [...s.matchAll(/setTimeout\(\(\)=>\{ ?if\(!?blast/g)].map(()=>path.basename(f)); });
  check("every game timer in the arcade belongs to its run", !loose.length, loose.join(", "));
  t.done();
})();
