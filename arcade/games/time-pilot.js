// Time Pilot: keeping time when the click drops out, as a dogfight across the eras, on the harp's drum pads.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Time Pilot ----------
// Konami's Time Pilot, as a drummer's oldest exercise: keeping time when the click drops out. The
// player's plane sits in the middle of the sky; enemy planes spiral in from the edges, each timed to
// reach the gunsight on its beat, and a pad struck on the beat (any of the harp's twelve strings, in
// harp drums) shoots it down: PERFECT, GOOD or OK by how close, as a fraction of a beat, so the
// windows are as forgiving at 60 BPM as at 160.
//   A sortie: a bar of count-in clicks (4 3 2 1), two bars of FORMATION with the click, then the CLOUD
//   BANK: the click gone and the sky clouded over for one to eight bars, the enemies hidden, and
//   nothing on the screen that moves with the beat (the clouds drift at their own pace, the HUD says
//   IN THE CLOUDS and nothing more). Then two bars CLEAR, the click back, the clouds parting: every hit
//   made in them plotted on a strip, early above and late below, the planes shot down in them falling
//   at once, and the drift of the bank's last bar (AHEAD 40 MS, BEHIND 85 MS, ON THE BEAT).
//   Three sorties an era, the beat running on under them without a break; then a TIME WARP, two bars of
//   nothing to judge, into the next era.
//   Latency-proof: the player's own steady offset from the click (their median error in FORMATION and
//   CLEAR, the strays set aside: rhRobustOffset) is taken before each bank, and the bank is judged
//   against the beat plus that offset. A player whose hits always land 30 ms late (a slow screen, a
//   long cable, a habit) is judged on whether they HELD the time, not on the 30 ms.
//   A bank is lost, and a plane with it ("LOST IN THE CLOUDS"), when fewer than half its beats got a
//   hit, or nothing was played in its last bar, or that bar's hits drifted on average more than a
//   quarter of a beat. Three planes; the last lost, the game is over.
//   The eras are the levels: 1910, a biplane, in quarter notes; 1940, a fighter, on the backbeat (a low
//   pad, the kick, low tom or low conga, for the bombers on 1 and 3, any other for the fighters on 2
//   and 4: timing judged on every hit, the right pad half as much again); 1970, a jet, in eighths;
//   1982, a helicopter, and 2001, a saucer, at the player's own tempo: the era opens with four beats
//   tapped on any pad, fitted (a least-squares line through the taps as heard) for tempo and phase,
//   and the click comes in on the next beat of THEIR time. After 2001 the eras come round again, 10 BPM
//   faster. SPEED moves the tempos (Relaxed is the eras' own; the tapped tempos' floor moves with it).
//   Points: PERFECT 50, GOOD 25, OK 10, times the era (1910 is 1, 1940 2 …), doubled in the clouds;
//   a bank held 250 a bar; all times the options' multiplier (TIGHT narrows every window by a third).
// Musical time is the audio clock's as heard (arcade/rhythm.js): the clicks are put on it ahead of
// time with rhAt, the planes are placed on it every frame (rhNow), and a pad is judged by the moment
// it was struck (its own timestamp, mapped with rhHeard), never by when the page got round to it.
const TP_ERAS=[
  {n:"1910 · 76 BPM", year:1910, bpm:76, craft:"BIPLANE", spr:"biplane", banks:[1,2,2], beat:"quarters",
    sky:"#5C94FC", foe:{W:"#9BE88A", B:"#2EB872", D:"#1A6B42", C:"#16132A", P:"#3A3550", Q:"#3A3550"}, cloud:["#FFFFFF","#D6E4FA","#A8C0EC"], bank:["#C4CEDE","#9AA8C0","#7888A6"]},
  {n:"1940 · 88 BPM", year:1940, bpm:88, craft:"FIGHTER", spr:"fighter", banks:[2,2,4], beat:"backbeat",
    sky:"#3F78C8", foe:{W:"#D8D08A", B:"#8A8A3A", D:"#4A5A20", C:"#16132A", P:"#3A3550", Q:"#3A3550"}, cloud:["#F4F4F4","#C9D6EA","#93A8CC"], bank:["#BCC4D2","#9099AE","#6E7890"]},
  {n:"1970 · 100 BPM", year:1970, bpm:100, craft:"JET", spr:"jet", banks:[2,4,4], beat:"eighths",
    sky:"#2D6496", foe:{W:"#C9D3EE", B:"#7A86A8", D:"#4A5270", C:"#16132A", F:"#FF8A3D"}, cloud:["#E8EEF6","#B4C2D8","#7F92B0"], bank:["#AEB8C8","#828EA4","#5E6A82"]},
  {n:"1982 · TAP TEMPO", year:1982, bpm:0, tap:true, craft:"HELICOPTER", spr:"heli", banks:[4,4,8], beat:"backbeat",
    sky:"#4B3F86", foe:{W:"#F0C888", B:"#B8864A", D:"#6A4A22", C:"#16132A"}, cloud:["#E6DCF0","#B6A6D2","#7E6CA8"], bank:["#B4A6CC","#8A7AAE","#62548A"]},
  {n:"2001 · TAP TEMPO", year:2001, bpm:0, tap:true, craft:"SAUCER", spr:"saucer", banks:[4,8,8], beat:"eighths", space:true,
    sky:"#0B0820", foe:{W:"#FFB0DA", B:"#FF5AA0", D:"#8A2A6A", C:"#7FE9FF", P:"#FFE600", Q:"#FFE600"}, cloud:["#C8B0F0","#8E6BBF","#4E3A7E"], bank:["#8E6BBF","#6A4E9A","#3E2E6A"]},
];
const TP_LOOP_BPM=10, TP_TAP_MIN=60, TP_TAP_MAX=160;
const TP_WIN=[.05,.10,.16], TP_WIN_LEAST=.018, TP_TIGHT=.7;     // PERFECT, GOOD, OK, as a fraction of a beat
const TP_PTS={PERFECT:50, GOOD:25, OK:10};
const TP_RES_INK={PERFECT:"#FFD35A", GOOD:"#7FE08A", OK:"#7FE9FF"};
const tpEra=(L=blast.level)=> TP_ERAS[(L||0)%TP_ERAS.length];
const tpLoop=L=> Math.floor((L||0)/TP_ERAS.length);
// SPEED moves the tempo, gently: Relaxed (the arcade's default) plays the eras' own, Wild half as fast again
const tpSpeedF=()=> Math.pow(1.8/speedMul(), .35);
const tpBpm=L=>{ const E=TP_ERAS[(L||0)%TP_ERAS.length]; return E.bpm ? Math.round(E.bpm*tpSpeedF())+TP_LOOP_BPM*tpLoop(L) : 0; };
const tpTapLo=L=> Math.min(140, Math.round(TP_TAP_MIN*tpSpeedF())+TP_LOOP_BPM*tpLoop(L));
const tpLow=pad=> typeof RH_REGISTER!=="undefined" ? RH_REGISTER.studio[pad]===0 : pad===0 || pad===7 || pad===9;
function genPilot(){
  return {kind:"pilot", prompt:"Time Pilot", sub:"Shoot the planes down on the beat with the harp's strings as drum pads, then keep the time alone when the click drops out in the clouds.",
    answer:{type:"pilot", name:"the beat, held through the clouds"}, hint:"Count through the clouds: the beat doesn't stop because the click does.", context:0};
}
function startPilot(){
  blast={kind:"pilot", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), tp:null, sky:tpSkyFresh(), padNames:typeof RH_PAD_NAMES!=="undefined" ? RH_PAD_NAMES.studio : null};
  tpDevice();
  if(typeof rhKeysOn==="function") rhKeysOn();                    // the number row as pads, with or without a minichord (rhythm.js)
  stats.streak=0; scoreboard(); buildSpecial();
  tpMenu();
  blast.raf=requestAnimationFrame(tpTick);
}
// harp drums on, the studio kit (rhythm.js); once the second page of settings is in, if it came late
function tpDevice(){
  if(!blast || blast.kind!=="pilot" || !canWrite()) return;
  arcadeSetup(()=>{ if(typeof rhDevice==="function") rhDevice("studio"); });
  if(mc.page1 && typeof rhReady==="function" && !rhReady() && typeof rhDevice==="function") rhDevice("studio");
}
function buildPilotField(box){
  const field=document.createElement("div"); field.className="field arcade pilot"; field.setAttribute("aria-label","The sky");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="pilot"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // the sky, a screen of its own at the old game's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  tpBar(); setTimeout(helperSync);
}
// the score, the era and its tempo (and on a wide screen what the sortie is doing), the planes left.
// Never touched in the clouds: it only changes when the sortie changes or a plane is shot down.
function tpBar(){
  if(!blast || blast.kind!=="pilot" || !blast.hud) return;
  const E=tpEra(), tp=blast.tp, bpm=tp && tp.B && tp.stage!=="tap" ? Math.round(60/tp.B) : tpBpm(blast.level);
  const word=tp && tp.stage!=="tap" && (blast.phase==="play" || blast.phase==="demo") && fieldW()>=560 ? tpWord(tp.stage) : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">${E.year}${bpm ? ` · ${bpm} BPM` : " · TAP TEMPO"}${word ? ` · ${word}` : ""}</span><span class="lives">${livesHtml()}</span>`;
}
const tpWord=st=>({wait:"GET READY", ready:"GET READY", tap:"TAP TEMPO", count:"COUNT-IN", form:"FORMATION", cloud:"IN THE CLOUDS", clear:"CLEAR", warp:"TIME WARP", down:"LOST IN THE CLOUDS"})[st]||"";

