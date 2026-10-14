// The rhythm engine the drum games share (arcade/rhythm.js): its arithmetic (the nearest beat, the
// median, a player's steady offset, the seeded dice, the firmware's groove lines); its scheduler, on
// a clock the test drives, placing what falls in the next 120 ms at its own time, skipping what's
// past, belonging to its run, and silenced at once; every kit's every drum made without a fault, and
// played with the SOUND button off; the minichord set up as drum pads, firmware by firmware (59 can't;
// 60 on can, with the kits each firmware has), waiting for its second page of settings first; the
// screen's minichord; and the keyboard as pads, only in the drum games and only with keyboard play off.
const t=require("./harness").load("sight-line");
(async()=>{
  const {w, mc, sleep, check, writes}=t;
  await sleep(150);
  check("the engine is on the page", w.eval("typeof rhGrid==='function' && typeof rhStart==='function' && typeof rhDevice==='function'"));
  const ev=s=>w.eval(s), near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;

  // ---------- the arithmetic ----------
  const g=ev("rhGrid(10.53, 10, .25)"), g2=ev("rhGrid(9.98, 10, .5)");
  check("rhGrid: the nearest beat and how late", g.k===2 && near(g.err,.03,1e-9), JSON.stringify(g));
  check("rhGrid: early is negative, before the first beat too", g2.k===0 && near(g2.err,-.02,1e-9), JSON.stringify(g2));
  check("rhMedian: odd, even, empty", ev("rhMedian([3,1,2])")===2 && ev("rhMedian([4,1,3,2])")===2.5 && ev("rhMedian([])")===0);
  check("rhMedian leaves its list alone", ev("(()=>{ const a=[3,1,2]; rhMedian(a); return a.join(); })()")==="3,1,2");
  const off=ev("rhRobustOffset([.020,.022,.018,.021,.019,.35,-.4])");
  check("rhRobustOffset: the steady offset, the stray hits set aside", near(off,.02,.0015), off);
  check("rhRobustOffset: 0 with fewer than three", ev("rhRobustOffset([.05,.06])")===0 && ev("rhRobustOffset([])")===0);
  check("rhRobustOffset: all the same is that", near(ev("rhRobustOffset([.03,.03,.03,.03])"),.03));
  const seq=ev("(()=>{ const a=rhSeeded(7), b=rhSeeded(7), c=rhSeeded(8), d=rhSeeded('MAX'), e=rhSeeded('MAX'); const x=[...Array(50)].map(a), y=[...Array(50)].map(b), z=[...Array(50)].map(c);"
    +" return {same:x.join()===y.join(), differ:x.join()!==z.join(), text:d()===e(), range:x.every(v=>v>=0 && v<1), spread:new Set(x.map(v=>Math.floor(v*10))).size}; })()");
  check("rhSeeded: the same seed, the same numbers; another, others; text seeds too", seq.same && seq.differ && seq.text, JSON.stringify(seq));
  check("rhSeeded: numbers in [0, 1), spread out", seq.range && seq.spread>=7, JSON.stringify(seq));
  const rock=ev("rhParseGrid('x.......x.x.....', 4)");
  check("rhParseGrid: rock's kick, step by step", JSON.stringify(rock.map(h=>[h.step,h.vel,h.beat]))==="[[0,96,0],[8,96,2],[10,96,2.5]]", JSON.stringify(rock));
  const vel=ev("rhParseGrid('gox.X|..x.', 2)");
  check("rhParseGrid: g o x X, bars run on", JSON.stringify(vel.map(h=>[h.step,h.vel]))==="[[0,30],[1,56],[2,96],[4,124],[7,96]]", JSON.stringify(vel));
  const rat=ev("rhParseGrid('r.3.', 4)");
  check("rhParseGrid: a roll is two hits in its step, a ratchet as many as it says", JSON.stringify(rat.map(h=>[+h.step.toFixed(3),h.vel]))==="[[0,84],[0.5,84],[2,84],[2.333,84],[2.667,84]]", JSON.stringify(rat));

  // ---------- the pads ----------
  const names=ev("RH_PAD_NAMES");
  check("every kit names its twelve pads in capitals, five letters at most",
    ["studio","brushes","cliqhop","tabla"].every(k=>names[k].length===12 && names[k].every(n=>n.length<=5 && n===n.toUpperCase())), JSON.stringify(names));
  check("the tabla's pads are its bols", names.tabla.join(" ")==="DUM TEK KA KE TE TIN NAA TUN NE GE NA GEE");
  const reg=ev("RH_REGISTER");
  check("every pad has a register, low, middle or high", ["studio","brushes","cliqhop","tabla"].every(k=>reg[k].length>=12 && reg[k].every(r=>r===0||r===1||r===2)));
  check("the kick is low, the hats high; the tabla's bayan low", reg.studio[0]===0 && reg.studio[4]===2 && reg.studio[6]===2 && reg.tabla[9]===0 && reg.tabla[3]===0 && reg.tabla[11]===0);
  check("each kit's number on the minichord", JSON.stringify(ev("RH_KIT_SETTING"))==='{"studio":4,"brushes":5,"tabla":8,"cliqhop":12}');

  // ---------- sound: every drum, made without a fault ----------
  ev("piano.start()"); await sleep(20);
  ev("settings.sounds=false");
  const made=ev("(()=>{ const bad=[]; for(const k of ['studio','brushes','cliqhop','tabla']) for(let v=0;v<13;v++) if(!rhSound(v,100,k)) bad.push(k+v); for(const v of ['click','accent','chick']) if(!rhSound(v,110)) bad.push(v); return bad; })()");
  check("every kit's thirteen voices and the click, accent and chick are made (the SOUND button off)", made.length===0, made.join(" "));
  // the bus: straight to the speaker, not through the piano's compressor
  const bus=ev("(()=>{ const c=piano.ctx, mk=c.createGain.bind(c), to=[]; c.createGain=()=>{ const g=mk(), con=g.connect; g.connect=x=>{ to.push(x); return con(x); }; return g; };"
    +" rhBusOf=null; rhSound(0,100,'studio'); c.createGain=mk; return {dest:to.includes(c.destination), piano:to.includes(piano.out)}; })()");
  check("the drums have a bus of their own to the speaker, not the piano's", bus.dest && !bus.piano, JSON.stringify(bus));
  const tab=await w.eval("rhLoad('tabla').then(ok=>({ok, noise:typeof rhLoad('studio').then}))");
  check("rhLoad resolves when the tabla's recordings can't be fetched (and at once for a made kit)", tab.ok===false && tab.noise==="function");
  check("and the tabla plays its made stand-ins meanwhile", !!ev("rhSound(5,100,'tabla')"));
  ev("rhStop()");

  // ---------- the scheduler, on a clock the test drives ----------
  ev("window.__T=10; rhClockOverride={now:()=>window.__T, heard:p=>p/1000-.1, perf:t=>(t+.1)*1000}");
  check("the override drives the clock", ev("rhNow()")===10 && ev("rhHeard(5000)")===4.9 && near(ev("rhPerf(4.9)"),5000,1e-6));
  ev("rhQueue=[]; rhLive=[]; window.__s0={...rhStats}");
  ev("rhAt(9.95,'click'); rhAt(10.05,0,100,'studio'); rhAt(10.119,1,90,'brushes'); rhAt(10.121,2); rhAt(11,'accent')");
  ev("rhPump()");
  const q1=ev("rhQueue.map(e=>e.t)"), live1=ev("rhLive.map(x=>[x.start,x.voice,x.kit])");
  check("what falls in the next 120 ms is placed, at its own time", JSON.stringify(live1)==='[[10.05,0,"studio"],[10.119,1,"brushes"]]', JSON.stringify(live1));
  check("what's past is skipped, and the rest waits", JSON.stringify(q1)==="[10.121,11]" && ev("rhStats.skipped-__s0.skipped")===1, JSON.stringify(q1));
  ev("__T=10.01; rhPump()");
  check("the next pump places the next", ev("rhQueue.map(e=>e.t).join()")==="11" && ev("rhLive.some(x=>x.start===10.121)"));
  ev("__T=10.95; rhPump()");
  check("and the accent when its time comes", ev("rhQueue.length")===0 && ev("rhLive.some(x=>x.start===11 && x.voice==='accent')"));
  ev("rhAt(12.5,0); newRun(); __T=12.45; rhPump()");
  check("a sound queued by an earlier run is dropped, not played", ev("rhQueue.length")===0 && !ev("rhLive.some(x=>x.start===12.5)"));
  ev("rhAt(13,0); rhAt(13.5,1); __T=12.95; rhPump(); rhStop()");
  check("rhStop: nothing left queued or sounding", ev("rhQueue.length")===0 && ev("rhLive.length")===0);
  ev("rhStart()");
  check("rhStart sets the pump going", ev("rhPumpT")!==0);
  ev("rhAt(__T+.05, 'click')"); await sleep(80);
  check("which places sounds as their time comes", ev("rhQueue.length")===0 && ev("rhLive.some(x=>x.voice==='click')"));
  ev("rhAt(__T+5, 'click'); newRun()"); await sleep(80);
  check("a new run: the pump stops by itself, and what its run queued goes", ev("rhPumpT")===0 && ev("rhQueue.length")===0);
  ev("rhClockOverride=null");
  // with the harness's audio, whose clock never moves: the performance clock, in seconds
  check("with no clock to go by, heard time is the performance clock", near(ev("rhNow()"), ev("performance.now()/1000"), .05) && near(ev("rhPerf(rhHeard(1234.5))"),1234.5,1e-6));

  // ---------- the minichord as drum pads ----------
  const sent=[];
  const wire=()=>{ const o=mc.out, send=o.send.bind(o); o.send=m=>{ sent.push([...m]); return send(m); }; };
  const control=(c,p)=>sent.some(m=>m[1]===0 && m[2]===0 && m[3]===c && (p==null || m[4]===p));
  const drumWrites=()=>writes.filter(([a])=>a>=334 && a<=343 || a===215);
  const wrote=(a,v)=>writes.some(([x,y])=>x===a && y===v);
  async function setup(firmware, kit, extra={}){
    w.restoreAll(); await sleep(10);
    t.connect({firmware, extra}); wire(); await sleep(20);
    sent.length=0; writes.length=0; ev("blast.rhModeOff=false; rhWant=null");
    ev(`rhDevice(${JSON.stringify(kit)})`);
    const before=drumWrites().length, asked=control(7,1);
    await sleep(60);
    return {before, asked};
  }
  check("no minichord: nothing it needs", ev("rhNeeds()")==="");
  let r=await setup(59, "studio");
  check("firmware 59: no harp drums, and the player is told", ev("rhNeeds()")==="NEEDS FIRMWARE 60 FOR HARP DRUMS");
  check("firmware 59: nothing written, no second page asked for", drumWrites().length===0 && !control(7) && !ev("rhReady()"), JSON.stringify(drumWrites()));

  r=await setup(60, "studio", {339:40, 334:1, 341:1});
  check("firmware 60: nothing set before the second page is in, and it's asked for", r.before===0 && r.asked, JSON.stringify(sent));
  check("firmware 60: harp drums on, out on the harp's port", wrote(343,1) && wrote(340,2), JSON.stringify(drumWrites()));
  check("firmware 60: no humanize, no rhythm-mode drums, no count-in", wrote(339,0) && wrote(334,0) && wrote(341,0));
  check("firmware 60: the drums loud enough to hear (drum level up to 70 from 0)", wrote(338,70));
  check("firmware 60: the studio kit", wrote(337,4));
  check("firmware 60: the strings in order (harpInOrder)", wrote(215,1));
  check("firmware 60: the rhythm mode off, once", control(8,0) && sent.filter(m=>m[3]===8).length===1);
  check("firmware 60: ready, and nothing needed", ev("rhReady()") && ev("rhNeeds()")==="");
  sent.length=0; ev("rhDevice('studio')");
  check("set up again: the rhythm mode isn't sent again", !control(8));
  r=await setup(60, "tabla");
  check("firmware 60: no recorded tabla yet, the world percussion stands in", wrote(337,7), JSON.stringify(drumWrites()));
  r=await setup(60, "cliqhop", {338:50});
  check("firmware 60: no cliqhop yet, glitch stands in", wrote(337,11));
  check("a drum level of 50 is loud enough, and left alone", !writes.some(([a])=>a===338));
  r=await setup(61, "tabla");
  check("firmware 61: the tabla", wrote(337,8));
  r=await setup(84, "cliqhop");
  check("firmware 84: still glitch for cliqhop", wrote(337,11));
  r=await setup(85, "cliqhop");
  check("firmware 85: cliqhop", wrote(337,12));
  r=await setup(90, "brushes");
  check("firmware 90: brushes", wrote(337,5) && wrote(343,1));
  r=await setup(90, "studio", {243:4});
  check("firmware 90 with the joystick plate: no harp drums, and the player is told", ev("rhNeeds()").includes("JOYSTICK") && drumWrites().length===0);

  // the second page lost on the way: asked for again, and set up when it comes
  w.restoreAll(); await sleep(10);
  t.connect({firmware:90}); await sleep(20);
  { const o=mc.out; o.send=m=>{ sent.push([...m]); }; }            // a minichord that doesn't answer
  sent.length=0; writes.length=0; ev("blast.rhModeOff=false; rhWant=null; rhDevice('studio')");
  await sleep(100);
  check("waiting for the second page: nothing set", drumWrites().length===0 && control(7,1) && !ev("rhReady()"));
  await sleep(2300);
  check("and it's asked for again, once every two seconds", sent.filter(m=>m[3]===7).length===2, sent.filter(m=>m[3]===7).length);
  ev("for(let a=256;a<512;a++) mc.params[a]=0; mc.params[338]=70; mc.page1=true; mc.dispatchEvent(new Event('page1'))");
  check("when it comes, the drums are set up", wrote(343,1) && wrote(340,2) && wrote(337,4) && ev("rhReady()"), JSON.stringify(drumWrites()));

  // the screen's minichord: the strings are pads, nothing else asked of it
  w.restoreAll(); await sleep(10);
  ev("virtualMinichord('touch', true)"); await sleep(20);
  ev("rhDevice('tabla')");
  check("the screen's minichord: harp drums on, and ready", ev("mc.params[343]")===1 && ev("rhReady()") && ev("rhNeeds()")==="");
  check("and no kit or MIDI port asked of it", ev("mc.params[337]")!==8 && ev("mc.params[340]")!==2);
  ev("virtualMinichord('touch', false)"); await sleep(20);

  // ---------- the keyboard as pads ----------
  ev("stopBlaster(); blast={kind:'pilot', phase:'play', gen:500}; rhKeysOn(); window.__drums=[]; mc.addEventListener('drum', e=>__drums.push(e.detail))");
  const press=(code, opt={}, on=w.document)=>{ const e=new w.KeyboardEvent("keydown",{code, bubbles:true, cancelable:true, ...opt}); on.dispatchEvent(e); return e; };
  const got=()=>ev("__drums.splice(0)");
  let e1=press("Digit1"), d1=got();
  check("1 is the kick: a drum event from the keys", d1.length===1 && d1[0].pad===0 && d1[0].note===36 && d1[0].vel===100 && d1[0].source==="keys" && e1.defaultPrevented, JSON.stringify(d1));
  check("timed by the key itself, on the page's clock", d1.length && Math.abs(d1[0].t-ev("performance.now()"))<1000, d1.length && d1[0].t);
  press("Digit0"); press("Minus"); press("Equal"); const d2=got();
  check("0, - and = are the last three pads", JSON.stringify(d2.map(x=>[x.pad,x.note]))==="[[9,64],[10,63],[11,56]]", JSON.stringify(d2));
  press("Space"); const d3=got();
  check("Space is the kick too", d3.length===1 && d3[0].pad===0);
  const f=press("KeyF");
  check("F is never taken", got().length===0 && !f.defaultPrevented);
  press("Digit2",{ctrlKey:true}); press("Digit2",{shiftKey:true});
  check("not with a modifier held", got().length===0);
  const rep=press("Digit3",{repeat:true});
  check("a key held down is one stroke", got().length===0 && rep.defaultPrevented);
  const inp=w.document.createElement("input"); w.document.body.appendChild(inp); inp.focus(); press("Digit4",{}, inp); inp.remove();
  check("not while typing", got().length===0);
  ev("blast.phase='demo'"); press("Digit5"); ev("blast.phase='menu'"); press("Digit6"); ev("blast.phase='over'"); press("Digit7");
  check("in play, the demo and the title screen; not at game over", JSON.stringify(got().map(x=>x.pad))==="[4,5]");
  ev("blast.phase='play'; blast.kind='fours'"); press("Digit8");
  check("Trading Fours too", JSON.stringify(got().map(x=>x.pad))==="[7]");
  ev("blast.kind='sight'"); const s=press("Digit8");
  check("not in other games", got().length===0 && !s.defaultPrevented);
  // keyboard play on: the screen's minichord has the number row (its strings, its pads)
  ev("blast.kind='pilot'; virtualMinichord('keys', true); mc.params[343]=0"); await sleep(20);
  const kb=ev("kbOn()"); press("Digit9");
  check("not with keyboard play on, where the screen's minichord has the number row", kb && got().length===0);
  ev("virtualMinichord('keys', false)");
  ev("blast=null");
  t.done();
})();
