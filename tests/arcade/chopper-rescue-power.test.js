// Chopper Rescue's variety, its inversions said plainly, and its power-ups: the later levels call in
// every key, dealt so no call comes round more than its share; a first inversion's instruction holds
// on the radio, each note marked with its place in the chord, till they're up; a supply crate is
// flown out for by its chord, and TAILWIND, RADAR, WINCH and DA CAPO each do what they say.
const t=require("./harness").load("chopper-rescue");
(async()=>{
  const {sleep, chord, note, check, d, w}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(4); await sleep(300);

  // the variety: three hundred calls at the top level, dealt from the bags
  const calls=w.eval("(()=>{ const out=[]; for(let i=0;i<300;i++) out.push(chCall(CH_LEVELS[4])); return out; })()");
  const keys=new Set(calls.map(c=>c.key)), counts={};
  calls.forEach(c=>counts[c.text]=(counts[c.text]||0)+1);
  const most=Math.max(...Object.values(counts));
  check("the top level calls in every key, A♭, D♭, E♭ and A among them", ["A♭","D♭","E♭","A","B","B♭","E"].every(k=>keys.has(k)), [...keys].join(" "));
  check("no one call comes round more than its share", most<=12, `the most: ${most} of 300, ${Object.keys(counts).length} different`);
  check("every call's chords are plainly spelled", calls.every(c=>w.eval("chPlain")(c)));
  check("the sevenths level calls in every key too", w.eval("CH_LEVELS[3].keys.length")>=11);

  // a first inversion: its instruction on the radio, held till they're up
  const tuneIn=async()=>{ for(let k=0;k<80 && !a.tune;k++) await sleep(100); if(!a.tune) return false; note(a.tune.pc); await sleep(700); return !!a.call; };
  check("a call comes through", await tuneIn());
  let c=a.call; for(const l of c.legs){ chord(l.root, l.q); await sleep(700); }
  for(let k=0;k<120 && !a.signal;k++) await sleep(50);
  const radio=()=>d.querySelector(".chradio .chtext").textContent;
  check("the radio says it's the first inversion, from the 3rd", /1ST INVERSION: START ON THE 3RD/.test(radio()), radio());
  check("each note to pluck is marked with its place in the chord", [...d.querySelectorAll(".chsignal b small")].map(x=>x.textContent).join(" ")==="3RD 5TH ROOT", [...d.querySelectorAll(".chsignal b small")].map(x=>x.textContent).join(" "));
  await sleep(2600);
  check("and the instruction is still there after the banner's gone", /1ST INVERSION/.test(radio()) && !d.querySelector(".field .banner"));
  for(const n of a.signal.tones){ note(t.PC[n]); await sleep(20); }
  await sleep(60);
  check("once they're up, it's gone", !/1ST INVERSION/.test(radio()), radio());
  await sleep(2400);

  // a right chord lands where the called chord lies, however the minichord spells what's played
  w.eval("blast.call={text:'TEST', legs:[{root:'D♭', q:''}], what:'SURVIVORS'}; blast.leg=0; blast.callAt=performance.now(); blast.deadline=blast.callAt+20000; blast.tune=null; blast.busy=false; blast.emerg=[]");
  chord("C♯"); await sleep(200);
  check("D♭ played lands in D♭'s column, not C♯'s", a.pos.col===3 && a.pos.row===0, JSON.stringify(a.pos));
  for(let k=0;k<120 && !a.signal;k++) await sleep(50);
  if(a.signal) for(const n of a.signal.tones){ note(t.PC[n]); await sleep(20); }
  await sleep(2400);

  // the crate: dropped with a call at a chord of its key, flown out for by that chord
  const crateCall=async k=>{
    for(let i=0;i<80 && !(a.call && !a.busy && !a.signal);i++){ if(a.tune) note(a.tune.pc); await sleep(100); }
    w.eval(`blast.chPower=null; blast.crate={k:"${k}", root:"F", q:"", ...chPad("F","")}; blast.call.legs=[{root:"G", q:""}]; blast.emerg=[]; chDrawMap()`);
  };
  await crateCall("tailwind");
  check("a crate shows on the map, marked with its chord", /F/.test((d.querySelector(".chcrateat")||{}).textContent||""));
  const before=a.deadline; chord("F"); await sleep(1300);
  check("its chord flies out for it: TAILWIND", w.eval("chPowerOn('tailwind')") && !a.crate, a.chPower && a.chPower.k);
  check("the crate's taken, and the HUD says so", /TAILWIND/.test(d.querySelector(".field .hud").textContent));
  const left0=a.deadline-performance.now(); await sleep(1000); const left1=a.deadline-performance.now();
  check("the flare burns at half speed", Math.abs((left0-left1)-500)<150, `${Math.round(left0-left1)} ms in a second`);
  check("a crate that's no wrong place costs no time", a.deadline>=before);
  chord("G"); for(let k=0;k<60 && !a.signal;k++) await sleep(50);
  for(const n of a.signal.tones){ note(t.PC[n]); await sleep(20); }
  await sleep(2400);

  await crateCall("winch"); chord("F"); await sleep(1300);
  check("WINCH is taken", w.eval("chPowerOn('winch')"));
  const rescues=a.rescues; chord("G"); await sleep(2600);
  check("with the winch, they come up without a signal", a.rescues===rescues+1 && !a.signal && !a.chPower, `${a.rescues-rescues} rescued`);

  await crateCall("radar"); chord("F"); await sleep(1300);
  check("RADAR decodes the call that's on", /📡 G/.test(radio()), radio());
  check("and the one after", a.chPower && a.chPower.uses===1);
  chord("G"); for(let k=0;k<60 && !a.signal;k++) await sleep(50);
  for(const n of a.signal.tones){ note(t.PC[n]); await sleep(20); }
  for(let k=0;k<80 && !a.call;k++){ if(a.tune) note(a.tune.pc); await sleep(100); }
  await sleep(a.call ? 60*a.call.text.length+300 : 0);
  check("the next call comes decoded straight away", /📡/.test(radio()) && !a.chPower, radio());

  for(let k=0;k<80 && a.busy;k++) await sleep(50);
  const lives=a.lives; await crateCall("dacapo"); chord("F"); await sleep(1300);
  check("DA CAPO gives a heart", a.lives===lives+1, `${lives} → ${a.lives}`);

  // a crate drops now and then by itself, never at an emergency, never the answer
  let drops=0, clean=true;
  for(let i=0;i<400;i++){ const r=w.eval("(()=>{ blast.chPower=null; const call=chCall(CH_LEVELS[4]); blast.emerg=chEmergencies('fire', chPad(call.legs.at(-1).root, call.legs.at(-1).q)); chCrateDrop(call); const c=blast.crate; return c && {c, hit: blast.emerg.some(e=>e.col===c.col && e.row===c.row)}; })()");
    if(r){ drops++; if(r.hit) clean=false; } }
  check("crates drop now and then, about one call in four", drops>60 && drops<150, `${drops} of 400`);
  check("never on an emergency", clean);
  check("the POWER-UPS page lists them", w.eval("powersFor('chopper').map(p=>p.name).join(' ')")==="TAILWIND RADAR WINCH DA CAPO");
  check("lives intact", a.lives>=3, `${a.lives}`);
  t.done();
})();