// ---------- the title screen ----------
const TPMENU_G={key:"pilot", title:"TIME PILOT",
  rules:()=>`<p>THE HARP'S TWELVE STRINGS ARE DRUM PADS. ENEMY PLANES SPIRAL IN, EACH REACHING YOUR GUNSIGHT ON ITS BEAT: STRIKE A PAD ON THE BEAT TO SHOOT IT DOWN. PERFECT, GOOD OR OK, BY HOW CLOSE.</p><p>FOUR CLICKS COUNT YOU IN, THEN TWO BARS OF FORMATION WITH THE CLICK. THEN THE CLOUD BANK: THE CLICK STOPS, THE SKY CLOUDS OVER, AND YOU KEEP THE TIME ALONE. NOTHING ON THE SCREEN WILL HELP: COUNT. WHEN THE CLOUDS PART, EVERY HIT YOU MADE IN THEM IS SHOWN, AND HOW FAR YOU DRIFTED: AHEAD, BEHIND, OR ON THE BEAT. HITS IN THE CLOUDS SCORE DOUBLE.</p><p>THE CLOUDS ARE JUDGED AGAINST YOUR OWN TIME: IF YOU ALWAYS PLAY A SHADE LATE, THAT SHADE IS ALLOWED FOR. WHAT COUNTS IS HOLDING IT.</p><p>LOSE THE BEAT IN THE CLOUDS, HALF ITS BEATS MISSED OR A QUARTER OF A BEAT ADRIFT, AND A PLANE GOES DOWN. YOU HAVE THREE.</p><p>THE ERAS: 1910 IN QUARTER NOTES; 1940 ON THE BACKBEAT: A LOW PAD (KICK, LOW TOM, LOW CONGA) FOR THE BOMBERS ON 1 AND 3, ANOTHER FOR THE FIGHTERS ON 2 AND 4; 1970 IN EIGHTHS; 1982 AND 2001 AT YOUR OWN TEMPO: TAP FOUR BEATS AND THE CLICK FOLLOWS YOU. THEN ROUND AGAIN, FASTER.</p><p>${playOnScreen() ? "TAP THE PADS UNDER THE GAME, OR THE KEYS 1 TO =" : "ON THE MINICHORD THE GAME TURNS HARP DRUMS ON. ON THE KEYBOARD, 1 TO = ARE THE PADS, SPACE THE KICK"}.</p>${typeof rhNeeds==="function" && rhNeeds() ? `<p>${rhNeeds()}${typeof rhBlocked!=="function" || rhBlocked() ? ": PLAY ON THE KEYBOARD" : ""}.</p>` : ""}`,
  stat:()=>`ERA ${tpEra().year}`,
  levels:TP_ERAS, levelName:i=>TP_ERAS[i].tap ? `${TP_ERAS[i].year} · TAP TEMPO` : `${TP_ERAS[i].year} · ${tpBpm(i)} BPM`,
  begin:i=>beginPilot(i), demo:()=>tpDemo(), modNote:false};
function tpMenu(over){ arcadeMenu(TPMENU_G, over); if(blast) blast.tpSpeedShown=saved.speed; }
// the levels' tempos follow SPEED as it's chosen on the title screen
function tpLevelNames(){
  if(blast.tpSpeedShown===saved.speed || !blast.overlay) return; blast.tpSpeedShown=saved.speed;
  blast.overlay.querySelectorAll(".levels").forEach(lv=>lv.querySelectorAll("button .lvname").forEach((n,i)=>{ if(TP_ERAS[i] && n.firstChild) n.firstChild.nodeValue=TPMENU_G.levelName(i); }));
}
function beginPilot(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phase:"play", over:false, modFor:null, tp:tpFresh({lead:1.4})});
  saved.pilotStart=level; save(); stats.streak=0; scoreboard();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(tpTick);
  if(typeof rhStart==="function") rhStart();
  sfx("start"); tpEraStart(level, null, true);
}
function tpOver(){
  if(!blast || blast.kind!=="pilot" || blast.phase!=="play") return;
  if(typeof rhStop==="function") rhStop();
  blast.phase="over"; blast.over=true; saved.best.pilot=Math.max(saved.best.pilot||0, blast.score); save(); tpMenu(true);
}

