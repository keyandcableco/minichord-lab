// High scores: a game that makes the board ends on GAME OVER first, then the initials, which ignore
// input for a moment; the board is kept; beginner mode keeps a game off it; game over returns to the
// title. The initials count down as a cabinet's do, the count going back to the top as letters are
// picked, and Escape gives up on entering the score at all.
const {spawnSync}=require("child_process");
if(process.argv[2]==="timeout"){
  const t=require("./harness").load("chord-stack");
  (async()=>{
    const {sleep, key, chord, d, w}=t;
    await sleep(150); t.connect(); await sleep(100); const a=await t.start(0);
    for(let k=0;k<5;k++){ chord("C"); await sleep(10); } a.score=100;
    for(let i=0;i<300 && a.phase==="play";i++){ key("Space"); await sleep(5); }
    await sleep(200); chord("C"); key("KeyZ");
    for(let i=0;i<120 && !d.querySelector(".hsentry");i++) await sleep(50);
    await sleep(21500);                                              // left alone, the full twenty seconds
    const board=(JSON.parse(w.localStorage.getItem("lab-spellbound")).saved.hiscores||{})["chord-stack"]||[];
    console.log(JSON.stringify({gone:!d.querySelector(".hsentry"), kept:board.some(r=>r.score===100), note:a.hsNote}));
    process.exit(0);
  })();
} else if(process.argv[2]==="countdown"){
  const t=require("./harness").load("chord-stack");
  (async()=>{
    const {sleep, key, chord, d, w}=t;
    await sleep(150); t.connect(); await sleep(100); const a=await t.start(0);
    for(let k=0;k<5;k++){ chord("C"); await sleep(10); } a.score=100;
    for(let i=0;i<300 && a.phase==="play";i++){ key("Space"); await sleep(5); }
    await sleep(200); chord("C"); key("KeyZ");
    for(let i=0;i<120 && !d.querySelector(".hsentry");i++) await sleep(50);
    const num=()=>+d.querySelector(".hscount i").textContent;
    const first=num();
    // a knob sitting still reports all the while: that is nobody being there, so the count runs on
    for(let i=0;i<25;i++){ t.knob(64+(i%2),22); await sleep(100); }
    const after=num();
    key("ArrowUp"); await sleep(50); const reset=num();      // a letter picked: the full time again
    d.querySelector(".hsentry .hsno").click(); await sleep(300);
    const board=(JSON.parse(w.localStorage.getItem("lab-spellbound")).saved.hiscores||{})["chord-stack"]||[];
    const declined={gone:!d.querySelector(".hsentry"), kept:board.some(r=>r.score===100), note:a.hsNote};
    // RESET while the initials are up: everything ends, nothing after it
    const ov=t.overlay(); const again=ov && [...ov.querySelectorAll("button")].find(b=>/PLAY AGAIN/i.test(b.textContent)); if(again) again.click();
    await sleep(300); for(let k=0;k<5 && a.phase==="play";k++){ chord("C"); await sleep(10); } a.score=100;
    for(let i=0;i<300 && a.phase==="play";i++){ key("Space"); await sleep(5); }
    await sleep(200); chord("C"); key("KeyZ");
    for(let i=0;i<120 && !d.querySelector(".hsentry");i++) await sleep(50);
    const hadEntry=!!d.querySelector(".hsentry");
    w.eval("coldBoot()");
    for(let i=0;i<80 && w.eval("blast.booting");i++) await sleep(100);   // the boot animation, about five seconds
    await sleep(300);
    // what's on screen, not the page's scripts (whose code mentions NaN)
    const shown=()=>{ const c=d.body.cloneNode(true); c.querySelectorAll("script,style").forEach(e=>e.remove()); return c.textContent; };
    const afterReset={hadEntry, entry:!!d.querySelector(".hsentry"), nan:/NaN/.test(shown()), phase:w.eval("blast.phase")};
    console.log(JSON.stringify({first, after, reset, declined, afterReset}));
    process.exit(0);
  })();
} else if(process.argv[2]==="beginner"){
  const t=require("./harness").load("chord-stack",{storage:{saved:{beginner:true}}});
  (async()=>{ await t.sleep(150); t.connect(); await t.sleep(100); const a=await t.start(0);
    for(let k=0;k<5;k++){ t.chord("C"); await t.sleep(10); } a.score=100;
    for(let i=0;i<300 && a.phase==="play";i++){ t.key("Space"); await t.sleep(5); } await t.sleep(300);
    console.log(JSON.stringify({entry:!!t.d.querySelector(".hsentry"), splash:!!t.d.querySelector(".hssplash"), note:a.hsNote}));
    await t.sleep(25500); const ov=t.overlay(); console.log(JSON.stringify({back:a.phase, stage:ov&&ov.dataset.stage})); process.exit(0); })();
} else {
  const t=require("./harness").load("chord-stack");
  (async()=>{
    const {sleep, key, chord, check, d, w}=t;
    await sleep(150); t.connect(); await sleep(100);
    const a=await t.start(0);
    for(let k=0;k<5;k++){ chord("C"); await sleep(10); } a.score=100;
    for(let i=0;i<300 && a.phase==="play";i++){ key("Space"); await sleep(5); }
    await sleep(200);
    check("game over shows GAME OVER first", !!d.querySelector(".hssplash") && !d.querySelector(".hsentry"));
    chord("C"); key("KeyZ");
    for(let i=0;i<120 && !d.querySelector(".hsentry");i++) await sleep(50);      // however long this machine takes
    const ent=d.querySelector(".hsentry"), letters=()=>[...ent.querySelectorAll(".hsletters span")].map(x=>x.textContent).join("");
    check("then the initials entry, untouched by input during the splash", ent && letters()==="AAA", ent?letters():"no entry");
    key("KeyQ"); await sleep(10);
    check("a key the instant it opens is ignored", letters()==="AAA");
    await sleep(800); key("KeyG"); key("KeyK"); key("KeyB"); await sleep(100);
    const board=JSON.parse(w.localStorage.getItem("lab-spellbound")).saved.hiscores["chord-stack"];
    check("the score is on this computer's board", board && board[0].initials==="GKB" && board[0].score===100);
    // the countdown, and giving up: a second run, straight to the entry
    const c=spawnSync(process.execPath,[__filename,"countdown"],{encoding:"utf8",timeout:90000});
    let j={}; try{ j=JSON.parse((c.stdout||"").trim().split("\n").pop()); }catch(e){ j={err:(c.stderr||"").slice(0,200)}; }
    check("the initials count down, twenty seconds as a cabinet does, a resting knob not stopping it", j.first===20 && j.after<20, j.err||`${j.first} then ${j.after}`);
    check("picking a letter puts the full time back", j.reset===20, `${j.reset}`);
    check("NO THANKS declines: no score kept, and the game over screen says so", j.declined && j.declined.gone && !j.declined.kept && /NOT SENT/.test(j.declined.note||""), j.declined && j.declined.note);
    check("RESET while the initials are up ends them and starts afresh, with nothing after (no level NaN)", j.afterReset && j.afterReset.hadEntry && !j.afterReset.entry && !j.afterReset.nan && j.afterReset.phase==="menu", JSON.stringify(j.afterReset));
    const to=spawnSync(process.execPath,[__filename,"timeout"],{encoding:"utf8",timeout:60000});
    let jt={}; try{ jt=JSON.parse((to.stdout||"").trim().split("\n").pop()); }catch(e){ jt={err:(to.stderr||"").slice(0,200)}; }
    check("left alone, the countdown runs out and the score isn't sent", jt.gone && !jt.kept && /TIME UP/.test(jt.note||""), jt.err||jt.note);
    const r=spawnSync(process.execPath,[__filename,"beginner"],{encoding:"utf8",timeout:60000});
    const lines=(r.stdout||"").trim().split("\n"), b1=JSON.parse(lines[0]||"{}"), b2=JSON.parse(lines[1]||"{}");
    check("with beginner mode on, no initials", !b1.entry && !b1.splash && /BEGINNER/.test(b1.note||""), b1.note);
    check("left alone, game over goes back to the title", b2.back==="menu" && b2.stage==="title", JSON.stringify(b2));
    t.done();
  })();
}
