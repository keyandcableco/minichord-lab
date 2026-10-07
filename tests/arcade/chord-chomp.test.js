// Chord Chomp: steered on the harp and the keys, the dots eaten (and sung, with a chord held), a
// power pellet turning blue only the ghost whose chord is held, the others still deadly, cadences, the
// key that turns up taken by the combo (and by its home chord without one), capsules, a pellet with a
// key up turning them all blue, and a maze cleared.
const t=require("./harness").load("chord-chomp");
(async()=>{
  const {w, sb, sleep, key, note, chord, knob, check, d, mc}=t;
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
  // LATCH, the default: a chord played stays on once it's let go, till another, or the same again
  chord("F"); await sleep(400);
  check("latched: F played and let go, the dots go on singing F", a.held && [5,9,0].includes(a.sung%12) && /♪ F/.test(d.querySelector(".field .hud").textContent), `sang ${a.sung}`);
  chord("F"); await sleep(60);
  check("F again lets it go: the waka back", !a.held && !/♪/.test(d.querySelector(".field .hud").textContent));
  w.eval("saved.ccHold=1");
  check("HOLD scores a quarter more", w.eval("diffMult('chomp')")===w.eval("(()=>{ saved.ccHold=0; const m=diffMult('chomp'); saved.ccHold=1; return m; })()")*1.25);
  chord("F"); await sleep(60);
  check("HOLD: a chord played and let go counts for nothing", !a.held && !a.latched);
  w.eval("saved.ccHold=0");
  // the knob, as a dial: up in the middle, right a quarter round, down at either end, left a quarter back
  const until=async(f, ms=3000)=>{ for(let t0=Date.now(); !f() && Date.now()-t0<ms;) await sleep(15); return f(); };
  const ways=[]; for(const [v,want] of [[64,"up"],[96,"right"],[127,"down"],[32,"left"],[64,"up"]]){ knob(v); await until(()=>a.want===want, 1500); ways.push(a.want); }
  check("the knob steers as a dial: up in the middle, right, down at the end, left, up", ways.join()==="up,right,down,left,up", ways.join());
  w.eval("window.__turns=[]; const ccTurn0=ccTurn; ccTurn=d=>{ __turns.push(d); ccTurn0(d); }");
  for(const v of [80,96,112,124]) knob(v); await until(()=>w.eval("__turns.length>0"));
  check("swept from up round to down, the way it passes on the way isn't taken", w.eval("__turns.join()")==="down" && a.want==="down", w.eval("__turns.join()"));
  w.eval("__turns.length=0"); await until(()=>a.want==="up", 4000);
  knob(96); await until(()=>a.want!=="up", 1500);
  check("held at its end, it keeps going round: left, then up", /^left,up/.test(w.eval("__turns.join()")), w.eval("__turns.join()"));
  check("turned back off the end, the dial goes on from where it got to: a quarter back is left", a.want==="left", a.want);
  // power: only the ghost whose chord is held turns blue; the others still chase
  const place=(g,x,y)=>Object.assign(g,{state:"out", x, y, p:0, dir:"left", scared:false});
  w.eval("blast.fermataUntil=blast.clock+60; ccPowerStart()");          // the ghosts held still, to set the scene
  const [g0,g1]=a.ghosts; place(g0,20,15); place(g1,6,15); a.ghosts.slice(2).forEach((g,i)=>place(g,3+i,27));
  hold(g0.chord.pc, g0.chord.q); await sleep(60);
  check("power on, a ghost's chord held: that ghost is blue", g0.scared && !g1.scared);
  sounding=[]; chord(g1.chord.root, g1.chord.q); await sleep(60);
  check("latched, let go: the ghost whose chord it is turns blue, and the other back", g1.scared && !g0.scared);
  chord(g1.chord.root, g1.chord.q); hold(g0.chord.pc, g0.chord.q); await sleep(60);
  // run the player into it
  Object.assign(a.pac,{x:19, y:15, p:0, dir:"right"}); a.want="right";
  const s0=a.score; await sleep(400);
  check("the blue ghost is caught, for 200 a level", g0.state==="eyes" && a.score-s0>=200*2, `${a.score-s0}`);
  await sleep(700);
  // the next ghost not held: it catches the player
  sounding=[]; await sleep(30);
  const lives=a.lives; Object.assign(a.pac,{x:8, y:15, p:0, dir:"left"}); a.want="left";
  for(let i=0;i<40 && a.st==="go";i++) await sleep(30);
  check("a ghost whose chord isn't held still catches you, power or not", a.st==="dying");
  await sleep(1900);
  check("and it costs a life; everyone back in place", a.lives===lives-1 && a.pac.x===13 && a.pac.y===23);
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
  check("taking a key leaves a little minichord in the tunnel", a.mini && a.mini.y===11 && [2,24].includes(a.mini.x) && a.jamUsed);
  await sleep(1300);
  w.eval("blast.fermataUntil=blast.clock+60; const m=blast.mini; Object.assign(blast.pac,{x:m.x+1, y:m.y, p:0, dir:'left'}); blast.want='left'");
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
  // a key up: a power pellet turns them all blue, whatever's held, for long enough to set the key
  w.eval("blast.fermataUntil=blast.clock+60; blast.latched=null; blast.fruit=null; ccFruitSpawn(); blast.fruit.until=blast.clock+1; ccPowerStart()");
  a.ghosts.forEach((g,i)=>place(g,3+i,27)); sounding=[]; await until(()=>a.st==="go"); await sleep(60);
  check("a key up, a power pellet with nothing held: every ghost out turns blue", a.ghosts.every(g=>g.scared), `${a.st}: ${a.ghosts.map(g=>g.state+(g.scared?" blue":"")).join(", ")}`);
  check("and the key stays up till the power's done", a.fruit && a.fruit.until>=w.eval("blast.powerUntil")+1.9);
  w.eval("blast.fruit=null; blast.powerUntil=0; blast.powerAll=false"); await sleep(60);
  check("the power over, they're dangerous again", a.ghosts.every(g=>!g.scared));
  const pel=w.eval("(()=>{ blast.dots.forEach(r=>r.forEach((v,x)=>{ if(v===2) r[x]=0; })); const l=blast.left; ccFruitSpawn(); return {back:blast.dots.flat().filter(v=>v===2).length, more:blast.left-l}; })()");
  check("a key that turns up with every pellet eaten puts one back", pel.back===1 && pel.more===1, JSON.stringify(pel));
  w.eval("blast.fruit=null; blast.fermataUntil=0");
  // the maze cleared: the next level
  const lv=a.level; w.eval("blast.dots.forEach(r=>r.fill(0)); blast.dots[23][12]=1; blast.left=1; Object.assign(blast.pac,{x:13,y:23,p:0,dir:'left'}); blast.want='left'; blast.ghosts.forEach(g=>{g.state='house'; g.releaseAt=1e9;})");
  for(let i=0;i<120 && a.level===lv;i++) await sleep(50);
  check("every dot eaten: the next level, a full maze, the key kept", a.level===lv+1 && a.left===a.total && a.key.name==="G");
  // a caught ghost's eyes run home, wait, and it comes out again (once, it was let out mid-step and stopped the game)
  const errs=[]; w.addEventListener("error", e=>errs.push(e.message));
  await sleep(1900);
  w.eval("blast.ghosts.slice(1).forEach(g=>{ g.state='house'; g.releaseAt=1e9; }); Object.assign(blast.ghosts[0],{state:'out', x:20, y:15, p:.5, dir:'left', scared:false}); ccCatch(blast.ghosts[0])");
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
  // The maze is built as tall as the room it has. Every height it can be: the same both sides, no dead
  // end, every dot reachable from the start, the ghosts' house, door and tunnel where they're looked for.
  const mazes=w.eval(`(()=>{ const bad=[];
    for(let rows=20; rows<=70; rows++) for(let seed=0; seed<6; seed++){
      ccBuild(rows, seed); const m=CC_MAZE, R=CC_ROWS, C=CC_COLS, want=Math.max(29, Math.min(CC_MOST, rows)), why=[];
      if(R!==want && !(want===30 && R===29)) why.push("rows "+R);
      m.forEach((r,y)=>{ if(r.length!==C) why.push("row "+y+" width"); if([...r].reverse().join("")!==r) why.push("row "+y+" lopsided"); });
      const open=(x,y)=> !"#-G".includes(ccCell(x,y));
      for(let y=0;y<R;y++) for(let x=0;x<C;x++) if(open(x,y) && [[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>open(x+a,y+b)).length<2) why.push("dead end "+x+","+y);
      const seen=new Set(), q=[[CC_START.x,CC_START.y]];
      while(q.length){ const [x,y]=q.pop(), k=x+","+y; if(seen.has(k) || !open(x,y)) continue; seen.add(k); for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]) q.push([mod(x+a,C), y+b]); }
      m.forEach((r,y)=>[...r].forEach((c,x)=>{ if(".o".includes(c) && !seen.has(x+","+y)) why.push("dot out of reach "+x+","+y); }));
      if(m[CC_OUT.y+1][CC_OUT.x]!=="-" || m[CC_IN.y][CC_IN.x]!=="G" || m[CC_TUNNEL][0]!==" " || m[CC_START.y][CC_START.x]!==".") why.push("house, door, tunnel or start astray");
      if(why.length) bad.push(rows+"/"+seed+": "+why.slice(0,3).join("; "));
    }
    ccBuild(29); return bad; })()`);
  check("every height the maze can be built: the same both sides, no dead ends, every dot reachable, the house where it's looked for", !mazes.length, mazes.slice(0,4).join(" | "));
  // How it's shown. On a desktop's field, the maze as it always was, whole, at a whole number of screen
  // pixels a pixel. On a phone held upright, as tall as the room it has, as wide as the room, all in
  // view: with a minichord plugged in (no strip of harp sections, no minichord on the screen) nearly
  // twice as tall, under the screen's minichord a little taller. A maze under way when the room shrinks
  // is kept, as wide as the room, the view following the player. Held sideways, the maze as it always
  // was, at the smallest size big enough to play on, the view following the player.
  const lay=(fw,fh,dpr,keep)=>w.eval(`(()=>{ const fx=blast.fx; fx.ro=fx.ro||{}; fx.fw=${fw}; fx.fh=${fh}; Object.defineProperty(window,"devicePixelRatio",{value:${dpr}, configurable:true});
    const bare=document.createElement("div"); bare.className="fscab bare"; document.body.appendChild(bare); ${keep ? "" : "ccBuild(ccRowsFor());"} ccLayout(); const room=pxRoom(); bare.remove(); const out=[];
    for(const [x,y] of [[1,1],[13,CC_TUNNEL],[25,CC_ROWS-2],[1,CC_ROWS-2],[25,1]]){ Object.assign(blast.pac,{x, y, p:0}); ccCamera(0); const px=blast.ox+(x+.5)*blast.tile, py=blast.oy+(y+.5)*blast.tile, v=blast.view; out.push(px>=v.x && px<=v.x+v.w && py>=v.y && py<=v.y+v.h); }
    return {rows:CC_ROWS, scrolls:blast.scrolls, k:blast.k, sq:blast.tile*blast.k, w:blast.view.w, h:blast.view.h, across:blast.view.w*blast.k/room.aw, down:blast.view.h*blast.k/room.ah, seen:out}; })()`);
  const desk=lay(917,572,1);
  check("on a desktop's field, the maze as it always was, whole, unscrolled, at a whole number of screen pixels a pixel", desk.rows===29 && !desk.scrolls && Number.isInteger(desk.k) && desk.sq>=w.eval("CC_SMALL"), JSON.stringify(desk));
  const up=lay(408,913,2.625);
  check("on a phone held upright, a minichord plugged in: nearly twice as tall, right across the screen and top to bottom, all in view", up.rows>=50 && !up.scrolls && up.across>.99 && up.down>.96 && up.seen.every(Boolean), JSON.stringify(up));
  const deck=lay(408,616,2.625);
  check("over the screen's minichord: taller than the old maze, right across, top to bottom, all in view", deck.rows>29 && deck.rows<up.rows && !deck.scrolls && deck.across>.99 && deck.down>.93 && deck.seen.every(Boolean), JSON.stringify(deck));
  lay(408,913,2.625); const kept=lay(408,616,2.625,true);
  check("the minichord pulled out mid-maze: the tall maze kept, right across, scrolling up and down, the player kept in view", kept.rows===up.rows && kept.scrolls && kept.across>.99 && kept.seen.every(Boolean), JSON.stringify(kept));
  const side=lay(734,343,3);
  check("held sideways: the maze as it always was, big enough to play on, scrolling, the player kept in view", side.rows===29 && side.scrolls && side.sq>=w.eval("CC_SMALL") && side.sq<20 && side.seen.every(Boolean), JSON.stringify(side));
  w.eval("ccBuild(29)");
  w.eval(`Object.defineProperty(window,"devicePixelRatio",{value:1, configurable:true})`);
  // the demo's autopilot, a dot on the tile ahead and another behind: it eats on, at any frame rate
  // (it once turned back and forth between them for good, the demo stuck)
  const stuck=w.eval(`(()=>{ const tick=ccTick; ccTick=()=>{}; cancelAnimationFrame(blast.raf); const out=[];
    const keep={st:blast.st, auto:blast.demoAuto, dots:blast.dots.map(r=>[...r]), left:blast.left, pac:{...blast.pac}, want:blast.want, gh:blast.ghosts.map(g=>({...g}))};
    for(const hz of [30,60,120,144]) for(const [ahead,behind] of [[1,1],[1,3],[2,2]]) for(let p0=0; p0<1; p0+=.1){
      blast.st="go"; blast.demoAuto=true; blast.autoAt=0; blast.ghosts.forEach(g=>{ g.state="house"; g.releaseAt=1e9; });
      blast.dots.forEach(r=>r.fill(0)); blast.dots[4][13-ahead]=1; blast.dots[4][13+behind]=1; blast.left=2;
      Object.assign(blast.pac,{x:13, y:4, p:p0, dir:"left"}); blast.want="left";
      for(let tt=0; tt<3 && blast.left>0; tt+=1/hz) ccStep(1/hz);
      if(blast.left>0) out.push(hz+"Hz "+ahead+"/"+behind+" p"+p0.toFixed(1));
    }
    Object.assign(blast,{st:keep.st, demoAuto:keep.auto, dots:keep.dots, left:keep.left, want:keep.want}); Object.assign(blast.pac,keep.pac); blast.ghosts.forEach((g,i)=>Object.assign(g,keep.gh[i]));
    ccTick=tick; blast.last=performance.now(); blast.raf=requestAnimationFrame(ccTick); return out; })()`);
  check("the demo's autopilot, a dot just ahead and another behind, eats on at any frame rate", !stuck.length, stuck.slice(0,4).join(", "));
  // leaving gives the key back
  sb.restoreAll();
  check("leaving gives back the minichord's own key", t.mc.params[35]===2);
  t.done();
})();