// ---------- the sortie ----------
// A game's state: blast.tp. The beat (B, seconds), its grid (unit: a beat, or an eighth), the bars laid
// out from T0 (the context time of the first count-in click) as segments, and a target on every grid
// point of FORMATION, CLOUD BANK and CLEAR. Everything in seconds on the audio clock as heard.
function tpFresh(o){
  return {offset:0, offErrs:[], segs:null, segI:-1, targets:[], taps:[], cloudHits:[], cloudStray:0, stage:"wait", held:false, heldAt:null, over:false,
    shots:[], booms:[], reveal:null, revealDue:null, B:null, unit:null, T0:0, lead:.6, ...o};
}
// an era begins: a tempo (or the player's, tapped), and its three sorties laid out
function tpEraStart(L, at, announce){
  const tp=blast.tp; blast.level=L; const E=tpEra(L); tpBankWarm(E);
  Object.assign(tp, {segs:null, segI:-1, targets:[], taps:[], reveal:null, revealDue:null, cloudHits:[], tapMsg:"", tapped:0});
  if(E.tap && !tp.demo){
    tp.stage="tap"; tp.B=null; tpBar();
    if(announce) banner(`${E.year}`, `${E.craft} · TAP THE TEMPO`);
    return;
  }
  tp.B=60/tpBpm(L);
  if(announce && !tp.demo) banner(`${E.year}`, `${E.craft} · ${tpBpm(L)} BPM`);
  if(at!=null && at>rhCtxNow()+rhLead()) tpPlan(at, 0); else tpWait(T0=>tpPlan(T0, 0));
  tpBar();
}
// The audio clock has to be running before anything is put on it: a context just made, or asleep
// after the page was hidden, shows a time that isn't moving yet. (The tests' never moves at all, and
// rhythm.js falls back to the page's clock; half a second's wait says which.)
function tpClockOk(){
  if(typeof rhClockOverride!=="undefined" && rhClockOverride) return true;
  const c=piano.ctx; if(!c) return true;                                  // no sound at all: the page's clock
  if(c.state!=="running") return false;
  return c.currentTime>0 || performance.now()-(blast.tp.waitFrom||0)>500;
}
// (the plan that was flying is put away while it waits: nothing's drawn or judged on a grid that's gone,
// and the sky can ask for a tap when a phone's sound is still asleep)
function tpWait(fn){
  Object.assign(blast.tp, {stage:"wait", go:fn, waitFrom:performance.now(), segs:null, targets:[], segI:-1, reveal:null, revealDue:null, cloudHits:[]});
  if(tpClockOk()) tpGo();
}
function tpGo(){ const tp=blast.tp, fn=tp.go; tp.go=null; if(fn) fn(rhCtxNow()+rhLead()+tp.lead); tp.lead=.6; }
// The bars from sortie s0 to the era's end: count-in, formation, the bank, clear, for each; then the
// warp. (The demo flies one sortie and no warp.) A target on every grid point that's played.
function tpPlan(T0, s0){
  const tp=blast.tp, E=tpEra(), B=tp.B, per=E.beat==="eighths" ? 2 : 1, unit=B/per, segs=[], targets=[];
  let bar=0;
  for(let s=s0; s<(tp.demo ? 1 : 3); s++){
    const D=E.banks[s];
    for(const [stage, bars] of [["count",1],["form",2],["cloud",D],["clear",2]]){ segs.push({stage, sortie:s, bar0:bar, bars, D}); bar+=bars; }
  }
  if(!tp.demo){ segs.push({stage:"warp", sortie:2, bar0:bar, bars:2}); bar+=2; }
  const spin=(blast.level*1.3+s0*2.1)%(Math.PI*2);
  for(const seg of segs){
    if(seg.stage!=="form" && seg.stage!=="cloud" && seg.stage!=="clear") continue;
    for(let u=0; u<seg.bars*4*per; u++){
      const k=seg.bar0*4*per+u, beat=Math.floor(u/per)%4;
      targets.push({T:T0+k*unit, k, seg, sortie:seg.sortie, cloud:seg.stage==="cloud", bar:seg.bar0+Math.floor(u/(4*per)), beat, sub:u%per,
        low:E.beat==="backbeat" && beat%2===0, ang:(k*2.39996+spin)%(Math.PI*2), hit:null, missed:false, plan:null});
    }
  }
  Object.assign(tp, {T0, unit, per, segs, totalBars:bar, targets, segI:-1, sched:0, stage:"ready", planI:0, cloudHits:[], revealDue:null, live:!!rhLiveCtx()});
  if(typeof rhStart==="function") rhStart();
}
const tpBarLen=()=> 4*blast.tp.B;
const tpSegStart=seg=> blast.tp.T0+seg.bar0*tpBarLen();
// the segment playing at heard time h: -1 before the count-in, segs.length after the last
function tpSegIndexAt(h){
  const tp=blast.tp; if(!tp.segs) return -1;
  const b=(h-tp.T0)/tpBarLen(); if(b<0) return -1;
  const i=tp.segs.findIndex(s=>b<s.bar0+s.bars); return i<0 ? tp.segs.length : i;
}
// The clicks, a bar at a time, a second ahead of the audio clock (rhAt places each at its moment): an
// accent on the bar's first beat. None in the clouds or the warp.
function tpSchedule(){
  const tp=blast.tp, ahead=rhCtxNow()+1, BL=tpBarLen();
  while(tp.sched<tp.totalBars && tp.T0+tp.sched*BL<ahead){
    const seg=tp.segs.find(s=>tp.sched>=s.bar0 && tp.sched<s.bar0+s.bars);
    if(seg && seg.stage!=="cloud" && seg.stage!=="warp")
      for(let b=0;b<4;b++) rhAt(tp.T0+(tp.sched*4+b)*tp.B, b ? "click" : "accent", b ? 96 : 118, "studio");
    tp.sched++;
  }
}
// Each frame (and in the tests, at any heard time): the clicks put ahead, each new segment entered in
// turn, a bank judged once its last strokes are in, the planes that slipped past the gunsight counted,
// and in the demo, the autopilot's strokes. Nothing once the last plane's down: the sky holds on the
// bank's reveal till the game's over.
function tpStep(h){
  const tp=blast && blast.tp; if(!tp || tp.held) return;
  if(tp.stage==="wait"){ if(!tpClockOk()) return; tpGo(); }
  if(!tp.segs || tp.over) return;
  if(!rhClockOverride && tp.live!==!!rhLiveCtx()){ tpRecount(); return; }   // the audio clock came alive (or stopped) under the sortie: start again on it
  tpSchedule();
  const segs=tp.segs, i=tpSegIndexAt(h);
  while(tp.segI<i){ tpEnter(tp.segI+1, h); if(blast.tp!==tp || tp.segs!==segs) return; }
  if(tp.revealDue && h>=tp.revealDue.at) tpReveal(tp.revealDue.clear, tp.revealDue.bank);
  if(tp.over) return;
  const ok=tpWins()[2];
  for(const t of tp.targets){
    if(t.T>h) break;
    if(!t.cloud && !t.hit && !t.missed && h>t.T+ok+.02){ t.missed=true; tpMissed(t); }
  }
  if(tp.demo) tpAutopilot(h);
}
function tpEnter(j, h){
  const tp=blast.tp; tp.segI=j;
  if(j>=tp.segs.length){                                            // the era's over (or the demo's sortie)
    if(tp.demo){ tpDemoDone(); return; }
    const end=tp.T0+tp.totalBars*tpBarLen();
    tpEraStart(blast.level+1, Math.max(end+.3, rhCtxNow()+rhLead()+.3), false);
    return;
  }
  const seg=tp.segs[j]; tp.stage=seg.stage;
  if(seg.stage==="count"){ tp.sortie=seg.sortie; tp.bank=seg.D; }
  else if(seg.stage==="form") tp.reveal=null;
  else if(seg.stage==="cloud"){
    // the player's own time, from the latest hits with the click (the stray ones set aside); carried
    // on as it was if there aren't enough to tell. Never more than the OK window, as formation itself
    // allows: a player who isn't with the click at all doesn't get the clouds judged on their own phase.
    if(tp.offErrs.length>=3){ const w=tpWins()[2]; tp.offset=Math.max(-w, Math.min(w, rhRobustOffset(tp.offErrs))); }
    tp.cloudStray=0;
  }
  else if(seg.stage==="clear"){
    // the bank's judged a moment after the clouds part, when its last stroke (half a beat late, say, on a
    // late player's time) is surely in, however late its event got here
    const bank=tp.segs[j-1];
    if(tp.revealDue) tpReveal(tp.revealDue.clear, tp.revealDue.bank);
    if(bank && bank.stage==="cloud") tp.revealDue={at:tpSegStart(seg)+Math.max(0, tp.unit/2+tp.offset)+.05, clear:seg, bank};
  }
  else if(seg.stage==="warp"){
    tp.reveal=null; sfx("warp");
  }
  if(tp.demo && seg.stage!=="clear") tpDemoSay(seg);               // (the clear's caption waits for the reveal: it tells the drift)
  tpBar();
}

// ---------- judging ----------
// The windows, each a fraction of a beat (PERFECT at least 18 ms, a screen's and a cable's jitter):
// TIGHT takes a third off each.
function tpWins(){
  const B=blast.tp.B||.75, f=saved.tpTight ? TP_TIGHT : 1, p=Math.max(TP_WIN_LEAST, TP_WIN[0]*B*f), g=Math.max(p, TP_WIN[1]*B*f);
  return [p, g, Math.max(g, TP_WIN[2]*B*f)];
}
function tpJudge(err){ const a=Math.abs(err), w=tpWins(); return a<=w[0] ? "PERFECT" : a<=w[1] ? "GOOD" : a<=w[2] ? "OK" : null; }
// points for a hit: the judgement, times the era, doubled in the clouds, half as much again for the
// right pad on the backbeat
function tpPoints(res, t, pad){
  const E=tpEra(), right=E.beat==="backbeat" && (t.low ? tpLow(pad) : !tpLow(pad));
  return mulPts(TP_PTS[res]*((blast.level||0)+1)*(t.cloud ? 2 : 1)*(right ? 1.5 : 1));
}
/** A pad struck: pad 0-11, its velocity, and the moment it was heard (seconds on the audio clock, as
 *  rhHeard gives it). What it did: {res, err, pts}, {cloud, err}, {stray}, {double}, {tap}, or null. */
function tpHit(pad, vel=100, h){
  const tp=blast && blast.kind==="pilot" && blast.tp; if(!tp || tp.held || tp.over) return null;
  if(blast.phase!=="play" && blast.phase!=="demo") return null;
  if(tp.stage==="tap") return tpTap(h);
  if(!tp.segs || tp.stage==="wait") return null;
  const seg=tp.segs[tpSegIndexAt(h)], inCloud=!!seg && seg.stage==="cloud", judged=!!seg && (seg.stage==="form" || inCloud || seg.stage==="clear");
  // A stroke in a cloud bank (its beats where the player's own time puts them): kept as it was struck,
  // and fitted to the bank's beats only when the clouds part, all of them together (tpReveal). One whose
  // event got here after that is too late to count.
  const bank=tpBankAt(h);
  if(bank){
    tpShot(null, h);
    if(bank.revealed) return {late:true};
    tp.cloudHits.push({h, pad, vel, bank});
    const x=h-tp.offset-tpSegStart(bank); return {cloud:true, err:x-Math.round(x/tp.unit)*tp.unit};
  }
  // with the click: the nearest grid point
  let best=null, bd=Infinity;
  for(const t of tp.targets){ if(t.cloud) continue; const d=Math.abs(h-t.T); if(d<bd){ bd=d; best=t; } if(t.T-h>tp.unit) break; }
  const near=best && bd<=tp.unit/2;
  tpShot(near && !inCloud ? best : null, h);
  if(!near){ if(inCloud) tp.cloudStray++; else if(judged) tpStray(null); return {stray:true}; }
  if(best.hit) return {double:true};
  const err=h-best.T, res=tpJudge(err);
  // (only a hit that counts says where the player's time is: one that missed may not be with the click at all)
  if(res){ tp.offErrs.push(err); if(tp.offErrs.length>16) tp.offErrs.shift(); }
  if(!res){ if(inCloud) tp.cloudStray++; else tpStray(best, err); return {res:"MISS", err}; }
  const pts=tpPoints(res, best, pad), at=tpPos(best, h);
  best.hit={err, res, pad, vel};
  blast.score+=pts; stats.streak++; scoreboard(); tpBar();
  if(at && !inCloud){ tpBoom(at.x, at.y, best.low); tpPop(at.x, at.y-12, res, TP_RES_INK[res], tpEra().beat==="backbeat" && (best.low ? !tpLow(pad) : tpLow(pad)) ? "WRONG PAD" : ""); }
  return {res, err, pts};
}
// the cloud bank whose strokes a stroke at heard time h is among: from half a grid unit before its first
// beat to half a unit before the clear's first, on the player's own time
function tpBankAt(h){
  const tp=blast.tp, x=h-tp.offset+tp.unit/2, BL=tpBarLen();
  return tp.segs.find(s=>s.stage==="cloud" && x>=tpSegStart(s) && x<tpSegStart(s)+s.bars*BL) || null;
}
// a plane that slipped past the gunsight: the streak's broken
function tpMissed(t){
  stats.streak=0; scoreboard();
  const at=tpPos(t, t.T); if(at) tpPop(at.x, at.y-12, "MISS", "#FF5A5A");
}
// a stroke nowhere near a beat (or too far from it to count): the streak's broken
function tpStray(t, err){
  stats.streak=0; scoreboard();
  const L=blast.lay; if(!L) return;
  const at=t ? tpPos(t, t.T) : null;
  tpPop(at ? at.x : L.cx, (at ? at.y : L.cy-L.R*.6)-12, err==null ? "STRAY" : err<0 ? "EARLY" : "LATE", "#FF5A5A");
}

