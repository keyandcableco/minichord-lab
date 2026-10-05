// Sus Bros.: the pipe game, where every pest is a suspended chord, bumped and then resolved. With its
// demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
// ---------- Sus Bros. ----------
// The old pipe game, whose one move is two steps: bump a floor from underneath and whatever's walking
// on it flips over, then finish it off before it rights itself. That's a suspension: a note held over
// into a chord it doesn't belong to, the tension, then stepping to where it does, the resolution. So
// every pest that comes out of the pipes is a suspended chord of the phase's key, and once it's flipped
// it's cleared by its resolution:
//   the creepers  sus4, the 4th falling to the 3rd: Csus4 to C, Dsus4 to Dm (the key says which third)
//   the flies     sus2, the 2nd rising to the 3rd: Csus2 to C. They hop, and flip only when they land.
//   the crabs     7sus4, two bumps: the first resolves it halfway, to its dominant seventh (G7sus4 to
//                 G7), and angry it hurries; the second flips it, and the dominant resolves home (G7 to C)
//   the ice       a diminished seventh: no bump stops it, but a chord a semitone above any of its notes
//                 melts it, the four ways it can resolve
// Left flipped too long, a pest rights itself, faster; one that walks off the bottom unresolved goes
// down the pipe and comes back out at the top, faster again. Unresolved tension keeps coming round.
//
// A pest flipped sounds its suspension, the tension hanging, and the player's chord completes it: the
// resolution's all a flipped pest needs, on the minichord's own buttons. SUSPENSIONS on the title
// screen, for half as much again, where the minichord can load its alternate layout's slots (firmware
// with 202 to 208, or the screen's): SUSPEND loads the sus layout while the game plays (major, minor and
// 7 where they always are, sus4 on major and 7 held together, sus2 on minor and 7, 7sus4 on major and
// minor, °7 on all three), and a pest is cleared by playing its suspension and then its resolution, the
// 4–3 played out: hold a column's major and 7 for Csus4, let go of the 7, and it's C.
//
// Every pest cleared sends a coin out of a pipe; the coins are the key's scale, each collected
// sounding its note, so a phase's coins run up the scale. The POW block, bumped from underneath,
// flips every pest on a floor, three times. The screen wraps round at the sides, as the old game's
// did. The player walks while a way's held on the harp (kmHeld, ../controller.js) or the arrow keys,
// and jumps on A (or Space); a jump goes where it was aimed, and a fall never hurts. A walking pest
// that touches the player costs a life.

// ---------- the floors ----------
// Four floors and the ground, each girders between x0 and x1 at a height; the POW block is a girder of
// its own. Pipes in the top corners let the pests out, and in the bottom corners take them back in.
const SB_W=240, SB_H=216, SB_T=6;                                    // the screen; a floor's thickness
const SB_FLOORS=[
  {y:204, segs:[[0,240]]},
  {y:156, segs:[[0,96],[144,240]], pow:[108,132]},
  {y:108, segs:[[0,24],[64,176],[216,240]]},
  {y:60,  segs:[[0,104],[136,240]]},
];
const SB_START={x:60, f:0};
const SB_PIPE_IN=14;                                                 // how far into the bottom corners a pest goes down its pipe
const sbFloorsNow=()=> blast.floors || SB_FLOORS;
// the segments of floor f, the POW block among them while it lasts
const sbSegs=f=>{ const F=SB_FLOORS[f]; return F.pow && blast.pow>0 ? [...F.segs, F.pow] : F.segs; };
const sbOn=(f, x)=> sbSegs(f).some(([a,b])=>x>=a && x<=b);
const sbWrap=x=> ((x%SB_W)+SB_W)%SB_W;
const sbDx=(a,b)=>{ let d=a-b; if(d>SB_W/2) d-=SB_W; if(d<-SB_W/2) d+=SB_W; return d; };
// whether a floor runs off both sides of the screen, so whatever walks off one comes on at the other
const sbWraps=f=>{ const s=SB_FLOORS[f].segs; return s.some(([a])=>a<=0) && s.some(([,b])=>b>=SB_W); };

// ---------- chords, keys and levels ----------
// The pests' chords, by the key's degree: [degree, letters up, semitones up, the third the key gives it]
const SB_DEGREES={I:[0,0,""], ii:[1,2,"m"], iii:[2,4,"m"], IV:[3,5,""], V:[4,7,""], vi:[5,9,"m"]};
// sus2's 2nd is a step above the root: on iii it's out of the key, so sus2 sits on the rest
const SB_SUS2_OK=["I","ii","IV","V","vi"];
// The phases. pests: what comes out of the pipes, and how many; degrees: where the creepers and flies
// sit; keys: how far round the circle of fifths the phase's key can be.
const SB_LEVELS=[
  {n:"4 to 3",             pests:{creeper:4},                 degrees:["I","IV","V"]},
  {n:"4 to 3, in the key", pests:{creeper:5},                 degrees:["I","ii","iii","IV","V","vi"]},
  {n:"2 to 3",             pests:{creeper:3, fly:3},          degrees:["I","ii","IV","V","vi"]},
  {n:"7sus4: two bumps",   pests:{creeper:3, crab:3},         degrees:["I","ii","iii","IV","V","vi"], keys:1},
  {n:"The ice",            pests:{creeper:3, fly:2, ice:2},   degrees:["I","ii","iii","IV","V","vi"], keys:2},
  {n:"Everything, any key",pests:{creeper:3, fly:3, crab:2, ice:1}, degrees:["I","ii","iii","IV","V","vi"], keys:3},
];
const sbLevel=(i=blast.level)=> SB_LEVELS[Math.min(i, SB_LEVELS.length-1)];
// The sus layout: the alternate layout's seven slots (202 to 208, as 1 plus the firmware catalogue's
// index): major, minor and 7 as ever; sus4 on major and 7, sus2 on minor and 7, 7sus4 on major and
// minor, °7 on all three.
const SB_SLOTS=["","m","7","sus4","sus2","7sus4","°7"].map(q=>MX_CATALOGUE.indexOf(q)+1);
const sbLayoutOk=()=> canWrite() && hasSetting(39) && hasSetting(202);
const sbBoth=()=> sbLayoutOk() && !!saved.sbSuspend;            // SUSPEND, chosen on the title screen
function sbKey(f){ const name=KEY_BY_FIFTHS[f]; return {f, name, label:`${name} MAJOR`, pc:pcOfName(name)}; }
// a chord of the key on a degree, its quality given
function sbChord(key, deg, q){
  const d=SB_DEGREES[deg], root=above(key.name, d[0], d[1]); if(!root || /[𝄪𝄫]/.test(root) || !spellChord(root, q)) return null;
  return {root, q, pc:pcOfName(root), sym:root+q};
}
// A pest's chords: what it is now (its suspension) and what resolves it. A crab is a 7sus4 on V until
// it's bumped; then it's V7, resolving to I.
function sbPestChords(e){
  const key=blast.key;
  if(e.kind==="ice") return {sus:e.dim, res:null};
  if(e.kind==="crab") return e.angry ? {sus:sbChord(key,"V","7"), res:sbChord(key,"I","")} : {sus:sbChord(key,"V","7sus4"), res:sbChord(key,"V","7")};
  const third=SB_DEGREES[e.deg][2];
  return {sus:sbChord(key, e.deg, e.kind==="fly" ? "sus2" : "sus4"), res:sbChord(key, e.deg, third)};
}
// a diminished seventh, for the ice: four notes a minor third apart, melted a semitone above any
function sbDim(){
  const root=Math.floor(Math.random()*12), pcs=[0,3,6,9].map(s=>mod(root+s,12)), names=blast.key && blast.key.f<0 ? FLAT_NAMES : SHARP_NAMES;
  return {pc:root, q:"°7", sym:names[root]+"°7", to:new Set(pcs.map(p=>mod(p+1,12)))};
}

