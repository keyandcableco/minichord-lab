// Dominant Kong: the stages hold together; every level's chords spell in every key it deals; the
// player walks while a way's held and jumps on A, and a long fall is fatal; a locked ladder refuses,
// and opens for the floor above's chord; Kong throws barrels that roll downhill; a barrel's resolution
// breaks it (a dominant down a fifth, a tritone substitute down a semitone, a backdoor up a step),
// deceptively for more; a barrel jumped clean over scores; one in the drum comes out a fireball, put
// out a semitone above any of its notes; the hammer breaks what it's swung at; caught, a life, the
// locks staying open; home clears the stage, the rivets next, each pulled by its chord, all eight
// bringing Kong down; the bonus run out costs a life; the settings given back.
const t=require("./harness").load("dominant-kong");
(async()=>{
  const {sb, sleep, check, mc, w}=t;
  await sleep(150); t.connect({firmware:21}); await sleep(100);
  const E=s=>w.eval(s);
  const play=async pitches=>{ sb.answerChord(pitches.map((pitch,voice)=>({pitch, voice}))); await sleep(30); };
  const tri=(pc, q="")=>E(`FORM[${JSON.stringify(q)}]`).map(f=>48+pc+f[1]);
  const hold=pc=>mc._harp([0x90, 60+pc, 100]), lift=pc=>mc._harp([0x80, 60+pc, 0]);
  const RIGHT=3, LEFT=7, UP=10, A=6;

  // the stages: every ladder lands on a girder at both ends, every girder's reached from the start
  const stages=E(`[DK_GIRDERS, DK_RIVETS].map(S=>{
    const bad=[], was=blast.stage; blast.stage=S; blast.gaps=[];
    for(const L of S.ladders) if(!dkOn(L.lo,L.x,S) || !dkOn(L.hi,L.x,S)) bad.push("ladder "+L.x+" off a girder");
    const seen=new Set([S.start.f]); let grew=true;
    while(grew){ grew=false; for(const L of S.ladders){ if(seen.has(L.lo) && !seen.has(L.hi)){ seen.add(L.hi); grew=true; } if(seen.has(L.hi) && !seen.has(L.lo)){ seen.add(L.lo); grew=true; } } }
    if(seen.size!==S.floors.length) bad.push("only "+seen.size+" of "+S.floors.length+" floors reached");
    blast.stage=was; return bad.join("; "); })`);
  check("both stages hold together: ladders on girders at both ends, every floor reached", stages.every(b=>!b), stages.join(" / "));
  const spelled=E(`(()=>{ const out=[], was=blast.level;
    for(let lv=0; lv<DK_LEVELS.length; lv++) for(const f of [-3,-2,-1,0,1,2,3]){ const L=DK_LEVELS[lv]; if(Math.abs(f)>(L.keys||0)) continue;
      const key=dkKey(f, L.rivets==="minor");
      if(L.stage!=="rivets"){ for(const id of [...L.barrels, ...DK_CHAIN]){ const b=dkBarrel(key,id); if(!b.root || !/^[A-G]/.test(b.root)) out.push(lv+" "+key.name+" "+id); } if(!dkSpell(key,0,0,"","I")) out.push(lv+" "+key.name+" home"); }
      else for(const [num,st,se,q] of DK_RIVET_SETS[L.rivets]) if(!dkSpell(key,st,se,q,num)) out.push(lv+" "+key.name+" "+num); }
    return out; })()`);
  check("every level's barrels, links and rivets spell in every key it deals", !spelled.length, spelled.slice(0,4).join("; "));
  const res=E(`(()=>{ const k=dkKey(0); return ["V7","V/V","subV","back"].map(id=>{ const b=dkBarrel(k,id); return b.sym+">"+SHARP_NAMES[b.to]; }).join(" "); })()`);
  check("a dominant resolves down a fifth, a tritone substitute down a semitone, the backdoor up a step", res==="G7>C D7>G D♭7>C B♭7>C", res);

  const a=await t.start(0); await sleep(2100);
  const H=a.hero;
  check("the girders, the home ladder locked for its I", a.st==="go" && a.stage===E("DK_GIRDERS") && [...a.locks].join()==="5" && a.floorChord[6].sym==="C");
  a.throwAt=1e9;
  // the screen: on a wide field the whole stage at a whole number of pixels, nothing scrolling; on a
  // phone (an iPhone 15 upright) twice the size, the view following the player from the bottom girder
  // to home, and a barrel above the view pointed to
  const cam=E(`(()=>{ const fx=blast.fx, was=[fx.ro, fx.fw, fx.fh]; fx.ro=fx.ro||{}; fx.fw=1088; fx.fh=596; dkLayout();
    const wide={scrolls:blast.scrolls, k:blast.k}; fx.fw=389; fx.fh=330; dkLayout(); const H=blast.hero, at=[H.x, H.y], v=blast.view, seen=[];
    for(const [x,y] of [[48, dkSurf(0,48)], [200, dkSurf(2,200)], [100, DK_GIRDERS.floors[6].yL]]){ Object.assign(H, {x, y}); dkCamera(0); seen.push(blast.ox+x>=0 && blast.ox+x<=v.w && blast.oy+y-16>=0 && blast.oy+y<=v.h); }
    Object.assign(H, {x:at[0], y:at[1]}); dkCamera(0);
    const out={wide, scrolls:blast.scrolls, k:blast.k, seen, above:blast.oy+dkSurf(5,24)<0};
    [fx.ro, fx.fw, fx.fh]=was; blast.layoutKey=null; return out; })()`);
  check("on a wide field the whole stage is in view, at two screen pixels a pixel, nothing scrolling", !cam.wide.scrolls && cam.wide.k===2, JSON.stringify(cam.wide));
  check("on a phone it's twice the size and scrolls, keeping the player in view from the bottom girder to home, a barrel at the top out of view", cam.scrolls && cam.k===2 && cam.seen.every(Boolean) && cam.above, JSON.stringify(cam));
  // walking and jumping
  hold(RIGHT); await sleep(500); lift(RIGHT); await sleep(100);
  check("a way held walks the player along the girder, on its slope", H.x>60 && Math.abs(H.y-E(`dkSurf(0, ${H.x})`))<.01, `${H.x.toFixed(1)}`);
  hold(A); lift(A); await sleep(80);
  check("A on the harp jumps", H.state==="air" && H.y<E(`dkSurf(0, ${H.x})`)-3);
  await sleep(1400);
  check("and the player lands back on the girder", H.state==="walk" && H.f===0);
  // steering in the air: a jump from standing, then a way held, carries the player that way
  const x0=H.x; hold(A); lift(A); await sleep(80); hold(RIGHT); await sleep(400); lift(RIGHT);
  check("a way held in the air steers the jump that way", H.state==="air" && H.x>x0+8 && H.vx>0, `${(H.x-x0).toFixed(1)} ${H.vx}`);
  await sleep(1200);
  check("and it lands on the girder further along", H.state==="walk" && H.f===0 && H.x>x0+8);
  // a ladder: up from the bottom at x 80, open; the home ladder locked till C
  Object.assign(H, {x:80, y:E("dkSurf(0,80)"), f:0}); hold(UP); await sleep(2200); lift(UP); await sleep(50);
  check("up held at a ladder climbs it to the next girder", H.f===1 && H.state==="walk", `${H.f} ${H.state}`);
  Object.assign(H, {x:124, y:E("dkSurf(5,124)"), f:5, state:"walk"}); hold(UP); await sleep(400); lift(UP); await sleep(50);
  check("a locked ladder won't be climbed, and says what opens it", H.f===5 && H.state==="walk" && /PLAY IT TO CLIMB/.test(t.heard()), t.heard());
  await play(tri(2)); await sleep(30);
  check("the wrong chord leaves it locked", a.locks.has(5));
  await play(tri(0));
  check("the floor above's chord (home: C) opens it", !a.locks.has(5));
  // barrels: thrown, rolling downhill, resolved, deceived, jumped
  Object.assign(H, {x:200, y:E("dkSurf(0,200)"), f:0, state:"walk"});
  a.throwAt=a.clock; await sleep(200);
  const b=a.barrels[0];
  check("Kong throws a barrel, a dominant seventh, rolling along his girder", b && b.chord.sym==="G7" && b.f===5 && b.dir===1, b && b.chord.sym);
  a.throwAt=1e9; const s0=a.score; await play(tri(0));
  check("the chord it resolves to breaks it", !a.barrels.includes(b) && a.score-s0===300*1.0, `${a.score-s0}`);
  const mk=(id, f, x)=>E(`(()=>{ const c=dkBarrel(blast.key, "${id}"); const b={x:${x}, y:dkSurf(${f},${x}), f:${f}, dir:dkDownhill(${f}), state:"roll", chord:c, spin:0, tried:new Set(DK_GIRDERS.ladders)}; blast.barrels.push(b); return blast.barrels.length-1; })()`);
  mk("V7", 3, 100); const s1=a.score; await play(tri(9,"m"));
  check("a deceptive resolution (G7 to Am) breaks it for more", a.barrels.length===0 && a.score-s1===500, `${a.score-s1}`);
  mk("V7", 3, 100); mk("V7", 1, 60); const s2=a.score; await play(tri(0));
  check("two barrels resolved by one chord: the second scores double", a.barrels.length===0 && a.score-s2===900, `${a.score-s2}`);
  // jumped clean over
  mk("V7", 0, 150); const jb=a.barrels[0]; jb.dir=1; Object.assign(H, {x:jb.x-26, y:E(`dkSurf(0,${jb.x-26})`), f:0, state:"walk"}); jb.dir=-1;
  const s3=a.score; for(let k=0;k<80 && jb.x-H.x>17;k++) await sleep(5);
  hold(A); lift(A); await sleep(700);
  check("a barrel jumped clean over scores", a.score-s3===100 && a.st==="go", `${a.score-s3} ${a.st}`);
  a.barrels.length=0;
  // the hammer: up in the air, jumped to; it breaks a barrel it's swung at
  const hm=a.hammers[0]; Object.assign(H, {x:hm.x, y:E(`dkSurf(${hm.f},${hm.x})`), f:hm.f, state:"walk"}); hold(A); lift(A); await sleep(700);
  check("the hammer, jumped to, is taken", hm.taken && a.hammerUntil>a.clock);
  mk("V7", hm.f, H.x+30); a.barrels[0].dir=-1; const s4=a.score; await sleep(800);
  check("swung at, a barrel breaks", a.barrels.length===0 && a.score-s4===300 && a.st==="go", `${a.score-s4}`);
  a.hammerUntil=0;
  // caught by a barrel: a life, the home lock staying open
  mk("V7", H.f, H.x+3); const lives=a.lives; await sleep(60);
  check("a barrel that reaches the player is a life", a.st==="dying");
  await sleep(2000);
  check("lost; the player back at the start, the opened lock still open", a.lives===lives-1 && H!==a.hero && a.hero.f===0 && !a.locks.has(5));
  // a long fall: off the end of the second girder to the bottom
  await sleep(1900); const P=a.hero; Object.assign(P, {x:206, y:E("dkSurf(1,206)"), f:1, state:"walk"}); hold(RIGHT); await sleep(700); lift(RIGHT); await sleep(400);
  check("walked off a girder's end, a long fall is fatal", a.st==="dying", a.st);
  await sleep(2000); await sleep(1900);
  // the drum and a fireball (from the fire levels on)
  a.level=5; mk("V7", 0, 20); a.barrels[a.barrels.length-1].dir=-1; await sleep(300);
  check("a barrel rolled into the drum comes out a fireball", a.fires.length===1, `${a.fires.length}`);
  const fire=a.fires[0], s5=a.score; fire.x=150; fire.f=3; fire.y=E("dkSurf(3,150)");
  const up=[...fire.chord.to][1]; await play(tri(up));
  check("a chord a semitone above one of the fireball's notes puts it out", a.fires.length===0 && a.score>s5, `${fire.chord.sym} by ${up}`);
  a.level=0;
  // home: the stage cleared, then the rivets
  const s6=a.score; Object.assign(a.hero, {x:124, y:E("dkSurf(5,124)"), f:5, state:"walk"}); hold(UP); await sleep(2600); lift(UP); await sleep(50);
  check("up the home ladder: HOME, the bonus paid", a.st==="clear" && a.score-s6>=1000, `${a.st} ${a.score-s6}`);
  await sleep(3200);
  check("and the next stage is the rivets, its eight chords the key's", a.level===1 && a.stage===E("DK_RIVETS") && a.rivets.length===8 && a.rivets.map(r=>r.chord.num).sort().join()==="I,I,IV,V,ii,iii,vi,vii°", a.rivets.map(r=>r.chord.num).join());
  await sleep(1900);
  const r=a.rivets[0], R=a.hero; Object.assign(R, {x:r.x, y:E(`dkSurf(${r.f},${r.x})`), f:r.f, state:"walk"});
  await play(tri(mod7(r.chord.pc+1)));
  check("a rivet stays for the wrong chord", !r.pulled);
  await play(tri(r.chord.pc, r.chord.q));
  check("its own chord, standing on it, pulls it, leaving a gap, the player stepping off it", r.pulled && a.gaps.length===1 && !E(`dkOn(${r.f}, ${r.x})`) && E(`dkOn(${r.f}, ${R.x})`));
  for(const x of a.rivets.filter(x=>!x.pulled)){ Object.assign(R, {x:x.x, y:E(`dkSurf(${x.f},${x.x})`), f:x.f, state:"walk"}); await play(tri(x.chord.pc, x.chord.q)); }
  check("all eight pulled: Kong comes down", a.rivets.every(x=>x.pulled) && a.st==="clear" && a.kongDown>0);
  await sleep(3600);
  check("and the next level's the girders again", a.level===2 && a.stage===E("DK_GIRDERS"));
  // the bonus run out
  await sleep(1900); a.bonusPts=1; await sleep(400);
  check("the bonus run out costs a life", a.st==="dying" && /RAN OUT/.test(t.heard()), t.heard());
  // the lifts: the right one goes where the steering knob's turned; the left one rises, carrying the
  // player, and crushes one carried past the top; Kong's springs hop along the top and drop down the
  // far side, resolved like any barrel; home up the far tower
  E(`blast.setupDone=false; blast.phase="menu"; blast.overlay && blast.overlay.remove(); blast.overlay=null; dkMenu()`);
  const l=await t.start(3); await sleep(2100); l.throwAt=1e9;
  const LS=l.stage, knobF=LS.plats.find(f=>LS.floors[f].knob), riseF=LS.plats.filter(f=>!LS.floors[f].knob);
  check("the lifts: one lift rising in three platforms, the other the knob's", riseF.length===3 && knobF!=null && mc.params[238]===1);
  t.knob(127); await sleep(3200);
  check("the knob turned up, its lift rises to the top", LS.floors[knobF].yL<LS.top+10, LS.floors[knobF].yL.toFixed(0));
  t.knob(0); await sleep(3200);
  check("turned down, it comes back down", LS.floors[knobF].yL>LS.bottom-10, LS.floors[knobF].yL.toFixed(0));
  const LH=l.hero, rf=riseF[0], RF=LS.floors[rf]; RF.yL=RF.yR=200; Object.assign(LH, {x:60, y:200, f:rf, state:"walk"}); await sleep(600);
  check("standing on the rising lift, the player rises with it", LH.y<199 && LH.f===rf && Math.abs(LH.y-RF.yL)<.01, LH.y.toFixed(1));
  RF.yL=RF.yR=LS.top+1; LH.y=RF.yL; await sleep(300);
  check("carried past the top, crushed", l.st==="dying", l.st);
  await sleep(2000); await sleep(1900);
  l.throwAt=l.clock; await sleep(150); l.throwAt=1e9;
  const sp=l.barrels[0];
  check("Kong throws a spring, a dominant seventh, hopping along the top", sp && sp.state==="spring" && sp.y<LS.top);
  await sleep(4500);
  check("at the far side it drops down", sp.state==="drop" || sp.gone, sp.state);
  l.barrels.length=0; l.throwAt=l.clock; await sleep(150); l.throwAt=1e9;
  const sp2=l.barrels[0]; await play(tri(sp2.chord.to));
  check("and like a barrel, its resolution breaks it", !l.barrels.includes(sp2));
  const s7=l.score; Object.assign(l.hero, {x:214, y:86, f:6, state:"walk"}); hold(UP); await sleep(2600); lift(UP); await sleep(50);
  check("up the far tower: HOME", l.st==="clear" && l.score>s7, l.st);
  sb.restoreAll(); await sleep(50);
  check("leaving gives the harp back", mc.params[98]===0);
  t.done();
  function mod7(x){ return ((x%12)+12)%12; }
})();