// ---------- the clouds part ----------
// The bank judged as a whole: every hit made in it scored now (doubled), the strip of its errors, the
// drift of its last bar, held or lost.
function tpReveal(clear, bankSeg){
  const tp=blast.tp; if(tp.revealDue && tp.revealDue.bank===bankSeg) tp.revealDue=null;
  if(!bankSeg || bankSeg.stage!=="cloud" || bankSeg.revealed) return;
  bankSeg.revealed=true;
  const cl=tp.targets.filter(t=>t.seg===bankSeg), T=tpSegStart(bankSeg), u=tp.unit, recent=[];
  // Each stroke, in turn, given the beat nearest to where the player's time had got to by then (the
  // median of their last three errors, from 0: their offset with the click is allowed for already). A
  // slow slide past half a beat (or half an eighth) shows as the drift it is, not folded onto the next
  // beat and called early, or on it; and one wild stroke doesn't throw the rest. Two on one beat: the
  // one nearer the time as the others have it is kept.
  const phase=not=>rhMedian(recent.filter(r=>r.t!==not).slice(-3).map(r=>r.err));
  for(const c of tp.cloudHits.filter(c=>c.bank===bankSeg).sort((a,b)=>a.h-b.h)){
    const x=c.h-tp.offset-T, i=Math.round((x-phase())/u), t=cl[i];
    if(!t){ tp.cloudStray++; continue; }
    const err=x-i*u;
    if(t.hit){ const q=phase(t); if(Math.abs(t.hit.err-q)<=Math.abs(err-q)) continue; recent.splice(recent.findIndex(r=>r.t===t), 1); }
    t.hit={err, pad:c.pad, vel:c.vel}; recent.push({t, err});
  }
  tp.cloudHits=tp.cloudHits.filter(c=>c.bank!==bankSeg);
  const hits=cl.filter(t=>t.hit), lastBar=bankSeg.bar0+bankSeg.bars-1;
  const last=hits.filter(t=>t.bar===lastBar), drift=last.length ? last.reduce((a,t)=>a+t.hit.err,0)/last.length : null;
  const lost= hits.length*2<cl.length || drift==null || Math.abs(drift)>.25*tp.B;
  let pts=0;
  hits.forEach((t,i)=>{
    const res=t.hit.res=tpJudge(t.hit.err);
    if(res){ pts+=tpPoints(res, t, t.hit.pad); stats.streak++; tp.booms.push({t, at:performance.now()+120+i*45}); }
    else stats.streak=0;
  });
  if(tp.cloudStray) stats.streak=0;
  const bonus= lost ? 0 : mulPts(250*bankSeg.bars);
  blast.score+=pts+bonus;
  tp.reveal={at:tpSegStart(clear), n:cl.length, D:bankSeg.bars, items:cl.map(t=>t.hit ? {err:t.hit.err, res:t.hit.res} : null), drift, lost, pts:pts+bonus, held:hits.length};
  if(lost && !tp.demo){
    blast.lives--; tp.downAt=performance.now(); sfx("lost");
    if(blast.lives<=0){ tp.over=true; tp.overH=tpSegStart(clear)+.8; gameLater(()=>tpOver(), 3200); }   // (the sky held once the clouds have parted)
  } else sfx("clear");
  scoreboard(); tpBar();
  if(tp.demo) tpDemoSay(clear);
}
// what the drift reads as, in words: on the beat within the PERFECT window
function tpDriftWords(d){
  if(d==null) return "NO TIME KEPT";
  const ms=Math.round(Math.abs(d)*1000);
  return Math.abs(d)<=tpWins()[0] ? "ON THE BEAT" : d<0 ? `AHEAD ${ms} MS` : `BEHIND ${ms} MS`;
}

// ---------- tap tempo ----------
/** A tempo and a phase from beats tapped at heard times (seconds): the least-squares line through
 *  them, tap i at a + i·beat. ok only from lo to hi BPM and steady, no tap a fifth of a beat off the
 *  line; why, if not: "FASTER", "SLOWER", "STEADY" or "MORE". */
function tpFitTaps(times, lo=TP_TAP_MIN, hi=TP_TAP_MAX){
  const n=times.length; if(n<2) return {ok:false, why:"MORE"};
  const mi=(n-1)/2, mt=times.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0; times.forEach((t,i)=>{ sxy+=(i-mi)*(t-mt); sxx+=(i-mi)*(i-mi); });
  const beat=sxy/sxx, a=mt-beat*mi, bpm=60/beat;
  const worst=Math.max(...times.map((t,i)=>Math.abs(t-(a+i*beat))));
  const why= !(beat>0) || bpm>hi+.5 ? "SLOWER" : bpm<lo-.5 ? "FASTER" : worst>beat*.2 ? "STEADY" : "";
  return {ok:!why, why, beat, bpm, a, worst};
}
// A tap: four in a row (none more than 1.6 s after the last) set the tempo; the click comes in on the
// next beat of their time that the audio clock can still reach, with a count-in bar.
function tpTap(h){
  const tp=blast.tp;
  if(tp.taps.length && h-tp.taps[tp.taps.length-1]>1.6) tp.taps=[];
  tp.taps.push(h); tp.tapMsg="";
  if(tp.taps.length<4) return {tap:tp.taps.length};
  const f=tpFitTaps(tp.taps, tpTapLo(blast.level), TP_TAP_MAX); tp.taps=[];
  if(!f.ok){ tp.tapMsg={FASTER:"TOO SLOW: AGAIN", SLOWER:"TOO FAST: AGAIN", STEADY:"UNSTEADY: AGAIN"}[f.why]||"AGAIN"; sfx("miss"); return {tap:4, fit:f}; }
  tp.B=f.beat;
  let T=f.a+4*f.beat; while(T<rhCtxNow()+rhLead()+.05) T+=f.beat;
  tpPlan(T, 0); tp.tapped=Math.round(f.bpm); tpBar();
  return {tap:4, fit:f, T0:T};
}

// ---------- pausing ----------
// A hidden page (or the arcade's pause) stops the music at once; nothing is judged across the gap.
// Coming back, the sortie that was flying starts again from a fresh count-in bar at the same tempo
// (a warp goes straight on into the next era; a tap tempo is tapped again). Held, the sky stands still
// where it was (heldAt); a bank the clouds had just parted on is judged first, with what was played in
// it. And a bank left in the middle is a bank lost: stopping can't be the way out of the clouds.
function tpHold(){
  const tp=blast && blast.kind==="pilot" && blast.tp; if(!tp) return;
  if(!tp.held){
    const h=rhNow();
    if(tp.segs && !tp.over && tp.stage!=="wait"){ tpStep(h); if(tp.revealDue) tpReveal(tp.revealDue.clear, tp.revealDue.bank); }
    tp.held=true; tp.heldAt=h;
  }
  if(typeof rhStop==="function") rhStop();
}
function tpResume(){
  const tp=blast && blast.kind==="pilot" && blast.tp; if(!tp) return;
  const at=tp.heldAt; tp.held=false; tp.heldAt=null;
  if((blast.phase!=="play" && blast.phase!=="demo") || tp.over) return;
  if(tp.stage==="tap"){ tp.taps=[]; return; }
  if(tp.stage==="wait" && !tp.segs){ tp.waitFrom=performance.now(); return; }
  const si=!tp.segs ? -1 : at!=null ? tpSegIndexAt(at) : tp.segI, seg=tp.segs && tp.segs[Math.max(0, Math.min(tp.segs.length-1, si))];
  if(tp.segs && tp.segs[si] && tp.segs[si].stage==="cloud" && !tp.demo && tpAbandon()) return;
  tp.reveal=null; tp.lead=.6;
  if(seg && seg.stage==="warp") tpEraStart(blast.level+1, null, true);
  else { const s=seg ? seg.sortie : 0; tpWait(T0=>tpPlan(T0, s)); }
  tpBar();
}
// A phone's sound can take more than the half second tpClockOk waits to start keeping time, so the
// sortie was laid out on the page's clock; once the audio's runs, its time is another (a context just
// made is near 0) and the count-in would be minutes off. The sortie that was flying counts in again on
// it, nothing lost, as Trading Fours' bout does.
function tpRecount(){
  const tp=blast.tp, seg=tp.segs[Math.max(0, Math.min(tp.segs.length-1, tp.segI))];
  if(typeof rhStop==="function") rhStop();
  tp.reveal=null; tp.lead=.6;
  if(seg && seg.stage==="warp") tpEraStart(blast.level+1, null, true);
  else tpWait(T0=>tpPlan(T0, seg ? seg.sortie : 0));
  tpBar();
}
// the bank that was flying when the game stopped: lost, a plane with it, and nothing in it scored. True
// if that was the last.
function tpAbandon(){
  const tp=blast.tp, L=blast.lay; blast.lives--; tp.downAt=performance.now(); stats.streak=0; sfx("lost"); scoreboard();
  if(blast.lives>0){ if(L) tpPop(L.cx, L.cy-L.R*.6-12, "LOST IN THE CLOUDS", "#FF5A5A"); tpBar(); return false; }
  tp.over=true; Object.assign(tp, {segs:null, targets:[], segI:-1, reveal:null, revealDue:null, cloudHits:[], stage:"down"}); tpBar();
  gameLater(()=>tpOver(), 1600);
  return true;
}
document.addEventListener("visibilitychange", ()=>{
  if(typeof blast==="undefined" || !blast || blast.kind!=="pilot" || !blast.tp) return;
  if(document.hidden){ if(blast.phase==="play" || blast.phase==="demo") tpHold(); }
  else if(blast.tp.held && blast.phase!=="pause") tpResume();
});

