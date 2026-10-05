// Key Racer: Pole Position through the key. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Key Racer ----------
// A road in pseudo-3D, as the old racers drew it, and every few seconds a row of chord signs across
// its three lanes. The chords of the race's key are fuel: drive through one and it's collected, with
// a burst of speed and a second on the clock. The others are oil: drive through one and you spin. So
// the right hand steers on the harp (its twelve strings laid across the road, the low ones on the
// left), the eye reads the signs, and from the fourth circuit the left hand plays: a gate of the key
// only opens if its chord is played on the way in, and one that isn't opened shuts in your face. An
// AHEAD board on the dash shows the next row's signs in time to read them.
//
// Rival cars carry chords too. Play an in-key car's chord and it pulls over to let you by; a car whose
// chord isn't in the key has to be steered round. Stuck behind one, you're held to its speed. V then I,
// a cadence played on the buttons, is the turbo.
//
// Two ways to race, chosen on the title screen:
//   GRAND PRIX  eight circuits, each a key centre (C Speedway, G Raceway … E♭ Mountain), then on round
//               again faster. Each opens with qualifying: play the key's seven chords in order, against
//               the clock, and the time sets your place on the grid. You finish where you finish,
//               the rivals still ahead of you counted; championship points by place. Run out of time
//               before the line and it costs a life, and the circuit's raced again. Every two
//               circuits, a pit stop: the arcade's bonus round.
//   ENDURANCE   Pole Position's long race against the clock, round the circle of fifths: C, G, D … F,
//               and on. Each checkpoint is a key change, its banner coming up the road (→ D MAJOR).
//               Play the new key's I before you cross it and the clock gets a long extension; cross
//               without it, a short one. Just before a checkpoint the chords the two keys share, the
//               pivots, score double. The level chosen sets what the signs ask.
//
// The minichord's key signature stays at C, as in the other arcade games, so a chord with a sharp or
// flat root is its letter and the modifier; the modifier's way is set for each key (sharp keys
// sharpen, flat keys flatten), unless the player sets it by hand. Steering with a knob instead of the
// harp leaves the harp alone and scores a quarter more. Power-ups (SLIPSTREAM, ROLL CAGE, YELLOW FLAG,
// DA CAPO) ride on the road as capsules, taken by driving through them.

// ---------- keys and chords ----------
// a chord by its place in the key: [letters up, semitones up, kind of chord]
const KR_MAJ={"I":[0,0,""], "ii":[1,2,"m"], "iii":[2,4,"m"], "IV":[3,5,""], "V":[4,7,""], "vi":[5,9,"m"], "vii°":[6,11,"°"],
  "Imaj7":[0,0,"maj7"], "ii7":[1,2,"m7"], "iii7":[2,4,"m7"], "IVmaj7":[3,5,"maj7"], "V7":[4,7,"7"], "vi7":[5,9,"m7"],
  "iv":[3,5,"m"], "♭III":[2,3,""], "♭VI":[5,8,""], "♭VII":[6,10,""]};
const KR_MIN={"i":[0,0,"m"], "ii°":[1,2,"°"], "III":[2,3,""], "iv":[3,5,"m"], "V":[4,7,""], "VI":[5,8,""], "VII":[6,10,""], "V7":[4,7,"7"]};
// the oil: chords not of the key. "Near" ones sit on the key's own roots with the wrong kind of chord
// (Gm in C), "far" ones on roots outside it (E♭, F♯m), "borrowed" ones the parallel minor's.
const KR_OUT={
  major:{near:[[0,0,"m"],[1,2,""],[2,4,""],[3,5,"m"],[4,7,"m"],[5,9,""]], far:[[1,1,""],[2,3,""],[3,6,"m"],[5,8,"m"],[6,10,"m"],[1,1,"m"],[3,6,""]],
    borrowed:[[3,5,"m"],[2,3,""],[5,8,""],[6,10,""],[0,0,"m"],[4,7,"m"]]},
  minor:{near:[[0,0,""],[3,5,""],[1,2,"m"],[5,8,"m"],[6,10,"m"]], far:[[1,1,""],[2,4,"m"],[3,6,""],[5,9,"m"],[6,11,""]]},
};
const KR_POOL={major:["I","ii","iii","IV","V","vi"], minor:["i","III","iv","V","VI","VII"],
  sevenths:["I","Imaj7","ii7","iii7","IV","IVmaj7","V","V7","vi7"]};
const KR_QUAL={major:["I","ii","iii","IV","V","vi","vii°"], minor:["i","ii°","III","iv","V","VI","VII"]};
// the circuits of the Grand Prix, each a key centre; and what each asks: play (gates open only when
// their chord is played), show (names or numerals on the signs), out (which oil: near, far, borrowed,
// or plain cones at the numeral levels, since a numeral is always of the key)
const KR_LEVELS=[
  {n:"C Speedway",    key:"C",  out:"far"},
  {n:"G Raceway",     key:"G",  out:"far"},
  {n:"F Ring",        key:"F",  out:"near"},
  {n:"D Circuit",     key:"D",  out:"near", play:true},
  {n:"B♭ Park",       key:"B♭", out:"cone", play:true, numerals:true},
  {n:"A Minor Rally", key:"A",  out:"near", play:true, minor:true},
  {n:"E Grand Prix",  key:"E",  out:"near", play:true, sevenths:true},
  {n:"E♭ Mountain",   key:"E♭", out:"borrowed", play:true},
];
// past the eighth, round again: the later circuits' rules in other keys, faster
const KR_MORE=["A","B♭","E","D♭","B","A♭","D","E♭","G","F","C"];
function krLevel(i=blast.level){
  if(i<KR_LEVELS.length) return KR_LEVELS[i];
  const L=KR_LEVELS[3+((i-KR_LEVELS.length)%5)];
  // the next key round the list that spells all the circuit's chords plainly (E♭ minor's VI is C♭)
  for(let k=0;k<KR_MORE.length;k++){ const key=KR_MORE[(i-KR_LEVELS.length+k)%KR_MORE.length], pool=L.minor ? KR_POOL.minor : L.sevenths ? KR_POOL.sevenths : KR_POOL.major;
    const kk={name:key, minor:!!L.minor, table: L.minor ? KR_MIN : KR_MAJ};
    if(pool.every(n=>krChord(kk,n))) return {...L, key, n:`${key}${L.minor?" Minor":""} Grand Prix`}; }
  return {...L, key:"C", minor:false, n:"C Grand Prix"};
}
// the circle of fifths, Endurance's course; F♯ rather than G♭, whose IV would be C♭
const KR_CIRCLE=["C","G","D","A","E","B","F♯","D♭","A♭","E♭","B♭","F"];
const krMode=()=> saved.krMode ? "endurance" : "gp";
const krPlain=root=> !!root && !/^[CF]♭|^[EB]♯|[𝄪𝄫]|♭♭|♯♯/.test(root);
function krKey(name, minor){
  const k={name, minor:!!minor, label: minor ? `${name} MINOR` : `${name} MAJOR`, table: minor ? KR_MIN : KR_MAJ};
  k.home=krChord(k, minor ? "i" : "I");
  // the modifier's way for the key: sharp if its chords' roots are sharp, flat if flat
  let up=false, down=false;
  for(const n of krPool(k, krLevel())){ const c=krChord(k,n); if(!c) continue; const a=parse(c.root).acc; if(a>0) up=true; if(a<0) down=true; }
  k.lean = up ? 1 : down ? -1 : 0;
  return k;
}
const krPool=(key, L)=> key.minor ? KR_POOL.minor : L.sevenths ? KR_POOL.sevenths : KR_POOL.major;
// a chord of the key by its numeral, spelled; null if it can't be spelled plainly
function krChord(key, num){
  const d=key.table[num]; if(!d) return null;
  const root=above(key.name, d[0], d[1]); if(!krPlain(root) || !spellChord(root, d[2])) return null;
  return {num, root, q:d[2], sym:root+d[2], pc:pcOfName(root), inKey:true};
}
// a chord off the key, spelled from it
function krOff(key, kind){
  const lists=KR_OUT[key.minor ? "minor" : "major"], list=lists[kind] || lists.near;
  for(let k=0;k<20;k++){ const [st,se,q]=rnd(list), root=above(key.name, st, se);
    if(krPlain(root) && spellChord(root,q)) return {num:null, root, q, sym:root+q, pc:pcOfName(root), inKey:false}; }
  return {num:null, root:"F♯", q:"m", sym:"F♯m", pc:6, inKey:false};
}
// whether these pitches are a chord of the key (any spelling: the buttons don't know letters)
function krInKey(pitches, key){
  for(const num of Object.keys(key.table)){ if(!key.minor && !KR_QUAL.major.includes(num) && !KR_POOL.sevenths.includes(num)) continue;
    const c=krChord(key,num); if(c && isChord(pitches, c.pc, c.q)) return c; }
  return null;
}

