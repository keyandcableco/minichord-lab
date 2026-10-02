// Fux: species counterpoint, after Fux's Gradus ad Parnassum (1725). Parallel Patrol, with its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js. The rules and the solver are
// core/counterpoint.js, put on window as CP by boot.js.
"use strict";

// ---------- Parallel Patrol ----------
// A finished two-voice line scrolls in from the right over twelve cannons, one under each harp string,
// lowest on the left (Harp Command's): the cantus firmus in blue, the counterpoint in gold, each bar
// heard as it comes on. Some bars break Fux's rules. Pluck the string under a wrong bar to shoot it
// before it scrolls off the left; the rule it broke is named, and Aloysius, Fux's master, has a word.
// A shot at a clean bar spends a shell (a line has two more than its errors); an error that gets away
// costs a life. Three lines a level.
//
// Every line is made fresh: the solver (core/counterpoint.js) writes a correct counterpoint to one of
// Fux's cantus firmi, then errors of the level's kinds are put in, one bar at a time, each change
// kept only if the checker finds exactly the new error and nothing outside the level's rules. So the
// targets are whatever the checker says, nothing hand-planted, and a wrong bar is wrong for a reason
// the player can be told.
//
// The levels climb as Fux does: parallel fifths and octaves, dissonances, hidden fifths and octaves,
// the line itself (leaps, crossing), the cadence, the counterpoint below the cantus, then the second
// species: passing tones, fifths on the downbeats, everything. The interval of each bar can be shown
// as a number over it, or hidden for half as much again.
//
// The harp is played as notes, chromatic from C (asHarp), so a string is a cannon wherever the harp's
// scale would put it; a click or a tap on the field fires the nearest cannon too.

// ---------- the levels ----------
const FU_SP1=["parallel5","parallel8","dissonance","direct","antiparallel","unison","melodic","unrecovered","crossing","overlap","start","end","cadence"];
const FU_SP2=FU_SP1.concat(["passing","downbeats","repeat"]);
// rules: what a wrong bar can be at this level (nothing else is put in); errors: how many a line
const FU_LEVELS=[
  {n:"Parallel fifths and octaves", species:1, rules:["parallel5","parallel8"], errors:2},
  {n:"Dissonances", species:1, rules:["parallel5","parallel8","dissonance"], errors:3},
  {n:"Hidden fifths and octaves", species:1, rules:["parallel5","parallel8","dissonance","direct","antiparallel","unison"], errors:3},
  {n:"The line itself", species:1, rules:["melodic","unrecovered","crossing","overlap","unison"], errors:3},
  {n:"The cadence, and all of it", species:1, rules:FU_SP1, errors:3},
  {n:"Counterpoint below", species:1, rules:FU_SP1, errors:3, below:true},
  {n:"Two against one: passing", species:2, rules:["dissonance","passing"], errors:2},
  {n:"Two against one: downbeats", species:2, rules:["dissonance","passing","parallel5","parallel8","downbeats","repeat"], errors:3},
  {n:"Two against one: all of it", species:2, rules:FU_SP2, errors:4, both:true},
];
const FU_LINES=3;                                                   // lines a level
const FU_RUSH=10;                                                   // how much faster a line goes once all its faults are found
const fuLevel=(n=blast.level)=>FU_LEVELS[Math.min(n, FU_LEVELS.length-1)];
// the intervals over the bars: numbers, or hidden (kit.js scores it more)
const fuShowIv=()=> blast && blast.kind==="fux" && blast.phase==="play" && blast.ivAt!=null ? blast.ivAt===0 : !saved.fuIv;

