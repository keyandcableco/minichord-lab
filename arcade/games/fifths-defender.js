// Fifths Defender: aim round the circle of fifths with a knob; play the key's chord to fire. With its
// demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Fifths Defender ----------
// Tempest on the circle of fifths. The player sits at the hub; the twelve keys stand round the rim in
// fifths, C at the top, G one step clockwise, F one step back. Enemies crawl in along the spokes.
// Turn a knob (or the mouse, or the arrow keys) to aim down a spoke, then play that key's chord to
// fire along it: a key's neighbours on the circle are a knob-turn away, so the circle is learnt by
// feel. What fires changes with the level: the key's major chord, its relative minor, its dominant
// seventh (G7 fires down the C spoke), and at the top the key's note on the harp. An enemy that
// reaches the hub costs a life.
const FD_KEYS=["C","G","D","A","E","B","F♯","D♭","A♭","E♭","B♭","F"];      // round the circle, clockwise from the top
const FD_LEVELS=[
  {n:"Near keys", fire:"major", spokes:[0,1,2,3,9,10,11]},
  {n:"All twelve keys", fire:"major"},
  {n:"Relative minors", fire:"minor"},
  {n:"Dominant sevenths", fire:"dominant"},
  {n:"On the harp", fire:"harp"},
];
// what fires down a spoke at this level: a chord, or the key's note
function fdFire(i, L){
  const k=FD_KEYS[i];
  if(L.fire==="minor"){ const r=above(k,5,9); return {root:r, q:"m", label:r+"m"}; }
  if(L.fire==="dominant"){ const r=above(k,4,7); return {root:r, q:"7", label:r+"7"}; }
  if(L.fire==="harp") return {note:pcOfName(k), label:k};
  return {root:k, q:"", label:k};
}
function genFifths(){
  return {kind:"fifths", prompt:"Fifths Defender", sub:"The twelve keys stand round you in fifths. Turn a knob (or use the mouse or arrow keys) to aim down a key's spoke, then play that key's chord to fire along it. Enemies crawl in; one that reaches the middle costs a life.",
    answer:{type:"fifths", get name(){ const L=FD_LEVELS[blast?.level||0]; return blast && blast.kind==="fifths" ? fdFire(blast.aim,L).label : "the aimed key's chord"; }},
    get hint(){ const e=fdNearest(); return e ? `The nearest enemy is on the ${FD_KEYS[e.spoke]} spoke.` : "Wait for an enemy."; },
    context:0};
}
function fdNearest(){ return blast && blast.kind==="fifths" ? blast.foes.filter(f=>!f.dead).sort((a,b)=>a.r-b.r)[0]||null : null; }
const fdLevelOk=i=> FD_LEVELS[i].fire!=="harp" || canWrite();
function startFifths(){
  blast={kind:"fifths", foes:[], score:0, lives:3, level:0, kills:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), aim:0, next:0, jamUntil:0};
  fdDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  fdMenu();
  blast.raf=requestAnimationFrame(fdTick);
}
function fdDevice(){
  if(!blast || blast.kind!=="fifths" || !canWrite()) return;
  arcadeSetup(()=>{ if(hasSetting(30)) ensure(30,0); if(knobsReady()) borrow(238,1); asHarp(); });
  const sig=FD_LEVELS.map((_,i)=>fdLevelOk(i)).join()+knobsReady();
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ menuRebuild(()=>fdMenu()); }
}
function buildFifthsField(box){
  const field=document.createElement("div"); field.className="field arcade fifths"; field.setAttribute("aria-label","The circle of fifths");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const rim=document.createElement("div"); rim.className="fdrim"; field.appendChild(rim);
  box.append(field);
  if(blast && blast.kind==="fifths"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.rimEl=rim; blast.fx=fxInit(field);
    // the wheel is drawn sharp, at the screen's own resolution, over the pixel starfield
    blast.sharp=sharpLayer(blast.fx);
    FD_KEYS.forEach((k,i)=>{ const l=document.createElement("span"); l.className="fdkey"; rim.appendChild(l); });
    setTimeout(()=>{ fdLayout(); fdLabels(); });
    if(blast.overlay) field.appendChild(blast.overlay);
    // the mouse aims too: at the spoke nearest where it points
    field.addEventListener("pointermove", e=>{ if(!blast || blast.kind!=="fifths" || blast.phase!=="play" || !mouseMaySteer()) return; const r=field.getBoundingClientRect();
      const a=Math.atan2(e.clientX-r.left-blast.cx, -(e.clientY-r.top-blast.cy)); fdAimAt(mod(Math.round(a/(Math.PI/6)),12)); });
  }
  fdBar(); setTimeout(helperSync);
}
function fdLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  blast.cx=W/2; blast.cy=H/2+14; blast.R=Math.max(90, Math.min(W,H)/2-64); blast.hub=26;
  [...blast.rimEl.children].forEach((l,i)=>{ const a=i*Math.PI/6; l.style.left=`${blast.cx+Math.sin(a)*(blast.R+26)}px`; l.style.top=`${blast.cy-Math.cos(a)*(blast.R+26)}px`; });
}
// the rim's names: the keys, or at the minor level the relative minors beneath them
function fdLabels(){
  if(!blast || !blast.rimEl) return;
  const L=FD_LEVELS[blast.level||0];
  [...blast.rimEl.children].forEach((l,i)=>{ const k=FD_KEYS[i]; l.innerHTML = L.fire==="minor" ? `${k}<small>${above(k,5,9)}m</small>` : k;
    l.classList.toggle("aimed", i===blast.aim); l.classList.toggle("unused", !!L.spokes && !L.spokes.includes(i)); });
}
function fdBar(){
  if(!blast || blast.kind!=="fifths" || !blast.hud) return;
  const L=FD_LEVELS[blast.level];
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${L.n.toUpperCase()}</span><span class="lives">${livesHtml()}</span>`;
}
const FDMENU_G={key:"fifths", title:"FIFTHS DEFENDER",
  rules:()=>`<p>THE TWELVE KEYS STAND ROUND YOU IN FIFTHS: C AT THE TOP, G ONE STEP ROUND, F ONE STEP BACK.</p><p>${knobsReady() ? "TURN A KNOB ON THE MINICHORD TO AIM DOWN A KEY: C IN THE MIDDLE, SHARPS TO THE RIGHT, FLATS TO THE LEFT. HOLD IT AT EITHER END TO KEEP TURNING." : "AIM DOWN A KEY WITH THE MOUSE OR THE ARROW KEYS. WITH FIRMWARE 17, A KNOB DOES IT."}</p><p>PLAY THAT KEY'S CHORD TO FIRE. LATER, ITS RELATIVE MINOR, ITS DOMINANT SEVENTH, OR ITS NOTE ON THE HARP.</p><p>AN ENEMY THAT REACHES THE MIDDLE COSTS A LIFE.</p>`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
  },
  levels:FD_LEVELS, ok:fdLevelOk, needs:"NEEDS A MINICHORD", sig:()=>String(knobsReady()),
  begin:i=>beginFifths(i), demo:()=>fdDemo(), modNote:"title"};
