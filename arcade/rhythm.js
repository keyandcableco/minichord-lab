// The rhythm engine the drum games share (Time Pilot, Trading Fours): the clock as heard, a scheduler
// that puts each drum and click at its exact moment on the audio clock, the drum kits themselves, the
// minichord set up as drum pads, and the keyboard as pads when there's no minichord to play.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the clock as heard ----------
// Everything here is placed on the piano's audio clock (piano.ctx, the arcade's one AudioContext), in
// its seconds, and judged on it AS HEARD: rhHeard(p) is the context time whose sound reaches the
// speaker at performance time p (a MIDI message's, a key's or a finger's timeStamp). A hit stamped p
// is early or late by rhHeard(p) minus its beat's time, with the output's latency already counted.
// The mapping is the looper's (looper/engine.js): the browser's output timestamp gives the offset
// between the two clocks, smoothed, and taken afresh on a jump; until it says, the context's own
// latencies stand in. With no context, or one whose clock never moves (the test harness's), the
// performance clock in seconds is used instead, so the arithmetic is the same. rhClockOverride
// ({heard(p), perf(t), now()}) puts a test in charge of time.
let rhClockOverride=null;
let rhClockA=null, rhClockOf=null, rhOutLat=0;
const rhCtx=()=> (typeof piano!=="undefined" && piano && piano.ctx) || null;
const rhLiveCtx=()=>{ const c=rhCtx(); return c && c.currentTime>0 ? c : null; };   // a context that has started keeping time
function rhTickClock(){
  const ctx=rhLiveCtx(); if(!ctx || rhClockOverride) return;
  if(ctx!==rhClockOf){ rhClockOf=ctx; rhClockA=null; rhOutLat=0; }
  const ts=ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if(ts && ts.contextTime>0 && ts.performanceTime>0){ const a=ts.contextTime-ts.performanceTime/1000;
    rhClockA = rhClockA==null || Math.abs(a-rhClockA)>.05 ? a : rhClockA+(a-rhClockA)*.1; }
  const lat=ctx.currentTime-rhHeard(performance.now());
  if(lat>0 && lat<1) rhOutLat = rhOutLat ? rhOutLat+(lat-rhOutLat)*.1 : lat;
}
/** the context time heard at performance time p (ms) */
function rhHeard(p){
  if(rhClockOverride) return rhClockOverride.heard(p);
  const ctx=rhLiveCtx(); if(!ctx) return p/1000;
  if(rhClockA==null || rhClockOf!==ctx) return ctx.currentTime-(ctx.baseLatency||0)-(ctx.outputLatency||0)+(p-performance.now())/1000;
  return rhClockA+p/1000;
}
/** the performance time (ms) at which context time t is heard */
function rhPerf(t){
  if(rhClockOverride) return rhClockOverride.perf(t);
  const ctx=rhLiveCtx(); if(!ctx) return t*1000;
  if(rhClockA==null || rhClockOf!==ctx) return performance.now()+(t-ctx.currentTime+(ctx.baseLatency||0)+(ctx.outputLatency||0))*1000;
  return (t-rhClockA)*1000;
}
const rhNow=()=> rhClockOverride ? rhClockOverride.now() : rhHeard(performance.now());
// Now on the clock that sounds are started by (the context's currentTime, ahead of the heard clock by
// the output's latency): nothing can be started before it. A run's first beat goes at least rhLead()
// after it, as the looper's does.
function rhCtxNow(){
  if(rhClockOverride) return rhClockOverride.ctxNow ? rhClockOverride.ctxNow() : rhClockOverride.now();
  const ctx=rhLiveCtx(); return ctx ? ctx.currentTime : performance.now()/1000;
}
const rhLead=()=> Math.max(.08, rhOutLat+.05);

