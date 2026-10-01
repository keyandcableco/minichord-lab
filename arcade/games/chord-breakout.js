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
// The bricks carry every chord type Chord Invaders drops, worth what they're worth there (major least,
// Barry Harris's sixths and diminished sevenths most), half as much again for the modifier or a slash.
// Some bricks carry a power-up: broken, they rain their chord's tones and the paddle turns into a
// cannon, still steered by the knob, that fires at a tone when it's under it and that note is plucked
// on the harp. The ball keeps going the whole time, and the tones are only a bonus: one that reaches
// the paddle is simply gone. Shoot the whole chord for double.
// Other bricks hold a capsule, which falls when the brick breaks; catch it with the paddle for its
// power (chord-breakout-power.js). When only a few bricks are left (or a few, and the ball has gone a
// while without touching one), the CODA: the last bricks open, their chords playable without a hit,
// for a bonus that drains away. Every two levels, its own bonus round, CHORD CATCH (bonus.js).
const BO_LEVELS=[
  {n:"Major and minor", qs:["","m"], roots:"natural"},
  {n:"Sevenths", qs:["","m","7"], roots:"natural"},
  {n:"Sharps and flats", qs:["","m","7"], roots:"all"},
  {n:"maj7 and m7", qs:["","m","7","maj7","m7"], roots:"all"},
  {n:"Every chord type", qs:["","m","7","maj7","m7","°","+"], roots:"all"},
  {n:"Slash chords", qs:["","m"], roots:"natural", slash:true},
  {n:"Barry Harris", qs:["","m","7","maj7","m7","°","+"], roots:"all", barry:true},
];
const boLevelOk=i=> !(BO_LEVELS[i].slash && !slashReady()) && !(BO_LEVELS[i].barry && (!canWrite() || settings.set==="barry"))
  && !((BO_LEVELS[i].slash || BO_LEVELS[i].barry) && !mxStandard());      // slash chords and Barry Harris are standard-matrix lessons
