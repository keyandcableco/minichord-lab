// Trading Fours (arcade/games/trading-fours.js): the judge first, on its own (an exact echo, the same a
// steady few milliseconds late, half and double time, a sparse answer, silence, random hammering, low
// and high swapped, the accents, bar by bar, sam); the rivals' calls (the firmware's grooves, the same
// every time, harder each exchange); then a bout on a clock the test drives: the count-in, the call
// and the time queued ahead, an echo landing a blow, silence taking one, a K.O., the roster and the
// next rival in its own kit on the minichord and the pads; the boss's sam; the player K.O.'d and the
// game over; a pad from the minichord itself, from the keys (with the joystick plate's stick for an
// accent) and from the screen's pads; the page hidden and back; the demo, played and ended.
const t=require("./harness").load("trading-fours");
(async()=>{
  const {w, d, mc, sleep, check, done}=t;
  const ev=s=>w.eval(s), near=(a,b,e)=>Math.abs(a-b)<=e;
  await sleep(150);
  check("the game is on the page", ev("typeof tfSimilarity==='function' && typeof tfHit==='function' && typeof beginFours==='function'"));

  // ---------- the judge ----------
  const J=ev(`(()=>{
    const call=tfCall(0,2).hits, kit="studio", sim=(a,o={})=>tfSimilarity(call,a,{kit,...o});
    const reg=RH_REGISTER.studio, rnd=rhSeeded(5), easy=tfCall(0,0).hits;
    const echo=sim(call.map(h=>({...h})));
    const late=sim(call.map(h=>({...h, step:h.step+.35})));
    const half=sim(call.filter((h,i)=>i%2===0));
    const dbl=sim([...call, ...call.map(h=>({...h, step:h.step+1}))]);
    const halftime=sim(call.map(h=>({...h, step:h.step*2})).filter(h=>h.step<64));
    const sparse=sim(call.filter(h=>h.step%16===0));
    const silence=sim([]);
    const ham=tfSimilarity(easy, [...Array(64)].map((_,i)=>({step:i, pad:Math.floor(rnd()*12), vel:100, flat:true})), {kit});
    const swap=sim(call.map(h=>({...h, pad: reg[h.pad]===0 ? 4 : reg[h.pad]===2 ? 0 : h.pad})));
    const vary=sim(call.map((h,i)=>({...h, step: i%5===0 ? h.step+1 : h.step, pad: i%4===0 ? (h.pad+1)%12 : h.pad})).filter((h,i)=>i%7!==3));
    const bar0=sim(call.filter(h=>h.step<16));
    // accents: a backbeat with its snares accented
    const acc=tfLine("k...S...k...S...|k...S...k...S...|k...S...k...S...|k...S...k...S..."), sa=a=>tfSimilarity(acc,a,{kit});
    const accEcho=sa(acc.map(h=>({...h}))), accFlat=sa(acc.map(h=>({...h, vel:100, flat:true}))),
      accNone=sa(acc.map(h=>({...h, vel:96}))), accWrong=sa(acc.map(h=>({...h, vel: h.pad===0 ? 124 : 96})));
    // the drums that don't matter, and the ones that do: the call's rhythm all on the snare, every drum at
    // once on every eighth without listening, one hit on the hat answered with the whole kit
    const reg0=RH_REGISTER.studio, snare=[0,1,2,3].map(ex=>{ const c=tfCall(0,ex).hits; return tfSimilarity(c, c.map(h=>({...h, pad:1})), {kit}).score; });
    const mash=[];
    for(const [L,ex] of [[0,0],[0,1],[0,2],[0,3],[2,0],[3,5],[4,1],[6,1]]){ const k=tfRivalAt(L).kit, rg=RH_REGISTER[k], ch=[];
      for(let s=0;s<64;s+=2) for(const r of [0,1,2]) ch.push({step:s, pad:rg.indexOf(r), vel:100, flat:true});
      mash.push(tfSimilarity(tfCall(L,ex).hits, ch, {kit:k}).score); }
    const hatKit=tfSimilarity([{step:0,pad:4,vel:96}], [0,1,4].map(p=>({step:0,pad:p,vel:100})), {kit}).score;
    // the boss's two-handed bols (Dha, Dhin) echoed exactly, and with the second hand 50 ms after the first
    const tb=tfCall(3,0).hits, bstep=15/76, spread=Math.max(.25, Math.min(.45, .07/bstep)),
      split=tb.map((h,i)=>({...h, step:h.step+(tb.slice(0,i).some(x=>x.step===h.step) ? .05/bstep : 0)}));
    const dha=tfSimilarity(tb, tb.map(h=>({...h})), {kit:"tabla"}).score,
      splitWide=tfSimilarity(tb, split, {kit:"tabla", spread}).score, splitNarrow=tfSimilarity(tb, split, {kit:"tabla"}).score;
    // GL1TCH's stutters, a third of a sixteenth apart, onto the next drum: kept apart in an exact echo however wide the spread
    const gc=tfCall(2,4).hits, gl=tfSimilarity(gc, gc.map(h=>({...h})), {kit:"cliqhop", spread:.45});
    // accents: on the joystick plate, the keys flat and the stick up for exactly the accented snares; a
    // minichord's own spread of strengths against a call with no accents
    const stick=sa(acc.map(h=>({...h, vel:h.vel>=110 ? 127 : 100, flat:!(h.vel>=110)}))),
      natural=tfSimilarity(easy, easy.map((h,i)=>({...h, vel:[70,95,110,85,100,78][i%6]})), {kit});
    const r=x=>({score:+x.score.toFixed(3), bars:x.bars.map(b=>+b.toFixed(2)), accent:x.accent, offset:+x.offset.toFixed(3), sam:x.sam, n:x.n,
      cm:x.callMatched.filter(Boolean).length, am:x.answerMatched.filter(Boolean).length});
    return {n:call.length, echo:r(echo), late:r(late), half:r(half), dbl:r(dbl), halftime:r(halftime), sparse:r(sparse), silence:r(silence), ham:r(ham), swap:r(swap), vary:r(vary), bar0:r(bar0),
      accEcho:r(accEcho), accFlat:r(accFlat), accNone:r(accNone), accWrong:r(accWrong),
      snare:snare.map(x=>+x.toFixed(3)), mash:mash.map(x=>+x.toFixed(3)), hatKit:+hatKit.toFixed(3), dha:+dha.toFixed(3), splitWide:+splitWide.toFixed(3), splitNarrow:+splitNarrow.toFixed(3),
      gl:r(gl), glN:gc.length, stick:r(stick), natural:r(natural), callAcc:easy.some(h=>h.vel>=110)};
  })()`);
  check("an exact echo: 1, every hit matched, both ways", J.echo.score>=.99 && J.echo.cm===J.n && J.echo.am===J.n, JSON.stringify(J.echo));
  check("the same, a steady third of a sixteenth late: the offset taken off, still an echo", J.late.score>=.99 && near(J.late.offset,.35,.01), JSON.stringify(J.late));
  check("half the hits: lower", J.half.score<.6 && J.half.score>.25, J.half.score);
  check("every hit doubled a sixteenth on (double time): lower", J.dbl.score<.6, J.dbl.score);
  check("stretched to half time: lower still", J.halftime.score<.5, J.halftime.score);
  check("only the downbeats (sparse): low", J.sparse.score<.35, J.sparse.score);
  check("silence: 0", J.silence.score===0 && J.silence.n.answer===0 && J.silence.bars.every(b=>b===0));
  check("random hammering, a hit every sixteenth on any pad: off the page", J.ham.score<.35, J.ham.score);
  check("low and high swapped: partly", J.swap.score>.4 && J.swap.score<.85, J.swap.score);
  check("a fair variation (a hit in five moved, one in four on another drum, one in seven left out): 0.6-0.8", J.vary.score>=.6 && J.vary.score<=.85, J.vary.score);
  check("the call's rhythm all on the snare: answered, not an echo", J.snare.every(x=>x>=.6 && x<.85), J.snare.join());
  check("every drum at once on every eighth, not listening: off the page, CLOSE at most (the boss's dense two-drum bols)", J.mash.every(x=>x<.6) && J.mash.reduce((a,x)=>a+x,0)/J.mash.length<.45, J.mash.join());
  check("one hit on the hat answered with kick, snare and hat at once: a third of the drums right, not an echo", J.hatKit<.6, J.hatKit);
  check("the boss's Dha and Dhin (two drums at once) echoed exactly: 1", J.dha>=.99, J.dha);
  check("the second hand 50 ms after the first: still one stroke, still an echo (as two strokes, far lower)", J.splitWide>=.99 && J.splitNarrow<.85, `${J.splitWide} ${J.splitNarrow}`);
  check("GL1TCH's stutters onto the next drum, a third of a sixteenth apart: kept apart in an echo", J.gl.score>=.99 && J.gl.n.answer===J.gl.n.call && J.gl.am===J.glN, JSON.stringify(J.gl));
  check("bar by bar: only the first bar played", J.bar0.bars[0]>=.99 && J.bar0.bars.slice(1).every(b=>b===0), JSON.stringify(J.bar0.bars));
  check("accents echoed: full marks", J.accEcho.score>=.99 && J.accEcho.accent===1, JSON.stringify(J.accEcho));
  check("the screen's pads (no strength of their own): no accents to judge, still full marks", J.accFlat.accent===null && J.accFlat.score>=.99);
  check("played flat on the minichord: the accents missed, a little lower", J.accNone.score<J.accEcho.score && J.accNone.score>.75, JSON.stringify(J.accNone));
  check("the keys flat and the stick up for the accents: the accents heard, full marks", J.stick.accent===1 && J.stick.score>=.99, JSON.stringify(J.stick));
  check("a minichord's own spread of strengths against a call with no accents: none to judge, full marks", !J.callAcc && J.natural.accent===null && J.natural.score>=.99, JSON.stringify(J.natural));
  check("accented on the wrong hits: lower than none at all", J.accWrong.score<J.accNone.score && J.accWrong.score>.6, JSON.stringify(J.accWrong));
  const R=ev(`[[0,0],[1,3],[.9,3],[.85,3],[.7,5],[.6,5],[.4,5],[.35,5],[.2,5]].map(([s,n])=>tfRate(s,n).name).join()`);
  check("ratings: SILENCE, ECHO!, ANSWERED, CLOSE, OFF THE PAGE", R==="SILENCE,ECHO!,ECHO!,ECHO!,ANSWERED,ANSWERED,CLOSE,CLOSE,OFF THE PAGE", R);
  const D=ev(`[1,.7,0].map(s=>tfDamage(s))`);
  check("the blows: an echo 40 to the rival, 0 back; 70% 23 and 6; silence 28 to the player", JSON.stringify(D)==='[{"foe":40,"me":0},{"foe":23,"me":6},{"foe":0,"me":28}]', JSON.stringify(D));
  const sam=ev(`(()=>{ const c=tfVocab("tabla").calls.find(x=>x.hits.some(h=>h.step===64)).hits; const a=tfSimilarity(c,c.map(h=>({...h})),{kit:"tabla"}), b=tfSimilarity(c,c.filter(h=>h.step<64),{kit:"tabla"}); return [a.sam, b.sam, +a.score.toFixed(3)]; })()`);
  check("sam: an answer landing its last hit on the next cycle's first beat, and not without it", sam[0]===true && sam[1]===false && sam[2]>=.99, JSON.stringify(sam));

  // ---------- the calls ----------
  const V=ev(`(()=>{ const bad=[]; for(const k of ["studio","brushes","cliqhop","tabla"]){ const v=tfVocab(k);
      for(const x of [...(v.bars||[]),...(v.fills||[]),...(v.calls||[])]) if(!x.hits.length || x.hits.some(h=>!(h.step>=0 && h.step<=(v.calls ? 64 : 15.99)) || !(h.pad>=0 && h.pad<=11) || !(h.vel>=30 && h.vel<=127))) bad.push(k); }
    const rock=tfSkel(TF_GROOVES.rock,"KSH").map(h=>"KSRCHOYTULMB"[h.pad]+h.step).join(" ");
    const theka=tfBols(TF_TEENTAL).filter(h=>h.step<8).map(h=>RH_PAD_NAMES.tabla[h.pad]+h.step).join(" ");
    const same=JSON.stringify(tfCall(2,3))===JSON.stringify(tfCall(2,3)), diff=JSON.stringify(tfCall(2,3))!==JSON.stringify(tfCall(2,4));
    return {bad, rock, theka, same, diff, d:[0,1,2,3,4,5,6].map(e=>tfCall(0,e).d).join(), lap:tfCall(4,0).d, lens:[0,1,2,3].map(L=>tfCall(L,0).hits.length)}; })()`);
  check("every rival's bars, fills and cycles: hits on the pads, in their bar", V.bad.length===0, V.bad.join());
  check("the firmware's rock groove, a voice a step: kick, hat, snare, hat, kick, kick, snare, hat", V.rock==="K0 H2 S4 H6 K8 K10 S12 H14", V.rock);
  check("teental's theka in bols: Dha (Na and Ge at once), Dhin (Tin and Ge), a matra a beat", V.theka==="NA0 GE0 TIN4 GE4", V.theka);
  check("a call: the same for the same rival and exchange, another for the next", V.same && V.diff);
  check("harder every other exchange, and a step harder round the roster again", V.d==="1,1,2,2,3,3,3" && V.lap===2, V.d+" lap "+V.lap);
  check("each rival's first call has some hits", V.lens.every(n=>n>=8), V.lens.join());

  // ---------- a bout, on a clock the test drives ----------
  t.connect({firmware:91}); await sleep(200);
  const kits=[], loads=[];
  w.__kits=kits; w.__loads=loads;
  ev("{ const d=rhDevice, l=rhLoad; window.rhDevice=k=>{ __kits.push(k); return d(k); }; window.rhLoad=k=>{ __loads.push(k); return l(k); }; }");
  ev("window.__snd=0; { const s=rhSound; window.rhSound=(...a)=>{ __snd++; return s(...a); }; }");
  ev("window.__T=50; rhClockOverride={now:()=>__T, ctxNow:()=>__T+.1, heard:p=>p/1000, perf:x=>x*1000}");
  // the picture, drawn onto a canvas that keeps each rectangle (its colour, x, y, width, height) and
  // each line of lettering
  const draw=code=>ev(`(()=>{ const rects=[], said=[], px=pxText;
    const g=new Proxy({}, {get:(o,k)=> k==="fillRect" ? (x,y,w,h)=>rects.push([o.fillStyle,x,y,w,h]) : k in o ? o[k] : ()=>({data:[]}), set:(o,k,v)=>{ o[k]=v; return true; }});
    window.pxText=(_,text)=>said.push(text);
    try{ if(!blast.lay) tfLayout(); ${code}; } finally{ window.pxText=px; }
    return {rects, said}; })()`);
  const a=await t.start(0,{speed:2});
  check("level 1: playing against MAX BACKBEAT at 96 BPM, the studio kit's names on the pads", a.phase==="play" && ev("blast.rival.n")==="MAX BACKBEAT" && ev("blast.bpm")===96 && ev("blast.padNames.join()")===ev("RH_PAD_NAMES.studio.join()"));
  check("harp drums on the minichord, in the studio kit", mc.params[343]===1 && mc.params[337]===4 && kits.includes("studio"), kits.join());
  const B0=ev("blast.bout");
  check("a count-in bar from just ahead of the sound clock, then the first call", ev("blast.st")==="count" && near(B0.tc,50.1+.08+.05,1e-6) && near(B0.t0-B0.tc, B0.bar, 1e-9) && near(B0.bar, 2.5, 1e-9));
  const q=ev(`(()=>{ const Q=rhQueue, c=tfCallFor(0).hits; return {clicks:Q.filter(e=>e.voice==="accent"||e.voice==="click").map(e=>+(e.t-blast.bout.tc).toFixed(3)).join(), calls:Q.filter(e=>typeof e.voice==="number").length, want:c.length,
    first:Q.filter(e=>typeof e.voice==="number").every((e,i)=>Math.abs(e.t-(blast.bout.t0+c[i].step*blast.bout.step))<1e-9 && e.voice===c[i].pad && e.kit==="studio"), chick:Q.filter(e=>e.voice==="chick").length}; })()`);
  check("queued: four clicks counting in, the call's every hit at its sixteenth in the rival's kit, a chick on 2 and 4 under all eight bars", q.clicks==="0,0.625,1.25,1.875" && q.calls===q.want && q.first && q.chick===16, JSON.stringify(q));
  ev("__T=blast.bout.t0+.05; tfStep()");
  check("the call", ev("blast.st")==="call" && ev("blast.ex")===0);
  check("a pad struck during the call is heard, not judged", ev("tfHit(1,100,__T)")===null && ev("(blast.answers[0]||[]).length")===0);
  ev("__T=blast.bout.t0+4*blast.bout.bar+.01; tfStep()");
  check("the answer, and the next exchange queued as it begins", ev("blast.st")==="answer" && ev("blast.bout.sched")===1);
  const echo=e=>ev(`(()=>{ const B=blast.bout, as=tfCallStart(${e})+4*B.bar; return tfCallFor(${e}).hits.filter(h=>h.step<=tfEnd()).map(h=>tfHit(h.pad,h.vel,as+h.step*B.step,false)).filter(Boolean).length; })()`);
  const n0=echo(0);
  check("an exact echo, every hit taken into the answer", n0===ev("tfCallFor(0).hits.length"), n0);
  ev("__T=tfCallStart(1)-.06; tfStep()");
  check("not judged till its window has closed (half a sixteenth after the answer's last)", ev("blast.bout.judged")===-1);
  ev("__T=tfCallStart(1)+.2; tfStep()");
  const r0=ev("({rate:blast.result.rate.name, s:blast.result.res.score, foe:blast.hp.foe, me:blast.hp.me, score:blast.score, want:mulPts(1000)})");
  check("judged as the next call starts: ECHO!, a 40-point blow to the rival, none back, 1000 points", r0.rate==="ECHO!" && r0.foe===60 && r0.me===100 && r0.score===r0.want, JSON.stringify(r0));
  check("the blow flies", ev("blast.fly.length")===1 && ev("blast.fly[0].from")==="me");
  ev("__T=tfCallStart(2)+.2; tfStep()");
  check("silence: SILENCE, 28 off the player", ev("blast.result.rate.name")==="SILENCE" && ev("blast.hp.me")===72 && ev("blast.hp.foe")===60);
  { const missed=ev("tfCallFor(1).hits.length");
    let S=draw("tfSheet(g, blast.lay, blast.rival, rhNow(), 0, true)"), n=c=>S.rects.filter(r=>r[0]===c && r[4]===3).length;
    check("the next call's first half bar: the last result holds the whole sheet, its missed hits a dim red, none of the new call yet", ev("blast.st")==="call" && n("#6A2A48")===missed && missed>0 && n("#FF5AA0")===0, JSON.stringify({missed, dim:n("#6A2A48"), pink:n("#FF5AA0")}));
    ev("__T=tfCallStart(2)+9*blast.bout.step; tfStep()");
    const now=ev(`(()=>{ const p=(rhNow()-tfCallStart(2))/blast.bout.step; return tfCallFor(2).hits.filter(h=>h.step<=p && h.vel<110).length; })()`);
    S=draw("tfSheet(g, blast.lay, blast.rival, rhNow(), 0, true)");
    check("then the sheet is the new call's alone, written out from bar 1", ev("blast.st")==="call" && n("#6A2A48")===0 && n("#FF5AA0")===now, JSON.stringify({now, dim:n("#6A2A48"), pink:n("#FF5AA0")})); }
  // the third answered a steady 40 ms late, from the minichord's own strengths
  ev("__T=tfCallStart(2)+4*blast.bout.bar+.01; tfStep()");
  ev(`(()=>{ const B=blast.bout, as=tfCallStart(2)+4*B.bar; tfCallFor(2).hits.forEach(h=>tfHit(h.pad,h.vel,as+h.step*B.step+.04,false)); })()`);
  ev("__T=tfCallStart(3)+.2; tfStep()");
  check("40 ms late throughout: still an echo (the player's own lateness set aside)", ev("blast.result.rate.name")==="ECHO!" && near(ev("blast.result.res.offset"), .04/ev("blast.bout.step"), .01), ev("blast.result.res.score"));
  // the K.O.
  ev("blast.hp.foe=10; blast.shown.foe=10");
  ev("__T=tfCallStart(3)+4*blast.bout.bar+.01; tfStep()"); echo(3);
  const sc0=ev("blast.score");
  ev("__T=tfCallStart(4)+.2; tfStep()");
  { const ko=R=>draw(`tfStage(g, {...blast.lay, W:144, wide:false}, ${R}, rhNow(), 0, true)`).said, wide=draw("tfStage(g, {...blast.lay, W:288, wide:true}, blast.rival, rhNow(), 0, true)").said;
    const max=ko("blast.rival"), ustad=ko("TF_ROSTER[3]"), glitch=ko("TF_ROSTER[2]");
    check("the K.O.'s line over the sheet, on an upright phone's narrowest screen, shortened to fit: MAX BACKBEAT DOWN, GL1TCH-9000 DOWN, USTAD IS DOWN; in full on a wide one",
      ev("blast.st")==="ko" && max.includes("MAX BACKBEAT DOWN") && glitch.includes("GL1TCH-9000 DOWN") && ustad.includes("USTAD IS DOWN") && wide.includes("MAX BACKBEAT IS DOWN"), JSON.stringify([max, glitch, ustad, wide])); }
  check("K.O.: the rival down, the music stopped, a bonus", ev("blast.st")==="ko" && ev("blast.hp.foe")===0 && ev("rhQueue.length")===0 && ev("blast.score")===sc0+ev("mulPts(1000)+mulPts(2000)"), `${ev("blast.st")} ${ev("blast.score")-sc0}`);
  // paused and on again at once (P), at the K.O.: no bout counted back in under it
  const koB=ev("blast.bout");
  ev("jsPause(); jsResume()");
  check("paused and gone on at the K.O.: still the K.O., no bout started under it", ev("blast.st")==="ko" && ev("rhQueue.length")===0 && JSON.stringify(ev("blast.bout"))===JSON.stringify(koB) && ev("blast.phase")==="play");
  kits.length=0;
  await sleep(3300);
  check("then the roster", ev("blast.st")==="roster" && ev("blast.level")===0);
  await sleep(4100);
  check("and the next rival: DONA BOSSA at 120 BPM, a fresh bout, both at full health", ev("blast.rival.n")==="DONA BOSSA" && ev("blast.level")===1 && ev("blast.bpm")===120 && ev("blast.st")==="count" && ev("blast.hp.me")===100 && ev("blast.hp.foe")===100);
  check("in her kit: the minichord's set to brushes, the pads named for it", kits.includes("brushes") && mc.params[337]===5 && ev("blast.padNames.join()")===ev("RH_PAD_NAMES.brushes.join()"), kits.join());
  check("her calls queued in it", ev("rhQueue.filter(e=>typeof e.voice==='number').every(e=>e.kit==='brushes')") && ev("rhQueue.some(e=>typeof e.voice==='number')"));

  // ---------- the drum event path ----------
  const anchor=()=>ev(`(()=>{ const B=blast.bout, p=performance.now()/1000; B.t0=p-4*B.bar-8*B.step; B.judged=-1; B.sched=Math.max(B.sched,1); __T=p; blast.answers={}; blast.st="answer"; blast.ex=0; return p; })()`);
  anchor();
  const mi0=ev("blast.midiIn||0"), s0=ev("__snd");
  mc.handle([0x99,38,110], ev("performance.now()"));
  let h=ev("JSON.stringify((blast.answers[0]||[]).map(x=>[x.pad,x.vel,x.flat,Math.round(x.step)]))");
  check("a pad on the minichord: into the answer at its own time, its own strength, counted as played on the minichord", h==="[[1,110,false,8]]" && ev("blast.midiIn")===mi0+1, h);
  check("and not sounded again by the page (the minichord sounds its own)", ev("__snd")===s0);
  t.key("Digit5"); await sleep(5);
  h=ev("JSON.stringify((blast.answers[0]||[]).slice(1).map(x=>[x.pad,x.vel,x.flat]))");
  check("a key: the pad sounded by the page, in the rival's kit, no strength of its own (flat)", h==="[[4,100,true]]" && ev("__snd")===s0+1 && ev("blast.midiIn")===mi0+1, h);
  mc.params[243]=4; mc.stick={x:0, y:1};
  t.key("Digit6"); await sleep(5);
  mc.stick={x:0, y:-1}; t.key("Digit7"); await sleep(5);
  mc.params[243]=0; mc.stick={x:0, y:0};
  h=ev("JSON.stringify((blast.answers[0]||[]).slice(2).map(x=>[x.pad,x.vel,x.flat]))");
  check("on the joystick plate, the stick held up as a pad's struck: an accent; held down: a ghost", h==="[[5,127,false],[6,40,false]]", h);

  // ---------- the page hidden, and back ----------
  ev("if(piano.ctx && !piano.ctx.suspend) piano.ctx.suspend=()=>Promise.resolve()");
  Object.defineProperty(d, "hidden", {value:true, configurable:true}); d.dispatchEvent(new w.Event("visibilitychange"));
  check("the page hidden: the music stops, the bout waits", ev("blast.st")==="halt" && ev("rhQueue.length")===0 && ev("blast.halted.ex")===0);
  ev("tfStep()");
  check("and stays waiting while it's hidden", ev("blast.st")==="halt");
  Object.defineProperty(d, "hidden", {value:false, configurable:true}); d.dispatchEvent(new w.Event("visibilitychange"));
  ev("__T=200; tfStep()");
  check("back: a fresh count-in into the same exchange's call, the half-played answer forgotten", ev("blast.st")==="count" && ev("blast.bout.first")===0 && ev("JSON.stringify(blast.answers)")==="{}" && ev("rhQueue.filter(e=>e.voice==='accent').length")===1);
  // paused in a later exchange's call, and on again: counted in to that exchange, not taken for the answer before it
  ev("__T=tfCallStart(1)+.2; tfStep(); tfHalt()");
  check("paused in the second exchange's call: waiting to start again from it", ev("blast.st")==="halt" && ev("blast.halted.ex")===1);
  ev("__T=300; tfStep()");
  const cnt=[]; for(const f of [.05,.5,.95]){ ev(`__T=blast.bout.tc+${f}*blast.bout.bar; tfStep()`); cnt.push(ev("blast.st")+(ev("tfHit(1,100,__T)")===null ? "" : "+hit")); }
  check("on again: the whole count-in bar a count-in (its numbers shown), no answer taken in it", cnt.every(x=>x==="count") && ev("blast.bout.first")===1, cnt.join());
  ev("__T=tfCallStart(1)+.05; tfStep()");
  check("then the second exchange's call", ev("blast.st")==="call" && ev("blast.ex")===1);

  // ---------- the boss, and sam ----------
  loads.length=0; kits.length=0;
  ev("beginFours(3)");
  check("the boss: USTAD TEENTAL on tabla, its recordings fetched, the minichord's tabla kit", ev("blast.rival.boss")===true && loads.includes("tabla") && kits.includes("tabla") && mc.params[337]===8 && ev("blast.padNames[0]")==="DUM", loads.join()+" "+kits.join());
  check("a soft tick on sam under each cycle", ev("rhQueue.filter(e=>e.voice==='click' && e.vel<60).length")===2);
  ev("blast.calls[0]=tfCall(3,5)");
  check("its hardest calls end in a tihai, landing on the next sam", ev("tfCallFor(0).hits.some(h=>h.step===64)"));
  ev("__T=blast.bout.t0+4*blast.bout.bar+.01; tfStep()"); echo(0);
  ev("__T=tfCallStart(1)+.25; tfStep()");
  const bs=ev("({sam:blast.result.sam, foe:blast.hp.foe, pts:blast.result.pts, want:mulPts(4000)+mulPts(2000)})");
  check("an answer landing on sam: the bonus, and a heavier blow", bs.sam===true && bs.foe===100-48 && bs.pts===bs.want, JSON.stringify(bs));
  { const S=draw("tfSheet(g, blast.lay, blast.rival, rhNow(), 0, true)"), x=ev("tfBarAt(3).x+blast.lay.barW+2"), at=c=>S.rects.some(r=>r[0]===c && r[1]===x && r[4]===3);
    check("the hit on sam, the call's and the answer's, drawn in sam's own column past the fourth bar", at("#FFD35A") && at("#FFFFFF") && !S.rects.some(r=>r[1]===x-2 && r[4]===3), JSON.stringify(S.rects.filter(r=>r[4]===3 && r[1]>=x-3))); }
  // a lone hit on sam, the rest of the answer missing: no bonus for it
  ev("__T=tfCallStart(1)+4*blast.bout.bar+.01; tfStep(); tfHit(0,100,tfCallStart(1)+4*blast.bout.bar+64*blast.bout.step,false)");

  // ---------- K.O.'d: game over ----------
  ev("blast.hp.me=5; blast.shown.me=5; __T=tfCallStart(2)+.25; tfStep()");
  check("a lone hit on sam: on it, but no answer, so no bonus", ev("blast.result.res.sam")===true && ev("blast.result.sam")===false && ev("blast.result.pts")===0, JSON.stringify(ev("({sam:blast.result.sam, s:blast.result.res.score, pts:blast.result.pts})")));
  check("the player K.O.'d", ev("blast.st")==="lost" && ev("blast.hp.me")===0 && ev("rhQueue.length")===0);
  await sleep(3700);
  check("game over: the score kept, the title's game over screen", ev("blast.phase")==="over" && /GAME OVER/.test(t.overlay()?.textContent||"") && ev("saved.best.fours")===ev("blast.score"));

  // ---------- the screen's pads ----------
  ev("rhClockOverride=null");
  ev("touchMinichord(true)"); await sleep(150);
  ev("rhClockOverride={now:()=>__T, ctxNow:()=>__T+.1, heard:p=>p/1000, perf:x=>x*1000}");
  ev("beginFours(0)"); await sleep(30);
  check("the screen's minichord: harp drums on", mc.virtual===true && mc.params[343]===1);
  const pad=i=>d.querySelector(`#tdeck .tdpads span[data-i="${i}"]`);
  check("the deck's pads named for the rival's kit", pad(0) && pad(0).textContent==="KICK" && pad(11).textContent==="BELL", pad(0) && pad(0).textContent);
  anchor();
  const s1=ev("__snd"), m1=ev("blast.midiIn||0");
  const e=new w.MouseEvent("pointerdown", {clientX:0, clientY:0, bubbles:true, cancelable:true});
  Object.defineProperty(e, "pointerId", {value:9}); Object.defineProperty(e, "pointerType", {value:"touch"}); Object.defineProperty(e, "timeStamp", {value:ev("performance.now()")});
  pad(7).dispatchEvent(e); await sleep(5);
  h=ev("JSON.stringify((blast.answers[0]||[]).map(x=>[x.pad,x.flat,Math.round(x.step)]))");
  check("a finger on a pad: into the answer at the touch's time, sounded by the page, not counted as the minichord", h==="[[7,true,8]]" && ev("__snd")===s1+1 && ev("blast.midiIn||0")===m1, h);
  ev("saved.beginner=true; helperSync()"); await sleep(30);
  const help0=ev("blast.helpHarp && blast.helpHarp.cells[0] && blast.helpHarp.cells[0].textContent");
  ev("tfSetRival(2)"); await sleep(400);
  check("the next rival renames the pads (GL1TCH-9000's cliqhop)", pad(0) && pad(0).textContent==="THUD", pad(0) && pad(0).textContent);
  const help1=ev("blast.helpHarp && blast.helpHarp.cells[0] && blast.helpHarp.cells[0].textContent");
  check("and the beginner's PADS strip with them", help0==="KICK" && help1==="THUD", `${help0} ${help1}`);
  ev("saved.beginner=false; helperSync()");

  // ---------- the demo ----------
  ev("rhStop(); tfMenu()"); await sleep(30);
  ev("__T=500; tfDemo()"); await sleep(30);
  check("the demo: a bout with MAX BACKBEAT, a caption", ev("blast.phase")==="demo" && ev("blast.rival.n")==="MAX BACKBEAT" && !!ev("blast.bout") && /MAX BACKBEAT/.test(d.querySelector(".field .demo .democap")?.textContent||""));
  ev("__T=blast.bout.t0+.1; tfStep()");
  check("its call, captioned", ev("blast.st")==="call" && d.querySelector(".field .demo .demotitle")?.textContent==="THE CALL");
  ev("__T=blast.bout.t0+4*blast.bout.bar+.3; tfStep()");
  const lit=ev("blast.helpString");
  check("the autopilot answers, lighting the pads it strikes", ev("blast.st")==="answer" && ev("(blast.answers[0]||[]).length")>0 && Number.isInteger(lit) && lit>=0, lit);
  ev("__T=tfCallStart(1)+.25; tfStep()");
  check("a near-echo: rated ANSWERED or better, the rival hit", ev("blast.result.res.score")>=.6 && ev("blast.hp.foe")<100, ev("blast.result.res.score"));
  ev("__T=tfCallStart(1)+4*blast.bout.bar+.2; tfStep(); __T=tfCallStart(2)+.25; tfStep()");
  check("a second exchange", ev("blast.result.e")===1);
  ev("__T=tfCallStart(2)+4.5; tfStep()");
  check("and it ends: the title back, the music stopped", ev("blast.phase")==="menu" && !ev("blast.overlay.hidden") && !d.querySelector(".field .demo") && ev("rhQueue.length")===0);
  ev("__T=900; tfDemo()"); await sleep(30);
  mc.dispatchEvent(new w.CustomEvent("drum",{detail:{note:36, vel:100, pad:0, t:ev("performance.now()"), source:"touch"}}));
  check("a pad struck in the demo ends it", ev("blast.phase")==="menu" && !d.querySelector(".field .demo"));
  // the attract demo begun in a hidden tab, before it has a bout: it starts when the tab's shown
  Object.defineProperty(d, "hidden", {value:true, configurable:true});
  ev("__T=1000; tfDemo()"); await sleep(30);
  check("the demo begun hidden: waiting, no bout yet", ev("blast.phase")==="demo" && ev("blast.st")==="halt" && ev("blast.bout")===null);
  Object.defineProperty(d, "hidden", {value:false, configurable:true}); d.dispatchEvent(new w.Event("visibilitychange"));
  ev("tfStep()");
  check("shown: its bout made, counting in", ev("blast.phase")==="demo" && ev("blast.st")==="count" && !!ev("blast.bout") && !ev("blast.halted"));
  ev("endTfDemo(blast.demo)");
  ev("rhClockOverride=null");
  done();
})();
