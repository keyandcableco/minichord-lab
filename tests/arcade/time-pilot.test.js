// Time Pilot (arcade/games/time-pilot.js), on a clock the test drives (rhClockOverride): a sortie laid
// out bar by bar, the clicks put on the audio clock with none in the clouds; a pad judged PERFECT, GOOD,
// OK or not by its error as a fraction of a beat, doubles ignored, misses and strays breaking the
// streak; the player's own steady offset measured with the click and allowed for in the clouds; a
// bank held (doubled points, 250 a bar) or lost (too few hits, nothing in its last bar, or adrift by
// more than a quarter of a beat), a plane with it; the tap tempo's fit; the eras one after another,
// round again faster; the pads from a real minichord (counted for the board, never echoed), from the
// screen's pads and the keyboard (sounded here); a hidden page and the arcade's pause counting back in;
// the demo flying a sortie by itself; and game over with the high score board.
const t=require("./harness").load("time-pilot");
(async()=>{
  const {w, d, mc, sleep, check}=t;
  const ev=s=>w.eval(s), near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
  await sleep(150); t.connect({firmware:90, extra:{343:1, 340:2, 338:70}}); await sleep(100);
  // the clock: heard time = the page's milliseconds / 1000, and now is whatever the test says
  ev("window.__T=100; rhClockOverride={now:()=>__T, ctxNow:()=>__T, heard:p=>p/1000, perf:s=>s*1000}");
  ev("window.__clicks=[]; window.__rhAt=rhAt; rhAt=(t,v,vel,kit)=>{ __clicks.push([t,v]); return __rhAt(t,v,vel,kit); }");
  ev("window.__sounds=[]; window.__rhSound=rhSound; rhSound=(v,vel,kit,t,f)=>{ if(t==null) __sounds.push([v,kit]); return __rhSound(v,vel,kit,t,f); }");
  // fly on to heard time `until`, a pad struck on every grid point at its time plus err(t) (in the
  // clouds, plus the player's offset as the game has it, unless raw), pad(t) the pad
  ev(`window.__fly=(until, err=()=>0, pad=t=>t.low ? 0 : 1, skip=()=>false)=>{
    while(__T<until-1e-9){ __T=Math.min(until, +(__T+.02).toFixed(6));
      const p=blast.tp; if(p && p.segs) for(const x of p.targets){ if(x.T>__T+.5) break; if(x.flown || skip(x)) continue; const at=x.T+err(x); if(at<=__T){ x.flown=true; tpHit(pad(x), 100, at); } }
      tpStep(__T); } }`);
  const segStart=(stage, sortie)=>ev(`(()=>{ const s=blast.tp.segs.find(s=>s.stage==='${stage}' && s.sortie===${sortie}); return s ? tpSegStart(s) : null; })()`);
  // a moment after the clouds part, when the bank's been judged (half a beat, the player's offset, 50 ms)
  const revealed=sortie=>segStart("clear", sortie)+.7*ev("blast.tp.B")+.06;

  // ---------- a game begins ----------
  check("the game's on the page", ev("typeof tpHit==='function' && typeof tpFitTaps==='function' && typeof tpResume==='function'"));
  await t.start(0); await sleep(60);
  check("1910 is under way, in play", ev("blast.kind")==="pilot" && ev("blast.phase")==="play" && ev("blast.level")===0);
  const B=ev("blast.tp.B"), T0=ev("blast.tp.T0");
  check("76 BPM at Relaxed, the eras' own", near(B, 60/76), B);
  check("the count-in starts ahead of the audio clock, time for the banner", T0>=100+ev("rhLead()")+1 && T0<104, T0);
  check("three sorties, then the warp: count-in, formation, the bank (1, 2, 2 bars), clear",
    ev("blast.tp.segs.map(s=>s.stage+s.bars).join()")==="count1,form2,cloud1,clear2,count1,form2,cloud2,clear2,count1,form2,cloud2,clear2,warp2", ev("blast.tp.segs.map(s=>s.stage+s.bars).join()"));
  check("a target on every beat of formation, the bank and clear; quarter notes", ev("blast.tp.targets.filter(t=>t.sortie===0).length")===20 && near(ev("blast.tp.unit"), B));
  check("the first plane is due on formation's first beat", near(ev("blast.tp.targets[0].T"), T0+4*B));
  ev("__clicks.length=0; blast.tp.sched=0; __T=blast.tp.T0-.5; tpStep(__T)");
  check("an accent on the count-in's first beat, clicks on the rest", JSON.stringify(ev("__clicks.slice(0,4).map(c=>c[1])"))==='["accent","click","click","click"]' && near(ev("__clicks[0][0]"), T0));

  // ---------- judging with the click ----------
  ev("__T=blast.tp.T0+3.5*blast.tp.B; tpStep(__T)");
  check("the count-in, then formation", ev("blast.tp.stage")==="count");
  ev("blast.mult=1");
  const hit=(k, err, pad=5)=>ev(`tpHit(${pad}, 100, blast.tp.targets[${k}].T+${err})`);
  const r0=hit(0,.03), r1=hit(1,-.06), r2=hit(2,.1);
  check("3% of a beat late: PERFECT, 50", r0.res==="PERFECT" && r0.pts===50, JSON.stringify(r0));
  check("8% early: GOOD, 25", r1.res==="GOOD" && r1.pts===25, JSON.stringify(r1));
  check("13% late: OK, 10", r2.res==="OK" && r2.pts===10, JSON.stringify(r2));
  check("the streak counts them", ev("stats.streak")===3);
  const r3=hit(3,.15);
  check("19% late: no hit, and the streak's broken", r3.res==="MISS" && ev("stats.streak")===0 && !ev("blast.tp.targets[3].hit"), JSON.stringify(r3));
  check("a second stroke on a plane already down counts for nothing", hit(0,.01).double===true && ev("blast.score")===85, ev("blast.score"));
  ev("stats.streak=4; __T=blast.tp.targets[4].T+.2; tpStep(__T)");
  check("planes that slip past the gunsight break the streak", ev("blast.tp.targets[3].missed && blast.tp.targets[4].missed") && ev("stats.streak")===0);
  ev("saved.tpTight=true");
  check("TIGHT: a third off every window (5% PERFECT is 3.5%)", hit(5,.03).res==="GOOD" && hit(6,.026).res==="PERFECT");
  ev("saved.tpTight=false");
  check("the windows are a fraction of a beat: PERFECT at least 18 ms", JSON.stringify(ev("tpWins().map(x=>+x.toFixed(4))"))===JSON.stringify([.05,.1,.16].map(f=>+(f*B).toFixed(4))));
  check("the error is kept for the player's own time", ev("blast.tp.offErrs.length")>=5);

  // ---------- a bank held by a player who's always 40 ms late ----------
  ev("beginPilot(0)"); await sleep(30); ev("blast.mult=1");
  ev(`__fly(${segStart("cloud",0)}+.05, t=>.04)`);
  check("their own time measured from formation: 40 ms late", near(ev("blast.tp.offset"), .04, 1e-6), ev("blast.tp.offset"));
  check("in the clouds: no clicks put on the clock", ev(`__clicks.filter(c=>c[0]>=${segStart("cloud",0)}-1e-9 && c[0]<${segStart("clear",0)}-1e-9).length`)===0);
  check("the HUD says only that", ev("blast.tp.stage")==="cloud" && /IN THE CLOUDS|1910/.test(ev("blast.hud.textContent")));
  const s0=ev("blast.score");
  ev(`__fly(${segStart("clear",0)}+.03, t=>.04)`);
  check("the clouds parting: the bank judged a moment later, when its last stroke's surely in", !ev("blast.tp.reveal") && ev("blast.tp.revealDue.at")>ev("__T"));
  ev(`__fly(${revealed(0)}, t=>.04, undefined, t=>t.seg.stage==='clear')`);
  const rv=ev("blast.tp.reveal");
  check("the clouds part: 40 ms late is their time, so ON THE BEAT", rv && !rv.lost && near(rv.drift, 0, 1e-6) && ev("tpDriftWords(blast.tp.reveal.drift)")==="ON THE BEAT", JSON.stringify(rv));
  check("every hit in the clouds PERFECT, doubled, and 250 for the bar held", rv.items.every(i=>i && i.res==="PERFECT") && rv.pts===4*100+250 && ev("blast.score")-s0===650, `${rv.pts} ${ev("blast.score")-s0}`);
  check("no plane lost", ev("blast.lives")===3);
  check("the clicks are back", ev(`__clicks.some(c=>Math.abs(c[0]-${segStart("clear",0)})<1e-6 && c[1]==='accent')`));

  // ---------- banks lost ----------
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(${revealed(0)}, t=>t.cloud ? .25*blast.tp.B+.02 : 0)`);
  check("adrift by more than a quarter of a beat: lost, a plane down", ev("blast.tp.reveal.lost")===true && ev("blast.lives")===2 && /^BEHIND 2\d\d MS$/.test(ev("tpDriftWords(blast.tp.reveal.drift)")), ev("tpDriftWords(blast.tp.reveal.drift)"));
  ev(`__fly(${revealed(1)}, t=>0, t=>1, t=>t.cloud && t.bar===blast.tp.segs.find(s=>s.stage==='cloud' && s.sortie===1).bar0+1)`);
  check("half the bank played, nothing in its last bar: lost", ev("blast.tp.reveal.lost")===true && ev("blast.tp.reveal.held")===4 && ev("blast.lives")===1);
  ev(`__fly(${segStart("count",2)}+.05)`);
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(${revealed(0)}, t=>0, t=>1, t=>t.cloud && t.beat>0)`);
  check("one beat of four: fewer than half, lost", ev("blast.tp.reveal.lost")===true && ev("blast.lives")===2);
  ev(`__fly(${revealed(1)}, t=>t.cloud ? -.1 : 0)`);
  check("100 ms ahead, under a quarter of a beat: held, AHEAD 100 MS, nothing PERFECT", ev("blast.tp.reveal.lost")===false && ev("tpDriftWords(blast.tp.reveal.drift)")==="AHEAD 100 MS" && ev("blast.tp.reveal.items.every(i=>i.res==='OK')"));

  // ---------- the bank fitted to the player's own line ----------
  // i: a target's place in its bank
  ev("window.__bi=t=>blast.tp.targets.filter(x=>x.seg===t.seg).indexOf(t)");
  ev("beginPilot(2)"); await sleep(30);
  ev(`__fly(${revealed(0)}, t=>t.cloud ? .7*blast.tp.B*(__bi(t)+1)/16 : 0)`);
  check("1970, eighths: a slow slide to most of a beat behind is lost as BEHIND, not folded onto the next eighth",
    ev("blast.tp.reveal.lost")===true && /^BEHIND \d+ MS$/.test(ev("tpDriftWords(blast.tp.reveal.drift)")) && ev("blast.tp.reveal.drift")>.25*ev("blast.tp.B") && ev("blast.lives")===2,
    `${ev("tpDriftWords(blast.tp.reveal.drift)")} ${ev("blast.tp.reveal.lost")}`);
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(${revealed(0)})`);
  ev(`__fly(${revealed(1)}, t=>t.cloud ? blast.tp.B*(__bi(t)+1)/8 : 0)`);
  check("1910: a slide of a whole beat, not taken for the next beat on time", ev("blast.tp.reveal.lost")===true && /^BEHIND/.test(ev("tpDriftWords(blast.tp.reveal.drift)")), ev("tpDriftWords(blast.tp.reveal.drift)"));
  ev("beginPilot(0)"); await sleep(30);
  const c0=segStart("cloud",0);
  ev(`__fly(${c0}-.02)`);
  ev(`tpHit(3, 100, ${c0}+1.55*blast.tp.B)`);                      // a wild stroke half a beat off, before the second beat's
  ev(`__fly(${revealed(0)})`);
  check("one wild stroke in the clouds: the rest still on the beat, it set aside", ev("blast.tp.reveal.lost")===false && ev("tpDriftWords(blast.tp.reveal.drift)")==="ON THE BEAT" && ev("blast.tp.reveal.items.every(i=>i && i.res==='PERFECT')"), JSON.stringify(ev("blast.tp.reveal.items")));
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(${revealed(0)}, t=>.45*blast.tp.B)`);
  check("not with the click at all (every stroke .45 of a beat late): formation all missed, nothing taken as their own time", ev("blast.tp.targets.filter(t=>t.seg.stage==='form' && t.sortie===0).every(t=>!t.hit && t.missed)") && ev("blast.tp.offset")===0 && ev("blast.tp.offErrs.length")===0);
  check("so the clouds aren't judged on their phase: lost, BEHIND", ev("blast.tp.reveal.lost")===true && /^BEHIND 3\d\d MS$/.test(ev("tpDriftWords(blast.tp.reveal.drift)")) && ev("blast.lives")===2, ev("tpDriftWords(blast.tp.reveal.drift)"));
  ev(`__fly(${segStart("cloud",1)}-.02)`); ev("blast.tp.offErrs=[.3,.31,.3,.29]"); ev(`__fly(${segStart("cloud",1)}+.02)`);
  check("their own time is never taken as more than the OK window", near(ev("blast.tp.offset"), ev("tpWins()[2]")), ev("blast.tp.offset"));
  // a last stroke in the clouds whose event is handled after the clouds have parted
  ev("beginPilot(2)"); await sleep(30);
  const cl2=segStart("clear",0), lastT=ev("blast.tp.targets.filter(t=>t.cloud && t.sortie===0).pop().T");
  ev(`__fly(${cl2}+.01, t=>.06, undefined, t=>Math.abs(t.T-${lastT})<1e-9)`);
  check("1970, 60 ms behind with the click: their time", near(ev("blast.tp.offset"), .06, 1e-6) && ev("blast.tp.stage")==="clear" && !ev("blast.tp.reveal"));
  check("the bank's last stroke, handled late: still in the bank", ev(`tpHit(1, 100, ${lastT}+.07)`).cloud===true);
  ev(`__fly(${revealed(0)}, t=>.06)`);
  check("and counted when the clouds part", ev("blast.tp.reveal.items.every(i=>i && i.res)") && ev("blast.tp.reveal.lost")===false && ev("blast.tp.reveal.items.length")===16);
  check("one handled after the reveal counts for nothing", ev(`tpHit(1, 100, ${lastT}+.07)`).late===true);

  // ---------- tap tempo ----------
  const fit=ev("tpFitTaps([10, 10.5, 11, 11.5])");
  check("four taps half a second apart: 120 BPM, on the first", fit.ok && near(fit.bpm,120,1e-6) && near(fit.a,10,1e-9), JSON.stringify(fit));
  const fit2=ev("tpFitTaps([10.01, 10.6, 11.18, 11.81])");
  check("a human's taps: the best line through them", fit2.ok && Math.abs(fit2.bpm-100.3)<.5 && Math.abs(fit2.a-10.005)<.01, JSON.stringify(fit2));
  check("too slow, too fast, unsteady: not taken", ev("tpFitTaps([0,1.1,2.2,3.3]).why")==="FASTER" && ev("tpFitTaps([0,.3,.6,.9]).why")==="SLOWER" && ev("tpFitTaps([0,.5,1.25,1.5]).why")==="STEADY");
  check("60 and 160 are in", ev("tpFitTaps([0,1,2,3]).ok") && ev("tpFitTaps([0,.375,.75,1.125]).ok"));

  // ---------- the eras ----------
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.4)`);
  check("1910 flown: the warp into 1940, 88 BPM", ev("blast.level")===1 && near(ev("blast.tp.B"), 60/88) && ev("blast.lives")===3, `${ev("blast.level")} ${ev("blast.tp.B")}`);
  check("no planes lost, nothing missed", ev("blast.tp.targets.every(t=>!t.missed)"));
  ev(`__fly(${segStart("form",0)}-.1)`); ev("blast.mult=1");
  const k=ev("blast.tp.targets.findIndex(t=>t.seg.stage==='form')");
  check("1940: the bombers on 1 and 3", ev(`blast.tp.targets[${k}].low && !blast.tp.targets[${k+1}].low && blast.tp.targets[${k+2}].low`));
  const right=hit(k,0,0), wrong=hit(k+1,0,7), snare=hit(k+2,0,1), high=hit(k+3,0,4);
  check("the right pad on the backbeat: half as much again (a low one for a bomber, any other for a fighter)", right.pts===150 && high.pts===150, `${right.pts} ${high.pts}`);
  check("the wrong pad: timed all the same, without the half", wrong.pts===100 && snare.pts===100 && wrong.res==="PERFECT");
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.4)`);
  check("1970: eighth notes, 100 BPM", ev("blast.level")===2 && near(ev("blast.tp.B"), .6) && near(ev("blast.tp.unit"), .3) && ev("blast.tp.targets.filter(t=>t.seg.stage==='form' && t.sortie===0).length")===16);
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.4)`);
  check("1982: the tempo is tapped", ev("blast.level")===3 && ev("blast.tp.stage")==="tap" && ev("!blast.tp.segs"));
  ev("__T+=1; tpStep(__T)");
  for(const dt of [0,1.1,2.2,3.3]) ev(`tpHit(2, 100, __T+${dt})`);
  check("tapped too slowly: asked again", ev("blast.tp.tapMsg")==="TOO SLOW: AGAIN" && ev("blast.tp.stage")==="tap");
  ev("__T+=6"); const h0=ev("__T");
  const taps=[0,.6,1.2,1.8].map(dt=>ev(`tpHit(2, 100, ${h0+dt})`));
  check("four taps at 100 BPM: the click comes in on their fifth beat", taps[3].fit && taps[3].fit.ok && near(ev("blast.tp.B"),.6,1e-9) && near(ev("blast.tp.T0"), h0+2.4, 1e-9), JSON.stringify(taps[3]));
  ev(`__T=${h0+2.4}-.5; tpStep(__T)`);
  check("a count-in bar on their tempo", near(ev(`__clicks.find(c=>c[0]>=${h0+2.4-1e-9})[0]`), h0+2.4, 1e-9) && near(ev(`__clicks.filter(c=>c[0]>=${h0+2.4-1e-9})[1][0]`), h0+3, 1e-9));
  check("the backbeat again, quarter notes", near(ev("blast.tp.unit"), .6) && ev("blast.tp.targets.some(t=>t.low)"));
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.4)`);
  check("2001: tapped too", ev("blast.level")===4 && ev("blast.tp.stage")==="tap");
  ev("__T+=1"); const h1=ev("__T"); [0,.5,1,1.5].forEach(dt=>ev(`tpHit(9, 100, ${h1+dt})`));
  check("120 BPM, in eighths", near(ev("blast.tp.B"), .5) && near(ev("blast.tp.unit"), .25));
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.4)`);
  check("and round again: 1910, 10 BPM faster", ev("blast.level")===5 && ev("tpEra().year")===1910 && near(ev("blast.tp.B"), 60/86), ev("blast.tp.B"));
  check("five eras, not a plane lost, the score climbing", ev("blast.lives")===3 && ev("blast.score")>20000, ev("blast.score"));
  check("the levels list shows each era's year and tempo", ev("TPMENU_G.levelName(0)")==="1910 · 76 BPM" && ev("TPMENU_G.levelName(3)")==="1982 · TAP TEMPO");
  ev("saved.speed=4");
  check("SPEED moves the tempos: Wild half as fast again", ev("tpBpm(0)")===115 && ev("tpTapLo(3)")===91, `${ev("tpBpm(0)")} ${ev("tpTapLo(3)")}`);
  ev("saved.speed=0");

  // ---------- the pads ----------
  ev("beginPilot(0)"); await sleep(60);
  ev(`__fly(${segStart("form",0)}-.1)`); ev("__sounds.length=0");
  const m0=ev("blast.midiIn||0"), tA=ev("blast.tp.targets[0].T");
  mc.handle([0x99,36,100], tA*1000); mc.handle([0x89,36,0], tA*1000+40);
  check("a pad on the minichord: judged by its own timestamp", ev("blast.tp.targets[0].hit && blast.tp.targets[0].hit.res")==="PERFECT" && ev("blast.tp.targets[0].hit.pad")===0);
  check("counted for the high score board, and not sounded again here", ev("blast.midiIn")===m0+1 && ev("__sounds.length")===0);
  mc.handle([0x99,38,90], (ev("blast.tp.targets[1].T")+.05)*1000);
  check("a snare 50 ms late: GOOD", ev("blast.tp.targets[1].hit.res")==="GOOD" && ev("blast.tp.targets[1].hit.pad")===1);
  ev("window.__hits=[]; window.__tpHit=tpHit; tpHit=(...a)=>{ __hits.push(a); return __tpHit(...a); }");
  t.key("Digit5"); await sleep(10);
  check("a key: sounded here, then judged", ev("__sounds.length")===1 && ev("__sounds[0][0]")===4 && ev("__hits.length")===1 && ev("__hits[0][0]")===4);
  ev("tpHit=__tpHit");

  // ---------- the screen's pads ----------
  ev("touchMinichord(true)"); await sleep(120);
  if(ev("mc.params[343]")!==1) ev("tpDevice(); rhDevice('studio')");
  ev("beginPilot(0)"); await sleep(60);
  check("the screen's minichord: harp drums on, the deck's pads named for the studio kit", ev("mc.params[343]")===1 && !!d.querySelector("#tdeck .tdpads") && d.querySelector('#tdeck .tdpads span[data-i="0"]').textContent==="KICK");
  ev(`__fly(${segStart("form",0)}-.1)`); ev("__sounds.length=0");
  const finger=(el, type, id, x, y, timeStamp)=>{ const e=new w.MouseEvent(type, {clientX:x, clientY:y, bubbles:true, cancelable:true});
    Object.defineProperty(e, "pointerId", {value:id}); Object.defineProperty(e, "pointerType", {value:"touch"});
    if(timeStamp!=null) Object.defineProperty(e, "timeStamp", {value:timeStamp}); el.dispatchEvent(e); };
  const pad=i=>d.querySelector(`#tdeck .tdpads span[data-i="${i}"]`);
  finger(pad(1), "pointerdown", 1, 0, 0, (ev("blast.tp.targets[0].T")-.02)*1000); await sleep(10); finger(pad(1), "pointerup", 1, 0, 0);
  check("a finger on the snare pad: judged by the touch's time", ev("blast.tp.targets[0].hit && blast.tp.targets[0].hit.res")==="PERFECT" && ev("blast.tp.targets[0].hit.pad")===1);
  check("and the snare sounded by the page, the studio kit's", ev("__sounds.length")===1 && ev("__sounds[0][0]")===1 && ev("__sounds[0][1]")==="studio");
  ev("touchMinichord(false)"); await sleep(60);
  t.connect({firmware:90, extra:{343:1, 340:2, 338:70}}); await sleep(60);

  // ---------- hidden, and paused ----------
  ev("beginPilot(0)"); await sleep(30);
  ev(`__fly(${segStart("form",0)}+.5)`);
  ev("piano.ctx.suspend=piano.ctx.suspend||(()=>Promise.resolve())");
  const hide=v=>{ Object.defineProperty(d, "hidden", {value:v, configurable:true}); d.dispatchEvent(new w.Event("visibilitychange")); };
  ev("rhAt(__T+.5,'click')"); hide(true);
  check("hidden: the music stops at once, nothing left to play", ev("blast.tp.held")===true && ev("rhQueue.length")===0);
  check("and nothing's judged", ev("tpHit(0,100,blast.tp.targets[3].T)")===null);
  ev("__T+=30"); hide(false);
  check("back: the sortie again from a fresh count-in, ahead of the clock", ev("blast.tp.held")===false && ev("blast.tp.T0")>=ev("__T")+ev("rhLead()") && ev("blast.tp.segs[0].stage+blast.tp.segs[0].sortie")==="count0", ev("blast.tp.T0"));
  ev(`__fly(${segStart("cloud",0)}+.05)`); ev("blast.phase='pause'"); await sleep(40);
  check("the arcade's pause holds it", ev("blast.tp.held")===true);
  ev("blast.phase='play'; tpResume()");
  check("going on: counted back in, the bank flown again", ev("blast.tp.held")===false && ev("blast.tp.segs[2].stage")==="cloud" && ev("blast.tp.T0")>ev("__T"));
  check("but the bank left in the middle is lost, a plane with it: no way out of the clouds", ev("blast.lives")===2);
  ev(`__fly(${segStart("form",0)}+.5)`); ev("blast.phase='pause'"); await sleep(40); ev("blast.phase='play'; tpResume()");
  check("paused in formation: nothing lost", ev("blast.lives")===2);
  ev(`__fly(${segStart("clear",0)}+.02)`);
  check("the clouds just parted, not judged yet", ev("!!blast.tp.revealDue") && !ev("blast.tp.reveal"));
  ev("blast.phase='pause'"); await sleep(40);
  check("paused then: the bank judged at once, with what was played in it", ev("!!blast.tp.reveal && blast.tp.reveal.lost===false") && ev("blast.lives")===2);
  // held, the sky stands where it was
  const hAt=ev("blast.tp.heldAt"); ev("__T+=5");
  check("held: the sky's drawn at the moment it stopped", near(ev("tpDrawTime()"), hAt) && ev("__T")-hAt>4);
  ev("blast.phase='play'; tpResume()");
  check("going on: the sky's on the clock again", near(ev("tpDrawTime()"), ev("__T")) && ev("blast.tp.heldAt")===null);
  // back with the sound still asleep (a phone after a call): the old plan's put away
  ev(`__fly(${segStart("form",0)}+.5)`);
  ev("tpHold(); window.__ok=tpClockOk; tpClockOk=()=>false; tpResume()");
  check("back, the sound asleep: waiting, the old plan gone, nothing judged against it", ev("blast.tp.stage")==="wait" && ev("blast.tp.segs")===null && ev("blast.tp.targets.length")===0 && ev("tpHit(0,100,__T)")===null);
  ev("tpClockOk=__ok; tpStep(__T)");
  check("and once it wakes, a fresh count-in", ev("blast.tp.stage")==="ready" && ev("blast.tp.segs[0].stage")==="count" && ev("blast.tp.T0")>ev("__T"));
  // the last plane, left in the clouds
  ev(`blast.lives=1; __fly(${segStart("cloud",0)}+.05)`); ev("blast.phase='pause'"); await sleep(40); ev("blast.phase='play'; tpResume()");
  check("the last plane left in the clouds: down, and nothing more flown", ev("blast.lives")===0 && ev("blast.tp.over")===true && ev("blast.tp.stage")==="down" && ev("blast.tp.segs")===null);
  await sleep(1800);
  check("then game over", ev("blast.phase")==="over");

  // ---------- the sky's layout ----------
  ev("beginPilot(0)"); await sleep(30);
  // (the field's size as a ResizeObserver would have it; the helper minichord away, as on a phone)
  const lay=(fw, fh)=>{ ev(`window.__hh=blast.helpHarp; window.__ro=blast.fx.ro; blast.helpHarp=null; blast.fx.ro={}; blast.fx.fw=${fw}; blast.fx.fh=${fh}; tpLayout(); blast.helpHarp=__hh; blast.fx.ro=__ro`); return ev("blast.lay"); };
  let L=lay(1280, 800);
  check("wide: the gunsight under the band the sortie's words are in", L.cy-L.R>=L.top+L.band && L.band>=22, JSON.stringify(L));
  ev("blast.sky.pops=[]; tpPop(blast.lay.cx, blast.lay.cy-blast.lay.R-12, 'PERFECT', '#fff')");
  const pp=ev("blast.sky.pops[0]");
  check("a PERFECT over a plane at the top of the ring never rises into them", (pp.dir<0 ? pp.y-.8*14 : pp.y)>=L.top+L.band, JSON.stringify(pp));
  ev("blast.sky.pops=[]; tpPop(blast.lay.cx, blast.lay.top+blast.lay.band+6, 'PERFECT', '#fff')");
  check("one that would: under its plane instead, sinking", ev("blast.sky.pops[0].y")>=L.top+L.band+20 && ev("blast.sky.pops[0].dir")===1);
  for(const [fw, fh] of [[375,435],[375,342],[393,700]]){
    L=lay(fw, fh);
    check(`upright ${fw}x${fh}: the reveal's panel all on the screen, the ring under the band`, L.panel.y+76<=L.H && L.cy-L.R>=L.top+L.band && L.R>=26, `panel ${L.panel.y} H ${L.H} R ${L.R} cy ${L.cy}`);
  }
  L=lay(592, 390);                                                  // a phone on its side, the screen's pads beside the game
  const lx=ev(`tpFitX("LOST IN THE CLOUDS", ${L.panel.x}, ${L.W})`);
  check("sideways on a phone: LOST IN THE CLOUDS moved in, all on the screen", L.wide && lx+72<=L.W && lx-72>=0 && L.panel.x+72>L.W, `${lx} ${L.W}`);
  ev("tpHold()");

  // ---------- the demo ----------
  ev("stopBlaster(); startPilot()"); await sleep(60);
  ev("tpDemo()"); await sleep(30);
  check("the demo flies 1940, one sortie", ev("blast.phase")==="demo" && ev("blast.level")===1 && ev("blast.tp.segs.map(s=>s.stage).join()")==="count,form,cloud,clear");
  check("its first caption at once", /DRUM PADS/.test(d.querySelector(".field .demo .democap").textContent));
  const caps=new Set(), lit=new Set();
  ev("window.__lit=[]; window.__help=helpString; helpString=i=>{ __lit.push(i); return __help(i); }");
  ev("__sounds.length=0; __clicks.length=0");
  const end=ev("blast.tp.T0+blast.tp.totalBars*4*blast.tp.B+.05");
  while(ev("__T")<end){ ev("__fly(Math.min(__T+.5, "+end+"), ()=>0, ()=>0, ()=>true)"); const c=d.querySelector(".field .demo .democap"); if(c) caps.add(d.querySelector(".field .demo .demotitle").textContent); }
  check("the autopilot shoots every plane down, in the clouds too", ev("blast.tp.targets.every(t=>t.hit)") && ev("blast.tp.targets.filter(t=>t.cloud).every(t=>t.hit.res)"));
  check("the kick on 1 and 3, the snare on 2 and 4, lit as it strikes", ev("blast.tp.targets.every(t=>t.hit.pad===(t.low?0:1))") && ev("__lit.includes(0) && __lit.includes(1)"));
  check("its pads put on the audio clock to sound", ev("rhQueue.length+__clicks.length")>=0 && ev("blast.tp.targets.every(t=>t.plan)"));
  check("a little behind in the clouds, as players drift", ev("blast.tp.reveal && blast.tp.reveal.drift>.01 && !blast.tp.reveal.lost"), ev("blast.tp.reveal && blast.tp.reveal.drift"));
  check("captions for each part: formation, the cloud bank, the clouds parting, ready", ["FORMATION","THE CLOUD BANK","THE CLOUDS PART","READY?"].every(c=>caps.has(c)), [...caps].join(" / "));
  await sleep(2800);
  check("the demo ends by itself, back to the title", ev("blast.phase")==="menu" && !d.querySelector(".field .demo") && !!t.overlay() && !t.overlay().hidden);
  ev("helpString=__help");
  ev("tpDemo()"); await sleep(30);
  mc.handle([0x99,36,100], 1000);
  check("a pad struck in the demo ends it", ev("blast.phase")==="menu" && !d.querySelector(".field .demo"));

  // ---------- game over, and the board ----------
  ev("beginPilot(0)"); await sleep(60);
  ev(`__fly(${segStart("form",0)}-.1)`);
  for(let i=0;i<6;i++) mc.handle([0x99,38,100], ev(`blast.tp.targets[${i}].T`)*1000);
  check("six pads from the minichord, counted", ev("blast.midiIn")===6);
  ev(`__fly(blast.tp.T0+blast.tp.totalBars*4*blast.tp.B, ()=>0, ()=>1, t=>t.cloud)`);
  check("three banks with nothing in them: three planes lost", ev("blast.lives")===0 && ev("blast.tp.over")===true);
  check("the last bank's CLEAR not flown on: its planes not counted missed, no MISS over them", ev("blast.tp.targets.filter(t=>t.sortie===2 && t.seg.stage==='clear' && t.missed).length")===0 && !ev("blast.sky.pops.some(p=>p.text==='MISS')") && ev("blast.tp.segs[blast.tp.segI].stage")==="clear");
  check("and the sky held on the reveal", ev("tpDrawTime()")<=ev("blast.tp.overH") && ev("__T")>ev("blast.tp.overH"));
  check("and nothing more is judged", ev("tpHit(0,100,__T)")===null);
  await sleep(3500);
  check("game over", ev("blast.phase")==="over" && ev("saved.best.pilot")>0);
  for(let i=0;i<60 && !d.querySelector(".hsentry, .hssplash");i++) await sleep(50);
  check("played on the minichord: the high score board's offered", !!d.querySelector(".hsentry, .hssplash"));
  ev("rhClockOverride=null");

  // ---------- a phone's sound slow to start ----------
  // the audio clock still at 0 past tpClockOk's half second: the sortie laid out on the page's clock;
  // then it starts, near 0, and the sortie counts in again on it, not minutes off waiting for its time
  ev("piano.ctx.currentTime=0; beginPilot(0)"); await sleep(600); ev("tpStep(rhNow())");
  check("the audio clock not yet moving: laid out on the page's", ev("blast.tp.stage")==="ready" && ev("blast.tp.live")===false, ev("blast.tp.stage"));
  ev("piano.ctx.currentTime=2; tpStep(rhNow())");
  check("the audio clock starts: the sortie counts in again on it", ev("blast.tp.live")===true && ev("blast.tp.T0")>2 && ev("blast.tp.T0")<3, ev("blast.tp.T0"));
  ev("piano.ctx.currentTime=blast.tp.T0+.1; tpStep(rhNow())");
  check("and the count-in begins on time", ev("blast.tp.stage")==="count" && ev("blast.tp.segI")===0);
  t.done();
})();
