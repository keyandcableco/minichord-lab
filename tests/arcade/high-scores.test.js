// High scores: a game that makes the board ends on GAME OVER first, then the initials, which ignore
// input for a moment; the board is kept; beginner mode keeps a game off it; game over returns to the
// title. The initials count down as a cabinet's do, the count going back to the top as letters are
// picked, and Escape gives up on entering the score at all.
const {spawnSync}=require("child_process");
if(process.argv[2]==="countdown"){
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
    await sleep(2500); const after=num();
    key("ArrowUp"); await sleep(50); const reset=num();      // a letter picked: the full time again
    key("Escape"); await sleep(300);
    const board=(JSON.parse(w.localStorage.getItem("lab-spellbound")).saved.hiscores||{})["chord-stack"]||[];
    console.log(JSON.stringify({first, after, reset, skipped:!d.querySelector(".hsentry") && !board.some(r=>r.score===100), note:a.hsNote}));
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
    check("the initials count down, twenty seconds as a cabinet does", j.first===20 && j.after<20, j.err||`${j.first} then ${j.after}`);
    check("picking a letter puts the full time back", j.reset===20, `${j.reset}`);
    check("Escape gives up: no score kept, and the game over screen says so", j.skipped && /NOT ENTERED/.test(j.note||""), j.note);
    const r=spawnSync(process.execPath,[__filename,"beginner"],{encoding:"utf8",timeout:60000});
    const lines=(r.stdout||"").trim().split("\n"), b1=JSON.parse(lines[0]||"{}"), b2=JSON.parse(lines[1]||"{}");
    check("with beginner mode on, no initials", !b1.entry && !b1.splash && /BEGINNER/.test(b1.note||""), b1.note);
    check("left alone, game over goes back to the title", b2.back==="menu" && b2.stage==="title", JSON.stringify(b2));
    t.done();
  })();
}
