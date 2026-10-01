// The arcade's screen: the pixel canvas every game draws on, its backgrounds, sparks, missiles and
// popups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the space the chords fall through ----------
// A small canvas scaled up without smoothing, so every star, spark and missile is a chunky
// pixel: three layers of stars streaming past, the ship at the bottom, its missiles, and the
// sparks of each chord that's hit. Drawn at a quarter of the pixels, it's cheap on a slow laptop.
// canvas pixels per screen pixel: 3 in the page, more as the field grows (full screen), so the canvas
// stays about the same size to draw however big it's shown
let PX=3;
// The longest step a game's clock takes in one frame. A frame that took longer is counted as this
// long, so a machine drawing fewer frames a second than this allows plays the game in slow motion. It
// was a twentieth of a second (a thirtieth in Chord Breakout), which a full screen on a big monitor
// fell below; a tenth keeps every game at its true speed down to ten frames a second, choppy rather
// than slowed, while a tab that comes back after a while still doesn't jump the game on.
const DT_MAX=.1;
// A canvas at the screen's own resolution, over the shared pixel canvas: for a game whose lines and
// shapes should be sharp (the shared canvas is deliberately low-resolution, right for the stars).
function sharpLayer(fx){ const cv=document.createElement("canvas"); cv.className="fxsharp"; fx.cv.after(cv); return cv; }
// ready to draw in the field's own pixels: sized to it (and the screen's density), cleared
function sharpBegin(cv){
  const dpr=window.devicePixelRatio||1, W=blast.fx.fw, H=blast.fx.fh;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const g=cv.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); g.lineJoin="round"; g.lineCap="round";
  return g;
}
function fxInit(field){
  const cv=document.createElement("canvas"); cv.className="fx"; field.prepend(cv);
  const fx={cv, g:cv.getContext("2d"), stars:[], missiles:[], sparks:[], w:0, h:0};
  // the field's size is watched rather than measured every frame: measuring straight after moving
  // things makes the browser lay the whole page out again, and every game did it sixty times a second
  fx.fw=field.clientWidth; fx.fh=field.clientHeight; fx.dirty=true;
  if(window.ResizeObserver){ fx.ro=new ResizeObserver(es=>{ const r=es[0].contentRect; fx.fw=Math.round(r.width); fx.fh=Math.round(r.height); fx.dirty=true; }); fx.ro.observe(field); }
  fx.resize=()=>{ if(!fx.dirty && fx.ro) return; fx.dirty=!fx.ro; if(!fx.ro){ fx.fw=field.clientWidth; fx.fh=field.clientHeight; }
    PX=Math.max(3, Math.ceil(fx.fw/340));
    const W=Math.max(1,Math.floor(fx.fw/PX)), H=Math.max(1,Math.floor(fx.fh/PX));
    if(W===fx.w && H===fx.h) return; fx.w=W; fx.h=H; cv.width=W; cv.height=H; fx.bg=null;
    fx.stars=[...Array(Math.min(420, Math.floor(W*H/140)))].map(()=>({x:Math.random()*W, y:Math.random()*H, z:1+Math.floor(Math.random()*3)})); };
  fx.resize();
  return fx;
}
// the field's size, from the watcher (or measured, where there's none)
const fieldH=()=> blast && blast.fx && blast.fx.ro ? blast.fx.fh : (blast && blast.field ? blast.field.clientHeight : 420);
const fieldW=()=> blast && blast.fx && blast.fx.ro ? blast.fx.fw : (blast && blast.field ? blast.field.clientWidth : 900);
// the lit "lowest" item changes its class only when it changes, not every frame
function markLowest(items, low){ if(blast.lowEl===low) return; blast.lowEl=low; items.forEach(it=>it.el.classList.toggle("low", it===low && !it.bonus)); }
function explode(x,y,n=26,colours=["#FFD35A","#FF8A3D","#FFF4C2","#FF4B3E"]){
  const fx=blast && blast.fx; if(!fx) return;
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=40+Math.random()*140;
    fx.sparks.push({x:x/PX, y:y/PX, vx:Math.cos(a)*v/PX, vy:Math.sin(a)*v/PX, life:1, c:colours[i%colours.length]}); }
}
// Each game has its own sky. Chord Invaders flies through a starfield; the others stay put, so a
// still background is drawn once to its own canvas and copied each frame, which costs next to nothing.
//   invaders   stars streaming past, faster at higher levels
//   asteroids  still stars, a few of them twinkling, as the old vector game had
//   command    a night over a city: bands of dusk sky, a few stars, a moon, and the skyline the cannons guard
//   snake      a dim grid of dots, like the playfield of an old handheld
//   stack      a wall of dark bricks behind the board
function fxBackground(g, W, H, now, dt){
  const kind=blast.kind||"blaster", fx=blast.fx;   // Chord Invaders' state has no kind of its own
  if(kind==="blaster"){
    const speed=blast.phase==="play" ? 1+blast.level*.25 : .6;
    g.fillStyle="#07060C"; g.fillRect(0,0,W,H);
    for(const s of fx.stars){ s.y+=s.z*speed*dt*9; if(s.y>=H){ s.y-=H; s.x=Math.random()*W; }
      g.fillStyle = s.z===3 ? "#FFFFFF" : s.z===2 ? "#9D98C9" : "#4B4670"; g.fillRect(Math.floor(s.x),Math.floor(s.y),1,s.z===3?2:1); }
    return;
  }
  if(!fx.bg || fx.bg.width!==W || fx.bg.height!==H || fx.bgKind!==kind){ fx.bg=fxPaintBackground(kind, W, H); fx.bgKind=kind; }
  g.drawImage(fx.bg, 0, 0);
  if(kind==="asteroids"){   // a handful of stars twinkle, slowly
    for(let i=0;i<fx.stars.length;i+=9){ const s=fx.stars[i], on=Math.sin(now/700+i*1.7)>.6; if(on){ g.fillStyle="#FFFFFF"; g.fillRect(Math.floor(s.x),Math.floor(s.y),1,1); } }
  }
}
function fxPaintBackground(kind, W, H){
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
  const rand=(seed=>()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; })(kind.length*7919+W);
  if(kind==="asteroids"){
    g.fillStyle="#050409"; g.fillRect(0,0,W,H);
    for(const s of blast.fx.stars){ g.fillStyle = s.z===3 ? "#C9C5E6" : s.z===2 ? "#6E6A94" : "#34304F"; g.fillRect(Math.floor(s.x),Math.floor(s.y),1,1); }
  } else if(kind==="command"){
    // dusk in bands, darkest at the top, dithered where they meet
    const bands=["#07061A","#0B0A26","#120F33","#1C1440","#2A1846","#3B1C44","#4E2140"];
    const bh=Math.ceil(H*.78/bands.length);
    bands.forEach((c,i)=>{ g.fillStyle=c; g.fillRect(0,i*bh,W,bh+1);
      if(i){ g.fillStyle=bands[i-1]; for(let x=0;x<W;x+=2) g.fillRect(x+(i%2),i*bh,1,1); } });
    for(let i=0;i<W*H/260;i++){ const x=Math.floor(rand()*W), y=Math.floor(rand()*H*.45); g.fillStyle=rand()<.2?"#FFFFFF":"#8F8AB8"; g.fillRect(x,y,1,1); }
    // a pixel moon
    const mx=Math.floor(W*.82), my=Math.floor(H*.16), r=6;
    for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++){ if(x*x+y*y<=r*r){ g.fillStyle = (x+2)*(x+2)+(y-1)*(y-1)<=r*r*.7 ? "#E8DDC0" : "#B9AE90"; g.fillRect(mx+x,my+y,1,1); } }
    // the skyline the cannons guard, and the ground they stand on
    const ground=H-10; g.fillStyle="#0E0B18";
    for(let x=0;x<W;){ const w=4+Math.floor(rand()*9), h=6+Math.floor(rand()*(H*.16)); g.fillRect(x,ground-h,w,h);
      g.fillStyle="#E8C35A"; for(let wy=ground-h+2; wy<ground-2; wy+=3) for(let wx=x+1; wx<x+w-1; wx+=2) if(rand()<.18) g.fillRect(wx,wy,1,1);
      g.fillStyle="#0E0B18"; x+=w+Math.floor(rand()*3); }
    g.fillStyle="#1A1410"; g.fillRect(0,ground,W,H-ground);
    g.fillStyle="#2B2118"; for(let x=0;x<W;x+=3) g.fillRect(x,ground,2,1);
  } else if(kind==="snake"){
    g.fillStyle="#08100C"; g.fillRect(0,0,W,H);
    g.fillStyle="#1B3325"; for(let y=1;y<H;y+=4) for(let x=1;x<W;x+=4) g.fillRect(x,y,1,1);
  } else if(kind==="sight"){
    // manuscript paper, dark: faint staves ruled across the whole screen
    g.fillStyle="#0B0A12"; g.fillRect(0,0,W,H);
    g.fillStyle="#1A1826"; for(let y=6; y<H; y+=18) for(let k=0;k<5;k++) g.fillRect(0, y+k*2, W, 1);
  } else if(kind==="frets"){
    // black, in white polka dots: a stage in costume
    g.fillStyle="#07060C"; g.fillRect(0,0,W,H);
    for(let y=4, r=0; y<H; y+=10, r++) for(let x=(r%2?9:4); x<W; x+=10){ g.fillStyle="#F1E8D2"; g.fillRect(x,y,2,2); }
  } else if(kind==="sweeper"){
    // the airfield: grey tarmac in slabs, a runway's dashes, grass at the edges
    for(let y=0;y<H;y+=6) for(let x=0;x<W;x+=6){ g.fillStyle=["#2A2C30","#26282C","#2E3034"][Math.floor(rand()*3)]; g.fillRect(x,y,6,6); }
    g.fillStyle="#1C2A1E"; g.fillRect(0,0,W,Math.floor(H*.08)); g.fillRect(0,H-Math.floor(H*.06),W,H);
    g.fillStyle="#6B6A5E"; for(let x=4;x<W;x+=14) g.fillRect(x,Math.floor(H*.52),7,1);
  } else if(kind==="fleet"){
    // the sea at night: deep blue in bands, glints of light on the swell
    const blues=["#06121F","#081628","#0A1A30","#071424"];
    for(let y=0;y<H;y+=4){ g.fillStyle=blues[Math.floor(y/4)%blues.length]; g.fillRect(0,y,W,4); }
    for(let i=0;i<W*H/120;i++){ g.fillStyle=rand()<.3?"#2A5A7A":"#12304A"; const x=Math.floor(rand()*W), y=Math.floor(rand()*H); g.fillRect(x,y,2+Math.floor(rand()*3),1); }
  } else if(kind==="chopper"){
    // the ground from the air: fields in patches, a river winding across, a few trees
    const greens=["#0F2A18","#12301C","#0C2414","#15361F"];
    for(let y=0;y<H;y+=8) for(let x=0;x<W;x+=8){ g.fillStyle=greens[Math.floor(rand()*greens.length)]; g.fillRect(x,y,8,8); }
    g.fillStyle="#123A55"; for(let x=0;x<W;x++){ const y=Math.floor(H*.55+Math.sin(x/17)*H*.12+Math.sin(x/5)*2); g.fillRect(x,y,1,5); }
    for(let i=0;i<W*H/260;i++){ g.fillStyle=rand()<.5?"#1E4A26":"#0A1E10"; g.fillRect(Math.floor(rand()*W),Math.floor(rand()*H),2,2); }
  } else if(kind==="fifths"){
    g.fillStyle="#040308"; g.fillRect(0,0,W,H);
    for(let i=0;i<W*H/300;i++){ g.fillStyle=rand()<.3?"#4B4670":"#221F3A"; g.fillRect(Math.floor(rand()*W),Math.floor(rand()*H),1,1); }
  } else if(kind==="breakout"){
    g.fillStyle="#070A12"; g.fillRect(0,0,W,H);
    g.fillStyle="#0E1424"; for(let y=0;y<H;y+=2) g.fillRect(0,y,W,1);                    // scanlines
    g.fillStyle="#1B2440"; for(let x=0;x<W;x+=16) for(let y=0;y<H;y+=16) g.fillRect(x,y,1,1);   // a grid of dots
  } else if(kind==="stack"){
    g.fillStyle="#0A0810"; g.fillRect(0,0,W,H);
    // dark bricks, offset every other course
    g.fillStyle="#17122A";
    for(let y=0,row=0;y<H;y+=6,row++) for(let x=(row%2)*5-5;x<W;x+=10) g.fillRect(x,y,9,5);
  } else { g.fillStyle="#07060C"; g.fillRect(0,0,W,H); }
  return cv;
}
function fxDraw(now, dt){
  const fx=blast.fx; if(!fx) return;
  // a game's clock and its count of what the minichord played start with its first frame of play
  // (every time play begins, Play Again straight from game over included)
  if(blast.phase==="play" && blast.bonusGen!==blast.gen){ blast.bonusGen=blast.gen; blast.bonusAt=(blast.level||0)+BONUS_EVERY; }   // the first bonus, two levels on
  if(bonusDue()) arcadeBonus();
  if(blast.phase==="play" && blast.lastPhase!=="play" && blast.lastPhase!=="bonus"){ blast.mult=diffMult(); blast.startedAt=now; blast.midiIn=0; blast.hsDone=false; blast.hsResult=null; blast.hsNote=null; blast.helped=!!saved.beginner; }
  blast.lastPhase=blast.phase;
  // how the machine is keeping up: if frames come slowly for a couple of seconds the field goes light,
  // the canvas drawn every other frame and the glows dropped
  const gap=now-(fx.prevNow||now); fx.prevNow=now;
  if(gap>0 && gap<200) fx.avg = fx.avg ? fx.avg*.97+gap*.03 : gap;
  fx.slowFor = fx.avg>24 ? (fx.slowFor||0)+1 : 0;
  if(!fx.light && fx.slowFor>120){ fx.light=true; blast.field && blast.field.classList.add("lowfx"); }
  // behind a title screen, or on a struggling machine, the canvas needn't be drawn every frame
  const titleUp = blast.phase==="menu" && blast.overlay && !blast.overlay.hidden;
  const every = titleUp ? 50 : fx.light ? 30 : 0;
  if(every && now-(fx.lastDraw||0)<every) return;
  dt=Math.min(.1,(now-(fx.lastDraw||now))/1000)||dt; fx.lastDraw=now;
  fx.resize();
  const g=fx.g, W=fx.w, H=fx.h;
  fxBackground(g, W, H, now, dt);
  if(blast.kind==="fifths") fdDraw(g, now);
  else if(blast.asteroids) asDraw(g, now);
  else if(blast.noShip){ /* the snake's board has no ship */ }
  else if(blast.cannons){
    // Harp Command: a pixel cannon under each of the harp's twelve strings, lowest on the left;
    // one lights as its string is plucked
    const frozen=now<(blast.frozenUntil||0);
    blast.cannons.forEach((c,i)=>{ const cx=Math.floor(c.x/PX), cy=H-5, hot=now-(c.fired||0)<180;
      g.fillStyle = frozen ? ((Math.floor(now/120)+i)%2 ? "#7FE9FF" : "#B9F3FF") : hot ? "#FFD35A" : "#F1E8D2";
      g.fillRect(cx-1,cy-5,2,4); g.fillRect(cx-3,cy-1,6,2); g.fillRect(cx-4,cy+1,8,2);
      if(hot){ g.fillStyle="#FF8A3D"; g.fillRect(cx-1,cy-7,2,2); } });
    if(typeof hcShieldDraw==="function") hcShieldDraw(g, W, H, now);    // a shield, glowing over them
  } else {
  // the ship: a little pixel cannon at the bottom centre, or, in the demo, off to the left under the
  // chords it falls through, clear of the minichord drawn at the foot of the field; it glides there
  const steered = blast.aimManual || (typeof powerOn==="function" && powerOn("omni"));
  const want = blast.phase==="demo" && blast.demo ? (blast.demoShip ?? DEMO_SHIP) : steered && blast.shipWant!=null ? blast.shipWant : .5;
  blast.shipF = blast.shipF==null ? want : blast.shipF+(want-blast.shipF)*Math.min(1,dt*3);
  const sx=Math.floor(W*blast.shipF), sy=H-6;
  g.fillStyle="#F1E8D2"; g.fillRect(sx-1,sy-4,2,3); g.fillRect(sx-3,sy-1,6,2); g.fillRect(sx-5,sy+1,10,2);
  g.fillStyle="#FF4B3E"; g.fillRect(sx-1,sy+3,2,1+Math.floor(now/80)%2);
  if(blast.kind==="blaster" && typeof blastBeamDraw==="function") blastBeamDraw(g, sx, sy, now);
  }
  // missiles: a bright head and a short trail, flying to the chord they were fired at
  fx.missiles=fx.missiles.filter(m=>{
    const t=Math.min(1,(now-m.t0)/m.dur), x=m.x0+(m.x1-m.x0)*t, y=m.y0+(m.y1-m.y0)*t;
    g.fillStyle="#FFD35A"; g.fillRect(Math.floor(x)-1,Math.floor(y)-1,2,3);
    g.fillStyle="rgba(255,120,60,.8)"; for(let k=1;k<4;k++){ const tx=x-(m.x1-m.x0)*.04*k, ty=y-(m.y1-m.y0)*.04*k; g.fillRect(Math.floor(tx),Math.floor(ty),1,1); }
    if(t>=1){ m.hit(); return false; } return true;
  });
  fx.sparks=fx.sparks.filter(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=30*dt; p.life-=dt*1.6;
    if(p.life<=0) return false; g.globalAlpha=Math.max(0,p.life); g.fillStyle=p.c; g.fillRect(Math.floor(p.x),Math.floor(p.y),1+(p.life>.6?1:0),1+(p.life>.6?1:0)); g.globalAlpha=1; return true; });
}
function blastTick(now){
  if(!blast) return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  // an in-field bonus round: the auto modifier follows the chord above the ship, since the round's
  // chords all hang at one height and none is the lowest
  if(typeof bonusPlaying==="function" && bonusPlaying() && blast.bonus.mine){
    const sx=blast.field.clientWidth*(blast.shipF??.5);
    const near=blast.bonus.mine.filter(i=>!i.done).sort((a,b)=>Math.abs(a.el.offsetLeft-sx)-Math.abs(b.el.offsetLeft-sx))[0];
    if(near) arcadeMod(near.root);
  }
  if(blast.phase!=="play"){ blast.raf=requestAnimationFrame(blastTick); return; }
  const live=blast.items.filter(i=>!i.done);
  if(blast.pauseForBarry && !live.length){
    blast.pauseForBarry=false; blast.barry=true; borrow(33,1); modPill(); sfx("level");
    banner("BARRY HARRIS","MAJOR PLAYS 6 · MINOR m6 · DIM °7");
    blast.next=now+1500;
  }
  if(!blast.pauseForBarry && now>=blast.next && live.length<5){ spawnBlast(now); blast.next=now+blast.gap*(.8+Math.random()*.4); }
  const H=fieldH();
  for(const it of live){
    const y=(now-it.t0)/blast.fall;
    // a landing that ends the game must keep the frames coming, or the stars freeze and Play again finds nothing running
    if(y>=1){ blastMiss(it); if(!blast) return; if(blast.phase!=="play"){ blast.raf=requestAnimationFrame(blastTick); return; } continue; }
    it.y=24+y*(H-70); it.el.style.transform=`translate(-50%,${it.y}px)`;   // moved, not re-laid out: cheaper every frame
  }
  const k=blast.keyBar;
  if(k){
    const y=(now-k.t0)/(blast.fall*1.6);
    if(y>=1){ k.el.classList.add("miss"); setTimeout(()=>k.el.remove(),600); blast.keyBar=null; blast.lives--; blastBar(); buzz(blast.field, true); sfx("miss");
      banner(`KEY OF ${k.name} LANDED`, "ITS CHORDS NEED THE MODIFIER NOW");
      if(blast.lives<=0){ blastOver(); blast.raf=requestAnimationFrame(blastTick); return; } }
    else k.el.style.top=`${24+y*(H-80)}px`;
  }
  if(typeof blastPowerTick==="function") blastPowerTick(now, dt);              // the beam and the power-ups
  const low=lowestBlast(); markLowest(blast.items, low);
  if(low){ arcadeMod(low.root); helpChord(low.root, low.q, low.bass); } else helpChord(null);
  blast.raf=requestAnimationFrame(blastTick);
}
function blastMiss(it){
  it.el.style.top=`${it.y||0}px`; it.el.style.transform="";               // back to top, so the miss animation can move it
  it.done=true; it.el.classList.add("miss"); setTimeout(()=>it.el.remove(),600);
  const x=it.el.offsetLeft, y=blast.field.clientHeight-40;
  if(it.bonus || it.power){ popup(x,y,"GONE","#7FE9FF"); return; }     // a ★ chord or a power-up costs nothing if it lands
  if(typeof blastShieldTakes==="function" && blastShieldTakes(it)) return;
  blast.lives--; blastBar(); buzz(blast.field, true); sfx("miss"); popup(x,y,"MISS","#FF4B3E");
  feedback(`${it.sym} landed.`,"bad", `On your minichord: ${howTo(it.root,it.q)}${it.bass?`, then press ${pressRoot(it.bass)} as well`:""}.`);
  if(blast.lives<=0) blastOver();
}
function blastOver(){
  blast.over=true; blast.phase="over"; poll(false);
  const best=Math.max(saved.best.blaster||0, blast.score); saved.best.blaster=best; save();
  blast.items.forEach(i=>i.el.remove()); if(blast.keyBar) blast.keyBar.el.remove();
  feedback(`Game over: ${blast.score} points, level ${blast.level+1}.`, "", `Your best: ${best}.`);
  blastBar(); blastMenu(true);
}
// what the game heard, at the foot of the field: a chord that sounds but hits nothing says so here
function heard(name, hit, why="NOT FALLING"){   // each game says why a miss missed
  if(!blast || !blast.heard) return;
  blast.heard.className="heard"+(hit?"":" no");
  blast.heard.innerHTML=`HEARD <b>${name||"?"}</b>${hit?"":` · ${why}`}`;
}
// whether a falling chord is the chord in these pitches (a slash chord needs its bass at the bottom)
function blastMatches(i, pitches){
  if(i.bassPc==null) return isChord(pitches,i.rootPc,i.q);
  const tones=FORM[i.q].map(f=>mod(i.rootPc+f[1],12)), pcs=pitches.map(p=>mod(Math.round(p),12));
  return mod(Math.round(Math.min(...pitches)),12)===i.bassPc && pcs.every(p=>p===i.bassPc || tones.includes(p)) && pcs.includes(tones[1]);
}
function blasterChord(voices){
  if(blast && blast.kind==="command") return;           // Harp Command listens to the harp alone
  if(blast && blast.phase==="demo" && blast.demo){ endDemo(blast.demo); return; }
  if(!blast || (blast.phase!=="play" && !(typeof bonusPlaying==="function" && bonusPlaying()))) return;   // an in-field bonus round is played with the game
  const pitches=voices.map(v=>v.pitch);
  const name=chordName(pitches,devFifths());
  // the lowest matching chord, ★ chords only if nothing ordinary matches; in manual aim, only one above the ship
  const fr=blast.field, shipX=fr.clientWidth*(blast.shipF??.5);
  const above=i=>Math.abs(i.el.offsetLeft-shipX) <= i.el.offsetWidth/2+14;
  const pool=blast.items.filter(i=>!i.done && blastMatches(i, pitches));
  const hit=(blast.aimManual ? pool.filter(above) : pool).sort((a,b)=>(a.bonus-b.bonus)||(a.t0-b.t0))[0];
  if(!hit && blast.aimManual && pool.length){ heard(name,false,"WIDE: GET UNDER IT"); sfx("shoot");     // it's up there, but not above the ship
    blast.fx.missiles.push({x0:shipX/PX, y0:(fr.clientHeight-22)/PX, x1:shipX/PX, y1:0, t0:performance.now(), dur:260, hit:()=>{}}); return; }
  if(!hit){ heard(name,false); if(chordId(pitches)) later(()=>{ buzz(blast && blast.field, true); sfx("miss"); }); return; }
  heard(name,true);
  if(blast.aimManual && typeof heldKeyNow==="function") blast.beamArmed=heldKeyNow();   // this press shot the right chord down: it may keep holding for the beam
  blastKill(hit, "shot");
}
// a chord destroyed, by a shot from the ship or by the beam: its points, a power-up if it carried one,
// and every eighth a level up
function blastKill(hit, how){
  // an in-field bonus round: the ship fires as it always does, and the round scores when the shot lands
  if(typeof bonusPlaying==="function" && bonusPlaying() && blast.bonus.g.shot){
    const b=blast.bonus, fr=blast.field, shipX=fr.clientWidth*(blast.shipF??.5);
    const x=hit.el.offsetLeft, y=(hit.y||0)+hit.el.offsetHeight/2, land=()=>{ if(!b.over) b.g.shot(b, hit, how); };
    if(how==="beam") land();
    else { sfx("shoot"); blast.fx.missiles.push({x0:shipX/PX, y0:(fr.clientHeight-22)/PX, x1:x/PX, y1:y/PX, t0:performance.now(), dur:170, hit:land}); }
    return;
  }
  hit.done=true; hit.el.classList.remove("low");
  const fr=blast.field, shipX=fr.clientWidth*(blast.shipF??.5), x=hit.el.offsetLeft, y=(hit.y||0)+hit.el.offsetHeight/2;
  const {pts, tags}=blastPoints(hit);                           // by its chord type, the modifier and a slash
  const boom=()=>{ sfx(hit.bonus?"bonus":"boom"); hit.el.classList.add("gone"); setTimeout(()=>hit.el.remove(),50);
    explode(x,y, hit.bonus||hit.power?44:26, hit.power?["#FF5AA0","#FFD35A","#7FE9FF"]:hit.bonus?["#7FE9FF","#FFFFFF","#B9F3FF","#FFD35A"]:undefined);
    popup(x,y-10,`+${pts}${tags.length?" "+tags.join(" · "):""}`, hit.bonus?"#7FE9FF":tags.length?"#FFD35A":undefined);
    if(hit.power) blastPowerGet(hit); };
  if(how==="beam") boom();
  else { sfx("shoot"); blast.fx.missiles.push({x0:shipX/PX, y0:(fr.clientHeight-22)/PX, x1:x/PX, y1:y/PX, t0:performance.now(), dur:170, hit:boom}); }
  blast.hits++; blast.score+=pts; stats.streak=blast.hits; scoreboard();
  if(blast.hits%8===0){
    const was=blast.level; blast.level=nextLevel(blast.level);
    blast.fall=Math.max(3500*speedMul(), blast.fall*.88); blast.gap=Math.max(900*speedMul(), blast.gap*.88);
    const lv=BLAST_LEVELS[blast.level];
    if(blast.level!==was){
      banner(`LEVEL ${blast.level+1}`, lv.barry ? "BARRY HARRIS MODE COMES ON ONCE THE FIELD IS CLEAR" : lv.slash && !BLAST_LEVELS[was].slash ? "SLASH CHORDS: HOLD THE CHORD, THEN THE BASS NOTE'S BUTTON" : blastLevelName(blast.level).toUpperCase());
    } else banner("FASTER!");
    if(lv.barry && !blast.barry) blast.pauseForBarry=true;
    sfx("level");
    if(blast.level>=2) gameLater(()=>{ if(blast && blast.phase==="play") spawnKeyBar(performance.now()); }, 2400);
  }
  blastBar();
}
const GENS={spell:genSpell, command:genCommand, snake:genSnake, asteroids:genAsteroids, stack:genStack, breakout:genBreakout, fifths:genFifths, chopper:genChopper, fleet:genFleet, sweeper:genSweeper, frets:genFrets, sight:genSight, hidden:genHidden, oddone:genOddOne, shades:genShades, reshape:genReshape, blaster:genBlaster, diatonic:genDiatonic, numeral:genNumeral, staff:genStaff, slash:genSlash, key:genKey, harp:genHarp, missing:genMissing,
  melody:()=>genMelody(false), solfa:()=>genMelody(true), chordscale:genChordScale, smooth:genSmooth, whichvoice:genWhichVoice, simon:genSimon, directions:genDirections, pluckchord:genPluckChord, buildscale:genBuildScale,
  scale:genScale, transpose:genTranspose, temper:genTemper, tune:genTune};
const MYSTERY=new Set(["scale","transpose","temper","tune"]);
const LABELS={spell:"Spell it", hidden:"Hidden layout", oddone:"Odd one out", shades:"Shades of the third", reshape:"Reshape", blaster:"Chord Invaders", command:"Harp Command", snake:"Chord Snake", asteroids:"Chord Asteroids", stack:"Chord Stack", breakout:"Chord Breakout", fifths:"Fifths Defender", chopper:"Chopper Rescue", fleet:"Key Fleet", sweeper:"Chord Sweeper", frets:"Between the Frets", sight:"Sight Line", diatonic:"Seven chords", numeral:"Numerals", staff:"On the staff", slash:"Slash chords", key:"Key detective", harp:"Harp hunt", missing:"Missing note", mix:"Mix",
  melody:"Play by number", solfa:"Play by solfège", chordscale:"Chord scales", smooth:"Smooth moves", whichvoice:"Which voice moved?", simon:"Simon says", directions:"Follow the directions", pluckchord:"Pluck the chord", buildscale:"Build the scale",
  scale:"Scale detective", transpose:"Transpose detective", temper:"Temperament taster", tune:"Tune up"};
