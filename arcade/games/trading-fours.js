// Trading Fours: a drum battle, four bars each, the rival's call answered on the harp's drum pads.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Trading Fours ----------
// A versus fighter (two health bars, a roster of rivals) where the blows are drum breaks. Two pixel
// drummers face each other at their kits. The rival plays four bars, the call; the player answers four
// bars on the pads (the harp's twelve strings, in harp drums), the time running on underneath without a
// gap: call, answer, call, answer. The answer is judged on how well it matches the call's RHYTHM, not
// its exact drums: where the hits fall, low drums for low and high for high, the accents, how many.
// A close answer hurts the rival, a poor one the player; a K.O. brings on the next rival.
//   The roster (the levels): MAX BACKBEAT on rock, DONA BOSSA on bossa nova, GL1TCH-9000 on clicks
//   and cuts, and the boss, USTAD TEENTAL, on tabla: four bars of four beats are one cycle of teental's
//   sixteen, and an answer landing its last hit on sam, the cycle's first beat, earns a bonus. After
//   the boss the roster comes round again, faster.
// (A skeleton: the title, the options, a placeholder bout and demo. The game itself goes in here.)
const TF_ROSTER=[
  {n:"MAX BACKBEAT", style:"ROCK", kit:"studio", bpm:96},
  {n:"DONA BOSSA", style:"BOSSA NOVA", kit:"brushes", bpm:120},
  {n:"GL1TCH-9000", style:"CLICKS AND CUTS", kit:"cliqhop", bpm:104},
  {n:"USTAD TEENTAL", style:"TEENTAL", kit:"tabla", bpm:76, boss:true},
];
const tfRival=()=> TF_ROSTER[(blast.level||0)%TF_ROSTER.length];
const tfPadNames=kit=> typeof RH_PAD_NAMES!=="undefined" && RH_PAD_NAMES[kit] || null;
function genFours(){
  return {kind:"fours", prompt:"Trading Fours", sub:"A drum battle: the rival plays four bars, you answer four on the harp's strings as drum pads. Echo the rhythm to land the blows.",
    answer:{type:"fours", name:"the call's rhythm, answered"}, hint:"Listen for where the hits fall, low and high, and the accents: the drums needn't be the same.", context:0};
}
function startFours(){
  blast={kind:"fours", score:0, lives:1, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), padNames:tfPadNames(TF_ROSTER[0].kit)};
  tfDevice();
  if(typeof rhKeysOn==="function") rhKeysOn();                    // the number row as pads, with or without a minichord (rhythm.js)
  stats.streak=0; scoreboard(); buildSpecial();
  tfMenu();
  blast.raf=requestAnimationFrame(tfTick);
}
// harp drums on, in the rival's kit (rhythm.js); once the second page of settings is in, if it came late
function tfDevice(){
  if(!blast || blast.kind!=="fours" || !canWrite()) return;
  arcadeSetup(()=>{ if(typeof rhDevice==="function") rhDevice(tfRival().kit); });
  if(mc.page1 && typeof rhReady==="function" && !rhReady() && typeof rhDevice==="function") rhDevice(tfRival().kit);
}
function buildFoursField(box){
  const field=document.createElement("div"); field.className="field arcade fours"; field.setAttribute("aria-label","The stage");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="fours"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), layoutKey:null});
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  tfBar(); setTimeout(helperSync);
}
function tfBar(){
  if(!blast || blast.kind!=="fours" || !blast.hud) return;
  const R=tfRival();
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">VS ${R.n} · ${R.style}${blast.phase==="play" && blast.say ? ` · ${blast.say}` : ""}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const TFMENU_G={key:"fours", title:"TRADING FOURS",
  rules:()=>`<p>A DRUM BATTLE. YOUR RIVAL PLAYS FOUR BARS, THE CALL; YOU ANSWER WITH FOUR BARS ON THE PADS, THE HARP'S TWELVE STRINGS AS DRUMS. THE TIME NEVER STOPS: CALL, ANSWER, CALL, ANSWER.</p><p>ANSWER WITH THE CALL'S RHYTHM, NOT ITS EXACT DRUMS: HITS IN THE SAME PLACES, LOW DRUMS FOR LOW AND HIGH FOR HIGH, THE ACCENTS WHERE THEY WERE. ECHO IT CLOSELY AND YOUR RIVAL TAKES THE BLOW; MISS IT AND YOU DO.</p><p>K.O. A RIVAL AND THE NEXT STEPS UP: MAX BACKBEAT ON ROCK, DONA BOSSA ON BRUSHES, GL1TCH-9000, AND THE BOSS, USTAD TEENTAL, ON TABLA: SIXTEEN BEATS TO A CYCLE, AND A BONUS FOR LANDING ON SAM, ITS FIRST.</p><p>THE SHEET SHOWS THE CALL AS IT'S PLAYED, AND YOUR ANSWER UNDER IT. ${playOnScreen() ? "TAP THE PADS UNDER THE GAME, OR THE KEYS 1 TO =" : "ON THE MINICHORD THE GAME TURNS HARP DRUMS ON, IN THE RIVAL'S KIT. ON THE KEYBOARD, 1 TO = ARE THE PADS, SPACE THE KICK"}.</p>${typeof rhNeeds==="function" && rhNeeds() ? `<p>${rhNeeds()}: PLAY ON THE KEYBOARD.</p>` : ""}`,
  stat:()=>`VS ${tfRival().n}`,
  levels:TF_ROSTER, begin:i=>beginFours(i), demo:()=>tfDemo(), modNote:false};
