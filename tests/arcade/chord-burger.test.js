// Chord Burger: the kitchens hold together; the cook walks while a way's held on the harp, takes a
// ladder a held way asks for, and stops when it's let go; an ingredient trodden across drops, knocks
// the one below down, and lands on its plate in its column's order; a full plate is served by its
// chord and bass (a slash chord as good as the knob), and from the open kitchens by its whole stack;
// the knobs voice it (inversion 37, spacing 38), or SET FOR ME does; the pepper harmonises sour notes
// whose note is in the chord and spends a shake, wastes one on those it misses, and comes free with a
// serve; riders take an ingredient down to the lowest floor, knocking all under it onto the plate,
// floor by floor, in its order, and are squashed there for a doubling bonus; a sour note catches the cook; FLIP; the combo meal; a
// kitchen cleared is the next level; every level deals chords that spell; the settings given back.
const t=require("./harness").load("chord-burger");
(async()=>{
  const {sb, sleep, check, mc, w}=t;
  await sleep(150); t.connect({firmware:21, extra:{120:2, 111:1, 198:2, 37:0, 38:0, 117:0}}); await sleep(100);
  const E=s=>w.eval(s);
  const play=async pitches=>{ sb.answerChord(pitches.map((pitch,voice)=>({pitch, voice}))); await sleep(30); };
  const hold=pc=>mc._harp([0x90, 60+pc, 100]), lift=pc=>mc._harp([0x80, 60+pc, 0]);
  const LEFT=7, RIGHT=3, UP=10, DOWN=1;                                // the strip: 7-8 left, 3-4 right, 9-11 up, 0-2 down

  // the kitchens: every floor reached, ladders on girders at both ends and clear of the ingredients,
  // every ingredient lying whole on a girder
  const kitchens=E(`BK_KITCHENS.map((K,n)=>{
    const bad=[];
    K.ladders.forEach((cols,gap)=>cols.forEach(c=>{ if(!bkSeg(gap,c,K) || !bkSeg(gap+1,c,K)) bad.push("ladder "+c+" off a girder"); if(BK_SPANS.some(x=>c>=x && c<=x+3)) bad.push("ladder "+c+" in an ingredient"); }));
    K.cols.forEach((fs,p)=>fs.forEach(f=>{ if(!bkHolds(f, BK_SPANS[p], K)) bad.push("plate "+p+" floor "+f+" not on a girder"); }));
    const seen=new Set(["4|"+K.floors[4][0][0]]), todo=[[4,K.floors[4][0]]];
    while(todo.length){ const [f,s]=todo.pop(); for(const gap of [f-1,f]) for(const c of K.ladders[gap]||[]){ if(c<s[0]||c>s[1]) continue; const nf= gap===f ? f+1 : f-1, ns=bkSeg(nf,c,K); const k=nf+"|"+ns[0]; if(!seen.has(k)){ seen.add(k); todo.push([nf,ns]); } } }
    const all=K.floors.reduce((n,segs)=>n+segs.length,0); if(seen.size!==all) bad.push("only "+seen.size+" of "+all+" girders reached");
    return bad.join("; ");
  })`);
  check("every kitchen holds together: ladders on girders, ingredients whole, every girder reached", kitchens.every(b=>!b), kitchens.join(" / "));

  // every level deals plates that spell, and stacks the minichord can play, in every key it deals
  const dealt=E(`(()=>{ const out=[]; const was=blast.level;
    for(let lv=0; lv<BK_LEVELS.length; lv++) for(let k=0;k<12;k++){ blast.level=lv; const L=bkLevel(); const f=L.keys ? [-L.keys,0,L.keys][k%3] : 0; blast.key=bkKey(f); blast.kitchen=BK_KITCHENS[k%3];
      try{ bkDeal(); }catch(e){ out.push(lv+": "+e.message); continue; }
      for(const P of blast.plates){ const c=P.chord; if(!c || c.names.some(n=>!n)) out.push(lv+": a plate unspelled");
        const again=firmwareStack(c.rootPc, VL_TONES[c.q], c.inv, c.sp, 24).map(p=>p+24); if(again.join()!==c.pitches.join()) out.push(lv+": "+c.sym+" isn't what the minichord plays"); } }
    blast.level=was; return out; })()`);
  check("every level deals chords that spell, voiced as the minichord voices them", !dealt.length, dealt.slice(0,3).join("; "));

  // the demo's cook walks to the squares it stops at and stands there, not rocking either side of them
  E(`bkDemo()`); const stood=new Set();
  for(let i=0; i<300 && stood.size<2; i++){ await sleep(50);
    const c=E(`blast.cook && !blast.cook.moving && !(blast.demoWays||[]).length ? blast.cook.x+","+blast.cook.y : ""`);
    if(["8,4","20,3"].includes(c)) stood.add(c); }
  E(`endBkDemo(blast.demo)`); await sleep(50);
  check("the demo's cook stops on each square it walks to", stood.size===2, [...stood].join(" "));

  const a=await t.start(0); await sleep(2100);
  check("the minichord set up: two octaves up, no voice leading, the chord octave down one, the voicing at root", mc.params[120]===5 && mc.params[111]===0 && mc.params[198]===1 && mc.params[37]===0 && mc.params[38]===0,
    `120=${mc.params[120]} 111=${mc.params[111]} 198=${mc.params[198]}`);
  a.sour.forEach(e=>{ e.state="wait"; e.at=1e9; });                     // the sour notes wait while the kitchen's tried out
  check("the cook starts on the bottom floor, the plates empty", a.cook.y===4 && a.plates.every(P=>!P.stack.length) && a.st==="go");

  // walking: held, it goes; let go, it stands
  hold(RIGHT); await sleep(400); const x1=a.cook.x;
  check("a way held on the harp walks the cook", x1>14.5, x1.toFixed(2));
  lift(RIGHT); await sleep(150); const x2=a.cook.x; await sleep(300);
  check("let go, the cook stands", a.cook.x===x2 && !a.cook.moving);
  // a held way up taken at the next ladder: right held, then up as well, past ladder 21 on the bottom floor
  a.cook.x=18; a.cook.y=4;
  hold(RIGHT); await sleep(40); hold(UP); await sleep(900);
  check("up held while walking: the next ladder's taken", a.cook.x===21 && a.cook.y<4, `${a.cook.x.toFixed(2)}, ${a.cook.y.toFixed(2)}`);
  lift(UP); lift(RIGHT); await sleep(100);
  // STEER: KNOB, offered with SET FOR ME (MINE's knobs are the voicing's): the knob is the square to
  // stand on; the harp's top held is up, the first ladder on the way taken; any other touch flips
  check("STEER isn't offered when the knobs are the voicing's (MINE)", !E("optsFor('burger',['game']).some(o=>o.id==='pfSteer')"));
  E("saved.bkAuto=true; saved.pfKnob=1");
  check("with SET FOR ME it is", E("optsFor('burger',['game']).some(o=>o.id==='pfSteer')"));
  const vw=E("({...blast.voicing})");
  a.cook.x=10; a.cook.y=4; t.knob(83);
  for(let i=0;i<300 && !(a.cook.x===18 && !a.cook.moving);i++) await sleep(20);
  check("the knob is the square to stand on: the cook walks there and stops", a.cook.x===18 && a.cook.y===4 && !a.cook.moving, a.cook.x.toFixed(2));
  hold(UP); t.knob(112); for(let i=0;i<200 && a.cook.y===4;i++) await sleep(20); await sleep(100);
  check("the harp's top held, walking: the first ladder up on the way is taken", a.cook.x===21 && a.cook.y<4, `${a.cook.x.toFixed(2)}, ${a.cook.y.toFixed(2)}`);
  lift(UP); await sleep(50);
  E("window.__flips=0; const bkFlip0=bkFlip; bkFlip=()=>{ __flips++; bkFlip0(); }");
  hold(LEFT); lift(LEFT); hold(UP); lift(UP); await sleep(30);
  check("a touch that isn't the harp's top or bottom flips; the top doesn't", E("__flips")===1);
  E(`saved.bkAuto=false; saved.pfKnob=0; bkVoice(${vw.inv}, ${vw.sp})`); await sleep(50);
  // An iPhone 15's screen held upright, a minichord plugged in: the floors further apart, zoomed in to fill
  // the height, the kitchen scrolling across, nearly half of it in view (two plates)
  const upright=E(`(()=>{ const fx=blast.fx, was=[fx.ro, fx.fw, fx.fh]; fx.ro=fx.ro||{}; fx.fw=389; fx.fh=659; Object.defineProperty(window,"devicePixelRatio",{value:3, configurable:true});
    const bare=document.createElement("div"); bare.className="fscab bare"; document.body.appendChild(bare); bkFloorsApart(); bkLayout(); const {ah}=pxRoom();
    const out={fh:BK_FH, H:BK_H, k:blast.k, scrolls:blast.scrolls, w:blast.view.w, h:blast.view.h, down:blast.view.h*blast.k/ah};
    bare.remove(); Object.defineProperty(window,"devicePixelRatio",{value:1, configurable:true}); [fx.ro, fx.fw, fx.fh]=was; bkFloorsApart(); blast.layoutKey=null; bkLayout(); return out; })()`);
  check("on a phone held upright, a minichord plugged in: floors further apart, the kitchen's height filling the phone, scrolling across, nearly half of it in view", upright.fh===32 && upright.h===upright.H && upright.down>.9 && upright.scrolls && upright.w>=Math.floor(.45*232) && upright.w<232, JSON.stringify(upright));
  check("on a desktop's field, the floors as they were", E("BK_FH")===24 && E("BK_H")===204);
  // the arrow keys too
  a.cook.x=16; a.cook.y=3; const kd=c=>t.d.dispatchEvent(new w.KeyboardEvent("keydown",{code:c, bubbles:true})), ku=c=>t.d.dispatchEvent(new w.KeyboardEvent("keyup",{code:c, bubbles:true}));
  kd("ArrowLeft"); await sleep(250); ku("ArrowLeft"); await sleep(50);
  check("the arrow keys walk, held", a.cook.x<15.5 && a.cook.y===3);

  // treading: each section pressed, the fourth drops it; it knocks the one below down; the order holds
  const col=p=>a.ings.filter(i=>i.p===p).sort((x,y)=>x.f-y.f);
  const P0=a.plates[1], c0=col(1), order0=c0.map(i=>i.name).reverse().join(" ");
  const tread=async (ing)=>{ a.cook.y=ing.f; a.cook.x=ing.x0-1; hold(RIGHT); for(let k=0;k<40 && ing.state==="rest" && ing.pressed.some(x=>!x) ;k++) await sleep(40); lift(RIGHT); await sleep(40); };
  const low=c0[c0.length-1], above=c0[c0.length-2];
  await tread(above);
  check("trodden across, an ingredient drops", above.state==="fall" || above.f>c0[c0.length-2].f || above.state==="plate");
  await sleep(900);
  check("dropped onto another, it knocks that one down onto the plate", low.state==="plate" && P0.stack[0]===low && above.state==="rest" && above.f===4, `${low.state} ${above.state} ${above.f}`);
  for(let k=0; k<12; k++){ const r=col(1).filter(i=>i.state==="rest").sort((x,y)=>y.f-x.f)[0]; if(!r) break; await tread(r); await sleep(1000); }   // each to the next girder down, till it's on the plate
  await sleep(800);
  check("the plate fills in its column's order, the bottom bun the bass", P0.stack.length===4 && P0.stack.map(i=>i.name).join(" ")===order0 && P0.state==="ready", P0.stack.map(i=>i.name).join(" "));

  // serving: the chord and its bass (level 1, root position)
  const c=P0.chord, s0=a.score;
  await play(c.pitches.map(p=>p+3));                                    // something else
  check("a chord that isn't the plate's serves nothing", P0.state==="ready");
  await play(c.pitches.map(p=>p-24));
  check("the plate's chord, its bass on the bottom bun, serves it", P0.state==="served" && a.score>s0, `${c.sym} ${a.score-s0}`);

  // the knobs: the steering knob swings the inversion, written to the minichord
  t.knob(Math.round(127*.3));
  check("the steering knob swings the inversion (address 37)", a.voicing.inv===1 && mc.params[37]===1, `${a.voicing.inv} ${mc.params[37]}`);
  t.knob(0);
  // a first inversion's plate: the bass wrong, then right, by a slash chord
  const P1=a.plates[0]; P1.chord=E(`bkChord(blast.key, "vi", 1, 0)`);
  P1.stack=a.ings.filter(i=>i.p===0); P1.stack.forEach((ing,k)=>Object.assign(ing,{state:"plate", k, name:P1.chord.names[k], pitch:P1.chord.pitches[k], pc:P1.chord.pcs[k]}));
  P1.state="ready"; P1.readyAt=a.clock;
  await play([57,60,64,69]);                                            // Am in root position
  check("the right chord with the wrong bass isn't served, and says what's wanted", P1.state==="ready" && /IN THE BASS/.test(t.heard()), t.heard());
  await play([48,57,64,69]);                                            // Am/C, as a slash chord plays it
  check("a slash chord putting the bottom bun in the bass serves it", P1.state==="served");

  // the pepper
  const e=a.sour[0]; Object.assign(e, {state:"walk", x:a.cook.x+3, y:a.cook.y, pc:6, name:"F♯"});
  const pep=a.pepper; await play([50,54,57]);                           // D: has F♯
  check("a chord with a sour note's note in it harmonises it, for a shake of pepper", e.state==="sweet" && a.pepper===pep-1, `${e.state} ${a.pepper}`);
  e.state="walk"; e.until=0; await play([48,52,55]);                    // C: hasn't
  check("a chord without it is a shake wasted", e.state==="walk" && a.pepper===pep-2 && /SOUR/.test(t.heard()), t.heard());
  Object.assign(e, {x:a.cook.x>14 ? 1 : 27, y:a.cook.y>2 ? 0 : 4, pc:10, name:"B♭"}); a.pepper=5;
  await play([43,46,50]);                                               // Gm: has B♭, the sour note the far side of the kitchen
  check("the pepper reaches a sour note anywhere in the kitchen", e.state==="sweet" && a.pepper===4, `${e.state} at ${e.x},${e.y}, cook ${a.cook.x.toFixed(1)},${a.cook.y}`);
  e.state="walk"; e.until=0;
  const P2=a.plates[2], was2=P2.state; P2.state="ready"; P2.readyAt=a.clock;     // a plate waiting (its stack doesn't matter here)
  await play([49,53,56]);                                               // C♯: no B♭, not the plate's chord
  check("a miss with a plate waiting says what's wrong with the plate, the shake spent", e.state==="walk" && a.pepper===3 && !/SOUR/.test(t.heard()) && P2.state==="ready", t.heard());
  P2.state=was2;
  e.state="wait"; e.at=1e9;

  // riders: two sour notes on an ingredient ride it down to the lowest floor, knocking everything under
  // it, floor by floor, onto the plate in its order; squashed there for a bonus
  const rIng=a.ings.filter(i=>i.state==="rest").sort((x,y)=>x.f-y.f)[0], rP=a.plates[rIng.p];
  const rCol=a.ings.filter(i=>i.p===rIng.p && i.state==="rest").sort((x,y)=>y.f-x.f), rOrder=[...rP.stack, ...rCol].map(i=>i.name).join(" ");
  const [r1,r2]=[a.sour[1], a.sour[2]];
  Object.assign(r1,{state:"walk", x:rIng.x0+1, y:rIng.f}); Object.assign(r2,{state:"walk", x:rIng.x0+2, y:rIng.f});
  const sr=a.score; E(`bkDrop(blast.ings.find(i=>i.p===${rIng.p} && i.f===${rIng.f}))`);
  check("sour notes standing on it ride it down", r1.state==="ride" && r2.state==="ride");
  for(let k=0; k<40 && !(rIng.state==="rest" && !rIng.ridden && rP.stack.length===3); k++) await sleep(200);
  const lowF=E(`(()=>{ let f=-1, t; while((t=bkNextFloor({f, x0:${rIng.x0}}))!=null) f=t; return f; })()`);
  check("it knocks all under it down onto the plate, in its order, and stops on the lowest floor", rCol.length>1 && rP.stack.length===3 && rIng.state==="rest" && rIng.f===lowF
    && [...rP.stack, rIng].map(i=>i.name).join(" ")===rOrder, `${rP.stack.map(i=>i.name).join(" ")} + ${rIng.name}@${rIng.f}/${lowF} / ${rOrder}`);
  await tread(rIng); for(let k=0; k<20 && rP.stack.length<4; k++) await sleep(100);
  check("walked across from there, it finishes the burger", rP.stack.length===4 && rP.stack[3]===rIng);
  await sleep(100);
  check("and are squashed at the bottom, for a bonus", r1.state==="squashed" && r2.state==="squashed" && a.score-sr>=2000*1.5, `${a.score-sr}`);
  r1.at=r2.at=1e9;

  // caught: a sour note walking into the cook costs a life
  const lives=a.lives; Object.assign(e, {state:"walk", x:a.cook.x, y:a.cook.y, at:0}); await sleep(80);
  check("a sour note that reaches the cook catches it", a.st==="dying");
  await sleep(1900);
  check("a life lost, the cook back at the start, the ingredients where they were", a.lives===lives-1 && a.cook.x===14 && a.cook.y===4 && P0.state==="served");
  a.sour.forEach(s=>{ s.state="wait"; s.at=1e9; });
  await sleep(1900);

  // the rest served: a kitchen cleared, the combo meal only in order (not this time: 0, 1, then 3, 2)
  const fillAndServe=async P=>{ P.stack=a.ings.filter(i=>i.p===P.p).sort((x,y)=>y.f-x.f); P.stack.forEach((ing,k)=>Object.assign(ing,{state:"plate", k, name:P.chord.names[k], pitch:P.chord.pitches[k], pc:P.chord.pcs[k]}));
    P.state="ready"; P.readyAt=a.clock; await play(P.chord.pitches.map(p=>p-24)); };
  await fillAndServe(a.plates[3]); await fillAndServe(a.plates[2]);   // served 1, 0, 3, 2
  check("every plate served clears the kitchen", a.st==="clear" && !/COMBO/.test(t.d.querySelector(".banner")?.textContent||""));
  await sleep(2500);
  check("and the next kitchen is the next level", a.level===1 && a.kitchenN===1 && a.plates.every(P=>P.state==="filling") && a.st!=="clear");

  // the combo meal: the plates served left to right
  a.sour.forEach(s=>{ s.state="wait"; s.at=1e9; });
  await sleep(1900);
  for(const P of a.plates){ if(P.chord.inv) P.chord=E(`bkChord(blast.key, "${P.chord.num}", 0, 0)`); }
  const sc=a.score; for(const P of a.plates) await fillAndServe(P);
  check("served left to right, the plates are a COMBO MEAL", [...t.d.querySelectorAll(".banner")].some(b=>/COMBO MEAL/.test(b.textContent)) && a.score-sc>1500, `${a.score-sc}`);
  sb.restoreAll(); await sleep(50);
  check("leaving gives the minichord's shuffling, voice leading, octave and voicing back", mc.params[120]===2 && mc.params[111]===1 && mc.params[198]===2);

  // the open kitchens: the whole stack judged, the spacing knob writing 38 (knob layer)
  const title=()=>E(`blast.phase="menu"; blast.overlay && blast.overlay.remove(); blast.overlay=null; bkMenu()`);
  t.connect({firmware:19, extra:{117:0, 10:0, 12:0, 16:0}}); await sleep(100);
  E(`blast.setupDone=false`); title();
  const b=await t.start(5); await sleep(2100); b.sour.forEach(s=>{ s.state="wait"; s.at=1e9; });
  check("knob layer: the knobs made inert, pointed nowhere", mc.params[117]===1 && mc.params[10]===217);
  t.knob(Math.round(127*.3), 20);                                      // the chord knob: the other one, spacing
  check("the other knob sets the spacing (address 38)", b.voicing.sp===1 && mc.params[38]===1, `${b.voicing.sp} ${mc.params[38]}`);
  const Q=b.plates[0]; Q.chord=E(`bkChord(blast.key, "${Q.chord.num.replace(/7|maj7/,"")}"||"I", 0, 1)`);
  Q.stack=b.ings.filter(i=>i.p===0).sort((x,y)=>y.f-x.f); Q.stack.forEach((ing,k)=>Object.assign(ing,{state:"plate", k, name:Q.chord.names[k], pitch:Q.chord.pitches[k], pc:Q.chord.pcs[k]}));
  Q.state="ready"; Q.readyAt=b.clock;
  const closePitches=E(`firmwareStack(${Q.chord.rootPc}, VL_TONES["${Q.chord.q}"], 0, 0, 24)`);
  await play(closePitches.map(p=>p+24));
  check("in the open kitchens, the chord in close position doesn't serve a drop 2 stack", Q.state==="ready");
  await play(Q.chord.pitches);
  check("the stack itself, note for note, does", Q.state==="served");

  // SET FOR ME: the game turns the knobs to the plate that's waited longest
  E(`saved.bkAuto=true`);
  const R=b.plates[1]; R.chord=E(`bkChord(blast.key, "IV", 2, 1)`);
  R.stack=b.ings.filter(i=>i.p===1).sort((x,y)=>y.f-x.f); R.stack.forEach((ing,k)=>Object.assign(ing,{state:"plate", k, name:R.chord.names[k], pitch:R.chord.pitches[k], pc:R.chord.pcs[k]}));
  R.state="ready"; R.readyAt=b.clock; await sleep(150);
  check("SET FOR ME voices the waiting plate itself", mc.params[37]===2 && mc.params[38]===1, `${mc.params[37]} ${mc.params[38]}`);
  E(`saved.bkAuto=false`);
  sb.restoreAll(); await sleep(50);

  // FLIP, in the Orders kitchens: the ingredient underfoot swapped with the next one down its column
  t.connect({firmware:21}); await sleep(100); E(`blast.setupDone=false`); title();
  const o=await t.start(7); await sleep(2100); o.sour.forEach(s=>{ s.state="wait"; s.at=1e9; });
  check("an order hangs over every plate", o.plates.every(P=>P.ticket) && o.flips===3);
  check("and two columns are out of order", o.plates.filter(P=>{ const ns=o.ings.filter(i=>i.p===P.p).sort((x,y)=>y.f-x.f).map(i=>i.pc); return ns.join()!==P.ticket.pcs.join(); }).length===2);
  const top=o.ings.filter(i=>i.p===0).sort((x,y)=>x.f-y.f)[0], next=o.ings.filter(i=>i.p===0).sort((x,y)=>x.f-y.f)[1];
  const names=[top.name, next.name]; o.cook.x=top.x0+1; o.cook.y=top.f;
  hold(6); lift(6); await sleep(40);                                    // A on the strip
  check("A on the harp flips the ingredient underfoot with the next one down", top.name===names[1] && next.name===names[0] && o.flips===2, `${top.name} ${next.name}`);
  sb.restoreAll();
  t.done();
})();
