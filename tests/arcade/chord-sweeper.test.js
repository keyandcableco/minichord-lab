// Chord Sweeper: tension and release. Every square's chord says how many resolutions it is from the
// nearest mine's home (its V7 beside it, V/V two away, V/V/V three, calm beyond), with tritone
// substitutes at the harder levels; the first sweep is safe; the harp steers, sweeps and flags; the
// mine's key's chord defuses it, and a wrong one sets it off.
const t=require("./harness").load("chord-sweeper");
(async()=>{
  const {w, sleep, chord, note, key, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(3);                                   // two keys, sharps and flats
  check("the keys to find show before the first sweep, as key signatures at this level", t.d.querySelectorAll(".swkeys li").length===2 && t.d.querySelectorAll(".swkeys .swsig").length===2);
  key("Space"); await sleep(50);
  check("the first sweep is always safe", a.open.size===1 && a.lives===3 && a.mines.length===2);
  // the chain of tension, spelled: for C, G7 D7 A7, their substitutes D♭7 A♭7 E♭7, B°7, and B–F
  const kc=w.eval('swKeyOf("C",false)'), kd=w.eval('swKeyOf("D♭",false)'), ka=w.eval('swKeyOf("A",true)');
  check("C major's tension: G7, D7, A7; substitutes D♭7, A♭7, E♭7; B°7; the tritone B–F",
    kc.chain.join()==="G,D,A" && kc.subs.join()==="D♭,A♭,E♭" && kc.dim==="B" && kc.tritone.join()==="B,F", `${kc.chain} | ${kc.subs} | ${kc.dim} | ${kc.tritone}`);
  check("D♭ major's substitute is named D7, not E𝄫7; A minor's V7 is E7", kd.subs[0]==="D" && kd.chain[0]==="A♭" && ka.chain[0]==="E");
  // the clue rule, over the whole field: each square's chord is one its distance and key allow
  let bad=0; const L=w.eval("SW_LEVELS[blast.level]");
  for(let y=0;y<6;y++) for(let x=0;x<8;x++){ if(a.mines.some(m=>m.x===x&&m.y===y)) continue;
    const near=a.mines.map(m=>({m,d:Math.max(Math.abs(m.x-x),Math.abs(m.y-y))})).sort((p,q)=>p.d-q.d)[0], c=a.clue.get(x+","+y);
    const ok=w.eval("swClueOptions")(near.m.key, near.d, L).some(o=>o.label===c.label);
    if(!ok) bad++; }
  check("every square's chord is its distance's: V7 beside a mine, V/V two away, V/V/V three, calm beyond", bad===0, `${bad} wrong`);
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
