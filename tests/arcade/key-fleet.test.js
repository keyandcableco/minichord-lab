// Key Fleet: fleets never touch end to end; hits cripple; a key is called by its tonic (early
// levels), its V7 → I, or the key change combo (C too, when the minichord reports it unasked).
const t=require("./harness").load("key-fleet");
(async()=>{
  const {sb, sleep, chord, note, check, mc}=t;
  await sleep(150); t.connect({key:0}); await sleep(100);
  const a=await t.start(0);
  let touching=0;
  for(let lv=0;lv<8;lv++){ a.level=lv; for(let n=0;n<60;n++){ sb.kfWave();
    const cells=new Map(); a.ships.forEach((s,i)=>s.cells.forEach(([c,r])=>cells.set(c+","+r,i)));
    for(const [k,i] of cells){ const [c,r]=k.split(",").map(Number), nb=cells.get((c+1)+","+r); if(nb!=null && nb!==i) touching++; }
    for(const k of (a.islands||[])) if(cells.has(k)) touching+=100; } }
  check("ships never touch end to end, nor sit on islands", touching===0);
  a.level=0; sb.kfWave(); a.torps=9;
  const s0=a.ships[0], COLS="FCGDAEB", ROWS=["","m","7"];
  const [c0,r0]=s0.cells[0]; chord(COLS[c0], ROWS[r0]); await sleep(500);
  note(t.PC[s0.tonic]); await sleep(300);
  check("plucking the tonic sinks it early", s0.sunk, s0.name);
  await sleep(2600);                                          // the fleet is sunk: the next one sails in
  a.level=2; sb.kfWave(); a.torps=20; const s1=a.ships.find(s=>s.kind==="major"||s.kind==="minor")||a.ships[0];
  for(const [c,r] of s1.cells){ chord(COLS[c], ROWS[r]); await sleep(r===2?1700:500); }
  check("hitting every chord only cripples it", s1.crippled && !s1.sunk);
  note(t.PC[s1.tonic]); await sleep(200);
  check("the harp can't call from level 3", !s1.sunk, t.heard());
  const V=COLS[(COLS.indexOf(s1.tonic)+1)%7];
  chord(V,"7"); await sleep(300); chord(s1.tonic, s1.minor?"m":""); await sleep(400);
  check("its V7 then I sinks it", s1.sunk, `${V}7 → ${s1.tonic}${s1.minor?"m":""}`);
  a.ships=[{kind:"major", cells:[[0,0],[1,0],[2,0]], name:"C MAJOR", detail:"", tonic:"C", minor:false, hits:new Set(), sunk:false, misses:0}];
  mc._asked=0; const dump=[0xF0]; for(let k=0;k<256;k++){ const v=mc.params[k]||0; dump.push(v&127, v>>7); } dump.push(0xF7); dump[71]=0; dump[72]=0;
  mc._dump(dump); await sleep(100);
  check("the combo picking C (reported unasked) calls C major", a.ships[0].sunk, t.heard());
  // a timer from a game that's gone never reaches the next one: sink a fleet (its next wave is two
  // seconds off), press RESET, and the fresh title screen stays a title screen
  await sleep(2600);
  const b=sb.arcade; b.level=0; sb.kfWave(); b.torps=9; const sh=b.ships[0];
  note(t.PC[sh.tonic]); await sleep(300);
  t.d.getElementById("resetBtn").click(); await sleep(5600);
  const fresh=sb.arcade;
  check("RESET leaves no timer behind to start a wave", fresh!==b && fresh.phase==="menu" && t.overlay() && !t.overlay().hidden, `phase ${fresh.phase}`);
  t.done();
})();