function fdMenu(over){ arcadeMenu(FDMENU_G, over); }
function beginFifths(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{foes:[], score:0, lives:3, level, startLevel:level, kills:0, levelKills:0, aimOffset:0, knobV:null, edgeAt:null, phase:"play", over:false, jamUntil:0, modFor:null,
    next:performance.now()+1500, gap:3000*speedMul()*Math.pow(.93,level), creep:22/speedMul()*Math.pow(1.06,level)});
  saved.fifthsStart=level; save();
  stats.streak=0; scoreboard(); fdLayout(); fdLabels();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(fdTick);
  banner(`LEVEL ${level+1}`, `${FD_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); fdBar(); fdHelp();
}
function fdSpawn(){
  const L=FD_LEVELS[blast.level], spokes=L.spokes||[...Array(12).keys()];
  const spoke=rnd(spokes), star=Math.random()<.08;
  blast.foes.push({spoke, r:blast.R, star, born:performance.now(), wob:Math.random()*6});
}
// aim down a spoke
function fdAimAt(i){
  if(!blast || blast.kind!=="fifths" || i===blast.aim) return;
  blast.aim=mod(i,12); sfx("aim", pcOfName(FD_KEYS[blast.aim])); fdLabels(); fdHelp();
}
// The knob has end stops, so the circle has a seam somewhere on it. It goes opposite C: C is the middle
// of the knob's travel, the fifths running clockwise to the right (G, D, A, E, B) and anticlockwise to
// the left (F, B♭, E♭, A♭, D♭), and both ends are F♯/G♭, the same spoke, as far from home as it gets.
// And it turns endlessly: held against either end stop, the aim keeps stepping round that way, the
// whole mapping turning with it, so the knob never jumps back when it's turned away from the end.
function fdKnob(v){
  if(!blast || blast.phase!=="play") return;
  blast.knobV=v; fdAimAt(mod(Math.round(v*12)-6+(blast.aimOffset||0), 12));
}
const FD_EDGE=.025, FD_EDGE_WAIT=420, FD_EDGE_STEP=260;   // how close to an end stop counts, how long before it starts, how often it steps
function fdEdge(now){
  const v=blast.knobV; if(v==null || blast.phase!=="play"){ blast.edgeAt=null; return; }
  const dir = v<=FD_EDGE ? -1 : v>=1-FD_EDGE ? 1 : 0;
  if(!dir){ blast.edgeAt=null; return; }
  if(blast.edgeAt==null){ blast.edgeAt=now+FD_EDGE_WAIT; return; }
  if(now<blast.edgeAt) return;
  blast.edgeAt=now+FD_EDGE_STEP; blast.aimOffset=(blast.aimOffset||0)+dir; fdKnob(v);
}
function fdTick(now){
  if(!blast || blast.kind!=="fifths") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.phase==="play" || blast.phase==="demo"){
    fdEdge(now);
    if(blast.phase==="play" && now>=blast.next && blast.foes.filter(f=>!f.dead).length<4+blast.level){ fdSpawn(); blast.next=now+blast.gap*(.75+Math.random()*.5); }
    for(const f of blast.foes){
      if(f.dead) continue;
      f.r-=blast.creep*dt*(f.star?.8:1);
      if(f.r<=blast.hub+6){ f.dead=true; if(blast.phase==="play") fdHitHub(f); }
    }
    blast.foes=blast.foes.filter(f=>!f.dead || now-(f.deadAt||0)<50);
  }
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(fdTick);
}
function fdHitHub(f){
  explode(blast.cx, blast.cy, 30, ["#FF4B3E","#FF8A3D","#FFD35A"]);
  if(f.star){ popup(blast.cx, blast.cy-30, "GONE", "#7FE9FF"); return; }
  sfx("miss"); buzz(blast.field,true); blast.lives--; fdBar(); blast.hurtAt=performance.now();
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true; blast.foes.forEach(x=>x.dead=true);
    const best=Math.max(saved.best.fifths||0, blast.score); saved.best.fifths=best; save();
    fdMenu(true);
  }
}
// fire down the aimed spoke: the nearest enemy on it
function fdShoot(quiet){
  const on=blast.foes.filter(f=>!f.dead && f.spoke===blast.aim).sort((a,b)=>a.r-b.r)[0];
  const a=blast.aim*Math.PI/6, P=PX, x0=blast.cx+Math.sin(a)*blast.hub, y0=blast.cy-Math.cos(a)*blast.hub;
  const r=on ? on.r : blast.R, x1=blast.cx+Math.sin(a)*r, y1=blast.cy-Math.cos(a)*r;
  sfx("shoot");
  blast.fx.missiles.push({x0:x0/P, y0:y0/P, x1:x1/P, y1:y1/P, t0:performance.now(), dur:150, hit:()=>{
    if(!on || on.dead) return;
    on.dead=true; on.deadAt=performance.now(); explode(x1,y1,20, on.star?["#7FE9FF","#FFFFFF"]:["#FFD35A","#7FE9FF","#F1E8D2"]); sfx(on.star?"bonus":"boom");
    if(quiet) return;
    const far=Math.round(on.r/blast.R*10), pts=mulPts(((on.star?50:10)+far)*(blast.level+1));
    blast.score+=pts; blast.kills++; stats.streak=blast.kills; scoreboard(); popup(x1,y1-14,`+${pts}`, on.star?"#7FE9FF":undefined);
    blast.levelKills=(blast.levelKills||0)+1;
    if(blast.levelKills>=12+3*blast.level && blast.phase==="play"){          // 12 to move up, three more at each level
      blast.levelKills=0; const was=blast.level;
      for(let n=blast.level+1;n<FD_LEVELS.length;n++) if(fdLevelOk(n)){ blast.level=n; break; }
      blast.creep*=1.07; blast.gap=Math.max(1100,blast.gap*.9); sfx("level");
      banner(blast.level!==was?`LEVEL ${blast.level+1}`:"FASTER!", blast.level!==was?FD_LEVELS[blast.level].n.toUpperCase():""); fdLabels();
    }
    fdBar(); fdHelp();
  }});
  return !!on;
}
function fdHelp(){
  if(!blast || blast.kind!=="fifths") return;
  const L=FD_LEVELS[blast.level||0], f=fdFire(blast.aim,L);
  if(f.root){ arcadeMod(f.root); helpChord(f.root, f.q); } else { helpChord(null); helpString(f.note); }
}
// a chord from the buttons: fire, if it's the aimed key's
function fifthsChord(voices){
  if(!blast || blast.kind!=="fifths") return;
  if(blast.phase==="demo" && blast.demo){ endFdDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const L=FD_LEVELS[blast.level]; if(L.fire==="harp") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,devFifths()), f=fdFire(blast.aim,L);
  if(!isChord(pitches, pcOfName(f.root), f.q)){ heard(name,false,`NOT ${FD_KEYS[blast.aim]}'S ${L.fire==="minor"?"MINOR":L.fire==="dominant"?"DOMINANT":"CHORD"}`); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true); fdShoot();
}
function fifthsNote(pc){
  if(!blast || blast.kind!=="fifths") return;
  if(blast.phase==="demo" && blast.demo){ endFdDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const L=FD_LEVELS[blast.level]; if(L.fire!=="harp") return;
  const now=performance.now(); if(now<blast.jamUntil){ heard("",false,"JAMMED"); return; }
  if(pc!==pcOfName(FD_KEYS[blast.aim])){ heard(SHARP_NAMES[pc],false,`NOT ${FD_KEYS[blast.aim]}`); sfx("jam"); blast.jamUntil=now+900; return; }
  heard(FD_KEYS[blast.aim],true); fdShoot();
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="fifths" || !blast || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const letters = !(typeof kbOn==="function" && kbOn());          // in keyboard play the letters are the instrument's
  const d=Object.assign({ArrowLeft:-1,ArrowRight:1}, letters?{KeyA:-1,KeyD:1}:{})[e.code]; if(d){ e.preventDefault(); fdAimAt(blast.aim+d); }
});
// the circle drawn on the canvas: spokes, the aimed one lit, the enemies crawling in, the hub
// The wheel: spokes, rim, enemies and the hub's claw. Drawn on a canvas of its own at the screen's
// full resolution (the arcade's shared canvas is deliberately low-resolution, right for the stars but
// blocky for thin lines), in the same sizes as before: U is one of the shared canvas's pixels.
function fdDraw(_g, now){
  if(!blast.sharp || !blast.fx) return;
  const g=sharpBegin(blast.sharp);
  const U=PX, cx=blast.cx, cy=blast.cy, R=blast.R, hub=blast.hub, L=FD_LEVELS[blast.level||0];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, used=!L.spokes || L.spokes.includes(i), aimed=i===blast.aim;
    const danger=blast.foes.some(f=>!f.dead && f.spoke===i && f.r<blast.R*.45);
    g.strokeStyle = aimed ? "#FFD35A" : danger ? "#FF4B3E" : used ? "#3F4A8A" : "#1E2240"; g.lineWidth = (aimed ? 1.6 : 1)*U*.75;
    g.beginPath(); g.moveTo(cx+Math.sin(a)*hub, cy-Math.cos(a)*hub); g.lineTo(cx+Math.sin(a)*R, cy-Math.cos(a)*R); g.stroke();
  }
  // the rim, a twelve-sided ring joining the spokes
  g.strokeStyle="#3F4A8A"; g.lineWidth=U*.75; g.beginPath();
  for(let i=0;i<=12;i++){ const a=i*Math.PI/6; const x=cx+Math.sin(a)*R, y=cy-Math.cos(a)*R; i?g.lineTo(x,y):g.moveTo(x,y); } g.stroke();
  // enemies: little bow-ties across their spokes, wobbling as they come
  for(const f of blast.foes){ if(f.dead) continue;
    const a=f.spoke*Math.PI/6, r=f.r, x=cx+Math.sin(a)*r, y=cy-Math.cos(a)*r, sz=(3+(f.r/blast.R)*3)*U, t=a+Math.PI/2+Math.sin(now/180+f.wob)*.3;
    g.strokeStyle = f.star ? "#7FE9FF" : "#FF5AA0"; g.lineWidth=1.2*U*.75; g.beginPath();
    g.moveTo(x+Math.cos(t)*sz, y+Math.sin(t)*sz); g.lineTo(x-Math.cos(t)*sz*.4+Math.sin(t)*sz*.6, y-Math.sin(t)*sz*.4-Math.cos(t)*sz*.6);
    g.lineTo(x-Math.cos(t)*sz, y-Math.sin(t)*sz); g.lineTo(x+Math.cos(t)*sz*.4-Math.sin(t)*sz*.6, y+Math.sin(t)*sz*.4+Math.cos(t)*sz*.6); g.closePath(); g.stroke(); }
  // the hub: the player's claw, pointing down the aimed spoke
  const a=blast.aim*Math.PI/6, hurt=now-(blast.hurtAt||0)<500;
  g.fillStyle = hurt ? "#FF4B3E" : now<(blast.jamUntil||0) ? "#7FE9FF" : "#FFD35A";
  const tip=[cx+Math.sin(a)*hub, cy-Math.cos(a)*hub], l=[cx+Math.sin(a-2.4)*hub*.7, cy-Math.cos(a-2.4)*hub*.7], r=[cx+Math.sin(a+2.4)*hub*.7, cy-Math.cos(a+2.4)*hub*.7];
  g.beginPath(); g.moveTo(...tip); g.lineTo(...l); g.lineTo(cx,cy); g.lineTo(...r); g.closePath(); g.fill();
}