// ---------- the game ----------
function genBros(){
  return {kind:"bros", prompt:"Sus Bros.", sub:"Bump the floor under a suspended chord to flip it, then play its resolution: Dsus4, then Dm.",
    answer:{type:"bros", get name(){ const e=blast && blast.kind==="bros" && sbFlipped()[0]; return e ? sbPestChords(e).res.sym : "a flipped pest's resolution"; }},
    get hint(){ const e=blast && blast.kind==="bros" && sbFlipped()[0]; return e ? `${sbPestChords(e).sus.sym} resolves to ${sbPestChords(e).res.sym}.` : "Bump a pest from underneath first."; },
    context:0};
}
function startBros(){
  blast={kind:"bros", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), clock:0, hero:null, pests:[], coins:[], st:"idle"};
  sbDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  sbMenu();
  blast.raf=requestAnimationFrame(sbTick);
}
// the harp chromatic, a d-pad; the key signature the phase's; the sus layout, or the standard one
function sbDevice(){
  if(!blast || blast.kind!=="bros" || !canWrite()) return;
  arcadeSetup(()=>{
    kmHarp();
    if(hasSetting(35)) borrow(35, keyIndexOf(blast.key ? blast.key.f : 0));
    sbLayoutNow();
  });
  if(blast.phase==="play" && !pollT) poll(true);
}
// the layout SUSPENSIONS asks for, as each game starts (it's chosen on the title screen, after the
// setup): the sus layout for SUSPEND, the standard one otherwise
function sbLayoutNow(){
  if(!canWrite()) return;
  if(sbBoth()){ ensure(39,1); SB_SLOTS.forEach((v,i)=>ensure(202+i, v)); }
  else if(hasSetting(39)) ensure(39,0);
}
function buildBrosField(box){
  const field=document.createElement("div"); field.className="field arcade bros"; field.setAttribute("aria-label","The pipes");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="bros"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), strip:kmStrip(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // its own screen, at the old game's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  sbBar(); setTimeout(helperSync);
}
function sbBar(){
  if(!blast || blast.kind!=="bros" || !blast.hud) return;
  const k=blast.key ? ` · ${blast.key.label}` : "", left=blast.hero ? ` · ${blast.pests.length+(blast.queue||[]).length} LEFT · POW ${blast.pow??0}` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">PHASE ${blast.level+1}${k}${left}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const SBMENU_G={key:"bros", title:"SUS BROS.",
  rules:()=>`<p>EVERY PEST IS A SUSPENDED CHORD. JUMP UP UNDER THE FLOOR IT'S WALKING ON TO FLIP IT, THEN ${sbBoth() ? "PLAY ITS SUSPENSION AND THEN ITS RESOLUTION: Dsus4, THEN Dm. THE SUS CHORDS ARE ON TWO BUTTONS: MAJOR AND 7 FOR sus4, MINOR AND 7 FOR sus2, MAJOR AND MINOR FOR 7sus4" : "IT SOUNDS ITS SUSPENSION: PLAY WHERE IT RESOLVES. Dsus4 RESOLVES TO Dm, THE 4TH FALLING TO THE 3RD"}.</p><p>THE CRABS ARE 7sus4: BUMP ONE AND IT'S A DOMINANT SEVENTH, ANGRY; BUMP IT AGAIN, AND RESOLVE IT HOME. THE ICE IS A DIMINISHED SEVENTH: MELT IT WITH A CHORD A SEMITONE ABOVE ANY OF ITS NOTES.</p><p>LEAVE ONE FLIPPED TOO LONG, OR LET IT DOWN THE PIPE, AND IT COMES BACK FASTER. THE POW BLOCK FLIPS EVERYTHING.</p><p>${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME, A TO JUMP" : "WALK ON THE HARP OR THE ARROW KEYS, HOLDING THE WAY; A OR SPACE TO JUMP"}.</p>`,
  levels:SB_LEVELS, begin:i=>beginBros(i), demo:()=>sbDemo(), modNote:"title"};