// ---------- what a wrong bar is called, and what Aloysius says ----------
const FU_NAMES={parallel5:"PARALLEL 5THS", parallel8:"PARALLEL OCTAVES", dissonance:"DISSONANCE", passing:"NOT PASSING",
  direct:"HIDDEN {I}", antiparallel:"{I}S BY CONTRARY MOTION", downbeats:"{I}S ON THE DOWNBEATS", unison:"UNISON", melodic:"BAD LEAP",
  unrecovered:"LEAP NOT TURNED BACK", crossing:"VOICES CROSS", overlap:"OVERLAP", chromatic:"OUTSIDE THE MODE", start:"WRONG START",
  end:"WRONG ENDING", cadence:"NO CADENCE", repeat:"REPEATED NOTE"};
// Aloysius: caught, when a wrong bar is shot; missed, when one gets away. In his manner, not Fux's words.
const FU_SAYS={
  parallel5:  ["Two fifths running. The voices have stopped being two.", "Fifths after fifths: you heard them hollow out."],
  parallel8:  ["Octaves in a row. One voice, doubled, is not counterpoint.", "Two octaves, and the second voice vanished into the first."],
  dissonance: ["A dissonance where a consonance belongs. Good ears.", "That clashed, and you let it pass?"],
  passing:    ["A dissonance must pass by step, in and out. That one jumped.", "It came by leap. A passing note passes."],
  direct:     ["Into a perfect consonance by similar motion: hidden, but not from you.", "Both voices climbed into that perfect interval together. Contrary motion, please."],
  antiparallel:["Contrary motion does not excuse two fifths.", "Fifths in opposite directions are still fifths."],
  downbeats:  ["Fifths on the strong beats. The upbeat between does not hide them.", "The downbeats made fifths. Listen to the strong beats alone."],
  unison:     ["A unison in the middle: the voices met and became one.", "Unison belongs at the beginning and the end only."],
  melodic:    ["No singer wants that leap.", "An augmented leap, or too wide. Sing it, and you'll know."],
  unrecovered:["A leap must turn back, by step if it can.", "After a leap, the line must go the other way."],
  crossing:   ["The voices crossed. Each keeps its own place.", "Your counterpoint went under the cantus."],
  overlap:    ["A voice moved past where the other just was.", "The voices overlapped. Keep them apart."],
  start:      ["Begin on a perfect consonance.", "The beginning must be perfect: unison, fifth or octave."],
  end:        ["End on the unison or the octave.", "That ending doesn't come home."],
  cadence:    ["The cadence: a sixth to the octave, a third to the unison, by step.", "No cadence. Where was the leading tone?"],
  repeat:     ["Two notes against one, and you repeat one? Move.", "A repeated note. Two halves should be two notes."],
  chromatic:  ["A note outside the mode.", "That note isn't in the mode."],
};
const FU_WRONG=["That bar was correct. Look before you shoot.", "Nothing wrong there. Be sure first.", "A good bar, wasted shot."];
const FU_CLEAN=["Bene. Every fault found, and no shot wasted.", "Clean. Fux would nod.", "Every one. Good."];
const FU_DONE=["Some got past you. Again, more slowly in your head.", "Listen to each bar as it arrives."];
// a finding's name, with the fifth or octave it's about where that matters
function fuName(f, bar){
  const I = bar ? CP.interval(blast.line.mode, bar.c, f.beat && bar.p.length>1 ? bar.p[f.beat] : bar.p[0]) : null;
  return (FU_NAMES[f.rule]||f.rule.toUpperCase()).replace("{I}", I && I.simple===5 ? "5TH" : "OCTAVE");
}

