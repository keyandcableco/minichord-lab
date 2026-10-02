// Chord Stack: falling blocks of notes; line up a chord side by side in a row and play it to clear it.
// With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Stack ----------
// Tetris, where the blocks are notes. Pieces are the seven tetrominoes, each of their four blocks a
// note of the level's key, dealt from one of the key's chords so a chord can always be built. Move and
// rotate a piece as it falls; when a row holds all of a chord's notes, anywhere in it, they light up,
// and playing the chord on the minichord clears them: the blocks above fall into the gaps, and anything
// that lines up as they fall can be played next. Notes side by side (three for a triad, four for a
// seventh, nothing else between) light brighter and score double; a whole row of one chord, five times. A full row that spells nothing is just weight, and the
// stack reaching the top ends the game. The harp is a d-pad (◀ ▶ move, ▼ drops a row, A rotates, B
// drops it all the way), a knob slides the piece, and the arrow keys work too.
const ST_W=10, ST_ROWS=18;
const ST_LEVELS=[
  {n:"Triads in C", keys:[0], qs:["","m"], suffix:" in C"},
  {n:"Triads in G and F", keys:[1,-1], qs:["","m"], alt:"In G and F"},
  {n:"Sevenths", keys:[0,1,-1], qs:["","m","7","maj7","m7"]},
  {n:"Diminished", keys:[0,1,-1,2,-2], qs:["","m","°","7","maj7","m7"]},
  {n:"Every key", keys:[-4,-3,-2,-1,0,1,2,3,4], qs:["","m","°","7","maj7","m7"]},
];
const ST_Q_SETS=MX_TONES;       // the notes each chord type sounds (arcade/matrix.js)
// The chords the level asks for, as the minichord's buttons make them right now: with Barry Harris mode
// on, major plays 6, minor m6 and diminished °7 (the sevenths stay as they are), so those are what light
// up and what the pieces are dealt from. Read live, so switching the mode mid-game switches them too.
const stBarry=()=> typeof mc!=="undefined" && mc.params && mc.params[33]===1;
// and on the alternate or a custom matrix (chosen at the start), whatever the same buttons play there
const stLevelName=i=>mxLevelName(ST_LEVELS[i].n, j=>ST_LEVELS[j].qs, i, ST_LEVELS[i]);
// (the demo teaches the standard game: its own chords, whatever the player has chosen or switched on)
const stQs=()=> blast.phase==="demo" ? ST_LEVELS[0].qs : [...new Set(ST_LEVELS[blast.level].qs.map(mxMap))];
const ST_MAJOR=[0,2,4,5,7,9,11];
// the seven tetrominoes, as cells (x, y) from their top left
const ST_PIECES={
  I:[[0,1],[1,1],[2,1],[3,1]], O:[[0,0],[1,0],[0,1],[1,1]], T:[[1,0],[0,1],[1,1],[2,1]],
  S:[[1,0],[2,0],[0,1],[1,1]], Z:[[0,0],[1,0],[1,1],[2,1]], J:[[0,0],[0,1],[1,1],[2,1]], L:[[2,0],[0,1],[1,1],[2,1]],
};
const stKeyTonic=f=> ((f*7)%12+12)%12;
const stName=(pc,f)=> (f<0 ? FLAT_NAMES : SHARP_NAMES)[((pc%12)+12)%12];
// the key's chords the level allows, triads and sevenths built on each degree
function stKeyChords(f, qs){
  // every chord of the allowed types whose notes are all in the key, built on each of its notes
  const t=stKeyTonic(f), sc=ST_MAJOR.map(x=>(t+x)%12), out=[];
  for(const root of sc) for(const q of qs){ const pcs=ST_Q_SETS[q].map(i=>(root+i)%12); if(pcs.every(p=>sc.includes(p))) out.push({root, q, pcs}); }
  return out;
}
// the chord a run of notes spells, if the level allows it: exactly its three (or four) notes, any order
function stChordOf(pcs, qs){
  const set=[...new Set(pcs)]; if(set.length!==pcs.length || (set.length!==3 && set.length!==4)) return null;
  for(const root of set) for(const q of qs){ const want=ST_Q_SETS[q]; if(want.length!==set.length) continue;
    const have=set.map(p=>(p-root+12)%12).sort((a,b)=>a-b).join(); if(have===[...want].sort((a,b)=>a-b).join()) return {root, q}; }
  return null;
}
function genStack(){
  return {kind:"stack", prompt:"Chord Stack", sub:"Tetris, where the blocks are notes. Line up a chord side by side in a row and play it on the minichord to clear it.",
    answer:{type:"stack", get name(){ const r=stReadyRows()[0]; return r ? r.name : "a chord from a row"; }},
    get hint(){ const r=stReadyRows()[0]; return r ? `Row ${ST_ROWS-r.y} spells ${r.name}.` : "Build a chord side by side in a row: a root, its third and its fifth."; },
    context:0};
}
// A chord in a row: every note of it somewhere in the row. It's tight when its notes also sit side by
// side with nothing else between, and whole when the full row is nothing but it. The blocks it clears
// are every block of its notes in that row.
function stRowChord(row, root, q){
  const tones=ST_Q_SETS[q].map(i=>(root+i)%12), have=new Set(row.filter(c=>c).map(c=>c.pc));
  if(!tones.every(t=>have.has(t))) return null;
  const xs=row.map((c,x)=>c && tones.includes(c.pc) ? x : -1).filter(x=>x>=0), n=tones.length;
  let tight=false;
  for(let x=0; x+n<=ST_W && !tight; x++){ const w=row.slice(x,x+n); tight = w.every(c=>c) && new Set(w.map(c=>c.pc)).size===n && w.every(c=>tones.includes(c.pc)); }
  const whole=row.every(c=>c && tones.includes(c.pc));
  return {xs, tight, whole};
}
// every row holding a chord the level allows, each with its best one to light: a seventh before a
// triad, side by side before scattered
function stReadyRows(){
  if(!blast || blast.kind!=="stack" || !blast.grid || !blast.grid.length) return [];
  const qs=stQs(), out=[];
  blast.grid.forEach((row,y)=>{
    if(row.filter(c=>c).length<3) return;
    let best=null;
    for(let root=0; root<12; root++) for(const q of qs){ const r=stRowChord(row, root, q); if(!r) continue;
      const score=(r.whole?100:0)+(r.tight?10:0)+ST_Q_SETS[q].length;
      if(!best || score>best.score) best={y, root, q, ...r, score}; }
    if(best) out.push({...best, name:stName(best.root,blast.keyF)+best.q, tones:ST_Q_SETS[best.q].map(i=>stName(best.root+i,blast.keyF))});
  });
  return out.sort((a,b)=>b.y-a.y);
}
function startStack(){
  blast={kind:"stack", grid:[], piece:null, next:null, score:0, lives:1, level:0, clears:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null,
    noShip:true, last:performance.now(), nextFall:0, keyF:0};
  blast.grid=stEmpty();
  stDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  stMenu();
  blast.raf=requestAnimationFrame(stTick);
}
const stEmpty=()=>[...Array(ST_ROWS)].map(()=>Array(ST_W).fill(null));
function stDevice(){
  if(!blast || blast.kind!=="stack" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(knobsReady()) borrow(238,1); });
  const sig=String(knobsReady())+mxAvailable().length;
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ if(menuRebuild(()=>stMenu())) blast.menuSig=sig; }
  const now=mxNow().join(); if(blast.chordsWas!==now){ blast.chordsWas=now; stDraw(); stBar(); }   // what the buttons play changed: what lights up follows
}
// a knob slides the falling piece across the well, stopping short of anything in its way
function stKnob(v){
  const p=blast && blast.kind==="stack" && blast.phase==="play" && blast.piece; if(!p) return;
  const w=Math.max(...p.cells.map(c=>c[0]))+1, want=Math.round(v*(ST_W-w));
  let guard=ST_W; while(p.x!==want && guard--){ const dx=want>p.x?1:-1; if(!stFits(p.cells,p.x+dx,p.y)) break; p.x+=dx; }
  stDraw();
}
function buildStackField(box){
  const field=document.createElement("div"); field.className="field arcade stack"; field.setAttribute("aria-label","The Chord Stack well");
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
  // a narrow field (a phone held upright): the well as wide as it can be, the next piece beside it on the right
  const f=blast.field, FW=f.clientWidth, narrow=FW<480, H=f.clientHeight-70;
  const cell=Math.max(narrow ? 12 : 16, Math.min(30, Math.floor(H/ST_ROWS), narrow ? Math.floor((FW-100)/ST_W) : 30));
  blast.cell=cell;
  const W=ST_W*cell, left=narrow ? 10 : Math.max(130, Math.floor((f.clientWidth-W)/2));
  blast.bx=left; blast.by=46;
  blast.boardEl.style.cssText=`left:${left}px;top:${blast.by}px;width:${W}px;height:${ST_ROWS*cell}px`;
  blast.nextEl.style.cssText = narrow ? `left:${left+W+8}px;top:${blast.by}px` : `left:${Math.max(10,left-120)}px;top:${blast.by}px`;
}
function stBar(){
  if(!blast || blast.kind!=="stack" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${stName(stKeyTonic(blast.keyF||0),blast.keyF||0)} MAJOR${stBarry() && mxChoice()==="standard"?" · BARRY HARRIS":""}${mxTag()}</span><span>CHORDS ${blast.clears}</span>`;
}
const STMENU_G={key:"stack", title:"CHORD STACK",
  rules:()=>`<p>TETRIS, WHERE THE BLOCKS ARE NOTES. MOVE AND ROTATE EACH PIECE AS IT FALLS${knobsReady()?": A KNOB SLIDES IT":""}.</p><p>WHEN A ROW HOLDS ALL OF A CHORD'S NOTES, ANYWHERE IN IT, THEY LIGHT UP: PLAY THAT CHORD TO CLEAR THEM. SIDE BY SIDE SCORES DOUBLE; A WHOLE ROW OF ONE CHORD, FIVE TIMES.</p><p>${playOnScreen() ? "UNDER THE GAME: ◀ ▶ MOVE, ▼ DROPS A ROW, A ROTATES, B DROPS IT." : "ON THE HARP: ◀ ▶ MOVE, ▼ DROPS A ROW, A ROTATES, B DROPS IT. OR THE ARROW KEYS, AND SPACE TO DROP."}</p><p>THE CHORDS FOLLOW YOUR MINICHORD: WITH BARRY HARRIS MODE ON, SIXTHS AND DIMINISHED SEVENTHS LIGHT UP INSTEAD OF TRIADS. CHOOSE THE ALTERNATE CHORDS, OR YOUR PRESET'S OWN, UNDER CHORDS.</p>`,
  stat:()=>`CHORDS ${blast.clears}`,
  rows:row=>{
    mxRow(row, ()=>menuRebuild(()=>stMenu()));
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("HARP", HARP_LAYOUTS.map(([t])=>t), harpLayoutIndex, i=>{ saved.harpLayout=HARP_LAYOUTS[i][1]; save(); kmRestrip(); });
    row("HARP SOUND", ["NORMAL","QUIET","OFF"], ()=>saved.harpSound??1, i=>{ saved.harpSound=i; save(); if(blast && blast.setupDone) kmHarp(); });
  },
  levels:ST_LEVELS, levelName:i=>stLevelName(i),
  begin:i=>beginStack(i), demo:()=>stDemo(), modNote:"always"};
function stMenu(over){ arcadeMenu(STMENU_G, over); }
// a new piece: a random tetromino, its four blocks a chord of the key plus a note of the key, shuffled
function stRandPiece(){
  const chords=stKeyChords(blast.keyF, stQs()), ch=rnd(chords);
  const scale=ST_MAJOR.map(x=>(stKeyTonic(blast.keyF)+x)%12), notes=[...ch.pcs];
  while(notes.length<4) notes.push(rnd(scale));
  for(let i=notes.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [notes[i],notes[j]]=[notes[j],notes[i]]; }
  const kind=rnd(Object.keys(ST_PIECES));
  return {kind, cells:ST_PIECES[kind].map(c=>[...c]), notes, x:0, y:0};
}
function stLevelKey(){
  const L=ST_LEVELS[blast.level]; blast.keyF=rnd(L.keys);
  if(canWrite() && hasSetting(35)) borrow(35, keyIndexOf(blast.keyF));      // the key's chords are plain buttons
}
function beginStack(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{grid:stEmpty(), piece:null, next:null, score:0, level, startLevel:level, clears:0, phase:"play", over:false,
    fallMs:820*speedMul()*Math.pow(.9,level), nextFall:performance.now()+900});
  stLevelKey(); mxApply();                              // the minichord to the chosen matrix
  blast.next=stRandPiece(); stSpawn();
  saved.stackStart=level; save(); stats.streak=0; scoreboard(); stBar();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(stTick);
  banner(`LEVEL ${level+1}`, `${stLevelName(level).toUpperCase()} · ${stName(stKeyTonic(blast.keyF),blast.keyF)} MAJOR`); sfx("start");
}
const stAbs=(cells,x,y)=>cells.map(([cx,cy])=>[x+cx,y+cy]);
const stFits=(cells,x,y)=>stAbs(cells,x,y).every(([cx,cy])=>cx>=0 && cx<ST_W && cy<ST_ROWS && (cy<0 || !blast.grid[cy][cx]));
function stSpawn(){
  const p=blast.next; blast.next=stRandPiece();
  const w=Math.max(...p.cells.map(c=>c[0]))+1; p.x=Math.floor((ST_W-w)/2); p.y=-1;
  if(!stFits(p.cells,p.x,p.y+1)){ blast.piece=null; stOver(); return; }
  p.y=0; blast.piece=p; stDraw();
}
function stTick(now){
  if(!blast || blast.kind!=="stack") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" && blast.piece && now>=blast.nextFall){ stFall(); blast.nextFall=now+blast.fallMs; }
  blast.raf=requestAnimationFrame(stTick);
}
function stFall(){ const p=blast.piece; if(!p) return; if(stFits(p.cells,p.x,p.y+1)){ p.y++; stDraw(); } else stLock(); }
// the piece comes to rest: its blocks become the board's, and the next one comes
function stLock(){
  const p=blast.piece; if(!p) return;
  stAbs(p.cells,p.x,p.y).forEach(([x,y],i)=>{ if(y>=0) blast.grid[y][x]={pc:p.notes[i]}; });
  blast.piece=null; sfx("lock");
  if(stReadyRows().length) sfx("ready");
  stSpawn(); stDraw(); stBar();
}
function stMove(dx){ const p=blast.piece; if(!p) return; if(stFits(p.cells,p.x+dx,p.y)){ p.x+=dx; stDraw(); } }
// rotating: a quarter turn clockwise about the piece's middle, nudged sideways or up if it's against
// a wall or the stack (a wall kick); the notes turn with their blocks
function stRotate(){
  const p=blast.piece; if(!p) return;                  // the square too: its outline stays, its notes turn round
  const w=Math.max(...p.cells.map(c=>c[0]))+1;
  let turned=p.cells.map(([x,y])=>[-y,x]); const mx=Math.min(...turned.map(c=>c[0])), my=Math.min(...turned.map(c=>c[1]));
  turned=turned.map(([x,y])=>[x-mx,y-my]);
  const shift=Math.floor((w-(Math.max(...turned.map(c=>c[0]))+1))/2);
  for(const [kx,ky] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]]){
    if(stFits(turned,p.x+shift+kx,p.y+ky)){ p.cells=turned; p.x+=shift+kx; p.y+=ky; sfx("rotate"); stDraw(); return; } }
}
function stDrop(){ const p=blast.piece; if(!p) return; while(stFits(p.cells,p.x,p.y+1)) p.y++; stLock(); blast.nextFall=performance.now()+blast.fallMs; }
// where the piece would land
function stGhostY(p){ let y=p.y; while(stFits(p.cells,p.x,y+1)) y++; return y; }
function stControl(c){
  if(!blast || blast.kind!=="stack" || blast.phase!=="play") return;
  if(c==="left") stMove(-1); else if(c==="right") stMove(1);
  else if(c==="down"){ stFall(); blast.nextFall=performance.now()+blast.fallMs; }
  else if(c==="A" || c==="up") stRotate();
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
  const letters = !(typeof kbOn==="function" && kbOn());          // in keyboard play the letters are the instrument's
  const c=Object.assign({ArrowLeft:"left",ArrowRight:"right",ArrowDown:"down",ArrowUp:"up",Space:"B"}, letters?{KeyA:"left",KeyD:"right",KeyS:"down",KeyW:"up",KeyZ:"A",KeyX:"B"}:{})[e.code];
  if(c){ e.preventDefault(); stControl(c); }
});
// the blocks above a cleared run fall into its gaps, column by column
function stGravity(){
  for(let x=0;x<ST_W;x++){
    const col=[]; for(let y=ST_ROWS-1;y>=0;y--) if(blast.grid[y][x]) col.push(blast.grid[y][x]);
    for(let y=ST_ROWS-1, i=0; y>=0; y--, i++) blast.grid[y][x]=col[i]||null;
  }
}
// a chord from the buttons: every lit run of that chord clears
function stackChord(voices){
  if(!blast || blast.kind!=="stack") return;
  if(blast.phase==="demo" && blast.demo){ endStDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches, devFifths());
  // any row holding all of the played chord's notes, whatever that row's chord is called: C6 and Am7
  // are the same four notes, and either clears them
  const id=chordId(pitches);
  const runs = id && ST_Q_SETS[id.quality] ? blast.grid.map((row,y)=>{ const r=stRowChord(row, id.root, id.quality); return r && {y, root:id.root, q:id.quality, ...r, name:stName(id.root,blast.keyF)+id.quality}; }).filter(Boolean) : [];
  if(!runs.length){ heard(name,false,"NO ROW SPELLS IT"); if(chordId(pitches)) later(()=>{ sfx("miss"); buzz(blast && blast.field, true); }); return; }
  heard(name,true);
  let pts=0;
  runs.forEach(r=>{ r.xs.forEach(x=>{ explode(blast.bx+(x+.5)*blast.cell, blast.by+(r.y+.5)*blast.cell, 8, r.whole?["#FFD35A","#FFFFFF","#FF5AA0"]:["#7FE9FF","#FFD35A","#FFFFFF"]); blast.grid[r.y][x]=null; });
    const base=(BLAST_WORTH[r.q] ?? 10)*ST_Q_SETS[r.q].length;   // the chord's worth, as in Chord Invaders, for each of its notes
    pts += r.whole ? base*5 : r.tight ? base*2 : base; });
  stGravity();
  pts=mulPts(Math.round(pts*(blast.level+1)*runs.length));
  blast.score+=pts; blast.clears+=runs.length; stats.streak=blast.clears; scoreboard();
  sfx(runs.some(r=>r.whole)?"level":"boom", stKeyTonic(blast.keyF||0));
  const how = runs.some(r=>r.whole) ? "WHOLE ROW! " : runs.some(r=>r.tight) ? "SIDE BY SIDE! " : "";
  popup(blast.bx+ST_W/2*blast.cell, blast.by+runs[0].y*blast.cell, `${how}${runs[0].name}${runs.length>1?` ×${runs.length}`:""} +${pts}`, "#FFD35A");
  if(blast.clears>=(blast.level+1)*8 && blast.level<ST_LEVELS.length-1){
    blast.level++; blast.fallMs*=.88; stLevelKey(); sfx("level", stKeyTonic(blast.keyF||0));
    banner(`LEVEL ${blast.level+1}`, `${stLevelName(blast.level).toUpperCase()} · ${stName(stKeyTonic(blast.keyF),blast.keyF)} MAJOR`); }
  stDraw(); stBar();
}
function stOver(){
  blast.phase="over"; blast.over=true; blast.piece=null;
  const best=Math.max(saved.best.stack||0, blast.score); saved.best.stack=best; save();
  stDraw(); stBar(); stMenu(true);
}
function stDraw(){
  if(!blast || blast.kind!=="stack" || !blast.boardEl) return;
  const ready=stReadyRows();
  if(blast.phase==="play"){ const r=ready[0]; if(r) arcadeMod(r.tones[0]); helpChord(r ? r.tones[0] : null, r ? r.q : ""); }
  const b=blast.boardEl, c=blast.cell, lit=new Map(); ready.forEach(r=>r.xs.forEach(x=>lit.set(r.y+","+x, r.whole?"ready whole":r.tight?"ready tight":"ready")));
  const cellHtml=(x,y,cls,label)=>`<span class="stcell ${cls}" style="left:${x*c}px;top:${y*c}px;width:${c}px;height:${c}px;font-size:${Math.round(c*.4)}px">${label}</span>`;
  let h="";
  blast.grid.forEach((row,y)=>row.forEach((cell,x)=>{ if(cell) h+=cellHtml(x,y, lit.get(y+","+x)||"", stName(cell.pc,blast.keyF)); }));
  const p=blast.piece;
  if(p){
    const gy=stGhostY(p); if(gy>p.y) stAbs(p.cells,p.x,gy).forEach(([x,y])=>{ if(y>=0) h+=cellHtml(x,y,"ghost",""); });
    stAbs(p.cells,p.x,p.y).forEach(([x,y],i)=>{ if(y>=0) h+=cellHtml(x,y,`piece p${p.kind}`,stName(p.notes[i],blast.keyF)); });
  }
  b.innerHTML=h;
  // the next piece, its shape and its notes
  if(blast.nextEl){
    const n=blast.next;
    if(!n){ blast.nextEl.innerHTML=""; return; }
    const s=Math.round(c*.8), w=Math.max(...n.cells.map(q=>q[0]))+1, hh=Math.max(...n.cells.map(q=>q[1]))+1;
    blast.nextEl.innerHTML=`<span class="stnlabel">NEXT</span><span class="stnshape" style="width:${w*s}px;height:${hh*s}px">${n.cells.map(([x,y],i)=>`<i class="p${n.kind}" style="left:${x*s}px;top:${y*s}px;width:${s}px;height:${s}px;font-size:${Math.round(s*.4)}px">${stName(n.notes[i],blast.keyF)}</i>`).join("")}</span>`;
  }
}

// the harp's A and B, as pictures: A turns the piece, B slams it down (see kmGlyph)
const ST_ROTATE=`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#7FE9FF" d="M5 2h4v2H5zM3 3h2v2H3zM2 5h2v6H2zM3 11h2v2H3zM5 12h6v2H5zM11 10h2v2h-2zM12 7h2v3h-2z"/><path fill="#FFD35A" d="M9 0h2v1H9zM9 1h3v1H9zM9 2h4v1H9zM9 3h3v1H9zM9 4h2v1H9z"/></svg>`;
const ST_SLAM=`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#FFD35A" d="M6 1h4v6H6zM3 7h10v2H3zM5 9h6v2H5zM7 11h2v1H7z"/><path fill="#F1E8D2" d="M1 13h14v2H1z"/><path fill="#FF8A3D" d="M2 12h2v1H2zM12 12h2v1h-2z"/></svg>`;
const ST_GLYPH={A:ST_ROTATE, B:ST_SLAM};

// ---------- Chord Stack's demo ----------
// A T piece of C, E, G and A falls, turns, and lands with C, E and G side by side on the floor; they
// light up, C major clears them, and what was above drops into the gap.
function stDemo(){
  if(!blast || blast.kind!=="stack") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; blast.keyF=0; stLayout();
  blast.grid=stEmpty();
  // a little stack already there: D and F on the floor at the left, B above them
  blast.grid[ST_ROWS-1][0]={pc:2}; blast.grid[ST_ROWS-1][1]={pc:5}; blast.grid[ST_ROWS-2][0]={pc:11};
  blast.next={kind:"L", cells:ST_PIECES.L.map(q=>[...q]), notes:[9,5,0,4]};
  const {el, token, say, sleep, step}=demoShell(endStDemo);
  sfx("attract");
  (async()=>{
    try{
      say("CHORD STACK","TETRIS, WHERE THE BLOCKS ARE NOTES."); stDraw(); await step(2800);
      blast.piece={kind:"I", cells:ST_PIECES.I.map(q=>[...q]), notes:[0,4,7,9], x:3, y:0}; stDraw();
      say("SPELL A CHORD","A PIECE OF C, E, G AND A FALLS. SLIDE IT OVER AND DROP IT: A CHORD'S NOTES ANYWHERE IN A ROW LIGHT UP.");
      for(let k=0;k<4;k++){ stFall(); await step(240); }
      for(const dx of [-1]){ helpZone(dx<0?"left":"right"); stMove(dx); await step(360); }
      while(stFits(blast.piece.cells,blast.piece.x,blast.piece.y+1)){ blast.piece.y++; stDraw(); await step(70); }
      const p=blast.piece; stAbs(p.cells,p.x,p.y).forEach(([x,y],i)=>blast.grid[y][x]={pc:p.notes[i]}); blast.piece=null; sfx("lock"); stDraw(); await step(900);
      say("IT LIGHTS UP","THE ROW HOLDS C, E AND G: C MAJOR. SIDE BY SIDE LIKE THIS, IT SCORES DOUBLE. PLAY IT ON THE MINICHORD."); sfx("ready"); await step(3000);
      demoPlay([48,52,55,60]);
      // C major, as the caption says: C, E and G, and nothing else
      const F=ST_ROWS-1, r=stRowChord(blast.grid[F], 0, "");
      if(r) r.xs.forEach(x=>{ explode(blast.bx+(x+.5)*blast.cell, blast.by+(F+.5)*blast.cell, 8, ["#7FE9FF","#FFD35A","#FFFFFF"]); blast.grid[F][x]=null; });
      stGravity(); sfx("boom"); stDraw(); await step(1800);
      say("ROTATE","A ON THE HARP (OR UP) TURNS A PIECE; B DROPS IT. A WHOLE ROW OF ONE CHORD SCORES FIVE TIMES.");
      blast.piece={kind:"T", cells:ST_PIECES.T.map(q=>[...q]), notes:[7,11,2,5], x:4, y:0}; stDraw(); await step(900);
      for(let k=0;k<3;k++){ helpZone("A"); stRotate(); await step(600); }
      await step(1200);
      say("READY?","LATER LEVELS: OTHER KEYS, SEVENTHS ACROSS FOUR BLOCKS, AND DIMINISHED CHORDS."); sfx("level"); await step(2800);
      endStDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endStDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.piece=null; blast.grid=stEmpty(); blast.next=null; stDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.kind==="stack" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) stDemo(); }, 25000);
  cabRestart();
}
