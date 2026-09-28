// Chord Breakout: a knob steers the paddle; crack a chord brick and play its chord to break it. With
// its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Breakout ----------
// Arkanoid with chords. A wall of chord bricks, a ball, and a paddle steered with one of the
// minichord's knobs, as Arkanoid's was with a dial (or the mouse, or the arrow keys). The ball
// cracks a brick it hits; the brick only breaks if its chord is played before the ball comes back
// to the paddle, and heals if it isn't. Clear the wall to move on; let the ball past and it costs a
// life. The knobs need firmware 17's "knobs send MIDI" (address 238), which the game turns on
// while it plays; any knob steers, whichever moved last.
const BO_LEVELS=[
  {n:"Major and minor", qs:["","m"], roots:"natural"},
  {n:"Sevenths", qs:["","m","7"], roots:"natural"},
  {n:"Sharps and flats", qs:["","m","7"], roots:"all"},
  {n:"Every chord type", qs:["","m","7","maj7","m7","°","+"], roots:"all"},
  {n:"Slash chords", qs:["","m"], roots:"natural", slash:true},
];
const boLevelOk=i=> !BO_LEVELS[i].slash || slashReady();
const knobsReady=()=>canWrite() && hasSetting(238) && (mc.params[7]??0)>=10;   // the setting, on firmware that has it
function genBreakout(){
  return {kind:"breakout", prompt:"Chord Breakout", sub:"Turn a knob on the minichord to move the paddle (or use the mouse or arrow keys). The ball cracks the chord brick it hits: play that chord before the ball comes back to the paddle and the brick breaks, or it heals. Clear the wall to go on; let the ball past and it costs a life.",
    answer:{type:"breakout", get name(){ const b=boTarget(); return b ? b.sym : "a cracked brick's chord"; }},
    get hint(){ const b=boTarget(); return b ? `The cracked brick is ${b.sym}.` : "Hit a brick first."; },
    context:0};
}
// the brick to play now: the one cracked longest ago
const boTarget=()=> blast && blast.kind==="breakout" ? blast.bricks.filter(b=>b.alive && b.cracked).sort((a,b)=>a.crackedAt-b.crackedAt)[0]||null : null;
function startBreakout(){
  blast={kind:"breakout", bricks:[], score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), ball:null, paddle:{x:0, target:null, w:120}, rally:0};
  boDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  boMenu();
  blast.raf=requestAnimationFrame(boTick);
}
function boDevice(){
  if(!blast || blast.kind!=="breakout" || !canWrite()) return;
  arcadeSetup(()=>{ if(hasSetting(30)) ensure(30,0); if(slashReady()) ensure(113,1); if(knobsReady()) borrow(238,1); });
  const sig=BO_LEVELS.map((_,i)=>boLevelOk(i)).join()+knobsReady();
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ const hid=blast.overlay.hidden; blast.overlay.remove(); blast.overlay=null; boMenu(); blast.overlay.hidden=hid; }
}
function buildBreakoutField(box){
  const field=document.createElement("div"); field.className="field arcade breakout"; field.setAttribute("aria-label","The Chord Breakout wall");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const pad=document.createElement("div"); pad.className="bopaddle"; field.appendChild(pad);
  const ball=document.createElement("div"); ball.className="boball"; field.appendChild(ball);
  box.append(field);
  if(blast && blast.kind==="breakout"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.padEl=pad; blast.ballEl=ball; blast.fx=fxInit(field);
    blast.bricks.forEach(b=>field.appendChild(b.el));
    setTimeout(()=>{ applyChordSize(); boLayout(); });
    if(blast.overlay) field.appendChild(blast.overlay);
    // the mouse or a finger can steer too
    field.addEventListener("pointermove", e=>{ if(blast && blast.kind==="breakout" && mouseMaySteer()){ const r=field.getBoundingClientRect(); blast.paddle.target=e.clientX-r.left-blast.paddle.w/2; blast.steer="mouse"; } });
  }
  boBar(); setTimeout(helperSync);
}
function boBar(){
  if(!blast || blast.kind!=="breakout" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const BOMENU_G={key:"breakout", title:"CHORD BREAKOUT",
  rules:()=>`<p>${knobsReady() ? "TURN A KNOB ON THE MINICHORD TO MOVE THE PADDLE (THE MOD KNOB, OR CHOOSE ANOTHER)." : "MOVE THE PADDLE WITH THE MOUSE OR THE ARROW KEYS. WITH FIRMWARE 17, A KNOB ON THE MINICHORD DOES IT."}</p><p>THE BALL CRACKS A CHORD BRICK. PLAY ITS CHORD BEFORE THE BALL COMES BACK AND IT BREAKS.</p><p>MISS IT AND THE BRICK HEALS. LET THE BALL PAST AND IT COSTS A LIFE.</p><p class="starline">${PIXEL_STAR}BRICKS SCORE FIVE TIMES AS MUCH.</p>`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("LABEL SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
    row("PADDLE", ["NARROW","NORMAL","WIDE"], ()=>saved.boPaddle??1, i=>{ saved.boPaddle=i; save(); });
  },
  levels:BO_LEVELS, ok:boLevelOk, needs:"NEEDS THE TEST FIRMWARE", sig:()=>String(knobsReady()),
  begin:i=>beginBreakout(i), demo:()=>boDemo(), modNote:"title"};
function boMenu(over){ arcadeMenu(BOMENU_G, over); }
// the wall: rows of chord bricks across the top, sized to the field
function boLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  blast.W=W; blast.H=H;
  const pw=[90,130,180][saved.boPaddle??1]; blast.paddle.w=pw; blast.padY=H-46;
  blast.padEl.style.width=pw+"px"; blast.padEl.style.top=blast.padY+"px";
  if(blast.paddle.x==null || blast.paddle.x===0) blast.paddle.x=(W-pw)/2;
  const cols=blast.cols||8, bw=(W-40)/cols;
  blast.bricks.forEach(b=>{ b.x=20+b.c*bw+2; b.y=56+b.r*36; b.w=bw-4; b.h=30;
    b.el.style.cssText=`left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`; });
}
function boPick(L){
  for(let k=0;k<40;k++){
    const root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS), q=rnd(L.qs), t=spellChord(root,q); if(!t) continue;
    let bass=null; if(L.slash && Math.random()<.6){ bass=rnd([t[1],t[2]]); }
    return {root, q, bass, sym:root+q+(bass?"/"+bass:""), rootPc:pcOfName(root), bassPc:bass?pcOfName(bass):null};
  }
  return {root:"C", q:"", bass:null, sym:"C", rootPc:0, bassPc:null};
}
function boWall(){
  blast.bricks.forEach(b=>b.el.remove()); blast.bricks=[];
  const L=BO_LEVELS[blast.level], rows=Math.min(5, 3+Math.floor(blast.level/2)), cols=8; blast.cols=cols;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const ch=boPick(L), bonus=Math.random()<.07;
    const el=document.createElement("div"); el.className="bobrick"+(bonus?" bonus":"")+` row${r%5}`;
    el.innerHTML=(bonus?PIXEL_STAR:""); el.append(ch.sym);
    blast.field.appendChild(el);
    blast.bricks.push({...ch, el, r, c, alive:true, cracked:false, bonus});
  }
  boLayout();
}
function boServe(){
  const p=blast.paddle; blast.ball={x:p.x+p.w/2, y:blast.padY-9, vx:0, vy:0, stuck:true, speed:(300/speedMul())*Math.pow(1.05,blast.level)};
  blast.serveAt=performance.now()+1300;
}
function beginBreakout(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phase:"play", over:false, rally:0, modFor:null});
  saved.breakoutStart=level; save();
  stats.streak=0; scoreboard(); boLayout(); boWall(); boServe();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(boTick);
  banner(`LEVEL ${level+1}`, `${BO_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); boBar();
}
function boTick(now){
  if(!blast || blast.kind!=="breakout") return;
  const dt=Math.min(.033,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if((blast.phase==="play" || blast.phase==="demo") && blast.ball){
    const p=blast.paddle, W=blast.W||blast.field.clientWidth;
    // the paddle: toward the knob's or the mouse's position, or pushed by the arrow keys
    if(blast.phase==="demo" && blast.ball) p.target=blast.ball.x-p.w/2+Math.sin(now/300)*p.w*.2;
    if(blast.keyDir) p.target=(p.target??p.x)+blast.keyDir*520*dt;
    if(p.target!=null){ p.target=Math.max(0,Math.min(W-p.w,p.target)); p.x+=(p.target-p.x)*Math.min(1,dt*18); }
    blast.padEl.style.transform=`translateX(${p.x}px)`;
    boBall(now, dt);
  }
  blast.raf=requestAnimationFrame(boTick);
}
// The ball moves in small steps, never more than two pixels at a time, so it can't pass through a
// brick's corner between frames. It's a circle: against a brick it bounces off the side it actually
// struck, or off a corner at the angle the corner turns it, and it's lifted clear of whatever it hit
// so it never sticks. Off the paddle, the further from its middle, the steeper the bounce, and it
// never leaves too flat to come back.
const BO_R=7;
function boBall(now, dt){
  const b=blast.ball, p=blast.paddle, R=BO_R;
  if(b.stuck){
    b.x=p.x+p.w/2; b.y=blast.padY-R-2;
    if(now>=blast.serveAt){ const a=(Math.random()-.5)*.8; b.vx=Math.sin(a)*b.speed; b.vy=-Math.cos(a)*b.speed; b.stuck=false; sfx("shoot"); }
  } else {
    const dist=Math.hypot(b.vx,b.vy)*dt, steps=Math.max(1,Math.ceil(dist/2)), h=dt/steps;
    for(let i=0;i<steps;i++){ if(boStep(now, h)===false) return; }
  }
  blast.ballEl.style.transform=`translate(${b.x-R}px,${b.y-R}px)`;
}
// one small step; false when the ball has gone
function boStep(now, h){
  const b=blast.ball, p=blast.paddle, W=blast.W, H=blast.H, R=BO_R, top=40;
  const px=b.x, py=b.y;
  b.x+=b.vx*h; b.y+=b.vy*h;
  // the walls: reflected exactly where it met them
  if(b.x<R){ b.x=R+(R-b.x); b.vx=Math.abs(b.vx); }
  else if(b.x>W-R){ b.x=(W-R)-(b.x-(W-R)); b.vx=-Math.abs(b.vx); }
  if(b.y<top+R){ b.y=top+R+(top+R-b.y); b.vy=Math.abs(b.vy); }
  // the paddle: met on its way down, as it crosses the paddle's top edge
  const pt=blast.padY;
  if(b.vy>0 && py+R<=pt+1 && b.y+R>=pt && b.x>=p.x-R*.7 && b.x<=p.x+p.w+R*.7){
    const off=Math.max(-1,Math.min(1,(b.x-(p.x+p.w/2))/(p.w/2))), a=off*1.05;   // up to 60° either side
    b.vx=Math.sin(a)*b.speed; b.vy=-Math.cos(a)*b.speed; b.y=pt-R;
    sfx("press"); boHeal();
    return true;
  }
  // a brick: the nearest point of it to the ball's centre gives the side or corner it struck
  for(const k of blast.bricks){
    if(!k.alive) continue;
    const nx=Math.max(k.x,Math.min(b.x,k.x+k.w)), ny=Math.max(k.y,Math.min(b.y,k.y+k.h));
    let dx=b.x-nx, dy=b.y-ny, d=Math.hypot(dx,dy);
    if(d>=R) continue;
    let ux, uy;
    if(d>1e-6){ ux=dx/d; uy=dy/d; }
    else {                                      // the centre got inside: out the way it came in
      const l=b.x-k.x, r=k.x+k.w-b.x, t=b.y-k.y, bo=k.y+k.h-b.y, m=Math.min(l,r,t,bo);
      [ux,uy] = m===l?[-1,0] : m===r?[1,0] : m===t?[0,-1] : [0,1]; d=0;
    }
    b.x=nx+ux*(R+.5); b.y=ny+uy*(R+.5);      // lifted clear
    const vn=b.vx*ux+b.vy*uy;
    if(vn<0){ b.vx-=2*vn*ux; b.vy-=2*vn*uy; } // reflected about the surface it struck
    boKeepAngle(b);
    if(!k.cracked){ k.cracked=true; k.crackedAt=now; k.el.classList.add("cracked"); sfx("key"); boHelp(); }
    else sfx("press");
    if(blast.phase==="demo" && blast.demoAuto) gameLater(()=>{ if(blast && k.alive && k.cracked) boBreak(k, true); }, 650);
    break;
  }
  if(b.y>H+R){ if(blast.phase==="demo"){ boServe(); return false; } boLost(); return false; }
  return true;
}
// the speed stays the same, and the ball never runs so flat it takes forever to come back
function boKeepAngle(b){
  const sp=b.speed, minVy=sp*.28;
  if(Math.abs(b.vy)<minVy){ b.vy=(b.vy<0?-1:1)*minVy; }
  const m=Math.hypot(b.vx,b.vy)||1; b.vx*=sp/m; b.vy*=sp/m;
}
function boHeal(){
  let healed=0;
  blast.bricks.forEach(k=>{ if(k.alive && k.cracked){ k.cracked=false; k.el.classList.remove("cracked"); healed++; } });
  if(healed && blast.phase==="play"){ popup(blast.paddle.x+blast.paddle.w/2, blast.padY-24, healed>1?`${healed} HEALED`:"HEALED", "#FF7A6E"); blast.rally=0; }
  boHelp();
}
function boHelp(){ const t=boTarget(); if(t){ arcadeMod(t.root); helpChord(t.root, t.q, t.bass); } else helpChord(null); }
function boBreak(k, quiet){
  k.alive=false; k.el.classList.add("gone"); setTimeout(()=>k.el.remove(),300);
  explode(k.x+k.w/2, k.y+k.h/2, 22, k.bonus?["#7FE9FF","#FFFFFF","#FFD35A"]:["#FFD35A","#FF8A3D","#F1E8D2"]);
  sfx(k.bonus?"bonus":"boom");
  if(!quiet){ blast.rally++; const pts=mulPts((k.bonus?5:1)*spellChord(k.root,k.q).length*10*(blast.level+1)*Math.min(4,blast.rally));
    blast.score+=pts; popup(k.x+k.w/2, k.y, `+${pts}${blast.rally>1?` ×${Math.min(4,blast.rally)}`:""}`, k.bonus?"#7FE9FF":undefined); boBar(); stats.streak=blast.rally; scoreboard(); }
  boHelp();
  if(!blast.bricks.some(x=>x.alive)){
    if(blast.phase==="demo"){ boWall(); return; }
    // a clear wall: the next level, a new wall, a little faster
    const was=blast.level; for(let n=blast.level+1;n<BO_LEVELS.length;n++) if(boLevelOk(n)){ blast.level=n; break; }
    sfx("level"); banner(blast.level!==was ? `LEVEL ${blast.level+1}` : "WALL CLEAR!", blast.level!==was ? BO_LEVELS[blast.level].n.toUpperCase() : "FASTER");
    if(blast.level===was) blast.ball.speed*=1.08;
    gameLater(()=>{ if(blast && blast.kind==="breakout" && blast.phase==="play"){ boWall(); boServe(); boBar(); } }, 900);
  }
}
function boLost(){
  explode(blast.ball.x, blast.H-20, 26, ["#FF4B3E","#FF8A3D","#FFD35A"]);
  sfx("miss"); buzz(blast.field,true); blast.lives--; boBar(); boHeal();
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true; blast.ball=null; blast.ballEl.style.transform="translate(-40px,-40px)";
    const best=Math.max(saved.best.breakout||0, blast.score); saved.best.breakout=best; save();
    boMenu(true); return;
  }
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`); boServe();
}
// a chord from the buttons: every cracked brick of that chord breaks
function breakoutChord(voices){
  if(!blast || blast.kind!=="breakout") return;
  if(blast.phase==="demo" && blast.demo){ endBoDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,devFifths());
  const matches=i=>{
    if(i.bassPc==null) return isChord(pitches,i.rootPc,i.q);
    const tones=FORM[i.q].map(f=>mod(i.rootPc+f[1],12)), pcs=pitches.map(p=>mod(Math.round(p),12));
    return mod(Math.round(Math.min(...pitches)),12)===i.bassPc && pcs.every(p=>p===i.bassPc || tones.includes(p)) && pcs.includes(tones[1]);
  };
  const hits=blast.bricks.filter(k=>k.alive && k.cracked && matches(k));
  if(!hits.length){ heard(name,false,"NO CRACKED BRICK"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  hits.forEach(k=>boBreak(k));
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="breakout" || !blast || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1}[e.code]; if(d){ e.preventDefault(); blast.keyDir=d; blast.steer="keys"; }
});
document.addEventListener("keyup", e=>{ if(blast && blast.kind==="breakout" && ["ArrowLeft","KeyA","ArrowRight","KeyD"].includes(e.code)) blast.keyDir=0; });
// a knob: it wakes a title screen; in the games that use one, it steers
// Only the chosen knob steers (the modulation knob unless the player picks another on the title
// screen), so brushing a neighbour mid-game doesn't throw the paddle or the aim across the screen.
// A one-step wobble back the way it came is ignored, so a knob resting between two values holds
// still. And while the minichord is sending its knobs, the mouse doesn't steer, so a hand resting on
// the mouse can't fight the knob.
const KNOB_NAMES=["CHORD","HARP","MOD"];
const steerKnob=()=> saved.steerKnob ?? 2;
const knobHold={};
mc.addEventListener("knob", e=>{
  if(!blast || !blast.field) return;
  const {knob, value}=e.detail;
  if(blast.hsEntry){ if(knob===steerKnob()) blast.hsEntry.knob(value); return; }
  if(cabWaiting()){
    const base=(blast.knobBase||(blast.knobBase={}));
    if(base[knob]==null) base[knob]=value;                                   // the first report is where it rests
    else if(knob===steerKnob() && Math.abs(value-base[knob])>.08){ base[knob]=null; cabWake(); }   // a real turn wakes it
    return;
  }
  if(blast.knobBase) blast.knobBase={};
  if(knob!==steerKnob()) return;
  const step=Math.round(value*127), h=knobHold[knob] || (knobHold[knob]={last:null, dir:0});
  const d = h.last==null ? 1 : step-h.last;                                   // the first reading always counts
  if(d===0 || (h.last!=null && Math.abs(d)===1 && h.dir && Math.sign(d)!==h.dir)) return;   // a wobble back: hold
  h.dir=Math.sign(d); h.last=step; blast.knobAt=performance.now();
  const v=step/127;
  if(blast.kind==="stack") return stKnob(v);
  if(blast.kind==="fifths") return fdKnob(v);
  if(blast.kind!=="breakout") return;
  const W=blast.W||blast.field.clientWidth; blast.paddle.target=v*(W-blast.paddle.w); blast.steer="knob";
});
// the mouse steers only when the knobs can't: no minichord sending them, and none turned lately
const mouseMaySteer=()=> !knobsReady() && performance.now()-(blast?.knobAt||0)>4000;
// the knob games' title screens: which knob steers
function knobRow(opts){
  const r=document.createElement("div"); r.className="optrow"; const l=document.createElement("span"); l.className="optlabel"; l.textContent="STEER WITH";
  const g=document.createElement("div"); g.className="levels";
  const mark=b=>{ [...g.children].forEach(x=>{ x.style.background=""; x.style.color=""; }); b.style.background="#F1E8D2"; b.style.color="#16132A"; };
  KNOB_NAMES.forEach((n,i)=>{ const b=document.createElement("button"); b.textContent=`${n} KNOB`; if(steerKnob()===i) mark(b);
    b.onclick=()=>{ saved.steerKnob=i; save(); mark(b); }; g.appendChild(b); });
  r.append(l,g);
  const before=opts.querySelector("p.blink") || [...opts.querySelectorAll(".levels")].pop();
  opts.insertBefore(r, before);
}