// ---------- the scheduler ----------
// rhAt queues a sound at a context time; a pump every 25 ms starts whatever falls in the next 120 ms
// at its own time (an oscillator's or a sample's start(t), never sfx() or the piano, which start
// "now"), and skips what's already past. The pump belongs to the run that started it (as gameLater's
// timers do): a new run, or the game gone, and it stops, and what that run left queued or ringing is
// silenced. rhStop silences everything at once: what hasn't started never does, what's ringing fades
// in 6 ms. Each queued sound remembers its run, so a stale one is dropped rather than played.
const RH_AHEAD=.12, RH_EVERY=25;
let rhQueue=[];                 // waiting to be placed: {t, voice, vel, kit, b, g}
let rhLive=[];                  // placed, until they've ended: {voice, kit, start, stop, vg, amp, srcs, group, b, g}
let rhPumpT=0;
const rhStats={placed:0, skipped:0};
const rhBlast=()=> typeof blast!=="undefined" ? blast : null;
const rhIsNow=(b,g)=> b===rhBlast() && (!b || b.gen===g);    // still the run that b and g were
function rhAt(t, voice, vel=100, kit="studio"){ const b=rhBlast(); rhQueue.push({t, voice, vel, kit, b, g:b && b.gen}); }
function rhStart(){
  rhKeysOn(); rhTickClock(); clearInterval(rhPumpT);
  const b=rhBlast(), g=b && b.gen;
  const id=setInterval(()=>{
    if(b && rhIsNow(b,g)){ rhPump(); return; }
    clearInterval(id); if(rhPumpT===id) rhPumpT=0;
    rhSilence(x=>!rhIsNow(x.b, x.g)); rhQueue=rhQueue.filter(e=>rhIsNow(e.b, e.g));   // that run's sounds, not a newer one's
  }, RH_EVERY);
  rhPumpT=id; rhPump();
}
function rhPump(){
  rhTickClock();
  const now=rhCtxNow(), till=now+RH_AHEAD, keep=[];
  rhLive=rhLive.filter(x=>x.stop>now);
  for(const e of rhQueue){
    if(!rhIsNow(e.b, e.g)){ rhStats.skipped++; continue; }   // left from an earlier run
    if(e.t>=till){ keep.push(e); continue; }
    if(e.t<now){ rhStats.skipped++; continue; }             // already past: never late
    rhStats.placed++; rhSound(e.voice, e.vel, e.kit, e.t, e);
  }
  rhQueue=keep;
}
function rhStop(){ rhQueue=[]; rhSilence(()=>true); }
function rhSilence(which){
  const ctx=rhCtx(), now=ctx ? ctx.currentTime : 0;
  rhLive=rhLive.filter(x=>{ if(!which(x)) return true;
    try{
      if(x.start>=now){ x.srcs.forEach(s=>s.stop()); return false; }     // not begun: it never will
      const p=x.vg.gain; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now+.006);
      x.srcs.forEach(s=>s.stop(now+.01));
    }catch(e){}
    return false; });
}

