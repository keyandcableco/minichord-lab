// Chord Snake: eat spelled notes, cash them in with their chord. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Snake ----------
// Snake, where the snake eats notes. Spelled notes lie around the board; running into one adds it
// to the snake's tail, and the tail spells what it's carrying. When some of the notes it carries
// make a chord, those segments glow: play that chord on the minichord and the snake dumps them in a
// burst of sparks, scoring more for bigger chords and quicker cash-ins, and shrinking back. Every
// note carried makes it longer; hitting a wall, its own tail, or taking on more than it can carry
// costs a life. B on the harp drops the oldest note, for a few points. It steers on the harp,
// played as a controller, or on the arrow keys.
const SN_LEVELS=[
  {n:"Major and minor", qs:["","m"], roots:"natural"},
  {n:"Sharps and flats", qs:["","m"], roots:"all"},
  {n:"Sevenths", qs:["","m","7","maj7","m7"], roots:"all"},
  {n:"Diminished and augmented", qs:["","m","7","maj7","m7","°","+"], roots:"all"},
  {n:"Barry Harris", qs:["6","m6","7","maj7","m7","°7"], roots:"all", barry:true},
];
const SN_MAX=[6,6,7,8,8];                 // how many notes the snake can carry at each level
const SN_DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function genSnake(){
  return {kind:"snake", prompt:"Chord Snake", sub:"Steer the snake into notes to carry them. When some of the notes it carries spell a chord, they glow: play that chord on the minichord to cash them in. Walls, your own tail and carrying too much cost a life.",
    answer:{type:"snake", get name(){ const c=blast && blast.kind==="snake" ? snReady()[0] : null; return c ? c.root+c.q : "a chord from the notes you carry"; }},
    get hint(){ const c=blast && blast.kind==="snake" ? snReady()[0] : null; return c ? `You're carrying ${c.tones.join(" ")}: that's ${c.root}${c.q}.` : "Collect the notes of a chord: a root, its third and its fifth."; },
    context:0};
}
const snRoots=L=> L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS;
// every chord of the level that the carried notes can make, largest first
function snReady(){
  if(!blast || blast.kind!=="snake") return [];
  const L=SN_LEVELS[blast.level], names=new Set(blast.tail.map(t=>t.name)), out=[];
  for(const root of names) for(const q of L.qs.map(mxQ)){
    const tones=spellChord(root,q); if(!tones) continue;
    if(tones.every(t=>names.has(t))) out.push({root, q, tones});
  }
  return out.sort((a,b)=>b.tones.length-a.tones.length);
}
// the board: a grid of cells, beside the controller strip
function snLayout(){
  // room on the right: for the controller strip, or for the on-screen minichord when it's shown (beginner mode, the demo)
  const f=blast.field, side = (saved.beginner || blast.phase==="demo") ? Math.ceil(Math.min(f.clientWidth*.4, 380))+20 : (kmLayout().cols===3 ? 150 : 84);
  const W=f.clientWidth-side, H=f.clientHeight-64;
  let cell;
  if(blast.phase==="play" && blast.cols){ cell=Math.max(12, Math.floor(Math.min(W/blast.cols, H/blast.rows))); }   // mid-game the board keeps its cells and only scales
  else { cell=Math.max(24, Math.min(34, Math.floor(Math.min(W/24, H/15)))); blast.cols=Math.floor(W/cell); blast.rows=Math.floor(H/cell); }
  blast.cell=cell;
  blast.ox=Math.floor((W-blast.cols*cell)/2)+8; blast.oy=40+Math.floor((H-blast.rows*cell)/2);
  blast.boardEl.style.cssText=`left:${blast.ox}px;top:${blast.oy}px;width:${blast.cols*cell}px;height:${blast.rows*cell}px`;
}
const snPos=(x,y)=>`left:${x*blast.cell}px;top:${y*blast.cell}px;width:${blast.cell}px;height:${blast.cell}px;font-size:${Math.round(blast.cell*.42)}px`;
function startSnake(){
  blast={kind:"snake", items:[], tail:[], body:[], tiles:[], score:0, lives:3, level:0, cashes:0, over:true, phase:"menu", raf:0,
    field:null, hud:null, fx:null, noShip:true, last:performance.now(), dir:"right", queue:[], nextMove:0};
  snDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  snMenu();
  blast.raf=requestAnimationFrame(snTick);
}
function snDevice(){
  if(!blast || blast.kind!=="snake" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); });
  const sig=SN_LEVELS.map((_,i)=>snLevelOk(i)).join()+mxAvailable().length;
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ menuRebuild(()=>snMenu()); }
}
const snLevelOk=i=> !SN_LEVELS[i].barry || (canWrite() && mxStandard());     // Barry Harris is a standard-matrix lesson
const snLevelName=i=>mxLevelName(SN_LEVELS[i].n, j=>SN_LEVELS[j].qs, i);
function buildSnakeField(box){
  const field=document.createElement("div"); field.className="field arcade snake"; field.setAttribute("aria-label","The Chord Snake board");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const board=document.createElement("div"); board.className="snboard"; field.appendChild(board);
  box.append(field);
  if(blast && blast.kind==="snake"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.boardEl=board; blast.fx=fxInit(field); blast.strip=kmStrip(field);
    setTimeout(()=>{ snLayout(); snDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  snBar();
  setTimeout(helperSync);
}
function snBar(){
  if(!blast || blast.kind!=="snake" || !blast.hud) return;
  const max=SN_MAX[blast.level]||6, load=blast.tail.length;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · LOAD ${load}/${max}${mxTag()}</span><span class="lives">${livesHtml()}</span>`;
}
const SNMENU_G={key:"snake", title:"CHORD SNAKE",
  rules:()=>`<p>EAT NOTES. WHEN THE ONES YOU CARRY SPELL A CHORD, PLAY IT TO CASH THEM IN.</p><p>STEER ON THE HARP OR THE ARROW KEYS. B DROPS YOUR OLDEST NOTE.</p>`,
  rows:row=>{
    mxRow(row, ()=>menuRebuild(()=>snMenu()));
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("HARP", HARP_LAYOUTS.map(([t])=>t), harpLayoutIndex, i=>{ saved.harpLayout=HARP_LAYOUTS[i][1]; save();
    kmRestrip(); });
    row("HARP SOUND", ["NORMAL","QUIET","OFF"], ()=>saved.harpSound??1, i=>{ saved.harpSound=i; save(); if(blast && blast.setupDone) kmHarp(); });
  },
  levels:SN_LEVELS, ok:snLevelOk, levelName:snLevelName, sig:()=>String(mxAvailable().length), needs:"NEEDS A MINICHORD",
  begin:i=>beginSnake(i), demo:()=>snDemo(), modNote:"always"};
function snMenu(over){ arcadeMenu(SNMENU_G, over); }
// a fresh snake in the middle, pointing right, carrying nothing
function snReset(){
  const cx=Math.floor(blast.cols/2)-2, cy=Math.floor(blast.rows/2);
  blast.body=[[cx,cy],[cx-1,cy],[cx-2,cy]]; blast.tail=[]; blast.dir="right"; blast.queue=[];
}
function beginSnake(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, cashes:0, phase:"play", over:false, tiles:[], stepMs:260*speedMul()});
  if(SN_LEVELS[level].barry && canWrite()) borrow(33,1); else if(canWrite() && hasSetting(33)) ensure(33,0);
  saved.snakeStart=level; save();
  stats.streak=0; scoreboard(); snLayout(); snReset(); snFill();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.nextMove=performance.now()+900; blast.raf=requestAnimationFrame(snTick);
  mxApply();                                  // the minichord to the chosen matrix
  banner(`LEVEL ${level+1}`, `${snLevelName(level).toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); snBar(); snDraw();
}
// keep the board stocked: the notes of a chord or two the level uses, and a stray or two
function snFree(){
  const used=new Set([...blast.body.map(([x,y])=>x+","+y), ...blast.tiles.map(t=>t.x+","+t.y)]);
  for(let k=0;k<200;k++){ const x=Math.floor(Math.random()*blast.cols), y=Math.floor(Math.random()*blast.rows);
    const h=blast.body[0]; if(Math.abs(x-h[0])+Math.abs(y-h[1])<3) continue;
    if(!used.has(x+","+y)) return [x,y]; }
  return null;
}
function snFill(){
  const L=SN_LEVELS[blast.level], want=Math.min(9, 5+blast.level);
  while(blast.tiles.length<want){
    // prefer the notes that would finish a chord from what's carried, then a fresh chord's notes
    const carried=new Set(blast.tail.map(t=>t.name)), onBoard=new Set(blast.tiles.map(t=>t.name));
    let pool=[];
    for(let k=0;k<40 && !pool.length;k++){
      const root = carried.size && Math.random()<.6 ? rnd([...carried]) : rnd(snRoots(L)), q=mxQ(rnd(L.qs)), tones=spellChord(root,q);
      if(tones) pool=tones.filter(t=>!carried.has(t) && !onBoard.has(t));
    }
    const name = pool.length && Math.random()<.8 ? rnd(pool) : rnd(snRoots(L));
    const at=snFree(); if(!at) break;
    blast.tiles.push({x:at[0], y:at[1], name, pc:pcOfName(name), star:Math.random()<.08});
  }
}
function snDraw(){
  if(!blast || blast.kind!=="snake" || !blast.boardEl) return;
  if(blast.phase==="play"){ const r=snReady()[0]; if(r) arcadeMod(r.root); helpChord(r ? r.root : null, r ? r.q : ""); }
  const b=blast.boardEl, ready=new Set((snReady()[0]||{tones:[]}).tones);
  b.innerHTML="";
  for(const t of blast.tiles){ const e=document.createElement("span"); e.className="sntile"+(t.star?" star":""); e.style.cssText=snPos(t.x,t.y); e.innerHTML=(t.star?PIXEL_STAR:"")+t.name; b.appendChild(e); }
  // the head, then a segment for each carried note, then the plain end of the body
  blast.body.forEach(([x,y],i)=>{
    const e=document.createElement("span"), note = i>0 ? blast.tail[i-1] : null;
    e.className = i===0 ? `snseg head dir-${blast.dir}` : "snseg"+(note && ready.has(note.name) ? " ready" : "")+(note?"":" plain");
    e.style.cssText=snPos(x,y); if(note) e.textContent=note.name;
    b.appendChild(e);
  });
}
function snTick(now){
  if(!blast || blast.kind!=="snake") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && now>=blast.nextMove){ snStep(); blast.nextMove=now+blast.stepMs*(1+.03*blast.tail.length); }
  blast.raf=requestAnimationFrame(snTick);
}
function snTurn(d){
  if(!blast || blast.kind!=="snake" || blast.phase!=="play" || !["up","down","left","right"].includes(d)) return;   // (a dead corner, nothing)
  const last=blast.queue.length ? blast.queue[blast.queue.length-1] : blast.dir, opp={up:"down",down:"up",left:"right",right:"left"};
  if(d===last || d===opp[last] || blast.queue.length>=2) return;
  blast.queue.push(d);
}
function snStep(){
  if(blast.queue.length) blast.dir=blast.queue.shift();
  const [dx,dy]=SN_DIRS[blast.dir], h=blast.body[0], nx=h[0]+dx, ny=h[1]+dy;
  if(nx<0 || ny<0 || nx>=blast.cols || ny>=blast.rows) return snCrash("WALL");
  if(blast.body.slice(0,-1).some(([x,y])=>x===nx && y===ny)) return snCrash("OUCH");
  const ti=blast.tiles.findIndex(t=>t.x===nx && t.y===ny);
  blast.body.unshift([nx,ny]);
  if(ti>=0){
    const t=blast.tiles.splice(ti,1)[0];
    if(blast.tail.length>=(SN_MAX[blast.level]||6)){ blast.body.shift(); return snCrash("OVERLOADED"); }
    blast.tail.unshift({name:t.name, pc:t.pc});          // the newest note rides just behind the head
    sfx("press");
    if(t.star){ const pts=mulPts(50*(blast.level+1)); blast.score+=pts; sfx("bonus"); snPopup(nx,ny,`+${pts}`,"#7FE9FF"); }
    if(!blast.demo) snFill();
    if(snReady().length) sfx("key");
  } else blast.body.pop();
  // the body is the head, one segment per note carried, and two plain segments after
  while(blast.body.length>blast.tail.length+3) blast.body.pop();
  snBar(); snDraw();
}
function snPopup(x,y,text,colour){ popup(blast.ox+(x+.5)*blast.cell, blast.oy+y*blast.cell, text, colour); }
function snCrash(why){
  const h=blast.body[0];
  explode(blast.ox+(h[0]+.5)*blast.cell, blast.oy+(h[1]+.5)*blast.cell, 34, ["#FF4B3E","#FF8A3D","#FFD35A"]);
  sfx("miss"); buzz(blast.field,true);
  blast.lives--; banner(why, blast.lives>0 ? `${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT` : "");
  if(blast.lives<=0){
    blast.phase="over"; blast.over=true;
    const best=Math.max(saved.best.snake||0, blast.score); saved.best.snake=best; save();
    snBar(); snDraw(); snMenu(true); return;
  }
  snReset(); blast.nextMove=performance.now()+1400; snBar(); snDraw();
}
// a chord from the minichord: cash in the carried notes it spells
function snakeChord(voices){
  if(!blast || blast.kind!=="snake") return;
  if(blast.phase==="demo" && blast.demo){ endSnDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,0);
  const hit=snReady().find(c=>isChord(pitches, pcOfName(c.root), c.q));
  if(!hit){ heard(name,false,"NOT IN YOUR TAIL"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  // those notes leave the tail in a burst, and the snake shrinks back
  const gone=new Set(hit.tones), segs=blast.body.slice(1,blast.tail.length+1);
  segs.forEach(([x,y],i)=>{ if(gone.has(blast.tail[i].name)) explode(blast.ox+(x+.5)*blast.cell, blast.oy+(y+.5)*blast.cell, 18, ["#7FE9FF","#FFD35A","#FFFFFF"]); });
  // the notes left close up behind the head, and the snake shortens from its end
  blast.tail=blast.tail.filter(t=>!gone.has(t.name));
  blast.body=blast.body.slice(0, blast.tail.length+3);
  const pts=mulPts(hit.tones.length*15*(blast.level+1));
  blast.score+=pts; blast.cashes++; stats.streak=blast.cashes; scoreboard();
  sfx("boom"); const h=blast.body[0]; snPopup(h[0],h[1],`${hit.root}${hit.q} +${pts}`,"#FFD35A");
  if(blast.cashes%5===0){
    const was=blast.level;
    for(let n=blast.level+1;n<SN_LEVELS.length;n++) if(snLevelOk(n)){ blast.level=n; break; }
    blast.stepMs=Math.max(90, blast.stepMs*.92); sfx("level");
    if(blast.level!==was){ banner(`LEVEL ${blast.level+1}`, snLevelName(blast.level).toUpperCase()); if(SN_LEVELS[blast.level].barry && canWrite()) borrow(33,1); }
    else banner("FASTER!");
  }
  snFill(); snBar(); snDraw();
}
// the harp, as a controller
function snakeHarp(pc){
  if(!blast || blast.kind!=="snake") return;
  kmFlash(blast.strip, pc);
  const c=kmControl(pc);
  if(blast.phase==="demo" && blast.demo){ endSnDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  if(c==="A") return;                                    // A is spare, for now
  if(c==="B") return snDrop();
  snTurn(c);
}
function snDrop(){
  if(!blast.tail.length) return;
  blast.tail.pop(); blast.body.splice(blast.tail.length+1,1);
  const cost=5*(blast.level+1); blast.score=Math.max(0,blast.score-cost);
  sfx("letgo"); const h=blast.body[0]; snPopup(h[0],h[1],`-${cost}`,"#FF7A6E");
  snBar(); snDraw();
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="snake" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const k={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",KeyW:"up",KeyS:"down",KeyA:"left",KeyD:"right"}[e.code];
  if(k){ e.preventDefault(); snTurn(k); return; }
  if(e.code==="KeyX" || e.code==="KeyB"){ e.preventDefault(); if(blast && blast.phase==="play") snDrop(); }
});

// ---------- Chord Snake's demo ----------
// The controller strip first, zone by zone; then the snake eats E, G♯ and B, the three glow, E major
// is played and they burst; then B dropping a note. It runs the real game on a scripted board.
function snDemo(){
  if(!blast || blast.kind!=="snake") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; snLayout();
  const {el, token, say, sleep, step}=demoShell(endSnDemo), $d=s=>el.querySelector(s);
  const litZone=(...zs)=>{ [...blast.strip.children].forEach(c=>c.classList.toggle("demo-on", zs.includes(c.dataset.zone))); };
  sfx("attract");
  (async()=>{
    try{
      const grid=kmLayout().cols===3, pad=saved.harpLayout==="kmpad";
      say("THE HARP IS YOUR CONTROLLER", pad ? "THE KEYMASTER AS A D-PAD, BY ITS NUMBERED CONTACTS." : grid ? "ITS FOUR ROWS OF THREE ARE A D-PAD, WITH TWO BUTTONS IN THE MIDDLE." : "TOP TO BOTTOM, THE STRIP IS UP, LEFT, TWO BUTTONS, RIGHT AND DOWN."); await step(3200);
      const tour = pad ? [[["down"],"CONTACT 2 GOES DOWN"],[["right"],"3 GOES RIGHT"],[["left"],"4 GOES LEFT"],[["up"],"5 GOES UP"],[["A","B"],"10 IS A AND 9 IS B: B DROPS YOUR OLDEST NOTE"]]
        : grid ? [[["up"],"THE TOP MIDDLE GOES UP"],[["down"],"THE BOTTOM MIDDLE GOES DOWN: THE CORNERS DO NOTHING"],[["left"],"THE LEFT SIDE GOES LEFT"],[["right"],"THE RIGHT SIDE GOES RIGHT"],[["A","B"],"A AND B IN THE MIDDLE: B DROPS YOUR OLDEST NOTE"]]
        : [[["up"],"THE TOP THREE GO UP"],[["left"],"THE NEXT TWO GO LEFT"],[["A","B"],"A AND B IN THE MIDDLE: B DROPS YOUR OLDEST NOTE"],[["right"],"TWO FOR RIGHT"],[["down"],"AND THE BOTTOM THREE GO DOWN"]];
      for(const [zs,t] of tour){
        litZone(...zs); say("THE HARP IS YOUR CONTROLLER", t); sfx("press"); await step(1700); }
      litZone();
      say("EAT NOTES","STEER INTO A NOTE AND THE SNAKE CARRIES IT.");
      snReset(); const [hx,hy]=blast.body[0];
      blast.tiles=[{x:hx+2,y:hy,name:"E",pc:4},{x:hx+4,y:hy,name:"G♯",pc:8},{x:hx+6,y:hy,name:"B",pc:11},{x:hx+3,y:hy+3,name:"F",pc:5}];
      blast.stepMs=380; snDraw(); await step(1200);
      for(let k=0;k<6;k++){ snDemoStep(); await step(420); }
      say("SPELL A CHORD","E, G♯ AND B GLOW: THEY SPELL E MAJOR."); await step(2600);
      say("CASH IN","PLAY E MAJOR ON THE MINICHORD AND THEY BURST. BIGGER CHORDS SCORE MORE.");
      await step(900);
      demoPlay([52,56,59,64]);                                                   // E major, heard and lit on the buttons
      snDemoCash(); await step(2600);
      say("WATCH YOUR LOAD","WALLS, YOUR OWN TAIL AND CARRYING TOO MUCH COST A LIFE."); await step(3200);
      say("READY?","CHOOSE A LEVEL. STEER ON THE HARP OR THE ARROW KEYS."); sfx("level"); await step(2800);
      endSnDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function snDemoStep(){ const saveLives=blast.lives; blast.phase="play"; snStep(); blast.phase="demo"; blast.lives=saveLives; snDraw(); }   // drawn again as the demo: what glows is the standard game's
function snDemoCash(){
  const gone=new Set(["E","G♯","B"]);
  blast.body.slice(1,blast.tail.length+1).forEach(([x,y],i)=>{ if(gone.has(blast.tail[i].name)) explode(blast.ox+(x+.5)*blast.cell, blast.oy+(y+.5)*blast.cell, 18, ["#7FE9FF","#FFD35A","#FFFFFF"]); });
  sfx("boom"); const h=blast.body[0]; snPopup(h[0],h[1],"E +45","#FFD35A");
  blast.tail=blast.tail.filter(t=>!gone.has(t.name)); while(blast.body.length>blast.tail.length+3) blast.body.pop(); snDraw();
}
function endSnDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.tiles=[]; blast.tail=[]; blast.body=[];
  if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.remove("demo-on"));
  snDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.kind==="snake" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) snDemo(); }, 25000);
  cabRestart();
}