// ---------- the pads ----------
// A pad struck, the minichord's, the screen's or the keyboard's (the "drum" event, rhythm.js and
// core/minichord.js): judged by the moment it was struck, as heard. The minichord sounds its own pads;
// the screen's and the keyboard's are sounded here, at once. Any of them ends the demo.
mc.addEventListener("drum", e=>{
  if(typeof blast==="undefined" || !blast || blast.kind!=="pilot") return;
  const d=e.detail||{};
  if(blast.phase==="demo"){ if(blast.demo) endTpDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  if(d.source==="minichord" || d.source==="plate") blast.midiIn=(blast.midiIn||0)+1;
  if(d.source!=="minichord" && Number.isInteger(d.pad) && d.pad>=0 && typeof rhSound==="function") rhSound(d.pad, d.vel||100, "studio");
  tpHit(d.pad, d.vel||100, rhHeard(d.t ?? performance.now()));
});
// the arrow keys turn the plane, as the stick does on the joystick plate: for the feel of it only
document.addEventListener("keydown", e=>{
  if(typeof blast==="undefined" || !blast || blast.kind!=="pilot" || blast.phase!=="play" || !blast.sky) return;
  if(e.code==="ArrowLeft" || e.code==="ArrowRight"){ blast.sky.turn= e.code==="ArrowLeft" ? -1 : 1; e.preventDefault(); }
});
document.addEventListener("keyup", e=>{ if(typeof blast!=="undefined" && blast && blast.sky && (e.code==="ArrowLeft" || e.code==="ArrowRight")) blast.sky.turn=0; });

// ---------- each frame ----------
function tpTick(now){
  if(!blast || blast.kind!=="pilot") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;
  const tp=blast.tp;
  if(tp){
    if(blast.phase==="pause"){ if(!tp.held) tpHold(); }          // the arcade's pause: the music's stopped; tpResume counts back in
    else if((blast.phase==="play" || blast.phase==="demo") && !tp.held) tpStep(rhNow());
  }
  tpSkyMove(dt);
  if(blast.phase==="menu") tpLevelNames();
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(tpTick);
}
// The plane's heading, the stick's (or the arrows'), eased; the sky streams past the other way at a
// pace of its own, never the beat's. Idling round on the title screen.
function tpSkyFresh(){ return {x:0, y:0, head:0, want:0, turn:0, parts:[], pops:[]}; }
function tpSkyMove(dt){
  const S=blast.sky; if(!S) return;
  if(typeof jsOn==="function" && jsOn() && typeof jsAngle==="function"){ const j=jsAngle(); if(j && j.mag>.5) S.want=j.a; }
  if(S.turn) S.want+=S.turn*2.4*dt;
  if(blast.phase==="menu" || blast.phase==="over") S.want+=.15*dt;
  let d=S.want-S.head; d=Math.atan2(Math.sin(d), Math.cos(d));
  S.head+=Math.sign(d)*Math.min(Math.abs(d), 3*dt);
  S.x-=Math.sin(S.head)*24*dt; S.y+=Math.cos(S.head)*24*dt;
}

// ---------- the demo ----------
// The autopilot flies a sortie of 1940: a kick for the bombers on 1 and 3, a snare for the fighters on
// 2 and 4, each stroke a few milliseconds off as a hand's is, and in the clouds drifting a little
// behind, as players do; each pad it strikes lit on the screen's minichord.
function tpDemo(){
  if(!blast || blast.kind!=="pilot") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const shell=demoShell(endTpDemo);
  blast.phase="demo"; blast.score=0; blast.lives=3; blast.level=1;
  blast.tp=tpFresh({demo:shell, rng:typeof rhSeeded==="function" ? rhSeeded(1940) : Math.random, lead:1});
  shell.say("TIME PILOT","THE HARP'S TWELVE STRINGS ARE DRUM PADS. FOUR CLICKS COUNT YOU IN: 4, 3, 2, 1.");
  if(typeof rhStart==="function") rhStart();
  tpEraStart(1, null, false);
}
function tpDemoSay(seg){
  const say=blast.tp.demo.say, r=blast.tp.reveal;
  if(seg.stage==="form") say("FORMATION","EACH PLANE REACHES THE GUNSIGHT ON ITS BEAT: STRIKE A PAD AS IT DOES. IN 1940, THE KICK FOR THE BOMBERS ON 1 AND 3, THE SNARE ON 2 AND 4.");
  else if(seg.stage==="cloud") say("THE CLOUD BANK","THE CLICK STOPS AND THE SKY CLOUDS OVER. NOTHING ON THE SCREEN KEEPS TIME NOW: COUNT, AND KEEP PLAYING.");
  else if(seg.stage==="clear") say("THE CLOUDS PART",`EVERY HIT MADE IN THEM IS SHOWN, EARLY ABOVE THE LINE, LATE BELOW. THE TIME DRIFTED: ${r ? tpDriftWords(r.drift) : "A LITTLE"}.`);
}
function tpDemoDone(){
  const tp=blast.tp, token=blast.demo;
  tp.demo.say("READY?","CHOOSE AN ERA, 1910 TO 2001, AND HOLD THE TIME THROUGH THE CLOUDS.");
  gameLater(()=>endTpDemo(token), 2600);
}
function tpAutopilot(h){
  const tp=blast.tp, cnow=rhCtxNow(), E=tpEra(), bank=tp.targets.filter(t=>t.cloud), n=bank.length||1;
  for(; tp.planI<tp.targets.length; tp.planI++){
    const t=tp.targets[tp.planI]; if(t.T>cnow+.3) break;
    const i=bank.indexOf(t), jit=(tp.rng()-.5)*.024, drift=t.cloud ? .065*(i+1)/n : 0;
    const pad= E.beat==="backbeat" ? (t.low ? 0 : 1) : t.sub ? 4 : t.beat%2 ? 1 : 0;
    t.plan={at:t.T+jit+drift+(t.cloud ? tp.offset : 0), pad, vel:90+Math.floor(tp.rng()*30)};
    if(typeof rhAt==="function") rhAt(t.plan.at, pad, t.plan.vel, "studio");
  }
  for(const t of tp.targets){
    if(t.T>h+.2) break;
    if(t.plan && !t.plan.done && t.plan.at<=h){ t.plan.done=true; tpHit(t.plan.pad, t.plan.vel, t.plan.at); helpString(t.plan.pad); tp.litAt=performance.now(); }
  }
  if(tp.litAt && performance.now()-tp.litAt>120){ tp.litAt=0; helpString(-1); }
}
function endTpDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); if(typeof rhStop==="function") rhStop();
  blast.tp=null; blast.phase="menu"; blast.score=0; blast.level=0; blast.sky.pops=[]; blast.sky.parts=[];
  if(blast.overlay) blast.overlay.hidden=false;
  tpBar(); cabRestart();
}