// ---------- the road ----------
// The old racers' road: a strip of segments, each a short length of road with a curve and a height,
// projected from a camera above and behind the car, nearest last so the near road covers the far.
// Units: a segment is 200 long; the road is 2000 either side of its middle; three lanes.
const KR_SEG=200, KR_ROAD=2000, KR_CAMH=1000, KR_DEPTH=1/Math.tan(50*Math.PI/180), KR_DRAW=150, KR_PLAYER_Z=KR_CAMH*KR_DEPTH;
const KR_LANES=[-2/3, 0, 2/3];
const krEase=(a,b,t)=>a+(b-a)*((-Math.cos(t*Math.PI)/2)+.5);
// lay road: easing into a curve and a hill, holding them, easing out
function krRoad(segs, enter, hold, leave, curve, hill){
  const y0=segs.length ? segs[segs.length-1].y2 : 0, y1=y0+hill*KR_SEG, total=enter+hold+leave;
  for(let n=0;n<total;n++){
    const c = n<enter ? curve*(n/enter) : n<enter+hold ? curve : curve*(1-(n-enter-hold)/leave);
    const i=segs.length, ya=krEase(y0,y1,n/total), yb=krEase(y0,y1,(n+1)/total);
    segs.push({i, curve:c, y1:ya, y2:yb, band:Math.floor(i/3)%2, side: i%9===0 ? (Math.random()<.5?-1:1) : 0, rnd:Math.random()});
  }
}
// a stretch of road made up as it goes: straights, bends both ways, S-bends, hills
function krCourse(segs, len, calm){
  const end=segs.length+len;
  while(segs.length<end){
    const r=Math.random(), c=(calm?2:3)+Math.random()*(calm?2:3), dir=Math.random()<.5?-1:1, hill=(Math.random()-.5)*(calm?30:70);
    if(r<.25) krRoad(segs, 10, 20+Math.floor(Math.random()*30), 10, 0, hill*.5);
    else if(r<.7) krRoad(segs, 15, 25+Math.floor(Math.random()*25), 15, c*dir, hill);
    else { krRoad(segs, 12, 18, 12, c*dir, 0); krRoad(segs, 12, 18, 12, -c*dir, hill); }
  }
}
const krSegAt=z=> blast.segs[Math.max(0,Math.min(blast.segs.length-1, Math.floor(z/KR_SEG)))];

// ---------- the game ----------
function genRacer(){
  return {kind:"racer", prompt:"Key Racer", sub:"Pole Position through the key: steer on the harp through the chords of the key and round the ones that aren't, and play the gates' chords to open them.",
    answer:{type:"racer", get name(){ const r=blast && blast.kind==="racer" && krNextRow(); const g=r && r.signs.find(s=>s.chord && s.chord.inKey); return g ? g.chord.sym : "the key's chords"; }},
    get hint(){ const k=blast && blast.kind==="racer" && blast.key; return k ? `In ${k.label}: ${krPool(k, krLevel()).map(n=>krChord(k,n)?.sym).filter(Boolean).join(" ")}.` : "Drive through the key's chords."; },
    context:0};
}
function startRacer(){
  blast={kind:"racer", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), segs:[], rows:[], cars:[], caps:[], checks:[], st:"idle", pos:0, speed:0, x:0, targetX:0, champ:0, races:0};
  krDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  krMenu();
  blast.raf=requestAnimationFrame(krTick);
}
// the harp chromatic, so a string is a place across the road, at the volume the player chose; the
// knobs sending MIDI, for steering with one
function krDevice(){
  if(!blast || blast.kind!=="racer" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(hasSetting(35) && mc.params[35]!==keyIndexOf(0)) borrow(35, keyIndexOf(0)); if(hasSetting(31)) borrow(31, mc.params[31]??0); if(knobsReady()) borrow(238,1); });
}
function buildRacerField(box){
  const field=document.createElement("div"); field.className="field arcade racer"; field.setAttribute("aria-label","The road");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  field.insertAdjacentHTML("beforeend", `<div class="krdash">
      <div class="krtime"><small>TIME</small><b>--</b></div>
      <div class="krmid"><div class="krkey"></div><div class="krahead" aria-label="The next signs"></div></div>
      <div class="krright"><div class="krspeed"><b>0</b><small>KM/H</small></div><div class="krpos"></div><div class="krturbo"></div></div>
    </div><div class="krprog"><i></i></div><div class="krqual" hidden></div><div class="krflag" hidden></div>`);
  box.append(field);
  if(blast && blast.kind==="racer"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), dashEl:field.querySelector(".krdash"), qualEl:field.querySelector(".krqual"),
      aheadEl:field.querySelector(".krahead"), keyEl:field.querySelector(".krkey"), progEl:field.querySelector(".krprog i"), flagEl:field.querySelector(".krflag")});
    blast.sharp=sharpLayer(blast.fx);
    field.addEventListener("pointermove", e=>{ if(blast && blast.kind==="racer" && blast.phase==="play" && krSteer()==="keys"){ const r=field.getBoundingClientRect(); krAim((e.clientX-r.left)/r.width); } });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  krBar(); setTimeout(helperSync);
}
function krBar(){
  if(!blast || blast.kind!=="racer" || !blast.hud) return;
  const L=krLevel(), what = blast.mode==="endurance" ? `ENDURANCE · LAP ${blast.lap||1}` : `${L.n.toUpperCase()}`;
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1} · ${what}${krPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}
// the dash: the clock, the key, the next signs, the speed, the place, the turbo
function krDash(){
  if(!blast.dashEl) return;
  const t=blast.time==null ? "--" : Math.max(0, Math.ceil(blast.time));
  const tEl=blast.dashEl.querySelector(".krtime b"); if(tEl.textContent!==String(t)){ tEl.textContent=t; blast.dashEl.querySelector(".krtime").classList.toggle("low", blast.time!=null && blast.time<10); }
  const kmh=Math.round(blast.speed/blast.max*(blast.boostUntil>blast.clock?280:240)), s=blast.dashEl.querySelector(".krspeed b"); if(s.textContent!==String(kmh)) s.textContent=kmh;
  const pos = blast.mode==="gp" && blast.cars.length ? `POS <b>${krPlace()}</b>/${blast.cars.length+1}` : blast.mode==="endurance" ? `PASSED <b>${blast.passed||0}</b>` : "";
  const pe=blast.dashEl.querySelector(".krpos"); if(pe.innerHTML!==pos) pe.innerHTML=pos;
  const tb=blast.dashEl.querySelector(".krturbo"), tt = blast.boostUntil>blast.clock && blast.turboOn ? "TURBO!" : blast.clock>=(blast.turboAt||0) ? "V→I TURBO" : "";
  if(tb.textContent!==tt){ tb.textContent=tt; tb.classList.toggle("on", tt==="TURBO!"); }
  if(blast.progEl && blast.finishZ){ const f=Math.min(1, (blast.pos+KR_PLAYER_Z)/blast.finishZ); blast.progEl.style.transform=`scaleX(${f.toFixed(3)})`; }
  krAhead();
}
// the AHEAD board: the next row's signs, lane by lane, in time to read them
function krAhead(){
  const el=blast.aheadEl; if(!el) return;
  const r=krNextRow(), near = r && (r.seg*KR_SEG-(blast.pos+KR_PLAYER_Z))/KR_SEG < blast.max*4.2;
  const ck=blast.checks.find(c=>!c.done && (c.seg*KR_SEG-(blast.pos+KR_PLAYER_Z))/KR_SEG < blast.max*7);
  let h="";
  if(ck) h=`<span class="krck">CHECKPOINT → ${ck.key.label}${ck.played?" ✓":` · PLAY ${ck.key.home.sym}`}</span>`;
  else if(near) h=KR_LANES.map((_,l)=>{ const s=r.signs.find(x=>x.lane===l); if(!s) return `<span class="empty">·</span>`;
    if(s.cone) return `<span class="cone">▲▲</span>`;
    return `<span class="${s.open?"open":""}">${krLabel(s)}</span>`; }).join("");
  if(el.dataset.h!==h){ el.dataset.h=h; el.innerHTML=h; }
}
const krLabel=s=> s.chord ? (krLevel().numerals && s.chord.num ? s.chord.num : s.chord.sym) : "";
function krKeySign(){
  const el=blast.keyEl; if(!el) return;
  const h=blast.key ? `KEY OF <b>${blast.key.label}</b>` : ""; if(el.innerHTML!==h) el.innerHTML=h;
}

