// The minichord set up for the joystick plate: every game turns "knobs send MIDI" (238) on, or the
// stick and buttons say nothing, and silences the stick's own sound and targets (396 joystick mode, 402
// to 414 what the ways and buttons point at), all through the arcade's preset (arcadePreset), which
// Chord Invaders reaches by its own way. Those are settings 256 and up: set only once the second page
// is in, asked for if it isn't; set again after a preset is loaded mid-game (whose own values are then
// what's given back); and given back after. The plate (243) and the stick's orientation (397) are never
// written. None of it without the plate.
const t=require("./harness");
const QUIET=[396,402,404,406,408,410,412,414];
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- Chord Snake (which wouldn't otherwise ask for the knobs)
    const T=t.load("chord-snake"), {w, mc, sleep, writes}=T;
    await sleep(150);
    // the second page held back until the test lets it through
    const held=[]; const dump0=mc._dump.bind(mc); mc._dump=m=>{ if(m[2]===0x6D) held.push(m); else dump0(m); };
    T.connect({firmware:90, extra:{243:4, 396:1, 404:31, 410:30}}); await sleep(100);
    const wrote=a=>writes.filter(([x])=>x===a).map(([,v])=>v);
    check("knobs send MIDI turned on", mc.params[238]===1 && wrote(238).includes(1));
    check("the second page asked for", held.length>=1);
    check("before it's in: none of 256 and up written", !writes.some(([a])=>a>=256), JSON.stringify(writes.filter(([a])=>a>=256)));
    mc._dump=dump0; held.forEach(m=>dump0(m)); await sleep(30);
    check("once it's in: joystick mode off, and every way and button pointed nowhere", QUIET.every(a=>mc.params[a]===0) && wrote(396).includes(0) && wrote(404).includes(0) && wrote(410).includes(0),
      QUIET.map(a=>`${a}=${mc.params[a]}`).join(" "));
    check("what they were is what's given back", w.eval("borrowed[396]")===1 && w.eval("borrowed[404]")===31 && w.eval("borrowed[410]")===30, w.eval("JSON.stringify(borrowed)"));
    check("the plate and the stick's orientation never written", !writes.some(([a])=>a===243 || a===397));
    await T.start(0); await sleep(200);
    // a preset loaded mid-game: page 0 reported unasked with a lot changed, then page 1 read again
    writes.length=0;
    Object.assign(mc.params, {238:0, 199:300, 21:1, 111:1});
    mc.unasked=true; mc.changed=new Set([238,199,21,111,184]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set();
    await sleep(20);
    check("a preset loaded: knobs send MIDI on again", mc.params[238]===1 && wrote(238).includes(1));
    Object.assign(mc.params, {396:1, 402:12, 412:30});                 // what the new preset holds for the stick
    mc.requestPage1(); await sleep(30);
    check("its page 1 in: the stick silenced again", QUIET.every(a=>mc.params[a]===0) && wrote(396).includes(0) && wrote(402).includes(0) && wrote(412).includes(0), QUIET.map(a=>`${a}=${mc.params[a]}`).join(" "));
    check("and the new preset's own values are what's given back", w.eval("borrowed[402]")===12 && w.eval("borrowed[412]")===30 && w.eval("borrowed[396]")===1, w.eval("JSON.stringify(borrowed)"));
    w.eval("restoreAll()"); await sleep(20);
    check("given back after", mc.params[396]===1 && mc.params[402]===12 && mc.params[412]===30 && mc.params[238]===0);
  }
  { // ---- Chord Invaders (its own setup)
    const T=t.load("invaders"), {mc, sleep}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4, 396:1}}); await sleep(120);
    await T.start(0); await sleep(150);
    check("Chord Invaders: knobs send MIDI on and the stick silenced", mc.params[238]===1 && QUIET.every(a=>mc.params[a]===0), `238=${mc.params[238]} 396=${mc.params[396]}`);
  }
  { // ---- no plate
    const T=t.load("chord-snake"), {mc, sleep, writes}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:0, 396:1}}); await sleep(120);
    await T.start(0); await sleep(150);
    check("another plate: nothing of the plate's borrowed", !writes.some(([a])=>a===238 || a>=256), JSON.stringify(writes.filter(([a])=>a===238 || a>=256)));
  }
  { const T=t.load("chord-snake"), {mc, sleep, writes}=T;
    await sleep(150); T.connect({firmware:89, extra:{243:4, 396:1}}); await sleep(120);
    await T.start(0); await sleep(150);
    check("firmware 89 (no joystick plate there): nothing either", !writes.some(([a])=>a===238 || a>=256));
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
