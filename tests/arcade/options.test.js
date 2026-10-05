// The arcade's options (kit.js ARCADE_OPTS): one table for the title screen, game over, the settings
// dialog, the score multiplier and the POINTS page. Every game's values are short enough for one line,
// the chosen one is always one of them, the list steps and scores as it should, and Key Fleet's
// TORPEDOES, not a speed it has no use for, are what its score multiplies by.
const t=require("./harness").load("key-fleet", {every:true});
(async()=>{
  const {w, d, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  // every game's options, as the table has them
  const games=w.eval("ARCADE_GAMES");
  const table=w.eval(`ARCADE_GAMES.map(k=>[k, optsFor(k, ["game","setup","arcade"]).map(o=>({id:o.id, label:optLabel(o,k), at:o.get(k), vals:o.vals(k).map(v=>v[0])}))])`);
  const bad=[];
  for(const [k, os] of table) for(const o of os){
    if(!(o.at>=0 && o.at<o.vals.length)) bad.push(`${k} ${o.id}: chosen ${o.at} of ${o.vals.length}`);
    if(o.label.length>13) bad.push(`${k} ${o.id}: label "${o.label}"`);
    for(const v of o.vals) if(v.length>10) bad.push(`${k} ${o.id}: value "${v}"`); }
  check("every game's options: short labels, short values, one of them chosen", !bad.length, bad.join("; "));
  check("every game offers something scored harder", games.filter(k=>k!=="sweeper").every(k=>w.eval(`multRows("${k}").length>0`)),
    games.filter(k=>k!=="sweeper" && !w.eval(`multRows("${k}").length`)).join());
  check("Chord Sweeper and Key Fleet offer no speed", !table.find(([k])=>k==="sweeper")[1].some(o=>o.id==="speed") && !table.find(([k])=>k==="fleet")[1].some(o=>o.id==="speed"));
  // the multiplier is the table's
  w.eval("saved.speed=4; saved.kfTorps=0"); const f0=w.eval("diffMult('fleet')");
  check("Key Fleet's score doesn't follow a speed it doesn't offer", f0===1, `×${f0}`);
  w.eval("saved.kfTorps=2"); check("but FEW torpedoes score half as much again", w.eval("diffMult('fleet')")===1.5);
  w.eval("saved.speed=2; saved.hdGuide=2"); check("Chord Hunt: BRISK and no field guide, ×1.5 × 1.5", w.eval("diffMult('hunt')")===2.25);
  w.eval("saved.speed=0; saved.hdGuide=0; saved.kfTorps=0");
  // the title screen's list
  w.eval("cabWake()"); await sleep(20);
  const ov=t.overlay(), opts=ov.querySelector(".cab-optpage .opts"), line=id=>opts.querySelector(`.opt[data-opt="${id}"]`);
  check("the title's options are a list: the game's under the score, then the setup",
    !!opts && [...opts.querySelectorAll(".opthead span")].map(s=>s.textContent).join()==="GAME,SETUP" && /SCORE ×1/.test(opts.querySelector(".opthead b").textContent));
  line("torps").click(); await sleep(20);
  check("a click steps the value on, and shows what it scores", /FEWER/.test(line("torps").textContent) && line("torps").querySelector(".ox").textContent==="×1.25" && w.eval("saved.kfTorps")===1);
  check("the total follows", /SCORE ×1.25/.test(opts.querySelector(".opthead b").textContent));
  check("and the line underneath says what it means", /FEWER: A SIXTH FEWER/.test(opts.querySelector(".opthint").textContent));
  line("torps").dispatchEvent(new w.KeyboardEvent("keydown", {code:"ArrowLeft", bubbles:true})); await sleep(20);
  check("← steps it back", w.eval("saved.kfTorps")===0 && /PLENTY/.test(line("torps").textContent));
  line("beginner").click(); await sleep(20);
  check("BEGINNER on: the score says it won't count", /UNRANKED/.test(opts.querySelector(".opthead b").textContent) && /UNRANKED/.test(line("beginner").textContent));
  line("beginner").click(); await sleep(20);
  // the torpedoes, as a fleet sails
  await t.start(4); await sleep(100);
  const full=w.eval("blast.torps");
  w.eval("saved.kfTorps=2; beginFleet(4)"); await sleep(100);
  check("FEW torpedoes: a third fewer", w.eval("blast.torps")<full && w.eval("blast.torps")===Math.max(5, Math.round(full*.7)), `${full} → ${w.eval("blast.torps")}`);
  w.eval("saved.kfTorps=0");
  // the settings dialog: the same table, and the arcade's own after
  const dlg=w.eval("arcadeSettings()");
  check("the settings dialog lists the game's, the setup's and the arcade's", [...dlg.querySelectorAll(".opthead span")].map(s=>s.textContent).join()==="GAME,SETUP,ARCADE" && !!dlg.querySelector('.opt[data-opt="torps"]'));
  t.done();
})();
