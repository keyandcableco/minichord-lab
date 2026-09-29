// Chord Stack: intervals falling on twelve columns; stack chords, play them to clear rows. With its
// demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Stack ----------
// A falling-block game about intervals as shapes. The board is twelve columns wide, one for each
// pitch class, C to B, and wraps round like the pitch-class clock. Each piece is a shape of notes in
// a row, a single note, an interval, or a whole chord shape, labelled by the columns it sits over,
// so sliding it sideways transposes it: the shape stays, the notes change. When a row's notes make
// a chord, it glows; play that chord on the minichord and the row clears. Up (or A) flips the
// shape, turning a major third into a minor sixth's worth of room, or a major triad into a minor
// one; B drops it. The stack reaching the top ends the game. It steers on the harp played as a
// d-pad, or the arrow keys.
const ST_LEVELS=[
  {n:"Thirds", pieces:[[0],[0,4],[0,3]], qs:["","m"]},
  {n:"Thirds and fifths", pieces:[[0],[0,4],[0,3],[0,7]], qs:["","m"]},
  {n:"Diminished and augmented", pieces:[[0],[0,4],[0,3],[0,7],[0,6]], qs:["","m","°","+"]},
  {n:"Sevenths", pieces:[[0],[0,4],[0,3],[0,7],[0,10],[0,11]], qs:["","m","7","maj7","m7"]},
  {n:"Chord shapes", pieces:[[0],[0,4],[0,3],[0,4,7],[0,3,7],[0,10],[0,11]], qs:["","m","°","+","7","maj7","m7","m7♭5","°7"]},
];
const ST_ROWS=14;
// The stack rises: every so many pieces a row of stray notes pushes up from the bottom, sooner at
// higher levels and faster speeds, so a stack left unplayed climbs to the top. The HUD counts down.
const stRiseEvery=()=> Math.max(4, Math.round((9-blast.level)*(1.3-(+saved.speed||0)*.12)));
const ST_Q_SETS={"":[0,4,7],"m":[0,3,7],"°":[0,3,6],"+":[0,4,8],"7":[0,4,7,10],"maj7":[0,4,7,11],"m7":[0,3,7,10],"m7♭5":[0,3,6,10],"°7":[0,3,6,9]};
const ST_NAMES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
const ST_INTERVAL={1:"m2",2:"M2",3:"m3",4:"M3",5:"P4",6:"TT",7:"P5",8:"m6",9:"M6",10:"m7",11:"M7"};
function genStack(){
  return {kind:"stack", prompt:"Chord Stack", sub:"Pieces of notes fall onto a board with a column for each note, C to B. Slide a piece sideways to transpose it; when it lands, each note falls down its column. When a row holds a chord, play it to clear those notes. A inverts, B drops, up swaps sharps and flats.",
    answer:{type:"stack", get name(){ const r=stReadyRows()[0]; return r ? r.name : "a chord from a row"; }},
    get hint(){ const r=stReadyRows()[0]; return r ? `Row ${ST_ROWS-r.y} spells ${r.name}.` : "Build a chord in a row: a root, a third above it, and a fifth."; },
    context:0};
}
// the chord a set of pitch classes makes, if the level has one: its root, quality and name
// The chord a row's notes hold, if the level has one: its notes all in the row, other notes or not,
// the largest chord first (a row of D F♯ A C is D7 where sevenths count, D otherwise)
function stChordOf(pcs){
  if(pcs.length<3) return null;
  const have=new Set(pcs), L=ST_LEVELS[blast.level];
  let best=null;
  for(const q of L.qs) for(let r=0;r<12;r++){
    const want=ST_Q_SETS[q].map(x=>(r+x)%12);
    if(!want.every(pc=>have.has(pc)) || (best && best.pcs.length>=want.length)) continue;
    const tn=spellTones(ST_Q_SETS[q].map(x=>48+r+x),0);
    best={root:r, q, pcs:want, name:(tn.get(r)||ST_NAMES[r])+q, tones:ST_Q_SETS[q].map(x=>tn.get((r+x)%12))};
  }
  return best;
}
// A row that makes a chord is matched by its notes, whatever they're called (C, E♭ and F♯ make C°), and
// then takes the chord's own spelling, from its root: the F♯ turns into G♭ with a flash, so the
// enharmonic change is seen. The root keeps the name it was dropped with.
function stRespell(){
  for(const r of stReadyRows()){
    const row=blast.grid[r.y], rootName=(row[r.root] && row[r.root].name) || ST_NAMES[r.root];
    const tones=spellChord(rootName, r.q) || r.tones;
    ST_Q_SETS[r.q].forEach((iv,i)=>{ const x=(r.root+iv)%12, cell=row[x]; if(cell && tones[i] && cell.name!==tones[i]){ cell.was=cell.name; cell.name=tones[i]; cell.flash=performance.now(); } });
    r.name=rootName+r.q;
  }
}
function stReadyRows(){
  if(!blast || blast.kind!=="stack") return [];
  const out=[]; blast.grid.forEach((row,y)=>{ const pcs=row.map((c,x)=>c?x:-1).filter(x=>x>=0); const ch=stChordOf(pcs);
    if(ch){ const rc=row[ch.root]; if(rc && rc.name) ch.name=rc.name+ch.q; out.push({y, ...ch}); } });
  return out;
}
function startStack(){
  blast={kind:"stack", grid:[], piece:null, next:null, score:0, lives:1, level:0, clears:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null,
    noShip:true, last:performance.now(), nextFall:0};
  stDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  stMenu();
  blast.raf=requestAnimationFrame(stTick);
}
function stDevice(){
  if(!blast || blast.kind!=="stack" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(knobsReady()) borrow(238,1); });
  // the title screen mentions the knob once the minichord says it has one to send
  const sig=String(knobsReady());
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ if(menuRebuild(()=>stMenu())) blast.menuSig=sig; }
}
// A knob is the transposition dial: turned, the falling piece slides through the twelve columns, C at
// one end of the knob's travel and B at the other, stopping short of anything in its way.
function stKnob(v){
  const p=blast && blast.kind==="stack" && blast.phase==="play" && blast.piece; if(!p) return;
  const want=Math.min(11, Math.floor(v*12));
  let guard=12; while(p.x!==want && guard--){ const dx=want>p.x ? 1 : -1; const nx=p.x+dx; if(nx<0||nx>11||!stFits(p,nx,p.y)) break; p.x=nx; }
  stDraw();
}
function buildStackField(box){
  const field=document.createElement("div"); field.className="field arcade stack"; field.setAttribute("aria-label","The Chord Stack board");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const board=document.createElement("div"); board.className="stboard"; field.appendChild(board);
  const nextBox=document.createElement("div"); nextBox.className="stnext"; field.appendChild(nextBox);
  box.append(field);
  if(blast && blast.kind==="stack"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.boardEl=board; blast.nextEl=nextBox; blast.fx=fxInit(field); blast.strip=kmStrip(field);
    setTimeout(()=>{ stLayout(); stDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  stBar();
  setTimeout(helperSync);
}
function stLayout(){
  const f=blast.field, H=f.clientHeight-96, cell=Math.max(22, Math.min(36, Math.floor(H/ST_ROWS)));
  blast.cell=cell;
  const W=12*cell, left=Math.max(120, Math.floor((f.clientWidth-W)/2)-30);
  blast.bx=left; blast.by=44;
  blast.boardEl.style.cssText=`left:${left}px;top:${blast.by}px;width:${W}px;height:${ST_ROWS*cell+30}px`;
  blast.nextEl.style.cssText=`left:${Math.max(10,left-110)}px;top:${blast.by}px`;
}
function stBar(){
  if(!blast || blast.kind!=="stack" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${ST_LEVELS[blast.level].n.toUpperCase()}</span><span>RISE IN ${Math.max(0,blast.riseIn||0)}</span>`;
}
const STMENU_G={key:"stack", title:"CHORD STACK",
  rules:()=>`<p>ONE COLUMN FOR EACH NOTE, C TO B. SLIDE A PIECE TO TRANSPOSE IT${knobsReady() ? ": TURN A KNOB ON THE MINICHORD AND IT SLIDES" : ""}.</p><p>NOTES FALL DOWN THEIR COLUMNS. WHEN A ROW HOLDS A CHORD, PLAY IT TO CLEAR IT.</p><p>EVERY FEW PIECES A ROW OF STRAY NOTES RISES FROM BELOW. DON'T LET THE STACK REACH THE TOP.</p><p>A INVERTS · B DROPS · UP SWAPS SHARPS AND FLATS</p>`,
  stat:()=>`ROWS ${blast.clears}`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("HARP", ["STANDARD STRIP","KEYMASTER GRID"], ()=>saved.harpLayout==="keymaster"?1:0, i=>{ saved.harpLayout = i ? "keymaster" : "strip"; save();
    kmRestrip(); });
    row("HARP SOUND", ["NORMAL","QUIET","OFF"], ()=>saved.harpSound??1, i=>{ saved.harpSound=i; save(); if(blast && blast.setupDone) kmHarp(); });
  },
  levels:ST_LEVELS,
  begin:i=>beginStack(i), demo:()=>stDemo(), modNote:"always"};
function stMenu(over){ arcadeMenu(STMENU_G, over); }
// A piece is spelled by its intervals, the way chords are built: its lowest note named for its
// column (a black-key column as a sharp or a flat, the piece's own choice, kept as it slides), and
// each other note the letter its interval calls for, a third two letters up, a fifth four. So a
// minor third on E♭ is E♭ and G♭, and the same third on D♯ is D♯ and F♯.
const ST_STEPS={1:1,2:1,3:2,4:2,5:3,6:4,7:4,8:5,9:5,10:6,11:6};   // letters above the lowest note for each interval; the tritone as a diminished fifth
const ST_SHARPS=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"], ST_FLATS=["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
// the note d semitones above (or, if d is negative, below) a named note, a letter per step of the interval
function stFrom(name, d){
  if(d===0) return name;
  const {li,acc}=parse(name), steps=Math.sign(d)*ST_STEPS[Math.abs(d)], tl=mod(li+steps,7), target=mod(NAT[li]+acc+d,12);
  let a=mod(target-NAT[tl],12); if(a>6) a-=12;
  return Math.abs(a)>2 ? null : LETTERS[tl]+ACC[a];
}
// A piece is spelled from its anchor: the note it keeps when inverted (its lowest, until it's turned
// over), named for its column as a sharp or a flat; every other note by its interval from there.
function stSpell(p){
  const a=p.anchor||0, anchorName=(p.flat ? ST_FLATS : ST_SHARPS)[(p.x+a)%12];
  return p.shape.map(o=> stFrom(anchorName, o-a) || ST_NAMES[(p.x+o)%12]);
}
const stRandPiece=()=>{ const L=ST_LEVELS[blast.level], shape=rnd(L.pieces); return {shape:[...shape], x:Math.floor(Math.random()*12), y:0, flat:Math.random()<.5}; };
function beginStack(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{grid:[...Array(ST_ROWS)].map(()=>Array(12).fill(null)), score:0, level, startLevel:level, clears:0, phase:"play", over:false, riseIn:0,
    fallMs:760*speedMul()*Math.pow(.92,level)});
  saved.stackStart=level; save(); blast.riseIn=stRiseEvery();
  stats.streak=0; scoreboard(); stLayout();
  blast.next=stRandPiece(); stSpawn();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.nextFall=performance.now()+900; blast.raf=requestAnimationFrame(stTick);
  banner(`LEVEL ${level+1}`, `${ST_LEVELS[level].n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start"); stBar(); stDraw();
}
const stCols=p=>p.shape.map(o=>(p.x+o)%12);
const stFits=(p,x,y)=>y<ST_ROWS && p.shape.every(o=>!blast.grid[y][(x+o)%12]);
function stSpawn(){
  blast.piece=blast.next; blast.piece.y=0; blast.next=stRandPiece();
  if(!stFits(blast.piece, blast.piece.x, 0)) return stOver();
}
function stTick(now){
  if(!blast || blast.kind!=="stack") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && now>=blast.nextFall){ stFall(); blast.nextFall=now+blast.fallMs; }
  blast.raf=requestAnimationFrame(stTick);
}
function stFall(){
  const p=blast.piece; if(!p) return;
  if(stFits(p, p.x, p.y+1)){ p.y++; stDraw(); return; }
  stLock();
}
// Where a note dropped in a column comes to rest: the lowest empty cell above whatever is stacked there
const stRest=x=>{ let y=ST_ROWS-1; while(y>=0 && blast.grid[y][x]) y--; return y; };
// every column settles, its notes falling until they land on another note or the floor
function stGravity(){
  for(let x=0;x<12;x++){ const col=[]; for(let y=ST_ROWS-1;y>=0;y--) if(blast.grid[y][x]) col.push(blast.grid[y][x]);
    for(let y=ST_ROWS-1, k=0; y>=0; y--, k++) blast.grid[y][x]=col[k]||null; }
}
function stLock(){
  // the piece breaks apart as it lands: each of its notes falls down its own column
  const p=blast.piece, names=stSpell(p); let over=false;
  stCols(p).forEach((x,i)=>{ const y=stRest(x); if(y>=0) blast.grid[y][x]={pc:x, name:names[i]}; else over=true; });
  if(over) return stOver();
  // the rise: a row of two or three stray notes comes up from below, and everything moves up a row
  if(blast.phase==="play" && --blast.riseIn<=0){
    blast.riseIn=stRiseEvery();
    if(blast.grid[0].some(Boolean)) return stOver();                       // no room left at the top
    const row=Array(12).fill(null), n=2+Math.floor(Math.random()*2);
    for(let k=0;k<n;k++){ const x=Math.floor(Math.random()*12); row[x]={pc:x, name:(Math.random()<.5?ST_SHARPS:ST_FLATS)[x], stray:true}; }
    blast.grid.shift(); blast.grid.push(row); sfx("miss");
    if(blast.piece){ blast.piece.y=Math.max(0,blast.piece.y-1); }
  }
  stRespell();
  sfx("press");
  const ready=stReadyRows();
  if(ready.some(r=>r.y===p.y)) sfx("key");
  stSpawn(); stDraw(); stBar(); gameLater(()=>{ if(blast && blast.kind==="stack") stDraw(); }, 950);
}
function stMove(dx){ const p=blast.piece; if(!p) return; const nx=(p.x+dx+12)%12; if(stFits(p,nx,p.y)){ p.x=nx; stDraw(); } }
// flip the shape: its intervals turned upside down, as a major third's room becomes a minor sixth's
// A inverts. An interval turns upside down, its upper note now the lower: the major third C-E
// becomes the minor sixth E-C, the same two notes, named from E. A chord shape turns over, major into minor.
// A turns the piece over around its anchor note, the way a melody is inverted: what went up now goes
// down. A major third above E♭ (E♭ G) becomes a major third below it (C♭ E♭, on the B column), a
// major triad on C (C E G) becomes the minor triad on F (F A♭ C), the anchor staying where it is.
// On a board of pitch classes this is the inversion that moves notes; turning an interval upside
// down in the ordinary sense (C-E into E-C) leaves the same two columns.
function stFlip(){
  const p=blast.piece; if(!p || p.shape.length<2) return;
  const a=p.anchor||0, ax=(p.x+a)%12, mirrored=p.shape.map(o=>a-(o-a));           // offsets from the old x, turned over
  const lo=Math.min(...mirrored), shape=mirrored.map(o=>o-lo).sort((x,y)=>x-y);
  const cand={...p, shape, x:mod(p.x+lo,12), anchor:mod(ax-mod(p.x+lo,12),12)};
  if(!stFits(cand,cand.x,p.y)){ sfx("miss"); return; }
  const was=stSpell(p).join(" ");
  Object.assign(p,cand); sfx("press"); stDraw();
  popup(blast.bx+(ax+.5)*blast.cell, blast.by+p.y*blast.cell-8, `${was} → ${stSpell(p).join(" ")}`, "#FFD35A");
}
// up swaps the piece's spelling, sharps for flats: C♯ E♯ becomes D♭ F
function stRespellPiece(){ const p=blast.piece; if(!p) return; p.flat=!p.flat; sfx("press"); stDraw(); }
function stDrop(){ const p=blast.piece; if(!p) return; while(stFits(p,p.x,p.y+1)) p.y++; stLock(); blast.nextFall=performance.now()+blast.fallMs; }
function stControl(c){
  if(!blast || blast.kind!=="stack" || blast.phase!=="play") return;
  if(c==="left") stMove(-1); else if(c==="right") stMove(1);
  else if(c==="down") stFall();
  else if(c==="A") stFlip();
  else if(c==="up") stRespellPiece();
  else if(c==="B") stDrop();
}
function stackHarp(pc){
  if(!blast || blast.kind!=="stack") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endStDemo(blast.demo); return; }
  stControl(kmControl(pc));
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="stack" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const c={ArrowLeft:"left",ArrowRight:"right",ArrowDown:"down",ArrowUp:"up",KeyA:"left",KeyD:"right",KeyS:"down",KeyW:"up",KeyZ:"A",Space:"B",KeyX:"B"}[e.code];   // Z inverts, space or X drops, up respells
  if(c){ e.preventDefault(); stControl(c); }
});
// a chord from the buttons: clear the lowest row that spells it
function stackChord(voices){
  if(!blast || blast.kind!=="stack") return;
  if(blast.phase==="demo" && blast.demo){ endStDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches,0);
  const rows=stReadyRows().filter(r=>isChord(pitches, r.root, r.q)).sort((a,b)=>b.y-a.y);
  if(!rows.length){ heard(name,false,"NO ROW SPELLS IT"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  // every row holding this chord gives up its notes at once, with a bonus for more than one;
  // other notes in those rows stay, and everything above falls into the gaps
  rows.forEach(r=>{ r.pcs.forEach(x=>{ explode(blast.bx+(x+.5)*blast.cell, blast.by+(r.y+.5)*blast.cell, 8, ["#7FE9FF","#FFD35A","#FFFFFF"]); blast.grid[r.y][x]=null; }); });
  stGravity(); stRespell();
  const pts=mulPts(rows.reduce((a,r)=>a+r.tones.length*15,0)*(blast.level+1)*rows.length);
  blast.score+=pts; blast.clears+=rows.length; stats.streak=blast.clears; scoreboard();
  sfx("boom"); popup(blast.bx+6*blast.cell, blast.by+rows[0].y*blast.cell, `${rows[0].name}${rows.length>1?` ×${rows.length}`:""} +${pts}`, "#FFD35A");
  if(blast.clears>=(blast.level+1)*6 && blast.level<ST_LEVELS.length-1){ blast.level++; blast.fallMs*=.9; sfx("level"); banner(`LEVEL ${blast.level+1}`, ST_LEVELS[blast.level].n.toUpperCase()); }
  stDraw(); stBar();
}
function stOver(){
  blast.phase="over"; blast.over=true; blast.piece=null;
  const best=Math.max(saved.best.stack||0, blast.score); saved.best.stack=best; save();
  stDraw(); stBar(); stMenu(true);
}
function stDraw(){
  if(!blast || blast.kind!=="stack" || !blast.boardEl) return;
  if(blast.phase==="play"){ const r=stReadyRows().sort((a,b)=>b.y-a.y)[0]; if(r) arcadeMod(r.tones[0]); helpChord(r ? r.tones[0] : null, r ? r.q : ""); }
  const b=blast.boardEl, c=blast.cell, ready=new Set(stReadyRows().flatMap(r=>r.pcs.map(x=>r.y+","+x)));   // just the chord's notes glow
  const cellHtml=(x,y,cls,label)=>`<span class="stcell ${cls}" style="left:${x*c}px;top:${y*c}px;width:${c}px;height:${c}px;font-size:${Math.round(c*.36)}px">${label}</span>`;
  let h="";
  const now=performance.now();
  blast.grid.forEach((row,y)=>row.forEach((cell,x)=>{ if(cell) h+=cellHtml(x,y, (ready.has(y+","+x)?"ready":"")+(cell.stray?" stray":"")+(cell.flash && now-cell.flash<900?" respelled":""), cell.name||ST_NAMES[x]); }));
  const p=blast.piece;
  if(p){
    // a ghost where it would land, then the piece itself
    stCols(p).forEach(x=>{ const gy=stRest(x); if(gy>p.y) h+=cellHtml(x,gy,"ghost",""); });   // where each note will come to rest
    const names=stSpell(p); stCols(p).forEach((x,i)=>{ h+=cellHtml(x,p.y,"piece",names[i]); });
  }
  // the column names along the foot of the board
  for(let x=0;x<12;x++) h+=`<span class="stcol" style="left:${x*c}px;top:${ST_ROWS*c+4}px;width:${c}px">${ST_SHARPS[x]===ST_FLATS[x] ? ST_SHARPS[x] : `${ST_SHARPS[x]}<br>${ST_FLATS[x]}`}</span>`;
  b.innerHTML=h;
  // the next piece, with its interval named
  if(blast.nextEl && blast.next){
    const n=blast.next, span=Math.max(...n.shape);
    blast.nextEl.innerHTML=`<span class="stnlabel">NEXT</span><span class="stnshape">${[...Array(span+1)].map((_,i)=>`<i class="${n.shape.includes(i)?"on":""}"></i>`).join("")}</span><span class="stnname">${n.shape.length===1?"A NOTE":n.shape.length===2?ST_INTERVAL[n.shape[1]]:({"0,4,7":"MAJOR","0,3,7":"MINOR"})[n.shape.join()]||"CHORD"}</span>`;
  }
}

// ---------- Chord Stack's demo ----------
function stDemo(){
  if(!blast || blast.kind!=="stack") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; stLayout();
  blast.grid=[...Array(ST_ROWS)].map(()=>Array(12).fill(null)); blast.level=0;
  const {el, token, say, sleep, step}=demoShell(endStDemo), $d=s=>el.querySelector(s);
  const play=notes=>{ if(settings.sounds && piano.ctx){ const go=()=>piano.play(notes,{when:.02,dur:1.1}); piano.ctx.state==="running"?go():piano.ctx.resume().then(go).catch(()=>{}); } };
  sfx("attract");
  (async()=>{
    const fall=async n=>{ for(let k=0;k<n;k++){ if(stFits(blast.piece,blast.piece.x,blast.piece.y+1)){ blast.piece.y++; stDraw(); } await step(110); } };
    try{
      say("CHORD STACK","TWELVE COLUMNS, ONE FOR EACH NOTE, C TO B, WRAPPING ROUND."); stDraw(); await step(3200);
      blast.piece={shape:[0,4], x:5, y:0}; blast.next={shape:[0], x:0, y:0}; stDraw();
      say("TRANSPOSE","A MAJOR THIRD FALLS: F AND A. SLIDE IT AND IT'S STILL A MAJOR THIRD, NOW E AND G♯, NOW C AND E."); await fall(3);
      for(const x of [4,3,2,1,0]){ blast.piece.x=x; stDraw(); sfx("press"); await step(420); }
      await step(600); say("DROP","B DROPS IT."); blast.piece.y=ST_ROWS-1; stCols(blast.piece).forEach((x,i)=>blast.grid[ST_ROWS-1][x]={pc:x, name:stSpell(blast.piece)[i]}); blast.piece=null; sfx("press"); stDraw(); await step(1500);
      blast.piece={shape:[0], x:10, y:0}; blast.next={shape:[0,3], x:0, y:0}; stDraw();
      say("FINISH THE CHORD","A SINGLE NOTE: SLIDE IT TO G AND DROP IT BESIDE C AND E."); await fall(2);
      for(const x of [9,8,7]){ blast.piece.x=x; stDraw(); sfx("press"); await step(420); }
      await step(500); blast.grid[ST_ROWS-1][7]={pc:7, name:"G"}; blast.piece=null; sfx("key"); stDraw();
      say("PLAY IT","C, E AND G GLOW: THAT ROW SPELLS C MAJOR."); await step(2600);
      say("CLEAR","PLAY C ON THE MINICHORD AND THE ROW CLEARS."); await step(900);
      play([48,52,55,60]); for(let x=0;x<12;x++) if(blast.grid[ST_ROWS-1][x]) explode(blast.bx+(x+.5)*blast.cell, blast.by+(ST_ROWS-.5)*blast.cell, 10, ["#7FE9FF","#FFD35A","#FFFFFF"]);
      blast.grid[ST_ROWS-1]=Array(12).fill(null); sfx("boom"); stDraw(); await step(2000);
      say("INVERT","A TURNS A PIECE OVER ON ITS FIRST NOTE: E♭ UP TO G BECOMES E♭ DOWN TO C♭, AND A MAJOR CHORD TURNS MINOR. UP SWAPS SHARPS FOR FLATS."); await step(4200);
      say("READY?","CHOOSE A LEVEL. DON'T LET THE STACK REACH THE TOP."); sfx("level"); await step(2600);
      endStDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endStDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.piece=null; blast.grid=[...Array(ST_ROWS)].map(()=>Array(12).fill(null)); stDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.kind==="stack" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) stDemo(); }, 25000);
  cabRestart();
}
