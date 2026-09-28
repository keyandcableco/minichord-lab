// Chord Sweeper: Minesweeper on the chord buttons, where neighbours are harmonic.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Sweeper ----------
// An airfield laid out as the chord chart: columns F to B in fifths, rows for major and minor (and 7
// from level 3). Mines lie under some chords. Playing a chord sweeps it: a mine goes off, otherwise
// it shows how many of its neighbours are mined. A chord's neighbours are not the squares beside it
// but the chords that share at least two notes with it: C major's are C minor, A minor and E minor
// (the parallel, the relative and the leading-tone move), so reading the numbers means knowing which
// chords are close. A sweep that finds no mined neighbours spreads to them, as Minesweeper's zeros
// do. Plucking the harp switches to flagging: the next chord plants or lifts a flag. Sweep every safe
// chord to clear the field; a mine costs a life.
const SW_COLS="FCGDAEB", SW_ROWS=[["","MAJ",[0,4,7]],["m","MIN",[0,3,7]],["7","7",[0,4,7,10]]];
const SW_NAT={F:5,C:0,G:7,D:2,A:9,E:4,B:11};
const SW_LEVELS=[
  {n:"Majors and minors", rows:2, mines:3, glow:true},
  {n:"More mines", rows:2, mines:4, glow:true},
  {n:"Sevenths join", rows:3, mines:5},
  {n:"A crowded field", rows:3, mines:6},
  {n:"Minefield", rows:3, mines:7},
];
const swKey=(c,r)=>c+","+r;
const swPcs=(c,r)=>SW_ROWS[r][2].map(x=>(SW_NAT[SW_COLS[c]]+x)%12);
// every chord's neighbours on this field: the chords sharing at least two notes with it
function swNeighbours(rows){
  const nb=new Map();
  for(let r=0;r<rows;r++) for(let c=0;c<7;c++){
    const a=swPcs(c,r), list=[];
    for(let r2=0;r2<rows;r2++) for(let c2=0;c2<7;c2++){ if(c2===c && r2===r) continue;
      const b=swPcs(c2,r2); if(a.filter(x=>b.includes(x)).length>=2) list.push([c2,r2]); }
    nb.set(swKey(c,r), list);
  }
  return nb;
}
function genSweeper(){
  return {kind:"sweeper", prompt:"Chord Sweeper", sub:"Minesweeper on the chord buttons. Play a chord to sweep it: it shows how many of its neighbours are mined, and a chord's neighbours are the chords sharing two notes with it. Pluck the harp to flag.",
    answer:{type:"sweeper", name:"a chord you think is safe"}, hint:"C major's neighbours are C minor, A minor and E minor.", context:0};
}
function startSweeper(){
  blast={kind:"sweeper", score:0, lives:3, level:0, fields:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), mines:new Set(), open:new Set(), flags:new Set(), flagMode:false, rows:2, nb:new Map()};
  swDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  swMenu();
  blast.raf=requestAnimationFrame(swTick);
}
function swDevice(){
  if(!blast || blast.kind!=="sweeper" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(hasSetting(35)) borrow(35, keyIndexOf(0)); });   // the field is the plain buttons in C
}
function buildSweeperField(box){
  const field=document.createElement("div"); field.className="field arcade sweeper"; field.setAttribute("aria-label","The airfield");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const grid=document.createElement("div"); grid.className="swgrid"; field.appendChild(grid);
  const side=document.createElement("div"); side.className="swside"; field.appendChild(side);
  box.append(field);
  if(blast && blast.kind==="sweeper"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.gridEl=grid; blast.sideEl=side; blast.fx=fxInit(field);
    setTimeout(()=>{ swLayout(); swDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  swBar(); setTimeout(helperSync);
}
function swLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  const right=W-Math.max(210, W*.24), left=70, top=90, bottom=H-40;
  const size=Math.min((right-left)/7, (bottom-top)/Math.max(2,blast.rows||2));
  blast.cs=size; blast.gx=left+((right-left)-7*size)/2; blast.gy=top+((bottom-top)-(blast.rows||2)*size)/2;
  blast.sideEl.style.cssText=`left:${right+24}px;top:${top}px;width:${W-right-36}px`;
}
const swXY=(c,r)=>[blast.gx+(c+.5)*blast.cs, blast.gy+(r+.5)*blast.cs];
function swCount(c,r){ return (blast.nb.get(swKey(c,r))||[]).filter(([c2,r2])=>blast.mines.has(swKey(c2,r2))).length; }
function swDraw(){
  if(!blast || !blast.gridEl) return;
  const s=blast.cs, rows=blast.rows||2; let h="";
  SW_COLS.split("").forEach((l,c)=>{ h+=`<span class="swcol" style="left:${blast.gx+(c+.5)*s}px;top:${blast.gy-16}px">${l}</span>`; });
  for(let r=0;r<rows;r++){
    h+=`<span class="swrow" style="left:${blast.gx-10}px;top:${blast.gy+(r+.5)*s}px">${SW_ROWS[r][1]}</span>`;
    for(let c=0;c<7;c++){
      const k=swKey(c,r), open=blast.open.has(k), mine=blast.mines.has(k), boom=blast.boom===k, show=blast.phase==="reveal" && mine;
      const n=open && !mine ? swCount(c,r) : 0, glow=blast.glow && blast.glow.has(k);
      let inner = open && !mine ? (n ? `<b class="n${n}">${n}</b>` : "") : (boom||show) ? SW_MINE : blast.flags.has(k) ? SW_FLAG : "";
      h+=`<span class="swcell${open?" open":""}${boom?" boom":""}${glow?" glow":""}" style="left:${blast.gx+c*s}px;top:${blast.gy+r*s}px;width:${s}px;height:${s}px"><small>${SW_COLS[c]}${SW_ROWS[r][0]}</small>${inner}</span>`;
    }
  }
  blast.gridEl.innerHTML=h;
  swSide();
}
function swSide(){
  if(!blast.sideEl) return;
  const safe=7*(blast.rows||2)-blast.mines.size, left=safe-[...blast.open].filter(k=>!blast.mines.has(k)).length;
  blast.sideEl.innerHTML=`<p>MINES <b>${blast.mines.size||SW_LEVELS[blast.level||0].mines}</b></p><p>FLAGS <b>${blast.flags.size}</b></p><p>TO SWEEP <b>${blast.mines.size?left:"—"}</b></p>
    <p class="${blast.flagMode?"swflagon blink":"swhow"}">${blast.flagMode?"FLAGGING: THE NEXT CHORD PLANTS OR LIFTS A FLAG":"PLUCK THE HARP TO FLAG"}</p>
    <p class="swhow">A CHORD'S NEIGHBOURS SHARE TWO NOTES WITH IT. C MAJOR'S ARE Cm, Am AND Em.</p>`;
}
function swBar(){
  if(!blast || blast.kind!=="sweeper" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · FIELD ${blast.fields+1}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const SWMENU_G={key:"sweeper", title:"CHORD SWEEPER",
  rules:()=>`<p>THE AIRFIELD IS THE CHORD CHART. PLAY A CHORD TO SWEEP IT.</p><p>IT SHOWS HOW MANY OF ITS NEIGHBOURS ARE MINED, AND A CHORD'S NEIGHBOURS SHARE TWO NOTES WITH IT: C MAJOR'S ARE Cm, Am AND Em.</p><p>PLUCK THE HARP TO FLAG. SWEEP EVERY SAFE CHORD; A MINE COSTS A LIFE.</p>`,
  stat:()=>`FIELDS ${blast.fields}`,
  rows:row=>{ row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); }); },
  levels:SW_LEVELS, begin:i=>beginSweeper(i), demo:()=>swDemo(), modNote:false};
function swMenu(over){ arcadeMenu(SWMENU_G, over); }
function beginSweeper(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, fields:0, phase:"play", over:false, modFor:null});
  saved.sweeperStart=level; save();
  stats.streak=0; scoreboard();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(swTick);
  swField();
  banner(`LEVEL ${level+1}`, SW_LEVELS[level].n.toUpperCase()); sfx("start");
}
// a new field: nothing swept, the mines laid only once the first chord is played, so it's safe
function swField(){
  const L=SW_LEVELS[blast.level];
  blast.rows=L.rows; blast.nb=swNeighbours(L.rows); blast.mines=new Set(); blast.open=new Set(); blast.flags=new Set();
  blast.flagMode=false; blast.boom=null; blast.glow=null; blast.phase="play"; blast.fieldAt=performance.now();
  swLayout(); swBar(); swDraw();
}
function swLay(firstKey){
  const L=SW_LEVELS[blast.level], all=[];
  for(let r=0;r<L.rows;r++) for(let c=0;c<7;c++){ const k=swKey(c,r); if(k!==firstKey) all.push(k); }
  for(let n=0;n<L.mines && all.length;n++) blast.mines.add(all.splice(Math.floor(Math.random()*all.length),1)[0]);
}
function swTick(now){
  if(!blast || blast.kind!=="sweeper") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(swTick);
}
// the harp: flagging on or off
function sweeperNote(pc){
  if(!blast || blast.kind!=="sweeper") return;
  if(blast.phase==="demo" && blast.demo){ endSwDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  blast.flagMode=!blast.flagMode; sfx("press"); swSide();
}
// a chord: sweep it, or flag it
function sweeperChord(voices){
  if(!blast || blast.kind!=="sweeper") return;
  if(blast.phase==="demo" && blast.demo){ endSwDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const f=devFifths(), root=spell(id.root, f), name=chordName(pitches, f), {li,acc}=parse(root);
  const row = ["","6"].includes(id.quality) ? 0 : ["m","m6"].includes(id.quality) ? 1 : id.quality==="7" ? 2 : -1;
  if(row<0 || row>=blast.rows){ heard(name,false,"NOT ON THE FIELD"); return; }
  if(acc!==keyAcc(li,f)){ heard(name,false,"OFF THE FIELD"); return; }       // the field is the plain buttons
  const col=SW_COLS.indexOf(root[0]), k=swKey(col,row);
  if(blast.flagMode){ blast.flagMode=false; if(blast.open.has(k)) return swSide();
    blast.flags.has(k) ? blast.flags.delete(k) : blast.flags.add(k); heard(name,true); sfx("key"); swDraw(); return; }
  if(blast.open.has(k)){ heard(name,false,"ALREADY SWEPT"); return; }
  if(blast.flags.has(k)){ heard(name,false,"FLAGGED: PLUCK THE HARP, THEN PLAY IT, TO LIFT THE FLAG"); return; }
  if(!blast.mines.size) swLay(k);                                            // the first sweep is always safe
  if(blast.mines.has(k)) return swBoom(k, name);
  heard(name,true); swOpen(col,row); sfx("shoot");
  const [x,y]=swXY(col,row), pts=mulPts(10*(blast.level+1)); blast.score+=pts; popup(x,y-18,`+${pts}`);
  // at the first levels, or with beginner mode, the chords it counted glow a moment
  if(SW_LEVELS[blast.level].glow || saved.beginner){ blast.glow=new Set((blast.nb.get(k)||[]).map(([c,r])=>swKey(c,r)));
    gameLater(()=>{ blast.glow=null; swDraw(); }, 1400); }
  swBar(); swDraw();
  const safe=7*blast.rows-blast.mines.size; if([...blast.open].filter(x=>!blast.mines.has(x)).length>=safe) swCleared();
}
// sweeping spreads from a chord with no mined neighbours to all its neighbours
function swOpen(c,r){
  const todo=[[c,r]];
  while(todo.length){ const [a,b]=todo.pop(), k=swKey(a,b); if(blast.open.has(k) || blast.mines.has(k)) continue;
    blast.open.add(k); blast.flags.delete(k);
    if(swCount(a,b)===0) for(const n of (blast.nb.get(k)||[])) todo.push(n); }
}
function swBoom(k, name){
  const [c,r]=k.split(",").map(Number), [x,y]=swXY(c,r);
  heard(name,false,"A MINE!"); blast.boom=k; blast.phase="reveal"; swDraw();
  explode(x,y,40,["#FF4B3E","#FF8A3D","#FFD35A","#F1E8D2"]); sfx("boom"); buzz(blast.field,true);
  blast.lives--; swBar(); banner("BOOM", blast.lives>0 ? `${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT` : "");
  gameLater(()=>{
    if(blast.lives<=0){ blast.phase="over"; blast.over=true; const best=Math.max(saved.best.sweeper||0, blast.score); saved.best.sweeper=best; save(); swMenu(true); return; }
    swField(); }, 2600);
}
function swCleared(){
  const secs=(performance.now()-blast.fieldAt)/1000, flagsRight=[...blast.flags].filter(k=>blast.mines.has(k)).length;
  const pts=mulPts((100+Math.max(0,Math.round(60-secs))*2+15*flagsRight)*(blast.level+1)); blast.score+=pts; blast.fields++;
  stats.streak=blast.fields; scoreboard(); swBar();
  blast.phase="reveal"; swDraw(); sfx("level"); banner("FIELD CLEAR!", `+${pts}`);
  gameLater(()=>{ if(blast.fields%2===0 && blast.level<SW_LEVELS.length-1){ blast.level++; banner(`LEVEL ${blast.level+1}`, SW_LEVELS[blast.level].n.toUpperCase()); }
    swField(); }, 2400);
}
const SW_MINE=`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#16132A" d="M5 4h6v8H5zM4 5h8v6H4z"/><path fill="#16132A" d="M7 1h2v3H7zM7 12h2v3H7zM1 7h3v2H1zM12 7h3v2h-3zM3 3h2v2H3zM11 3h2v2h-2zM3 11h2v2H3zM11 11h2v2h-2z"/><path fill="#F1E8D2" d="M6 6h2v2H6z"/></svg>`;
const SW_FLAG=`<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#F1E8D2" d="M5 2h1v11H5zM3 13h6v1H3z"/><path fill="#FF4B3E" d="M6 2h6v1H6zM6 3h5v1H6zM6 4h6v1H6zM6 5h4v1H6z"/></svg>`;

// ---------- Chord Sweeper's demo ----------
function swDemo(){
  if(!blast || blast.kind!=="sweeper") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {el, token, say, sleep, step}=demoShell(endSwDemo);
  blast.phase="demo"; blast.level=0; blast.rows=2; blast.nb=swNeighbours(2);
  blast.mines=new Set([swKey(1,1), swKey(4,0), swKey(6,1)]); blast.open=new Set(); blast.flags=new Set(); blast.boom=null; blast.glow=null;
  swLayout(); swDraw();
  const CH={C:[48,52,55], Am:[57,60,64], G:[55,59,62], F:[53,57,60]};
  sfx("attract");
  (async()=>{
    const sweep=async(c,r,notes)=>{ demoPlay(notes); swOpen(c,r); blast.glow=new Set((blast.nb.get(swKey(c,r))||[]).map(([a,b])=>swKey(a,b))); swDraw(); sfx("shoot"); await step(1600); blast.glow=null; swDraw(); };
    try{
      say("CHORD SWEEPER","THE AIRFIELD IS THE CHORD CHART, AND MINES LIE UNDER SOME CHORDS. PLAY ONE TO SWEEP IT."); await step(4200);
      say("NEIGHBOURS","C MAJOR'S NEIGHBOURS ARE THE CHORDS SHARING TWO NOTES WITH IT: Cm, Am AND Em. THEY GLOW."); await sweep(1,0,CH.C);
      say("","C SHOWS 1: ONE OF THOSE THREE HIDES A MINE."); await step(3000);
      say("","Am IS SAFE, AND ITS OWN NEIGHBOURS ARE C, A AND F."); await sweep(4,1,CH.Am);
      say("","F SHOWS 0, SO THE SWEEP SPREADS TO ALL OF ITS NEIGHBOURS."); await sweep(0,0,CH.F);
      say("FLAG IT","PLUCK THE HARP, THEN PLAY A CHORD, TO FLAG WHERE YOU THINK A MINE IS: Cm."); blast.flags.add(swKey(1,1)); swDraw(); await step(3200);
      say("READY?","SWEEP EVERY SAFE CHORD. A MINE COSTS A LIFE."); sfx("level"); await step(2600);
      endSwDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endSwDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.mines=new Set(); blast.open=new Set(); blast.flags=new Set(); blast.glow=null; swDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
