// Chord Breakout's capsules and their powers, and the coda.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- capsules ----------
// Some bricks hold a capsule, marked on the brick with its power's sign. Break the brick (with its
// chord, as any) and the capsule falls; catch it with the paddle for its power. One that falls past
// costs nothing. A timed power runs on its own clock, shown in the HUD; a new one takes over from the
// last. Losing a life ends a power, as Arkanoid's did.
//   CRESCENDO   fifteen seconds of the paddle half as wide again, growing from its middle
//   RITARDANDO  twelve seconds of every ball at two thirds speed: more time to play a cracked brick
//   DIVISI      the ball splits in three; only the last one past the paddle costs a life
//   FERMATA     fifteen seconds of the paddle catching the ball and holding it where it landed: aim,
//               then pluck any string (or click, or ↑, or space) to let it go; it goes by itself
//               after a couple of seconds
//   DA CAPO     a life back, or one more with every heart full (powers.js: it's every game's); caught
//               with every heart there can be, it gives nothing
// The Power Brick's ARPEGGIO (the chord's tones raining for the cannon) is chord-breakout.js's own.
// What runs is kept as blast.boPower = {k, powerUntil}, one key the bonus round's pause moves on.
const BO_POWERS={
  crescendo:{name:"CRESCENDO",  icon:"&lt;", secs:15, say:"THE PADDLE GROWS",                               page:"FOR 15 SECONDS THE PADDLE IS HALF AS WIDE AGAIN."},
  ritard:   {name:"RITARDANDO", icon:"🐢",   secs:12, say:"THE BALL SLOWS DOWN",                            page:"FOR 12 SECONDS EVERY BALL RUNS AT TWO THIRDS SPEED: MORE TIME TO PLAY A CRACKED BRICK."},
  divisi:   {name:"DIVISI",     icon:"∴",    secs:0,  say:"THE BALL SPLITS IN THREE",                       page:"THE BALL SPLITS IN THREE. ONLY THE LAST ONE PAST THE PADDLE COSTS A LIFE."},
  fermata:  {name:"FERMATA",    icon:"⏸",    secs:15, say:"THE PADDLE HOLDS THE BALL: PLUCK TO LET IT GO",  page:"FOR 15 SECONDS THE PADDLE CATCHES THE BALL AND HOLDS IT: AIM, THEN PLUCK ANY STRING TO LET IT GO."},
  dacapo:   DA_CAPO,
};
const BO_CAP_CHANCE=.08, BO_GROW=1.5, BO_SLOW=.66, BO_HOLD_MS=2400, BO_MAX_BALLS=5;
const boCapChance=()=> Math.random()<BO_CAP_CHANCE ? powerPick(BO_POWERS) : null;
const boCapIcon=k=>`<i class="puicon">${BO_POWERS[k].icon}</i>`;
const boCapLook=k=>`<span class="bocap pu-${k}">${boCapIcon(k)}${BO_POWERS[k].name}</span>`;
const boPowerOn=k=>{ const p=blast && blast.kind==="breakout" && blast.boPower; return !!(p && p.k===k && performance.now()<p.powerUntil); };
const boPaddleGrow=()=> boPowerOn("crescendo") ? BO_GROW : 1;
const boBallTime=()=> boPowerOn("ritard") ? BO_SLOW : 1;
// a capsule drops from where its brick was
function boCapDrop(k){
  if(!k.cap || !blast.field) return;
  const el=document.createElement("div"); el.className=`bocap pu-${k.cap}`; el.innerHTML=boCapIcon(k.cap)+BO_POWERS[k.cap].name;
  blast.field.appendChild(el);
  const c={k:k.cap, x:k.x+k.w/2, y:k.y+k.h/2, vy:110/speedMul(), el};
  el.style.transform=`translate(${c.x}px,${c.y}px) translate(-50%,-50%)`;
  blast.caps.push(c);
}
// every frame: the capsules fall and are caught or lost, the paddle's look follows the power, and a
// power runs out
function boCapTick(now, dt){
  const p=blast.paddle, H=blast.H||blast.field.clientHeight;
  for(const c of [...blast.caps]){
    c.y+=c.vy*dt; c.el.style.transform=`translate(${c.x}px,${c.y}px) translate(-50%,-50%)`;
    if(c.y+10>=blast.padY-BO_RING && c.y-10<=blast.padY+BO_PAD_H && Math.abs(c.x-(p.x+p.w/2))<p.w/2+30){ boCapTake(c); continue; }
    if(c.y>H+20){ c.el.remove(); blast.caps=blast.caps.filter(x=>x!==c); }
  }
  const pw=blast.boPower;
  if(pw && now>=pw.powerUntil){ const P=BO_POWERS[pw.k]; boPowerEnd(); popup(p.x+p.w/2, blast.padY-28, `${P.name} OVER`, "#9A93B5"); boBar(); }
  for(const k of Object.keys(BO_POWERS)) blast.padEl.classList.toggle(`pw-${k}`, boPowerOn(k));
  if(pw && Math.floor(now/250)!==blast.boBarTick){ blast.boBarTick=Math.floor(now/250); boBar(); }   // the countdown in the HUD
}
function boCapTake(c){
  c.el.remove(); blast.caps=blast.caps.filter(x=>x!==c);
  const P=BO_POWERS[c.k], p=blast.paddle;
  explode(c.x, blast.padY-6, 18, ["#FFD35A","#FFFFFF","#7FE9FF"]);
  if(P.instant){ popup(p.x+p.w/2, blast.padY-28, daCapo() ? "+1 ♥" : "HEARTS FULL", "#FF4B3E"); boBar(); return; }   // the wall was dealt it with room for a heart
  if(c.k==="divisi") boSplit();
  else { if(blast.boPower && blast.boPower.k!==c.k) boPowerEnd(); blast.boPower={k:c.k, powerUntil:performance.now()+P.secs*1000}; }
  if(blast.phase==="play") banner(P.name+"!", P.say);
  popup(p.x+p.w/2, blast.padY-28, P.name, "#FFD35A"); sfx("level"); boBar();
}
// a power over: the paddle narrows back by itself, and a held ball goes
function boPowerEnd(){
  if(!blast || !blast.boPower) return;
  const was=blast.boPower.k; blast.boPower=null;
  if(was==="fermata") boRelease();
}
// CRESCENDO: the paddle grows (or shrinks back) from its middle, a little each frame
function boPaddleGrowTick(dt){
  const p=blast.paddle; if(!p.base || !blast.padEl) return;
  const want=p.base*boPaddleGrow(); if(Math.abs(p.w-want)<.01) return;
  const nw = Math.abs(p.w-want)<.5 ? want : p.w+(want-p.w)*Math.min(1,dt*8), dw=nw-p.w;
  p.w=nw; p.x-=dw/2; if(p.target!=null) p.target-=dw/2;
  blast.padEl.style.width=p.w+"px";
}
// DIVISI: the ball splits in three, the two new ones a little either side of its line
function boSplit(){
  const src=blast.balls.find(b=>!b.stuck) || blast.ball; if(!src) return;
  const p=blast.paddle, room=BO_MAX_BALLS-blast.balls.length;
  const ang=src.stuck ? 0 : Math.atan2(src.vx, -src.vy);
  [-.42,.42].slice(0, Math.max(0,room)).forEach(da=>{
    const el=document.createElement("div"); el.className="boball extra"; blast.field.appendChild(el);
    const a=Math.max(-BO_MAXANG, Math.min(BO_MAXANG, ang+da)), sp=src.speed;
    const x=src.stuck ? p.x+p.w/2 : src.x, y=src.stuck ? blast.padY-BO_RING-BO_R : src.y;
    const b={x, y, vx:Math.sin(a)*sp, vy:-Math.cos(a)*sp, speed:sp, base:src.base||sp, stuck:false, el};
    el.style.transform=`translate(${b.x-BO_R}px,${b.y-BO_R}px)`;
    blast.balls.push(b);
  });
}
// FERMATA: the paddle catches a ball and holds it where it landed
function boCatch(b, now){
  const p=blast.paddle;
  b.stuck=true; b.caught=true; b.hold=b.x-p.x; b.releaseAt=now+BO_HOLD_MS; b.el.classList.add("caught");
}
// let a held ball go (or every held ball): off the paddle as if it had just bounced there
function boRelease(which){
  if(!blast || !blast.balls) return;
  for(const b of blast.balls){ if(!b.caught || (which && b!==which)) continue;
    b.caught=false; b.stuck=false; b.el.classList.remove("caught"); boPaddleBounce(b); sfx("shoot"); }
}
// the balls past the first, gone
function boExtraClear(){
  if(!blast || !blast.balls) return;
  blast.balls.forEach(b=>{ if(b.el && b.el!==blast.ballEl) b.el.remove(); });
  blast.balls=blast.balls.filter(b=>b.el===blast.ballEl);
}
function boCapsClear(){ if(!blast) return; (blast.caps||[]).forEach(c=>c.el.remove()); blast.caps=[]; }
// a fresh start: no capsules, no power, one ball, the paddle its own width
function boPowersClear(){
  if(!blast) return;
  boCapsClear(); boExtraClear(); blast.boPower=null;
  (blast.balls||[]).forEach(b=>{ b.caught=false; b.el && b.el.classList.remove("caught"); });
  const p=blast.paddle; if(p && p.base){ p.w=p.base; if(blast.padEl) blast.padEl.style.width=p.w+"px"; }
  if(blast.padEl) Object.keys(BO_POWERS).forEach(k=>blast.padEl.classList.remove(`pw-${k}`));
}
// the HUD's word for what's running
function boPowerHud(){
  const p=blast && blast.boPower; if(!p || !boPowerOn(p.k)) return "";
  return ` · ${BO_POWERS[p.k].name} ${Math.max(0,Math.ceil((p.powerUntil-performance.now())/1000))}`;
}

