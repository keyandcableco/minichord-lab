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
  // from level 3 the sea reaches B-flat and F-sharp, so F major and B major sail
  const seen=new Set(); for(let lv=2;lv<8;lv++){ a.level=lv; for(let n=0;n<60;n++){ sb.kfWave(); a.ships.forEach(s=>seen.add(s.name)); } }
  check("from level 3, F major and B major sail too", seen.has("F MAJOR") && seen.has("B MAJOR") && w.eval("KF_COLS.length")===9, [...seen].filter(n=>/^(F|B|B♭|F♯) /.test(n)).join(", "));
  a.level=0; sb.kfWave(); a.torps=9;
  const s0=a.ships[0], COLS="FCGDAEB", ROWS=["","m","7"];
  const [c0,r0]=s0.cells[0]; chord(COLS[c0], ROWS[r0]); await sleep(500);
  note(t.PC[s0.tonic]); await sleep(300);
  check("plucking the tonic sinks it early", s0.sunk, s0.name);
  await sleep(2600);                                          // the fleet is sunk: the next one sails in
  a.level=2; sb.kfWave(); a.torps=20; const s1=a.ships.find(s=>s.kind==="major"||s.kind==="minor")||a.ships[0];
  const fire=(c,r)=>{ const nm=w.eval(`KF_COLS[${c}]`); mc.params[31]=nm.includes("♭")?1:0; chord(nm, ROWS[r]); };   // the sea's own columns, the modifier set for a sharp or flat
  for(const [c,r] of s1.cells){ fire(c,r); await sleep(r===2?1700:500); }
  check("hitting every chord only cripples it", s1.crippled && !s1.sunk);
  note(t.PC[s1.tonic]); await sleep(200);
  check("the harp can't call from level 3", !s1.sunk, t.heard());
  const V=w.eval(`KF_LINE[KF_LINE.indexOf(${JSON.stringify(s1.tonic)})+1]`);
  mc.params[31]=V.includes("♭")?1:0; chord(V,"7"); await sleep(300); chord(s1.tonic, s1.minor?"m":""); await sleep(400);
  check("its V7 then I sinks it", s1.sunk, `${V}7 → ${s1.tonic}${s1.minor?"m":""}`);
  // a cadence whose V7 lies off the sea still calls: F-sharp minor's C-sharp 7 is past this sea's edge
  a.level=2; sb.kfWave(); a.torps=20; await sleep(30);
  a.ships=[{kind:"minor", cells:[[6,1],[7,1],[8,1]], name:"F♯ MINOR", detail:"", tonic:"F♯", minor:true, hits:new Set(["7,1"]), sunk:false, misses:0}];
  mc.params[31]=0; chord("C♯","7"); await sleep(300); chord("F♯","m"); await sleep(300);
  check("a cadence calls even when its V7 is off the sea", a.ships[0].sunk, t.heard());
  await sleep(2600);                                          // that fleet's sunk: the next one sails in
  a.ships=[{kind:"major", cells:[[0,0],[1,0],[2,0]], name:"C MAJOR", detail:"", tonic:"C", minor:false, hits:new Set(), sunk:false, misses:0}];
  // a call on a ship not yet hit is blind, and costs a torpedo
  const tb=a.torps; chord("G","7"); await sleep(300); chord("C"); await sleep(300);
  check("a key can't be called on a ship not yet hit", !a.ships[0].sunk && a.torps===tb-1 && /NO CONTACT/.test(t.heard()), t.heard());
  a.ships[0].hits.add("1,0");                                 // contact: one of its chords hit
  mc._asked=0; const dump=[0xF0]; for(let k=0;k<256;k++){ const v=mc.params[k]||0; dump.push(v&127, v>>7); } dump.push(0xF7); dump[71]=0; dump[72]=0;
  mc._dump(dump); await sleep(100);
  check("the combo picking C (reported unasked) calls C major", a.ships[0].sunk, t.heard());
  // a preset loaded on the instrument reports unasked too, with lots changed (its key among them):
  // that's no call, and the game's key goes back to C
  a.ships=[{kind:"major", cells:[[0,0],[1,0],[2,0]], name:"G MAJOR", detail:"", tonic:"G", minor:false, hits:new Set(["1,0"]), sunk:false, misses:0}];
  const pd=[0xF0]; for(let k=0;k<256;k++){ let v=mc.params[k]||0; if(k>=20 && k<40) v=(v+3)%100; if(k===35) v=1; pd.push(v&127, v>>7); } pd.push(0xF7);
  const heardBefore=t.heard(); mc._asked=0; mc._dump(pd); await sleep(100);
  check("a preset loaded on the instrument isn't a key call", !a.ships[0].sunk && t.heard()===heardBefore, t.heard());
  check("and the game's key goes back to C after it", mc.params[35]===0);
  // the wider seas: a line of fifths, every key on it, no two keys in a fleet that sound the same
  a.level=10; let twins=0, cols=0, ok=0;
  for(let n=0;n<80;n++){ sb.kfWave(); cols=w.eval("KF_COLS.length"); const homes=a.ships.map(s=>t.PC[s.tonic]); if(new Set(homes).size<homes.length) twins++; if(a.ships.length===3) ok++; }
  check("every key's sea is fifteen columns, G♭ to G♯", cols===15 && w.eval("KF_COLS[0]")==="G♭" && w.eval("KF_COLS[14]")==="G♯");
  check("its fleets never hold two keys that sound the same", twins===0 && ok===80, `${twins} with twins`);
  // the modifier's way decides the spelling: sharpened C is C♯, flattened D is D♭, different places
  mc.params[31]=0; const sharp=w.eval("kfSpell(1)"); mc.params[31]=1; const flat=w.eval("kfSpell(1)");
  check("sharpening gives C♯, flattening D♭", sharp==="C♯" && flat==="D♭" && w.eval("KF_COLS.indexOf('C♯')")!==w.eval("KF_COLS.indexOf('D♭')"));
  mc.params[31]=0; a.phase="play"; note(5); await sleep(20);
  check("in the wider seas the double tap flips the modifier, not the harp", mc.params[31]===0 && /DOUBLE-TAP/.test(t.heard()), t.heard());
  w.eval("settings.modTap='off'"); note(5); await sleep(20);
  check("with the double tap turned off, the harp flips it", mc.params[31]===1);
  w.eval("settings.modTap='on'"); mc.params[31]=0;
  // a shot at a sharp: in the sharp waters, a ship on F♯ or C♯ is hit by the sharpened chord
  a.level=9; let target=null;
  for(let n=0;n<60 && !target;n++){ sb.kfWave(); a.torps=20; for(const sh of a.ships) for(const [c,r] of sh.cells){ const nm=w.eval(`KF_COLS[${c}]`); if(!target && /♯/.test(nm) && r<2) target={nm,r,sh,c}; } }
  mc.params[31]=0; chord(target.nm, ["","m"][target.r]); await sleep(500);
  check("in the sharp waters, a sharpened chord hits its ship", a.shots.get(target.c+","+target.r)==="hit", `${target.nm}${["","m"][target.r]} in ${target.sh.name}`);
  mc.params[31]=1; chord(target.nm, ["","m"][target.r]); await sleep(50);
  check("the same chord flattened is spelled flat, and falls off the chart there", /OFF THE CHART|ALREADY/.test(t.heard()) || /♭/.test(t.heard()), t.heard());
  // the last fleets sail as progressions, scattered: a row's chords apart are separate boats
  const progs=new Set(); for(let lv=8;lv<11;lv++){ a.level=lv; for(let n=0;n<40;n++){ sb.kfWave(); a.ships.forEach(s=>{ if(w.eval(`!!KF_PROGS[${JSON.stringify(s.kind)}]`)) progs.add(s.kind); }); } }
  check("the last three levels sail progressions, every kind", progs.size===5, [...progs].join(", "));
  check("a progression's chords apart in a row are drawn as two boats", w.eval("kfRuns([[2,0],[0,0],[4,1],[5,1]]).length")===3);
  // from level 7 a key can be called before a hit: proved by the chart, a big bonus; guessed, less;
  // wrong, two torpedoes
  const callFirst=()=>{ const s=a.ships[0]; return w.eval(`kfCall(s=>s.tonic===${JSON.stringify(s.tonic)} && s.minor===${s.minor}, "TEST")`); };
  a.level=6; let tries=0; do{ sb.kfWave(); tries++; }while(w.eval("kfForced")(s=>s.tonic===a.ships[0].tonic && s.minor===a.ships[0].minor) && tries<50);
  a.torps=20; let n=a.ships[0].cells.length, sc=a.score; callFirst();
  check("a right call the chart didn't prove sinks, for the plain points", a.ships[0].sunk && a.score-sc===w.eval(`mulPts(${50*n*7})`), `${a.score-sc}`);
  sb.kfWave(); a.torps=20;
  const own=new Set(a.ships.flatMap(s=>s.cells.map(([c,r])=>c+","+r)));
  for(let r=0;r<3;r++) for(let c=0;c<w.eval("KF_COLS.length");c++){ const k=c+","+r; if(!own.has(k) && !a.islands.has(k)) a.shots.set(k,"miss"); }
  n=a.ships[0].cells.length; sc=a.score; callFirst();
  check("called sight unseen when the chart proves it, the biggest bonus", a.ships[0].sunk && a.score-sc===w.eval(`mulPts(${(100*n+40*n)*7})`), `${a.score-sc}`);
  sb.kfWave(); a.torps=20; const homes=new Set(a.ships.map(s=>t.PC[s.tonic]));
  const away=["C","G","D","A","E","B","F"].find(k=>!homes.has(t.PC[k]) && !a.ships.some(s=>s.minor && t.PC[s.tonic]===(t.PC[k]+9)%12));
  w.eval(`kfCall(s=>!s.minor && s.tonic===${JSON.stringify(away)}, "WRONG")`);
  check("a wrong call there costs two torpedoes", a.torps===18, a.torps);
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
