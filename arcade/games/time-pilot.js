// Time Pilot: keeping time when the click drops out, as a dogfight across the eras, on the harp's drum pads.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Time Pilot ----------
// Konami's Time Pilot, as a drummer's oldest exercise: keeping time when the click drops out. The
// player's plane sits in the middle of the sky; enemy planes spiral in from the edges, each timed to
// reach the gunsight on its beat, and a pad struck on the beat (any of the harp's twelve strings, in
// harp drums) shoots it down: PERFECT, GOOD or OK by how close, a fraction of a beat.
//   A sortie: a bar of count-in clicks, two bars of FORMATION with the click, then the CLOUD BANK, the
//   click gone and the sky clouded over for one to eight bars, nothing on screen that moves with the
//   beat; then two bars CLEAR, the click back, the clouds parting on every hit made in them and the
//   drift (AHEAD, BEHIND, ON THE BEAT). Three sorties an era, then a TIME WARP into the next.
//   The eras are the levels: 1910 in quarter notes, 1940 on the backbeat, 1970 in eighths, then 1982
//   and 2001 at the player's own tempo, tapped in. After 2001 the eras come round again, faster.
// (A skeleton: the title, the options, a placeholder sortie and demo. The game itself goes in here.)
const TP_ERAS=[
  {n:"1910 · 76 BPM", year:1910, bpm:76, craft:"BIPLANE", banks:[1,2,2], beat:"quarters"},
  {n:"1940 · 88 BPM", year:1940, bpm:88, craft:"FIGHTER", banks:[2,2,4], beat:"backbeat"},
  {n:"1970 · 100 BPM", year:1970, bpm:100, craft:"JET", banks:[2,4,4], beat:"eighths"},
  {n:"1982 · TAP TEMPO", year:1982, bpm:0, tap:true, craft:"HELICOPTER", banks:[4,4,8], beat:"backbeat"},
  {n:"2001 · TAP TEMPO", year:2001, bpm:0, tap:true, craft:"SAUCER", banks:[4,8,8], beat:"eighths"},
];
const tpEra=()=> TP_ERAS[(blast.level||0)%TP_ERAS.length];
function genPilot(){
  return {kind:"pilot", prompt:"Time Pilot", sub:"Shoot the planes down on the beat with the harp's strings as drum pads, then keep the time alone when the click drops out in the clouds.",
    answer:{type:"pilot", name:"the beat, held through the clouds"}, hint:"Count through the clouds: the beat doesn't stop because the click does.", context:0};
}
function startPilot(){
  blast={kind:"pilot", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), padNames:typeof RH_PAD_NAMES!=="undefined" ? RH_PAD_NAMES.studio : null};
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
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  tpBar(); setTimeout(helperSync);
}
function tpBar(){
  if(!blast || blast.kind!=="pilot" || !blast.hud) return;
  const E=tpEra(), bpm=blast.bpm || E.bpm;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">${E.year}${bpm ? ` · ${Math.round(bpm)} BPM` : ""}${blast.phase==="play" && blast.say ? ` · ${blast.say}` : ""}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const TPMENU_G={key:"pilot", title:"TIME PILOT",
  rules:()=>`<p>THE HARP'S TWELVE STRINGS ARE DRUM PADS. ENEMY PLANES SPIRAL IN, EACH REACHING YOUR GUNSIGHT ON ITS BEAT: STRIKE A PAD ON THE BEAT TO SHOOT IT DOWN. PERFECT, GOOD OR OK, BY HOW CLOSE.</p><p>FOUR CLICKS COUNT YOU IN, THEN TWO BARS OF FORMATION WITH THE CLICK. THEN THE CLOUD BANK: THE CLICK STOPS, THE SKY CLOUDS OVER, AND YOU KEEP THE TIME ALONE. WHEN THE CLOUDS PART, EVERY HIT YOU MADE IN THEM IS SHOWN, AND HOW FAR YOU DRIFTED: AHEAD, BEHIND, OR ON THE BEAT. HITS IN THE CLOUDS SCORE DOUBLE.</p><p>LOSE THE BEAT IN THE CLOUDS, HALF ITS BEATS MISSED OR A QUARTER OF A BEAT ADRIFT, AND A PLANE GOES DOWN. YOU HAVE THREE.</p><p>THE ERAS: 1910 IN QUARTER NOTES; 1940 ON THE BACKBEAT, A LOW PAD ON 1 AND 3, ANOTHER ON 2 AND 4; 1970 IN EIGHTHS; 1982 AND 2001 AT YOUR OWN TEMPO: TAP FOUR BEATS AND THE CLICK FOLLOWS YOU.</p><p>${playOnScreen() ? "TAP THE PADS UNDER THE GAME, OR THE KEYS 1 TO =" : "ON THE MINICHORD THE GAME TURNS HARP DRUMS ON. ON THE KEYBOARD, 1 TO = ARE THE PADS, SPACE THE KICK"}.</p>${typeof rhNeeds==="function" && rhNeeds() ? `<p>${rhNeeds()}: PLAY ON THE KEYBOARD.</p>` : ""}`,
  stat:()=>`ERA ${tpEra().year}`,
  levels:TP_ERAS, begin:i=>beginPilot(i), demo:()=>tpDemo(), modNote:false};