function sbMenu(over){ arcadeMenu(SBMENU_G, over); }
function beginBros(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phaseN:0, phase:"play", over:false, clock:0, pow:3});
  if(canWrite() && hasSetting(33)) ensure(33,0);
  sbLayoutNow();
  saved.brosStart=level; save();
  stats.streak=0; scoreboard();
  sbNewPhase(); sbPlace();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(sbTick);
  sbLevelBanner();
  sfx("start"); sbBar();
}
function sbLevelBanner(){ banner(`PHASE ${blast.level+1}`, `${sbLevel().n.toUpperCase()} · ${blast.key.label}`); }
// A fresh phase: its key, the pests it'll send out, in a shuffled order, the coins' scale from the bottom
function sbNewPhase(){
  const L=sbLevel(), f = L.keys ? rnd([...Array(2*L.keys+1).keys()].map(i=>i-L.keys)) : 0;
  blast.key=sbKey(f);
  if(blast.phase==="play" && canWrite() && hasSetting(35)) borrow(35, keyIndexOf(f));
  const kinds=shuffle(Object.entries(L.pests).flatMap(([k,n])=>Array(n).fill(k)));
  blast.queue=kinds.map(kind=>{
    const pool = kind==="fly" ? L.degrees.filter(d=>SB_SUS2_OK.includes(d)) : L.degrees;
    return {kind, deg: kind==="crab" || kind==="ice" ? "V" : rnd(pool)};
  });
  blast.coinNote=0; blast.coins=[]; blast.pests=[];
}
// everyone where they start: the player on the ground, the pests out of the pipes one at a time
function sbPlace(){
  blast.hero={x:SB_START.x, y:SB_FLOORS[SB_START.f].y, f:SB_START.f, state:"walk", dir:"right", vx:0, vy:0, moving:false};
  blast.nextOut=blast.clock+1.2; blast.side=0; blast.bumps=[]; blast.lastChord=null;
  blast.st="ready"; blast.stUntil=blast.clock+(blast.phase==="play" ? 1.8 : .2);
  sbHeldReset();
}

// ---------- each frame ----------
function sbTick(now){
  if(!blast || blast.kind!=="bros") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;   // a frame stamped before the game began counts for nothing
  if((blast.phase==="play" || blast.phase==="demo") && blast.hero) sbStep(dt);
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(sbTick);
}
const sbPace=()=> (1+.03*Math.min(blast.phaseN||0,10))/Math.sqrt(speedMul());
const SB_WALK=58, SB_JUMP=250, SB_GRAV=600;                          // the jump: up 52 pixels, a floor and a bit
const SB_SPEEDS=[24, 32, 42, 54];                                    // a pest's pace, by how many times it's come round
function sbStep(dt){
  blast.clock+=dt;
  if(blast.st==="ready"){ if(blast.clock>=blast.stUntil) blast.st="go"; return; }
  if(blast.st==="dying"){ if(blast.clock>=blast.stUntil) sbAfterDeath(); return; }
  if(blast.st==="clear"){ if(blast.clock>=blast.stUntil) sbNextPhase(); return; }
  if(blast.st!=="go") return;
  sbHero(dt);
  sbOut();
  sbPests(dt);
  sbCoins(dt);
  sbCollide();
  sbHelp();
}