// ---------- the title screen ----------
// steering: the harp (the default), a knob (a quarter more), or the mouse and arrow keys
const krSteer=()=> saved.krSteer===1 && knobsReady() ? "knob" : saved.krSteer===1 ? "keys" : "harp";
const KRMENU_G={key:"racer", title:"KEY RACER",
  rules:()=>`<p>THE KEY'S CHORDS ARE FUEL: DRIVE THROUGH THEM. CHORDS OUT OF THE KEY ARE OIL: STEER ROUND THEM.</p><p>STEER ON THE HARP: ITS LOW STRINGS ARE THE LEFT OF THE ROAD, ITS HIGH ONES THE RIGHT. OR STEER WITH A KNOB, FOR A QUARTER MORE.</p><p>FROM THE FOURTH CIRCUIT A GATE ONLY OPENS IF YOU PLAY ITS CHORD ON THE WAY IN.</p><p>PLAY A CAR'S CHORD AND IT PULLS OVER. A CAR OUT OF THE KEY HAS TO BE STEERED ROUND. V THEN I IS THE TURBO.</p><p>GRAND PRIX: QUALIFY BY PLAYING THE KEY'S SEVEN CHORDS, THEN RACE THE CIRCUIT. ENDURANCE: ROUND THE CIRCLE OF FIFTHS AGAINST THE CLOCK, A KEY CHANGE AT EVERY CHECKPOINT. PLAY THE NEW KEY'S I BEFORE IT FOR EXTRA TIME.</p>`,
  stat:()=> blast.mode==="endurance" ? `LAP ${blast.lap||1} · PASSED ${blast.passed||0}` : `CHAMPIONSHIP ${blast.champ||0} PTS`,
  levels:KR_LEVELS, begin:i=>beginRacer(i), demo:()=>krDemo(), modNote:"title"};
function krMenu(over){ arcadeMenu(KRMENU_G, over); }
function beginRacer(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  krQuiet(); krClear();
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, phase:"play", over:false, mode:krMode(), champ:0, races:0, lap:1, passed:0, power:null, modFor:null});
  if(blast.mode==="endurance") blast.lives=1;
  saved.racerStart=level; save();
  stats.streak=0; scoreboard(); krBar();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(krTick);
  sfx("start");
  if(blast.mode==="endurance") gameLater(()=>krEndurance(), 600);
  else gameLater(()=>krRace(), 600);
}

// ---------- a race ----------
// the key, set on the minichord: the signature at C, the modifier's way for the key
function krApplyKey(key){
  blast.key=key;
  if(canWrite() && hasSetting(35) && mc.params[35]!==keyIndexOf(0)) borrow(35, keyIndexOf(0));
  if(key.lean && autoMod() && canWrite() && hasSetting(31)) ensure(31, key.lean>0 ? 0 : 1);
  modPill(); krKeySign();
  helpChord(null); helpChord(key.home.root, key.home.q);              // beginner mode lights home
}
// the max speed in segments a second: slower at the relaxed speeds, a little faster each level
const krMax=()=> 34/Math.sqrt(speedMul())*(1+.04*Math.min(blast.level,12));
// a Grand Prix circuit: build it, qualify, line up, race
function krRace(){
  if(!blast || blast.phase!=="play") return;
  const L=krLevel(), key=krKey(L.key, L.minor);
  blast.max=krMax(); krApplyKey(key); krReset();
  const len=Math.round(blast.max*78);                               // about a minute and a half at cruising speed
  krRoad(blast.segs, 1, 40, 1, 0, 0); krCourse(blast.segs, len, blast.level<2); krRoad(blast.segs, 1, KR_DRAW+40, 1, 0, 0);
  blast.finishZ=(len+40)*KR_SEG; blast.startSeg=8;
  krPlaceRows(60, len+40, key, L);
  blast.time=null; blast.st="qualify"; krBar(); krDash();
  banner(`LEVEL ${blast.level+1}`, `${L.n.toUpperCase()} · ${key.label}`);
  gameLater(()=>krQualify(key, L), 2000);
}
function krReset(){
  krClear();
  Object.assign(blast,{segs:[], rows:[], cars:[], caps:[], checks:[], rowAt:new Map(), capAt:new Map(), pos:0, speed:0, x:0, targetX:0, clock:0, boostUntil:0, turboOn:false, turboAt:0, spinUntil:0,
    lastChords:[], shake:0, skyOff:0, finishZ:0, gate:null, slip:0, cage:false, yellowUntil:0});
}
function krClear(){ if(blast && blast.field){ blast.field.querySelectorAll(".krflag,.krqual").forEach(e=>{ e.hidden=true; e.innerHTML=""; }); } }
// rows of signs every few seconds, and capsules now and then between them; at Endurance's
// checkpoints, the pivots
function krPlaceRows(from, to, key, L, pivots){
  const gap=Math.round(blast.max*(L.play?4.2:3.4));
  for(let seg=from; seg<to-30; seg+=gap+Math.floor(Math.random()*gap*.25)){
    const lanes=shuffle([0,1,2]), n = Math.random()<.55 ? 3 : 2, signs=[];
    const pool=krPool(key, L), pv=pivots && pivots(seg);
    for(let k=0;k<n;k++){
      const lane=lanes[k];
      if(k===0){ const pick=pv && pv.length && Math.random()<.8 ? rnd(pv) : rnd(pool); signs.push({lane, chord:krChord(key,pick), pivot:!!(pv && pv.includes(pick))}); }
      else if(L.out==="cone") signs.push({lane, cone:true});
      else signs.push({lane, chord:krOff(key, L.out)});
    }
    const row={seg, signs, key}; blast.rows.push(row); blast.rowAt.set(seg, row);
    if(blast.level>=1 && Math.random()<.13){ const c={seg:seg+Math.round(gap/2), lane:rnd([0,1,2]), k:powerPick(KR_POWERS)}; blast.caps.push(c); blast.capAt.set(c.seg, c); }
  }
}
// rivals on the grid: the player's place from qualifying, the rest two by two ahead and behind,
// each with a chord (out of the key, now and then, from the second circuit)
function krGrid(place, key, L){
  const n=8; blast.cars=[];
  const gz=k=>(n-k)*7*KR_SEG+KR_SEG*14;
  for(let k=1;k<=n;k++){ if(k===place) continue;
    const off = blast.level>=1 && Math.random()<.25;
    blast.cars.push({z:gz(k), x:k%2 ? -.5 : .5, speed:blast.max*(.6+Math.random()*.22), chord: off ? krOff(key, L.out==="cone"?"near":L.out) : krChord(key, rnd(krPool(key,L))), hue:k, yield:0, ahead:k<place}); }
  blast.pos=gz(place)-KR_PLAYER_Z; blast.x=blast.targetX = place%2 ? -.5 : .5;
}
const krPlace=()=> 1+blast.cars.filter(c=>c.z>blast.pos+KR_PLAYER_Z && !c.gone).length;