// ---------- the coda ----------
// The last few bricks of a wall can take a long time to find: the ball bounces round the empty
// screen. So when only three are left, or six and the ball has gone nine seconds without touching a
// brick, the coda begins: every brick left opens, its chord playable straight away, no hit needed,
// and a paddle bounce doesn't close it again. A bonus, fifty a brick, drains away over fifteen
// seconds; what's left of it when the wall is clear is scored. The ball still has to be kept going.
const BO_CODA_LEFT=3, BO_CODA_STALE_LEFT=6, BO_CODA_STALE_MS=9000, BO_CODA_MS=15000, BO_CODA_POT=50;
function boCodaCheck(now){
  if(!blast || blast.phase!=="play" || blast.coda) return;
  const left=blast.bricks.filter(k=>k.alive).length; if(!left) return;
  const stale=now-(blast.boTouchAt||now)>BO_CODA_STALE_MS && !blast.balls.every(b=>b.stuck);
  if(left<=BO_CODA_LEFT || (left<=BO_CODA_STALE_LEFT && stale)) boCoda(now);
}
function boCoda(now, quiet){
  const open=blast.bricks.filter(k=>k.alive);
  blast.coda={codaUntil:now+BO_CODA_MS, pot:BO_CODA_POT*open.length};
  open.forEach(k=>{ k.open=true; if(!k.cracked){ k.cracked=true; k.crackedAt=now; } k.el.classList.add("cracked","open"); });
  if(!quiet){ banner("CODA!", "THE LAST BRICKS ARE OPEN: PLAY THEIR CHORDS"); sfx("level"); }
  boHelp(); boBar();
}
// what the coda's bonus stands at now, before the level
const boCodaLeft=()=>{ const c=blast && blast.coda; if(!c) return 0; return Math.max(0, Math.round(c.pot*(c.codaUntil-performance.now())/BO_CODA_MS)); };
function boCodaTick(now){
  if(!blast.coda){ boCodaCheck(now); return; }
  if(Math.floor(now/250)!==blast.codaBarTick){ blast.codaBarTick=Math.floor(now/250); boBar(); }
}
// the wall clear: what's left of the bonus is scored
function boCodaPay(){
  const c=blast.coda; blast.coda=null; if(!c || blast.phase!=="play") return;
  const left=Math.max(0, Math.round(c.pot*(c.codaUntil-performance.now())/BO_CODA_MS));
  if(!left) return;
  const pts=mulPts(left*(blast.level+1)); blast.score+=pts;
  popup(blast.W/2, blast.H/2+40, `CODA +${pts}`, "#FFD35A"); sfx("bonus"); boBar();
}
const boCodaHud=()=> blast && blast.coda ? ` · CODA +${mulPts(boCodaLeft()*(blast.level+1))}` : "";