// ---------- the kits ----------
// One output bus, straight to the speaker: not through the piano's compressor, which holds the sound
// back 6 ms, nor behind the SOUND button, which mutes effects; this is the music the games are
// played to. Every drum is made on the spot from oscillators and a little noise (a clean, short,
// punchy sound), except the tabla's strokes, recorded (samples/tabla, CC0), which stand in made ones
// until they've loaded or if they can't. Each kit is the minichord's of that name, by role, string
// for string (the firmware's generator/drums.py, Ben Poilvé's minichord firmware, BSD-3): the low
// string a kick, then snare, rim, clap, closed and open hat, cymbal, low and high tom, low and high
// conga, bell; the thirteenth, the shaker, no string plays.
let rhBus=null, rhBusOf=null, rhNoiseBuf=null, rhDustBuf=null, rhClickBuf=null;
function rhOut(ctx){
  if(rhBus && rhBusOf===ctx) return rhBus;
  rhBus=ctx.createGain(); rhBus.gain.value=.4; rhBus.connect(ctx.destination); rhBusOf=ctx;
  const n=Math.round(ctx.sampleRate*2);
  rhNoiseBuf=ctx.createBuffer(1,n,ctx.sampleRate); { const d=rhNoiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  // dust: sparse crackles, about 3000 a second, for cliqhop's crackle
  rhDustBuf=ctx.createBuffer(1,n,ctx.sampleRate); { const d=rhDustBuf.getChannelData(0); for(let i=0;i<d.length;i++) if(Math.random()<3000/ctx.sampleRate) d[i]=(Math.random()<.5?-1:1)*(.3+.7*Math.random()); }
  // a click: one sample, and its echo, for cliqhop's click, tick and ping
  rhClickBuf=ctx.createBuffer(1,64,ctx.sampleRate); { const d=rhClickBuf.getChannelData(0); d[0]=1; d[1]=-.6; d[2]=.2; }
  return rhBus;
}
// The makings of a sound at context time t, into the voice's own gain: a tone that glides and fades,
// filtered noise, an FM tone, a metal cluster (square waves at a cymbal's inharmonic ratios), and a
// recorded buffer. Times are from t; a is the attack, d the decay to silence.
function rhTools(ctx, t, out, rec){
  const keep=n=>{ rec.srcs.push(n); return n; }, upto=e=>{ if(e>rec.stop) rec.stop=e; };
  const env=(g, at, a, peak, d)=>{ const p=g.gain; p.setValueAtTime(0, t+at); p.linearRampToValueAtTime(peak, t+at+a); p.exponentialRampToValueAtTime(.0001, t+at+a+d); };
  const tone=(type, f0, f1, glide, a, d, vol, at=0, dest=out)=>{
    const o=keep(ctx.createOscillator()), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f0, t+at);
    if(f1 && f1!==f0) o.frequency.exponentialRampToValueAtTime(f1, t+at+glide);
    env(g, at, a, vol, d); o.connect(g).connect(dest); o.start(t+at); o.stop(t+at+a+d+.02); upto(t+at+a+d+.02); return o; };
  const noise=(a, d, vol, type, f0, f1, Q=.7, at=0, buf=rhNoiseBuf, dest=out)=>{
    // white noise loops, from anywhere in it; the dust and the click play once, from their start
    const n=keep(ctx.createBufferSource()), f=ctx.createBiquadFilter(), g=ctx.createGain(), white=buf===rhNoiseBuf; n.buffer=buf; n.loop=white;
    f.type=type; f.Q.value=Q; f.frequency.setValueAtTime(f0, t+at); if(f1 && f1!==f0) f.frequency.exponentialRampToValueAtTime(f1, t+at+a+d);
    env(g, at, a, vol, d); n.connect(f).connect(g).connect(dest); n.start(t+at, white ? Math.random()*1.5 : buf===rhDustBuf ? Math.random()*.8 : 0); n.stop(t+at+a+d+.02); upto(t+at+a+d+.02); };
  const fm=(f, ratio, index, idur, a, d, vol, at=0, dest=out)=>{
    const c=keep(ctx.createOscillator()), m=keep(ctx.createOscillator()), mg=ctx.createGain(), g=ctx.createGain();
    c.frequency.setValueAtTime(f, t+at); m.frequency.setValueAtTime(f*ratio, t+at);
    mg.gain.setValueAtTime(f*index, t+at); mg.gain.exponentialRampToValueAtTime(Math.max(.5, f*index*.002), t+at+idur);
    m.connect(mg).connect(c.frequency); env(g, at, a, vol, d); c.connect(g).connect(dest);
    for(const o of [c,m]){ o.start(t+at); o.stop(t+at+a+d+.02); } upto(t+at+a+d+.02); };
  const filter=(type, f, Q=.7, dest=out)=>{ const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=Q; b.connect(dest); return b; };
  // the 808's six square waves at a cymbal's ratios, through a high pass
  const metal=(base, a, d, vol, hp, at=0, dest=out)=>{ const f=filter("highpass", hp, .7, dest);
    for(const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) tone("square", base*r, 0, 0, a, d, vol/6, at, f); };
  const sample=(buf, off, dur, vol, rate=1, at=0)=>{
    const s=keep(ctx.createBufferSource()), g=ctx.createGain(); s.buffer=buf; s.playbackRate.value=rate; g.gain.value=vol;
    s.connect(g).connect(out); s.start(t+at, off); s.stop(t+at+dur/rate+.02); upto(t+at+dur/rate+.02); };
  return {tone, noise, fm, filter, metal, sample, dust:()=>rhDustBuf, click:()=>rhClickBuf, t};
}
const rhPick=a=>a[Math.floor(Math.random()*a.length)];
// The voices, a kit a list, a string an entry (and the shaker last): k is the kit of makings above.
// Levels balance each kit's voices against each other by ear and by measure (the loudness of each
// rendered); velocity scales them after.
const RH_VOICES={
  studio:[
    k=>{ k.tone("sine",160,50,.07,.002,.38,1); k.tone("triangle",95,50,.05,.002,.12,.35); k.noise(.0005,.012,.45,"highpass",3000,3000); },  // kick: a pitch drop and a beater click
    k=>{ k.tone("triangle",220,175,.03,.001,.11,.55); k.tone("sine",330,280,.03,.001,.06,.25);                                     // snare: the shell, and the wires
         k.noise(.001,.19,.6,"highpass",1800,1300); k.noise(.001,.12,.35,"bandpass",4500,3500,.8); },
    k=>{ k.tone("triangle",1700,1500,.02,.0005,.035,.45); k.tone("sine",440,420,.02,.0005,.03,.35); k.noise(.0005,.02,.4,"bandpass",3200,3200,3); },   // rim: a side stick
    k=>{ [0,.009,.018].forEach(at=>k.noise(.001,.008,1,"bandpass",1150,1150,1.1,at)); k.noise(.001,.2,.9,"bandpass",1150,1000,1.1,.027); },           // clap: three slaps and a tail
    k=>{ k.metal(205,.0005,.045,.5,7000); k.noise(.0005,.04,.25,"highpass",8000,8000); },                                       // closed hat
    k=>{ k.metal(205,.001,.42,.45,7000); k.noise(.001,.4,.22,"highpass",8000,7000); },                                          // open hat
    k=>{ k.metal(180,.001,1.5,.45,4500); k.noise(.001,1.7,.35,"highpass",5000,3500); k.noise(.001,.6,.2,"bandpass",8000,6000,1); },   // crash
    k=>{ k.tone("sine",125,82,.14,.002,.45,.85); k.noise(.0005,.02,.25,"lowpass",2500,1500); },                                 // low tom
    k=>{ k.tone("sine",185,130,.11,.002,.38,.8); k.noise(.0005,.02,.25,"lowpass",3000,1800); },                                 // high tom
    k=>{ k.tone("sine",235,200,.02,.001,.26,.7); k.tone("sine",470,400,.02,.001,.05,.12); k.noise(.0005,.012,.25,"bandpass",2000,2000,1); },   // low conga
    k=>{ k.tone("sine",345,300,.015,.001,.2,.65); k.tone("sine",690,600,.015,.001,.04,.12); k.noise(.0005,.012,.25,"bandpass",2500,2500,1); }, // high conga
    k=>{ const b=k.filter("bandpass",1100,1.2); k.tone("square",562,0,0,.001,.3,.32,0,b); k.tone("square",845,0,0,.001,.3,.32,0,b); },          // cowbell
    k=>{ k.noise(.012,.06,.4,"highpass",6500,6500); },                                                                          // shaker
  ],
  // brushes: soft, round, swishy; a brushed snare, a cross-stick, a ride
  brushes:[
    k=>{ k.tone("sine",100,52,.06,.003,.3,.8); k.noise(.002,.03,.15,"lowpass",300,200); },
    k=>{ k.noise(.004,.26,.5,"bandpass",3500,2800,.6); k.noise(.002,.12,.18,"highpass",6000,6000); k.tone("sine",200,180,.03,.002,.06,.12); },
    k=>{ k.tone("triangle",1500,1350,.03,.0005,.04,.45); k.tone("sine",520,480,.03,.0005,.035,.3); k.noise(.0005,.015,.3,"bandpass",2500,2500,2); },   // cross-stick
    k=>{ k.noise(.07,.22,.4,"bandpass",1800,4200,.8); },                                                                        // a sweep of the brush
    k=>{ k.noise(.001,.04,.22,"highpass",6000,6000); k.noise(.001,.03,.1,"bandpass",9000,9000,1); },
    k=>{ k.noise(.002,.3,.2,"highpass",6000,5000); k.metal(240,.002,.3,.12,7000); },
    k=>{ k.tone("sine",3150,0,0,.001,1.1,.06); k.tone("sine",4650,0,0,.001,.9,.05); k.noise(.001,.9,.22,"bandpass",5000,4500,1.5); },   // ride
    k=>{ k.tone("sine",110,85,.08,.004,.3,.7); k.noise(.002,.03,.1,"lowpass",900,600); },                                       // felt toms
    k=>{ k.tone("sine",165,130,.08,.004,.26,.65); k.noise(.002,.03,.1,"lowpass",1200,800); },
    k=>{ k.tone("sine",225,196,.02,.003,.26,.6); k.noise(.002,.015,.12,"bandpass",1800,1800,1); },
    k=>{ k.tone("sine",330,294,.015,.003,.2,.55); k.noise(.002,.015,.12,"bandpass",2200,2200,1); },
    k=>{ k.tone("sine",880,0,0,.001,.4,.18); k.tone("sine",1320,0,0,.001,.3,.12); },                                            // a small bell
    k=>{ k.noise(.02,.09,.32,"highpass",5000,5000); },
  ],
  // cliqhop: blips, clicks and crackle, a laptop's drums
  cliqhop:[
    k=>{ k.tone("sine",288,48,.004,.001,.17,1); k.noise(.0003,.003,.5,"highpass",4000,4000); },                                 // thud, a click on top
    k=>{ k.fm(495,2.71,7,.018,.001,.06,.4); k.tone("sine",495,330,.008,.001,.05,.15); k.noise(.001,.055,.5,"highpass",3500,3500); },   // snap: an FM chirp and a hiss
    k=>{ k.noise(.0001,.004,.9,"highpass",6000,6000,.7,0,k.click()); k.noise(.0002,.003,.8,"highpass",3000,3000); },            // click: a sample's worth, and a crack
    k=>{ for(let i=0;i<6;i++) k.noise(.0005,.009,.9*.82**i,"bandpass",2400,2400,1,i*.0087); },                                  // zipper: six bursts, fading
    k=>{ k.tone("sine",9500,0,0,.0003,.03,.3); k.noise(.0001,.004,.6,"highpass",6000,6000,.7,0,k.click()); },                    // tick: a click rung high
    k=>{ const lp=k.filter("lowpass",5000); [880,1320,1980].forEach((f,i)=>k.tone("square",f,0,0,.001,.03,.16*.8**i,i*.0116,lp)); },   // arpeggio: up a fifth, and again
    k=>{ k.fm(1046,3.5,3,.6,.002,1.6,.12); k.noise(.002,1.1,.6,"highpass",2500,2500,.7,0,k.dust()); },                          // crackle over an FM bell
    k=>{ k.tone("sine",150,440,.07,.003,.16,.6); },                                                                             // a rising bloop
    k=>{ const lp=k.filter("lowpass",4000); k.tone("square",990,660,.006,.001,.055,.22,0,lp); },                                // a falling bip
    k=>{ const f=523*rhPick([1,2,1.5]); k.tone("sine",f,0,0,.001,.9,.3); k.tone("sine",f*2,0,0,.001,.08,.06); },               // pings, on a root, its octave or fifth
    k=>{ const f=1046*rhPick([1,2,1.5,.5,3]); k.tone("sine",f,0,0,.001,.7,.24); k.noise(.0001,.004,.3,"highpass",5000,5000,.7,0,k.click()); },
    k=>{ k.fm(1046*rhPick([1,1.5,.5,2,.75]),1,3,.025,.001,.08,.3); },                                                           // bleep: an FM blip
    k=>{ k.noise(.002,.045,.6,"bandpass",5000,5000,1,0,k.dust()); },                                                            // dust
  ],
  // the tabla: a doumbek's dum, tek and ka on the first three strings, then the recorded strokes (these
  // made ones stand in until they've loaded): the bayan's Ke, Ge and Ge bent, the dayan's Te, Tin, Na
  // open, Tun, Ne, Na, and Re
  tabla:[
    k=>{ k.tone("sine",110,95,.025,.002,.42,.95); k.noise(.001,.03,.12,"lowpass",800,500); },                                    // dum
    k=>{ k.tone("sine",640,620,.02,.001,.11,.4); k.noise(.001,.045,.4,"bandpass",4000,4000,2.5); },                               // tek
    k=>{ k.tone("sine",900,0,0,.001,.025,.35); k.noise(.0005,.02,.35,"bandpass",2500,2500,2); },                                  // ka
    k=>{ k.noise(.001,.05,.5,"lowpass",900,500); k.tone("sine",120,100,.03,.001,.04,.3); },                                       // Ke
    k=>{ k.noise(.0005,.05,.35,"bandpass",1800,1500,1.5); k.tone("sine",278,0,0,.001,.05,.25); },                                // Te
    k=>{ k.tone("sine",556,0,0,.001,.8,.3); k.tone("sine",834,0,0,.001,.5,.15); k.noise(.0005,.01,.2,"bandpass",3000,3000,2); },  // Tin
    k=>{ k.tone("sine",556,0,0,.001,1.2,.32); k.tone("sine",1112,0,0,.001,.3,.12); k.noise(.0005,.01,.3,"highpass",3000,3000); },  // Na open
    k=>{ k.tone("sine",278,0,0,.002,1.3,.45); k.tone("sine",556,0,0,.002,.2,.08); },                                             // Tun
    k=>{ k.tone("sine",278,0,0,.001,.12,.3); k.noise(.0005,.03,.2,"bandpass",2000,2000,1.5); },                                   // Ne
    k=>{ k.tone("sine",88,93,.05,.003,1.1,.8); },                                                                                // Ge
    k=>{ k.tone("sine",556,0,0,.001,.25,.3); k.tone("sine",1112,0,0,.001,.12,.12); k.noise(.0005,.01,.3,"highpass",3000,3000); },  // Na
    k=>{ k.tone("sine",100,137,.25,.003,1,.8); },                                                                                // Ge bent
    k=>{ k.noise(.002,.06,.3,"bandpass",2000,1800,1.5); },                                                                      // Re
  ],
};
// the time-keepers, the same in every kit: the metronome's click (a woodblock's knock, higher on the
// bar's first beat), and a quiet hi-hat foot, the "chick" a drummer keeps time with
const RH_METRO={
  click:k=>{ k.tone("sine",1000,820,.04,.0005,.045,.5); k.tone("triangle",2400,0,0,.0005,.012,.12); k.noise(.0003,.006,.25,"bandpass",3000,3000,2); },
  accent:k=>{ k.tone("sine",1500,1230,.04,.0005,.05,.62); k.tone("triangle",3300,0,0,.0005,.014,.14); k.noise(.0003,.006,.3,"bandpass",4000,4000,2); },
  chick:k=>{ k.noise(.004,.035,.2,"bandpass",6500,6500,.9); k.noise(.002,.02,.08,"highpass",9000,9000); },
};
// Each voice's level in dB, set by measure: each rendered offline and its loudness taken (K-weighted,
// the loudest 30 ms), then brought to its place in a kit: kick and snare on top, toms and congas just
// under, the cymbals and claps under those, hats and shakers well down; the click as clear as a snare,
// the chick quiet (cliqhop's click a little under its place: one sample, it peaks far above its
// loudness). The tabla's are its made stand-ins' (the recordings set their own, below).
const RH_TRIM={
  studio: [-.5,3,6.5,11.5,8,4.5,1,0,0,.5,1,2.5,-2],
  brushes:[0,5,6,6.5,6,2,4.5,-.5,-.5,0,.5,3,-3],
  cliqhop:[1.5,6,9.5,12,9.5,10.5,1,2,9.5,1,2,7,17],
  tabla:  [-2,6,11,12.5,12.5,2.5,1.5,-1.5,7,-5,5,-5.5,18],
  click:8, accent:7.5, chick:7.5};
