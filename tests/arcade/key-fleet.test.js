// Key Fleet: fleets never touch end to end; hits cripple; a key is called by its tonic (early
// levels), its V7 → I, or the key change combo (C too, when the minichord reports it unasked).
const t=require("./harness").load("key-fleet");
(async()=>{
  const {sb, sleep, chord, note, check, mc, w}=t;
  await sleep(150); t.connect({key:0}); await sleep(100);
  const a=await t.start(0);
  let touching=0;
  for(let lv=0;lv<11;lv++){ a.level=lv; for(let n=0;n<60;n++){ sb.kfWave();
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
  // a call on a ship not yet hit is blind, and costs a torpedo
  const tb=a.torps; chord("G","7"); await sleep(300); chord("C"); await sleep(300);
  check("a key can't be called on a ship not yet hit", !a.ships[0].sunk && a.torps===tb-1 && /NO CONTACT/.test(t.heard()), t.heard());
  a.ships[0].hits.add("1,0");                                 // contact: one of its chords hit
  mc._asked=0; const dump=[0xF0]; for(let k=0;k<256;k++){ const v=mc.params[k]||0; dump.push(v&127, v>>7); } dump.push(0xF7); dump[71]=0; dump[72]=0;
  mc._dump(dump); await sleep(100);
  check("the combo picking C (reported unasked) calls C major", a.ships[0].sunk, t.heard());
  // the wider seas: a line of fifths, every key on it, no two keys in a fleet that sound the same
  a.level=10; let twins=0, cols=0, ok=0;
  for(let n=0;n<80;n++){ sb.kfWave(); cols=w.eval("KF_COLS.length"); const homes=a.ships.map(s=>t.PC[s.tonic]); if(new Set(homes).size<homes.length) twins++; if(a.ships.length===3) ok++; }
  check("every key's sea is fifteen columns, G♭ to G♯", cols===15 && w.eval("KF_COLS[0]")==="G♭" && w.eval("KF_COLS[14]")==="G♯");
  check("its fleets never hold two keys that sound the same", twins===0 && ok===80, `${twins} with twins`);
  // the modifier's way decides the spelling: sharpened C is C♯, flattened D is D♭, different places
  mc.params[31]=0; const sharp=w.eval("kfSpell(1)"); mc.params[31]=1; const flat=w.eval("kfSpell(1)");
  check("sharpening gives C♯, flattening D♭", sharp==="C♯" && flat==="D♭" && w.eval("KF_COLS.indexOf('C♯')")!==w.eval("KF_COLS.indexOf('D♭')"));
  mc.params[31]=0; a.phase="play"; note(5); await sleep(20);
  check("in the wider seas the harp flips the modifier", mc.params[31]===1);
  // a shot at a sharp: in the sharp waters, a ship on F♯ or C♯ is hit by the sharpened chord
  a.level=9; let target=null;
  for(let n=0;n<60 && !target;n++){ sb.kfWave(); a.torps=20; for(const sh of a.ships) for(const [c,r] of sh.cells){ const nm=w.eval(`KF_COLS[${c}]`); if(!target && /♯/.test(nm) && r<2) target={nm,r,sh,c}; } }
  mc.params[31]=0; chord(target.nm, ["","m"][target.r]); await sleep(500);
  check("in the sharp waters, a sharpened chord hits its ship", a.shots.get(target.c+","+target.r)==="hit", `${target.nm}${["","m"][target.r]} in ${target.sh.name}`);
  mc.params[31]=1; chord(target.nm, ["","m"][target.r]); await sleep(50);
  check("the same chord flattened is spelled flat, and falls off the chart there", /OFF THE CHART|ALREADY/.test(t.heard()) || /♭/.test(t.heard()), t.heard());
  a.level=0; sb.kfWave();
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