// ---------- qualifying ----------
// the key's seven chords in order, against the clock; the time sets the place on the grid
function krQualify(key, L){
  if(!blast || blast.phase!=="play") return;
  const nums=KR_QUAL[key.minor?"minor":"major"], chords=nums.map(n=>krChord(key,n));
  blast.qual={chords, i:0, t0:performance.now(), key, L};
  blast.st="qualify";
  const el=blast.qualEl; el.hidden=false;
  krQualDraw();
  sfx("key");
}
function krQualDraw(){
  const q=blast.qual, el=blast.qualEl; if(!q || !el) return;
  const L=q.L, names=!L.numerals;
  el.innerHTML=`<h4>QUALIFYING</h4><p>${q.key.label}: PLAY ITS SEVEN CHORDS IN ORDER</p>
    <div class="krqchips">${q.chords.map((c,i)=>`<span class="${i<q.i?"done":i===q.i?"now":""}"><b>${c.num}</b>${names||i<q.i?`<i>${c.sym}</i>`:""}</span>`).join("")}</div>
    <p class="krqtime"><b>0.0</b> S</p><p class="krqskip">OR WAIT, AND START FROM THE BACK</p>`;
}
function krQualChord(pitches, name){
  const q=blast.qual, c=q.chords[q.i];
  if(!isChord(pitches, c.pc, c.q)){ heard(name,false,`NEXT IS ${c.num}`); return; }
  heard(name,true); q.i++; sfx("open"); krQualDraw();
  if(q.i>=q.chords.length) krQualified((performance.now()-q.t0)/1000);
}
function krQualified(secs){
  const q=blast.qual; if(!q) return; blast.qual=null;
  const s=Math.sqrt(speedMul()), cuts=[7,9,11,13,16,19,23].map(x=>x*s);
  const place = secs==null ? 8 : 1+cuts.filter(c=>secs>c).length;
  blast.qualEl.innerHTML=`<h4>${place===1?"POLE POSITION!":`GRID P${place}`}</h4><p>${secs==null?"NO TIME SET":`${secs.toFixed(1)} SECONDS`}</p>`;
  if(place===1) sfx("level"); else sfx("key");
  krGrid(place, q.key, q.L);
  gameLater(()=>{ blast.qualEl.hidden=true; krCountdown(); }, 2200);
}
// three, two, one, go: the lights, and the old game's beeps
function krCountdown(){
  blast.st="grid"; blast.speed=0;
  const L=krLevel(); blast.time=Math.round(blast.finishZ/KR_SEG/(blast.max*.74))+8;
  krEngine(true);
  const fl=blast.flagEl; fl.hidden=false;
  [3,2,1].forEach((n,i)=>gameLater(()=>{ fl.innerHTML=`<b class="krlight">${"●".repeat(4-n)}</b><span>${n}</span>`; sfx("beep", 0); }, i*800));
  gameLater(()=>{ fl.innerHTML=`<b class="krlight go">●●●●</b><span>GO!</span>`; sfx("beep", 1); blast.st="race"; blast.raceT0=blast.clock; }, 2400);
  gameLater(()=>{ fl.hidden=true; }, 3300);
  void L;
}

// ---------- Endurance ----------
// round the circle of fifths, sector by sector, each in its key; a checkpoint between, where the
// key changes and the clock is extended. The road's laid a sector ahead of the car.
function krEndurance(){
  if(!blast || blast.phase!=="play") return;
  blast.max=krMax(); krReset();
  blast.circ=0; blast.lap=1; blast.passed=0;
  const L=krLevel(), key=krKey(KR_CIRCLE[0], false);
  krApplyKey(key);
  krRoad(blast.segs, 1, 40, 1, 0, 0);
  blast.sectorLen=Math.round(blast.max*30);
  krSector(key, L); krSector(null, L);
  blast.time=45*Math.max(1,Math.sqrt(speedMul())*.9); blast.finishZ=0;
  krBar(); krDash();
  banner("ENDURANCE", `ROUND THE CIRCLE OF FIFTHS FROM ${key.label}`);
  gameLater(()=>krCountdown(), 1800);
}
// a sector of road in the next key round the circle, ending in a checkpoint into the one after
function krSector(key, L){
  blast.circ=(blast.circ||0);
  const k=key || krKey(KR_CIRCLE[blast.circ % 12], false), next=krKey(KR_CIRCLE[(blast.circ+1) % 12], false);
  const from=blast.segs.length; krCourse(blast.segs, blast.sectorLen, false); const to=blast.segs.length;
  // the pivots: chords of both keys, scoring double in the stretch before the checkpoint
  const shared=krPool(k, L).filter(n=>{ const c=krChord(k,n); return c && krPool(next,L).some(m=>{ const d=krChord(next,m); return d && d.pc===c.pc && d.q===c.q; }); });
  krPlaceRows(from+20, to, k, L, seg=> seg>to-blast.max*9 ? shared : null);
  blast.checks.push({seg:to-6, key:next, from:k, done:false, played:false});
  blast.circ++;
}