// strokes that stop each other ringing, as a hand's next stroke does: the hats in the drum kits; the
// dayan's strokes, and the bayan's, on the tabla
const RH_CHOKE={studio:{4:1,5:1}, brushes:{4:1,5:1}, tabla:{3:3,4:2,5:2,6:2,7:2,8:2,9:3,10:2,11:3,12:2}};
// velocity to loudness: 30 a whisper, 56 a ghost, 96 a hit, 124 an accent
const rhAmp=vel=>.12+.88*Math.pow(Math.max(0,Math.min(127,vel))/127,1.6);
/** play a drum now, or at context time t: voice a string 0-11 (12 the shaker), or "click", "accent", "chick" */
function rhSound(voice, vel=100, kit="studio", t, from){
  const ctx=rhCtx(); if(!ctx) return null;
  if(ctx.state==="suspended" && ctx.resume && !document.hidden) ctx.resume().catch(()=>{});   // asleep after a quiet spell; not while the page is hidden, when it's put to sleep on purpose
  kit=RH_VOICES[kit] ? kit : "studio";
  const make=RH_METRO[voice] || RH_VOICES[kit][voice]; if(!make) return null;
  if(t==null || t<ctx.currentTime) t=ctx.currentTime;
  try{
    const own=kit==="tabla" && rhTablaReady(ctx) && rhTabla.bufs[voice];
    const trim=own ? 0 : RH_METRO[voice] ? RH_TRIM[voice] : RH_TRIM[kit][voice]||0;
    const bus=rhOut(ctx), vg=ctx.createGain(), amp=rhAmp(vel)*10**(trim/20); vg.gain.value=amp; vg.connect(bus);
    const group=(RH_CHOKE[kit]||{})[voice]||0;
    const rec={voice, kit, start:t, stop:t, vg, amp, srcs:[], group, b:from ? from.b : rhBlast(), g:from ? from.g : rhBlast() && rhBlast().gen};
    if(group) for(const x of rhLive) if(x.kit===kit && x.group===group && x.start<t && x.stop>t){   // a stroke in the same hand stops the last
      try{ const p=x.vg.gain; p.setValueAtTime(x.amp, t); p.linearRampToValueAtTime(0, t+.004); x.srcs.forEach(s=>s.stop(t+.006)); x.stop=t+.006; }catch(e){} }
    const k=rhTools(ctx, t, vg, rec);
    if(own) k.sample(own.buf, own.off, own.dur, own.gain); else make(k);
    if(kit==="tabla" && !rhTablaReady(ctx) && performance.now()-rhTabla.failed>10000) rhLoad("tabla");   // the recordings, for next time
    rhLive.push(rec); return rec;
  }catch(e){ return null; }                                     // a browser (or a test's stand-in) without some node
}

