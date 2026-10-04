// Chord Hunt: every level's chords spell plainly in every key it deals; a round asks for its key
// while it opens, and a key set then with the combo scores, a wrong one put back, and one not set is
// set for the player at the first duck; a duck is shot by its chord, only once it's sounded; a wrong chord spends a
// shell (after a moment, so a chord of two buttons isn't punished on its way) and says what it was;
// three wrong and it's away; the harp replays home and the duck, which counts as help; a round with
// too few ducks costs a life, enough moves the level on; flocks are shot in order; minor keys; the
// dog's tag gives its power-up; the POWER-UPS page; Clay Shooting; leaving gives the key back.
const t=require("./harness").load("chord-hunt");
(async()=>{
  const {w, sb, sleep, chord, note, check, mc}=t;
  await sleep(150); t.connect({key:3}); await sleep(100);
  check("the harp is chromatic, the key held at C between games", mc.params[98]===1 && mc.params[35]===0, `98=${mc.params[98]} 35=${mc.params[35]}`);
  // every level: each key it can deal spells every chord it can ask for (and a golden duck's)
  let bad=[];
  w.eval("blast.level=0");
  for(let lv=0; lv<10; lv++){ const L=w.eval(`HD_LEVELS[${lv}]`);
    for(let n=0;n<40;n++){ const r=w.eval(`(()=>{ const L=HD_LEVELS[${lv}], k=${lv===9} ? hdPickKey(L, Math.random()<.5) : hdPickKey(L); const pool=k.minor?(L.minorPool||HD_MINOR):L.pool;
        return {k:k.label, ok:k.minor===(!!L.minor || (${lv===9} && k.minor)) && pool.every(x=>hdChord(k,x))}; })()`);
      if(!r.ok) bad.push(`${L.n}: ${r.k}`); } }
  check("every level's chords spell plainly in every key it deals, minor keys for the minor level", !bad.length, [...new Set(bad)].slice(0,4).join(" · "));
  check("vi in G is Em, V7/V in C is D7, ♭VII in G is F, V in A minor is E", w.eval(`[hdChord(hdKey("G"),"vi").sym, hdChord(hdKey("C"),"V7/V").sym, hdChord(hdKey("G"),"♭VII").sym, hdChord(hdKey("A",true),"V").sym].join(" ")`)==="Em D7 F E");
  check("a minor key's signature is its relative major's", w.eval(`hdKey("E",true).f`)===1 && w.eval(`hdKey("C",true).f`)===-3);
  // the voicing: the bass low, the rest close in the middle; the inversion puts the 3rd in the bass
  const v=w.eval(`hdVoice(7,"",{bass:1})`);
  check("a chord voiced with its bass low and the rest close in the middle", v.notes[0]%12===11 && v.notes[0]<52 && Math.max(...v.upper)-Math.min(...v.upper)<12, JSON.stringify(v.notes));

  // the key change combo, as the minichord reports it: a dump no one asked for, only the key changed
  const combo=async idx=>{ mc._asked=0; const dump=[0xF0]; for(let k=0;k<256;k++){ const v=k===35 ? idx : mc.params[k]||0; dump.push(v&127, v>>7); } dump.push(0xF7); mc._dump(dump); await sleep(60); };
  const kIdx=f=>w.eval(`keyIndexOf(${f})`);
  const a=await t.start(0, {speed:4});
  w.eval("hdFetchMaybe=()=>false");                            // no tags turning up by chance: the tag has its own check below
  for(let i=0;i<100 && !a.key;i++) await sleep(50);
  check("a round opens asking for its key, the signature at C till it's set", a.key && a.keyAsk && mc.params[35]===0 && /SET IT TO/.test(w.document.querySelector(".hdkey").textContent), w.document.querySelector(".hdkey").textContent);
  const wrongF=a.key.f===2 ? 3 : 2;
  await combo(kIdx(wrongF));
  check("a wrong key set with the combo is put back, and said so", mc.params[35]===0 && a.keyAsk && /NOT THIS ONE/.test(t.heard()), t.heard());
  const s00=a.score; await combo(kIdx(a.key.f));
  check("the round's key set with the combo while it opens scores, and stays", a.score>s00 && mc.params[35]===kIdx(a.key.f) && !a.keyAsk && /KEY SET/.test(w.document.body.textContent), `${a.score-s00} points, 35=${mc.params[35]}`);
  const s01=a.score; await combo(kIdx(a.key.f));
  check("set again, it scores nothing more", a.score===s01);
  const open=async()=>{ for(let i=0;i<300 && !(a.duck && a.duck.open && !a.duck.done);i++) await sleep(50); return a.duck; };
  let d=await open();
  check("the round flies in its key, the buttons playing it", a.key && mc.params[35]===kIdx(a.key.f), a.key && a.key.label);
  check("the first level's ducks are I, IV or V", d && ["I","IV","V"].includes(d.targets[0].num), d && d.targets[0].num);
  // the right chord shoots it
  const s0=a.score, tg=d.targets[0];
  chord(tg.pc, tg.q); await sleep(30);
  check("the duck's chord shoots it down", a.score>s0 && a.rnd.slots[tg.slot]==="hit" && a.ear===1, `${a.score-s0} points`);
  // a wrong chord, after a moment, spends a shell and says what it was
  d=await open(); const w1=d.targets[0], wrong=w.eval(`hdChord(blast.key, ${JSON.stringify(w1.num==="V"?"IV":"V")})`);
  chord(wrong.pc, wrong.q); await sleep(100);
  check("a wrong chord doesn't count at once (it may be on its way to another)", d.shells===3);
  await sleep(500);
  check("then it spends a shell and says what it was", d.shells===2 && t.heard().includes(`THAT'S ${wrong.num}`), t.heard());
  chord(wrong.pc, wrong.q); await sleep(600); chord(wrong.pc, wrong.q); await sleep(600);
  check("three wrong and it's away, marked a miss", d.done && a.rnd.slots[w1.slot]==="miss" && a.ear===0, JSON.stringify(a.rnd.slots));
  // the harp replays: a low string home, a high one the duck; it's help
  d=await open();
  note(2); await sleep(20); const aided=d.aided; note(9);
  check("a harp string replays home or the duck, and counts as help", aided && /HEARD THE DUCK/.test(t.heard()), t.heard());
  const ear=a.ear; chord(d.targets[0].pc, d.targets[0].q); await sleep(30);
  check("a hit with help doesn't build the pure ear", a.ear===ear, `${ear} → ${a.ear}`);
  // the round's end: too few ducks costs a life and flies it again; enough moves on
  w.eval(`clearTimeout(blast.hdPend); blast.duck=null; blast.rnd.n=${10}; blast.rnd.slots=["hit","hit","miss","miss","miss","miss","miss","miss","miss","miss"]; hdRoundEnd()`);
  check("too few ducks: the dog laughs and it costs a life", a.lives===2 && a.level===0, `${a.lives} lives, level ${a.level+1}`);
  await sleep(100);
  w.eval(`blast.rnd={slots:Array(10).fill("hit"), n:10}; hdRoundEnd()`);
  check("enough ducks: the next level, and a perfect round scores", a.level===1);
  // a multi-button chord passes through a triad on its way: no shell lost (sevenths level)
  w.eval(`newRun(); blast.level=4; blast.key=hdKey("C"); hdApplyKey(blast.key); blast.rnd={slots:[], n:0, last:null}; hdLaunch([{...hdChord(blast.key,"V7"), slot:0}])`);
  d=await open(); chord("G",""); await sleep(150); chord("G","7"); await sleep(600);
  check("a V7 played through its triad isn't a miss", d.done && d.shells===3 && a.rnd.slots[0]==="hit", `${d.shells} shells`);
  // a flock: shot in order
  await sleep(2600);
  w.eval(`newRun(); blast.level=8; blast.key=hdKey("G"); hdApplyKey(blast.key); blast.rnd={slots:[], n:0, last:null}; hdLaunch(["ii","V","I"].map((n,i)=>({...hdChord(blast.key,n), slot:i})), {flock:HD_FLOCKS[1]})`);
  d=await open();
  chord("D","");  await sleep(600);
  check("a flock is shot in order: the wrong one first is a miss", d.shells===4 && d.i===0, `${d.shells} shells, at ${d.i}`);
  chord("A","m"); await sleep(30); chord("D",""); await sleep(30); chord("G",""); await sleep(30);
  check("and the right order downs them all, the progression named", d.done && d.targets.every(x=>x.hit));
  await sleep(1000);
  check("the dog's card names the flock", /ii–V–I/.test(w.document.querySelector(".hdcard")?.textContent||""), w.document.querySelector(".hdcard")?.textContent);
  await sleep(2600);
  // minor keys
  w.eval(`newRun(); blast.level=3; blast.duck=null; const k=hdKey("E",true); hdApplyKey(k); blast.rnd={slots:[], n:0, last:null}; hdLaunch([{...hdChord(k,"V"), slot:0}])`);
  d=await open();
  check("a minor key sets its relative major's signature: E minor, G", mc.params[35]===kIdx(1), mc.params[35]);
  chord("B",""); await sleep(30);
  check("V in E minor is B major", d.done && d.targets[0].hit, `${d.targets[0].num} ${d.targets[0].sym} open=${d.open} done=${d.done} · ${t.heard()}`);
  await sleep(2600);
  // the key's signature set, A's three sharps: C♯m is the C button, no modifier; the modifier's set for
  // what the signature leaves out, the chords borrowed from the minor, flattening
  w.eval(`newRun(); blast.level=2; blast.duck=null; const k=hdKey("A"); hdApplyKey(k); blast.rnd={slots:[], n:0, last:null}; hdLaunch([{...hdChord(k,"iii"), slot:0}])`);
  check("in A the signature is A's", mc.params[35]===kIdx(3));
  d=await open(); chord(1,"m"); await sleep(30);
  check("C♯m, the C button in A, shoots iii", d.done && d.targets[0].hit, t.heard());
  await sleep(2600);
  w.eval(`mc.params[31]=0; newRun(); blast.level=5; blast.duck=null; hdApplyKey(hdKey("G"))`);
  check("borrowed chords in G: the modifier flattens (♭VII, F, is the F♯ button flattened)", mc.params[31]===1);
  w.eval(`blast.level=2`);
  const leanBad=w.eval(`(()=>{ const out=[]; for(const L of HD_LEVELS) for(const n of [...L.keys, ...HD_KEYS_MIN]){ for(const minor of [false,true]){ const k=hdKey(n,minor); const pool=minor?(L.minorPool||HD_MINOR):L.pool; if(!minor===!L.minor || L.roam){ if(hdKeyOk(k,pool) && (hdLean(k,pool)==null || hdLean(k,pool,k.f)==null)) out.push(L.n+": "+k.label); } } } return out; })()`);
  check("no key a level deals needs the modifier both ways, at C or its own signature", !leanBad.length, leanBad.slice(0,3).join(" · "));
  check("D major's borrowed B♭ and its F♯m never meet: no D at the migration level, A and B♭ there", !w.eval(`hdKeyOk(hdKey("D"), HD_LEVELS[9].pool)`) && w.eval(`hdKeyOk(hdKey("A"), HD_LEVELS[9].pool) && hdKeyOk(hdKey("B♭"), HD_LEVELS[9].pool)`));
  // the dog's tag: its chord takes the power-up
  w.eval(`blast.duck=null; blast.hdPower=null; blast.key=hdKey("C"); blast.tag={k:"drone", chord:hdChord(blast.key,"IV"), left:5, then:()=>{ window.__then=1; }}`);
  chord("F",""); await sleep(30);
  check("the tag's chord takes its power-up", w.eval("hdPowerOn('drone')") && w.__then===1);
  w.eval(`hdPowerUsed(); hdPowerUsed(); hdPowerUsed()`);
  check("DRONE runs out after three ducks", !w.eval("blast.hdPower"));
  check("the POWER-UPS page lists them", w.eval("powersFor('hunt').map(p=>p.name).join(' ')")==="DRONE BASS SCOPE ARPEGGIO RESOLVE PLUMAGE SLOW-MO DA CAPO");
  // Clay Shooting: the cadence's two chords in order
  w.eval(`saved.bonus=true; blast.tag=null; arcadeBonus("clay")`); await sleep(4600);
  const b=a.bonus; for(let i=0;i<60 && !b.listen;i++) await sleep(50);
  const [c1,c2]=b.pair; chord(c1.pc,c1.q); await sleep(20); chord(c2.pc,c2.q); await sleep(20);
  check("Clay Shooting: the cadence's two chords shoot both clays and name it", b.pairs===1 && b.named[b.kind]===1, b.kind);
  w.eval("bonusEnd(blast.bonus)"); await sleep(50);
  sb.restoreAll();
  check("leaving gives the key back", mc.params[35]===3);
  t.done();
})();
