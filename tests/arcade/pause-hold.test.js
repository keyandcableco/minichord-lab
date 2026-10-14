// What a pause holds still besides the game's clock and moves: a sound the game keeps on (Chopper
// Rescue's radio tuning in, Chord Hunt's drone) goes quiet and comes back as it goes on; the time
// played, sent with a score, leaves the pause out; and PAUSED says to tap it on a phone, a minichord
// plugged in or not, in lettering no smaller than the arcade's smallest.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- Chopper Rescue: the radio tuning in
    const T=t.load("chopper-rescue"), {w, sleep, key}=T;
    await sleep(150); T.connect({extra:{7:17}}); await sleep(100);
    const a=await T.start(0);
    for(let k=0;k<100 && !a.tune;k++) await sleep(100);
    const au=a.tune && a.tune.audio;
    check("a call coming in through the static, sounding", !!au && au.g.gain.value>0 && au.ng.gain.value>0, au && `${au.g.gain.value} ${au.ng.gain.value}`);
    const ng=au && au.ng.gain.value;
    key("KeyP"); await sleep(5);
    check("paused: the tones and the static quiet", w.eval("blast.phase")==="pause" && au.g.gain.value===0 && au.ng.gain.value===0, `${au.g.gain.value} ${au.ng.gain.value}`);
    await sleep(300);
    check("and still quiet while it stands", au.g.gain.value===0 && au.ng.gain.value===0);
    key("KeyP"); await sleep(5);
    check("going on: the tones back, the static as the dial has it", w.eval("blast.phase")==="play" && au.g.gain.value>0 && Math.abs(au.ng.gain.value-ng)<1e-9, `${au.g.gain.value} ${au.ng.gain.value} (was ${ng})`);
  }
  { // ---- Chord Hunt: the drone, and the time played
    const T=t.load("chord-hunt"), {w, sleep, key}=T;
    await sleep(150); T.connect({firmware:60}); await sleep(100);
    await T.start(0); await sleep(200);
    w.eval("hdDrone(0, 30)");
    const to=[]; w.__to=to; w.eval("blast.drone.g.gain.setTargetAtTime=(v)=>__to.push(v)");
    const started=w.eval("blast.startedAt");
    key("KeyP"); await sleep(5);
    check("Chord Hunt paused: the drone goes quiet", w.eval("blast.phase")==="pause" && to[to.length-1]===0, JSON.stringify(to));
    await sleep(400);
    const stood=w.eval("performance.now()-blast.pauseStart");
    key("KeyP"); await sleep(5);
    check("and comes back as it goes on", w.eval("blast.phase")==="play" && to[to.length-1]>0, JSON.stringify(to));
    const moved=w.eval("blast.startedAt")-started;
    check("the time played leaves the pause out", Math.abs(moved-stood)<60 && w.eval("hsSeconds()")<=1, `start moved ${Math.round(moved)} ms for ${Math.round(stood)} ms paused`);
  }
  { // ---- a phone with a minichord plugged in: tap, not click
    const T=t.load("harp-command"), {w, d, sleep, key}=T;
    await sleep(150); T.connect({firmware:60}); await sleep(100);
    await T.start(0); await sleep(200);
    w.matchMedia=q=>({matches:/coarse/.test(q), addEventListener(){}});
    key("KeyP"); await sleep(5);
    const pz=d.querySelector(".field .jspause");
    check("PAUSED on a touch screen says to tap it", !!pz && /TAP HERE TO GO ON/.test(pz.textContent) && !/CLICK/.test(pz.textContent), pz && pz.textContent);
    key("KeyP"); await sleep(5);
    const css=d.getElementById("jsCss").textContent, m=css.match(/\.jspause span\{font:400 clamp\(([\d.]+)rem/);
    check("its lettering at least 8 px on any phone", m && +m[1]*16>=8, m && m[0]);
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