// ---------- the tabla's recorded strokes ----------
// The same strokes the minichord's tabla kit plays (firmware 61 on), from the same recordings (Marius
// Miron's, Freesound pack 8162, CC0, by way of Sonic Pi): string by string, Ke, Te, Tin, Na open, Tun,
// Ne, Ge, Na, Ge bent, and Re. Each is started at its onset (the first sample over 1% of its peak) so
// it lands on the beat, and set to a common loudness (its first 60 ms), then to its place in the kit.
const RH_TABLA_FILES={3:"ke1", 4:"te1", 5:"tas1", 6:"na_o", 7:"tun2", 8:"te_ne", 9:"ghe5", 10:"na", 11:"ghe4", 12:"re"};
const RH_TABLA_LEVEL={3:.95, 4:.8, 5:.85, 6:.9, 7:1.07, 8:.84, 9:1.1, 10:.9, 11:1.1, 12:.5};
const rhTabla={bytes:null, ctx:null, decoding:null, bufs:{}, failed:-1e9};
const rhTablaReady=ctx=> rhTabla.ctx===ctx && Object.keys(rhTabla.bufs).length>0;
/** fetch and decode what a kit needs (only the tabla needs anything); resolves either way, true if it's ready */
function rhLoad(kit){
  if(kit!=="tabla") return Promise.resolve(true);
  const ctx=rhCtx();
  if(ctx && rhTabla.decoding && rhTabla.ctx===ctx) return rhTabla.decoding;   // on its way
  if(ctx && rhTablaReady(ctx)) return Promise.resolve(true);
  if(!rhTabla.bytes){
    const got=rhTabla.bytes=Promise.all(Object.entries(RH_TABLA_FILES).map(([v,n])=>fetch(`../samples/tabla/tabla_${n}.flac`)
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(a=>[+v,a])));
    got.catch(()=>{ if(rhTabla.bytes===got){ rhTabla.bytes=null; rhTabla.failed=performance.now(); } });   // failed: the next asking tries again
  }
  if(!ctx) return rhTabla.bytes.then(()=>false, ()=>false);        // no sound yet: fetched now, decoded once there is
  rhTabla.ctx=ctx; rhTabla.bufs={};
  const p=rhTabla.decoding=rhTabla.bytes.then(all=>Promise.all(all.map(([v,a])=>
    new Promise((ok,no)=>{ const r=ctx.decodeAudioData(a.slice(0), ok, no); if(r && r.then) r.then(ok,no); }).then(b=>{ rhTabla.bufs[v]=rhTrim(b, v); }))))
    .then(()=>true, ()=>{ rhTabla.bufs={}; rhTabla.failed=performance.now(); return false; })
    .finally(()=>{ if(rhTabla.decoding===p) rhTabla.decoding=null; });
  return p;
}
// where a recording's sound starts, and how loud to play it
function rhTrim(b, v){
  const d=b.getChannelData(0); let peak=0; for(let i=0;i<d.length;i++) peak=Math.max(peak, Math.abs(d[i]));
  let at=0; while(at<d.length && Math.abs(d[at])<=peak*.01) at++;
  const n=Math.min(d.length-at, Math.round(b.sampleRate*.06)); let sum=0; for(let i=0;i<n;i++) sum+=d[at+i]*d[at+i];
  const rms=n ? Math.sqrt(sum/n) : 0, gain=rms ? Math.max(.15, Math.min(3, .22/rms)) : 1;
  return {buf:b, off:at/b.sampleRate, dur:Math.max(.01, b.duration-at/b.sampleRate), gain:gain*(RH_TABLA_LEVEL[v]||1)};
}