// ---------- the lines ----------
// a correct counterpoint for a cantus, species and voice: solved once and kept (a few of each), since
// the second species can take a second or two to solve
const fuSolved={};
function fuClean(ci, species, above){
  const key=`${ci}:${species}:${above}`, list=fuSolved[key]||(fuSolved[key]=[]);
  if(list.length>=3 || (list.length && Math.random()<.5)) return rnd(list);
  const c=CP.CANTUS[ci], mode=CP.MODES[c.mode];
  const cp=CP.solve({cantus:c.cantus, mode, species, above, pitches:CP.harpWindow(mode, c.cantus, above), seed:1+Math.floor(Math.random()*1e6), budget:20000});
  if(cp) list.push(cp);
  return cp || (list.length ? rnd(list) : null);
}
const fuCopy=cp=>cp.map(b=>Array.isArray(b) ? b.slice() : b);
// A line with errors in it: from a correct one, a bar changed at a time, each change kept only if the
// checker finds the error wanted there, one more wrong bar than before (the old ones still wrong), and
// nothing outside the level's rules. ci and seedless choices come from the caller (the demo fixes them).
function fuMakeLine(L, {ci=null, above=null, errors=L.errors, want=null}={}){
  for(let tries=0; tries<12; tries++){
    const i = ci ?? fuDeal("cantus", CP.CANTUS.map((_,k)=>k));
    const up = above ?? (L.below ? false : L.both ? Math.random()<.5 : true);
    const c=CP.CANTUS[i], mode=CP.MODES[c.mode], clean=fuClean(i, L.species, up); if(!clean) continue;
    const opts={cantus:c.cantus, mode, species:L.species, above:up};
    const bad=cp=>CP.check({...opts, cp}).filter(CP.forbidden);
    const window=CP.harpWindow(mode, c.cantus, up), wide=CP.modeWindow(mode, window[0]-4, 16);
    let cp=fuCopy(clean), have=new Set();
    for(let a=0; a<240 && have.size<errors; a++){
      const rule=want || rnd(L.rules), k=Math.floor(Math.random()*c.cantus.length);
      if([...have].some(b=>Math.abs(b-k)<2)) continue;                       // apart, so each wrong bar is plainly its own
      const j=Array.isArray(cp[k]) ? Math.floor(Math.random()*cp[k].length) : 0;
      for(const p of shuffle(wide)){
        const t=fuCopy(cp); if(Array.isArray(t[k])) t[k][j]=p; else t[k]=p;
        const fs=bad(t);
        if(!fs.some(f=>f.rule===rule) || !fs.every(f=>L.rules.includes(f.rule))) continue;
        const bars=new Set(fs.map(f=>f.bar));
        if(bars.size!==have.size+1 || ![...have].every(b=>bars.has(b))) continue;
        cp=t; have=bars; break;
      }
    }
    if(!have.size) continue;
    const findings=CP.check({...opts, cp});
    return {ci:i, cantus:c.cantus, mode, modeName:c.mode, above:up, species:L.species, cp, findings};
  }
  return null;
}
// cantus firmi dealt from a shuffled bag, each used once before any comes round again
function fuDeal(name, items){
  const bags=blast.fuBags||(blast.fuBags={});
  let b=bags[name]; if(!b || !b.left.length) b=bags[name]={left:shuffle(items)};
  return b.left.pop();
}