// ---------- the sky, drawn ----------
// Its own screen (pixel.js's lettering and sprites), right across the field, a whole number of the
// screen's pixels a pixel and about 200 of its pixels on the short side: the sky has no edges, so it
// simply fills whatever shape the field is. The gunsight in the middle of the room the HUD, the demo's
// caption and the on-screen minichord leave; on a wide field a little to the left, the strip that
// shows the clouds' hits beside it; on an upright phone, under it.
function tpLayout(){
  const s=blast.screen; if(!s) return;
  const fw=fieldW(), fh=fieldH(), dpr=window.devicePixelRatio||1;
  const d=Math.max(1, Math.round(Math.min(fw, fh)/200*dpr)), k=d/dpr, W=Math.max(60, Math.ceil(fw/k)), H=Math.max(60, Math.ceil(fh/k));
  s.width=W; s.height=H; s.style.cssText=`left:0;top:0;width:${W*k}px;height:${H*k}px`;
  const hh=blast.helpHarp && blast.helpHarp.el && blast.helpHarp.el.isConnected ? blast.helpHarp.el : null;
  const hw= hh ? hh.offsetWidth || (playOnScreen() ? 0 : 58) : 0, side= hw ? Math.min(fw*.35, hw+26) : 0;   // (on a phone the deck's pads are lit instead: the helper's hidden)
  const top=Math.max(30, demoClear())/k, bottom=Math.max(top+40, (fh-26)/k), right=(fw-side)/k, rw=right, rh=bottom-top, wide=rw>rh*1.35;
  // (a band at the top for the sortie's two lines of words, the gunsight under it: a PERFECT over a
  // plane at the top of the ring doesn't write through CLOUDS NEXT. The demo's caption says it instead.)
  const band= blast.phase==="demo" ? 0 : 24, rt=top+band;
  let R, cx, cy, panel;
  if(wide){
    const rr=bottom-rt;
    R=Math.floor(Math.min(rr*.36, rw*.24)); cx=Math.round(Math.max(R+26, rw*.36)); cy=Math.round(rt+rr*.52);
    const x0=cx+R+16, w=Math.max(80, Math.min(right-x0-12, 220)); panel={x:Math.round(x0+(right-x0)/2), w, y:Math.round(cy-36)};
  } else {
    // the reveal's panel under the ring needs 78 of the screen's pixels: on a short phone the ring's made
    // smaller and goes up, so the panel's all on the screen, over the ring's foot if it must
    R=Math.floor(Math.max(26, Math.min(rw*.36, rh*.25, (H-rt-92)/2))); cx=Math.round(rw/2);
    cy=Math.round(Math.max(rt+R+2, Math.min(top+rh*.40, H-90-R)));
    panel={x:cx, w:Math.min(rw-10, 230), y:Math.max(rt, Math.min(Math.round(cy+R+12), H-78))};
  }
  const far=Math.max(...[[0,0],[W,0],[0,H],[W,H]].map(([x,y])=>Math.hypot(x-cx, y-cy)))+14;
  blast.lay={k, W, H, cx, cy, R, far, top, band, bottom, right, panel, wide};
}
// where a target's plane is, at heard time h: spiralling in to the gunsight, on it at its beat, then
// (missed) flying straight on out
function tpPos(t, h){
  const L=blast.lay, tp=blast.tp; if(!L || !tp || !tp.B) return null;
  const u=(t.T-h)/tp.B, vr=(Math.min(L.far, L.R*3.1)-L.R)/3;
  const at=v=>{ const r=L.R+v*vr, a=t.ang-v*.85; return {x:L.cx+r*Math.sin(a), y:L.cy-r*Math.cos(a)}; };
  if(u>=0){ const p=at(u), q=at(u+.04); return {x:p.x, y:p.y, dir:Math.atan2(p.x-q.x, q.y-p.y)}; }
  const p=at(0), q=at(.04), dx=p.x-q.x, dy=p.y-q.y, m=Math.hypot(dx,dy)||1, run=-u*vr*1.1;
  return {x:p.x+dx/m*run, y:p.y+dy/m*run, dir:Math.atan2(dx, -dy)};
}
function tpShot(t, h){ const tp=blast.tp; tp.shots.push({at:performance.now(), t, h}); if(tp.shots.length>8) tp.shots.shift(); }
function tpBoom(x, y, big){
  const S=blast.sky, cols=["#FFF4C2","#FFD35A","#FF8A3D","#FF4B3E","#9A93B5"];
  S.parts.push({x, y, boom:big ? 12 : 9, age:0});
  for(let i=0;i<(big ? 22 : 14);i++){ const a=Math.random()*Math.PI*2, v=18+Math.random()*(big ? 52 : 40);
    S.parts.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.5+Math.random()*.5, c:cols[i%cols.length]}); }
  if(S.parts.length>220) S.parts.splice(0, S.parts.length-220);
}
// what a hit was judged, over its plane, rising; under it and sinking if it would rise into the words at
// the top of the sky
function tpPop(x, y, text, col, sub){
  const S=blast.sky, L=blast.lay, flip=!!L && y-14<L.top+L.band;
  S.pops.push({x, y:flip ? y+24 : y, dir:flip ? 1 : -1, text, col, sub, at:performance.now()}); if(S.pops.length>8) S.pops.shift();
}
// a line of lettering's centre, moved in as far as it must to stay on the screen
const tpFitX=(text, x, W)=>{ const h=[...text].length*4; return Math.max(h+1, Math.min(W-h-1, x)); };