// ---------- each frame ----------
function krTick(now){
  if(!blast || blast.kind!=="racer") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if((blast.phase==="play" || blast.phase==="demo") && blast.segs.length) krStep(dt);
  if(blast.fx) fxDraw(now, dt);
  if((blast.phase==="play" || blast.phase==="demo") && blast.dashEl && Math.floor(now/120)!==blast.dashTick){ blast.dashTick=Math.floor(now/120); krDash();
    const q=blast.qual; if(q){ const s=(now-q.t0)/1000, t=blast.qualEl && blast.qualEl.querySelector(".krqtime b"); if(t) t.textContent=s.toFixed(1); if(s>30*Math.sqrt(speedMul())) krQualified(null); } }
  blast.raf=requestAnimationFrame(krTick);
}
// the car, the rivals and the clock, moved on by dt seconds
function krStep(dt){
  const yellow=blast.clock<blast.yellowUntil;
  const g = yellow ? .6 : 1;                                       // YELLOW FLAG: everything slower, the clock too
  blast.clock+=dt;
  const racing = blast.st==="race";
  if(blast.demoAuto) krAutopilot();
  // steering: the car eases toward where the harp (or the knob) says, quicker at speed
  if(blast.clock>=blast.spinUntil){ const ds=(blast.targetX-blast.x); blast.x+=Math.sign(ds)*Math.min(Math.abs(ds), dt*(1.6+2.4*blast.speed/blast.max)); }
  else blast.x+=Math.sin(blast.clock*40)*.01;                       // a spin: the wheel's not yours
  // speed: up to cruising, more on a boost, less off the road; nothing on the grid
  const top = !racing ? 0 : blast.max*(blast.clock<blast.boostUntil ? (blast.turboOn?1.4:1.18) : 1)*(Math.abs(blast.x)>1.05 ? .45 : 1);
  if(blast.clock<blast.spinUntil) blast.speed=Math.max(blast.max*.15, blast.speed-blast.max*1.4*dt);
  else blast.speed += (top-blast.speed)*Math.min(1, dt*(blast.speed<top ? 1.1 : 2));
  if(blast.speed<0) blast.speed=0;
  const before=blast.pos+KR_PLAYER_Z;
  blast.pos+=blast.speed*KR_SEG*dt*g;
  // a rival in the lane ahead, too close: held behind it
  for(const c of blast.cars){ if(c.gone) continue;
    c.z+=c.speed*KR_SEG*dt*g*(c.yield?.7:1);
    if(c.yield){ c.x+=Math.sign(c.x||1)*dt*1.2; if(Math.abs(c.x)>1.3) c.x=Math.sign(c.x)*1.3; }
    const gap=c.z-(blast.pos+KR_PLAYER_Z);
    if(gap>0 && gap<KR_SEG*1.6 && Math.abs(c.x-blast.x)<.42 && racing){
      blast.pos=Math.min(blast.pos, c.z-KR_SEG*1.6-KR_PLAYER_Z+1); blast.speed=Math.min(blast.speed, c.speed*.97);
      if(!c.blocked){ c.blocked=true; heard(c.chord.sym, false, c.chord.inKey ? "BLOCKED: PLAY ITS CHORD, OR STEER ROUND" : "BLOCKED: IT'S OUT OF THE KEY, STEER ROUND"); sfx("bump"); }
    }
  }
  const after=blast.pos+KR_PLAYER_Z;
  // the curve carries the sky round
  const seg=krSegAt(after); blast.skyOff+=seg.curve*blast.speed*dt*.6;
  if(!racing && blast.phase!=="demo") return;
  // what the car went through: rows of signs, capsules, cars passed, checkpoints, the line
  for(let i=Math.floor(before/KR_SEG)+1; i<=Math.floor(after/KR_SEG); i++){
    const r=blast.rowAt.get(i); if(r && !r.done) krThrough(r);
    const c=blast.capAt.get(i); if(c && !c.done){ c.done=true; if(Math.abs(KR_LANES[c.lane]-blast.x)<.36) krPowerGet(c.k); }
  }
  for(const c of blast.cars){ if(c.gone) continue; const ahead=c.z>after; if(c.ahead && !ahead) krPassed(c); c.ahead=ahead; }   // overtaken: ahead last frame, behind now
  for(const c of blast.checks){ if(!c.done && c.seg*KR_SEG>before && c.seg*KR_SEG<=after) krCheckpoint(c); }
  if(blast.phase==="demo") return;
  if(blast.mode==="endurance"){
    if(blast.segs.length-seg.i < blast.sectorLen*.6+KR_DRAW) krSector(null, krLevel());
    blast.cars=blast.cars.filter(c=>c.z>after-KR_SEG*40);
    if(blast.cars.filter(c=>c.z>after).length<3 && Math.random()<dt*.4) krTraffic(after);
  }
  if(blast.time!=null){ blast.time-=dt*g; if(blast.time<=0){ blast.time=0; krTimeUp(); return; } }
  if(blast.finishZ && after>=blast.finishZ) krFinish();
}
// traffic for Endurance: a car up the road, in a lane, with a chord of the key it's in
function krTraffic(after){
  const z=after+KR_SEG*(KR_DRAW-10), key=blast.key;
  const L=krLevel(), off = Math.random()<.2;
  blast.cars.push({z, x:rnd(KR_LANES), speed:blast.max*(.45+Math.random()*.2), chord: off ? krOff(key, L.out==="cone"?"near":L.out) : krChord(key, rnd(krPool(key,L))), hue:1+Math.floor(Math.random()*7), yield:0, ahead:true});
}
// through a row of signs: the one in the car's lane, if any
function krThrough(r){
  r.done=true;
  const L=krLevel(), here=r.signs.find(s=>Math.abs(KR_LANES[s.lane]-blast.x)<.36);
  // SLIPSTREAM: every gate of the key in the row collects itself, wherever the car is
  if(blast.clock<blast.slip) r.signs.forEach(s=>{ if(s!==here && s.chord && s.chord.inKey){ s.hit="good"; krCollect(s, true); } });
  if(!here){ if(blast.phase==="play") r.signs.filter(s=>s.chord && s.chord.inKey).forEach(s=>s.hit="missed"); return; }
  if(here.cone || (here.chord && !here.chord.inKey)){ here.hit="bad"; krCrash(here); return; }
  if(L.play && !here.open && !(blast.clock<blast.slip)){ here.hit="shut"; krShut(here); return; }
  here.hit="good"; krCollect(here, false);
}
function krCollect(s, slip){
  const L=krLevel(), pts=mulPts(Math.round((L.play?20:10)*(s.pivot?2:1)*(blast.level+1)));
  blast.score+=pts; if(blast.time!=null) blast.time+=slip ? .5 : 1;
  if(!slip){ blast.boostUntil=Math.max(blast.boostUntil, blast.clock+.9); blast.turboOn=blast.turboOn && blast.boostUntil>blast.clock; }
  const sym=s.chord.sym; heard(`${sym}${s.chord.num?` · ${s.chord.num}`:""}`, true, "");
  krPop(`+${pts}${s.pivot?" PIVOT ×2":""}`, "#7FE08A"); sfx("collect", s.chord.pc); krBar();
}
function krCrash(s){
  if(blast.cage){ blast.cage=false; blast.power=null; krPop("ROLL CAGE!", "#7FE9FF"); sfx("bump"); krBar(); return; }
  blast.spinUntil=blast.clock+.9; blast.shake=.9; sfx("crash");
  const why = s.cone ? "CONES" : `${s.chord.sym}: NOT IN ${blast.key ? blast.key.label : "THE KEY"}`;
  heard(s.cone ? "▲▲" : s.chord.sym, false, why); krPop("SPIN!", "#FF4B3E");
  if(blast.phase==="play") buzz(blast.field, true);
}
function krShut(s){
  blast.speed*=.5; blast.shake=.4; sfx("bump");
  heard(s.chord.sym, false, `SHUT: PLAY ${krLevel().numerals ? `${s.chord.num} (${s.chord.sym})` : s.chord.sym} TO OPEN IT`); krPop("SHUT!", "#FFD35A");
}
function krPassed(c){
  if(c.yield){ const pts=mulPts(30*(blast.level+1)); blast.score+=pts; krPop(`PASSED +${pts}`, "#FFD35A"); }
  else { const pts=mulPts(10*(blast.level+1)); blast.score+=pts; krPop(`OVERTAKEN +${pts}`, "#F1E8D2"); }
  blast.passed=(blast.passed||0)+1; sfx("pass"); krBar();
}
function krPop(text, colour){ if(blast.field && blast.phase==="play") popup(fieldW()/2, fieldH()*.55, text, colour); }
// ---------- the checkpoint: a key change ----------
function krCheckpoint(c){
  c.done=true;
  const ext = c.played ? 30 : 16, pts=mulPts((c.played?50:10)*(blast.level+1));
  blast.time+=ext*(speedMul()>1?1.1:1); blast.score+=pts;
  krApplyKey(c.key);
  if(c.key.name===KR_CIRCLE[0]){ blast.lap++; banner(`LAP ${blast.lap}`, "ROUND THE CIRCLE AGAIN, FASTER"); blast.max*=1.06; }
  else banner(`→ ${c.key.label}`, c.played ? `EXTENDED PLAY · +${ext} SECONDS` : `+${ext} SECONDS · PLAY ${c.key.home.sym} BEFORE THE NEXT ONE FOR MORE`);
  sfx("checkpoint", c.key.home.pc); krBar();
}

// ---------- the line, or the clock ----------
function krFinish(){
  blast.st="done"; blast.finishZ=0; const place=krPlace(), L=krLevel();
  const champ=[25,18,15,12,10,8,6,4][place-1]||0, left=Math.max(0,Math.round(blast.time));
  const pts=mulPts((Math.max(0,9-place)*50+left*10)*(blast.level+1));
  blast.score+=pts; blast.champ+=champ; blast.races++;
  sfx("finish", blast.key.home.pc);
  const fl=blast.flagEl; fl.hidden=false;
  fl.innerHTML=`<b class="krcheq">FINISH</b><span>${place===1?"YOU WIN!":`P${place}`} · ${L.n.toUpperCase()}</span><small>+${champ} CHAMPIONSHIP POINTS · ${left} SECONDS LEFT · +${pts}</small>`;
  krBar();
  gameLater(()=>{ fl.hidden=true; blast.level++; krEngine(false); krBar(); gameLater(()=>krRace(), 600); }, 4200);
}
function krTimeUp(){
  blast.st="done"; krEngine(false); sfx("over");
  if(blast.mode==="endurance"){ blast.lives=0; krBar(); banner("TIME UP", `LAP ${blast.lap} · ${blast.passed||0} PASSED`); gameLater(()=>krOver(), 2600); return; }
  blast.lives--; krBar(); banner("TIME UP", blast.lives>0 ? "DID NOT FINISH · RACE IT AGAIN" : "DID NOT FINISH");
  if(blast.lives<=0){ gameLater(()=>krOver(), 2600); return; }
  gameLater(()=>krRace(), 2800);
}
function krOver(){
  krQuiet(); blast.phase="over"; blast.over=true; blast.st="idle";
  const best=Math.max(saved.best.racer||0, blast.score); saved.best.racer=best; save();
  if(canWrite() && hasSetting(35) && mc.params[35]!==keyIndexOf(0)) borrow(35, keyIndexOf(0));
  krBar(); krMenu(true);
}