// ---------- the game ----------
function genFux(){
  return {kind:"fux", prompt:"Fux", sub:"Parallel Patrol: a two-voice line scrolls over twelve cannons, one under each harp string. Pluck the string under a bar that breaks Fux's rules to shoot it before it gets away.",
    answer:{type:"fux", get name(){ const b=fuNextBad(); return b ? fuName(b.bad[0], b) : "the wrong bar"; }},
    get hint(){ const b=fuNextBad(); return b ? `Bar ${b.i+1}: ${fuName(b.bad[0], b).toLowerCase()}.` : "Listen to each bar as it comes on."; },
    context:0};
}
const fuNextBad=()=> blast && blast.kind==="fux" && blast.bars ? blast.bars.filter(b=>b.bad.length && !b.shot && !b.gone).sort((a,b)=>a.x-b.x)[0] || null : null;
function startFux(){
  blast={kind:"fux", score:0, lives:3, level:0, lineNo:0, found:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null,
    last:performance.now(), bars:[], line:null, cannons:null, scroll:0};
  fuDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  fuMenu();
  blast.raf=requestAnimationFrame(fuTick);
}
// The minichord's side: the harp as notes, chromatic from C, so each string is its cannon.
function fuDevice(){
  if(!blast || blast.kind!=="fux" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); });
}
function buildFuxField(box){
  const field=document.createElement("div"); field.className="field arcade fux"; field.setAttribute("aria-label","A two-voice line scrolling over twelve cannons");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  field.insertAdjacentHTML("beforeend", `<div class="fuladder"></div><div class="fusign" hidden></div><div class="fusay" hidden><b>ALOYSIUS</b><span></span></div>`);
  box.append(field);
  if(blast && blast.kind==="fux"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), ladderEl:field.querySelector(".fuladder"), signEl:field.querySelector(".fusign"), sayEl:field.querySelector(".fusay")});
    // a click or a tap on the field fires the cannon nearest it
    field.addEventListener("pointerdown", e=>{
      if(!blast || blast.kind!=="fux" || blast.phase!=="play" || e.target.closest(".overlay,button,.hud")) return;
      const r=field.getBoundingClientRect(), x=e.clientX-r.left;
      const i=blast.cannons ? blast.cannons.reduce((m,c,k)=>Math.abs(c.x-x)<Math.abs(blast.cannons[m].x-x) ? k : m, 0) : -1;
      if(i>=0) fuShoot(i);
    });
    setTimeout(()=>{ fuLayout(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  fuBar(); setTimeout(helperSync);
}
// where things are: the cannons along the foot, a bar's width the space between two of them, and the
// pitch ladder the notes sit on
function fuLayout(){
  if(!blast || blast.kind!=="fux" || !blast.field) return;
  const W=fieldW(), H=fieldH(), m=Math.max(26, W*.05);
  blast.cannons=[...Array(12)].map((_,i)=>({x:m+(W-2*m)*i/11, fired:(blast.cannons&&blast.cannons[i])?blast.cannons[i].fired:0}));
  blast.L={W, H, m, barW:(W-2*m)/11, top:96, bottom:H-66};
  fuLadder();
  if(blast.line) blast.bars.forEach(fuBarPlace);
}
function fuBar(){
  if(!blast || blast.kind!=="fux" || !blast.hud) return;
  const L=fuLevel(), ln=blast.line;
  const shells = ln ? `<span class="fushells">${[...Array(ln.shellsMax)].map((_,i)=>`<i class="${i<ln.shells?"":"spent"}"></i>`).join("")}</span>` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${L.n.toUpperCase()}${blast.lineNo?` · LINE ${blast.lineNo} OF ${FU_LINES}`:""} ${shells}</span><span class="lives">${livesHtml()}</span>`;
}
// Aloysius speaks: a line in his box for a few seconds
function fuSay(text, ms=3600){
  const el=blast && blast.sayEl; if(!el) return;
  el.hidden=false; el.querySelector("span").textContent=text;
  el.classList.remove("new"); void el.offsetWidth; el.classList.add("new");
  const said=blast.said=(blast.said||0)+1;
  gameLater(()=>{ if(blast.said===said) el.hidden=true; }, ms);      // the run's own timer; a newer line keeps its time
}
function fuSign(){
  const el=blast && blast.signEl; if(!el) return;
  const ln=blast.line; el.hidden=!ln; if(!ln) return;
  const final=CP.MODES[ln.modeName].final;
  el.innerHTML=`${SHARP_NAMES[final]} <b>${ln.modeName.toUpperCase()}</b> · ${ln.species===2?"2ND":"1ST"} SPECIES · COUNTERPOINT <b>${ln.above?"ABOVE":"BELOW"}</b>`;
}

const FUMENU_G={key:"fux", title:"FUX",
  rules:()=>`<p>PARALLEL PATROL. A LINE IN TWO VOICES SCROLLS IN FROM THE RIGHT: THE CANTUS FIRMUS IN BLUE, THE COUNTERPOINT IN GOLD.</p><p>SOME BARS BREAK FUX'S RULES. PLUCK THE STRING UNDER A WRONG BAR TO SHOOT IT BEFORE IT SCROLLS AWAY: TWELVE STRINGS, TWELVE CANNONS, LOWEST ON THE LEFT.</p><p>A SHOT AT A GOOD BAR SPENDS A SHELL. A WRONG BAR THAT GETS PAST COSTS A LIFE.</p><p>LISTEN AS EACH BAR COMES ON. FIFTHS AND OCTAVES IN A ROW SOUND HOLLOW.</p>`,
  stat:()=>`FAULTS FOUND ${blast.found} · LEVEL ${blast.level+1}`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("INTERVALS", ["NUMBERS","HIDDEN ×1.5"], ()=>saved.fuIv?1:0, i=>{ saved.fuIv=i; save(); });
  },
  levels:FU_LEVELS,
  begin:i=>beginFux(i), demo:()=>fuDemo(), modNote:false};
function fuMenu(over){ arcadeMenu(FUMENU_G, over); }
function beginFux(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  fuClear();
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, lineNo:0, found:0, phase:"play", over:false, line:null, fuBags:null, ivAt:saved.fuIv?1:0});
  saved.fuxStart=level; save();
  stats.streak=0; scoreboard(); fuLayout(); fuBar();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(fuTick);
  banner(`LEVEL ${level+1}`, `${fuLevel().n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start");
  if(!settings.sounds) gameLater(()=>banner("TURN THE SOUND ON", "THE FIFTHS ARE EASIER HEARD"), 2400);
  gameLater(()=>fuLineStart(), 2000);
}

// ---------- a line ----------
// seconds a bar takes to cross from one cannon to the next: slower with the speed setting, a little
// quicker each level
const fuSecs=()=> 1.15*speedMul()*Math.pow(.97, blast.level);
function fuLineStart(){
  if(!blast || blast.phase!=="play") return;
  const L=fuLevel(), ln=fuMakeLine(L);
  if(!ln){ banner("ALOYSIUS IS THINKING", "ONE MOMENT"); gameLater(()=>fuLineStart(), 1500); return; }
  blast.lineNo++;
  fuLineShow(ln);
  const wrong=blast.bars.filter(b=>b.bad.length).length;
  ln.shellsMax=ln.shells=wrong+2; ln.misses=0; ln.caught=0; ln.wrong=wrong;
  fuBar();
  banner(`LINE ${blast.lineNo}`, `${wrong} WRONG BAR${wrong>1?"S":""} · ${ln.modeName.toUpperCase()}, COUNTERPOINT ${ln.above?"ABOVE":"BELOW"}`);
}
// a line onto the field: its bars, off to the right, and the ladder for its notes
function fuLineShow(ln){
  fuClearBars();
  blast.line=ln; blast.scroll=0; ln.done=false;
  const byBar={}; ln.findings.filter(CP.forbidden).forEach(f=>(byBar[f.bar]||(byBar[f.bar]=[])).push(f));
  const ps=ln.cp.flatMap(b=>Array.isArray(b)?b:[b]).filter(p=>p!=null).concat(ln.cantus);
  const pos=ps.map(p=>CP.degree(ln.mode,p).pos);
  ln.lo=Math.min(...pos); ln.hi=Math.max(...pos);
  blast.bars=ln.cantus.map((c,i)=>{
    const p=(Array.isArray(ln.cp[i]) ? ln.cp[i] : [ln.cp[i]]);
    const el=document.createElement("div"); el.className="fubar";
    blast.field.appendChild(el);
    return {i, c, p, el, bad:byBar[i]||[], shot:false, gone:false, heard:false, x:0};
  });
  fuLadder(); blast.bars.forEach(b=>{ fuBarDraw(b); fuBarPlace(b); });
  fuSign();
}
// the pitch ladder: a faint line every other degree, the final's in gold with its letter
function fuLadder(){
  const el=blast.ladderEl, ln=blast.line, L=blast.L; if(!el) return;
  if(!ln || !L){ el.innerHTML=""; return; }
  let h="";
  for(let p=ln.lo-1;p<=ln.hi+1;p++){
    const fin=mod(p,7)===0;
    if(mod(p,2) && !fin) continue;
    h+=`<i class="${fin?"fin":""}" style="top:${Math.round(fuY(p))}px"></i>`;
    if(fin) h+=`<b style="top:${Math.round(fuY(p))}px">${SHARP_NAMES[CP.MODES[ln.modeName].final]}</b>`;
  }
  el.innerHTML=h;
}
// a degree's height on the ladder
function fuY(pos){ const L=blast.L, ln=blast.line; return L.bottom-(pos-ln.lo+1)*(L.bottom-L.top)/(ln.hi-ln.lo+2); }
const fuYOf=p=>fuY(CP.degree(blast.line.mode,p).pos);
// a bar's notes, drawn once: the cantus wide, the counterpoint's note (or two) over or under it, a
// line between them, and the interval's number over the top if it's shown
function fuBarDraw(b){
  const L=blast.L, ln=blast.line, w=L.barW, n=b.p.length;
  const name=p=>SHARP_NAMES[mod(p,12)];                             // the modes sit on the white keys; ficta sharpens
  const cy=fuYOf(b.c);
  let h=`<span class="funote c" style="left:0;top:${cy}px;width:${Math.round(w*.78)}px">${name(b.c)}</span>`;
  const ivs=[];
  b.p.forEach((p,j)=>{
    const dx = n>1 ? (j? 1 : -1)*w*.2 : 0, py=fuYOf(p), I=CP.interval(ln.mode, b.c, p);
    ivs.push(I.number);
    h+=`<span class="fubeam" style="left:${dx}px;top:${Math.min(cy,py)}px;height:${Math.abs(cy-py)}px"></span>`;
    h+=`<span class="funote p" style="left:${dx}px;top:${py}px;width:${Math.round(w*(n>1?.36:.6))}px">${name(p)}</span>`;
  });
  if(fuShowIv()) h+=`<span class="fuiv" style="top:${L.bottom+8}px">${ivs.join(" ")}</span>`;   // along the foot, over the cannons
  b.el.innerHTML=h;
}
function fuBarPlace(b){
  const L=blast.L; b.x=L.W+L.barW*(b.i+.5)-blast.scroll;
  b.el.style.transform=`translateX(${Math.round(b.x)}px)`;
}
function fuTick(now){
  if(!blast || blast.kind!=="fux") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  const ln=blast.line;
  if(ln && !ln.done && blast.L && (blast.phase==="play" || (blast.phase==="demo" && !blast.demoHold))){
    blast.scroll+=blast.L.barW/(ln.secs||fuSecs())*dt*(ln.rush ? FU_RUSH : 1);
    // a bar is past the cannons (and out of reach) at the left edge, and keeps scrolling till it's off
    for(const b of blast.bars){
      if(b.el.hidden) continue;
      fuBarPlace(b);
      if(!b.heard && b.x<blast.L.W-blast.L.barW*.5){ b.heard=true; if(!ln.rush) fuHear(b); }
      if(!b.gone && b.x<blast.L.m-blast.L.barW*.6){ b.gone=true; fuGone(b); }
      if(b.x<-blast.L.barW) b.el.hidden=true;
    }
    if(blast.bars.every(b=>b.el.hidden)) fuLineEnd();
  }
  blast.raf=requestAnimationFrame(fuTick);
}
// a bar as it comes on: the two voices together (the counterpoint's half notes one after the other)
function fuHear(b){
  if(!settings.sounds || !piano.ctx) return;
  const secs=(blast.line.secs||fuSecs()), half=secs/b.p.length;
  const go=()=>{ piano.play([b.c],{when:.02, dur:secs*.95, vel:70}); b.p.forEach((p,j)=>piano.play([p],{when:.02+j*half, dur:half*.95, vel:84})); };
  piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{});
  heardAt=performance.now();
}

// ---------- shooting ----------
function fuxNote(pc){
  if(!blast || blast.kind!=="fux") return;
  if(blast.phase==="demo" && blast.demo){ endFuDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  fuShoot(mod(pc,12));
}
function fuxChord(){
  if(blast && blast.kind==="fux" && blast.phase==="demo" && blast.demo) endFuDemo(blast.demo);
}
// a cannon fires at the bar over it (if one is), and the shot decides when it lands
function fuShoot(i){
  const c=blast.cannons && blast.cannons[i], ln=blast.line; if(!c) return;
  c.fired=performance.now();
  const L=blast.L, b=blast.bars.find(x=>!x.gone && Math.abs(x.x-c.x)<L.barW/2);
  if(!b || !ln || ln.done || ln.rush){ heard(`STRING ${i+1}`, false, "NO BAR OVER IT"); return; }
  if(b.shot || b.wrong){ heard(`BAR ${b.i+1}`, false, "ALREADY SHOT"); return; }
  if(blast.phase==="play" && ln.shells<=0){ heard(`STRING ${i+1}`, false, "OUT OF SHELLS"); buzz(blast.field,true); return; }
  if(blast.phase==="play"){ ln.shells--; fuBar(); }
  sfx("shoot");
  const y=(fuYOf(b.c)+fuYOf(b.p[0]))/2;
  blast.fx.missiles.push({x0:c.x/PX, y0:(L.H-30)/PX, x1:b.x/PX, y1:y/PX, t0:performance.now(), dur:150, hit:()=>fuLand(b, y)});
}
function fuLand(b, y){
  if(!blast || !blast.line) return;
  const ln=blast.line, demo=blast.phase==="demo";
  if(b.bad.length){
    b.shot=true; b.el.classList.add("shot");
    if(!demo) ln.shells++;                                          // a hit gives its shell back
    const name=fuName(b.bad[0], b);
    b.el.insertAdjacentHTML("beforeend", `<span class="futag" style="top:${Math.min(fuYOf(b.c),fuYOf(b.p[0]))-14}px">${name}</span>`);
    explode(b.x, y, 16, ["#FF4B3E","#FFD35A","#FFF4C2"]); sfx("hit");
    heard(name, true);
    fuSay(FU_SAYS[b.bad[0].rule] ? FU_SAYS[b.bad[0].rule][0] : name);
    if(demo) return;
    const early=Math.max(0, Math.min(1, (b.x-blast.L.m)/(blast.L.W-2*blast.L.m)));
    const pts=mulPts(Math.round((25+25*early)*(blast.level+1)));
    blast.score+=pts; blast.found++; ln.caught++; stats.streak=blast.found; scoreboard();
    popup(b.x, y-30, `+${pts}`);
    // every wrong bar found: nothing's left to wait for, so the rest of the line hurries off
    if(ln.caught===ln.wrong) gameLater(()=>{ if(blast.line===ln && !ln.done){ ln.rush=true; heard("ALL FOUND", true, ""); } }, 900);
  } else {
    b.wrong=true; b.el.classList.add("wrong");
    sfx("miss"); buzz(blast.field,true);
    heard(`BAR ${b.i+1}`, false, "A GOOD BAR");
    fuSay(rnd(FU_WRONG));
    if(demo) return;
    ln.misses++;
  }
  fuBar();
}
// a bar off the left: a wrong one unshot costs a life, and is named as it goes
function fuGone(b){
  if(!b.bad.length || b.shot || blast.phase!=="play") return;
  b.el.classList.add("escaped");
  const name=fuName(b.bad[0], b);
  heard(name, false, "IT GOT PAST");
  fuSay(FU_SAYS[b.bad[0].rule] ? FU_SAYS[b.bad[0].rule][1] : name, 4200);
  popup(blast.L.m, blast.L.top+20, name, "#FF8FB8");
  blast.lives--; sfx("away"); buzz(blast.field,true); fuBar();
  if(blast.lives<=0){ blast.line.done=true; gameLater(()=>fuOver(), 1600); }
}
function fuLineEnd(){
  const ln=blast.line; if(!ln || ln.done) return;
  ln.done=true;
  if(blast.phase!=="play") return;
  let bonus=0;
  if(ln.caught===ln.wrong && !ln.misses){ bonus=mulPts(100*(blast.level+1)); blast.score+=bonus; fuSay(rnd(FU_CLEAN)); }
  else if(ln.caught<ln.wrong) fuSay(rnd(FU_DONE));
  banner(bonus ? "CLEAN SWEEP" : "LINE DONE", `${ln.caught} OF ${ln.wrong} FOUND${bonus?` · +${bonus}`:""}`);
  fuBar();
  if(blast.lineNo>=FU_LINES){
    blast.level++; blast.lineNo=0;
    gameLater(()=>{ sfx("level"); banner(`LEVEL ${blast.level+1}`, blast.level<FU_LEVELS.length ? fuLevel().n.toUpperCase() : "FASTER!"); fuBar(); }, 2400);
    gameLater(()=>fuLineStart(), 4800);
    return;
  }
  gameLater(()=>fuLineStart(), 2600);
}
function fuOver(){
  fuClear();
  blast.phase="over"; blast.over=true;
  const best=Math.max(saved.best.fux||0, blast.score); saved.best.fux=best; save();
  fuBar(); fuMenu(true);
}

// ---------- a clean field ----------
function fuClearBars(){ (blast.bars||[]).forEach(b=>b.el.remove()); blast.bars=[]; }
function fuClear(){
  if(!blast) return;
  fuClearBars(); blast.line=null;
  if(blast.sayEl) blast.sayEl.hidden=true;
  fuLadder(); fuSign();
}

// ---------- Fux's demo ----------
// A Dorian line with one pair of parallel fifths, scrolling by, shot from the cannon under it.
function fuDemo(){
  if(!blast || blast.kind!=="fux") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; fuLayout(); fuClear();
  const {token, say, step}=demoShell(endFuDemo);
  sfx("attract");
  (async()=>{
    try{
      say("FUX","PARALLEL PATROL: COUNTERPOINT AS FUX TAUGHT IT, IN 1725. FIND THE FAULTS IN A LINE BEFORE THEY GET AWAY."); await step(3200);
      const ln=fuMakeLine(FU_LEVELS[0], {ci:0, above:true, errors:1, want:"parallel5"});
      if(!ln) throw 0;
      ln.secs=1.0; fuLineShow(ln);
      say("TWO VOICES","THE CANTUS FIRMUS IN BLUE, YOUR COUNTERPOINT IN GOLD. EACH BAR SOUNDS AS IT COMES ON.");
      const bad=blast.bars.find(b=>b.bad.length);
      // wait until the wrong bar is over the middle of the cannons, then shoot it from the one under it
      while(bad && bad.x>blast.L.W*.55) await step(100);
      say("PARALLEL FIFTHS","A FIFTH, THEN ANOTHER FIFTH, BOTH VOICES MOVING THE SAME WAY. PLUCK THE STRING UNDER IT.");
      blast.demoHold=true; await step(1600);
      const i=blast.cannons.reduce((m,c,k)=>Math.abs(c.x-bad.x)<Math.abs(blast.cannons[m].x-bad.x) ? k : m, 0);
      fuShoot(i); await step(2600); blast.demoHold=false;
      say("SHELLS AND LIVES","A SHOT AT A GOOD BAR SPENDS A SHELL. A WRONG BAR THAT SCROLLS OFF THE LEFT COSTS A LIFE."); await step(4200);
      say("LATER","DISSONANCES, HIDDEN FIFTHS, BAD LEAPS, THE CADENCE, COUNTERPOINT BELOW, AND TWO NOTES AGAINST ONE."); await step(4200);
      endFuDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endFuDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.demoHold=false; blast.phase="menu"; fuClear();
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
