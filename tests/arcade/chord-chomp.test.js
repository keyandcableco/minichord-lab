// Chord Chomp: steered on the harp and the keys, the dots eaten (and sung, with a chord held), a
// power pellet turning blue only the ghost whose chord is held, the others still deadly, cadences, the
// key that turns up taken by the combo (and by its home chord without one), capsules, and a maze cleared.
const t=require("./harness").load("chord-chomp");
(async()=>{
  const {w, sb, sleep, key, note, chord, check, d, mc}=t;
  await sleep(150); t.connect({key:2}); await sleep(100);
  let sounding=[]; Object.defineProperty(mc,"voices",{get:()=>sounding.map((p,i)=>({note:p, pitch:p, voice:i})), configurable:true});
  const hold=(pc,q="")=>{ sounding=t.IV[q].map(x=>48+pc+x); };
  const a=await t.start(1); await sleep(100);
  check("the minichord's key is set to the maze's, C", t.mc.params[35]===w.eval("keyIndexOf(0)") && a.key.name==="C");
  check("every dot of the maze is out, and four ghosts wear I, IV, V and vi", a.left===a.total && a.total>150 && a.ghosts.map(g=>g.num).sort().join()==="I,IV,V,vi", `${a.total} dots; ${a.ghosts.map(g=>g.num).join(" ")}`);
  check("their chords are the key's", a.ghosts.every(g=>g.chord.sym===({I:"C",IV:"F",V:"G",vi:"Am"})[g.num]));
  await sleep(1900);
  check("READY, then play", a.st==="go");
  // the harp steers: on the standard strip the top three strings are up, the bottom three down
  note(0); await sleep(20);
  check("the harp steers: a low string is down", a.want==="down");
  note(11); await sleep(20);
  check("a high string is up", a.want==="up");
  key("ArrowLeft"); await sleep(20);
  check("and the arrow keys", a.want==="left");
  // eat: the player's left along its row from the start
  const left0=a.left; await sleep(900);
  check("dots are eaten, and score", a.left<left0 && a.score>0, `${left0-a.left} eaten, score ${a.score}`);
  check("with nothing held, a dot is the waka", a.sung==null);
  hold(0); await sleep(700);
  check("a chord held: the dots sing its notes", a.sung!=null && [0,4,7].includes(w.eval("mod")(a.sung,12)), `sang ${a.sung}`);
  sounding=[];
  // power: only the ghost whose chord is held turns blue; the others still chase
  const place=(g,x,y)=>Object.assign(g,{state:"out", x, y, p:0, dir:"left", scared:false});
  w.eval("blast.fermataUntil=blast.clock+60; ccPowerStart()");          // the ghosts held still, to set the scene
  const [g0,g1]=a.ghosts; place(g0,20,9); place(g1,6,9); a.ghosts.slice(2).forEach((g,i)=>place(g,3+i,13));
  hold(g0.chord.pc, g0.chord.q); await sleep(60);
  check("power on, a ghost's chord held: that ghost is blue", g0.scared && !g1.scared);
  // run the player into it
  Object.assign(a.pac,{x:19, y:9, p:0, dir:"right"}); a.want="right";
  const s0=a.score; await sleep(400);
  check("the blue ghost is caught, for 200 a level", g0.state==="eyes" && a.score-s0>=200*2, `${a.score-s0}`);
  await sleep(700);
  // the next ghost not held: it catches the player
  sounding=[]; await sleep(30);
  const lives=a.lives; Object.assign(a.pac,{x:8, y:9, p:0, dir:"left"}); a.want="left";
  for(let i=0;i<40 && a.st==="go";i++) await sleep(30);
  check("a ghost whose chord isn't held still catches you, power or not", a.st==="dying");
  await sleep(1900);
  check("and it costs a life; everyone back in place", a.lives===lives-1 && a.pac.x===13 && a.pac.y===11);
  // cadences
  check("cadences: IV V I full, V I perfect, IV I plagal, V vi deceptive, anything then V half",
    w.eval("[['IV','V','I'],['ii','V','I'],['vi','V','I'],['IV','I'],['V','vi'],['I','V'],['vi','IV']].map(l=>ccCadence(l)?.name||'-').join()")===
    "FULL CADENCE,FULL CADENCE,PERFECT CADENCE,PLAGAL CADENCE,DECEPTIVE CADENCE,HALF CADENCE,-");
  // the key that turns up, set with the combo
  await sleep(1900);
  w.eval("blast.fruit=null; ccFruitSpawn(); blast.fruit.f=1; blast.fruit.key=ccKey(1)");
  check("a key turns up, a fifth away", a.fruit && Math.abs(a.fruit.f)===1);
  const s1=a.score, V=a.ghosts.find(g=>g.num==="V");
  t.mc.params[35]=w.eval("keyIndexOf(1)"); mc.dispatchEvent(new w.Event("device")); await sleep(30);
  check("set with the combo: the maze is in G, the minichord with it, and it scores", a.key.name==="G" && !a.fruit && a.score>s1 && t.mc.params[35]===w.eval("keyIndexOf(1)"));
  check("the ghosts' numerals name G's chords now: V is D", V.chord.sym==="D");
  // the jam session: the key taken leaves a little minichord in the tunnel
  check("taking a key leaves a little minichord in the tunnel", a.mini && a.mini.y===7 && [2,24].includes(a.mini.x) && a.jamUsed);
  await sleep(1300);
  w.eval("blast.fermataUntil=blast.clock+60; const m=blast.mini; Object.assign(blast.pac,{x:m.x+1, y:7, p:0, dir:'left'}); blast.want='left'");
  for(let i=0;i<30 && a.st!=="jam";i++) await sleep(30);
  check("eaten: a jam session, the ghosts' chords in a progression's order", a.st==="jam" && a.jam.seq.map(g=>g.num).join()==="I,vi,IV,V", a.jam && a.jam.seq.map(g=>g.num).join());
  check("and the band's chart up", !d.querySelector(".ccjam").hidden && d.querySelectorAll(".ccjamchips span").length===4);
  const u0=a.jam.until; chord("A"); await sleep(30);
  check("a wrong chord costs time, and catches nothing", a.jam.until<u0-1 && a.jam.i===0);
  const s2=a.score;
  for(const [r,q] of [["G",""],["E","m"],["C",""],["D",""]]){ chord(r,q); await sleep(40); }
  check("played in order, each chord catches its ghost, and all four the big bonus", !a.jam && a.ghosts.every(g=>g.state!=="out") && a.score-s2>=(4*400+3000)*2 && d.querySelector(".ccjam").hidden, `${a.score-s2}`);
  t.mc.params[35]=w.eval("keyIndexOf(-3)"); mc.dispatchEvent(new w.Event("device")); await sleep(30);
  check("a key set with none up goes back to the maze's", t.mc.params[35]===w.eval("keyIndexOf(1)") && a.key.name==="G" && /NO KEY/.test(t.heard()));
  // capsules
  w.eval("ccPowerGet('fermata')");
  const gx=a.ghosts.map(g=>g.x+","+g.y+","+g.p).join(); await sleep(300);
  check("FERMATA: the ghosts hold still", a.ghosts.filter(g=>g.state==="out").every(g=>a.ghosts.map(g=>g.x+","+g.y+","+g.p).join()===gx));
  w.eval("blast.fermataUntil=0; ccPowerGet('rest')");
  check("REST: the ghosts make for their corners", a.ghosts.every(g=>g.state!=="out" || w.eval(`ccTarget(blast.ghosts[${g.i}]).join()`)===g.corner.join()));
  w.eval("blast.restUntil=0");
  const l0=a.lives; w.eval("ccPowerGet('dacapo')");
  check("DA CAPO: a life back", a.lives===l0+1);
  // the maze cleared: the next level
  const lv=a.level; w.eval("blast.dots.forEach(r=>r.fill(0)); blast.dots[11][12]=1; blast.left=1; Object.assign(blast.pac,{x:13,y:11,p:0,dir:'left'}); blast.want='left'; blast.ghosts.forEach(g=>{g.state='house'; g.releaseAt=1e9;})");
  for(let i=0;i<120 && a.level===lv;i++) await sleep(50);
  check("every dot eaten: the next level, a full maze, the key kept", a.level===lv+1 && a.left===a.total && a.key.name==="G");
  // a caught ghost's eyes run home, wait, and it comes out again (once, it was let out mid-step and stopped the game)
  const errs=[]; w.addEventListener("error", e=>errs.push(e.message));
  await sleep(1900);
  w.eval("blast.ghosts.slice(1).forEach(g=>{ g.state='house'; g.releaseAt=1e9; }); Object.assign(blast.ghosts[0],{state:'out', x:20, y:9, p:.5, dir:'left', scared:false}); ccCatch(blast.ghosts[0])");
  const g9=a.ghosts[0]; let home=false;
  for(let i=0;i<160 && !(home && g9.state==="out");i++){ await sleep(50); if(g9.state==="house") home=true; }
  check("a caught ghost's eyes go home, and it comes back out", home && g9.state==="out" && !errs.length, errs[0]||g9.state);
  // without the combo (stock firmware), a key that's up is taken by its home chord, and the game sets it
  t.mc.params[7]=9; await sleep(1900);
  w.eval("blast.fruit=null; ccFruitSpawn(); blast.fruit.f=2; blast.fruit.key=ccKey(2)");
  chord("D"); await sleep(30);
  check("on firmware without the combo, the key's home chord takes it, and the minichord's set to it", a.key.name==="D" && t.mc.params[35]===w.eval("keyIndexOf(2)"));
  check("the little minichord turns up only once a game", !a.mini);
  t.mc.params[7]=17;
  // leaving gives the key back
  sb.restoreAll();
  check("leaving gives back the minichord's own key", t.mc.params[35]===2);
  t.done();
})();
