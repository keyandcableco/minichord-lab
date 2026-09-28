// Chord Asteroids: crack a rock with its chord, shoot its notes on the harp. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Asteroids ----------
// Asteroids for spelling chords both ways. Big chord asteroids drift in from the edges toward the
// ship in the middle. Play a rock's chord on the buttons and it cracks into its notes, smaller rocks
// each spelled as a note of the chord (E7 breaks into E, G♯, B and D), which scatter and then turn
// back toward the ship. Pluck each note on the harp and the ship turns and shoots it. A rock that
// reaches the ship costs a life; a string that plays no rock jams the gun for a moment, so
// strumming doesn't pay. Clearing every note of a chord scores a bonus.
const AS_LEVELS=[
  {n:"Major and minor", qs:["","m"], roots:"natural"},
  {n:"Sharps and flats", qs:["","m"], roots:"all"},
  {n:"Sevenths", qs:["","m","7","maj7","m7"], roots:"all"},
  {n:"Diminished and augmented", qs:["","m","7","maj7","m7","°","+"], roots:"all"},
  {n:"Barry Harris", qs:["6","m6","7","maj7","m7","°7"], roots:"all", barry:true},
];
const asLevelOk=i=> !AS_LEVELS[i].barry || canWrite();
function genAsteroids(){
  return {kind:"asteroids", prompt:"Chord Asteroids", sub:"Chord asteroids drift toward your ship. Play a rock's chord on the buttons to crack it into its notes, then pluck each note on the harp to shoot it down. A rock that reaches you costs a life.",
    answer:{type:"asteroids", get name(){ const r=asNearest("chord"); return r ? r.label : "the nearest rock"; }},
    get hint(){ const n=asNearest("note"), c=asNearest("chord"); return n ? `The nearest note is ${n.label}.` : c ? `The nearest rock is ${c.label}: ${c.tones.join(" ")}.` : "Wait for a rock."; },
    context:0};
}
function asNearest(kind){
  if(!blast || blast.kind!=="asteroids") return null;
  const cx=blast.cx, cy=blast.cy;
  return blast.rocks.filter(r=>!r.dead && r.kind===kind).sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))[0]||null;
}
// the harp plays notes here, not a d-pad: chromatic from C, untransposed, at its own volume
function asHarp(){
  if(!canWrite()) return;
  harpInOrder();
  if(hasSetting(116)) borrow(116,1);
  borrow(98,1); if(hasSetting(36)) borrow(36, mc.params[36] ?? 0);
  if(hasSetting(30)) ensure(30,0);
}
function startAsteroids(){
  blast={kind:"asteroids", rocks:[], score:0, lives:3, level:0, clears:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null,
    noShip:true, asteroids:true, last:performance.now(), next:0, shipAng:-Math.PI/2, cx:400, cy:230, jamUntil:0, rockId:0};
  asDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  asMenu();
  blast.raf=requestAnimationFrame(asTick);
}
function asDevice(){
  if(!blast || blast.kind!=="asteroids" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); });
  const sig=AS_LEVELS.map((_,i)=>asLevelOk(i)).join();
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ const hid=blast.overlay.hidden; blast.overlay.remove(); blast.overlay=null; asMenu(); blast.overlay.hidden=hid; }
}
function buildAsteroidsField(box){
  const field=document.createElement("div"); field.className="field arcade asteroids"; field.setAttribute("aria-label","The Chord Asteroids field");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="asteroids"){
    blast.rocks.filter(r=>!r.dead).forEach(r=>field.appendChild(r.el));
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.fx=fxInit(field);
    setTimeout(()=>{ applyChordSize(); asCentre(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  asBar();
  setTimeout(helperSync);
}
function asCentre(){ if(!blast || !blast.field) return; blast.cx=blast.field.clientWidth/2; blast.cy=blast.field.clientHeight/2+10; }
function asBar(){
  if(!blast || blast.kind!=="asteroids" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const ASMENU_G={key:"asteroids", title:"CHORD ASTEROIDS",
  rules:()=>`<p>PLAY A ROCK'S CHORD TO CRACK IT INTO ITS NOTES.</p><p>PLUCK EACH NOTE ON THE HARP TO SHOOT IT DOWN.</p><p class="starline">${PIXEL_STAR}ROCKS SCORE BIG AND NEVER HURT.</p>`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("LABEL SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
  },
  levels:AS_LEVELS, ok:asLevelOk, needs:"NEEDS A MINICHORD",
  begin:i=>beginAsteroids(i), demo:()=>asDemo(), modNote:"always"};
function asMenu(over){ arcadeMenu(ASMENU_G, over); }
function beginAsteroids(level){
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  blast.rocks.forEach(r=>r.el.remove());
  Object.assign(blast,{rocks:[], score:0, lives:3, level, startLevel:level, clears:0, phase:"play", over:false, jamUntil:0,
    next:performance.now()+1200, gap:5200*speedMul()*Math.pow(.94,level), drift:34/speedMul()*Math.pow(1.05,level)});
  if(AS_LEVELS[level].barry && canWrite()) borrow(33,1); else if(canWrite() && hasSetting(33)) ensure(33,0);
  saved.asteroidsStart=level; save();
  stats.streak=0; scoreboard(); asCentre();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(asTick);
  banner(`LEVEL ${level+1}`, `${AS_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); asBar();
}
// a rock: a jagged outline, its label, and where it's heading
function asRock(kind, x, y, label, extra={}){
  const r = kind==="chord" ? 46 : 22, n=11, shape=[...Array(n)].map((_,i)=>({a:i/n*Math.PI*2, d:r*(.78+Math.random()*.3)}));
  const el=document.createElement("span"); el.className=`fchord rock rock-${kind}`+(extra.star?" bonus":"");
  el.innerHTML=(extra.star?PIXEL_STAR:""); el.append(label);
  blast.field.appendChild(el);
  const rock={id:++blast.rockId, kind, x, y, vx:0, vy:0, r, ang:Math.random()*6.28, spin:(Math.random()-.5)*.8, shape, label, el, born:performance.now(), ...extra};
  blast.rocks.push(rock); return rock;
}
function asSpawn(){
  const L=AS_LEVELS[blast.level], W=blast.field.clientWidth, H=blast.field.clientHeight;
  for(let k=0;k<40;k++){
    const root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS), q=rnd(L.qs), tones=spellChord(root,q);
    if(!tones) continue;
    if(blast.rocks.some(r=>!r.dead && r.kind==="chord" && r.label===root+q)) continue;
    // from a random point on the edge, toward the ship, a little off line
    const side=Math.floor(Math.random()*4), t=Math.random();
    const [x,y]=[[t*W,-40],[W+40,t*H],[t*W,H+40],[-40,t*H]][side];
    const ang=Math.atan2(blast.cy-y, blast.cx-x)+(Math.random()-.5)*.5, sp=blast.drift*(.85+Math.random()*.3);
    const star=Math.random()<.1;
    const rock=asRock("chord", x, y, root+q, {root, q, tones, rootPc:pcOfName(root), star});
    rock.vx=Math.cos(ang)*sp; rock.vy=Math.sin(ang)*sp;
    return;
  }
}
function asTick(now){
  if(!blast || blast.kind!=="asteroids") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.phase==="play" || blast.phase==="demo"){
    if(blast.phase==="play" && now>=blast.next && blast.rocks.filter(r=>!r.dead && r.kind==="chord").length<4){ asSpawn(); blast.next=now+blast.gap*(.8+Math.random()*.4); }
    for(const r of blast.rocks){
      if(r.dead) continue;
      if(r.kind==="note"){
        // notes scatter from the crack, then turn back toward the ship
        const ax=blast.cx-r.x, ay=blast.cy-r.y, d=Math.hypot(ax,ay)||1, pull=blast.drift*1.1*Math.min(1,(now-r.born)/1400);
        r.vx+= (ax/d*pull - r.vx)*dt*.9; r.vy+= (ay/d*pull - r.vy)*dt*.9;
      }
      r.x+=r.vx*dt; r.y+=r.vy*dt; r.ang+=r.spin*dt;
      r.el.style.transform=`translate(${r.x}px,${r.y}px) translate(-50%,-50%)`;   // moved, not re-laid out
      if(Math.hypot(r.x-blast.cx, r.y-blast.cy) < r.r*.6+14 && blast.phase==="play") asHitShip(r);
    }
    blast.rocks=blast.rocks.filter(r=>!r.dead || now-r.deadAt<60);
    const low=asNearest("chord"); if(blast.lowEl!==low){ blast.lowEl=low; blast.rocks.forEach(r=>r.el.classList.toggle("low", r===low && !r.star)); }
    if(low && blast.phase==="play") arcadeMod(low.root);
    if(blast.phase==="play"){ const n=asNearest("note"); if(n) helpString(n.pc); else if(blast.helpHarp) helpString(-1); helpChord(low && !n ? low.root : null, low ? low.q : ""); }
  }
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(asTick);
}
function asKill(r){ r.dead=true; r.deadAt=performance.now(); r.el.remove(); }
function asHitShip(r){
  asKill(r); explode(blast.cx, blast.cy, 30, ["#FF4B3E","#FF8A3D","#FFD35A"]);
  if(r.star){ popup(blast.cx, blast.cy-30, "GONE", "#7FE9FF"); return; }
  sfx("miss"); buzz(blast.field,true); blast.lives--; asBar(); blast.shieldAt=performance.now();
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true;
    const best=Math.max(saved.best.asteroids||0, blast.score); saved.best.asteroids=best; save();
    blast.rocks.forEach(x=>{ if(!x.dead) asKill(x); }); asBar(); asMenu(true);
  }
}
// the ship turns to a target and fires a laser at it
function asFire(r, then){
  blast.shipAng=Math.atan2(r.y-blast.cy, r.x-blast.cx);
  sfx("shoot");
  blast.fx.missiles.push({x0:blast.cx/PX, y0:blast.cy/PX, x1:r.x/PX, y1:r.y/PX, t0:performance.now(), dur:140, hit:then});
}
// a chord from the buttons: crack the nearest rock of that chord into its notes
function asteroidsChord(voices){
  if(!blast || blast.kind!=="asteroids") return;
  if(blast.phase==="demo" && blast.demo){ endAsDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,0);
  const hit=blast.rocks.filter(r=>!r.dead && r.kind==="chord" && isChord(pitches, r.rootPc, r.q)).sort((a,b)=>Math.hypot(a.x-blast.cx,a.y-blast.cy)-Math.hypot(b.x-blast.cx,b.y-blast.cy))[0];
  if(!hit){ heard(name,false,"NO SUCH ROCK"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  asKill(hit); asCrack(hit);
}
function asCrack(hit){
  explode(hit.x, hit.y, hit.star?46:34, hit.star?["#7FE9FF","#FFFFFF","#FFD35A"]:["#C9C0A8","#FFD35A","#F1E8D2"]);
  sfx(hit.star?"bonus":"boom");
  const pts=mulPts((hit.star?60:20)*(blast.level+1)); blast.score+=pts; popup(hit.x, hit.y-30, `+${pts}`, hit.star?"#7FE9FF":undefined);
  // its notes fly out in a ring, each spelled as the chord's own
  const group={id:hit.id, left:hit.tones.length, label:hit.label};
  hit.tones.forEach((t,i)=>{
    const a=i/hit.tones.length*Math.PI*2+Math.random()*.4, sp=70+Math.random()*30;
    const n=asRock("note", hit.x+Math.cos(a)*20, hit.y+Math.sin(a)*20, t, {name:t, pc:pcOfName(t), group});
    n.vx=Math.cos(a)*sp; n.vy=Math.sin(a)*sp;
  });
  asBar();
}
// the harp: shoot the nearest rock of the plucked note
function asteroidsNote(pc){
  if(!blast || blast.kind!=="asteroids") return;
  if(blast.phase==="demo" && blast.demo){ endAsDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const now=performance.now();
  if(now<blast.jamUntil){ heard("",false,"JAMMED"); return; }
  const r=blast.rocks.filter(x=>!x.dead && x.kind==="note" && x.pc===pc).sort((a,b)=>Math.hypot(a.x-blast.cx,a.y-blast.cy)-Math.hypot(b.x-blast.cx,b.y-blast.cy))[0];
  const nm=(r && r.name) || SHARP_NAMES[pc];
  if(!r){ heard(nm,false,"NO SUCH ROCK"); sfx("freeze"); blast.jamUntil=now+1100+120*blast.level; popup(blast.cx, blast.cy+40, "JAMMED", "#7FE9FF"); return; }
  heard(nm,true);
  r.dead=true;                                        // spoken for: no second shot at it
  asFire(r, ()=>{ r.deadAt=performance.now(); r.el.remove(); explode(r.x, r.y, 16);
    const pts=mulPts(10*(blast.level+1)); blast.score+=pts; popup(r.x, r.y-14, `+${pts}`);
    sfx("boom");
    if(--r.group.left===0) asCleared(r.group, r.x, r.y);
    asBar(); });
}
function asCleared(group, x, y){
  const pts=mulPts(25*(blast.level+1)); blast.score+=pts; blast.clears++; stats.streak=blast.clears; scoreboard();
  popup(x, y-34, `${group.label} CLEARED +${pts}`, "#FFD35A");
  if(blast.clears%6===0){
    const was=blast.level;
    for(let n=blast.level+1;n<AS_LEVELS.length;n++) if(asLevelOk(n)){ blast.level=n; break; }
    blast.gap=Math.max(1800*speedMul(), blast.gap*.9); blast.drift*=1.06; sfx("level");
    if(blast.level!==was){ banner(`LEVEL ${blast.level+1}`, AS_LEVELS[blast.level].n.toUpperCase()); if(AS_LEVELS[blast.level].barry && canWrite()) borrow(33,1); }
    else banner("FASTER!");
  }
  asBar();
}
// the ship, and the rocks' outlines, on the starfield's canvas
function asDraw(g, now){
  const P=PX, cx=blast.cx/P, cy=blast.cy/P;
  for(const r of blast.rocks){ if(r.dead) continue;
    g.strokeStyle = r.star ? "#7FE9FF" : r.kind==="chord" ? "#C9C0A8" : "#F1E8D2"; g.lineWidth=1;
    g.beginPath(); r.shape.forEach((p,i)=>{ const x=r.x/P+Math.cos(p.a+r.ang)*p.d/P, y=r.y/P+Math.sin(p.a+r.ang)*p.d/P; i?g.lineTo(x,y):g.moveTo(x,y); }); g.closePath(); g.stroke(); }
  // the ship: a pixel triangle turned toward its last shot, with a shield flash when hit
  const a=blast.shipAng, pt=(d,o)=>[cx+Math.cos(a+o)*d, cy+Math.sin(a+o)*d];
  const hurt=now-(blast.shieldAt||0)<500, jam=now<blast.jamUntil;
  g.fillStyle = hurt ? "#FF4B3E" : jam ? "#7FE9FF" : "#F1E8D2";
  g.beginPath(); const [x1,y1]=pt(10,0), [x2,y2]=pt(8,2.5), [x3,y3]=pt(8,-2.5), [x4,y4]=pt(3,Math.PI); g.moveTo(x1,y1); g.lineTo(x2,y2); g.lineTo(x4,y4); g.lineTo(x3,y3); g.closePath(); g.fill();
  if(hurt){ g.strokeStyle="rgba(255,75,62,.7)"; g.beginPath(); g.arc(cx,cy,10,0,Math.PI*2); g.stroke(); }
}

// ---------- Chord Asteroids' demo ----------
function asDemo(){
  if(!blast || blast.kind!=="asteroids") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; asCentre(); blast.drift=40;
  const {el, token, say, sleep, step}=demoShell(endAsDemo), $d=s=>el.querySelector(s);
  const play=notes=>{ if(settings.sounds && piano.ctx){ const go=()=>piano.play(notes,{when:.02,dur:1.1}); piano.ctx.state==="running"?go():piano.ctx.resume().then(go).catch(()=>{}); } };
  demoHarp("asteroids");
  sfx("attract");
  (async()=>{
    try{
      say("CHORD ASTEROIDS","CHORD ROCKS DRIFT TOWARD YOUR SHIP.");
      const W=blast.field.clientWidth;
      const rock=asRock("chord", W*.2, blast.cy-60, "E7", {root:"E", q:"7", tones:["E","G♯","B","D"], rootPc:4});
      rock.vx=28; rock.vy=12; await step(3000);
      say("CRACK IT","PLAY ITS CHORD ON THE BUTTONS: E7 CRACKS INTO E, G♯, B AND D.");
      blast.helpKey=null; helpChord("E","7"); await step(1400);                 // its buttons light on the minichord
      play([52,56,59,62]); asKill(rock); asCrack(rock); blast.score=0; await step(700);
      blast.helpKey=null; helpChord(null); await step(600);
      say("SHOOT THE NOTES","PLUCK EACH NOTE ON THE HARP. THE SHIP TURNS AND FIRES.");
      for(const nm of ["E","G♯","B","D"]){
        await step(650);
        const r=blast.rocks.find(x=>!x.dead && x.kind==="note" && x.name===nm); if(!r) continue;
        play([60+r.pc]); r.dead=true; helpString(r.pc);
        asFire(r, ()=>{ r.deadAt=performance.now(); r.el.remove(); explode(r.x,r.y,16); sfx("boom"); });
      }
      await step(1000); say("","EVERY NOTE OF A CHORD SHOT DOWN SCORES A BONUS. A WRONG STRING JAMS YOUR GUN."); await step(3400);
      say("READY?","CHOOSE A LEVEL."); sfx("level"); await step(2600);
      endAsDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endAsDemo(token){
  if(blast && blast.demo===token) demoHarpDone();
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.rocks.forEach(r=>{ if(!r.dead) asKill(r); }); blast.rocks=[]; blast.score=0;
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=setTimeout(()=>{ if(blast && blast.kind==="asteroids" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) asDemo(); }, 25000);
  cabRestart();
}
