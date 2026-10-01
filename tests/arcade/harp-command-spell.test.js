// Harp Command's own bonus round, SPELL IT, played with its cannons: notes stop above their strings,
// all but one spelling a chord; the harp is chromatic for the round so every note has a string.
// Plucking a chord tone costs and it stays; plucking the odd note shoots it down; playing the chord the
// rest spell shoots them all at once; afterwards the harp is back in its key and the field is clean.
const t=require("./harness").load("harp-command",{storage:{saved:{bonus:true}}});
(async()=>{
  const {w, d, sleep, check, chord, note, mc}=t;
  await sleep(150); t.connect({extra:{7:19}}); await sleep(100);
  const a=await t.start(0, {speed:1});
  await sleep(200);
  const waveWas=JSON.stringify(a.wave);
  w.eval(`arcadeBonus("spell")`); await sleep(80);
  const b=w.eval("blast.bonus");
  check("Harp Command plays its own round", b.g.id==="spell" && w.eval("BONUS_OWN.command.join()")==="spell");
  for(let i=0;i<60 && !b.ready;i++) await sleep(100);
  await sleep(200);
  check("its notes stop in the game's own field, above their strings", b.mine.length>=4 && b.mine.every(it=>a.items.includes(it)) && d.querySelectorAll(".fchord.bonuschord").length===b.mine.length, `${b.mine.length} notes: ${b.mine.map(i=>i.name).join(" ")}`);
  check("all but one spell the chord", b.mine.filter(i=>i.odd).length===1 && w.eval(`isChord(${JSON.stringify(b.mine.filter(i=>!i.odd).map(i=>48+i.pc))}, pcOfName("${b.ans.root}"), "${b.ans.q}")`));
  check("the harp is chromatic for the round, so every note has a string", a.wave.kind==="chrom" && mc.params[98]===1);
  // a chord tone plucked: it costs, and it stays
  const tone=b.mine.find(i=>!i.odd), m0=b.misses;
  note(tone.pc); await sleep(300);
  check("plucking a note that belongs costs, and it stays", b.misses===m0+1 && !tone.done && tone.el.isConnected, `${tone.name}`);
  // the odd one plucked: shot down
  const odd=b.mine.find(i=>i.odd), s0=b.score;
  note(odd.pc); await sleep(400);
  check("plucking the odd note shoots it down", b.hits===1 && b.score>s0 && !odd.el.isConnected, `${odd.name}: ${b.score} points`);
  for(let i=0;i<20 && (!b.mine.length || b.mine.some(x=>x===odd));i++) await sleep(100);   // the next set
  // the chord the rest spell, played on the buttons: every one of them goes
  const tones=b.mine.filter(i=>!i.odd), s1=b.score, ans=b.ans;
  chord(pcOfNameW(ans.root), ans.q); await sleep(500);
  function pcOfNameW(n){ return w.eval(`pcOfName("${n}")`); }
  check("playing the chord they spell shoots them all at once, for more", b.chords===1 && b.score-s1>=100 && tones.every(x=>!x.el.isConnected), `${ans.root}${ans.q}: +${b.score-s1}`);
  // a wrong chord costs
  for(let i=0;i<20 && b.mine.every(x=>!x.el.isConnected);i++) await sleep(100);
  const m1=b.misses, wrong=b.ans.q===""?"m":"";
  chord(pcOfNameW(b.ans.root), wrong); await sleep(200);
  check("a chord they don't spell costs", b.misses===m1+1);
  w.eval("blast.bonus.finish()");
  for(let i=0;i<40 && a.phase!=="play";i++) await sleep(100);
  check("the tally counts both ways of winning", b.tally.some(x=>x[0]==="ODD NOTES SHOT" && x[1]===1) && b.tally.some(x=>x[0]==="CHORDS PLAYED" && x[1]===1));
  check("afterwards the harp is back in its key, and the field is clean", JSON.stringify(a.wave)===waveWas && !d.querySelector(".fchord.bonuschord") && a.phase==="play");
  // every set it deals has one answer, at every level: no other note can be left out to leave a chord
  const fair=w.eval(`(()=>{ const g=BONUS_GAMES.find(x=>x.id==='spell'), iv=q=>(VL_TONES[q]||FORM[q].map(f=>f[1])); let bad=0, n=0;
    for(let L=0;L<HC_LEVELS.length;L++){ blast.level=L; const b={say(){}, mine:[], el:document.createElement('div')}; g.start(b);
      for(let k=0;k<12;k++){ g.clear(b); g.next(b); n++; const all=b.mine.map(i=>i.pc);
        const answers=all.filter(x=>{ const rest=new Set(all.filter(y=>y!==x)); return [...Array(12).keys()].some(r=>b.tier.qs.some(qq=>{ const c=new Set(iv(qq).map(v=>((r+v)%12+12)%12)); return c.size===rest.size && [...rest].every(p=>c.has(p)); })); });
        if(answers.length!==1) bad++; }
      g.stop(b); }
    return bad+" of "+n; })()`);
  check("every set it deals has exactly one answer, at every level", /^0 of/.test(fair), fair+" ambiguous");
  t.done();
})();