function tpMenu(over){ arcadeMenu(TPMENU_G, over); }
function beginPilot(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phase:"play", over:false, bpm:TP_ERAS[level%TP_ERAS.length].bpm||100, say:"FORMATION", t0:performance.now(), modFor:null});
  saved.pilotStart=level; save(); stats.streak=0; scoreboard();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(tpTick);
  banner(`${tpEra().year}`, tpEra().craft); sfx("start"); tpBar();
  gameLater(()=>tpOver(), 8000);                                  // the placeholder sortie: over in a few bars
}
function tpOver(){
  if(!blast || blast.kind!=="pilot" || blast.phase!=="play") return;
  if(typeof rhStop==="function") rhStop();
  blast.phase="over"; blast.over=true; saved.best.pilot=Math.max(saved.best.pilot||0, blast.score); save(); tpMenu(true);
}

// ---------- each frame ----------
function tpTick(now){
  if(!blast || blast.kind!=="pilot") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(tpTick);
}
// the sky, and the player's plane in the middle of it, its gunsight round it
function tpDraw(g, now){
  const W=blast.fx.w, H=blast.fx.h, cx=Math.floor(W/2), cy=Math.floor(H/2);
  g.fillStyle="#2A5DA8"; g.fillRect(0,0,W,H);
  g.fillStyle="#F1E8D2"; g.fillRect(cx-1,cy-4,2,8); g.fillRect(cx-5,cy-1,10,2); g.fillRect(cx-2,cy+3,4,1);
  if(blast.phase==="play" || blast.phase==="demo"){ g.fillStyle="rgba(255,211,90,.7)";
    for(let a=0;a<24;a++){ const t=a/24*Math.PI*2; g.fillRect(Math.floor(cx+Math.cos(t)*14), Math.floor(cy+Math.sin(t)*14), 1, 1); } }
}

// ---------- the demo ----------
// (A placeholder: the autopilot's captions, the pads it would strike lit on the on-screen minichord.)
function tpDemo(){
  if(!blast || blast.kind!=="pilot") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endTpDemo);
  blast.phase="demo";
  sfx("attract");
  (async()=>{
    try{
      say("TIME PILOT","THE HARP'S STRINGS ARE DRUM PADS. A PLANE REACHES THE GUNSIGHT ON EACH BEAT: STRIKE A PAD AS IT DOES."); await step(1200);
      for(const p of [0,5,0,5]){ helpString(p); await step(500); }
      say("THE CLOUDS","THEN THE CLICK STOPS AND THE SKY CLOUDS OVER: KEEP THE TIME ALONE, AND SEE HOW FAR YOU DRIFTED WHEN THEY PART."); await step(3200);
      helpString(-1); say("READY?","CHOOSE AN ERA: 1910 TO 2001."); sfx("level"); await step(2000);
      endTpDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endTpDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu";
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
