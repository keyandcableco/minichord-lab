// Chord Sweeper: a chord's neighbours are the chords sharing two notes with it; the first sweep is
// always safe; numbers count mined neighbours; a zero spreads; the harp flags; a mine costs a life;
// clearing every safe chord clears the field.
const t=require("./harness").load("chord-sweeper");
(async()=>{
  const {w, sb, sleep, chord, note, check, d}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0);
  const nb=w.eval("swNeighbours(2)"), names=k=>{ const [c,r]=k.split(",").map(Number); return "FCGDAEB"[c]+["","m"][r]; };
  check("C major's neighbours are Cm, Am and Em", nb.get("1,0").map(([c,r])=>names(c+","+r)).sort().join(" ")==="Am Cm Em", nb.get("1,0").map(([c,r])=>names(c+","+r)).join(" "));
  check("A minor's are C, A and F", nb.get("4,1").map(([c,r])=>names(c+","+r)).sort().join(" ")==="A C F");
  chord("C"); await sleep(100);
  check("the first sweep is always safe", a.open.has("1,0") && a.mines.size===3 && a.lives===3);
  const shown=d.querySelector(".swcell.open b"), n=w.eval("swCount(1,0)");
  check("it shows how many of its neighbours are mined", n===0 || (shown && +shown.textContent===n), `count ${n}`);
  // flag a mine with the harp, then sweep every safe chord
  const mine=[...a.mines][0], [mc0,mr0]=mine.split(",").map(Number);
  note(0); await sleep(30); chord("FCGDAEB"[mc0], ["","m"][mr0]); await sleep(50);
  check("the harp, then a chord, plants a flag", a.flags.has(mine));
  for(let r=0;r<2;r++) for(let c=0;c<7;c++){ const k=c+","+r; if(a.mines.has(k) || a.open.has(k) || a.phase!=="play") continue; chord("FCGDAEB"[c], ["","m"][r]); await sleep(40); }
  check("sweeping every safe chord clears the field", a.fields===1 && a.score>0, `score ${a.score}`);
  await sleep(2600);
  // a mine costs a life
  chord("C"); await sleep(60);
  const m2=[...a.mines][0], [c2,r2]=m2.split(",").map(Number);
  chord("FCGDAEB"[c2], ["","m"][r2]); await sleep(60);
  check("a mine costs a life", a.lives===2 && /MINE/.test(t.heard()), t.heard());
  await sleep(2700);                                   // the next field
  chord("F♯"); await sleep(30);
  check("a chord off the plain buttons is off the field", /OFF THE FIELD|NOT ON THE FIELD/.test(t.heard()), t.heard());
  t.done();
})();