// The craft, nose up, a character a pixel: W wing, B body, D dark, C cockpit, F flame; P and Q the
// propeller (or a saucer's lights) in its two frames. Turned to their heading when they're drawn.
const TP_SPR={
  biplane:[".....QPPPQ.....",".......B.......","WWWWWWWBWWWWWWW","WDWWWWBBBWWWWDW","WWWWWWWBWWWWWWW",".......C.......",".......B.......",".......B.......","......DBD......",".....WWBWW.....",".......D......."],
  fighter:[".....QPPPQ.....",".......B.......","......BBB......","......BCB......","..WWWWBBBWWWW..","WWWWWWBBBWWWWWW",".DDWWWBBBWWWDD.",".......B.......",".......B.......","......WBW......",".....WWBWW.....",".......D......."],
  jet:[".......B.......",".......B.......","......BCB......","......BCB......","......BBB......",".....WBBBW.....","....WWBBBWW....","...WWWBBBWWW...","..WWWWBBBWWWW..",".WWWWWBBBWWWWW.","WWWDD.BBB.DDWWW","......BFB......",".......F......."],
  heli:["....BBB....","...BCCCB...","...BCCCB...","...BBBBB...","..DBBBBBD..","...BBBBB...","....BBB....",".....B.....",".....B.....",".....B.....",".....B.....","...WWBWW...",".....B....."],
  saucer:["....DDDDD....","..DDDCCCDDD..",".DDCCCCCCCDD.","DDDCCCCCCCDDD","WWWWWWWWWWWWW","DPDDQDDDPDDQD","WWWWWWWWWWWWW",".DDDDDDDDDDD.","...DDDDDDD..."],
  bomber:["........QPQ........",".........B.........","........BCB........","...QPQ..BBB..QPQ...","....D...BBB...D....","WWWWWWWWBBBWWWWWWWW","WWDWWWWWBBBWWWWWDWW",".WWWWWWWBBBWWWWWWW.",".........B.........",".........B.........",".........B.........","........DBD........","......WWWBWWW......",".........D........."],
};
const TP_YOU={W:"#F1E8D2", B:"#FFFFFF", D:"#FF4B3E", C:"#2A5DA8", F:"#FF8A3D", P:"#3A3550", Q:"#3A3550"};
const TP_BOMBER={W:"#FF9A5A", B:"#C85A1E", D:"#6A2A0E", C:"#16132A", P:"#3A3550", Q:"#3A3550"};
// a sprite turned to one of sixteen headings (0 nose up, clockwise), each kept once made
function tpTurned(name, pal, palKey, frame, a16){
  const key=`tp|${name}|${palKey}|${frame}|${a16}`;
  if(PX_SPR.has(key)) return PX_SPR.get(key);
  const rows=TP_SPR[name], h=rows.length, w=rows[0].length, n=Math.ceil(Math.hypot(w,h)), a=a16*Math.PI/8, c=Math.cos(a), s=Math.sin(a), out=[];
  for(let y=0;y<n;y++){ let row="";
    for(let x=0;x<n;x++){ const dx=x+.5-n/2, dy=y+.5-n/2, sx=Math.floor(dx*c+dy*s+w/2), sy=Math.floor(-dx*s+dy*c+h/2);
      row+= sy>=0 && sy<h && sx>=0 && sx<w ? rows[sy][sx] : "."; }
    out.push(row); }
  const p={...pal}; if(frame){ delete p.P; p.F="#FFD35A"; } else delete p.Q;
  return pxSprite(key, out, p);
}
const tpA16=a=> ((Math.round(a/(Math.PI/8))%16)+16)%16;
function tpCraft(g, name, pal, palKey, x, y, dir, now){
  const spr=tpTurned(name, pal, palKey, Math.floor(now/45)%2, name==="saucer" ? 0 : tpA16(dir));   // a saucer is round: it never turns
  g.drawImage(spr, Math.round(x-spr.width/2), Math.round(y-spr.height/2));
  if(name==="heli"){                                                // the rotor, a blur of two blades
    const a=now*.04, ox=x+Math.sin(dir)*3, oy=y-Math.cos(dir)*3; g.fillStyle="rgba(30,26,46,.75)";
    for(const b of [a, a+Math.PI/2]) for(let i=-8;i<=8;i++) g.fillRect(Math.round(ox+Math.cos(b)*i), Math.round(oy+Math.sin(b)*i), 1, 1);
  }
}
// clouds: puffs made from a few round blobs, lit above and shaded below; the bank's bigger and greyer
function tpCloudRows(seed, w, h, blobs){
  const r=rhSeeded(seed), B=[...Array(blobs)].map(()=>({x:w*(.18+.64*r()), y:h*(.42+.22*r()), rad:h*(.26+.2*r())}));
  const inside=(x,y)=>B.some(b=>(x-b.x)**2+(y-b.y)**2<=b.rad*b.rad);
  const rows=[]; for(let y=0;y<h;y++){ let row=""; for(let x=0;x<w;x++) row+= inside(x+.5,y+.5) ? (inside(x+1.5,y+2.5) ? "W" : "S") : "."; rows.push(row); }
  return rows;
}
// (each drawn once and kept: the shapes aren't worked out again every frame)
const tpPuff=(i, E)=> PX_SPR.get(`tppuff|${i}|${E.year}`) || pxSprite(`tppuff|${i}|${E.year}`, tpCloudRows(i*7+3, 30+(i%3)*8, 14+(i%2)*4, 5), {W:E.cloud[0], S:E.cloud[1]});
const tpBankPuff=(i, E)=> PX_SPR.get(`tpbank|${i}|${E.year}`) || pxSprite(`tpbank|${i}|${E.year}`, tpCloudRows(i*13+5, 44+(i%4)*10, 26+(i%3)*7, 7, false), {W:E.bank[0], S:E.bank[1]});
// the era's cloud bank drawn ahead, as it begins: made on the frame the clouds roll in, it held that
// frame up for the best part of a beat
function tpBankWarm(E){ if(typeof document!=="undefined") for(let i=0;i<16;i++) tpBankPuff(i, E); }
// big lettering: pixel.js's, each pixel n pixels square
function tpBig(g, text, cx, y, col, n){
  const ch=[...text], x0=Math.round(cx-ch.length*4*n); y=Math.round(y);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]]) ch.forEach((c,i)=>{ const m=pxGlyph(c,"#000"); if(m) g.drawImage(m, x0+i*8*n+dx*n, y+dy*n, 8*n, 8*n); });
  ch.forEach((c,i)=>{ const m=pxGlyph(c,col); if(m) g.drawImage(m, x0+i*8*n, y, 8*n, 8*n); });
}
const tpMix=(a,b,f)=>{ const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)), A=p(a), B=p(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*f)).join(",")})`; };
function tpDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  const hh=!!(blast.helpHarp && blast.helpHarp.el && blast.helpHarp.el.isConnected);
  const lk=`${fieldW()}x${fieldH()}@${window.devicePixelRatio||1}|${hh}|${blast.phase==="demo"}`;
  if(blast.layoutKey!==lk){ blast.layoutKey=lk; tpLayout(); }
  const L=blast.lay; if(!L) return;
  const S=blast.sky, tp=blast.tp, live=!!tp && (blast.phase==="play" || blast.phase==="demo" || blast.phase==="pause"), W=s.width, H=s.height;
  const h=live ? tpDrawTime() : 0, E=tpEra(), si=live ? tpSegIndexAt(h) : -1, seg=live && tp.segs ? tp.segs[si] : null;
  const stage=!live ? "menu" : seg ? seg.stage : tp.segs && si>=tp.segs.length ? "done" : tp.stage==="wait" || tp.stage==="tap" || tp.stage==="down" ? tp.stage : "ready";
  const fdt=Math.min(.1, (now-(S.drawn||now))/1000); S.drawn=now;
  g.imageSmoothingEnabled=false;
  // the sky, and in a warp the next era's coming in, streaks flying out from the middle
  const warpF= stage==="warp" ? Math.max(0, Math.min(1, (h-tpSegStart(seg))/(seg.bars*tpBarLen()))) : 0, N=tpEra(blast.level+1);
  g.fillStyle= warpF ? tpMix(E.sky, N.sky, warpF) : E.sky; g.fillRect(0,0,W,H);
  if(E.space || (warpF>.5 && N.space)){ const r=rhSeeded(2001); g.fillStyle="#F1E8D2"; for(let i=0;i<70;i++){ const x=((r()*W*1.5+S.x*.3)%W+W)%W, y=((r()*H*1.5+S.y*.3)%H+H)%H; g.fillRect(Math.floor(x), Math.floor(y), 1, 1); } }
  // a few clouds drifting by below, far apart, at the sky's own pace
  const PW=W+80, PH=H+60, sc=warpF>.5 ? N : E;
  for(let i=0;i<7;i++){ const p=tpPuff(i, sc), x=((i*97.3+S.x)%PW+PW)%PW-50, y=((i*61.7+i*i*13+S.y)%PH+PH)%PH-30; g.drawImage(p, Math.round(x), Math.round(y)); }
  if(warpF){ g.fillStyle="rgba(255,255,255,.8)"; const r=rhSeeded(blast.level*31+7);
    for(let i=0;i<46;i++){ const a=r()*Math.PI*2, d0=((r()+warpF*3.2)%1)*L.far, len=4+warpF*26; for(let j=0;j<len;j+=1.5) g.fillRect(Math.round(L.cx+Math.sin(a)*(d0+j)), Math.round(L.cy-Math.cos(a)*(d0+j)), 1, 1); } }
  // the gunsight, and the planes on their way to it (none in the clouds, nor any till they part)
  const ring= live && (stage==="count" || stage==="form" || stage==="clear" || stage==="ready");
  if(ring){ g.fillStyle="rgba(255,211,90,.6)"; for(let i=0;i<56;i++){ if(i%7===6) continue; const a=i/56*Math.PI*2; g.fillRect(Math.round(L.cx+Math.sin(a)*L.R), Math.round(L.cy-Math.cos(a)*L.R), 1, 1); } }
  if(live && tp.segs && stage!=="cloud" && stage!=="warp" && !tp.over){
    for(const t of tp.targets){
      if(t.cloud || (t.hit && t.hit.res)) continue;
      const u=(t.T-h)/tp.B; if(u>3.4) break; if(u<-2.6) continue;
      if(t.seg.stage==="clear" && h<tpSegStart(t.seg)) continue;
      const p=tpPos(t, h); if(!p) continue;
      if(t.low) tpCraft(g, "bomber", TP_BOMBER, "bomber", p.x, p.y, p.dir, now);
      else tpCraft(g, E.spr, E.foe, "foe"+E.year, p.x, p.y, p.dir, now);
    }
  }
  // the planes shot down in the clouds, falling as they part
  if(live && !tp.held) tp.booms=tp.booms.filter(b=>{ if(performance.now()<b.at) return true; const p=tpPos(b.t, b.t.T); if(p) tpBoom(p.x, p.y, b.t.low); sfx("down"); return false; });
  // the clouds: rolled in at the bank's first beat, parted at the clear's
  const cover= stage==="cloud" ? Math.min(1, (h-tpSegStart(seg))/.35) : stage==="clear" ? Math.max(0, 1-(h-tpSegStart(seg))/.7) : 0;
  // (a grey, and big puffs scattered over it at random, two layers drifting at their own speeds: no
  // pattern that repeats, nothing that moves with the beat)
  if(cover>0){
    g.globalAlpha=cover; g.fillStyle=E.bank[2]; g.fillRect(0,0,W,H);
    const BW=W+140, BH=H+100, n=Math.ceil(W*H/900);
    for(const [layer, f, al] of [[0,1.4,1],[1,2.4,.85]]){ const r=rhSeeded(E.year+layer*7); g.globalAlpha=cover*al;
      for(let i=0;i<n;i++){ const p=tpBankPuff(Math.floor(r()*8)+layer*8, E), x=((r()*BW+S.x*f)%BW+BW)%BW-80, y=((r()*BH+S.y*f)%BH+BH)%BH-50; g.drawImage(p, Math.round(x), Math.round(y)); } }
    g.globalAlpha=1;
  }
  // you: in the middle, turned to the heading; going down in a spin when a bank's lost
  const downT= tp && tp.downAt ? (performance.now()-tp.downAt)/1000 : 9;
  if(downT<1.4){ if(Math.floor(downT*12)%2) tpCraft(g, E.spr, TP_YOU, "you", L.cx+downT*6, L.cy+downT*10, S.head+downT*9, now); }
  else if(downT>=2.2 || Math.floor(downT*10)%2) tpCraft(g, E.spr, TP_YOU, "you", L.cx, L.cy, S.head, now);
  // tracers: to the plane hit, or straight ahead (always straight ahead in the clouds)
  if(live) for(const sh of tp.shots){ if(performance.now()-sh.at>90) continue;
    const p=sh.t ? tpPos(sh.t, sh.h) : null, tx=p ? p.x : L.cx+Math.sin(S.head)*L.R*1.2, ty=p ? p.y : L.cy-Math.cos(S.head)*L.R*1.2, n=Math.hypot(tx-L.cx, ty-L.cy);
    g.fillStyle="#FFF4C2"; for(let j=8;j<n;j+=2) g.fillRect(Math.round(L.cx+(tx-L.cx)*j/n), Math.round(L.cy+(ty-L.cy)*j/n), 1, 1); }
  // explosions
  const disc=(x, y, r, c)=>{ g.fillStyle=c; for(let yy=-r; yy<=r; yy++){ const w=Math.floor(Math.sqrt(r*r-yy*yy)); g.fillRect(Math.round(x-w), Math.round(y+yy), w*2+1, 1); } };
  S.parts=S.parts.filter(p=>{
    if(p.boom){ p.age+=fdt; const a=p.age; if(a>.7) return false;
      if(a<.32){ const r=Math.max(1, Math.round(p.boom*Math.min(1, .35+a/.16))); disc(p.x, p.y, r, a<.1 ? "#FFF4C2" : a<.2 ? "#FFD35A" : "#FF8A3D"); disc(p.x, p.y, Math.round(r*.55), a<.2 ? "#FFFFFF" : "#FFD35A"); }
      else { g.globalAlpha=Math.max(0, 1-(a-.32)/.38); for(const [dx,dy] of [[-4,-2],[3,-4],[1,3]]) disc(p.x+dx, p.y+dy-(a-.32)*14, Math.round(p.boom*.45), "#6A6680"); g.globalAlpha=1; }
      return true; }
    p.x+=p.vx*fdt; p.y+=p.vy*fdt; p.vx*=.96; p.vy*=.96; p.life-=fdt*1.4; if(p.life<=0) return false;
    g.fillStyle=p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.life>.5 ? 2 : 1, p.life>.5 ? 2 : 1); return true; });
  // what each hit was judged, rising
  S.pops=S.pops.filter(p=>{ const age=(performance.now()-p.at)/1000; if(age>.8) return false; const y=Math.max(L.top+(L.band||0), p.y+(p.dir||-1)*age*14);
    pxText(g, p.text, tpFitX(p.text, p.x, W), y, p.col); if(p.sub) pxText(g, p.sub, tpFitX(p.sub, p.x, W), y+10, "#F1E8D2"); return true; });
  if(live) tpWords(g, h, seg, stage);
}
// The heard time the sky's drawn at: while held, the moment it stopped (nothing flies on behind the
// PAUSED box); with the last plane down, no further than the clouds' parting (the reveal stays up).
function tpDrawTime(){
  const tp=blast.tp, n=rhNow();
  return tp.held && tp.heldAt!=null ? tp.heldAt : tp.over && tp.overH!=null ? Math.min(n, tp.overH) : n;
}
// the words on the sky: what the sortie's doing, the count-in, the tap, the clouds' strip
function tpWords(g, h, seg, stage){
  const L=blast.lay, tp=blast.tp, y0= tp.demo ? -99 : Math.round(L.top+3), x=L.cx;
  if(stage==="wait" || stage==="ready"){
    const asleep= stage==="wait" && piano.ctx && piano.ctx.state!=="running" && performance.now()-(tp.waitFrom||0)>1200;
    pxText(g, asleep ? "CLICK OR TAP FOR SOUND" : "GET READY", x, y0, "#FFD35A");
  }
  else if(stage==="tap"){
    const n=tp.taps.length, w=Math.min(L.right-8, 150), ly=Math.round(L.cy+L.R*.55);
    pxText(g, "TAP FOUR BEATS", x, L.cy-L.R*.6-16, "#FFD35A"); pxText(g, "ON ANY PAD", x, L.cy-L.R*.6-6, "#F1E8D2");
    for(let i=0;i<4;i++){ const lx=Math.round(x-w/2+w*(i+.5)/4)-4; g.fillStyle="#000"; g.fillRect(lx-1,ly-1,10,10); g.fillStyle= i<n ? "#FFD35A" : "#3A3550"; g.fillRect(lx,ly,8,8); }
    pxText(g, tp.tapMsg || `${tpTapLo(blast.level)} TO ${TP_TAP_MAX} BPM`, x, ly+14, tp.tapMsg ? "#FF5A5A" : "#B9C7E6");
  }
  else if(stage==="count"){
    const b=Math.floor((h-tpSegStart(seg))/tp.B);
    pxText(g, `SORTIE ${seg.sortie+1} OF ${tp.demo ? 1 : 3}`, x, y0, "#F1E8D2");
    if(tp.tapped && seg.sortie===0) pxText(g, `YOUR TEMPO: ${tp.tapped} BPM`, x, y0+10, "#7FE9FF");
    if(b>=0 && b<4) tpBig(g, `${4-b}`, L.cx, L.cy-L.R*.55-12, b ? "#F1E8D2" : "#FFD35A", 3);
  }
  else if(stage==="form"){ pxText(g, "FORMATION", x, y0, "#FFD35A"); pxText(g, `CLOUDS NEXT: ${seg.D} BAR${seg.D>1 ? "S" : ""}`, x, y0+10, "#F1E8D2"); }
  else if(stage==="cloud") pxText(g, "IN THE CLOUDS", x, y0, "#F1E8D2");
  else if(stage==="down") pxText(g, "LOST IN THE CLOUDS", x, y0, "#FF5A5A");
  else if(stage==="clear") pxText(g, "CLEAR", x, y0, "#7FE08A");
  else if(stage==="warp"){ const N=tpEra(blast.level+1); pxText(g, "TIME WARP", x, y0, "#FFD35A"); tpBig(g, `${N.year}`, L.cx, L.cy-L.R*.55-14, "#F1E8D2", 2);
    pxText(g, N.tap ? "TAP THE TEMPO" : `${N.craft} · ${tpBpm(blast.level+1)} BPM`, L.cx, L.cy+L.R*.55, "#F1E8D2"); }
  if(tp.reveal && (stage==="clear" || stage==="count")) tpStrip(g, tp.reveal);
}
// The bank, revealed: held or lost, the drift of its last bar, and a strip with a dot for every beat
// in it, at its error: on the line for dead on, above for early, below for late (a quarter of a beat
// at the strip's edge), coloured as it was judged; a beat with no hit a red mark on the line.
function tpStrip(g, r){
  const L=blast.lay, P=L.panel, tp=blast.tp, B=tp.B, sw=Math.round(P.w), sx=Math.round(P.x-sw/2), y=P.y;
  const say=r.lost ? "LOST IN THE CLOUDS" : `BANK HELD +${r.pts}`, dw=tpDriftWords(r.drift);   // (moved in from the screen's edge on a narrow panel)
  pxText(g, say, tpFitX(say, P.x, L.W), y, r.lost ? "#FF5A5A" : "#FFD35A");
  pxText(g, dw, tpFitX(dw, P.x, L.W), y+11, r.lost ? "#FFB0B0" : "#F1E8D2");
  const top=y+34, hgt=30, mid=top+Math.floor(hgt/2), band=Math.max(1, Math.round(Math.min(1, tpWins()[2]/(.25*B))*(hgt/2-2)));
  g.fillStyle="rgba(7,6,12,.82)"; g.fillRect(sx-3, top-3, sw+6, hgt+6);
  g.fillStyle="rgba(127,224,138,.25)"; g.fillRect(sx, mid-band, sw, band*2+1);
  const n=r.items.length;
  for(let b=0;b<=r.D*4;b++){ const x=Math.round(sx+b*sw/(r.D*4)); g.fillStyle= b%4 ? "rgba(185,199,230,.35)" : "rgba(241,232,210,.8)"; g.fillRect(Math.min(sx+sw-1, x), top, 1, b%4 ? 3 : hgt); if(b%4) g.fillRect(Math.min(sx+sw-1, x), top+hgt-3, 1, 3); }
  g.fillStyle="rgba(241,232,210,.6)"; g.fillRect(sx, mid, sw, 1);
  pxText(g, "EARLY", sx+sw-20, top-12, "#B9C7E6"); pxText(g, "LATE", sx+sw-16, top+hgt+4, "#B9C7E6");   // at the strip's far end, clear of the gunsight
  r.items.forEach((it,i)=>{ const x=Math.round(sx+(i+.5)*sw/n);
    if(!it){ g.fillStyle="#FF4B3E"; g.fillRect(x-1, mid-1, 3, 3); return; }
    const yy=Math.round(mid+Math.max(-1, Math.min(1, it.err/(.25*B)))*(hgt/2-2));
    g.fillStyle="#000"; g.fillRect(x-2, yy-2, 5, 5); g.fillStyle=it.res ? TP_RES_INK[it.res] : "#FF5A5A"; g.fillRect(x-1, yy-1, 3, 3); });
}