// ---------- the pads' names and registers ----------
// What each string plays in each kit, as the pads are labelled (five letters at most), and where it
// sits: 0 low (kick, low tom, low conga, the tabla's bayan), 1 middle, 2 high (hats, cymbals, bells),
// which is what Trading Fours compares when an answer echoes a call on other drums.
const RH_PAD_NAMES={
  studio: ["KICK","SNARE","RIM","CLAP","HAT","OPEN","CRASH","TOM L","TOM H","CGA L","CGA H","BELL"],
  brushes:["KICK","SNARE","STICK","SWISH","HAT","OPEN","RIDE","TOM L","TOM H","CGA L","CGA H","BELL"],
  cliqhop:["THUD","SNAP","CLICK","ZIP","TICK","ARP","DUST","BLOOP","BIP","PING","PONG","BLEEP"],
  tabla:  ["DUM","TEK","KA","KE","TE","TIN","NAA","TUN","NE","GE","NA","GEE"],
};
const RH_PAD_NAMES_DEFAULT=RH_PAD_NAMES.studio;
const RH_ROLE_REGISTER=[0,1,1,1,2,2,2,0,1,0,1,2,2];
const RH_REGISTER={studio:RH_ROLE_REGISTER, brushes:RH_ROLE_REGISTER, cliqhop:RH_ROLE_REGISTER,
  tabla:[0,1,2,0,1,2,2,1,1,0,2,0,1]};