// ---------- the way held ----------
const SB_ARROWS={ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right"};
const sbKeysHeld=new Map();
function sbHeldReset(){ sbKeysHeld.clear(); }
function sbWays(){
  if(blast.phase==="demo") return blast.demoWays || [];
  const keys=[...sbKeysHeld.entries()].sort((a,b)=>b[1]-a[1]).map(([w])=>w);
  const harp=kmHeld().filter(z=>z==="left" || z==="right");
  return [...new Set([...keys, ...harp])].filter(w=>w==="left" || w==="right");
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="bros" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const letters = !(typeof kbOn==="function" && kbOn());
  const w=Object.assign({...SB_ARROWS}, letters ? {KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w && blast && blast.phase==="play"){ e.preventDefault(); if(w==="up"){ if(!e.repeat) sbJump(); } else if(!e.repeat) sbKeysHeld.set(w, performance.now()); return; }
  if(e.code==="Space" && blast && blast.phase==="play" && !e.repeat){ e.preventDefault(); sbJump(); }
});
document.addEventListener("keyup", e=>{
  const letters = !(typeof kbOn==="function" && kbOn());
  const w=Object.assign({...SB_ARROWS}, letters ? {KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w) sbKeysHeld.delete(w);
});
window.addEventListener("blur", ()=>sbKeysHeld.clear());

// ---------- the player ----------
// Walking along a floor, round the screen's sides; off a floor's end, a fall (it never hurts). A jump
// keeps the way it was aimed: up a floor and a bit, its head bumping the underside of any floor above.
function sbHero(dt){
  const H=blast.hero, ways=sbWays(), pace=sbPace();
  H.moving=false;
  if(H.state==="walk"){
    const w=ways[0];
    if(w){ H.dir=w; H.moving=true; H.x=sbWrap(H.x+(w==="left" ? -1 : 1)*SB_WALK*pace*dt); }
    if(!sbOn(H.f, H.x)) Object.assign(H, {state:"air", vy:0, vx:0});
    return;
  }
  const y0=H.y; H.vy+=SB_GRAV*pace*pace*dt; H.y+=H.vy*dt; H.x=sbWrap(H.x+H.vx*pace*dt);
  if(H.vy<0){                                                          // rising: the head hits a floor's underside
    for(let f=0; f<SB_FLOORS.length; f++){
      const under=SB_FLOORS[f].y+SB_T, head0=y0-16, head=H.y-16;
      if(head0>=under && head<under && sbOn(f, H.x)){ H.y=under+16; H.vy=0; sbBump(f, H.x); break; }
    }
  } else {
    for(let f=SB_FLOORS.length-1; f>=0; f--){
      const top=SB_FLOORS[f].y;
      if(y0<=top+.5 && H.y>=top && sbOn(f, H.x)){ Object.assign(H, {state:"walk", f, y:top, vy:0, vx:0}); sfx("land"); return; }
    }
    if(H.y>SB_H+20){ Object.assign(H, {y:SB_FLOORS[0].y, f:0, state:"walk", vy:0}); }
  }
}
function sbJump(){
  const H=blast.hero; if(!H || H.state!=="walk" || blast.st!=="go") return;
  const w=sbWays()[0], s= w==="left" ? -1 : w==="right" ? 1 : 0;
  Object.assign(H, {state:"air", vy:-SB_JUMP*sbPace(), vx:s*SB_WALK}); if(w) H.dir=w;
  sfx("jump");
}
// A floor bumped from underneath at x: a ripple in it, and whatever's standing on it there flipped;
// the POW block flips everything on every floor.
function sbBump(f, x){
  blast.bumps.push({f, x, at:blast.clock}); sfx("bump");
  const P=SB_FLOORS[f].pow;
  if(P && blast.pow>0 && x>=P[0] && x<=P[1]){ sbPow(); return; }
  for(const e of blast.pests){
    if(e.f!==f || e.air || e.state==="gone") continue;
    if(Math.abs(sbDx(e.x, x))<14) sbHit(e);
  }
  const c=blast.coins.find(c=>c.f===f && Math.abs(sbDx(c.x,x))<12); if(c) sbCoin(c);   // a coin bumped from under is taken, as the old game's was
}
// one pest bumped: flipped, or (a crab, the first time) angry; a flipped one bumped again rights itself
function sbHit(e){
  if(e.kind==="ice"){ e.stunUntil=blast.clock+1; return; }
  if(e.state==="flipped"){ sbRight(e); return; }
  if(e.kind==="crab" && !e.angry){ e.angry=true; e.tier=Math.min(3,e.tier+1); e.dir=-e.dir; sfx("angry"); return; }
  e.state="flipped"; e.until=blast.clock+sbFlipSecs(); e.suspended=false;
  if(blast.phase==="play"){ const p=mulPts(10*(blast.level+1)); blast.score+=p; sbBar(); }
  sfx("flip");
  if(!sbBoth()) sbSound(sbPestChords(e).sus);
}
// the suspension sounded on the page's piano, the tension the player's chord resolves
function sbSound(c){
  if(!c) return;
  blast.sounded=c.sym;
  if(!settings.sounds || !piano.ctx) return;
  const v=FORM[c.q].map(f=>48+c.pc+f[1]), go=()=>piano.play(v, {when:.12, dur:1.6, vel:70});
  piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{});
}
const sbFlipSecs=()=> Math.max(3.5, 7-.5*blast.level-.2*(blast.phaseN||0))*Math.sqrt(speedMul());
function sbRight(e){ e.state="walk"; e.tier=Math.min(3, e.tier+1); e.suspended=false; sfx("right"); }
function sbPow(){
  blast.pow--; blast.powAt=blast.clock;
  for(const e of blast.pests) if(!e.air && e.state==="walk" && e.kind!=="ice") sbHit(e); else if(!e.air && e.state==="walk" && e.kind==="ice") e.stunUntil=blast.clock+2;
  sfx("pow"); buzz(blast.field, true); sbBar();
}

// ---------- the pests ----------
// Out of the top pipes one at a time, the corners in turn; along the floors, falling off their ends,
// round the screen's sides; at the bottom, down the pipe in the corner and, after a moment, out at the
// top again, a step faster.
function sbOut(){
  if(blast.clock<blast.nextOut) return;
  const live=blast.pests.length, L=sbLevel();
  if(!blast.queue.length || live>=Math.min(4, 2+Math.floor(blast.level/2))) return;
  const p=blast.queue.shift(), left=blast.side++%2===0;
  blast.pests.push(sbSpawn(p, left));
  blast.nextOut=blast.clock+3.2*Math.sqrt(speedMul());
  sfx("pipe"); sbBar();
}
function sbSpawn(p, left, tier=0){
  return {...p, x:left ? 18 : SB_W-18, y:SB_FLOORS[3].y, f:3, dir:left ? 1 : -1, state:"walk", tier, air:false, vy:0, hop:0,
    dim: p.kind==="ice" ? (p.dim || sbDim()) : null, angry:false};
}
function sbPests(dt){
  const pace=sbPace(), still=blast.phase==="demo" && blast.demoStill;
  for(const e of blast.pests){
    if(e.state==="flipped"){ if(blast.clock>=e.until) sbRight(e); continue; }
    if(e.state==="piped"){ if(blast.clock>=e.until){ Object.assign(e, sbSpawn(e, e.x>SB_W/2, Math.min(3,e.tier+1))); sfx("pipe"); } continue; }
    if(still || blast.clock<(e.stunUntil||0)) continue;
    const sp=SB_SPEEDS[e.tier]*(e.angry ? 1.2 : 1)*pace;
    if(e.air){
      const y0=e.y; e.vy+=SB_GRAV*.8*pace*pace*dt; e.y+=e.vy*dt; e.x=sbWrap(e.x+e.dir*sp*dt);
      if(e.vy>0) for(let f=SB_FLOORS.length-1; f>=0; f--){ const top=SB_FLOORS[f].y; if(y0<=top+.5 && e.y>=top && sbOn(f, e.x)){ Object.assign(e, {air:false, f, y:top, vy:0}); break; } }
      continue;
    }
    e.x=sbWrap(e.x+e.dir*sp*dt);
    if(e.f===0 && ((e.dir<0 && e.x<SB_PIPE_IN) || (e.dir>0 && e.x>SB_W-SB_PIPE_IN))){ e.state="piped"; e.until=blast.clock+1.5; sfx("pipein"); continue; }
    if(!sbOn(e.f, e.x)){ e.air=true; e.vy=0; continue; }
    if(e.kind==="fly" && blast.clock>=e.hop){ e.hop=blast.clock+1.1+Math.random()*.4; e.air=true; e.vy=-150*pace; }
  }
}
// the coins: out of the pipe a pest went in by, rolling and falling like a pest, taken by walking into
// them or bumping them from under; each the key's scale's next note
function sbCoinOut(){
  const left=Math.random()<.5, step=[0,2,4,5,7,9,11,12][blast.coinNote++%8], pc=mod(blast.key.pc+step,12);
  const names=blast.key.f<0 ? FLAT_NAMES : SHARP_NAMES;
  blast.coins.push({x:left ? 18 : SB_W-18, y:SB_FLOORS[3].y, f:3, dir:left ? 1 : -1, air:false, vy:0, note:names[pc], midi:60+blast.key.pc+step});   // up the scale from the key's middle C
}
function sbCoins(dt){
  const sp=46*sbPace();
  for(const c of blast.coins){
    if(c.air){ const y0=c.y; c.vy+=SB_GRAV*.8*dt; c.y+=c.vy*dt; c.x=sbWrap(c.x+c.dir*sp*dt);
      if(c.vy>0) for(let f=SB_FLOORS.length-1; f>=0; f--){ const top=SB_FLOORS[f].y; if(y0<=top+.5 && c.y>=top && sbOn(f,c.x)){ Object.assign(c,{air:false,f,y:top,vy:0}); break; } }
      continue; }
    c.x=sbWrap(c.x+c.dir*sp*dt);
    if(c.f===0 && ((c.dir<0 && c.x<SB_PIPE_IN) || (c.dir>0 && c.x>SB_W-SB_PIPE_IN))){ c.gone=true; continue; }
    if(!sbOn(c.f, c.x)){ c.air=true; c.vy=0; }
  }
  blast.coins=blast.coins.filter(c=>!c.gone);
}
function sbCoin(c){
  c.gone=true; blast.coins=blast.coins.filter(x=>x!==c);
  if(blast.phase==="play"){ const p=mulPts(800*(blast.level+1)); blast.score+=p; sbPop(c, `+${p}`, "#FFD35A"); sbBar(); }
  sfx("coin", c.midi);
}
// touching: a walking pest is a life; a flipped one is harmless; a coin is taken
function sbCollide(){
  const H=blast.hero;
  for(const e of blast.pests){
    if(e.state!=="walk") continue;
    if(Math.abs(sbDx(e.x,H.x))<10 && Math.abs(e.y-H.y)<12 && blast.phase==="play" && blast.clock>=(blast.safeUntil||0)) return sbDie(e);
  }
  for(const c of [...blast.coins]) if(Math.abs(sbDx(c.x,H.x))<10 && Math.abs(c.y-H.y)<14) sbCoin(c);
}
function sbDie(e){
  if(blast.st!=="go") return;
  blast.st="dying"; blast.stUntil=blast.clock+1.8; blast.diedAt=blast.clock;
  sfx("die"); buzz(blast.field, true);
  const c=sbPestChords(e);
  heard(c.sus.sym, false, e.kind==="ice" ? `CAUGHT: MELT IT WITH A CHORD A SEMITONE ABOVE ONE OF ITS NOTES` : `CAUGHT: BUMP IT FROM UNDER, THEN RESOLVE IT TO ${c.res ? c.res.sym : ""}`);
}
function sbAfterDeath(){
  blast.lives--; sbBar();
  if(blast.lives<=0) return sbOver();
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`, "");
  for(const e of blast.pests) if(e.state==="flipped") sbRight(e);
  blast.hero={x:SB_START.x, y:SB_FLOORS[0].y, f:0, state:"walk", dir:"right", vx:0, vy:0, moving:false};
  blast.st="ready"; blast.stUntil=blast.clock+1.4; blast.safeUntil=blast.stUntil+2; sbHeldReset();   // two seconds' grace, blinking, after coming back
}
function sbOver(){
  blast.phase="over"; blast.over=true; blast.st="idle"; poll(false);
  const best=Math.max(saved.best.bros||0, blast.score); saved.best.bros=best; save();
  helpChord(null); sbBar(); sbMenu(true);
}
// every pest cleared: the phase's bonus, then the next
function sbClear(){
  blast.st="clear"; blast.stUntil=blast.clock+2.4;
  const pts=mulPts(1000*(blast.level+1));
  if(blast.phase==="play"){ blast.score+=pts; banner("PHASE CLEAR!", `+${pts}`); }
  sfx("clear"); sbBar();
}
function sbNextPhase(){
  blast.phaseN=(blast.phaseN||0)+1; blast.level++;
  sbNewPhase(); sbPlace(); sbLevelBanner(); sfx("level"); sbBar();
}
// the helper lit with the chord to play next: the suspension of the flipped pest nearest the player, or
// its resolution once that's played
const sbFlipped=()=> blast.pests.filter(e=>e.state==="flipped" || e.kind==="ice" && e.state==="walk")
  .sort((a,b)=>Math.hypot(sbDx(a.x,blast.hero.x),a.y-blast.hero.y)-Math.hypot(sbDx(b.x,blast.hero.x),b.y-blast.hero.y));
function sbHelp(){
  const e=sbFlipped()[0];
  if(!e){ helpChord(null); return; }
  if(e.kind==="ice"){ const pc=[...e.dim.to][0], names=blast.key.f<0 ? FLAT_NAMES : SHARP_NAMES; helpChord(names[pc], ""); return; }
  const c=sbPestChords(e), next = sbBoth() && !e.suspended ? c.sus : c.res;
  arcadeMod(next.root); helpChord(next.root, next.q);
}

// ---------- the minichord ----------
// A chord: every flipped pest it's the resolution of is cleared (with SUSPEND, once its
// suspension's been played just before); a flipped pest whose suspension it is waits for the
// resolution; any ice it melts, melts.
function brosChord(voices){
  if(!blast || blast.kind!=="bros") return;
  if(blast.phase==="demo" && blast.demo){ endSbDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.st!=="go") return;
  const pitches=voices.map(v=>v.pitch); if(!chordId(pitches)) return;
  sbPlay(pitches);
}
function sbPlay(pitches){
  const id=chordId(pitches), name=chordName(pitches, devFifths()), root=mod(id.root,12), both=sbBoth();
  const is=c=> !!c && isChord(pitches, c.pc, c.q);
  let cleared=0, suspended=0, waiting=null;
  for(const e of blast.pests){
    if(e.kind==="ice"){ if(e.state==="walk" && e.dim.to.has(root) && /^(m?|7|maj7|m7)$/.test(id.quality||"")){ sbClearPest(e, 800); cleared++; } continue; }
    if(e.state!=="flipped") continue;
    const c=sbPestChords(e);
    if(is(c.res)){
      if(both && !e.suspended){ waiting=e; continue; }
      sbClearPest(e, both ? 1600 : 800); cleared++;
    } else if(is(c.sus)){ e.suspended=true; e.susAt=blast.clock; suspended++; }
  }
  blast.pests=blast.pests.filter(e=>e.state!=="gone");
  if(cleared){ heard(`${name} · RESOLVED`, true); if(!blast.pests.length && !blast.queue.length) sbClear(); return; }
  if(suspended){ heard(`${name} · SUSPENDED`, true); sfx("sus"); return; }
  if(waiting){ heard(name, false, `PLAY THE SUSPENSION FIRST: ${sbPestChords(waiting).sus.sym}, THEN ${name}`); return; }
  const e=sbFlipped()[0];
  heard(name, false, e ? (e.kind==="ice" ? `${e.dim.sym}: A SEMITONE ABOVE ONE OF ITS NOTES` : `${sbPestChords(e).sus.sym} RESOLVES TO ${sbPestChords(e).res.sym}`) : "NOTHING'S FLIPPED: BUMP ONE FROM UNDER FIRST");
}
function sbClearPest(e, pts){
  e.state="gone"; blast.poofs=(blast.poofs||[]).concat([{x:e.x, y:e.y, at:blast.clock}]);
  if(blast.phase==="play"){ const p=mulPts(pts*(blast.level+1)); blast.score+=p; sbPop(e, `+${p}`, "#7FE08A"); sbBar(); }
  const c=sbPestChords(e); sfx("resolve", c.res ? c.res.pc : e.dim.pc);
  sbCoinOut();
}
// the harp: A (or B) jumps; walking is read held (sbWays)
function brosHarp(pc){
  if(!blast || blast.kind!=="bros") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endSbDemo(blast.demo); return; }
  const z=kmControl(pc); if(z==="A" || z==="B" || z==="up") sbJump();
}

// ---------- drawing ----------
// Its own screen at the old game's resolution, as Chord Chomp's: 240 by 216, every sprite and letter
// drawn pixel by pixel, at a whole number of screen pixels a pixel; bigger, the view following the
// player, where the field's too small for that.
function sbLayout(){
  const fw=fieldW(), fh=fieldH();
  const side = !kmStripShown() ? 16 : (saved.beginner || blast.phase==="demo") ? Math.ceil(Math.min(fw*.3, 300))+20 : (kmLayout().cols===3 ? 150 : 84);
  const aw=fw-side-8, ah=fh-40-28;
  let k=Math.floor(Math.min(aw/SB_W, ah/SB_H));
  if(k<2) k=Math.max(k, Math.min(3, Math.floor(Math.max(aw/SB_W, ah/SB_H))));
  k=Math.max(1,k);
  const w=Math.min(SB_W, Math.floor(aw/k)), h=Math.min(SB_H, Math.floor(ah/k));
  Object.assign(blast, {k, view:{x:0, y:0, w, h}, scrolls:SB_W>w || SB_H>h, cam:null});
  blast.scrLeft=8+Math.floor((aw-w*k)/2); blast.scrTop=40+Math.floor((ah-h*k)/2);
  const s=blast.screen; if(s){ s.width=w; s.height=h; s.style.cssText=`left:${blast.scrLeft}px;top:${blast.scrTop}px;width:${w*k}px;height:${h*k}px`; }
  sbCamera(0);
}
function sbCamera(dt){
  const v=blast.view, H=blast.hero || {x:SB_W/2, y:SB_H/2};
  const axis=(len, all, focus, was)=>{ if(all<=len) return Math.floor((len-all)/2); const want=Math.max(len-all, Math.min(0, len/2-focus)); if(was==null || !dt) return want; return was+(want-was)*Math.min(1, dt*7); };
  const c=blast.cam||{}; c.x=axis(v.w, SB_W, H.x, c.x); c.y=axis(v.h, SB_H, H.y-8, c.y);
  blast.cam=c; blast.ox=Math.round(c.x); blast.oy=Math.round(c.y);
}
// the player: a cap, a moustache-free face, dungarees, 12 by 16
const SB_HERO={
  stand:["....OOOOO...","...OOOOOOOO.","...HSSKSS...","..HSSSSSSS..","...SSSSSS...","....SSSS....","...GGTTGG...","..GGGTTGGG..",
         ".SGGGTTGGGS.",".S.TTTTTT.S.","...TTTTTT...","...TT..TT...","...TT..TT...","...TT..TT...","..BBB..BBB..","..BBB..BBB.."],
  walk: ["....OOOOO...","...OOOOOOOO.","...HSSKSS...","..HSSSSSSS..","...SSSSSS...","....SSSS....","...GGTTGG...","..GGGTTGGG..",
         ".SGGGTTGGGS.",".S.TTTTTT.S.","...TTTTTT...","..TT....TT..",".TT......TT.",".TT......TT.",".BB......BB.","BBB......BBB"],
  jump: ["S...OOOOO...","SS.OOOOOOOO.",".S.HSSKSS...",".SHSSSSSSS..","..GSSSSSS...","..GGSSSS....","...GGTTGG...","...GGTTGGG..",
         "...GGTTGGG..","...TTTTTT...","...TTTTTT...","..TT....TT..",".TT.....TT..",".BB.....BB..","BBB....BBB..","............"],
};
const SB_HERO_PAL={O:"#FF9A3C", H:"#7A4A2A", S:"#FFC8A0", K:"#16132A", G:"#F1E8D2", T:"#2EB872", B:"#7A4A2A"};
function sbHeroSprite(pose, left){
  let rows=SB_HERO[pose]; if(left) rows=rows.map(r=>[...r].reverse().join(""));
  return pxSprite(`sbhero|${pose}|${left}`, rows, SB_HERO_PAL);
}
// the pests, 14 by 12: a creeper (a shelled thing), a fly, a crab, the ice; each upside down when flipped
const SB_PEST={
  creeper:["....GGGG......","...GGLLGG.....","..GGLLLLGG....","..GLLGGLLG.HH.",".GGLGGGGLGGHKH",".GGGGGGGGGGHHH","GGGGGGGGGGGHH.","YYYYYYYYYYYY..","..HH....HH....","..HH....HH....","..............",".............."],
  fly:    ["..WW....WW....",".WWWW..WWWW...",".WWWWWWWWWW...","...RRRRRR.....","..RRKRRKRR....","..RRRRRRRR....","..RRRRRRRR....","...RRRRRR.....","....R..R......","...RR..RR.....","..............",".............."],
  crab:   ["CC........CC..","CCC......CCC..",".CC.RRRR.CC...","...RRRRRR.....","..RRKRRKRR....",".RRRRRRRRRR...","RRRRRRRRRRRR..","RRRRRRRRRRRR..",".R.R.RR.R.R...","R..R....R..R..","..............",".............."],
  ice:    ["....IIII......","...IIWWII.....","..IIWWWWII....","..IWKIIKWI....",".IIWWWWWWII...",".IIIIIIIIII...","IIIIWWWWIIII..","IIIIIIIIIIII..",".IIIIIIIIII...","..II....II....","..............",".............."],
};
const SB_PEST_PAL={creeper:{G:"#2EB872", L:"#8FE0A8", Y:"#FFD35A", H:"#FFC8A0", K:"#16132A"}, fly:{W:"#B9C7E6", R:"#FF5AA0", K:"#16132A"},
  crab:{C:"#FF9A3C", R:"#E8323C", K:"#16132A"}, ice:{I:"#7FE9FF", W:"#FFFFFF", K:"#16132A"}};
function sbPestSprite(kind, flipped, frame, angry, tier){
  let rows=SB_PEST[kind].map((r,y)=> frame && !flipped && (y===8 || y===9) ? "."+r.slice(0,-1) : r);   // walking: the legs a step on
  if(flipped) rows=[...rows].reverse();
  const pal={...SB_PEST_PAL[kind]};
  if(angry){ pal.R="#FF3B30"; pal.C="#FFE600"; }
  if(tier>=2 && kind==="creeper"){ pal.G="#2F6BFF"; pal.L="#7FB0FF"; }
  return pxSprite(`sbpest|${kind}|${flipped}|${frame}|${angry}|${tier>=2}`, rows, pal);
}
const SB_COIN=["..YYYY..",".YYOOYY.","YYOYYOYY","YYOYYOYY","YYOYYOYY","YYOYYOYY",".YYOOYY.","..YYYY.."];

function brosDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  if(!blast.hero){ g.clearRect(0,0,s.width,s.height); return; }
  const lk=`${fieldW()}x${fieldH()}|${kmStripShown()}|${!!saved.beginner}|${blast.phase==="demo"}|${saved.harpLayout||""}`;
  if(blast.layoutKey!==lk){ blast.layoutKey=lk; sbLayout(); }
  if(blast.scrolls){ sbCamera(Math.min(.1, (now-(blast.camAt||now))/1000)); blast.camAt=now; }
  const ox=blast.ox, oy=blast.oy, clock=blast.clock, H=blast.hero;
  g.imageSmoothingEnabled=false;
  g.fillStyle="#000"; g.fillRect(0,0,s.width,s.height);
  // the floors, rippling where they were bumped
  blast.bumps=(blast.bumps||[]).filter(b=>clock-b.at<.25);
  SB_FLOORS.forEach((F,f)=>{
    for(const [a,b] of F.segs) for(let x=a; x<b; x++){
      const bump=blast.bumps.find(k=>k.f===f && Math.abs(sbDx(x,k.x))<10), lift=bump ? Math.round(3*(1-Math.abs(sbDx(x,bump.x))/10)) : 0;
      g.fillStyle= f===0 ? "#B8643C" : "#2F6BFF"; g.fillRect(ox+x, oy+F.y-lift, 1, SB_T);
      g.fillStyle= f===0 ? "#E8A070" : "#7FB0FF"; if(x%8!==0) g.fillRect(ox+x, oy+F.y-lift, 1, 1); else g.fillRect(ox+x, oy+F.y-lift, 1, SB_T);
    }
    if(F.pow && blast.pow>0){ const [a,b]=F.pow, sh=clock-(blast.powAt||-9)<.3 ? 2 : 0;
      g.fillStyle="#2F6BFF"; g.fillRect(ox+a, oy+F.y-sh, b-a, 14); g.fillStyle="#F1E8D2"; g.fillRect(ox+a+1, oy+F.y+1-sh, b-a-2, 12);
      pxText(g, "POW", ox+(a+b)/2, oy+F.y+3-sh, "#2F6BFF", false); }
  });
  // the pipes: in the top corners, out; in the bottom corners, in
  const pipe=(x, y, w, left)=>{ g.fillStyle="#2EB872"; g.fillRect(ox+x, oy+y, w, 16); g.fillStyle="#8FE0A8"; g.fillRect(ox+x, oy+y+2, w, 2); g.fillStyle="#1A6B42"; g.fillRect(ox+(left ? x+w-3 : x), oy+y-2, 3, 20); };
  pipe(0, SB_FLOORS[3].y-30, 22, true); pipe(SB_W-22, SB_FLOORS[3].y-30, 22, false);
  pipe(0, SB_FLOORS[0].y-16, 14, true); pipe(SB_W-14, SB_FLOORS[0].y-16, 14, false);
  // the coins
  for(const c of blast.coins){ const spr=pxSprite("sbcoin", SB_COIN, {Y:"#FFD35A", O:"#B8860B"}); g.drawImage(spr, Math.round(ox+c.x-4), Math.round(oy+c.y-9)); pxText(g, c.note, ox+c.x, oy+c.y-19, "#FFD35A"); }
  // the pests, each with its chord over it: its suspension, or, flipped, its resolution waiting
  const wig=Math.floor(now/160)%2, labelled=[];
  for(const e of blast.pests){
    if(e.state==="piped" || e.state==="gone") continue;
    const flipped=e.state==="flipped", ending=flipped && e.until-clock<1.5 && Math.floor(clock*8)%2;
    if(ending) continue;
    const spr=sbPestSprite(e.kind, flipped, wig, e.angry, e.tier);
    const dx=e.dir<0 ? 1 : 0, cv=dx ? sbFlip(spr) : spr;
    g.drawImage(cv, Math.round(ox+e.x-7), Math.round(oy+e.y-12));
    const c=sbPestChords(e), label = e.kind==="ice" ? e.dim.sym : c.sus.sym;
    let ly=e.y-23; while(labelled.some(o=>Math.abs(o.y-ly)<8 && Math.abs(sbDx(o.x,e.x))<(o.w+[...label].length*8)/2+2)) ly-=9;   // clear of a neighbour's
    labelled.push({x:e.x, y:ly, w:[...label].length*8});
    pxText(g, label, ox+e.x, oy+ly, flipped ? (e.suspended ? "#FFFFFF" : "#FFD35A") : e.angry ? "#FF9A3C" : "#F1E8D2");
  }
  // the poofs of the resolved
  blast.poofs=(blast.poofs||[]).filter(p=>clock-p.at<.5);
  for(const p of blast.poofs){ const t=clock-p.at; g.fillStyle="#7FE08A"; for(let i=0;i<8;i++){ const a=i*.785; g.fillRect(Math.round(ox+p.x+Math.cos(a)*t*36), Math.round(oy+p.y-6+Math.sin(a)*t*36), 2, 2); } }
  // the player
  const dying=blast.st==="dying";
  const grace=clock<(blast.safeUntil||0) && Math.floor(clock*10)%2;
  if(!(dying && clock-blast.diedAt>.3 && Math.floor(clock*8)%2) && !grace){
    const pose= H.state==="air" ? "jump" : H.moving && Math.floor(clock*8)%2 ? "walk" : "stand";
    g.drawImage(sbHeroSprite(pose, H.dir==="left"), Math.round(ox+H.x-6), Math.round(oy+H.y-16));
    if(H.x<6 || H.x>SB_W-6) g.drawImage(sbHeroSprite(pose, H.dir==="left"), Math.round(ox+H.x-6+(H.x<6 ? SB_W : -SB_W)), Math.round(oy+H.y-16));   // round the side
  }
  if(blast.st==="ready") pxText(g, `PHASE ${blast.level+1}`, ox+SB_W/2, oy+SB_FLOORS[2].y+24, "#FFE600");
}
// a sprite facing the other way, kept
const SB_FLIPPED=new Map();
function sbFlip(cv){ let f=SB_FLIPPED.get(cv); if(f) return f; f=document.createElement("canvas"); f.width=cv.width; f.height=cv.height; const g=f.getContext("2d"); if(g && g.drawImage){ g.translate(cv.width,0); g.scale(-1,1); g.drawImage(cv,0,0); } SB_FLIPPED.set(cv,f); return f; }
function sbPop(e, text, colour){
  if(!blast.field || blast.phase!=="play" || !blast.k) return;
  popup(blast.scrLeft+(blast.ox+e.x)*blast.k, blast.scrTop+(blast.oy+e.y-24)*blast.k, text, colour);
}

// ---------- the demo ----------
// It plays itself: a creeper out of the pipe and along the ground, bumped from under, flipped, and its
// suspension played and resolved; a coin of the scale; a crab bumped twice, its dominant resolved home.
function sbDemo(){
  if(!blast || blast.kind!=="bros") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endSbDemo);
  blast.phase="demo"; blast.level=0; blast.phaseN=0; blast.clock=0; blast.layoutKey=null; blast.pow=3;
  sbNewPhase(); blast.queue=[]; sbPlace(); blast.st="go"; blast.demoWays=[];
  const zones=(...zs)=>{ if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.toggle("demo-on", zs.includes(c.dataset.zone))); };
  const H=blast.hero, F1=SB_FLOORS[1];
  const play=c=>{ const v=FORM[c.q].map(f=>48+c.pc+f[1]); demoPlay(v); sbPlay(v); };
  sfx("attract");
  (async()=>{
    try{
      say("SUS BROS.","EVERY PEST IS A SUSPENDED CHORD: TENSION, WAITING TO RESOLVE. THIS PHASE IS IN C MAJOR."); await step(3800);
      // a creeper on the first floor, over the player's head
      const e=sbSpawn({kind:"creeper", deg:"IV"}, true); Object.assign(e, {x:70, y:F1.y, f:1, dir:1}); blast.pests.push(e); blast.demoStill=true;
      H.x=70; say("BUMP IT FROM UNDER", "JUMP UP UNDER THE FLOOR IT'S WALKING ON, AND IT FLIPS OVER."); await step(2400);
      zones("A"); sbJump(); await step(900); zones(); await step(900);
      const c=sbPestChords(e);
      say("RESOLVE IT", sbBoth() ? `IT'S ${c.sus.sym}: PLAY IT, THEN LET THE 4TH FALL TO THE 3RD. ${c.sus.sym}, THEN ${c.res.sym}.` : `IT'S ${c.sus.sym}, HANGING: PLAY WHERE IT RESOLVES, THE 4TH FALLING TO THE 3RD. ${c.res.sym}.`); await step(2600);
      if(sbBoth()) play(c.sus); else e.suspended=true;
      await step(1400); play(c.res); await step(1800);
      say("THE COINS","EACH ONE RESOLVED SENDS A COIN OUT OF A PIPE: THE KEY'S SCALE, A NOTE A COIN."); await step(3600);
      blast.coins=[];
      const k=sbSpawn({kind:"crab", deg:"V"}, false); Object.assign(k, {x:70, y:F1.y, f:1, dir:-1}); blast.pests.push(k);
      say("THE CRABS","7sus4: BUMP ONE AND IT RESOLVES HALFWAY, TO G7, ANGRY. BUMP IT AGAIN TO FLIP IT."); await step(2200);
      sbJump(); await step(1400); sbJump(); await step(1600);
      say("HOME",`THEN THE DOMINANT RESOLVES HOME: G7, THEN C.`); await step(1600);
      if(sbBoth()) play(sbPestChords(k).sus); else k.suspended=true; await step(1200); play(sbPestChords(k).res); await step(2000);
      blast.demoStill=false;
      say("READY?",`CHOOSE A PHASE. ${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME, A TO JUMP" : "WALK ON THE HARP OR THE ARROW KEYS, A TO JUMP"}.`); sfx("level"); await step(2800);
      endSbDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endSbDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoWays=null; blast.demoStill=false;
  blast.hero=null; blast.pests=[]; blast.coins=[]; blast.queue=[]; blast.key=null; blast.layoutKey=null; blast.st="idle";
  if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.remove("demo-on"));
  helpChord(null); sbBar();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  cabRestart();
}
