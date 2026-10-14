// The bonus rounds on the joystick plate: TUNE IT, whose controls are the d-pad's, is played on the
// stick (up and right sharpen the second note, down and left flatten it, A locks it in), in a game that
// steers on the stick (Chord Snake) as in one that doesn't (Chord Invaders). MISSING NOTE, which asks
// for a note by its pitch, takes none from the stick.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  for(const slug of ["chord-snake","invaders"]){
    const T=t.load(slug, {storage:{saved:{bonus:true}}}), {w, sleep, stick, button}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(150);
    await T.start(0); await sleep(200);
    const push=async (x,y)=>{ stick(x,y); await sleep(5); stick(0,0); await sleep(5); };
    w.eval(`arcadeBonus("tune")`); await sleep(4400);
    const b=()=>w.eval("blast.bonus");
    check(`${slug}: TUNE IT under way`, b() && b().g.id==="tune" && b().ready);
    const c0=b().cents;
    await push(0,.9); await push(0,.9); await push(.9,0);
    check(`${slug}: the stick up and right sharpen it`, Math.abs(b().cents-(Math.max(-60,Math.min(60,c0+6))))<1e-9, `${c0.toFixed(1)} → ${b().cents.toFixed(1)}`);
    const c1=b().cents;
    await push(0,-.9); await push(-.9,0);
    check(`${slug}: down and left flatten it`, Math.abs(b().cents-(Math.max(-60,c1-4)))<1e-9, `${c1.toFixed(1)} → ${b().cents.toFixed(1)}`);
    button("a"); await sleep(5); button("a",false); await sleep(5);
    check(`${slug}: A locks it in`, b().over && /CENTS|DEAD ON/.test(b().result||""), b().result);
  }
  { // MISSING NOTE: the stick's presses aren't notes
    const T=t.load("chord-snake", {storage:{saved:{bonus:true}}}), {w, sleep, stick, button}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(150);
    await T.start(0); await sleep(200);
    w.eval(`arcadeBonus("missing")`); await sleep(4400);
    w.eval("window.__n=0; { const b=blast.bonus, n=b.g.note; b.g=Object.assign(Object.create(b.g), {note(...x){ __n++; return n.apply(this,x); }}); }");   // (counted on this round's own copy)
    stick(0,.9); await sleep(5); stick(0,0); await sleep(5); button("a"); await sleep(5); button("a",false); await sleep(5);
    check("MISSING NOTE: the stick and A play no note in it", w.eval("blast.bonus.g.id")==="missing" && w.eval("__n")===0, `${w.eval("__n")} notes`);
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
