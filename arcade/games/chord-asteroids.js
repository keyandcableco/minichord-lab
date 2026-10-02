// Chord Asteroids: crack a rock with its chord, shoot its notes on the harp. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Asteroids ----------
// Asteroids for spelling chords both ways. Big chord asteroids drift in from the edges toward the
// ship in the middle. Play a rock's chord on the buttons and it cracks into its notes, smaller rocks
// each spelled as a note of the chord (E7 breaks into E, G♯, B and D), which scatter and then turn
// back toward the ship. Pluck each note on the harp and the ship turns and shoots it. The ship flies
// an orbit round the middle, swung round by the mod knob or the arrow keys, to dodge. A rock that
// reaches the ship costs a life; a string that plays no rock jams the gun for a moment, so
// strumming doesn't pay. Clearing every note of a chord scores a bonus. Now and then a power-up rock
// comes (chord-asteroids-power.js), and every two levels its own bonus round, SALVAGE RUN (bonus.js).
const AS_LEVELS=[
  {n:"Major and minor", qs:["","m"], roots:"natural"},
  {n:"Sharps and flats", qs:["","m"], roots:"all"},
  {n:"Sevenths", qs:["","m","7","maj7","m7"], roots:"all"},
  {n:"Diminished and augmented", qs:["","m","7","maj7","m7","°","+"], roots:"all"},
  {n:"Barry Harris", qs:["6","m6","7","maj7","m7","°7"], roots:"all", barry:true},
];
const asLevelOk=i=> !AS_LEVELS[i].barry || (canWrite() && mxStandard());     // Barry Harris is a standard-matrix lesson
const asLevelName=i=>mxLevelName(AS_LEVELS[i].n, j=>AS_LEVELS[j].qs, i);
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
  arcadeSetup(()=>{ asHarp(); if(knobsReady()) borrow(238,1); });            // the knobs sending MIDI, to fly the ship
  const sig=AS_LEVELS.map((_,i)=>asLevelOk(i)).join()+mxAvailable().length;
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ menuRebuild(()=>asMenu()); }
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
// The ship flies an orbit round the middle of the field: the mod knob (or the arrow keys) swings it
// round, to dodge what's coming. The rocks aim at wherever it is, and its shots fly from there.
function asCentre(){ if(!blast || !blast.field) return; blast.hx=blast.field.clientWidth/2; blast.hy=blast.field.clientHeight/2+10;
  blast.orbitR=Math.min(blast.field.clientWidth, blast.field.clientHeight)*.24; asPlace(); }
