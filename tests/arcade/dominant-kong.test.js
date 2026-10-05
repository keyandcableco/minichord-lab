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
      if(L.stage==="girders"){ for(const id of [...L.barrels, ...DK_CHAIN]){ const b=dkBarrel(key,id); if(!b.root || !/^[A-G]/.test(b.root)) out.push(lv+" "+key.name+" "+id); } if(!dkSpell(key,0,0,"","I")) out.push(lv+" "+key.name+" home"); }
      else for(const [num,st,se,q] of DK_RIVET_SETS[L.rivets]) if(!dkSpell(key,st,se,q,num)) out.push(lv+" "+key.name+" "+num); }
    return out; })()`);
  check("every level's barrels, links and rivets spell in every key it deals", !spelled.length, spelled.slice(0,4).join("; "));
  const res=E(`(()=>{ const k=dkKey(0); return ["V7","V/V","subV","back"].map(id=>{ const b=dkBarrel(k,id); return b.sym+">"+SHARP_NAMES[b.to]; }).join(" "); })()`);
  check("a dominant resolves down a fifth, a tritone substitute down a semitone, the backdoor up a step", res==="G7>C D7>G D♭7>C B♭7>C", res);

  const a=await t.start(0); await sleep(2100);
  const H=a.hero;
  check("the girders, the home ladder locked for its I", a.st==="go" && a.stage===E("DK_GIRDERS") && [...a.locks].join()==="5" && a.floorChord[6].sym==="C");
  a.throwAt=1e9;
  // walking and jumping
  hold(RIGHT); await sleep(500); lift(RIGHT); await sleep(100);
  check("a way held walks the player along the girder, on its slope", H.x>60 && Math.abs(H.y-E(`dkSurf(0, ${H.x})`))<.01, `${H.x.toFixed(1)}`);
  hold(A); lift(A); await sleep(80);
  check("A on the harp jumps", H.state==="air" && H.y<E(`dkSurf(0, ${H.x})`)-3);
  await sleep(1400);
  check("and the player lands back on the girder", H.state==="walk" && H.f===0);
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
  a.level=4; mk("V7", 0, 20); a.barrels[a.barrels.length-1].dir=-1; await sleep(300);
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
  sb.restoreAll(); await sleep(50);
  check("leaving gives the harp back", mc.params[98]===0);
  t.done();
  function mod7(x){ return ((x%12)+12)%12; }
})();