// ---------- Fifths Defender's demo ----------
function fdDemo(){
  if(!blast || blast.kind!=="fifths") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; blast.foes=[]; blast.creep=18; fdLayout(); fdLabels();
  const {el, token, say, sleep, step}=demoShell(endFdDemo);
  const play=demoPlay;
  sfx("attract");
  (async()=>{
    const turnTo=async i=>{ while(blast.aim!==i){ const d=mod(i-blast.aim,12)<=6?1:-1; blast.aim=mod(blast.aim+d,12); helpKnob(steerKnob(), blast.aim/12); sfx("aim", pcOfName(FD_KEYS[blast.aim])); fdLabels(); await step(260); } };
    try{
      say("FIFTHS DEFENDER","THE TWELVE KEYS STAND ROUND YOU IN FIFTHS. C AT THE TOP, G ONE STEP ROUND."); await step(4000);
      blast.foes.push({spoke:1, r:blast.R, wob:0},{spoke:11, r:blast.R*1.15, wob:2});
      say("AIM","AN ENEMY COMES DOWN THE G SPOKE. TURN A KNOB TO AIM AT G."); await turnTo(1); await step(1400);
      say("FIRE","PLAY G MAJOR AND YOU FIRE DOWN THE SPOKE."); await step(900); play([55,59,62,67]); fdShoot(true); await step(1800);
      say("NEIGHBOURS","F IS ONE STEP THE OTHER WAY FROM C. AIM, THEN PLAY F."); await turnTo(11); await step(900); play([53,57,60,65]); fdShoot(true); await step(1900);
      say("LATER LEVELS","THE RELATIVE MINOR, THE DOMINANT SEVENTH, OR THE KEY'S NOTE ON THE HARP FIRES INSTEAD."); await step(3800);
      say("READY?","DON'T LET THEM REACH THE MIDDLE."); sfx("level"); await step(2600);
      endFdDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endFdDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.foes=[]; blast.aim=0; fdLabels();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
