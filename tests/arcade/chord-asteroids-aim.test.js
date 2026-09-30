// Chord Asteroids, scoring and manual aim: a chord rock is worth what its chord is (as in Invaders,
// half again with the modifier, three times a star rock); manual aim puts the knobs on inert
// alternates (firmware 19), a second knob spins the ship, a pluck fires where it points, a note off
// line isn't hit, and a note shot scores double; chords are aimed too; both knobs turn endlessly at their stops.
const t=require("./harness").load("chord-asteroids");
(async()=>{
  const {w, sleep, note, check, knob, mc}=t;
  await sleep(150); t.connect({extra:{7:19, 117:0, 10:30, 12:40, 16:50, 238:1}}); await sleep(100);
  // chord rocks by type (key C, level 1)
  const P=o=>w.eval(`asChordPoints(${JSON.stringify(o)})`);
  w.eval("blast.level=0");
  check("a chord rock is worth its chord: major 10, minor 15, diminished seventh 50",
    P({q:"",root:"C"})===10 && P({q:"m",root:"A"})===15 && P({q:"°7",root:"B"})===50, `${P({q:"",root:"C"})} ${P({q:"m",root:"A"})} ${P({q:"°7",root:"B"})}`);
  check("half again when it needs the modifier, three times a star rock", P({q:"",root:"B♭"})===15 && P({q:"",root:"C",star:true})===30);
  // manual aim
  w.eval("saved.asAim=1"); const a=await t.start(0, {speed:4});
  check("manual aim puts the knobs on their alternates, pointed at unused addresses", mc.params[117]===1 && mc.params[10]===213 && mc.params[12]===214 && mc.params[16]===215);
  const ang0=a.shipAng; knob(0,20); await sleep(300);
  check("the other knob spins the ship", Math.abs(a.shipAng-ang0)>1, `${ang0.toFixed(2)} → ${a.shipAng.toFixed(2)}`);
  // clear the sky, and put a note where the ship points, and one off to its side
  w.eval("blast.rocks.forEach(r=>asKill(r)); blast.rocks=[]; blast.next=performance.now()+1e6");
  const place=(off,pc)=>w.eval(`(()=>{ const a=blast.shipAng+${off}, d=150; const r=asRock("note", blast.cx+Math.cos(a)*d, blast.cy+Math.sin(a)*d, "${["C","","D"][pc]}", {name:"${["C","","D"][pc]}", pc:${pc}, group:{left:9,label:"X"}}); r.born=performance.now()-5000; return r.id; })()`);
  const side=place(Math.PI/2, 2); await sleep(30);
  note(2); await sleep(400);
  check("a note off to the side isn't hit: the shot goes wide", !a.rocks.find(r=>r.id===side).dead && /WIDE/.test(t.heard()), t.heard());
  await sleep(500);
  const ahead=place(0, 0), s0=a.score; await sleep(30);
  note(0); await sleep(400);
  check("a note where the ship points is hit, for double", a.rocks.find(r=>r.id===ahead)?.dead!==false && a.score-s0===w.eval("mulPts(20)"), `+${a.score-s0}, 10 × 2 × the speed multiplier ${a.mult||1}`);
  // chords are aimed too: a chord rock off to the side isn't cracked, one in line is, for double
  await sleep(500); const rock=(off,root,q)=>w.eval(`(()=>{ const a=blast.shipAng+${off}, d=190; const r=asRock("chord", blast.cx+Math.cos(a)*d, blast.cy+Math.sin(a)*d, "${root}${q}", {root:"${root}", q:"${q}", tones:spellChord("${root}","${q}"), rootPc:pcOfName("${root}")}); return r.id; })()`);
  const sideRock=rock(Math.PI/2,"F",""); await sleep(30); t.chord("F"); await sleep(300);
  check("a chord rock off to the side isn't cracked: the chord goes wide", !a.rocks.find(r=>r.id===sideRock).dead && /WIDE/.test(t.heard()), t.heard());
  const aheadRock=rock(0,"G",""), s1=a.score; await sleep(30); t.chord("G"); await sleep(400);
  check("a chord rock where the ship points is cracked, for double", a.rocks.find(r=>r.id===aheadRock)?.dead!==false && a.score-s1===w.eval("mulPts(10*2)"), `+${a.score-s1}`);
  // endless knobs: held at a stop, the orbit keeps going round (and the aim keeps spinning); turned
  // back, each carries on from where it got to rather than jumping back
  knob(127,22); await sleep(80); const o0=a.orbitWant; await sleep(1600);
  const o1=a.orbitWant; knob(118,22); await sleep(80); const o2=a.orbitWant;
  check("held at its end, the orbit knob keeps the ship going round", o1-o0>1, `${(o1-o0).toFixed(2)} rad further`);
  check("and turned back, it carries on from there without jumping", Math.abs(o2-o1)<.6, `moved ${(o2-o1).toFixed(2)}`);
  knob(0,20); await sleep(80); const s0a=a.aimWant; await sleep(1600);
  check("held at its end, the aim knob keeps the ship spinning", s0a-a.aimWant>1, `${(s0a-a.aimWant).toFixed(2)} rad further`);
  t.done();
})();
