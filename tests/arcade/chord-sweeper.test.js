// Chord Sweeper: every square's note says how close the nearest mine is (its key's 3rd or 5th next
// to it, the key's other notes two away, notes outside the key further out); the first sweep is
// safe; the harp steers, sweeps and flags; the mine's key's chord defuses it, and a wrong one sets it off.
const t=require("./harness").load("chord-sweeper");
(async()=>{
  const {w, sleep, chord, note, key, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(3);                                   // two keys, sharps and flats
  check("the keys to find show before the first sweep, as key signatures at this level", t.d.querySelectorAll(".swkeys li").length===2 && t.d.querySelectorAll(".swkeys .swsig").length===2);
  key("Space"); await sleep(50);
  check("the first sweep is always safe", a.open.size===1 && a.lives===3 && a.mines.length===2);
  // the clue rule, over the whole field
  let bad=0;
  for(let y=0;y<6;y++) for(let x=0;x<8;x++){ if(a.mines.some(m=>m.x===x&&m.y===y)) continue;
    const near=a.mines.map(m=>({m,d:Math.max(Math.abs(m.x-x),Math.abs(m.y-y))})).sort((p,q)=>p.d-q.d)[0], k=near.m.key, c=a.clue.get(x+","+y);
    const ok = near.d===1 ? k.near.includes(c) : near.d===2 ? k.warm.includes(c) : k.outside.includes(c);
    if(!ok) bad++; }
  check("every square's note fits its distance from the nearest mine", bad===0, `${bad} wrong`);
  const k0=a.mines[0].key;
  check("a key's clues are its 3rd and 5th, its other notes, and the notes outside it", k0.near.length===2 && k0.warm.length===4 && k0.outside.length===5, `${k0.name}: ${k0.near.join(" ")} | ${k0.warm.join(" ")} | ${k0.outside.join(" ")}`);
  // steer to the first mine with the harp's d-pad, defuse it with its key's chord
  const m=a.mines[0], dirPc=d=>[...Array(12).keys()].find(pc=>w.eval(`kmControl(${pc})`)===d);
  while(a.cur[0]<m.x){ note(dirPc("right")); await sleep(5); } while(a.cur[0]>m.x){ note(dirPc("left")); await sleep(5); }
  while(a.cur[1]<m.y){ note(dirPc("down")); await sleep(5); } while(a.cur[1]>m.y){ note(dirPc("up")); await sleep(5); }
  check("the harp steers the cursor onto the mine", a.cur[0]===m.x && a.cur[1]===m.y);
  const before=a.score; chord(t.PC[m.key.tonic], m.key.minor?"m":""); await sleep(50);
  check("its key's chord defuses it", m.defused && a.score>before, m.key.name);
  // the other mine: the wrong chord sets it off
  const m2=a.mines[1]; a.cur=[m2.x,m2.y];
  chord((t.PC[m2.key.tonic]+1)%12, "m"); await sleep(50);
  check("a wrong chord on a mine sets it off", m2.boom && a.lives===2, t.heard());
  check("its mines are the keys it said to find", a.mines.every(m=>a.keys.includes(m.key)));
  t.done();
})();