// ---------- Chord Breakout's demo ----------
// The game plays itself: the paddle follows the ball, and each brick cracked is played a moment later.
function boDemo(){
  if(!blast || blast.kind!=="breakout") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; blast.demoAuto=true; boLayout(); boWall(); boServe(); blast.serveAt=performance.now()+900;
  const {el, token, say, sleep, step}=demoShell(endBoDemo);
  sfx("attract");
  (async()=>{
    try{
      say("CHORD BREAKOUT", knobsReady() ? "TURN A KNOB ON THE MINICHORD TO MOVE THE PADDLE." : "MOVE THE PADDLE WITH A KNOB, THE MOUSE OR THE ARROW KEYS."); await step(4200);
      say("CRACK IT","THE BALL CRACKS THE BRICK IT HITS. IT GLOWS."); await step(4200);
      say("PLAY IT","PLAY THAT CHORD BEFORE THE BALL COMES BACK AND THE BRICK BREAKS."); await step(4500);
      say("OR IT HEALS","IF THE BALL REACHES THE PADDLE FIRST, THE BRICK HEALS."); await step(4000);
      say("READY?","CLEAR THE WALL. DON'T LET THE BALL PAST."); sfx("level"); await step(3200);
      endBoDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endBoDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoAuto=false; blast.ball=null; blast.ballEl.style.transform="translate(-40px,-40px)";
  blast.bricks.forEach(b=>b.el.remove()); blast.bricks=[];
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