// ---------- steering ----------
// a string of the harp: the low strings the left of the road, the high the right, the outermost
// just off it
function racerNote(pc){
  if(!blast || blast.kind!=="racer") return;
  if(blast.phase==="demo" && blast.demo){ endKrDemo(blast.demo); return; }
  if(blast.phase!=="play" || krSteer()!=="harp") return;
  krAim(mod(pc,12)/11);
}
const krAim=f=>{ blast.targetX=-1.12+Math.max(0,Math.min(1,f))*2.24; };
function krKnob(v){ if(blast && blast.kind==="racer" && blast.phase==="play" && krSteer()!=="harp") krAim(v); }
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="racer" || blast.phase!=="play" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const d={ArrowLeft:-1,ArrowRight:1}[e.code]; if(!d) return;
  e.preventDefault(); blast.targetX=Math.max(-1.12,Math.min(1.12, blast.targetX+d*(e.shiftKey?.66:.33)));
});

// ---------- chords ----------
// A chord from the buttons: qualifying's next; a gate ahead opened; a rival pulled over; the
// checkpoint's new home; and V then I, the turbo. A chord that does none of these costs nothing.
function racerChord(voices){
  if(!blast || blast.kind!=="racer") return;
  if(blast.phase==="demo" && blast.demo){ endKrDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const name=chordName(pitches, devFifths());
  if(blast.st==="qualify" && blast.qual){ krQualChord(pitches, name); return; }
  if(blast.st!=="race") return;
  const here=blast.pos+KR_PLAYER_Z, reach=blast.max*KR_SEG*4.2;
  let did="";
  // the checkpoint ahead: the new key's I
  const ck=blast.checks.find(c=>!c.done && c.seg*KR_SEG-here < blast.max*KR_SEG*7);
  if(ck && !ck.played && isChord(pitches, ck.key.home.pc, ck.key.home.q)){ ck.played=true; did="CHECKPOINT: EXTENDED PLAY"; sfx("open"); }
  // the nearest row ahead with a gate of this chord
  if(!did && krLevel().play){
    const nx=krNextRow(), row = nx && nx.seg*KR_SEG-here<reach ? nx : null;
    const g=row && row.signs.find(s=>s.chord && s.chord.inKey && !s.open && isChord(pitches, s.chord.pc, s.chord.q));
    if(g){ g.open=true; did="OPEN"; sfx("open"); krAhead(); }
  }
  // a rival ahead with this chord
  if(!did){
    const car=blast.cars.filter(c=>!c.gone && !c.yield && c.z>here && c.z-here<KR_SEG*45).sort((a,b)=>a.z-b.z).find(c=>isChord(pitches, c.chord.pc, c.chord.q));
    if(car){ if(car.chord.inKey){ car.yield=1; did="PULLED OVER"; sfx("horn"); } else { heard(name,false,"THAT CAR'S CHORD IS OUT OF THE KEY: STEER ROUND IT"); return; } }
  }
  // V then I: the turbo
  const key=blast.key, now=blast.clock, last=blast.lastChords[blast.lastChords.length-1];
  const isV=p=>{ const v=krChord(key, key.minor?"V":"V"); const v7=krChord(key,"V7"); return (v && isChord(p, v.pc, v.q)) || (v7 && isChord(p, v7.pc, v7.q)); };
  if(key && last && now-last.t<1.8 && isV(last.p) && isChord(pitches, key.home.pc, key.home.q) && now>=blast.turboAt){
    blast.turboOn=true; blast.boostUntil=now+2.6; blast.turboAt=now+8; sfx("turbo"); did=did||"TURBO!"; krPop("TURBO!", "#FF8A3D");
    blast.score+=mulPts(15*(blast.level+1)); krBar();
  }
  blast.lastChords.push({p:pitches, t:now}); if(blast.lastChords.length>3) blast.lastChords.shift();
  const inKey=krInKey(pitches, key);
  heard(name, !!did || !!inKey, did || (inKey ? `${inKey.num}` : `NOT IN ${key.label}`));
}

// ---------- drawing ----------
// on the arcade's pixel canvas: the road nearest last, then the signs, cars and capsules from the
// far end in, then the car. Chord names on the sharp layer above, so they read at any size.
const KR_CARS=["#FF4B3E","#7FE9FF","#FFD35A","#7FE08A","#FF5AA0","#9A93B5","#FF8A3D","#F1E8D2"];
function krDraw(g, now){
  if(!blast.segs.length){ krLabelsBegin(); return; }
  const W=blast.fx.w, H=blast.fx.h, segs=blast.segs;
  // the mountains, drifting round with the curves
  krMountains(g, W, H);
  const base=krSegAt(blast.pos), basePct=(blast.pos%KR_SEG)/KR_SEG, me=krSegAt(blast.pos+KR_PLAYER_Z), mePct=((blast.pos+KR_PLAYER_Z)%KR_SEG)/KR_SEG;
  const camY=me.y1+(me.y2-me.y1)*mePct+KR_CAMH;
  let maxy=H, x=0, dx=-(base.curve*basePct);
  const proj=(wx,wy,wz,cx)=>{ const cz=wz-blast.pos; const sc=KR_DEPTH/cz; return {x:W/2+sc*(wx-cx)*W/2, y:H/2-sc*(wy-camY)*H/2, w:sc*KR_ROAD*W/2, s:sc, z:cz}; };
  const vis=[];
  for(let n=0;n<KR_DRAW;n++){
    const s=segs[base.i+n]; if(!s) break;
    const cx=blast.x*KR_ROAD, p1=proj(-x, s.y1, s.i*KR_SEG, cx), p2=proj(-x-dx, s.y2, (s.i+1)*KR_SEG, cx);
    x+=dx; dx+=s.curve;
    s.p1=p1; s.clip=maxy;
    if(p1.z<=KR_DEPTH || p2.y>=p1.y || p2.y>=maxy){ s.vis=false; continue; }
    s.vis=true; vis.push(s);
    krSegment(g, W, s, p1, p2, s.i===Math.floor(blast.finishZ/KR_SEG) || s.i===blast.startSeg);
    maxy=p1.y;
  }
  krLabelsBegin();
  blast.carAt=new Map(); for(const c of blast.cars){ if(c.gone) continue; const i=Math.floor(c.z/KR_SEG); if(!blast.carAt.has(i)) blast.carAt.set(i,[]); blast.carAt.get(i).push(c); }
  // far to near: what's on the road
  for(let n=vis.length-1;n>=0;n--){ const s=vis[n]; krSprites(g, s, W, H); }
  krPlayerCar(g, W, H, now);
}
function krSegment(g, W, s, p1, p2, cheq){
  const light=s.band===0;
  g.fillStyle = light ? "#1E5A1E" : "#1A4F1A"; g.fillRect(0, Math.floor(p2.y), W, Math.ceil(p1.y-p2.y)+1);
  const poly=(xa,ya,wa,xb,yb,wb,c)=>{ g.fillStyle=c; g.beginPath(); g.moveTo(xa-wa,ya); g.lineTo(xa+wa,ya); g.lineTo(xb+wb,yb); g.lineTo(xb-wb,yb); g.closePath(); g.fill(); };
  const r1=p1.w/7, r2=p2.w/7;
  poly(p1.x,p1.y,p1.w+r1,p2.x,p2.y,p2.w+r2, light ? "#D8D8D8" : "#B8312F");     // the rumble strips
  poly(p1.x,p1.y,p1.w,p2.x,p2.y,p2.w, cheq ? "#F1E8D2" : light ? "#3A3A46" : "#36363F");
  if(cheq){ const n=8; for(let k=0;k<n;k++){ if((k+s.i)%2) continue; const fa=-1+2*k/n, fb=-1+2*(k+1)/n;
    g.fillStyle="#16132A"; g.beginPath(); g.moveTo(p1.x+p1.w*fa,p1.y); g.lineTo(p1.x+p1.w*fb,p1.y); g.lineTo(p2.x+p2.w*fb,p2.y); g.lineTo(p2.x+p2.w*fa,p2.y); g.closePath(); g.fill(); } }
  if(light && !cheq){ const l1=p1.w/32, l2=p2.w/32;                                    // the lane markers
    for(const f of [-1/3,1/3]) poly(p1.x+p1.w*f, p1.y, l1, p2.x+p2.w*f, p2.y, l2, "#E8E2CC"); }
}
// a sprite's place: on the segment's near edge, offset across the road (in road half-widths)
const krAt=(s, off, W)=>({x:s.p1.x+s.p1.s*off*KR_ROAD*W/2, y:s.p1.y, k:s.p1.s*W/2});
function krSprites(g, s, W, H){
  g.save(); g.beginPath(); g.rect(0,0,W,s.clip); g.clip();
  // roadside posts, for the sense of speed
  if(s.side){ const p=krAt(s, s.side*1.35, W), h=p.k*900, w=Math.max(1,p.k*60);
    g.fillStyle="#2A2440"; g.fillRect(p.x-w/2, p.y-h, w, h); g.fillStyle=s.rnd<.5?"#FFD35A":"#FF5AA0"; g.fillRect(p.x-w*1.5, p.y-h, w*3, Math.max(1,w*1.2)); }
  // the start and finish gantries, and Endurance's checkpoints
  if(s.i===blast.startSeg || (blast.finishZ && s.i===Math.floor(blast.finishZ/KR_SEG))) krGantry(g, s, W, s.i===blast.startSeg ? "START" : "FINISH", "#F1E8D2");
  for(const c of blast.checks) if(c.seg===s.i && !c.done) krGantry(g, s, W, `→ ${c.key.label}`, c.played ? "#7FE08A" : "#FFD35A");
  // rows of signs
  const row=blast.rowAt.get(s.i); if(row) for(const sg of row.signs) krSign(g, s, W, sg);
  // capsules
  const c0=blast.capAt.get(s.i); for(const c of c0 && !c0.done ? [c0] : []){ const p=krAt(s, KR_LANES[c.lane], W), r=Math.max(1,p.k*220);
    g.fillStyle="#FF5AA0"; g.beginPath(); g.arc(p.x, p.y-r*1.4, r, 0, Math.PI*2); g.fill(); krLabel1(p.x, p.y-r*1.4, r*1.1, KR_POWERS[c.k].icon, null); }
  // rivals
  for(const c of blast.carAt.get(s.i)||[]){
    const p=krAt(s, c.x, W), w=p.k*620; krCarShape(g, p.x, p.y, w, KR_CARS[c.hue%KR_CARS.length], 0);
    if(w>22) krLabel1(p.x, p.y-w*.62, w*.3, c.chord.sym, c.chord.inKey||!krLevel().play ? (c.yield?"#7FE08A":"#F1E8D2") : "#F1E8D2", c.yield); }
  g.restore();
}
// a sign over a lane: two posts and a board, its chord on it; cones at the numeral levels
function krSign(g, s, W, sg){
  const p=krAt(s, KR_LANES[sg.lane], W), w=p.k*1200, h=p.k*440, top=p.y-p.k*1600;
  if(sg.cone){ for(const f of [-.3,0,.3]){ const cx=p.x+f*w, ch=p.k*420, cw=p.k*240; g.fillStyle="#FF8A3D"; g.beginPath(); g.moveTo(cx,p.y-ch); g.lineTo(cx+cw/2,p.y); g.lineTo(cx-cw/2,p.y); g.fill(); g.fillStyle="#F1E8D2"; g.fillRect(cx-cw*.25,p.y-ch*.55,cw*.5,Math.max(1,ch*.12)); } return; }
  const col = sg.hit==="good" ? "#7FE08A" : sg.hit==="bad" ? "#FF4B3E" : sg.hit==="shut" ? "#FFD35A" : sg.open ? "#7FE08A" : "#F1E8D2";
  g.fillStyle="#6B6358"; const pw=Math.max(1,p.k*50); g.fillRect(p.x-w/2, top, pw, p.y-top); g.fillRect(p.x+w/2-pw, top, pw, p.y-top);
  g.fillStyle = sg.open ? "#16402A" : "#16132A"; g.fillRect(p.x-w/2, top, w, h);
  g.fillStyle=col; const b=Math.max(1,p.k*30); g.fillRect(p.x-w/2, top, w, b); g.fillRect(p.x-w/2, top+h-b, w, b);
  if(sg.chord && w>14) krLabel1(p.x, top+h/2, Math.max(3.4, Math.min(h*.72, w*.3)), krLabel(sg)+(sg.pivot?"×2":""), col);   // named once it's near enough to carry it
}
function krGantry(g, s, W, text, col){
  const a=krAt(s,-1.2,W), b=krAt(s,1.2,W), h=a.k*420, top=a.y-a.k*1700, pw=Math.max(1,a.k*70);
  g.fillStyle="#6B6358"; g.fillRect(a.x, top, pw, a.y-top); g.fillRect(b.x-pw, top, pw, b.y-top);
  g.fillStyle="#16132A"; g.fillRect(a.x, top, b.x-a.x, h); g.fillStyle=col; g.fillRect(a.x, top, b.x-a.x, Math.max(1,a.k*30));
  if(b.x-a.x>60) krLabel1((a.x+b.x)/2, top+h/2, Math.min(h*.7,(b.x-a.x)*.06), text, col);
}
// a car from behind, in pixels: wheels, body, cabin and glass, tail lights; w its width
function krCarShape(g, cx, by, w, col, tilt){
  const h=w*.42, x0=cx-w/2, y0=by-h;
  g.fillStyle="#16132A"; g.fillRect(x0, by-h*.32, w*.2, h*.32); g.fillRect(x0+w*.8, by-h*.32, w*.2, h*.32);   // wheels
  g.fillStyle=col; g.fillRect(x0+w*.04, y0+h*.38, w*.92, h*.44);                                               // body
  g.fillRect(x0+w*.22+tilt*w*.05, y0+h*.08, w*.56, h*.34);                                                       // cabin
  g.fillStyle="#7FE9FF"; g.fillRect(x0+w*.28+tilt*w*.05, y0+h*.14, w*.44, h*.2);                                 // glass
  g.fillStyle="#FF4B3E"; g.fillRect(x0+w*.08, y0+h*.5, w*.14, h*.1); g.fillRect(x0+w*.78, y0+h*.5, w*.14, h*.1); // tail lights
  g.fillStyle="#16132A"; g.fillRect(x0+w*.3, y0+h*.64, w*.4, Math.max(1,h*.08));                                 // the bumper's line
}
function krPlayerCar(g, W, H, now){
  const w=Math.round(W*.2), bounce = blast.speed>1 ? Math.round(Math.sin(now/45))*(Math.random()<.5?0:1) : 0;
  const shake = blast.clock<blast.spinUntil ? Math.round(Math.sin(now/30)*3) : 0;
  const tilt=Math.max(-1,Math.min(1,(blast.targetX-blast.x)*3));
  krCarShape(g, Math.round(W/2)+shake, H-3+bounce, w, blast.clock<blast.boostUntil ? "#FFD35A" : "#FF4B3E", tilt);
  if(blast.clock<blast.boostUntil){ g.fillStyle=Math.floor(now/60)%2?"#FF8A3D":"#FFD35A"; g.fillRect(W/2-w*.3, H-2, w*.12, 2); g.fillRect(W/2+w*.18, H-2, w*.12, 2); }   // the exhaust's flame
}
// the mountains on the horizon, painted once, scrolled round with the curves
function krMountains(g, W, H){
  if(!blast.mtn || blast.mtn.width!==W*2){
    const cv=document.createElement("canvas"); cv.width=W*2; cv.height=Math.ceil(H*.22); const m=cv.getContext("2d"); blast.mtn=cv;
    if(m && m.fillRect){ for(let x=0;x<cv.width;x++){ const h=Math.floor(cv.height*(.45+.35*Math.sin(x/37)+.15*Math.sin(x/11+2))); m.fillStyle="#2B1E4A"; m.fillRect(x,cv.height-h,1,h);
      const h2=Math.floor(cv.height*(.25+.2*Math.sin(x/19+1))); m.fillStyle="#3A2A5E"; m.fillRect(x,cv.height-h2,1,h2); } }
  }
  const off=Math.floor(((blast.skyOff%W)+W)%W), y=Math.floor(H/2-blast.mtn.height+2);
  g.drawImage(blast.mtn, -off, y); g.drawImage(blast.mtn, W*2-off, y);
}
// the sharp layer: chord names on the signs and cars, crisp at any size
function krLabelsBegin(){
  if(!blast.sharp) return; blast.lg=sharpBegin(blast.sharp);
  if(blast.lg){ blast.lg.textAlign="center"; blast.lg.textBaseline="middle"; }
}
function krLabel1(x, y, size, text, col, done){
  const g=blast.lg; if(!g || !g.fillText || size<4) return;
  const px=PX, fs=Math.round(size*px);
  if(fs<9 || y*px<92) return;
  g.font=`400 ${Math.min(fs, 46)}px "Press Start 2P","Minichord Lab Accidentals",monospace`;
  if(col){ g.fillStyle="#000"; g.fillText(text, x*px+2, y*px+2); g.fillStyle=col; } else g.fillStyle="#FFF";
  g.fillText(text, x*px, y*px);
  if(done){ g.strokeStyle="#7FE08A"; g.lineWidth=2; }
}

// ---------- the engine ----------
// a low hum that rises with the speed, kept down while a chord's being played so it never hides one
function krEngine(on){
  if(!on) return krQuiet();
  if(blast.engine || !settings.sounds || !piano.ctx) return;
  try{ const ctx=piano.ctx, o=ctx.createOscillator(), f=ctx.createBiquadFilter(), g=ctx.createGain();
    o.type="sawtooth"; o.frequency.value=40; f.type="lowpass"; f.frequency.value=380; g.gain.value=0;
    o.connect(f).connect(g).connect(ctx.destination); o.start();
    blast.engine={o,g}; krEngineLoop(); }catch(e){}
}
function krEngineLoop(){
  const e=blast && blast.engine; if(!e || blast.kind!=="racer") return;
  try{ const t=piano.ctx.currentTime, f=blast.speed/(blast.max||30);
    e.o.frequency.setTargetAtTime(38+f*70+(blast.clock<blast.boostUntil?18:0), t, .08);
    e.g.gain.setTargetAtTime(blast.phase==="play" ? (quietFor(1500) ? .03 : .008) : 0, t, .1); }catch(err){}
  setTimeout(krEngineLoop, 90);
}
function krQuiet(){ const e=blast && blast.engine; if(!e) return; blast.engine=null; try{ e.g.gain.setTargetAtTime(0, piano.ctx.currentTime, .05); e.o.stop(piano.ctx.currentTime+.3); }catch(err){} }

// ---------- the next row, for the AHEAD board and the hint ----------
function krNextRow(){ if(!blast.rowAt) return null; const from=Math.floor((blast.pos+KR_PLAYER_Z)/KR_SEG)+1;
  for(let i=from;i<from+KR_DRAW*2;i++){ const r=blast.rowAt.get(i); if(r && !r.done) return r; } return null; }

// ---------- power-ups ----------
// capsules on the road, taken by driving through them: one at a time
//   SLIPSTREAM   for 8 seconds every gate of the key in a row collects itself, whichever lane you're in
//   ROLL CAGE    the next crash costs nothing
//   YELLOW FLAG  for 8 seconds everything slows down, the clock too
//   DA CAPO      a life back, or one more (powers.js: it's every game's)
const KR_POWERS={
  slip:   {name:"SLIPSTREAM",  icon:"💨", page:"FOR 8 SECONDS EVERY GATE OF THE KEY IN A ROW COLLECTS ITSELF, WHICHEVER LANE YOU'RE IN.", say:"EVERY GATE OF THE KEY IS YOURS"},
  cage:   {name:"ROLL CAGE",   icon:"🛡️", page:"THE NEXT CRASH COSTS NOTHING.", say:"THE NEXT CRASH COSTS NOTHING"},
  yellow: {name:"YELLOW FLAG", icon:"🚩", page:"FOR 8 SECONDS EVERYTHING SLOWS DOWN, THE CLOCK TOO.", say:"EVERYTHING SLOWS DOWN"},
  dacapo: DA_CAPO,
};
const krPowerLook=k=>`<span class="krcap pu-${k}"><i class="puicon">${KR_POWERS[k].icon}</i></span>`;
function krPowerGet(k){
  const P=KR_POWERS[k];
  if(P.instant){ if(blast.phase==="play"){ daCapo(); krBar(); } return; }
  if(k==="slip") blast.slip=blast.clock+8;
  if(k==="cage") blast.cage=true;
  if(k==="yellow") blast.yellowUntil=blast.clock+8;
  blast.power=k; if(blast.phase==="play"){ banner(P.name+"!", P.say); sfx("power"); }
  krBar();
}
function krPowerHud(){
  const k=blast && blast.power; if(!k) return "";
  const on = k==="cage" ? blast.cage : k==="slip" ? blast.clock<blast.slip : k==="yellow" ? blast.clock<blast.yellowUntil : false;
  if(!on){ blast.power=null; return ""; }
  return ` · ${KR_POWERS[k].icon} ${KR_POWERS[k].name}`;
}

// ---------- the demo ----------
// the race drives itself: it steers for the key's chords, opens gates, pulls a car over, turbos
function krAutopilot(){
  const r=krNextRow(); if(!r) return;
  const g=r.signs.find(s=>s.chord && s.chord.inKey) ; if(g) blast.targetX=KR_LANES[g.lane];
}
function krDemo(){
  if(!blast || blast.kind!=="racer") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endKrDemo);
  blast.phase="demo"; blast.level=0;
  blast.max=krMax(); krReset();
  const key=krKey("C", false); blast.key=key; krKeySign();
  krRoad(blast.segs, 1, 30, 1, 0, 0); krCourse(blast.segs, 900, true);
  krPlaceRows(40, 900, key, KR_LEVELS[0]);
  blast.cars=[{z:KR_SEG*120, x:0, speed:blast.max*.4, chord:krChord(key,"IV"), hue:2, yield:0, ahead:true}];
  blast.st="race"; blast.demoAuto=true; blast.startSeg=4;
  sfx("attract");
  (async()=>{
    try{
      say("KEY RACER","POLE POSITION THROUGH THE KEY. THIS RACE IS IN C MAJOR."); await step(3400);
      say("STEER ON THE HARP","ITS LOW STRINGS ARE THE LEFT OF THE ROAD, ITS HIGH ONES THE RIGHT."); for(const s of [2,5,9,6]){ helpString(s); await step(700); } helpString(-1);
      say("FUEL AND OIL","THE KEY'S CHORDS ARE FUEL: DRIVE THROUGH THEM. THE OTHERS ARE OIL: STEER ROUND. THE AHEAD BOARD ON THE DASH SHOWS WHAT'S COMING."); await step(5600);
      say("PULL OVER","A CAR CARRIES A CHORD. PLAY IT AND IT PULLS OVER TO LET YOU BY."); await step(1600);
      const car=blast.cars[0]; if(car){ demoPlay(krVoice(car.chord)); car.yield=1; } await step(2600);
      say("TURBO","V THEN I, G THEN C: THE TURBO."); demoPlay(krVoice(krChord(key,"V"))); await step(700); demoPlay(krVoice(key.home));
      blast.turboOn=true; blast.boostUntil=blast.clock+2.6; sfx("turbo"); await step(3000);
      say("GATES","FROM THE FOURTH CIRCUIT A GATE OPENS ONLY IF YOU PLAY ITS CHORD ON THE WAY IN. UNOPENED, IT SHUTS IN YOUR FACE."); await step(4600);
      say("GRAND PRIX","EIGHT CIRCUITS, EACH A KEY. QUALIFY BY PLAYING THE KEY'S SEVEN CHORDS IN ORDER: YOUR TIME IS YOUR PLACE ON THE GRID."); await step(4600);
      say("ENDURANCE","ROUND THE CIRCLE OF FIFTHS AGAINST THE CLOCK. PLAY THE NEW KEY'S I BEFORE EACH CHECKPOINT FOR EXTRA TIME."); await step(4600);
      endKrDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
// a chord voiced plainly for the demo's piano: root position from C3
const krVoice=c=>FORM[c.q].map(f=>48+c.pc+f[1]);
function endKrDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoAuto=false; krReset(); blast.st="idle"; blast.key=null; krKeySign(); helpChord(null);
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