// the minichord's drum kit (address 337) for each, its number in the firmware's list plus one
const RH_KIT_SETTING={studio:4, brushes:5, tabla:8, cliqhop:12};

// ---------- the minichord as drum pads ----------
// Harp drums (343, the fork's firmware 60 on) makes the twelve strings drum pads, each sending its
// General MIDI drum on channel 10 as it's struck. A drum game asks for it on the port the harp uses
// (drum MIDI out 340 = 2), with nothing else on channel 10 that a pad could be mistaken for: no drums
// of the rhythm mode's own (334), no count-in (341), the rhythm mode itself off; no humanize (339),
// which would soften the pads' velocity at random; the strings in order and struck as touched
// (harpInOrder); the drums loud enough to hear (338); and the game's kit (337), where the firmware has
// it: the recorded tabla from 61 (the world percussion before), cliqhop from 85 (glitch before, which
// is where the firmware's own clamp would land). Those settings are on the minichord's second page,
// which is read after the first; until it's in, this waits, and asks again now and then. The screen's
// minichord only needs to know the strings are pads.
// The joystick plate (harp plate 4): from firmware 91 harp drums makes its strip's places the pads (and
// A, B and the click the kick, snare and closed hat), all set up as above. Firmware 90 has no harp drums
// there: the strip plays its notes whatever 343 says. So the page plays the pads itself (rhFallback):
// the harp chromatic from C, its volume borrowed down to nothing so the notes it still sends are silent,
// and core/minichord.js told (mc.drumFallback) to read the strip's places and the buttons as pads.
const RH_KINDS=["pilot","fours"];
const rhPlate=()=> typeof mc!=="undefined" && !mc.virtual && mc.plate==="joystick";
const rhFallback=()=> rhPlate() && (mc.params[7]??0)<91;
let rhWant=null;                       // the game waiting for the second page, and its kit
function rhKitValue(kit, fw){
  if(kit==="tabla") return fw>=61 ? 8 : 7;
  if(kit==="cliqhop") return fw>=85 ? 12 : 11;
  return RH_KIT_SETTING[kit] || 4;
}
function rhDevice(kit="studio"){
  rhKeysOn();
  if(typeof mc==="undefined" || typeof canWrite!=="function" || !canWrite()) return;
  if(mc.virtual){ ensure(343,1); return; }
  const fw=mc.params[7]??0; if(fw<60) return;
  if(!mc.page1){ rhAwaitPage1(kit); return; }
  rhWant=null;
  if(rhFallback()){
    if(typeof asHarp==="function") asHarp();                                 // the strip chromatic from C: its place is its pad
    ensure(2,0); ensure(334,0); ensure(341,0);                               // its notes silent; no drums of the instrument's own
    mc.drumFallback=true;
    const b=rhBlast(); if(b && !b.rhModeOff){ b.rhModeOff=true; mc.control(8,0); }
    return;
  }
  mc.drumFallback=false;
  if(typeof harpInOrder==="function") harpInOrder();
  ensure(343,1); ensure(340,2); ensure(339,0); ensure(334,0); ensure(341,0);
  const lvl=mc.params[338]; if(!Number.isFinite(lvl) || lvl<30) borrow(338,70);
  ensure(337, rhKitValue(kit, fw));
  const b=rhBlast(); if(b && !b.rhModeOff){ b.rhModeOff=true; if(fw>=45) mc.control(8,0); }   // rhythm mode off, once a game
}
function rhAwaitPage1(kit){
  const b=rhBlast();
  if(rhWant && rhWant.b===b){ rhWant.kit=kit; return; }             // already waiting, for this game
  const want=rhWant={b, kit};
  const ask=()=>{ if(typeof mc.requestPage1==="function") mc.requestPage1(); else mc.control(7,1); };
  const heard=()=>{ mc.removeEventListener("page1", heard); if(rhWant===want && want.b===rhBlast()) rhDevice(want.kit); };
  mc.addEventListener("page1", heard);
  ask();
  // asked again every couple of seconds while this game waits, in case the answer went astray
  const retry=()=>{ if(mc.page1 || rhWant!==want || want.b!==rhBlast()) return; ask(); setTimeout(retry, 2000); };
  setTimeout(retry, 2000);
}
/** whether the minichord's pads are set up as drums (the screen's: harp drums on) */
function rhReady(){
  if(typeof mc==="undefined") return false;
  if(mc.virtual) return mc.params[343]===1;
  if(rhFallback()) return !!mc.page1 && !!mc.drumFallback && mc.params[2]===0;
  return !!mc.page1 && mc.params[343]===1 && mc.params[340]===2;
}
/** why a real minichord can't be drum pads, in a few words, or "" (rhBlocked says whether it's only a note) */
function rhNeeds(){
  if(typeof mc==="undefined" || mc.virtual || !mc.sysex || !mc.out) return "";
  const fw=mc.params[7]; if(!Number.isFinite(fw)) return "";
  if(fw<60) return "NEEDS FIRMWARE 60 FOR HARP DRUMS";
  if(rhFallback()) return "FIRMWARE 91 SOUNDS THE PADS ON THE MINICHORD";      // a note, not a block: the page sounds them
  return "";
}
/** whether the minichord can't be pads at all (the keyboard, then), rather than played with a note */
const rhBlocked=()=> !!rhNeeds() && !rhFallback();

