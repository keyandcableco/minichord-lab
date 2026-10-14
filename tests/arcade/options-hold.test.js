// A game's options are the ones it began with. The settings open during play: SPEED stepped from Wild
// to Relaxed there leaves the game at Wild's pace and its ×2, and shows Relaxed as the next game's,
// with what that game will score; set back, nothing waits. The board has the speed the game was played
// at; the game over screen still shows the change waiting; Play Again is at Relaxed. Something left
// waiting when the game's abandoned (RESET) is there at the title.
const t=require("./harness").load("sight-line");
(async()=>{
  const {w, d, sleep, note, key, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:4}); await sleep(100);
  const now=()=>({speed:w.eval("saved.speed"), pace:w.eval("speedMul()"), mult:a.mult, waiting:w.eval("JSON.stringify(saved.optNext||{})")});
  const wild=now();
  // the settings, opened mid-game, and SPEED stepped on from Wild (round to Relaxed)
  const dlg=w.eval("arcadeSettings()"); dlg.showModal();
  dlg.querySelector('[data-opt="speed"]').click(); await sleep(50);
  const row=dlg.querySelector('[data-opt="speed"]').textContent, head=dlg.querySelector(".opthead b").textContent;
  dlg.close(); dlg.remove();
  const mid=now();
  check("SPEED changed mid-game waits: the game keeps Wild's pace and its ×2", wild.speed===4 && wild.mult===2 && mid.speed===4 && mid.pace===wild.pace && mid.mult===2,
    `${wild.pace} then ${mid.pace}, ×${mid.mult}`);
  check("the settings show it as the next game's, and what that game will score", /RELAXED/.test(row) && /NEXT GAME/.test(row) && /^SCORE ×1$/.test(head), `${row} · ${head}`);
  // the minichord's row (optSet) the same way; set back to the game's own, nothing waits
  w.eval('optSet("speed", 4)'); const back=now().waiting; w.eval('optSet("speed", 0)');
  check("set back to the game's own, nothing waits", back==="{}" && /"speed"/.test(now().waiting), `${back}, then ${now().waiting}`);
  // played, then game over: the board has the speed the game was played at
  const atLine=async()=>{ for(let i=0;i<600;i++){ const n=a.notes.find(n=>!n.done && !n.change && Math.abs(n.x-a.ph)<=20); if(n) return n; await sleep(20); } return null; };
  for(let k=0;k<6;k++){ const n=await atLine(); if(!n) break; note(n.pc); await sleep(20); }
  const slug=w.eval("hsSlug()"), score=a.score;
  a.lives=1; for(let i=0;i<300 && a.phase==="play";i++) await sleep(20);
  for(let i=0;i<160 && !d.querySelector(".hsentry");i++) await sleep(50);
  const entered=!!d.querySelector(".hsentry");
  if(entered){ await sleep(800); key("KeyG"); key("KeyK"); key("KeyB"); await sleep(100); }
  const mine=((w.eval("saved.hiscores")||{})[slug]||[]).find(r=>r.initials==="GKB" && r.score===score);
  check("the board has the speed the game was played at, not the one waiting", entered && score>0 && mine && mine.speed===4, mine ? `speed ${mine.speed}` : `no entry (score ${score})`);
  // the game over screen: still waiting
  let again=null; for(let i=0;i<120 && !again;i++){ await sleep(25); again=t.overlay()?.querySelector("button.go"); }
  const overRow=t.overlay()?.querySelector('[data-opt="speed"]')?.textContent||"";
  check("at game over it's still the next game's", !!again && w.eval("saved.speed")===4 && /RELAXED/.test(overRow) && /NEXT GAME/.test(overRow), overRow);
  // Play Again: the next game, at Relaxed
  again && again.click(); await sleep(150);
  const next=now();
  check("Play Again is at Relaxed, ×1", a.phase==="play" && next.speed===0 && next.pace===w.eval("SPEEDS[0][1]") && next.mult===1 && next.waiting==="{}", JSON.stringify(next));
  // something waiting when the game's abandoned: RESET, and it's there at the title
  w.eval('optSet("timing", 1)'); const tight=now().waiting, loose=w.eval("!!saved.slTight");
  w.eval("coldBoot()");
  for(let i=0;i<80 && w.eval("blast.booting");i++) await sleep(100);   // the boot animation, about five seconds
  await sleep(300);
  check("left waiting when a game's abandoned (RESET), it's there at the title", /"timing"/.test(tight) && !loose && w.eval("!!saved.slTight") && now().waiting==="{}" && w.eval("blast.phase")==="menu",
    `${tight}, then tight ${w.eval("!!saved.slTight")}, ${now().waiting}`);
  t.done();
})();
