// Chord Sweeper: a minefield where each mine is a key's home, and the notes around it give it away.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Sweeper ----------
// An ordinary minefield, eight by six, swept square by square with a cursor steered on the harp (A
// sweeps, B flags) or the arrow keys. Each mine is the home of a key, its tonic, and every square
// hides a note that says how close it is: right beside a mine, that key's 3rd or 5th (for G: B or D);
// two squares away, the key's other notes (A, C, E, F♯); further out, notes outside the key. So the
// notes swept say what the key is and how near its home lies. Put the cursor on a mine and play its
// key's home chord (G major for a G mine, E minor for an E minor one) to defuse it; sweep a mine, or
// play the wrong chord on it, and it goes off. Defuse every mine to clear the field.
const SW_W=8, SW_H=6;
const SW_MAJOR=["C","G","D","A","E","B","F♯","F","B♭","E♭","A♭","D♭"], SW_MINOR=["A","E","B","F♯","C♯","D","G","C","F"];
// The keys to find are shown beside the field: by name at the first levels, then only by their key
// signature on a staff, and major or minor (a signature fits a major key and its relative minor).
const SW_LEVELS=[
  {n:"One major key", mines:1, keys:[["C","G","D","F","A"],[]], named:true},
  {n:"One minor key", mines:1, keys:[[],["A","E","D","B","G"]], named:true},
  {n:"Two keys", mines:2, keys:[["C","G","D","F","A"],["A","E","D","B"]], named:true},
  {n:"Sharps and flats", mines:2, keys:[SW_MAJOR,SW_MINOR]},
  {n:"Three keys", mines:3, keys:[SW_MAJOR,SW_MINOR]},
];
const SW_STEPS=[[0,0],[1,2],[2,4],[3,5],[4,7],[5,9],[6,11]], SW_STEPS_MIN=[[0,0],[1,2],[2,3],[3,5],[4,7],[5,8],[6,10]];
const SW_FIFTHS={C:0,G:1,D:2,A:3,E:4,B:5,"F♯":6,"C♯":7,F:-1,"B♭":-2,"E♭":-3,"A♭":-4,"D♭":-5,"G♭":-6};
// a key: its home, its chord's 3rd and 5th, its other notes, and the five notes outside it, spelled
// the way the key leans (sharps for sharp keys, flats for flat ones)
function swKeyOf(tonic, minor){
  const steps=minor ? SW_STEPS_MIN : SW_STEPS, scale=steps.map(([l,s])=>above(tonic,l,s));
  const fifths=(SW_FIFTHS[tonic]??0)-(minor?3:0), pcs=new Set(scale.map(pcOfName));
  const outside=[...Array(12).keys()].filter(pc=>!pcs.has(pc)).map(pc=> (fifths<0 ? FLAT_NAMES : SHARP_NAMES)[pc]);
  return {tonic, minor, name:`${tonic} ${minor?"MINOR":"MAJOR"}`, chord:tonic+(minor?"m":""), near:[scale[2],scale[4]], warm:[scale[1],scale[3],scale[5],scale[6]], outside};
}
const swKey=(x,y)=>x+","+y;
function genSweeper(){
  return {kind:"sweeper", prompt:"Chord Sweeper", sub:"Each mine is a key's home. Swept squares show notes: the key's 3rd or 5th right next to it, its other notes two away, notes outside the key further out. Put the cursor on a mine and play its key's chord to defuse it.",
    answer:{type:"sweeper", name:"the home chord of the mine under the cursor"}, hint:"Next to a G mine you'll find B and D, G's 3rd and 5th.", context:0};
}
function startSweeper(){
  blast={kind:"sweeper", score:0, lives:3, level:0, fields:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), mines:[], clue:new Map(), open:new Set(), flags:new Set(), cur:[3,2], sweeps:0};
  swDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  swMenu();
  blast.raf=requestAnimationFrame(swTick);
}
function swDevice(){
  if(!blast || blast.kind!=="sweeper" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(hasSetting(30)) ensure(30,0); });
}
function buildSweeperField(box){
  const field=document.createElement("div"); field.className="field arcade sweeper"; field.setAttribute("aria-label","The minefield");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const grid=document.createElement("div"); grid.className="swgrid"; field.appendChild(grid);
  const side=document.createElement("div"); side.className="swside"; field.appendChild(side);
  box.append(field);
  if(blast && blast.kind==="sweeper"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.gridEl=grid; blast.sideEl=side; blast.fx=fxInit(field); blast.strip=kmStrip(field);
    setTimeout(()=>{ swLayout(); swDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
    // a click on a square moves the cursor there and sweeps it
    grid.addEventListener("click", e=>{ const c=e.target.closest(".swcell"); if(!c || !blast || blast.phase!=="play") return;
      blast.cur=[+c.dataset.x,+c.dataset.y]; swSweep(); });
  }
  swBar(); setTimeout(helperSync);
}
function swLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  const left=Math.max(170, W*.2), right=W-Math.max(170, W*.18), top=86, bottom=H-34;
  const s=Math.min((right-left)/SW_W, (bottom-top)/SW_H);
  blast.cs=s; blast.gx=left+((right-left)-SW_W*s)/2; blast.gy=top+((bottom-top)-SW_H*s)/2;
  blast.sideEl.style.cssText=`left:18px;top:${top}px;width:${left-36}px`;
}
const swXY=(x,y)=>[blast.gx+(x+.5)*blast.cs, blast.gy+(y+.5)*blast.cs];
const swMineAt=(x,y)=>blast.mines.find(m=>m.x===x && m.y===y);
const swDist=(x,y)=>Math.min(...blast.mines.map(m=>Math.max(Math.abs(m.x-x),Math.abs(m.y-y))));
function swDraw(){
  if(!blast || !blast.gridEl) return;
  const s=blast.cs, reveal=blast.phase==="reveal"; let h="";
  for(let y=0;y<SW_H;y++) for(let x=0;x<SW_W;x++){
    const k=swKey(x,y), open=blast.open.has(k), m=swMineAt(x,y), cur=blast.cur[0]===x && blast.cur[1]===y && blast.phase==="play";
    let inner="", cls="";
    if(m && m.defused){ inner=`<b class="home">${m.key.chord}</b>`; cls=" defused"; }
    else if(m && (m.boom || reveal)){ inner=SW_MINE+(reveal?`<small class="mk">${m.key.chord}</small>`:""); cls=m.boom?" boom":" shown"; }
    else if(open){ inner=`<b>${blast.clue.get(k)}</b>`; if(saved.beginner) cls=` d${Math.min(3,swDist(x,y))}`; }
    else if(blast.flags.has(k)) inner=SW_FLAG;
    h+=`<span class="swcell${open?" open":""}${cls}${cur?" cur":""}" data-x="${x}" data-y="${y}" style="left:${blast.gx+x*s}px;top:${blast.gy+y*s}px;width:${s}px;height:${s}px">${inner}</span>`;
  }
  blast.gridEl.innerHTML=h;
  swSide();
}
// a key signature on a small treble staff, for the side panel
function swSigSvg(f){
  const SPc=6, TOP=10, y=dn=>TOP+(38-dn)*SPc/2, n=Math.abs(f), pos=f>0?SIG_SHARPS:SIG_FLATS, g=GLYPH[f>0?"1":"-1"];
  let h=`<svg class="swsig" viewBox="0 0 ${40+Math.max(1,n)*7} 44" aria-label="${n} ${f>0?"sharp":"flat"}${n===1?"":"s"}">`;
  for(let k=0;k<5;k++) h+=`<line x1="2" x2="${38+Math.max(1,n)*7}" y1="${TOP+k*SPc}" y2="${TOP+k*SPc}"/>`;
  h+=`<text class="glyph" x="4" y="${y(32)}">${GLYPH.clef}</text>`;
  for(let i=0;i<n;i++) h+=`<text class="glyph" x="${26+i*7}" y="${y(pos[i])}">${g}</text>`;
  return h+"</svg>";
}
function swSide(){
  if(!blast.sideEl) return;
  const left=blast.mines.filter(m=>!m.defused).length, L=SW_LEVELS[blast.level||0];
  const done=k=>blast.mines.some(m=>m.key===k && m.defused);
  const find=(blast.keys||[]).map(k=>`<li class="${done(k)?"found":""}">${L.named ? `<b>${k.name}</b>` : `${swSigSvg((SW_FIFTHS[k.tonic]??0)-(k.minor?3:0))}<b>${k.minor?"MINOR":"MAJOR"}</b>`}</li>`).join("");
  blast.sideEl.innerHTML=`<p class="swfind">FIND ${L.named?"":"THESE KEYS"}</p><ul class="swkeys">${find}</ul><p>TO DEFUSE <b>${blast.mines.length?left:(blast.keys||[]).length}</b></p><p>SWEEPS <b>${blast.sweeps}</b></p>
    <p class="swhow">NEXT TO A MINE: ITS KEY'S 3RD OR 5TH. TWO AWAY: THE KEY'S OTHER NOTES. FURTHER: NOTES OUTSIDE IT.</p>
    <p class="swhow">ON A MINE, PLAY ITS KEY'S CHORD TO DEFUSE IT.</p>`;
}
function swBar(){
  if(!blast || blast.kind!=="sweeper" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · FIELD ${blast.fields+1}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
const SWMENU_G={key:"sweeper", title:"CHORD SWEEPER",
  rules:()=>`<p>EACH MINE IS A KEY'S HOME. SWEPT SQUARES SHOW NOTES: NEXT TO A MINE, ITS KEY'S 3RD OR 5TH; TWO AWAY, THE KEY'S OTHER NOTES; FURTHER OUT, NOTES OUTSIDE THE KEY.</p><p>STEER ON THE HARP OR THE ARROW KEYS. A SWEEPS, B FLAGS.</p><p>ON A MINE, PLAY ITS KEY'S CHORD TO DEFUSE IT. SWEEP A MINE, OR PLAY THE WRONG CHORD ON IT, AND IT GOES OFF.</p>`,
  stat:()=>`FIELDS ${blast.fields}`,
  rows:row=>{
    row("HARP", ["STANDARD STRIP","KEYMASTER GRID"], ()=>saved.harpLayout==="keymaster"?1:0, i=>{ saved.harpLayout = i ? "keymaster" : "strip"; save(); kmRestrip(); });
  },
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
// a new field: the mines are laid at the first sweep, so it's always safe
function swField(){
  Object.assign(blast,{mines:[], clue:new Map(), open:new Set(), flags:new Set(), cur:[3,2], sweeps:0, phase:"play", fieldAt:performance.now()});
  blast.keys=swPickKeys(SW_LEVELS[blast.level]);
  swLayout(); swBar(); swDraw();
}
// a field's keys: as many as it has mines, no two sharing a home note
function swPickKeys(L){
  const all=[...L.keys[0].map(t=>swKeyOf(t,false)), ...L.keys[1].map(t=>swKeyOf(t,true))], out=[];
  while(out.length<L.mines){ const k=rnd(all.filter(k=>!out.some(o=>pcOfName(o.tonic)===pcOfName(k.tonic)))); if(!k) break; out.push(k); }
  return out;
}
function swLay(sx,sy){
  const keys=[...(blast.keys||swPickKeys(SW_LEVELS[blast.level]))];
  for(let tries=0; tries<400 && keys.length; tries++){
    const x=Math.floor(Math.random()*SW_W), y=Math.floor(Math.random()*SW_H);
    if(Math.max(Math.abs(x-sx),Math.abs(y-sy))<2) continue;                       // not on or beside the first sweep
    if(blast.mines.some(m=>Math.max(Math.abs(m.x-x),Math.abs(m.y-y))<4)) continue;   // mines apart, their clues distinct
    blast.mines.push({x,y,key:keys.shift()});
  }
  // every other square's note, from the key of the nearest mine
  for(let y=0;y<SW_H;y++) for(let x=0;x<SW_W;x++){ if(swMineAt(x,y)) continue;
    const near=blast.mines.map(m=>({m, d:Math.max(Math.abs(m.x-x),Math.abs(m.y-y))})).sort((a,b)=>a.d-b.d)[0], k=near.m.key;
    blast.clue.set(swKey(x,y), rnd(near.d===1 ? k.near : near.d===2 ? k.warm : k.outside)); }
}
function swTick(now){
  if(!blast || blast.kind!=="sweeper") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(swTick);
}
function swMove(dx,dy){ blast.cur=[Math.max(0,Math.min(SW_W-1,blast.cur[0]+dx)), Math.max(0,Math.min(SW_H-1,blast.cur[1]+dy))]; sfx("press"); swDraw(); }
function swFlag(){ const k=swKey(...blast.cur); if(blast.open.has(k)) return; blast.flags.has(k) ? blast.flags.delete(k) : blast.flags.add(k); sfx("key"); swDraw(); }
// sweep the square under the cursor: a note, or a mine going off
function swSweep(){
  const [x,y]=blast.cur, k=swKey(x,y);
  if(blast.open.has(k) || blast.flags.has(k)) return;
  if(!blast.mines.length) swLay(x,y);
  const m=swMineAt(x,y);
  if(m && !m.defused) return swBoom(m, "SWEPT A MINE");
  if(m) return;
  blast.open.add(k); blast.sweeps++;
  const [px,py]=swXY(x,y), pts=mulPts(5*(blast.level+1)); blast.score+=pts; popup(px,py-20,`+${pts}`);
  sfx("shoot"); swBar(); swDraw();
}
// the harp: a d-pad, A sweeping and B flagging
function sweeperNote(pc){
  if(!blast || blast.kind!=="sweeper") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endSwDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const c=kmControl(pc);
  if(c==="A") return swSweep();
  if(c==="B") return swFlag();
  const D={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[c]; if(D) swMove(...D);
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="sweeper" || !blast || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const D={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.code];
  if(D){ e.preventDefault(); swMove(...D); }
  else if(e.code==="Space" || e.code==="Enter"){ e.preventDefault(); swSweep(); }
  else if(e.code==="KeyX"){ e.preventDefault(); swFlag(); }
});
// a chord: defusing the mine under the cursor, if it's that mine's key's home chord
function sweeperChord(voices){
  if(!blast || blast.kind!=="sweeper") return;
  if(blast.phase==="demo" && blast.demo){ endSwDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), name=chordName(pitches, devFifths()); if(!chordId(pitches)) return;
  const m=swMineAt(...blast.cur);
  if(!m || m.defused){ heard(name,false,"NO MINE UNDER THE CURSOR"); blast.fieldAt-=8000; sfx("miss"); return; }   // eight seconds lost
  if(!isChord(pitches, pcOfName(m.key.tonic), m.key.minor?"m":"")) return swBoom(m, `NOT ${m.key.chord}`, name);
  heard(name,true); m.defused=true; blast.flags.delete(swKey(m.x,m.y));
  const [px,py]=swXY(m.x,m.y), unswept=SW_W*SW_H-blast.open.size-blast.mines.length;
  const pts=mulPts((100+2*unswept)*(blast.level+1)); blast.score+=pts;
  explode(px,py,30,["#7FE08A","#FFD35A","#F1E8D2"]); sfx("bonus"); popup(px,py-24,`${m.key.name} DEFUSED +${pts}`,"#7FE08A");
  swBar(); swDraw();
  if(blast.mines.every(x=>x.defused)) swCleared();
}
function swBoom(m, why, label){
  const [px,py]=swXY(m.x,m.y); m.boom=true; blast.phase="reveal"; swDraw();
  heard(label||"SWEEP",false,why); explode(px,py,44,["#FF4B3E","#FF8A3D","#FFD35A","#F1E8D2"]); sfx("boom"); buzz(blast.field,true);
  blast.lives--; swBar(); banner("BOOM", `IT WAS ${m.key.name}${blast.lives>0?` · ${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`:""}`);
  gameLater(()=>{
    if(blast.lives<=0){ blast.phase="over"; blast.over=true; const best=Math.max(saved.best.sweeper||0, blast.score); saved.best.sweeper=best; save(); swMenu(true); return; }
    swField(); }, 3000);
}
function swCleared(){
  const secs=(performance.now()-blast.fieldAt)/1000, pts=mulPts(Math.max(0,Math.round(90-secs))*3*(blast.level+1));
  blast.score+=pts; blast.fields++; stats.streak=blast.fields; scoreboard(); swBar();
  blast.phase="reveal"; swDraw(); sfx("level"); banner("FIELD CLEAR!", pts?`TIME BONUS +${pts}`:"");
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
  blast.phase="demo"; blast.level=0; blast.mines=[]; blast.clue=new Map(); blast.open=new Set(); blast.flags=new Set(); blast.cur=[1,4]; blast.sweeps=0;
  // one G major mine; the clues laid as a game would lay them
  blast.keys=[swKeyOf("G",false)]; blast.mines=[]; swLay(1,4);
  const m=blast.mines[0]; swLayout(); swDraw();
  const at=(x,y)=>blast.clue.get(swKey(x,y));
  const walk=async(x,y)=>{ while(blast.cur[0]!==x || blast.cur[1]!==y){ blast.cur=[blast.cur[0]+Math.sign(x-blast.cur[0]), blast.cur[1]+Math.sign(y-blast.cur[1])]; blast.phase="play"; swDraw(); blast.phase="demo"; sfx("press"); await step(180); } };
  const sweep=async()=>{ blast.open.add(swKey(...blast.cur)); blast.phase="play"; swDraw(); blast.phase="demo"; sfx("shoot"); await step(700); };
  const cell=(d)=>{ for(let y=0;y<SW_H;y++) for(let x=0;x<SW_W;x++) if(!swMineAt(x,y) && Math.max(Math.abs(m.x-x),Math.abs(m.y-y))===d) return [x,y]; return null; };
  sfx("attract");
  (async()=>{
    try{
      say("CHORD SWEEPER","EACH MINE IS A KEY'S HOME. EVERY SQUARE HIDES A NOTE THAT SAYS HOW CLOSE IT IS."); await step(4200);
      const far=cell(3)||cell(4); if(far){ await walk(...far); await sweep(); say("FAR OUT", `${at(...far)}: A NOTE OUTSIDE THE KEY. THE MINE IS SOME WAY OFF.`); await step(3400); }
      const warm=cell(2); if(warm){ await walk(...warm); await sweep(); say("WARMER", `${at(...warm)}: ONE OF THE KEY'S OTHER NOTES. TWO SQUARES AWAY.`); await step(3400); }
      const hot=cell(1); if(hot){ await walk(...hot); await sweep(); say("HOT", `${at(...hot)}: THE KEY'S 3RD OR 5TH. THE MINE IS RIGHT BESIDE IT. B AND D POINT TO G.`); await step(3800); }
      await walk(m.x,m.y); say("DEFUSE IT","ON THE MINE, PLAY ITS KEY'S CHORD: G MAJOR."); await step(1800);
      demoPlay([55,59,62,67]); m.defused=true; blast.phase="play"; swDraw(); blast.phase="demo"; const [px,py]=swXY(m.x,m.y); explode(px,py,30,["#7FE08A","#FFD35A"]); sfx("bonus"); await step(2600);
      say("READY?","SWEEP A MINE, OR PLAY THE WRONG CHORD ON IT, AND IT GOES OFF."); sfx("level"); await step(2600);
      endSwDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endSwDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.mines=[]; blast.clue=new Map(); blast.open=new Set(); blast.flags=new Set(); swDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