function tfMenu(over){ arcadeMenu(TFMENU_G, over); }
function beginFours(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  const R=TF_ROSTER[level%TF_ROSTER.length];
  Object.assign(blast,{score:0, lives:1, level, startLevel:level, phase:"play", over:false, padNames:tfPadNames(R.kit), say:"THE CALL", t0:performance.now(), modFor:null});
  saved.foursStart=level; save(); stats.streak=0; scoreboard();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(tfTick);
  banner(`VS ${R.n}`, R.style); sfx("start"); tfBar();
  gameLater(()=>tfOver(), 8000);                                  // the placeholder bout: over in a few bars
}
function tfOver(){
  if(!blast || blast.kind!=="fours" || blast.phase!=="play") return;
  if(typeof rhStop==="function") rhStop();
  blast.phase="over"; blast.over=true; saved.best.fours=Math.max(saved.best.fours||0, blast.score); save(); tfMenu(true);
}

// ---------- each frame ----------
function tfTick(now){
  if(!blast || blast.kind!=="fours") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(tfTick);
}
// the stage: two kits facing each other under two health bars
function tfDraw(g, now){
  const W=blast.fx.w, H=blast.fx.h, fy=Math.floor(H*.7);
  g.fillStyle="#140E24"; g.fillRect(0,0,W,H); g.fillStyle="#2A2448"; g.fillRect(0,fy,W,H-fy);
  if(blast.phase==="play" || blast.phase==="demo"){
    const bw=Math.floor(W*.38);
    g.fillStyle="#FF5AA0"; g.fillRect(4,4,bw,3); g.fillStyle="#7FE9FF"; g.fillRect(W-4-bw,4,bw,3);
  }
  for(const [x,c] of [[Math.floor(W*.25),"#7FE9FF"],[Math.floor(W*.75),"#FF5AA0"]]){
    g.fillStyle="#F1E8D2"; g.fillRect(x-4,fy-6,8,6); g.fillStyle=c; g.fillRect(x-1,fy-14,3,7); g.fillRect(x-2,fy-17,5,3);
  }
}

// ---------- the demo ----------
// (A placeholder: the autopilot's captions, the pads it would strike lit on the on-screen minichord.)
function tfDemo(){
  if(!blast || blast.kind!=="fours") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endTfDemo);
  blast.phase="demo"; blast.level=0; blast.padNames=tfPadNames(TF_ROSTER[0].kit);
  sfx("attract");
  (async()=>{
    try{
      say("TRADING FOURS","MAX BACKBEAT PLAYS FOUR BARS: THE CALL. THEN IT'S YOUR TURN, FOUR BARS ON THE PADS."); await step(1200);
      for(const p of [0,4,1,4]){ helpString(p); await step(450); }
      say("ANSWER IT","ECHO ITS RHYTHM: LOW FOR LOW, HIGH FOR HIGH, THE ACCENTS WHERE THEY WERE. A CLOSE ANSWER LANDS A BLOW."); await step(3200);
      helpString(-1); say("READY?","FOUR RIVALS, AND A TABLA MASTER AT THE TOP."); sfx("level"); await step(2000);
      endTfDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endTfDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu";
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