// ---------- the keyboard as pads ----------
// With no minichord to play (or one that can't be pads), the number row is the pads, 1 the kick to =
// the bell, and Space the kick too: each a "drum" event as a pad's would be, timed by the key itself.
// Not with keyboard play on, where the screen's minichord already turns the number row into its
// strings, and so its pads; not while typing; and never F, the full screen's key.
const RH_KEYS=["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"];
const RH_GM=[36,38,37,39,42,46,49,45,50,64,63,56,70];
let rhKeysIn=false;
function rhKeysOn(){ if(rhKeysIn || typeof document==="undefined") return; rhKeysIn=true; document.addEventListener("keydown", rhKeys, true); }
function rhKeys(e){
  const b=rhBlast();
  if(!b || !RH_KINDS.includes(b.kind) || !["play","demo","menu"].includes(b.phase)) return;
  if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if(typeof kbOn==="function" && kbOn()) return;
  const el=document.activeElement, tag=(el && el.tagName)||"";
  if(/INPUT|SELECT|TEXTAREA/.test(tag) || (el && el.isContentEditable)) return;
  const pad = e.code==="Space" ? 0 : RH_KEYS.indexOf(e.code);
  if(pad<0) return;
  if(e.code==="Space" && tag==="BUTTON") return;                // a focused button's own key
  e.preventDefault();
  if(e.repeat) return;                                         // a key held down is one stroke
  const gm=typeof DRUM_GM!=="undefined" ? DRUM_GM : RH_GM, now=performance.now();
  const t=e.timeStamp>0 && e.timeStamp<=now+50 ? e.timeStamp : now;   // the key's own time, where it's on the page's clock
  mc.dispatchEvent(new CustomEvent("drum",{detail:{note:gm[pad], vel:100, pad, t, source:"keys"}}));
}

// ---------- the arithmetic (no page needed) ----------
/** the nearest grid point to time t on a grid from t0 every unit: its index, and how far off t is (+ late) */
function rhGrid(t, t0, unit){ const k=Math.round((t-t0)/unit); return {k, err:t-(t0+k*unit)}; }
function rhMedian(a){ if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; }
/** a player's steady offset from errors: their median, once the stray ones (beyond twice the median
 *  absolute deviation) are set aside; 0 with fewer than three to go on */
function rhRobustOffset(errs){
  const e=(errs||[]).filter(Number.isFinite); if(e.length<3) return 0;
  const m=rhMedian(e), mad=rhMedian(e.map(x=>Math.abs(x-m)));
  return rhMedian(e.filter(x=>Math.abs(x-m)<=2*mad));
}
/** a random number generator that always gives the same numbers for the same seed (a number or text) */
function rhSeeded(seed){
  let s=0; if(typeof seed==="string"){ for(const c of seed) s=Math.imul(s^c.charCodeAt(0), 2654435761)>>>0; } else s=(seed>>>0)||0;
  s=(s+0x9E3779B9)>>>0;
  return ()=>{ s=(s+0x6D2B79F5)>>>0; let r=Math.imul(s^(s>>>15), 1|s); r=(r+Math.imul(r^(r>>>7), 61|r))^r; return ((r^(r>>>14))>>>0)/4294967296; };
}
// A groove's line as the firmware's drums.py writes it, a character a step, bars between |: '.' a
// rest, g a whisper (30), o a ghost (56), x a hit (96), X an accent (124), r a roll (two hits in the
// step), 2 to 6 a ratchet (that many), each at 84. steps is how many steps to the beat; each hit comes
// back as its step (a fraction for a roll's or ratchet's later hits), its beat, and its velocity.
const RH_GRID_VEL={g:30, o:56, x:96, X:124};
function rhParseGrid(str, steps=4){
  const out=[]; let i=0;
  for(const c of String(str||"").replace(/[|\s]/g,"")){
    if(RH_GRID_VEL[c]) out.push({step:i, vel:RH_GRID_VEL[c]});
    else if(c==="r") out.push({step:i, vel:84}, {step:i+.5, vel:84});
    else if(c>="2" && c<="6"){ const n=+c; for(let j=0;j<n;j++) out.push({step:i+j/n, vel:84}); }
    i++;
  }
  out.forEach(h=>h.beat=h.step/steps);
  return out;
}