function asPlace(){ const a=blast.orbitA??Math.PI/2; blast.cx=blast.hx+Math.cos(a)*blast.orbitR; blast.cy=blast.hy+Math.sin(a)*blast.orbitR; }
// Both knobs turn endlessly, as Fifths Defender's does: a knob has end stops, so held against either
// one, the orbit (or the ship's aim) keeps turning that way, and the whole mapping turns with it, so
// the knob never jumps back when it's turned away from the stop.
const AS_EDGE=.025, AS_EDGE_WAIT=420, AS_EDGE_RATE=1.25;   // how close to a stop counts, how long before it starts, radians a second
function asKnob(v){ if(!blast || blast.kind!=="asteroids") return; blast.orbitV=v; blast.orbitWant=Math.PI/2+(v-.5)*2*Math.PI+(blast.orbitOffset||0); }   // the knob's whole turn is one lap
function asEdge(now, dt){
  for(const [V, off, apply] of [["orbitV","orbitOffset",asKnob], ["aimV","aimOffset",asAim]]){
    const v=blast[V], at=V+"EdgeAt"; if(v==null || blast.phase!=="play"){ blast[at]=null; continue; }
    const dir = v<=AS_EDGE ? -1 : v>=1-AS_EDGE ? 1 : 0;
    if(!dir){ blast[at]=null; continue; }
    if(blast[at]==null){ blast[at]=now+AS_EDGE_WAIT; continue; }
    if(now<blast[at]) continue;
    blast[off]=(blast[off]||0)+dir*AS_EDGE_RATE*dt; apply(v);
  }
}
// Manual aim (an option, worth double): a second knob spins the ship, and a harp pluck fires where it
// points. The aim knob is whichever of the chord and harp knobs isn't steering. Those two always move
// their volumes, so on firmware with knob layer the game puts the knobs on their alternates and points
// those at unused addresses: turning them then changes nothing on the minichord while "knobs send
// MIDI" still reports where they are. Without knob layer, the up and down arrows aim instead.
const asAimKnob=()=> steerKnob()===0 ? 1 : 0;
const asManual=()=> !!(blast && blast.kind==="asteroids" && blast.aimManual);
function asAim(v){ if(!asManual()) return; blast.aimV=v; blast.aimWant=-Math.PI/2+(v-.5)*2*Math.PI+(blast.aimOffset||0); }   // a whole turn of the knob, a whole turn of the ship
const asKnobsInert=()=>arcadeKnobsInert();
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="asteroids" || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowLeft:1,ArrowRight:-1}[e.code];
  if(!d){ const a={ArrowUp:-1,ArrowDown:1}[e.code]; if(a && asManual()){ e.preventDefault(); blast.aimWant=(blast.aimWant??blast.shipAng)+a*.2; } return; }
  e.preventDefault(); blast.orbitWant=(blast.orbitWant??blast.orbitA??Math.PI/2)+d*.22;
});
function asBar(){
  if(!blast || blast.kind!=="asteroids" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${mxTag()}${asPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}
const ASMENU_G={key:"asteroids", title:"CHORD ASTEROIDS",
  rules:()=>`<p>PLAY A ROCK'S CHORD TO CRACK IT INTO ITS NOTES.</p><p>PLUCK EACH NOTE ON THE HARP TO SHOOT IT DOWN.</p><p>FLY ROUND YOUR ORBIT TO DODGE: THE MOD KNOB, OR THE ARROW KEYS. HOLD A KNOB AT ITS END AND IT KEEPS GOING ROUND.</p><p>MANUAL AIM SCORES DOUBLE: SPIN THE SHIP WITH ANOTHER KNOB (OR ↑ ↓). A CHORD OR A PLUCK FIRES WHERE IT POINTS.</p><p class="starline">${PIXEL_STAR}ROCKS SCORE BIG AND NEVER HURT.</p><p>NOW AND THEN A POWER-UP ROCK: CRACK IT WITH ITS CHORD TO TAKE IT.</p>`,
  rows:row=>{
    mxRow(row, ()=>menuRebuild(()=>asMenu()));
    row("AIM", ["AUTO","MANUAL ×2"], ()=>saved.asAim?1:0, i=>{ saved.asAim=i; save(); });
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("LABEL SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
  },
  levels:AS_LEVELS, ok:asLevelOk, levelName:asLevelName, sig:()=>String(mxAvailable().length), needs:"NEEDS A MINICHORD",
  begin:i=>beginAsteroids(i), demo:()=>asDemo(), modNote:"always"};
function asMenu(over){ arcadeMenu(ASMENU_G, over); }
function beginAsteroids(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  blast.rocks.forEach(r=>r.el.remove());
  Object.assign(blast,{rocks:[], score:0, lives:3, level, startLevel:level, clears:0, phase:"play", over:false, jamUntil:0, asPower:null, sprayAt:0, aimManual:!!saved.asAim, aimWant:null, orbitOffset:0, aimOffset:0, orbitV:null, aimV:null,
    next:performance.now()+1200, gap:5200*speedMul()*Math.pow(.94,level), drift:34/speedMul()*Math.pow(1.05,level)});
  if(AS_LEVELS[level].barry && canWrite()) borrow(33,1); else if(canWrite() && hasSetting(33)) ensure(33,0);
  mxApply();                                    // the minichord to the chosen matrix
  saved.asteroidsStart=level; save();
  if(blast.aimManual){ const inert=asKnobsInert(); blast.aimWant=blast.shipAng;
    banner("MANUAL AIM ×2", inert ? `SPIN THE SHIP WITH THE ${KNOB_NAMES[asAimKnob()]} KNOB` : "SPIN THE SHIP WITH ↑ ↓"); }
  stats.streak=0; scoreboard(); asCentre();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(asTick);
  banner(`LEVEL ${level+1}`, `${asLevelName(level).toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); asBar();
}
// a rock: a jagged outline, its label, and where it's heading
function asRock(kind, x, y, label, extra={}){
  const r = kind==="chord" ? 46 : 22, n=11, shape=[...Array(n)].map((_,i)=>({a:i/n*Math.PI*2, d:r*(.78+Math.random()*.3)}));
  const el=document.createElement("span"); el.className=`fchord rock rock-${kind}`+(extra.star?" bonus":"");
  el.innerHTML=(extra.star?PIXEL_STAR:""); el.append(label);
  if(extra.power){ el.classList.add("power", `pu-${extra.power}`); el.insertAdjacentHTML("afterbegin", asPowerLook(extra.power, "")); }
  blast.field.appendChild(el);
  const rock={id:++blast.rockId, kind, x, y, vx:0, vy:0, r, ang:Math.random()*6.28, spin:(Math.random()-.5)*.8, shape, label, el, born:performance.now(), ...extra};
  blast.rocks.push(rock); return rock;
}
function asSpawn(){
  const L=AS_LEVELS[blast.level], W=blast.field.clientWidth, H=blast.field.clientHeight;
  for(let k=0;k<40;k++){
    const root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS), q=mxQ(rnd(L.qs)), tones=spellChord(root,q);
    if(!tones) continue;
    if(blast.rocks.some(r=>!r.dead && r.kind==="chord" && r.label===root+q)) continue;
    // from a random point on the edge, toward the ship, a little off line
    const side=Math.floor(Math.random()*4), t=Math.random();
    const [x,y]=[[t*W,-40],[W+40,t*H],[t*W,H+40],[-40,t*H]][side];
    const ang=Math.atan2(blast.cy-y, blast.cx-x)+(Math.random()-.5)*.5, sp=blast.drift*(.85+Math.random()*.3);
    const power=asPowerChance(), star=!power && Math.random()<.1;          // now and then a power-up, cracked like any rock
    const rock=asRock("chord", x, y, root+q, {root, q, tones, rootPc:pcOfName(root), star, power});
    rock.vx=Math.cos(ang)*sp; rock.vy=Math.sin(ang)*sp;
    return;
  }
}
function asTick(now){
  if(!blast || blast.kind!=="asteroids") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.orbitWant!=null && blast.hx!=null){ const a=blast.orbitA??Math.PI/2, d=blast.orbitWant-a;   // the ship glides round to where it's steered
    blast.orbitA = Math.abs(d)<.002 ? blast.orbitWant : a+d*Math.min(1,dt*9); asPlace(); }
  asEdge(now, dt);
  if(blast.phase==="demo" && blast.demo && typeof helpKnobFollow==="function"){   // the demo's steering and aiming, on the on-screen knobs
    const lap=a=>mod((a/(2*Math.PI))+.5, 1);
    if(blast.orbitWant!=null) helpKnobFollow(steerKnob(), lap(blast.orbitWant-Math.PI/2));
    if(blast.aimManual && blast.aimWant!=null) helpKnobFollow(asAimKnob(), lap(blast.aimWant+Math.PI/2)); }
  if(asManual() && blast.aimWant!=null){ const d=blast.aimWant-blast.shipAng; blast.shipAng += Math.abs(d)<.002 ? d : d*Math.min(1,dt*12); }
  if(blast.phase==="bonus" && typeof bonusPlaying==="function" && bonusPlaying() && blast.bonus.g.move) blast.bonus.g.move(blast.bonus, now, dt);   // its own bonus round's wreckage drifts
  if(blast.phase==="play") asPowerTick(now, dt);                         // a power running out, the pedal firing
  const held = blast.phase==="play" && asFrozen();                      // fermata: nothing moves
  if(blast.phase==="play" || blast.phase==="demo"){
    if(blast.phase==="play" && now>=blast.next && blast.rocks.filter(r=>!r.dead && r.kind==="chord").length<4){ asSpawn(); blast.next=now+blast.gap*(.8+Math.random()*.4); }
    for(const r of blast.rocks){
      if(r.dead || held) continue;
      if(r.kind==="note"){
        // notes scatter from the crack, then turn back toward the ship
        const ax=blast.cx-r.x, ay=blast.cy-r.y, d=Math.hypot(ax,ay)||1, pull=blast.drift*1.1*Math.min(1,(now-r.born)/1400);
        r.vx+= (ax/d*pull - r.vx)*dt*.9; r.vy+= (ay/d*pull - r.vy)*dt*.9;
      }
      r.x+=r.vx*dt; r.y+=r.vy*dt; r.ang+=r.spin*dt;
      // a chord rock that sails off the screen wraps round, as in Asteroids, aimed again at the ship where
      // it is now (it moves; a rock aimed where it was could miss and fly off for ever)
      if(r.kind==="chord" && blast.fx){ const W=blast.fx.fw, H=blast.fx.fh, M=60; let wrap=false;
        if(r.x<-M){ r.x=W+M-1; wrap=true; } else if(r.x>W+M){ r.x=-M+1; wrap=true; }
        if(r.y<-M){ r.y=H+M-1; wrap=true; } else if(r.y>H+M){ r.y=-M+1; wrap=true; }
        if(wrap){ const sp=Math.hypot(r.vx,r.vy), ang=Math.atan2(blast.cy-r.y, blast.cx-r.x)+(Math.random()-.5)*.4; r.vx=Math.cos(ang)*sp; r.vy=Math.sin(ang)*sp; } }
      r.el.style.transform=`translate(${r.x}px,${r.y}px) translate(-50%,-50%)`;   // moved, not re-laid out
      if(Math.hypot(r.x-blast.cx, r.y-blast.cy) < r.r*.6+8 && blast.phase==="play") asHitShip(r);
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
  if(r.star || r.power){ popup(blast.cx, blast.cy-30, "GONE", "#7FE9FF"); return; }   // a ★ rock or a power-up costs nothing
  sfx("miss"); buzz(blast.field,true); blast.lives--; asBar(); blast.shieldAt=performance.now();
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true;
    const best=Math.max(saved.best.asteroids||0, blast.score); saved.best.asteroids=best; save();
    blast.rocks.forEach(x=>{ if(!x.dead) asKill(x); }); asBar(); asMenu(true);
  }
}
// the ship turns to a target and fires a laser at it
// manual aim: whether a rock is roughly where the ship points (within about 12 degrees, or the shot's
// line passing through the rock itself, which matters for a big chord rock close by)
function asInLine(x){
  const a=Math.atan2(x.y-blast.cy, x.x-blast.cx), d=Math.abs(((a-blast.shipAng)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);
  return d<.21 || (d<Math.PI/2 && Math.hypot(x.x-blast.cx,x.y-blast.cy)*Math.sin(d)<x.r*.8);
}
// a shot along the ship's heading that meets nothing: it flies off the screen
function asWide(now){
  const far=Math.max(blast.field.clientWidth, blast.field.clientHeight);
  blast.fx.missiles.push({x0:blast.cx/PX, y0:blast.cy/PX, x1:(blast.cx+Math.cos(blast.shipAng)*far)/PX, y1:(blast.cy+Math.sin(blast.shipAng)*far)/PX, t0:now, dur:260, hit:()=>{}});
}
function asFire(r, then){
  if(!asManual()) blast.shipAng=Math.atan2(r.y-blast.cy, r.x-blast.cx);
  sfx("shoot");
  blast.fx.missiles.push({x0:blast.cx/PX, y0:blast.cy/PX, x1:r.x/PX, y1:r.y/PX, t0:performance.now(), dur:140, hit:then});
}
// a chord from the buttons: crack the nearest rock of that chord into its notes
function asteroidsChord(voices){
  if(!blast || blast.kind!=="asteroids") return;
  if(blast.phase==="demo" && blast.demo){ endAsDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,0);
  if(asResolve(pitches)) return;                                     // a resolution held, and the home chord played
  const pool=blast.rocks.filter(r=>!r.dead && r.kind==="chord" && isChord(pitches, r.rootPc, r.q));
  const hit=(asManual() ? pool.filter(asInLine) : pool).sort((a,b)=>Math.hypot(a.x-blast.cx,a.y-blast.cy)-Math.hypot(b.x-blast.cx,b.y-blast.cy))[0];
  if(!hit && asManual() && pool.length){ heard(name,false,"WIDE"); sfx("shoot"); asWide(performance.now()); return; }   // that rock's there, but not where the ship points
  if(!hit){ heard(name,false,"NO SUCH ROCK"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  if(asManual()){ hit.dead=true; asFire(hit, ()=>{ hit.deadAt=performance.now(); hit.el.remove(); asCrack(hit); }); return; }   // the shot flies to it, then it cracks
  asKill(hit); asCrack(hit);
}
// a chord rock is worth what the chord is, as in Chord Invaders: major 10 up to 50 for the sixths and
// diminished sevenths, half again when it needs the modifier, three times for a star rock
function asChordPoints(hit){
  let p=BLAST_WORTH[hit.q] ?? 10;
  const {li,acc}=parse(hit.root); if(acc!==keyAcc(li, devFifths())) p*=1.5;
  if(hit.star) p*=3;
  return mulPts(Math.round(p)*(blast.level+1));
}
function asCrack(hit){
  explode(hit.x, hit.y, hit.star?46:34, hit.star?["#7FE9FF","#FFFFFF","#FFD35A"]:["#C9C0A8","#FFD35A","#F1E8D2"]);
  sfx(hit.star?"bonus":"boom");
  const pts=asChordPoints(hit); blast.score+=pts; popup(hit.x, hit.y-30, `+${pts}`, hit.star?"#7FE9FF":undefined);
  if(hit.power){ explode(hit.x, hit.y, 44, ["#FF5AA0","#FFD35A","#7FE9FF"]); asPowerGet(hit); asBar(); return; }   // a power-up bursts into its power, not its notes
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
  if(typeof bonusPlaying==="function" && bonusPlaying()){ const b=blast.bonus; if(b.g.pluck) b.g.pluck(b, pc); return; }   // its own bonus round
  if(blast.phase!=="play") return;
  const now=performance.now();
  if(now<blast.jamUntil){ heard("",false,"JAMMED"); return; }
  const pool=blast.rocks.filter(x=>!x.dead && x.kind==="note" && x.pc===pc);
  if(asPedalPluck(pc, pool.length>0)) return;                        // pedal point: a string with no rock moves the pedal there
  const r=(asManual() ? pool.filter(asInLine) : pool).sort((a,b)=>Math.hypot(a.x-blast.cx,a.y-blast.cy)-Math.hypot(b.x-blast.cx,b.y-blast.cy))[0];
  const nm=(r && r.name) || SHARP_NAMES[pc];
  if(!r && asManual() && pool.length){                    // there is such a note, but not where the ship points: the shot goes wide
    heard(nm,false,"WIDE"); sfx("shoot"); blast.jamUntil=now+450; asWide(now);
    return; }
  if(!r){ heard(nm,false,"NO SUCH ROCK"); sfx("freeze"); blast.jamUntil=now+1100+120*blast.level; popup(blast.cx, blast.cy+40, "JAMMED", "#7FE9FF"); return; }
  heard(nm,true);
  asShootNote(r);
}
// a note rock shot down, by its string or by the pedal: the ship turns (the pedal's shots fly from
// wherever it points, without turning it), and the note scores, the last of its chord a bonus
function asShootNote(r, pedal){
  r.dead=true;                                        // spoken for: no second shot at it
  const then=()=>{ r.deadAt=performance.now(); r.el.remove(); explode(r.x, r.y, 16);
    const pts=mulPts(10*(blast.level+1)); blast.score+=pts; popup(r.x, r.y-14, `+${pts}`, pedal?"#FF8A3D":undefined);
    sfx("boom");
    if(--r.group.left===0) asCleared(r.group, r.x, r.y);
    asBar(); };
  if(!pedal) return asFire(r, then);
  sfx("shoot"); blast.fx.missiles.push({x0:blast.cx/PX, y0:blast.cy/PX, x1:r.x/PX, y1:r.y/PX, t0:performance.now(), dur:140, hit:then});
}
function asCleared(group, x, y){
  const pts=mulPts(25*(blast.level+1)); blast.score+=pts; blast.clears++; stats.streak=blast.clears; scoreboard();
  popup(x, y-34, `${group.label} CLEARED +${pts}`, "#FFD35A");
  if(blast.clears%6===0){
    const was=blast.level;
    for(let n=blast.level+1;n<AS_LEVELS.length;n++) if(asLevelOk(n)){ blast.level=n; break; }
    blast.gap=Math.max(1800*speedMul(), blast.gap*.9); blast.drift*=1.06; sfx("level");
    if(blast.level!==was){ banner(`LEVEL ${blast.level+1}`, asLevelName(blast.level).toUpperCase()); if(AS_LEVELS[blast.level].barry && canWrite()) borrow(33,1); }
    else banner("FASTER!");
  }
  asBar();
}
// the ship, and the rocks' outlines, on the starfield's canvas
// The rocks, the ship and its orbit, drawn sharp on their own canvas over the pixel starfield, at
// the sizes they always had: U is one of the shared canvas's pixels.
function asDraw(_g, now){
  if(!blast.sharp) blast.sharp=sharpLayer(blast.fx);
  const g=sharpBegin(blast.sharp), U=PX, cx=blast.cx, cy=blast.cy;
  const round=typeof bonusInField==="function" && bonusInField(), still=asFrozen();
  for(const r of blast.rocks){ if(r.dead) continue;
    g.globalAlpha = round && r.kind!=="salvage" ? .25 : 1;               // the game's own rocks, dimmed behind its bonus round
    g.strokeStyle = still ? "#7FE9FF" : r.star ? "#7FE9FF" : r.power ? "#FF5AA0" : r.kind==="chord" ? "#C9C0A8" : r.kind==="salvage" ? "#FFD35A" : "#F1E8D2"; g.lineWidth=U*.7;
    g.beginPath(); r.shape.forEach((p,i)=>{ const x=r.x+Math.cos(p.a+r.ang)*p.d, y=r.y+Math.sin(p.a+r.ang)*p.d; i?g.lineTo(x,y):g.moveTo(x,y); }); g.closePath(); g.stroke();
    if(r.towed){ g.strokeStyle="rgba(127,233,255,.7)"; g.lineWidth=U*.5; g.setLineDash([U*1.5,U*1.5]); g.beginPath(); g.moveTo(cx,cy); g.lineTo(r.x,r.y); g.stroke(); g.setLineDash([]); } }   // salvage's tractor beam
  g.globalAlpha=1;
  asPowerDraw(g, U, now);
  // the ship: a triangle turned toward its aim or its last shot, with a shield flash when hit
  const a=blast.shipAng, pt=(d,o)=>[cx+Math.cos(a+o)*d*U, cy+Math.sin(a+o)*d*U];
  const hurt=now-(blast.shieldAt||0)<500, jam=now<blast.jamUntil || now<(blast.bonus?.jamUntil||0);   // the gun jammed, or its bonus round's beam
  g.fillStyle = hurt ? "#FF4B3E" : jam ? "#7FE9FF" : "#F1E8D2";
  g.beginPath(); const [x1,y1]=pt(6,0), [x2,y2]=pt(5,2.5), [x3,y3]=pt(5,-2.5), [x4,y4]=pt(2,Math.PI); g.moveTo(x1,y1); g.lineTo(x2,y2); g.lineTo(x4,y4); g.lineTo(x3,y3); g.closePath(); g.fill();
  if(hurt){ g.strokeStyle="rgba(255,75,62,.7)"; g.lineWidth=U*.7; g.beginPath(); g.arc(cx,cy,7*U,0,Math.PI*2); g.stroke(); }
  // manual aim: a faint line where a shot would go
  if(asManual()){ g.strokeStyle="rgba(255,211,90,.22)"; g.lineWidth=U*.5; g.setLineDash([U*2,U*3]); g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*U*120, cy+Math.sin(a)*U*120); g.stroke(); g.setLineDash([]); }
  // the orbit, faintly
  if(blast.orbitR){ g.strokeStyle="rgba(157,152,201,.18)"; g.lineWidth=U*.6; g.beginPath(); g.arc(blast.hx, blast.hy, blast.orbitR, 0, Math.PI*2); g.stroke(); }
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
      // dodging: a rock comes straight for the ship, and the ship swings round its orbit out of the way
      say("DODGE","YOUR SHIP FLIES AN ORBIT. SWING ROUND IT TO DODGE: THE MOD KNOB, OR THE ARROW KEYS.");
      const W2=blast.field.clientWidth, incoming=asRock("chord", W2-50, blast.cy, "Am", {root:"A", q:"m", tones:["A","C","E"], rootPc:9});
      incoming.vx=-(W2-50-blast.cx)/2.6; incoming.vy=0; await step(1100);
      blast.orbitWant=(blast.orbitA??Math.PI/2)-Math.PI*.55; sfx("press"); await step(1900);   // swung clear: the rock sails through where it was
      if(!incoming.dead) asKill(incoming); await step(900);
      // manual aim: the ship spins to point, and the pluck fires where it points
      say("MANUAL AIM ×2","AN OPTION: SPIN THE SHIP WITH ANOTHER KNOB, AND A PLUCK FIRES WHERE IT POINTS. NOTES SCORE DOUBLE.");
      blast.aimManual=true; blast.aimWant=blast.shipAng+Math.PI*.75; await step(1500);
      const aimed=asRock("note", blast.cx+Math.cos(blast.aimWant)*170, blast.cy+Math.sin(blast.aimWant)*170, "G", {name:"G", pc:7, group:{left:1, label:"G"}});
      aimed.born=performance.now()-5000; await step(900);
      aimed.dead=true; helpString(7); demoPlay([67]); asFire(aimed, ()=>{ aimed.deadAt=performance.now(); aimed.el.remove(); explode(aimed.x, aimed.y, 16); sfx("boom"); });
      await step(1800); blast.aimManual=false; blast.aimWant=null;
      // a power-up: a capsule rock cracked by its chord, and pedal point shooting every E in sight
      await asDemoPedal(step, say);
      say("READY?","CHOOSE A LEVEL."); sfx("level"); await step(2600);
      endAsDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
// the demo's power-up scene: a pedal point capsule cracked by its chord, then one pluck of E held,
// and every E rock shot down as it comes
async function asDemoPedal(step, say){
  say("POWER-UPS","NOW AND THEN A POWER-UP ROCK: CRACK IT WITH ITS CHORD. PEDAL POINT HOLDS A NOTE AND SHOOTS EVERY ROCK OF IT.");
  const W=blast.field.clientWidth, cap=asRock("chord", W*.78, blast.cy-70, "D", {root:"D", q:"", tones:["D","F♯","A"], rootPc:2, power:"pedal"});
  cap.vx=-14; cap.vy=6; await step(1600);
  blast.helpKey=null; helpChord("D",""); await step(900);
  demoPlay([50,54,57]); asKill(cap); asCrack(cap); blast.helpKey=null; helpChord(null); await step(1100);
  const group={left:99, label:"E"};                          // never cleared: a demo doesn't climb levels
  const es=[[-.9,150],[2.3,190],[.5,210]].map(([a,d])=>{ const r=asRock("note", blast.cx+Math.cos(a)*d, blast.cy+Math.sin(a)*d, "E", {name:"E", pc:4, group}); r.vx=r.vy=0; r.born=performance.now(); return r; });
  await step(700);
  helpString(4); demoPlay([64]); if(blast.asPower) blast.asPower.pc=4;
  for(const r of es){ await step(450); if(!r.dead) asShootNote(r, true); }
  await step(1600); helpString(-1);
  blast.asPower=null; blast.score=0; asBar();
}
function endAsDemo(token){
  if(blast && blast.demo===token) demoHarpDone();
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.rocks.forEach(r=>{ if(!r.dead) asKill(r); }); blast.rocks=[]; blast.score=0; blast.asPower=null;
  blast.orbitWant=Math.PI/2;                                                   // the ship home to its starting place
  blast.aimManual=false; blast.aimWant=null; blast.shipAng=-Math.PI/2;
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.kind==="asteroids" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) asDemo(); }, 25000);
  cabRestart();
}