const boLevelName=i=>mxLevelName(BO_LEVELS[i].n, j=>BO_LEVELS[j].qs, i);
// what a brick is worth before the rally and the level: Chord Invaders' ladder
function boPoints(k){
  let p=BLAST_WORTH[k.q] ?? 10;
  const {li,acc}=parse(k.root); if(acc!==keyAcc(li, devFifths())) p*=1.5;
  if(k.bass) p*=1.5;
  if(k.bonus) p*=5;
  return Math.round(p);
}
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
  blast={kind:"breakout", bricks:[], balls:[], caps:[], score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), paddle:{x:0, target:null, w:120, base:120, vx:0}, rally:0};
  // the ball in play: the first of them (DIVISI makes more). Not a key of its own, so a bonus round's
  // pause doesn't move its clocks on twice.
  Object.defineProperty(blast, "ball", {get(){ return this.balls && this.balls[0] || null; }, configurable:true});
  boDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  boMenu();
  blast.raf=requestAnimationFrame(boTick);
}
function boDevice(){
  if(!blast || blast.kind!=="breakout" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(slashReady()) ensure(113,1); if(knobsReady()) borrow(238,1); });   // the harp chromatic, for the cannon
  const sig=BO_LEVELS.map((_,i)=>boLevelOk(i)).join()+knobsReady()+mxAvailable().length;
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ menuRebuild(()=>boMenu()); }
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
    field.addEventListener("pointerdown", ()=>{ if(blast && blast.kind==="breakout" && blast.phase==="play") boRelease(); });   // a click lets a held ball go
  }
  boBar(); setTimeout(helperSync);
}
function boBar(){
  if(!blast || blast.kind!=="breakout" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${mxTag()}${boPowerHud()}${boCodaHud()}</span><span class="lives">${livesHtml()}</span>`;
}
const BOMENU_G={key:"breakout", title:"CHORD BREAKOUT",
  rules:()=>`<p>${knobsReady() ? "TURN A KNOB ON THE MINICHORD TO MOVE THE PADDLE (THE MOD KNOB, OR CHOOSE ANOTHER)." : "MOVE THE PADDLE WITH THE MOUSE OR THE ARROW KEYS. WITH FIRMWARE 17, A KNOB ON THE MINICHORD DOES IT."}</p><p>THE BALL CRACKS A CHORD BRICK. PLAY ITS CHORD BEFORE THE BALL COMES BACK AND IT BREAKS.</p><p>MISS IT AND THE BRICK HEALS. LET THE BALL PAST AND IT COSTS A LIFE.</p><p>CATCH A FALLING CAPSULE WITH THE PADDLE FOR A POWER-UP.</p><p>THE LAST FEW BRICKS ARE THE CODA: THEY OPEN UP, SO PLAY THEIR CHORDS, QUICK, FOR A BONUS.</p><p class="starline">${PIXEL_STAR}BRICKS SCORE FIVE TIMES AS MUCH.</p>`,
  rows:row=>{
    mxRow(row, ()=>menuRebuild(()=>boMenu()));
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("LABEL SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
    row("PADDLE", ["NARROW","NORMAL","WIDE"], ()=>saved.boPaddle??1, i=>{ saved.boPaddle=i; save(); });
  },
  levels:BO_LEVELS, ok:boLevelOk, levelName:boLevelName, needs:"NEEDS THE TEST FIRMWARE", sig:()=>String(knobsReady())+mxAvailable().length,
  begin:i=>beginBreakout(i), demo:()=>boDemo(), modNote:"title"};
function boMenu(over){ arcadeMenu(BOMENU_G, over); }
// the wall: rows of chord bricks across the top, sized to the field
function boLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  blast.W=W; blast.H=H;
  const p=blast.paddle, pw=[90,130,180][saved.boPaddle??1]; p.base=pw; p.w=pw*boPaddleGrow(); blast.padY=H-46;
  blast.padEl.style.width=p.w+"px"; blast.padEl.style.top=blast.padY+"px";
  if(p.x==null || p.x===0) p.x=(W-p.w)/2;
  p.x=Math.max(0, Math.min(W-p.w, p.x));
  const cols=blast.cols||8, bw=(W-40)/cols;
  blast.bricks.forEach(b=>{ b.x=20+b.c*bw+2; b.y=56+b.r*36; b.w=bw-4; b.h=30;
    b.el.style.cssText=`left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`; });
}
function boPick(L){
  for(let k=0;k<40;k++){
    const q0=rnd(L.qs), q=!mxStandard() ? mxMap(q0) : blast.barry ? (BARRY_SWAP[q0]??q0) : q0;
    const root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS), t=spellChord(root,q); if(!t) continue;
    let bass=null; if(L.slash && Math.random()<.6){ bass=rnd([t[1],t[2]]); }
    return {root, q, bass, sym:root+q+(bass?"/"+bass:""), rootPc:pcOfName(root), bassPc:bass?pcOfName(bass):null};
  }
  return {root:"C", q:"", bass:null, sym:"C", rootPc:0, bassPc:null};
}
function boWall(){
  blast.bricks.forEach(b=>b.el.remove()); blast.bricks=[];
  const L=BO_LEVELS[blast.level], rows=Math.min(5, 3+Math.floor(blast.level/2)), cols=8; blast.cols=cols;
  if(L.barry && !blast.barry && canWrite()){ blast.barry=true; borrow(33,1); modPill(); }       // Barry Harris mode, for the sixths
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const ch=boPick(L), bonus=Math.random()<.07, power=!bonus && Math.random()<.09, cap=!bonus && !power ? boCapChance() : null;
    const el=document.createElement("div"); el.className="bobrick"+(bonus?" bonus":"")+(power?" power":"")+(cap?` capbrick pu-${cap}`:"")+` row${r%5}`;
    el.innerHTML=(bonus?PIXEL_STAR:"")+(cap?boCapIcon(cap):""); el.append(ch.sym);
    blast.field.appendChild(el);
    blast.bricks.push({...ch, el, r, c, alive:true, cracked:false, bonus, power, cap});
  }
  blast.coda=null; blast.boTouchAt=performance.now();
  boLayout();
}
// A new ball on the paddle, served after a moment. Its speed is the level's, and a wall cleared without
// a new level makes every ball after it a little faster. It quickens a little each time the paddle
// sends it back, up to a quarter more, and starts again from the level's speed with the next serve.
function boServe(){
  boExtraClear();
  const p=blast.paddle, sp=(300/speedMul())*Math.pow(1.05,blast.level)*(blast.faster||1);
  blast.ballEl.classList.remove("caught");
  blast.balls=[{x:p.x+p.w/2, y:blast.padY-BO_R-2, vx:0, vy:0, stuck:true, speed:sp, base:sp, el:blast.ballEl}];
  blast.serveAt=performance.now()+1300; blast.boTouchAt=performance.now();
}
function beginBreakout(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  boPowersClear();
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phase:"play", over:false, rally:0, modFor:null, faster:1, coda:null});
  saved.breakoutStart=level; save();
  stats.streak=0; scoreboard(); boLayout(); boWall(); boServe();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(boTick);
  mxApply();                                  // the minichord to the chosen matrix
  banner(`LEVEL ${level+1}`, `${boLevelName(level).toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); boBar();
}
function boTick(now){
  if(!blast || blast.kind!=="breakout") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if((blast.phase==="play" || blast.phase==="demo") && blast.ball){
    boPaddleTick(now, dt);
    if(blast.power) boPowerTick(now, dt);
    boCapTick(now, dt);                                              // capsules falling, a power running out
    if(blast.phase==="play") boCodaTick(now);
    if(blast.ball) boBall(now, dt);                                  // the ball never waits: keeping it going is the game
  } else if(blast.phase==="bonus" && blast.bonus && blast.paddle){
    boPaddleTick(now, dt);                                           // its own bonus round is caught with the paddle
    if(bonusPlaying() && blast.bonus.g.move) blast.bonus.g.move(blast.bonus, now, dt);
  }
  blast.raf=requestAnimationFrame(boTick);
}
// The paddle: toward the knob's or the mouse's position, or pushed by the arrow keys. Its speed is
// kept (smoothed), so a ball can take some of the paddle's sideways swing with it.
function boPaddleTick(now, dt){
  const p=blast.paddle, W=blast.W||blast.field.clientWidth, x0=p.x;
  if(blast.phase==="demo"){ const lead=boLowestBall();
    p.target = blast.demoAim!=null ? blast.demoAim-p.w/2 : lead ? lead.x-p.w/2+Math.sin(now/300)*p.w*.2 : p.target; }
  if(blast.phase==="demo" && blast.demo && typeof helpKnobFollow==="function") helpKnobFollow(steerKnob(), Math.max(0,Math.min(1,p.x/Math.max(1,W-p.w))));   // the paddle, on the on-screen knob
  boPaddleGrowTick(dt);                                            // CRESCENDO widening it, centred, or narrowing it back
  if(blast.keyDir) p.target=(p.target??p.x)+blast.keyDir*560*dt;
  if(p.target!=null){ p.target=Math.max(0,Math.min(W-p.w,p.target)); p.x+=(p.target-p.x)*Math.min(1,dt*22); }
  p.x=Math.max(0,Math.min(W-p.w,p.x));
  if(dt>0) p.vx=p.vx*.6+((p.x-x0)/dt)*.4;
  blast.padEl.style.transform=`translateX(${p.x}px)`;
}
// the ball the paddle should be under: the lowest one coming down, else the lowest
const boLowestBall=()=> [...blast.balls].sort((a,b)=>(b.vy>0)-(a.vy>0) || b.y-a.y)[0] || null;
// The ball moves in small steps, never more than two pixels at a time, so it can't pass through a
// brick's corner between frames. It's a circle: against a brick it bounces off the side it actually
// struck, or off a corner at the angle the corner turns it, and it's lifted clear of whatever it hit
// so it never sticks. Where it meets two bricks at once, at the seam between them, it bounces off
// the two together, as off one flat face, rather than off whichever corner came first.
// The paddle is what's drawn, its outline and its glow included, and a solid block, not a line: the
// ball is met by it however it arrives, from above, at a corner, or with the paddle swung into it
// from the side. Off its top (or any part of it above its middle) the ball goes back up: the further
// from the middle, the steeper, never straight up (that's the bounce that goes on forever, up and
// down the same column), and with a little of the paddle's sideways swing. Below its middle, only
// knocked aside.
const BO_R=7, BO_PAD_H=14, BO_RING=2, BO_MAXANG=1.12, BO_MINANG=.1;
function boBall(now, dt){
  const p=blast.paddle, R=BO_R, f=boBallTime();                  // RITARDANDO: the balls run slow
  for(const b of [...blast.balls]){
    if(b.stuck){
      if(b.caught){                                               // FERMATA: held where it landed, till it's let go
        b.hold=Math.max(R, Math.min(p.w-R, b.hold)); b.x=p.x+b.hold; b.y=blast.padY-BO_RING-R;
        if(now>=b.releaseAt) boRelease(b);
      } else {
        b.x=p.x+p.w/2; b.y=blast.padY-BO_RING-R;
        if(now>=blast.serveAt){ const a=(Math.random()<.5?-1:1)*(.15+Math.random()*.3); b.vx=Math.sin(a)*b.speed; b.vy=-Math.cos(a)*b.speed; b.stuck=false; sfx("shoot"); }
      }
    } else {
      const dist=Math.hypot(b.vx,b.vy)*dt*f, steps=Math.max(1,Math.ceil(dist/2)), h=dt*f/steps;
      let gone=false;
      for(let i=0;i<steps;i++){ if(boStep(b, now, h)===false){ gone=true; break; } }
      if(gone){ if(boDrop(b)===false) return; continue; }
    }
    b.el.style.transform=`translate(${b.x-R}px,${b.y-R}px)`;
  }
}
// one small step; false when the ball has gone past the paddle
function boStep(b, now, h){
  const W=blast.W, H=blast.H, R=BO_R, top=40;
  b.x+=b.vx*h; b.y+=b.vy*h;
  // the walls: reflected exactly where it met them
  if(b.x<R){ b.x=R+(R-b.x); b.vx=Math.abs(b.vx); }
  else if(b.x>W-R){ b.x=(W-R)-(b.x-(W-R)); b.vx=-Math.abs(b.vx); }
  if(b.y<top+R){ b.y=top+R+(top+R-b.y); b.vy=Math.abs(b.vy); }
  if(boPaddleHit(b, now)) return true;
  boBrickHit(b, now);
  if(b.y>H+R) return false;
  return true;
}
// the paddle as a solid block: what it struck, and where it sends the ball
function boPaddleHit(b, now){
  if(b.vy<=0) return false;                                     // only a ball coming down: one just sent up can't be caught again
  const p=blast.paddle, R=BO_R, x0=p.x-BO_RING, x1=p.x+p.w+BO_RING, y0=blast.padY-BO_RING, y1=blast.padY+BO_PAD_H+BO_RING;
  const nx=Math.max(x0,Math.min(b.x,x1)), ny=Math.max(y0,Math.min(b.y,y1));
  if(Math.hypot(b.x-nx, b.y-ny)>=R) return false;
  if(b.y > (y0+y1)/2){                                            // under its middle: only knocked aside, still falling
    const right=b.x>(x0+x1)/2; b.x = right ? x1+R : x0-R;
    b.vx = (right?1:-1)*Math.max(Math.abs(b.vx), b.speed*.35) + p.vx*.3; boKeepAngle(b);
    sfx("press"); return true;
  }
  boPaddleBounce(b);
  sfx("press"); boHeal();
  if(blast.phase==="play" && boPowerOn("fermata")) boCatch(b, now);
  return true;
}
// off the paddle's top: the angle from where it struck (past the end, at a corner, steepest), a
// little of the paddle's swing, never straight up; a little quicker each time
function boPaddleBounce(b){
  const p=blast.paddle, R=BO_R;
  const off=Math.max(-1.12, Math.min(1.12, (b.x-(p.x+p.w/2))/(p.w/2+BO_RING)));
  let a=off*1.0 + Math.max(-.22, Math.min(.22, p.vx/2400));
  if(Math.abs(a)<BO_MINANG) a=(a<0 || (a===0 && Math.random()<.5) ? -1 : 1)*BO_MINANG;
  a=Math.max(-BO_MAXANG, Math.min(BO_MAXANG, a));
  if(b.base) b.speed=Math.min(b.base*1.25, b.speed*1.015);
  b.vx=Math.sin(a)*b.speed; b.vy=-Math.cos(a)*b.speed; b.y=blast.padY-BO_RING-R;
}
// the bricks it touches: off them all together, the nearest one cracked
function boBrickHit(b, now){
  const R=BO_R, hits=[];
  for(const k of blast.bricks){
    if(!k.alive) continue;
    const nx=Math.max(k.x,Math.min(b.x,k.x+k.w)), ny=Math.max(k.y,Math.min(b.y,k.y+k.h));
    const dx=b.x-nx, dy=b.y-ny, d=Math.hypot(dx,dy);
    if(d>=R) continue;
    let ux, uy;
    if(d>1e-6){ ux=dx/d; uy=dy/d; }
    else {                                      // the centre got inside: out the way it came in
      const l=b.x-k.x, r=k.x+k.w-b.x, t=b.y-k.y, bo=k.y+k.h-b.y, m=Math.min(l,r,t,bo);
      [ux,uy] = m===l?[-1,0] : m===r?[1,0] : m===t?[0,-1] : [0,1];
    }
    hits.push({k, ux, uy, d});
  }
  if(!hits.length) return false;
  let sx=0, sy=0; hits.forEach(h=>{ sx+=h.ux; sy+=h.uy; });
  let m=Math.hypot(sx,sy); if(m<1e-6){ sx=hits[0].ux; sy=hits[0].uy; m=1; } sx/=m; sy/=m;
  for(const h of hits){                         // lifted clear of each
    const k=h.k, nx=Math.max(k.x,Math.min(b.x,k.x+k.w)), ny=Math.max(k.y,Math.min(b.y,k.y+k.h)), dx=b.x-nx, dy=b.y-ny, d=Math.hypot(dx,dy);
    if(d>=R+.5) continue;
    if(d>1e-6){ b.x=nx+dx/d*(R+.5); b.y=ny+dy/d*(R+.5); } else { b.x=nx+h.ux*(R+.5); b.y=ny+h.uy*(R+.5); }
  }
  const vn=b.vx*sx+b.vy*sy;
  if(vn<0){ b.vx-=2*vn*sx; b.vy-=2*vn*sy; }     // reflected about the face it struck
  boKeepAngle(b);
  const k=hits.sort((a,c)=>a.d-c.d)[0].k;       // the one it struck squarest
  blast.boTouchAt=now;
  if(!k.cracked){ k.cracked=true; k.crackedAt=now; k.el.classList.add("cracked"); sfx("key"); boHelp(); }
  else sfx("press");
  if(blast.phase==="demo" && blast.demoAuto) gameLater(()=>{ if(blast && k.alive && k.cracked){ helpChord(k.root, k.q); boBreak(k, true); } }, 650);
  return true;
}
// a ball gone past the paddle: the last one costs a life, any other just goes
function boDrop(b){
  if(blast.balls.length>1){
    blast.balls=blast.balls.filter(x=>x!==b);
    if(b.el===blast.ballEl){ const next=blast.balls[0]; b.el.style.transform=next.el.style.transform; next.el.remove(); next.el=blast.ballEl; }   // the main ball's element carries on with the next
    else b.el.remove();
    return true;
  }
  if(blast.phase==="demo"){ boServe(); return false; }
  boLost(b.x); return false;
}
// the speed stays the same, and the ball never runs so flat it takes forever to come back
function boKeepAngle(b){
  const sp=b.speed, minVy=sp*.34;
  if(Math.abs(b.vy)<minVy){ b.vy=(b.vy<0?-1:1)*minVy; }
  const m=Math.hypot(b.vx,b.vy)||1; b.vx*=sp/m; b.vy*=sp/m;
}
function boHeal(){
  let healed=0;
  blast.bricks.forEach(k=>{ if(k.alive && k.cracked && !k.open){ k.cracked=false; k.el.classList.remove("cracked"); healed++; } });
  if(healed && blast.phase==="play"){ popup(blast.paddle.x+blast.paddle.w/2, blast.padY-24, healed>1?`${healed} HEALED`:"HEALED", "#FF7A6E"); blast.rally=0; }
  boHelp();
}
function boHelp(){ const t=boTarget(); if(t){ arcadeMod(t.root); helpChord(t.root, t.q, t.bass); } else helpChord(null); }
function boBreak(k, quiet){
  k.alive=false; k.el.classList.add("gone"); setTimeout(()=>k.el.remove(),300);
  explode(k.x+k.w/2, k.y+k.h/2, 22, k.bonus?["#7FE9FF","#FFFFFF","#FFD35A"]:["#FFD35A","#FF8A3D","#F1E8D2"]);
  sfx(k.bonus?"bonus":"boom");
  if(!quiet && k.power) boPowerUp(k);
  if(k.cap && !quiet) boCapDrop(k);
  if(!quiet){ blast.rally++; const pts=mulPts(boPoints(k)*(blast.level+1)*Math.min(4,blast.rally));
    blast.score+=pts; popup(k.x+k.w/2, k.y, `+${pts}${blast.rally>1?` ×${Math.min(4,blast.rally)}`:""}`, k.bonus?"#7FE9FF":undefined); boBar(); stats.streak=blast.rally; scoreboard(); }
  boHelp();
  if(!blast.bricks.some(x=>x.alive)){
    if(blast.phase==="demo"){ blast.coda=null; boWall(); return; }
    boCodaPay();                                                     // the coda's bonus, what's left of it
    // a clear wall: the next level, a new wall; the same level again, a little faster
    const was=blast.level; for(let n=blast.level+1;n<BO_LEVELS.length;n++) if(boLevelOk(n)){ blast.level=n; break; }
    sfx("level"); banner(blast.level!==was ? `LEVEL ${blast.level+1}` : "WALL CLEAR!", blast.level!==was ? boLevelName(blast.level).toUpperCase() : "FASTER");
    if(blast.level===was) blast.faster=(blast.faster||1)*1.08;
    gameLater(()=>{ if(blast && blast.kind==="breakout" && blast.phase==="play"){ boCapsClear(); boWall(); boServe(); boBar(); } }, 900);
  } else if(!quiet) boCodaCheck(performance.now());
}
// ---------- the power brick, ARPEGGIO: the chord's tones rain, and the paddle's a cannon ----------
function boPowerUp(k){
  const tones=spellChord(k.root,k.q)||[]; if(!tones.length || (blast.phase!=="play" && blast.phase!=="demo")) return;
  const cx=k.x+k.w/2, spread=Math.min(blast.W*.8, 90*tones.length);
  blast.power={chord:k.sym, total:tones.length, shot:0, tones:tones.map((n,i)=>{ const el=document.createElement("div"); el.className="botone"; el.textContent=n; blast.field.appendChild(el);
    return {name:n, pc:pcOfName(n), x:Math.max(30,Math.min(blast.W-30, cx+(i-(tones.length-1)/2)*spread/Math.max(1,tones.length-1||1))), y:k.y+k.h, vy:(38+Math.random()*16)/speedMul(), el}; })};
  blast.padEl.classList.add("cannon");
  banner("ARPEGGIO!", `SHOOT ${k.sym}'S TONES FOR A BONUS, AND KEEP THE BALL GOING`); sfx("bonus");
}
function boPowerTick(now, dt){
  const pw=blast.power, p=blast.paddle;
  for(const t of pw.tones){ if(t.gone) continue;
    t.y+=t.vy*dt; t.el.style.transform=`translate(${t.x}px,${t.y}px) translate(-50%,-50%)`;
    const under=Math.abs(t.x-(p.x+p.w/2))<p.w*.35; t.el.classList.toggle("aimed", under);
    if(t.y>=blast.padY){ t.gone=true; t.el.classList.add("lost"); setTimeout(()=>t.el.remove(),400); } }
  const lowest=pw.tones.filter(t=>!t.gone).sort((a,b)=>b.y-a.y)[0];
  if(lowest && lowest!==pw.helped){ pw.helped=lowest; helpString(lowest.pc); }
  if(pw.tones.every(t=>t.gone)) boPowerDone();
}
// a harp note: the cannon fires at the tone above it, if that's the note
function breakoutNote(pc){
  if(!blast || blast.kind!=="breakout" || blast.phase!=="play") return;
  if(blast.balls.some(b=>b.caught)){ boRelease(); return; }        // FERMATA: a pluck lets the held ball go
  if(!blast.power) return;
  const pw=blast.power, p=blast.paddle, cx=p.x+p.w/2;
  const same=pw.tones.filter(t=>!t.gone && t.pc===mod(pc,12));
  if(!same.length){ heard(SHARP_NAMES[mod(pc,12)],false,"NOT IN THE CHORD"); sfx("miss"); return; }
  const t=same.find(t=>Math.abs(t.x-cx)<p.w*.35);
  if(!t){ heard(same[0].name,false,"LINE THE CANNON UP UNDER IT"); return; }
  t.gone=true; pw.shot++;
  const P=PX; blast.fx.missiles.push({x0:cx/P, y0:blast.padY/P, x1:t.x/P, y1:t.y/P, t0:performance.now(), dur:140, hit:()=>{ t.el.remove(); explode(t.x,t.y,18,["#7FE9FF","#FFD35A","#F1E8D2"]); }});
  const pts=mulPts(20*(blast.level+1)); blast.score+=pts; popup(t.x,t.y-16,`${t.name} +${pts}`,"#7FE9FF"); heard(t.name,true); sfx("shoot"); boBar();
}
// the demo's cannon: what a harp pluck does, lined up under the tone
function boDemoShoot(t){
  const pw=blast.power; if(!pw || t.gone) return;
  const p=blast.paddle, cx=p.x+p.w/2, P=PX; t.gone=true; pw.shot++; helpString(t.pc); demoPlay([60+t.pc]);
  blast.fx.missiles.push({x0:cx/P, y0:blast.padY/P, x1:t.x/P, y1:t.y/P, t0:performance.now(), dur:140, hit:()=>{ t.el.remove(); explode(t.x,t.y,18,["#7FE9FF","#FFD35A","#F1E8D2"]); }});
  popup(t.x,t.y-16,t.name,"#7FE9FF"); sfx("shoot");
}
function boPowerDone(){
  const pw=blast.power; blast.power=null; helpChord(null);
  blast.padEl.classList.remove("cannon"); blast.ballEl.classList.remove("held");
  if(pw.shot===pw.total){ const pts=mulPts(20*pw.total*(blast.level+1)); blast.score+=pts; banner("WHOLE CHORD!", `${pw.chord} · +${pts}`); sfx("level"); boBar(); }
}
function boLost(x){
  explode(x??blast.W/2, blast.H-20, 26, ["#FF4B3E","#FF8A3D","#FFD35A"]);
  sfx("miss"); buzz(blast.field,true); blast.lives--; boHeal(); boPowerEnd(); boBar();
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true; boExtraClear(); boCapsClear(); blast.balls=[]; blast.ballEl.style.transform="translate(-40px,-40px)";
    const best=Math.max(saved.best.breakout||0, blast.score); saved.best.breakout=best; save();
    boMenu(true); return;
  }
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`); boServe();
}
// a chord from the buttons: every cracked brick of that chord breaks, cannon or not
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
  const hits=blast.bricks.filter(k=>k.alive && k.cracked && matches(k));   // cracked, or opened by the coda
  if(!hits.length){ heard(name,false,blast.coda ? "NOT ONE OF THE LAST BRICKS" : "NO CRACKED BRICK"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  hits.forEach(k=>boBreak(k));
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="breakout" || !blast || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1}[e.code]; if(d){ e.preventDefault(); blast.keyDir=d; blast.steer="keys"; }
  if((e.code==="ArrowUp" || e.code==="Space") && blast.phase==="play" && blast.balls.some(b=>b.caught)){ e.preventDefault(); boRelease(); }   // FERMATA: let it go
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
  if(blast.bonus && !bonusInField()){ bonusKnob(value, knob); return; }       // a bonus round: any knob (an in-field one steers the game)
  if(blast.hsEntry){ if(knob===steerKnob()) blast.hsEntry.knob(value); return; }
  if(cabWaiting()){
    const base=(blast.knobBase||(blast.knobBase={}));
    if(base[knob]==null) base[knob]=value;                                   // the first report is where it rests
    else if(knob===steerKnob() && Math.abs(value-base[knob])>.08){ base[knob]=null; cabWake(); }   // a real turn wakes it
    return;
  }
  if(blast.knobBase) blast.knobBase={};
  if(blast.helpBoard && typeof helpKnob==="function") helpKnob(knob, value);   // the on-screen minichord's knob turns too
  if(blast.kind==="chopper"){ chopperKnob(value); return; }                   // any knob tunes the radio
  if(blast.kind==="asteroids" && blast.aimManual && knob===asAimKnob()){ asAim(value); return; }   // manual aim: the other knob spins the ship
  if(knob!==steerKnob()) return;
  const step=Math.round(value*127), h=knobHold[knob] || (knobHold[knob]={last:null, dir:0});
  const d = h.last==null ? 1 : step-h.last;                                   // the first reading always counts
  if(d===0 || (h.last!=null && Math.abs(d)===1 && h.dir && Math.sign(d)!==h.dir)) return;   // a wobble back: hold
  h.dir=Math.sign(d); h.last=step; blast.knobAt=performance.now();
  const v=step/127;
  if(blast.kind==="stack") return stKnob(v);
  if(blast.kind==="asteroids") return asKnob(v);
  if(blast.kind==="sight") return sightKnob(v);
  // Chord Invaders' ship, in manual aim; an in-field bonus round is steered the same way
  if(blast.kind==="blaster"){ if(blast.aimManual && (blast.phase==="play" || bonusPlaying())) blast.shipWant=.06+v*.88; return; }
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
      // the power-up: a brick's chord rains its tones and the paddle turns cannon, sliding under each to shoot it
      const pk=blast.bricks.find(b=>b.alive && !b.cracked);
      if(pk){ pk.alive=false; pk.el && pk.el.remove(); explode(pk.x+pk.w/2, pk.y+pk.h/2, 22, ["#FFD35A","#F1E8D2","#7FE9FF"]); boPowerUp(pk);
        say("ARPEGGIO","BREAK A POWER BRICK AND ITS CHORD'S TONES RAIN DOWN, AND THE PADDLE BECOMES A CANNON. THE BALL KEEPS GOING."); await step(2400);
        say("SHOOT THE TONES","SLIDE UNDER EACH TONE AND PLUCK IT ON THE HARP, FOR A BONUS. SHOOT THEM ALL FOR THE WHOLE CHORD.");
        for(const t of [...(blast.power?blast.power.tones:[])]){ if(t.gone) continue; blast.demoAim=t.x; await step(650); boDemoShoot(t); await step(450); }
        blast.demoAim=null; await step(1600); }
      // a capsule: DIVISI caught on the paddle, and the ball splits in three
      await boDemoCapsule(step, say);
      // the coda: the wall down to its last three, open, played without a hit
      await boDemoCoda(step, say);
      say("READY?","CLEAR THE WALL. DON'T LET THE BALL PAST."); sfx("level"); await step(3200);
      endBoDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
// the demo's capsule: a DIVISI brick breaks, its capsule falls, the paddle slides under it, and the ball splits
async function boDemoCapsule(step, say){
  const k=blast.bricks.find(b=>b.alive && !b.cracked); if(!k) return;
  k.cap="divisi"; k.el.classList.add("capbrick","pu-divisi"); k.el.insertAdjacentHTML("afterbegin", boCapIcon("divisi"));
  say("CAPSULES","SOME BRICKS HOLD A CAPSULE. BREAK ONE AND CATCH THE CAPSULE WITH THE PADDLE FOR ITS POWER."); await step(1800);
  helpChord(k.root, k.q); demoPlay(boDemoVoicing(k)); boBreak(k, true); boCapDrop(k); helpChord(null);
  const c=blast.caps[blast.caps.length-1]; if(!c) return;
  blast.demoAim=c.x; await step(2600);
  if(blast.caps.includes(c)) boCapTake(c);
  say("DIVISI","THE BALL SPLITS IN THREE. ONLY THE LAST ONE PAST THE PADDLE COSTS A LIFE."); blast.demoAim=null; await step(3200);
}
// the demo's coda: all but three bricks gone, the coda opens them, and they're played straight off
async function boDemoCoda(step, say){
  const left=blast.bricks.filter(b=>b.alive); if(left.length<4) return;
  left.slice(3).forEach(b=>{ b.alive=false; b.el.classList.add("gone"); setTimeout(()=>b.el.remove(),300); });
  boCoda(performance.now(), true);
  say("CODA","WITH ONLY A FEW BRICKS LEFT THEY OPEN UP: PLAY THEIR CHORDS, NO HIT NEEDED, BEFORE THE BONUS DRAINS AWAY."); await step(2600);
  for(const b of blast.bricks.filter(x=>x.alive)){ helpChord(b.root, b.q); demoPlay(boDemoVoicing(b)); await step(700); if(b.alive) boBreak(b, true); await step(500); }
  helpChord(null); await step(900);
}
const boDemoVoicing=k=>(FORM[k.q]||FORM[""]).map(f=>48+mod(k.rootPc+f[1],12));
function endBoDemo(token){
  if(!blast || blast.demo!==token) return;
  if(blast.power){ blast.power.tones.forEach(t=>t.el.remove()); blast.power=null; blast.padEl.classList.remove("cannon"); blast.ballEl.classList.remove("held"); }
  blast.demoAim=null;
  stopDemo(); blast.phase="menu"; blast.demoAuto=false; boPowersClear(); blast.balls=[]; blast.coda=null; blast.ballEl.style.transform="translate(-40px,-40px)";
  blast.bricks.forEach(b=>b.el.remove()); blast.bricks=[];
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
