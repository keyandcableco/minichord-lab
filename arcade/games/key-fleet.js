// Key Fleet: battleship on the chord buttons, sunk by naming the key. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Key Fleet ----------
// Battleship on the chord buttons. The buttons' columns run in fifths, so a key's chords sit side by
// side: any three neighbours in the major row are a key's IV, I and V (F C G is C major), and three
// neighbours in the minor row a minor key's iv, i and v (Dm Am Em is A minor). The enemy's fleet is
// hidden as keys on that chart; the player fires by playing chords. A hit shows which keys it could
// belong to, a ship sinks when all its chords are hit, and its key is named. Later fleets add whole
// keys (the three majors and the three minors three columns along, a six-chord ship across two
// rows) and dominant pairs in the 7 row (G7 and D7: V and V of V in C). Torpedoes are limited: run
// out with ships afloat and it costs a life.
// Hitting a ship's chords only cripples it: it sinks when the player calls it. A pluck of the harp (or
// CALL IT on the screen, or Space) opens a call; chords played then fire nothing, and the moment they
// call a ship it sinks, and if they stop short of one they're judged a wrong call. A ship that's a key
// (IV I V, a whole key, a ii–V–I, dominants leading home) is called by naming its key: its home chord,
// its I, alone (C for F C G, Gm for Cm Gm Dm), so the player has to know which chord is home; playing
// back the chords on the chart calls nothing. (Not V7 then I: a minor key's V7 is the harmonic minor's,
// a chord its ship doesn't hold, and these are a beginner's levels.) A progression (the last levels) is
// called by playing it, in its order, the chords not yet found among it. A ship can be
// called before all its chords are hit, for a
// bonus: sunk by deduction, if the chart proves it (kfForced: every fleet the chart still allows has a
// ship in that key); a right call the chart didn't prove is a lucky one, and sinks for less. At the
// first levels a key can only be called once one of its chords is hit; from level 7 it can be called
// sight unseen, and a wrong call costs two torpedoes, so calling keys at random runs the player dry.
// The last fleets sail as progressions (I–vi–ii–V, the Andalusian cadence…), a key's chords as they're
// played together, landing scattered across the chart: their shape no longer gives the key away. Each
// ship there flies a colour, its hits are marked in it, and the fleet's listed with each ship's length,
// as Battleship's are: which hits go together is told, what they are isn't.
// The sea is a line of fifths. The plain buttons, F C G D A E B, are its middle; the modifier reaches
// past both ends, flattening B, E, A, D and G to the flat side and sharpening F, C and G to the sharp
// side. The first levels sail only the plain buttons; the later ones open the flat waters, the sharp
// waters, then the whole line, so every key's there, and C-sharp major and D-flat major (the same
// sound) are different keys in different places, reached by sharpening C or flattening D.
const KF_LINE=["G♭","D♭","A♭","E♭","B♭","F","C","G","D","A","E","B","F♯","C♯","G♯"];
const KF_SPAN={plain:[5,11], near:[4,12], flat:[0,11], sharp:[5,14], all:[0,14]};
// (near: the plain buttons and one column past each end, B-flat and F-sharp, so F major, B major and
// their relatives, keys that need one sharp or flat off the plain buttons, sail from level 3)
const KF_ROWS=["","m","7"];
// the columns in play now, left to right (cells are numbered within them)
let KF_COLS=KF_LINE.slice(5,12);
const kfSetSea=L=>{ const [lo,hi]=KF_SPAN[L.span||"plain"]; KF_COLS=KF_LINE.slice(lo,hi+1); };
// "key" is a major or a minor key, "any" a major, a minor or a dominant pair, whichever fits
// islands: rocks shown on the chart where no ship lies, free clues. counts: puzzle waters, the number
// of ship chords in each column and row shown at the edges, Battleship-solitaire style.
const KF_LEVELS=[
  {n:"Major keys", fleet:["major"], torps:7, hints:true},
  {n:"Major and minor", fleet:["major","minor"], torps:11, hints:true},
  {n:"Cadences", fleet:["cadence","key"], torps:10, islands:1, span:"near"},
  {n:"Three keys", fleet:["major","minor","key"], torps:12, islands:1, span:"near"},
  {n:"Minor keys and their V7", fleet:["minorV","key"], torps:11, islands:2, span:"near"},
  {n:"Puzzle waters", fleet:["major","minor","cadence"], torps:9, counts:true, islands:1, span:"near"},
  {n:"Whole keys", fleet:["whole","any"], torps:12, islands:1, span:"near"},
  {n:"Chains and puzzles", fleet:["chain","cadence","key"], torps:10, counts:true, islands:1, span:"near"},
  {n:"Flat progressions", fleet:["prog","key","key"], torps:12, islands:1, span:"flat", flags:true},
  {n:"Sharp progressions", fleet:["prog","prog","key"], torps:12, islands:1, span:"sharp", flags:true},
  {n:"Every key", fleet:["prog","prog","whole"], torps:15, islands:2, counts:true, span:"all", flags:true},
];
// flags: the ships' colours, handed out at random (so a colour never says which kind of ship it is),
// told apart by most colour-blind eyes too, and named in the fleet list
const KF_FLAGS=[{name:"GOLD", c:"#FFD35A"}, {name:"PINK", c:"#FF5AA0"}, {name:"VIOLET", c:"#9A8CFF"}];
// blind: from here on a key can be called before any of its chords is hit
KF_LEVELS.forEach((L,i)=>{ if(i>=6) L.blind=true; });
// Progressions: a key's chords as they're played together, each [columns from the tonic, row]. They
// land where they land on the chart, two in a row here, one in another there, and they share chords:
// Dm and Am are in I–vi–ii–V and the deceptive cadence alike, and in C, F and A minor.
const KF_PROGS={
  turnaround:{at:[[0,0],[3,1],[2,1],[1,2]], minor:false, name:k=>`I–vi–ii–V IN ${k}`},          // C Am Dm G7
  deceptive:{at:[[2,1],[1,2],[3,1]], minor:false, name:k=>`DECEPTIVE IN ${k}`},                 // Dm G7 Am: V7 to vi, not I
  secondary:{at:[[3,2],[2,1],[1,2],[0,0]], minor:false, name:k=>`SECONDARY V IN ${k}`},         // A7 Dm G7 C: ii's own V7 first
  plagal:{at:[[0,0],[-1,0],[-1,1]], minor:false, name:k=>`MINOR PLAGAL IN ${k}`},               // C F Fm: iv borrowed from the minor
  andalusian:{at:[[0,1],[-2,0],[-4,0],[1,2]], minor:true, name:k=>`ANDALUSIAN IN ${k} MINOR`},  // Am G F E7
};
// what each place in a level's fleet may be
const KF_KINDS={key:["major","minor"], any:["major","minor","dominant","cadence"], prog:Object.keys(KF_PROGS)};
const kfKinds=want=>KF_KINDS[want]||[want];
// every place a ship of a kind can lie: its cells, and the key it is
function kfShapes(kind){
  const out=[];
  if(kind==="major") for(let c=0;c<=KF_COLS.length-3;c++) out.push({kind, cells:[[c,0],[c+1,0],[c+2,0]], name:`${KF_COLS[c+1]} MAJOR`, detail:"IV · I · V", tonic:KF_COLS[c+1], minor:false});
  if(kind==="minor") for(let c=0;c<=KF_COLS.length-3;c++) out.push({kind, cells:[[c,1],[c+1,1],[c+2,1]], name:`${KF_COLS[c+1]} MINOR`, detail:"iv · i · v", tonic:KF_COLS[c+1], minor:true});
  if(kind==="whole") for(let c=0;c<=KF_COLS.length-6;c++) out.push({kind, cells:[[c,0],[c+1,0],[c+2,0],[c+3,1],[c+4,1],[c+5,1]], name:`ALL OF ${KF_COLS[c+1]} MAJOR`, detail:"IV I V · ii vi iii", tonic:KF_COLS[c+1], minor:false});
  if(kind==="dominant") for(let c=1;c<=KF_COLS.length-2;c++) out.push({kind, cells:[[c,2],[c+1,2]], name:`${KF_COLS[c+1]}7 → ${KF_COLS[c]}7 IN ${KF_COLS[c-1]}`, detail:"V OF V · V", tonic:KF_COLS[c-1], minor:false});
  // ii–V7–I: one chord in each row, zigzagging down the chart (Dm, G7, C for C major)
  if(kind==="cadence") for(let c=0;c<=KF_COLS.length-3;c++) out.push({kind, cells:[[c,0],[c+1,2],[c+2,1]], name:`ii–V–I IN ${KF_COLS[c]}`, detail:`${KF_COLS[c+2]}m · ${KF_COLS[c+1]}7 · ${KF_COLS[c]}`, tonic:KF_COLS[c], minor:false});
  // a minor key with its dominant: iv, i and v, and the V7 under the v (A minor: Dm Am Em, and E7)
  if(kind==="minorV") for(let c=0;c<=KF_COLS.length-3;c++) out.push({kind, cells:[[c,1],[c+1,1],[c+2,1],[c+2,2]], name:`${KF_COLS[c+1]} MINOR + V7`, detail:"iv · i · v · V7", tonic:KF_COLS[c+1], minor:true});
  // a chain of dominants, each the V of the next, leading home (A7 D7 G7 to C)
  if(kind==="chain") for(let c=1;c<=KF_COLS.length-3;c++) out.push({kind, cells:[[c,2],[c+1,2],[c+2,2]], name:`${KF_COLS[c+2]}7 → ${KF_COLS[c+1]}7 → ${KF_COLS[c]}7 IN ${KF_COLS[c-1]}`, detail:"V/V/V · V/V · V", tonic:KF_COLS[c-1], minor:false});
  const P=KF_PROGS[kind];
  if(P) for(let t=0;t<KF_COLS.length;t++){ const cells=P.at.map(([d,r])=>[t+d,r]);
    if(cells.every(([c])=>c>=0 && c<KF_COLS.length)) out.push({kind, cells, name:P.name(KF_COLS[t]), detail:cells.map(([c,r])=>KF_COLS[c]+KF_ROWS[r]).join(" · "), tonic:KF_COLS[t], minor:P.minor}); }
  return out;
}
const kfKey=(c,r)=>c+","+r;
const KF_ROCK=`<svg viewBox="0 0 16 10" shape-rendering="crispEdges" aria-hidden="true"><path fill="#6B6358" d="M2 6h12v4H2zM4 4h8v2H4zM6 2h3v2H6z"/><path fill="#9A9080" d="M5 4h3v2H5zM7 2h1v2H7z"/><path fill="#1E6A4A" d="M9 1h2v1H9zM10 0h1v1h-1z"/><path fill="#7FE9FF" d="M0 9h2v1H0zM14 9h2v1h-2z"/></svg>`;
// Ships in the same row never touch end to end: three hits in a row are always one ship, so G D A
// hit together is one key, never the end of one key and the start of another.
function kfFleet(L){
  for(let tries=0;tries<300;tries++){
    const used=new Set(), ships=[];
    let ok=true;
    for(const want of L.fleet){
      const kind=rnd(kfKinds(want));
      const clear=([c,r])=>!used.has(kfKey(c,r)) && (tries>250 || (!used.has(kfKey(c-1,r)) && !used.has(kfKey(c+1,r))));
      const homes=new Set(ships.map(sh=>pcOfName(sh.tonic)));
      const opts=kfShapes(kind).filter(sh=>sh.cells.every(clear) && !homes.has(pcOfName(sh.tonic)));
      if(!opts.length){ ok=false; break; }
      const sh=rnd(opts); sh.cells.forEach(([c,r])=>used.add(kfKey(c,r))); ships.push({...sh, hits:new Set(), sunk:false, misses:0});
    }
    if(ok){ blast.islands=new Set();
      blast.apart=ships.every(a=>ships.every(b=>a===b || !a.cells.some(([c,r])=>b.cells.some(([x,y])=>y===r && Math.abs(x-c)===1))));   // as a player may count on
      const free=[]; for(let r=0;r<3;r++) for(let c=0;c<KF_COLS.length;c++) if(!used.has(kfKey(c,r))) free.push(kfKey(c,r));
      for(let n=0;n<(L.islands||0) && free.length;n++) blast.islands.add(free.splice(Math.floor(Math.random()*free.length),1)[0]);
      return ships; }
  }
  blast.islands=new Set();
  return [];
}
// Every fleet the chart still allows, given what the player can see: the level's fleet less the ships
// sunk (each could have filled any place in it its kind fits), on no miss or rock, over every hit, the
// counts kept, no two in keys that sound alike, none touching end to end. each(ships) is called with
// each fleet's unsunk ships, and returning false stops the search. False if it ran too long to finish.
function kfFits(each){
  const L=KF_LEVELS[blast.level||0], sunk=blast.ships.filter(s=>s.sunk), W=KF_COLS.length;
  const used=new Set(), homes=new Set(sunk.map(s=>pcOfName(s.tonic))), col=new Array(W).fill(0), row=[0,0,0];
  const put=(cells,n)=>cells.forEach(([c,r])=>{ const k=kfKey(c,r); n>0 ? used.add(k) : used.delete(k); col[c]+=n; row[r]+=n; });
  sunk.forEach(s=>put(s.cells,1));
  const hits=[...blast.shots].filter(([,v])=>v==="hit").map(([k])=>k);
  const banned=new Set(blast.islands||[]); for(const [k,v] of blast.shots) if(v==="miss") banned.add(k);
  let want=null;
  if(L.counts){ want={col:new Array(W).fill(0), row:[0,0,0]}; blast.ships.forEach(s=>s.cells.forEach(([c,r])=>{ want.col[c]++; want.row[r]++; })); }
  const over=()=> want && (col.some((n,c)=>n>want.col[c]) || row.some((n,r)=>n>want.row[r]));
  const lefts=new Map();
  const assign=(i,slots)=>{ if(i===sunk.length){ lefts.set([...slots].sort().join(), slots); return; }
    slots.forEach((w,j)=>{ if(kfKinds(w).includes(sunk[i].kind)) assign(i+1, slots.filter((_,x)=>x!==j)); }); };
  assign(0, L.fleet);
  const shapes=new Map(), shapesOf=k=>shapes.get(k) || (shapes.set(k, kfShapes(k)), shapes.get(k));
  let budget=200000, stop=false; const placed=[];
  const go=slots=>{
    if(stop) return; if(--budget<0){ stop=true; return; }
    if(!slots.length){
      if(hits.every(k=>used.has(k)) && (!want || (col.every((n,c)=>n===want.col[c]) && row.every((n,r)=>n===want.row[r]))) && each(placed)===false) stop=true;
      return; }
    const [w,...rest]=slots;
    for(const kind of kfKinds(w)) for(const sh of shapesOf(kind)){
      if(stop) return;
      const pc=pcOfName(sh.tonic); if(homes.has(pc)) continue;
      if(!sh.cells.every(([c,r])=>{ const k=kfKey(c,r); return !banned.has(k) && !used.has(k) && (!blast.apart || (!used.has(kfKey(c-1,r)) && !used.has(kfKey(c+1,r)))); })) continue;
      put(sh.cells,1); homes.add(pc); placed.push(sh);
      if(!over()) go(rest);
      put(sh.cells,-1); homes.delete(pc); placed.pop();
    }
  };
  for(const slots of lefts.values()){ go(slots); if(stop) break; }
  return budget>=0;
}
// whether the chart proves a call: in every fleet it still allows, a ship of that key sails
function kfForced(match){
  let forced=true;
  const done=kfFits(ships=>{ if(!ships.some(match)){ forced=false; return false; } });
  return forced && done;
}
function genFleet(){
  return {kind:"fleet", prompt:"Key Fleet", sub:"Battleship on the chord buttons. The enemy's ships are keys hidden on the chart: three chords side by side in a row, a key's IV, I and V. Fire by playing chords, work out the keys from the hits, and sink the fleet before your torpedoes run out.",
    answer:{type:"fleet", name:"a chord where a ship might be"}, hint:"Three neighbours in the major row are a key's IV, I and V.", context:0};
}
function startFleet(){
  blast={kind:"fleet", score:0, lives:3, level:0, waves:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), ships:[], shots:new Map(), torps:0};
  kfDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  kfMenu();
  blast.raf=requestAnimationFrame(kfTick);
}
function kfDevice(){
  if(!blast || blast.kind!=="fleet" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(hasSetting(35)) borrow(35, keyIndexOf(0)); if(hasSetting(31)) borrow(31, mc.params[31]??0); });   // the chart is the plain buttons in C; the modifier's way is given back after   // the chart is the plain buttons in C
  // the chart is the plain buttons in C: a key set on the instrument (the key change combo) goes back
  // (a preset loaded puts it back with the game's other settings)
  mc.unasked=false;
  if(mc.presetLoaded) return;
  if(hasSetting(35) && mc.params[35]!=null && mc.params[35]!==keyIndexOf(0)) borrow(35, keyIndexOf(0));
  if(blast.phase==="play" && canWrite() && !pollT) poll(true);                  // keep listening for what changes on it
  if(blast.sideEl) kfSide();                                                    // the modifier's way, as a double tap left it
}
function buildFleetField(box){
  const field=document.createElement("div"); field.className="field arcade fleet"; field.setAttribute("aria-label","The chart of the sea");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const sea=document.createElement("div"); sea.className="kfsea"; field.appendChild(sea);
  const side=document.createElement("div"); side.className="kfside"; field.appendChild(side);
  side.addEventListener("click", e=>{ if(e.target.closest(".kfcallbtn")) kfCallKey(); });
  box.append(field);
  if(blast && blast.kind==="fleet"){
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.seaEl=sea; blast.sideEl=side; blast.fx=fxInit(field);
    setTimeout(()=>{ kfLayout(); kfDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  kfBar();
}
function kfLayout(){
  const f=blast.field, W=f.clientWidth, H=f.clientHeight;
  // a narrow field (a phone held upright): the chart across the top, what's afloat and the calls under it
  const narrow=W<560; blast.sideEl.classList.toggle("narrow", narrow);
  if(narrow){
    const left=50, right=W-30, top=70;
    // the chart's rows leave room under them for the torpedoes, what's afloat and CALL IT, however
    // short the field (a phone held sideways)
    const side=Math.max(120, blast.sideEl.offsetHeight);
    blast.cw=(right-left)/KF_COLS.length; blast.rh=Math.max(24, Math.min(80, (H-top)*.55/3, (H-top-40-side)/3)); blast.sx=left; blast.sy=top;
    blast.sideEl.style.cssText=`left:14px;right:14px;top:${top+3*blast.rh+40}px`;
    return;
  }
  const left=70, right=W-Math.max(230, W*.26), top=90, bottom=H-50;
  blast.cw=(right-left)/KF_COLS.length; blast.rh=Math.min(110,(bottom-top)/3); blast.sx=left; blast.sy=top+((bottom-top)-3*blast.rh)/2;
  blast.sideEl.style.cssText=`left:${right+44}px;top:${top}px;width:${W-right-56}px`;   // clear of the row counts
}
const kfXY=(c,r)=>[blast.sx+(c+.5)*blast.cw, blast.sy+(r+.5)*blast.rh];
function kfDraw(){
  if(!blast || !blast.seaEl) return;
  const cw=blast.cw, rh=blast.rh; let h="";
  KF_COLS.forEach((l,c)=>{ h+=`<span class="kfcol" style="left:${blast.sx+(c+.5)*cw}px;top:${blast.sy-18}px">${l}</span>`; });
  ["MAJ","MIN","7"].forEach((t,r)=>{ h+=`<span class="kfrow" style="left:${blast.sx-10}px;top:${blast.sy+(r+.5)*rh}px">${t}</span>`; });
  const L=KF_LEVELS[blast.level||0];
  if(L.counts && blast.ships.length){                                           // puzzle waters: how many ship chords per column and row
    const all=blast.ships.flatMap(s=>s.cells), found=k=>blast.shots.get(k)==="hit";
    for(let c=0;c<KF_COLS.length;c++){ const n=all.filter(([x])=>x===c).length, got=all.filter(([x,y])=>x===c && found(kfKey(x,y))).length;
      h+=`<span class="kfcount${got===n?" done":""}" style="left:${blast.sx+(c+.5)*cw}px;top:${blast.sy+3*rh+14}px">${n}</span>`; }
    for(let r=0;r<3;r++){ const n=all.filter(([,y])=>y===r).length, got=all.filter(([x,y])=>y===r && found(kfKey(x,y))).length;
      h+=`<span class="kfcount${got===n?" done":""}" style="left:${blast.sx+KF_COLS.length*cw+14}px;top:${blast.sy+(r+.5)*rh}px">${n}</span>`; }
  }
  for(let r=0;r<3;r++) for(let c=0;c<KF_COLS.length;c++){
    const shot=blast.shots.get(kfKey(c,r)), x=blast.sx+c*cw, y=blast.sy+r*rh;
    if(blast.islands && blast.islands.has(kfKey(c,r))){ h+=`<span class="kfcell island" style="left:${x}px;top:${y}px;width:${cw}px;height:${rh}px"><small>${KF_COLS[c]}${KF_ROWS[r]}</small>${KF_ROCK}</span>`; continue; }
    const flag=shot==="hit" && L.flags && blast.ships.find(s=>s.flag && s.cells.some(([sc,sr])=>sc===c && sr===r))?.flag;
    h+=`<span class="kfcell${shot?" "+shot:""}${flag?" flag":""}" style="left:${x}px;top:${y}px;width:${cw}px;height:${rh}px${flag?`;--ship:${flag.c}`:""}"><small>${KF_COLS[c]}${KF_ROWS[r]}</small>${shot==="hit"?"<b>✹</b>":shot==="miss"?"<i>·</i>":""}</span>`;
  }
  // sunk ships show themselves, named for their key
  for(const s of blast.ships){ if(!s.sunk && blast.phase!=="reveal") continue;
    const segs=kfRuns(s.cells);
    segs.forEach(({row,c0,n})=>{ const wpx=n*cw-8, hpx=Math.min(rh*.62, wpx*.5);
      h+=`<span class="kfship${s.sunk?"":" afloat"}" style="left:${blast.sx+c0*cw+4}px;top:${blast.sy+row*rh+(rh-hpx)/2}px;width:${wpx}px;height:${hpx}px">${kfShipSvg(n, s.sunk)}</span>`; });
    // its name, in the row where most of it lies (a whole key's under its major three, a ii–V–I's under
    // its I), along the foot of that row: no wider than the ship and half a cell either side, so it never
    // meets the next ship's, and a long name wraps upward over the hull rather than into the next row
    if(s.sunk){ const seg=segs.reduce((a,b)=>b.n>a.n?b:a);
      h+=`<span class="kfname" style="left:${blast.sx+(seg.c0+seg.n/2)*cw}px;top:${blast.sy+(seg.row+1)*rh-3}px;width:${(seg.n+1)*cw-4}px">${s.name}</span>`; }
  }
  blast.seaEl.innerHTML=h;
  blast.seaEl.classList.toggle("tight", cw<34);                                 // every key on a phone: too narrow to name each cell
  kfSide();
}
// a ship's chords as unbroken runs along each row: a progression's G and F, with C between them
// empty, are two boats, not one across C
function kfRuns(cells){
  const out=[];
  for(const row of [...new Set(cells.map(c=>c[1]))]){
    const cs=cells.filter(c=>c[1]===row).map(c=>c[0]).sort((a,b)=>a-b);
    cs.forEach((c,i)=>{ if(i && c===cs[i-1]+1) out[out.length-1].n++; else out.push({row, c0:c, n:1}); });
  }
  return out;
}
// A warship in pixels, as long as the chords it covers in a row: a hull pointed at the bow, a deck,
// a gun turret over each chord, a bridge and funnel amidships. One chord long, a patrol boat. Sunk,
// it's dark and burning; revealed at the end but never found, a grey outline.
function kfShipSvg(n, sunk){
  const L=n*20, H=12, mid=Math.floor(L/2);
  const hull=sunk?"#2E3038":"#5A6070", deck=sunk?"#44464E":"#8A90A0", gun=sunk?"#1C1D22":"#3A3D48", edge="#101116";
  let r=`<svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">`;
  // the hull: stern square, bow pointed, waterline dark
  r+=`<path fill="${hull}" stroke="${edge}" stroke-width="1" d="M1 6H${L-5}L${L-1} 8L${L-4} 11H3L1 9Z"/>`;
  r+=`<rect x="1" y="10" width="${L-5}" height="1" fill="${edge}"/>`;
  // the deck
  r+=`<rect x="3" y="5" width="${L-9}" height="1" fill="${deck}"/>`;
  if(n===1){ r+=`<rect x="${mid-3}" y="2" width="6" height="3" fill="${deck}"/><rect x="${mid-1}" y="0" width="1" height="2" fill="${deck}"/>`; }
  else{
    // a turret over each chord but the middle, where the bridge and funnel stand
    for(let i=0;i<n;i++){ const x=i*20+8; if(Math.abs(x+2-mid)<8) continue;
      r+=`<rect x="${x}" y="3" width="5" height="2" fill="${gun}"/><rect x="${i*20+10<mid?x-3:x+5}" y="3" width="3" height="1" fill="${gun}"/>`; }
    r+=`<rect x="${mid-4}" y="1" width="8" height="4" fill="${deck}"/><rect x="${mid-2}" y="2" width="4" height="1" fill="#7FE9FF"/>`;   // the bridge
    r+=`<rect x="${mid+5}" y="0" width="3" height="5" fill="${gun}"/>`;                                                              // the funnel
  }
  if(sunk) r+=`<rect class="kffire" x="${mid-2}" y="0" width="3" height="3" fill="#FF8A3D"/><rect class="kffire" x="${Math.max(2,mid-12)}" y="3" width="2" height="2" fill="#FFD35A"/>`;
  return r+"</svg>";
}
// the side panel: torpedoes, and what the last hit could mean
function kfSide(){
  if(!blast.sideEl) return;
  const L=KF_LEVELS[blast.level||0], afloat=blast.ships.filter(s=>!s.sunk).length;
  let h=`<div class="kftorps"><span>TORPEDOES</span><div>${"<i></i>".repeat(Math.max(0,blast.torps))}</div></div><p>SHIPS AFLOAT: ${afloat}</p>`;
  // the fleet, by colour: each ship's length, and how much of it is found
  if(L.flags) h+=`<ul class="kffleet">${KF_FLAGS.map(f=>blast.ships.find(s=>s.flag===f)).filter(Boolean).map(s=>
    `<li class="${s.sunk?"sunk":""}" style="--ship:${s.flag.c}"><i></i>${s.flag.name} · ${s.cells.length} CHORDS · ${s.sunk?"SUNK":s.hits.size+" HIT"}</li>`).join("")}</ul>`;
  if(blast.phase==="play"){ const cl=blast.calling;
    h+=`<button type="button" class="kfcallbtn${cl?" on":""}">${cl?"CALLING…":"CALL IT"}</button>`;
    if(cl) h+=`<p class="kfcalling">${cl.names.length ? cl.names.join(" → ") : "PLAY THE SHIP'S CHORDS"}</p>`; }
  if((L.hints || saved.beginner) && blast.lastHit && blast.phase==="play"){   // at the first levels, or with beginner mode on at any
    const [hc,hr]=blast.lastHit, misses=[...blast.shots].filter(([k,v])=>v==="miss").map(([k])=>k);
    const could=[...new Set(L.fleet.flatMap(kfKinds))].flatMap(kfShapes).filter(sh=>sh.cells.some(([c,r])=>c===hc&&r===hr) && sh.cells.every(([c,r])=>!misses.includes(kfKey(c,r))));
    if(could.length) h+=`<p class="kfcould">HIT ON ${KF_COLS[hc]}${KF_ROWS[hr]}. IT COULD BE PART OF:</p><ul>${[...new Set(could.map(s=>s.cells.map(([c,r])=>KF_COLS[c]+KF_ROWS[r]).join(" ")))].slice(0,5).map(n=>`<li>${n}</li>`).join("")}</ul>`;
  }
  const crippled=blast.ships.filter(s=>s.crippled && !s.sunk).length;
  if(crippled && blast.phase==="play") h+=`<p class="kfcall blink">${crippled>1?crippled+" SHIPS":"A SHIP"} CRIPPLED: CALL ${crippled>1?"THEM":"IT"}!</p>`;
  if(blast.islands && blast.islands.size) h+=`<p class="kfhow">ROCKS: NO SHIP THERE.</p>`;
  if(L.counts) h+=`<p class="kfhow">THE NUMBERS: HOW MANY SHIP CHORDS IN EACH COLUMN AND ROW.</p>`;
  if(kfWide()) h+=`<p class="kfmod">MODIFIER: <b>${kfSharp()?"♯ SHARPENS":"♭ FLATTENS"}</b><br><span>${kfHarpFlips()?"PLUCK THE HARP":"DOUBLE-TAP IT"} TO FLIP IT</span></p>`;
  h+=`<p class="kfhow">SINK A SHIP BY CALLING IT: ${kfHarpFlips() && kfWide() ? "CALL IT (OR SPACE)" : "PLUCK THE HARP (OR CALL IT, OR SPACE)"}, THEN NAME ITS KEY: PLAY ITS HOME CHORD, ITS I (C FOR F C G, GM FOR CM GM DM). ${L.fleet.includes("prog") ? "A PROGRESSION: PLAY IT, IN ITS ORDER." : ""}<br>${L.blind ? "CALL A SHIP BEFORE A HIT IF THE CHART PROVES IT, FOR A BIG BONUS. A GUESS SINKS FOR LESS; A WRONG CALL COSTS TWO TORPEDOES." : "ONLY A SHIP YOU'VE HIT CAN BE CALLED; A WRONG OR BLIND CALL COSTS A TORPEDO."}</p>`;
  blast.sideEl.innerHTML=h;
}
const kfWide=()=> !!KF_LEVELS[blast.level||0].span;
// The double tap flips the modifier in every game (room.js, modTap). The harp flips it too only where
// the double tap can't: turned off in the settings, or firmware without it. Both at once fought: a
// harp flip left the double tap's undo pointing the old way, so the next double tap did nothing.
const kfHarpFlips=()=> settings.modTap==="off" || !hasSetting(200);
function kfBar(){
  if(!blast || blast.kind!=="fleet" || !blast.hud) return;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${KF_LEVELS[blast.level].n.toUpperCase()}</span><span class="lives">${livesHtml()}</span>`;
}
const KFMENU_G={key:"fleet", title:"KEY FLEET",
  rules:()=>`<p>THE ENEMY'S SHIPS ARE KEYS, HIDDEN ON THE CHORD CHART. THREE CHORDS SIDE BY SIDE IN A ROW ARE A KEY'S IV, I AND V: F C G IS C MAJOR.</p><p>FIRE BY PLAYING CHORDS. HITS CRIPPLE A SHIP; TO SINK IT, CALL IT: PLUCK THE HARP (OR CALL IT, OR SPACE), THEN NAME ITS KEY: PLAY ITS HOME CHORD. C CALLS F C G, C MAJOR; AM CALLS DM AM EM, A MINOR.</p><p>ONCE YOU'VE HIT ONE OF A SHIP'S CHORDS, CALL IT EARLY: A BONUS IF THE CHART PROVES IT. A WRONG OR BLIND CALL COSTS A TORPEDO.</p><p>FROM LEVEL 7, CALL SHIPS SIGHT UNSEEN; THE LAST FLEETS SAIL AS PROGRESSIONS, CALLED BY PLAYING THEM IN THEIR ORDER.</p>`,
  stat:()=>`FLEETS SUNK ${blast.waves}`,
  levels:KF_LEVELS,
  begin:i=>beginFleet(i), demo:()=>kfDemo(), modNote:"title"};
function kfMenu(over){ arcadeMenu(KFMENU_G, over); }
function beginFleet(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, waves:0, phase:"play", over:false, modFor:null});
  saved.fleetStart=level; save();
  stats.streak=0; scoreboard(); kfLayout();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(kfTick);
  kfWave();
  banner(`LEVEL ${level+1}`, KF_LEVELS[level].n.toUpperCase());
  sfx("start");
}
// a new fleet: the ships hidden, the sea clear, the torpedoes loaded
function kfWave(){
  const L=KF_LEVELS[blast.level]; kfSetSea(L); kfLayout();
  blast.ships=kfFleet(L); blast.shots=new Map();
  if(L.flags){ const f=[...KF_FLAGS].sort(()=>Math.random()-.5); blast.ships.forEach((s,i)=>s.flag=f[i]); } blast.lastHit=null; blast.busy=false; blast.phase="play"; kfCallEnd();
  blast.torps=Math.max(5, Math.round(L.torps*(KF_TORPS[saved.kfTorps??0]??1)));   // fewer torpedoes, chosen on the title, score more
  kfBar(); kfDraw();
}
function kfTick(now){
  if(!blast || blast.kind!=="fleet") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(kfTick);
}
// a note from the harp: a call opened, or closed early (or, where the double tap can't, the modifier flipped)
function fleetNote(pc){
  if(!blast || blast.kind!=="fleet") return;
  if(blast.phase==="demo" && blast.demo){ endKfDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  if(kfWide() && kfHarpFlips()){ if(canWrite()){ borrow(31, kfSharp()?1:0); } sfx("press"); kfSide(); return; }   // the modifier, flipped
  kfCallKey();
}
// A chord's root, spelled as the modifier made it: a plain button's letter, or, off the plain buttons,
// sharpened or flattened as the modifier is set (address 31: 0 sharpens, 1 flattens)
const kfSharp=()=> (mc.params[31]??0)!==1;
function kfSpell(pc){ const n=SHARP_NAMES[mod(pc,12)]; return n.length===1 ? n : (kfSharp() ? SHARP_NAMES : FLAT_NAMES)[mod(pc,12)]; }
// A call: opened by the harp, CALL IT or Space, the chords played then are the call. The moment they
// call a ship it's judged; otherwise once they stop (KF_CALL_GAP after the last, time for a chord held a
// bar or so), or when the call's pressed again. Nothing played, it lapses.
const KF_CALL_GAP=2500, KF_CALL_WAIT=5000;
function kfCallKey(){
  if(!blast || blast.kind!=="fleet" || blast.phase!=="play") return;
  if(blast.calling){ kfJudge(); return; }
  blast.calling={chords:[], names:[], timer:gameLater(()=>kfJudge(), KF_CALL_WAIT)};
  sfx("press"); heard("CALL IT",true); kfSide();
}
function kfCallEnd(){ if(blast && blast.calling){ clearTimeout(blast.calling.timer); blast.calling=null; } }
// a chord, as the call reads it: its root's pitch class and its row (a 6 is its triad's)
function kfToken(pitches){
  const id=chordId(pitches); if(!id) return null;
  const q={"":"","6":"","m":"m","m6":"m","7":"7"}[id.quality];
  return q==null ? null : {t:id.root+q, name:kfSpell(id.root)+q};
}
const kfCellTok=([c,r])=>pcOfName(KF_COLS[c])+KF_ROWS[r];
// Whether chords played call a ship. A progression: its chords in their order (its cells are kept so),
// then its I if the player likes. Any other ship, a key: its home chord, alone.
function kfPlays(sh, toks){
  const tonic=pcOfName(sh.tonic)+(sh.minor?"m":""), n=toks.length, last=toks[n-1];
  if(!KF_PROGS[sh.kind]) return n===1 && last===tonic;
  const order=sh.cells.map(kfCellTok);
  const body=n===order.length+1 && last===tonic && order[order.length-1]!==tonic ? toks.slice(0,-1) : toks;
  return body.length===order.length && body.every((t,i)=>t===order[i]);
}
// the call judged: the ship it plays sinks (kfCall), or it's a wrong call
function kfJudge(){
  const cl=blast && blast.calling; if(!cl) return;
  kfCallEnd();
  if(!cl.chords.length || blast.phase!=="play"){ heard("CALL",false,"NOTHING PLAYED"); kfSide(); return; }
  if(cl.chords.some(t=>t==null)){ kfCall(()=>false, cl.names.join(" → ")); return; }
  kfCall(sh=>kfPlays(sh, cl.chords), cl.names.join(" → "));
}
// a chord from the buttons: part of a call, if one's open, or a torpedo at its place on the chart
function fleetChord(voices){
  if(!blast || blast.kind!=="fleet") return;
  const cl=blast.calling;
  if(cl && blast.phase==="play"){
    const tk=kfToken(voices.map(v=>v.pitch)); if(!tk && !chordId(voices.map(v=>v.pitch))) return;
    cl.chords.push(tk ? tk.t : null); cl.names.push(tk ? tk.name : "?"); heard(cl.names.join(" → "),true);
    clearTimeout(cl.timer);
    // it calls a ship: judged at once. A key's home chord waits, where progressions sail, in case it's
    // the first of one (Dm, a D minor ship's, starts the deceptive cadence in C)
    const progs=KF_LEVELS[blast.level||0].fleet.includes("prog");
    if(blast.ships.some(sh=>!sh.sunk && (KF_PROGS[sh.kind] || !progs) && kfPlays(sh, cl.chords))){ kfJudge(); return; }
    cl.timer=gameLater(()=>kfJudge(), KF_CALL_GAP); kfSide();
    return;
  }
  fleetShot(voices);
}
function fleetShot(voices){
  if(!blast || blast.kind!=="fleet") return;
  if(blast.phase==="demo" && blast.demo){ endKfDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.busy) return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const root=kfSpell(id.root), name=root+(id.quality==="6"?"":id.quality==="m6"?"m":id.quality);
  const row = ["","6"].includes(id.quality) ? 0 : ["m","m6"].includes(id.quality) ? 1 : id.quality==="7" ? 2 : -1;
  const col=KF_COLS.indexOf(root);
  if(row<0){ heard(name,false,"NOT ON THE CHART"); return; }
  const k=kfKey(col,row);
  if(col<0){ heard(name,false,"OFF THE CHART"); return; }                   // the sea doesn't reach it at this level
  if(blast.islands && blast.islands.has(k)){ heard(name,false,"ROCKS: NO SHIP THERE"); return; }
  if(blast.shots.has(k)){ heard(name,false,"ALREADY FIRED THERE"); return; }
  heard(name,true); kfFire(col,row);
}
function kfFire(col,row, quiet){
  blast.busy=true; blast.torps--; kfSide();
  const [x,y]=kfXY(col,row), P=PX;
  sfx("shoot");
  blast.fx.missiles.push({x0:x/P, y0:(blast.field.clientHeight-20)/P, x1:x/P, y1:y/P, t0:performance.now(), dur:320, hit:()=>kfLand(col,row,quiet)});
}
function kfLand(col,row,quiet){
  if(!blast || blast.kind!=="fleet") return;
  const k=kfKey(col,row), ship=blast.ships.find(s=>s.cells.some(([c,r])=>c===col&&r===row)), [x,y]=kfXY(col,row);
  if(ship){
    blast.shots.set(k,"hit"); ship.hits.add(k); blast.lastHit=[col,row];
    explode(x,y,26,["#FF4B3E","#FF8A3D","#FFD35A"]); sfx("boom");
    if(!quiet){ const pts=mulPts(10*(blast.level+1)); blast.score+=pts; popup(x,y-20,`HIT +${pts}`); }
    if(ship.hits.size===ship.cells.length && !ship.crippled){
      ship.crippled=true; blast.lastHit=null; sfx("clang");
      if(!quiet) banner("CRIPPLED!", "NOW CALL IT");
    }
  } else {
    blast.shots.set(k,"miss"); explode(x,y,12,["#7FE9FF","#F1E8D2"]); sfx("splash");
    blast.ships.filter(s=>!s.sunk && s.hits.size).forEach(s=>s.misses++);          // missing near a known ship spoils a perfect sink
  }
  blast.busy=false; kfBar(); kfDraw();
  if(blast.phase!=="play") return;
  if(blast.ships.every(s=>s.sunk)) return kfCleared();
  if(blast.torps<=0 && blast.ships.some(s=>!s.sunk && !s.crippled)) return kfOut();   // crippled ones can still be called
}
// Calling a key: the ship of that key sinks, whether or not all its chords were hit. How the call
// was made (the harp's tonic, a cadence, the key signature) decides what counts as a match.
function kfCall(match, what, quiet){
  if(!blast || blast.kind!=="fleet" || (blast.phase!=="play" && !quiet)) return false;
  const L=KF_LEVELS[blast.level||0], ship=blast.ships.filter(s=>!s.sunk && match(s)).sort((a,b)=>b.hits.size-a.hits.size)[0];
  // at the first levels a key can only be called on a ship you've made contact with, one of its chords
  // hit: calling keys blind, one after another, costs a torpedo each, the same as calling one that isn't
  // there. Later any key can be called, and a wrong call costs two.
  const blind = ship && !ship.hits.size && !quiet && !L.blind;
  if(!ship || blind){
    if(quiet) return false;
    const cost=L.blind ? 2 : 1;
    blast.torps=Math.max(0, blast.torps-cost); heard(what,false, blind ? "NO CONTACT: HIT ONE OF ITS CHORDS FIRST" : "NO SHIP IN THAT KEY");
    banner(blind ? "NO CONTACT" : "NO SHIP THERE", `${what}: ${cost>1?"TWO TORPEDOES":"A TORPEDO"} WASTED`); sfx("miss"); buzz(blast.field,true); kfBar(); kfDraw();
    if(blast.torps<=0 && !blast.ships.every(s=>s.sunk)) kfOut();
    return false;
  }
  // called before all its chords were hit: worked out, if the chart proves it, or a lucky guess
  const unhit=ship.cells.length-ship.hits.size, clean=ship.misses===0, proved=!unhit || quiet || kfForced(match), unseen=!ship.hits.size;
  ship.sunk=true; ship.cells.forEach(([c,r])=>{ blast.shots.set(kfKey(c,r),"hit"); ship.hits.add(kfKey(c,r)); });
  const [c,r]=ship.cells[Math.floor(ship.cells.length/2)], [x,y]=kfXY(c,r);
  explode(x,y,34,["#FF4B3E","#FFD35A","#F1E8D2"]); sfx("sunk"); banner(ship.name, ship.detail);
  if(!quiet){
    const pts=mulPts((proved ? 50*ship.cells.length*(clean?2:1) + 40*unhit : 50*ship.cells.length)*(blast.level+1)); blast.score+=pts;
    heard(what,true);
    const how = !unhit ? "SUNK" : !proved ? "LUCKY CALL" : unseen ? "SUNK SIGHT UNSEEN" : "SUNK BY DEDUCTION";
    setTimeout(()=>popup(x,y-44,`${how}${proved&&clean?" · PERFECT":""} +${pts}`,"#FFD35A"), 250);
  }
  blast.lastHit=null; kfBar(); kfDraw();
  if(blast.phase==="play" && blast.ships.every(s=>s.sunk)) kfCleared();
  return true;
}
const kfNameOf=(tonic,minor)=>`${tonic} ${minor?"MINOR":"MAJOR"}`;
function kfCleared(){
  kfCallEnd();
  const left=blast.torps, pts=mulPts(20*left*(blast.level+1)); blast.score+=pts; blast.waves++; stats.streak=blast.waves; scoreboard();
  banner("FLEET SUNK!", left ? `${left} TORPEDOES LEFT · +${pts}` : ""); sfx("level");
  blast.phase="pause";
  gameLater(()=>{ if(!blast || blast.kind!=="fleet") return;
    if(blast.waves%2===0 && blast.level<KF_LEVELS.length-1){ blast.level++; banner(`LEVEL ${blast.level+1}`, KF_LEVELS[blast.level].n.toUpperCase()); }
    kfWave(); }, 2200);
}
function kfOut(){
  kfCallEnd();
  blast.phase="reveal"; kfDraw(); sfx("miss"); buzz(blast.field,true);
  blast.lives--; kfBar(); banner("OUT OF TORPEDOES", blast.lives>0 ? `${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT` : "");
  gameLater(()=>{ if(!blast || blast.kind!=="fleet") return;
    if(blast.lives<=0){ blast.phase="over"; blast.over=true; const best=Math.max(saved.best.fleet||0, blast.score); saved.best.fleet=best; save(); kfMenu(true); return; }
    kfWave(); }, 2600);
}

// ---------- Key Fleet's demo ----------
function kfDemo(){
  if(!blast || blast.kind!=="fleet") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; blast.level=0; kfSetSea(KF_LEVELS[0]); kfLayout();
  blast.ships=[{kind:"major", cells:[[0,0],[1,0],[2,0]], name:"C MAJOR", detail:"IV · I · V", hits:new Set(), sunk:false, misses:0},
               {kind:"major", cells:[[4,0],[5,0],[6,0]], name:"E MAJOR", detail:"IV · I · V", hits:new Set(), sunk:false, misses:0}];
  blast.shots=new Map(); blast.torps=9; blast.lastHit=null; kfDraw();
  const {el, token, say, sleep, step}=demoShell(endKfDemo);
  const play=demoPlay;
  const CH={F:[53,57,60],C:[48,52,55],G:[55,59,62],D:[50,54,57],A:[57,61,64],E:[52,56,59],B:[59,63,66]};
  sfx("attract");
  (async()=>{
    const fire=async (l)=>{ play(CH[l]); kfFire(KF_COLS.indexOf(l),0,true); await step(900); };
    try{
      say("KEY FLEET","THE CHART IS THE CHORD BUTTONS. THEIR COLUMNS RUN IN FIFTHS, SO A KEY'S CHORDS SIT SIDE BY SIDE."); await step(4400);
      say("FIRE","PLAY A CHORD TO FIRE AT IT. G!"); await step(1400); await fire("G");
      blast.phase="play"; blast.lastHit=[2,0]; kfSide(); blast.phase="demo"; kfSideDemo();
      say("A HIT","G IS IN C MAJOR (F C G), G MAJOR (C G D) OR D MAJOR (G D A)."); await step(4200);
      say("","TRY D. A MISS, SO IT'S NOT G OR D MAJOR: IT'S C MAJOR."); await fire("D"); await step(2400);
      say("CALL IT","ONCE A SHIP'S BEEN HIT, CALL ITS KEY: NO NEED TO HIT F AND C. PLUCK THE HARP, THEN PLAY ITS HOME CHORD: C."); await step(2600);
      play([60]); await step(600); play(CH.C); kfCall(s=>s.tonic==="C",null,true); await step(2800);
      say("THE OTHER","A E B: HOME IS ALWAYS THE MIDDLE ONE. PLUCK, THEN E CALLS E MAJOR."); await step(2600);
      play([64]); await step(600); play(CH.E); kfCall(s=>s.tonic==="E",null,true); await step(2800);
      say("READY?","SINK THE FLEET BEFORE THE TORPEDOES RUN OUT. LATER THE SEA WIDENS: B♭ AND F♯, THEN EVERY KEY."); sfx("level"); await step(2600);
      endKfDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
// the demo shows the "could be" list too
function kfSideDemo(){ const ph=blast.phase; blast.phase="play"; kfSide(); blast.phase=ph; }
function endKfDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.ships=[]; blast.shots=new Map(); blast.lastHit=null; kfDraw();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
// Space: CALL IT, as the harp
document.addEventListener("keydown", e=>{
  if(e.code!=="Space" || e.repeat || !blast || blast.kind!=="fleet" || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName||"")) return;
  e.preventDefault(); kfCallKey();
});
