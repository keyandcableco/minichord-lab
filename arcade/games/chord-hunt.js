// Chord Hunt: Duck Hunt by ear. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Hunt ----------
// Ear training as a duck hunt, and always relative: a chord is never named out of the blue, only
// against home. Each round opens with its key, the dog sniffing through the grass while a cadence
// plays and the sign goes up (KEY OF G). Then each duck: home sounds first, the tonic chord, and then
// the duck's own chord as it rises out of the grass. Name it by ear (vi, say) and play it on the
// buttons (Em in G) to shoot. Three shells a duck: a wrong chord spends one, and the readout says
// what it was (Am: ii). A duck that isn't shot in time flies away, the sky goes pink, the dog laughs,
// and the answer is played and shown, home then the duck, so the ear connects the two.
//
// Ten ducks a round, and enough of them hit (six, rising to nine) clears it and moves on; too few
// costs a life and the round is flown again, in a new key. The key changes every round, so nothing
// can be learnt by absolute pitch, and the chords are voiced afresh each time, so the top note gives
// nothing away.
//
// The levels climb from I, IV and V to the relative minor, every triad in the key, minor keys,
// sevenths, chords borrowed from the parallel minor, secondary dominants, inversions (the bass on the
// third or fifth), flocks (progressions, two to four ducks shot in order, the famous ones named), and
// migration, where every duck comes from a key of its own and only its tonic says where home is.
//
// The field guide along the grass lists the round's chords, numeral and name; it can show numerals
// only, or nothing, for more points. The harp is the duck call: pluck a low string to hear home again,
// a high one to hear the duck again (H and R on the keyboard). Golden ducks carry a chord from the
// next level up, worth triple and harmless if they get away. A first-shot hit with no help (no
// replay, no power-up) builds the PURE EAR multiplier, up to ×4. The dog sometimes fetches a
// power-up, a tag with a chord on it: play the chord to take it. Power-ups are ways of listening:
// chord-hunt-power.js.
//
// The minichord's key signature stays at C, so its buttons play the letters they're marked with, as in
// the other arcade games: a chord with a sharp or flat root is its letter and the modifier. The game
// sets the modifier's way once for the key, sharpening in a sharp key and flattening in a flat one
// (unless the player sets it by hand), which helps every duck in that key alike and so names none of
// them; the keys a level deals are only those whose chords all lean the same way (D major's F♯ and its
// borrowed B♭ never meet).

// ---------- the chords a duck can be ----------
// Each is a place in the key: its numeral, its root's distance above the tonic (letters, then
// semitones), its kind of chord, what it's called, and where it goes when it resolves.
const HD_MAJ={
  "I":     {st:0,se:0, q:"",     fn:"THE TONIC: HOME"},
  "ii":    {st:1,se:2, q:"m",    fn:"THE SUPERTONIC", to:"V"},
  "iii":   {st:2,se:4, q:"m",    fn:"THE MEDIANT", to:"vi"},
  "IV":    {st:3,se:5, q:"",     fn:"THE SUBDOMINANT", to:"I"},
  "V":     {st:4,se:7, q:"",     fn:"THE DOMINANT", to:"I"},
  "vi":    {st:5,se:9, q:"m",    fn:"THE SUBMEDIANT", to:"ii"},
  "vii°":  {st:6,se:11,q:"°",    fn:"THE LEADING TONE", to:"I"},
  "Imaj7": {st:0,se:0, q:"maj7", fn:"THE TONIC, WITH ITS 7TH"},
  "ii7":   {st:1,se:2, q:"m7",   fn:"THE SUPERTONIC 7TH", to:"V7"},
  "iii7":  {st:2,se:4, q:"m7",   fn:"THE MEDIANT 7TH", to:"vi7"},
  "IVmaj7":{st:3,se:5, q:"maj7", fn:"THE SUBDOMINANT, WITH ITS 7TH", to:"V7"},
  "V7":    {st:4,se:7, q:"7",    fn:"THE DOMINANT 7TH", to:"I"},
  "vi7":   {st:5,se:9, q:"m7",   fn:"THE SUBMEDIANT 7TH", to:"ii7"},
  "iv":    {st:3,se:5, q:"m",    fn:"BORROWED FROM THE MINOR", to:"I"},
  "♭III":  {st:2,se:3, q:"",     fn:"BORROWED FROM THE MINOR", to:"IV"},
  "♭VI":   {st:5,se:8, q:"",     fn:"BORROWED FROM THE MINOR", to:"V"},
  "♭VII":  {st:6,se:10,q:"",     fn:"BORROWED FROM THE MINOR", to:"I"},
  "V7/V":  {st:1,se:2, q:"7",    fn:"V OF V: A SECONDARY DOMINANT", to:"V"},
  "V7/vi": {st:2,se:4, q:"7",    fn:"V OF vi: A SECONDARY DOMINANT", to:"vi"},
  "V7/ii": {st:5,se:9, q:"7",    fn:"V OF ii: A SECONDARY DOMINANT", to:"ii"},
  "V7/IV": {st:0,se:0, q:"7",    fn:"V OF IV: A SECONDARY DOMINANT", to:"IV"},
  "III":   {st:2,se:4, q:"",     fn:"A CHROMATIC MEDIANT", to:"vi"},
  "VI":    {st:5,se:9, q:"",     fn:"A CHROMATIC MEDIANT", to:"ii"},
};
const HD_MIN={
  "i":   {st:0,se:0, q:"m", fn:"THE TONIC: HOME"},
  "ii°": {st:1,se:2, q:"°", fn:"THE SUPERTONIC", to:"V"},
  "III": {st:2,se:3, q:"",  fn:"THE MEDIANT: THE RELATIVE MAJOR", to:"VI"},
  "iv":  {st:3,se:5, q:"m", fn:"THE SUBDOMINANT", to:"V"},
  "V":   {st:4,se:7, q:"",  fn:"THE DOMINANT, FROM THE HARMONIC MINOR", to:"i"},
  "V7":  {st:4,se:7, q:"7", fn:"THE DOMINANT 7TH", to:"i"},
  "VI":  {st:5,se:8, q:"",  fn:"THE SUBMEDIANT", to:"V"},
  "VII": {st:6,se:10,q:"",  fn:"THE SUBTONIC", to:"III"},
};
const HD_KEYS_NEAR=["C","G","F"], HD_KEYS_SOME=["C","G","F","D","B♭"];
const HD_KEYS_MAJ=["C","G","D","A","E","B","F","B♭","E♭","A♭","D♭"];
const HD_KEYS_MIN=["A","E","B","F♯","D","G","C","F"];
const HD_DIATONIC=["I","ii","iii","IV","V","vi","vii°"], HD_MINOR=["i","ii°","III","iv","V","VI","VII"];
// The levels. pool: the chords a duck can be; gold: a golden duck's, a taste of what comes next;
// flats: the borrowed chords, whose roots need the modifier flattening; inv: inversions; flocks:
// progressions; roam: every duck from a key of its own.
const HD_LEVELS=[
  {n:"Home and away", keys:HD_KEYS_NEAR, pool:["I","IV","V"], gold:["vi"]},
  {n:"The relative minor", keys:HD_KEYS_SOME, pool:["I","IV","V","vi"], gold:["ii","iii"]},
  {n:"Every triad", keys:HD_KEYS_MAJ, pool:HD_DIATONIC, gold:["V7"]},
  {n:"Minor keys", keys:HD_KEYS_MIN, minor:true, pool:HD_MINOR, gold:["V7"]},
  {n:"Sevenths", keys:HD_KEYS_MAJ, pool:["I","Imaj7","ii7","iii7","IV","IVmaj7","V","V7","vi","vi7"], gold:["iv","♭VII"]},
  {n:"Borrowed chords", keys:HD_KEYS_MAJ, flats:true, pool:["I","ii","IV","V","vi","iv","♭III","♭VI","♭VII"], gold:["V7/V"]},
  {n:"Secondary dominants", keys:HD_KEYS_MAJ, pool:["I","ii","IV","V","vi","V7","V7/V","V7/vi","V7/ii","V7/IV"], gold:["III","VI"]},
  {n:"Inversions", keys:HD_KEYS_MAJ, inv:true, pool:["I","ii","iii","IV","V","vi"], gold:["V7/V","♭VII"]},
  {n:"Flocks", keys:HD_KEYS_MAJ, flats:true, flocks:true, pool:["I","ii","iii","IV","V","vi","iv","♭VII"]},
  {n:"Migration", keys:HD_KEYS_MAJ, flats:true, roam:true, pool:["I","ii","iii","IV","V","vi","vii°","V7","iv","♭VI","♭VII","V7/V","V7/vi"],
    minorPool:HD_MINOR.concat("V7"), gold:["III","VI","♭III"]},
];
// Progressions a flock flies, the famous ones named once they're shot.
const HD_FLOCKS=[
  {p:["I","IV","V"], n:"THREE CHORDS AND THE TRUTH"},
  {p:["ii","V","I"], n:"THE ii–V–I"},
  {p:["IV","V","I"], n:"THE FULL CADENCE"},
  {p:["I","vi","IV"], n:"THE START OF THE FIFTIES"},
  {p:["I","V","vi","IV"], n:"THE AXIS PROGRESSION"},
  {p:["I","vi","IV","V"], n:"THE FIFTIES PROGRESSION"},
  {p:["vi","IV","I","V"], n:"THE AXIS, FROM vi"},
  {p:["I","V","vi","iii"], n:"PACHELBEL'S CANON, THE START"},
  {p:["IV","V","iii","vi"], n:"THE ROYAL ROAD"},
  {p:["vi","ii","V","I"], n:"ROUND THE CIRCLE"},
  {p:["I","♭VII","IV"], n:"THE MIXOLYDIAN RIFF"},
  {p:["IV","iv","I"], n:"THE MINOR PLAGAL"},
  {p:["I","iii","IV"], n:"THE STEP UP"},
];
const HD_ROUND=10;                                        // ducks a round
const hdLevel=(n=blast.level)=>HD_LEVELS[Math.min(n, HD_LEVELS.length-1)];
const hdQuota=()=> blast.level>=HD_LEVELS.length ? 9 : [6,6,6,7,7,7,8,8,8,8][blast.level];
// the field guide: names, numerals only, or nothing; less to read scores more (kit.js)
const HD_GUIDES=["NAMES","NUMERALS","NONE"];
const hdGuide=()=> blast && blast.kind==="hunt" && blast.phase==="play" && blast.guideAt!=null ? blast.guideAt : (saved.hdGuide||0);   // fixed for a game, as its multiplier is

// ---------- keys and their chords ----------
// a key: its tonic's name, major or minor, and the key signature the minichord is set to (a minor
// key's is its relative major's)
const HD_REL={A:0,E:1,B:2,"F♯":3,D:-1,G:-2,C:-3,F:-4};
function hdKey(name, minor){
  const f = minor ? HD_REL[name] : +Object.keys(KEY_BY_FIFTHS).find(k=>KEY_BY_FIFTHS[k]===name);
  return {name, minor:!!minor, f, label: minor ? `${name} MINOR` : `${name} MAJOR`};
}
const hdTable=key=> key.minor ? HD_MIN : HD_MAJ;
const hdHome=key=> key.minor ? "i" : "I";
// a chord of the key, by its numeral, spelled: null if it can't be spelled plainly
function hdChord(key, num){
  const d=hdTable(key)[num]; if(!d) return null;
  const root=above(key.name, d.st, d.se); if(!root || /^[CF]♭|^[EB]♯|[𝄪𝄫]|♭♭|♯♯/.test(root)) return null;
  const tones=spellChord(root, d.q); if(!tones) return null;
  return {num, root, q:d.q, sym:root+d.q, pc:pcOfName(root), fn:d.fn, to:d.to||null, tones};
}
// the keys a level can use: every chord it could ask for, spelled plainly
function hdKeyOk(key, nums){ return nums.every(n=>!!hdChord(key, n)) && hdLean(key, nums)!=null; }
// which way the modifier goes for a key's chords: 1 sharpening, -1 flattening, 0 for neither (C major's
// own); null if some need it each way, which can't be set once for the key
function hdLean(key, nums){
  let up=false, down=false;
  for(const n of nums){ const c=hdChord(key,n); if(!c) continue; const a=parse(c.root).acc; if(a>0) up=true; if(a<0) down=true; }
  return up && down ? null : up ? 1 : down ? -1 : 0;
}
// keys dealt from a shuffled bag, each used once before any comes round again
function hdDeal(name, items){
  const bags=blast.hdBags||(blast.hdBags={}), id=items.join(",");
  let b=bags[name]; if(!b || b.id!==id || !b.left.length) b=bags[name]={id, left:shuffle(items)};
  return b.left.pop();
}
function hdPickKey(L, minor=!!L.minor){
  const names = minor ? HD_KEYS_MIN : L.keys, pool = minor ? (L.minorPool||HD_MINOR) : L.pool;
  for(let k=0;k<30;k++){ const key=hdKey(hdDeal(minor?"min":"maj", names), minor); if(hdKeyOk(key, pool) && key.name!==blast.hdLastKey) return key; }
  return hdKey(minor?"A":"C", minor);
}
// the numeral of whatever was played, in this key: a wrong shot says what it was
function hdNumeralOf(pitches, key){
  for(const [num,d] of Object.entries(hdTable(key))){ const c=hdChord(key,num); if(c && isChord(pitches, c.pc, d.q)) return num; }
  return null;
}

// ---------- voicing: the page plays every chord, voiced afresh ----------
// The bass low (its root, or at the inversion levels its 3rd or 5th), the rest close together in the
// middle of the piano. The tonic gets a random voicing each time; the duck's chord is voiced nearest
// to it, as a pianist would, so the top note says nothing about which chord it is.
const hdIv=q=>FORM[q].map(f=>f[1]);
function hdVoice(pc, q, {bass=0, near=null}={}){
  const pcs=hdIv(q).map(x=>mod(pc+x,12)), low=40+mod(pcs[bass]-40,12);
  const opts=[];
  for(let r=0;r<pcs.length;r++){ const rot=[...pcs.slice(r),...pcs.slice(0,r)];
    for(let s=55;s<=66;s++){ if(mod(s,12)!==rot[0]) continue;
      const up=[s]; for(let k=1;k<rot.length;k++){ let n=up[k-1]+1; while(mod(n,12)!==rot[k]) n++; up.push(n); }
      opts.push(up); } }
  const far=(a,b)=>a.reduce((t,n)=>t+Math.min(...b.map(m=>Math.abs(m-n))),0)+b.reduce((t,n)=>t+Math.min(...a.map(m=>Math.abs(m-n))),0);
  const up = near ? opts.sort((a,b)=>far(a,near)-far(b,near))[0] : rnd(opts);
  return {notes:[low,...up], upper:up, bass:low};
}
// play a list of moments: {at (seconds), notes, dur}; returns how long it all takes, in ms
function hdPlay(seq){
  if(settings.sounds && piano.ctx){ const go=()=>seq.forEach(s=>piano.play(s.notes,{when:.03+s.at, dur:s.dur, vel:s.vel||88}));
    piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{}); }
  return Math.round(1000*Math.max(0,...seq.map(s=>s.at+s.dur)));
}
// the round's cadence, I IV V I (i iv V i in a minor key), each chord voiced near the one before
function hdCadence(key){
  const nums = key.minor ? ["i","iv","V","i"] : ["I","IV","V","I"];
  let prev=null; return nums.map((n,i)=>{ const c=hdChord(key,n), v=hdVoice(c.pc, c.q, {near:prev}); prev=v.upper; return {at:i*.62, notes:v.notes, dur:i===3?1.1:.56}; });
}

// ---------- the game ----------
function genHunt(){
  return {kind:"hunt", prompt:"Chord Hunt", sub:"Duck Hunt by ear. Home sounds, then the duck's chord: name it against home and play it on the buttons to shoot it down.",
    answer:{type:"hunt", get name(){ const d=blast && blast.kind==="hunt" && blast.duck; return d ? d.targets.map(t=>t.sym).join(" ") : "the duck's chord"; }},
    get hint(){ const d=blast && blast.kind==="hunt" && blast.duck; return d ? `It's ${d.targets.map(t=>`${t.num}, ${t.sym}`).join(", then ")}.` : "Listen for home first."; },
    context:0};
}
function startHunt(){
  blast={kind:"hunt", score:0, lives:3, level:0, round:0, ducks:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), birds:[], duck:null, tag:null, key:null, ear:0};
  hdDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  hdMenu();
  blast.raf=requestAnimationFrame(hdTick);
}
// The minichord's side: the harp chromatic, so a low string and a high one are known (home and the
// duck again); untransposed; and between games the key signature at C.
function hdDevice(){
  if(!blast || blast.kind!=="hunt" || !canWrite()) return;
  arcadeSetup(()=>{ asHarp(); if(hasSetting(30)) ensure(30,0); if(hasSetting(35) && blast.phase!=="play") borrow(35, keyIndexOf(0)); if(hasSetting(31)) borrow(31, mc.params[31]??0); });
}
function buildHuntField(box){
  const field=document.createElement("div"); field.className="field arcade hunt"; field.setAttribute("aria-label","The hunting ground");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  field.insertAdjacentHTML("beforeend", `<div class="hdtint"></div><div class="hdflash"></div>
    <div class="hdkey" hidden></div>
    <div class="hddog" hidden></div>
    <canvas class="hdgrass"></canvas>
    <div class="hdguide"></div>
    <div class="hdpanel">
      <div class="hdround">R=<b>1</b></div>
      <div class="hdshots"><span>SHOT</span><span class="hdshells"></span></div>
      <div class="hdhits"><span>HIT</span><span class="hdtally"></span></div>
      <div class="hdear" title="First-shot hits with no help build it">EAR <b>×1</b></div>
      <div class="hdbtns"><button type="button" class="hdhome" title="Hear home again: a low harp string, or H">▶ HOME</button><button type="button" class="hdagain" title="Hear the duck again: a high harp string, or R">▶ DUCK</button></div>
    </div>`);
  box.append(field);
  if(blast && blast.kind==="hunt"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), dogEl:field.querySelector(".hddog"), keyEl:field.querySelector(".hdkey"), guideEl:field.querySelector(".hdguide"),
      panelEl:field.querySelector(".hdpanel"), grassEl:field.querySelector(".hdgrass"), tintEl:field.querySelector(".hdtint"), flashEl:field.querySelector(".hdflash")});
    field.querySelector(".hdhome").onclick=()=>hdReplay("home");
    field.querySelector(".hdagain").onclick=()=>hdReplay("duck");
    setTimeout(()=>{ hdLayout(); hdPanel(); hdGuideDraw(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  hdBar(); setTimeout(helperSync);
}
// where things are: the sky the ducks fly in, the grass they rise from, the panel at the foot
function hdLayout(){
  if(!blast || blast.kind!=="hunt" || !blast.field) return;
  const W=fieldW(), H=fieldH(), panel=46, grassH=Math.max(72, Math.min(120, H*.2)), grassTop=H-panel-grassH;
  blast.L={W, H, panel, grassTop, skyTop:84, grassF:grassTop/H};
  const cv=blast.grassEl, px=Math.max(3, Math.ceil(W/340)), top=grassTop-14, gh=H-panel-top;
  cv.style.top=`${top}px`; cv.style.height=`${gh}px`;
  const w=Math.max(1,Math.floor(W/px)), h=Math.max(1,Math.floor(gh/px));
  if(cv.width!==w || cv.height!==h){ cv.width=w; cv.height=h; hdPaintGrass(cv.getContext("2d"), w, h); }
  blast.guideEl.style.bottom=`${panel+8}px`;
  if(blast.fx) blast.fx.bg=null;                             // the sky's horizon moves with the grass
}
// the tall grass the ducks rise from and the dog dives into, drawn in front of them
function hdPaintGrass(g, w, h){
  if(!g || !g.fillRect) return;
  const rand=(seed=>()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; })(w*31+h);
  const top=4;
  g.clearRect(0,0,w,h);
  g.fillStyle="#1F4A1C"; g.fillRect(0,top+2,w,h);
  for(let x=0;x<w;x++){ const tall=2+Math.floor(rand()*5); g.fillStyle=rand()<.5?"#2E6B25":"#3C8A2E"; g.fillRect(x,top+2-tall+2,1,tall+2);
    if(rand()<.25){ g.fillStyle="#58A83F"; g.fillRect(x,top+3-tall,1,2); } }
  for(let i=0;i<w*h/22;i++){ g.fillStyle=rand()<.5?"#163A15":"#2A5F22"; g.fillRect(Math.floor(rand()*w),top+4+Math.floor(rand()*(h-top-4)),1,2+Math.floor(rand()*2)); }
  g.fillStyle="#3B2A1A"; g.fillRect(0,h-2,w,2);
}
function hdBar(){
  if(!blast || blast.kind!=="hunt" || !blast.hud) return;
  const L=hdLevel();
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">${blast.round?`ROUND ${blast.round} · `:""}LEVEL ${blast.level+1} · ${L.n.toUpperCase()}${hdPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}
// the panel at the foot, as the old game had it: the round, the shells left, the ten ducks' tally
// with the line to reach, and the pure ear multiplier
const HD_TALLY_DUCK=hdSvg(["......GG","....GGGO","BBBBBBC.","BBBBBB..",".BBBB..."],"hdmini");
const HD_SHELL=`<svg viewBox="0 0 3 6" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="2" width="3" height="4" fill="#FF4B3E"/><rect x="0" y="0" width="3" height="2" fill="#FFD35A"/></svg>`;
function hdPanel(){
  if(!blast || blast.kind!=="hunt" || !blast.panelEl) return;
  const p=blast.panelEl, r=blast.rnd, d=blast.duck, q=hdQuota();
  p.querySelector(".hdround b").textContent=blast.round||1;
  const shells = d ? d.shells : 3;
  p.querySelector(".hdshells").innerHTML=[0,1,2,3,4,5].slice(0, d ? Math.max(3,d.shellsMax) : 3).map(i=>`<i class="${i<shells?"":"spent"}">${HD_SHELL}</i>`).join("");
  const slots=r ? r.slots : [];
  p.querySelector(".hdtally").innerHTML=[...Array(HD_ROUND)].map((_,i)=>`<i class="${slots[i]||""}${r && d && d.targets.some(t=>t.slot===i && !t.hit) ? " now":""}${i===q-1?" quota":""}">${HD_TALLY_DUCK}</i>`).join("");
  p.querySelector(".hdear b").textContent=`×${hdEarMult()}`;
  p.querySelector(".hdear").classList.toggle("hot", hdEarMult()>1);
}
// Pure ear: first-shot hits without a replay or a power-up, in a row
const hdEarMult=()=>{ const e=blast.ear||0; return e>=10 ? 4 : e>=6 ? 3 : e>=3 ? 2 : 1; };
// the field guide: the round's chords, as the player chose to see them
function hdGuideDraw(){
  const el=blast && blast.guideEl; if(!el) return;
  const key=blast.key, L=hdLevel(), mode=hdGuide();
  if(!key || mode===2 || blast.phase!=="play"){ el.innerHTML=""; el.hidden=true; return; }
  const pool = key.minor ? (L.minorPool||HD_MINOR) : L.pool;
  el.hidden=false;
  el.innerHTML=pool.map(n=>{ const c=hdChord(key,n); return c ? `<span><b>${n}</b>${mode===0?`<i>${c.sym}</i>`:""}</span>` : ""; }).join("");
}
function hdKeySign(key){
  const el=blast.keyEl; if(!el) return;
  el.hidden=!key; if(!key) return;
  el.innerHTML=`KEY OF <b>${key.label}</b>`;
  el.classList.remove("new"); void el.offsetWidth; el.classList.add("new");
}
// the minichord follows the key: its signature held at C, so the buttons play their letters, and the
// modifier's way set for the key's sharps or flats (unless the player sets it by hand)
function hdApplyKey(key){
  blast.key=key; blast.hdLastKey=key.name;
  const L=hdLevel(), lean=hdLean(key, key.minor ? (L.minorPool||HD_MINOR) : L.pool);
  if(canWrite() && hasSetting(35) && mc.params[35]!==keyIndexOf(0)) borrow(35, keyIndexOf(0));
  if(lean && autoMod() && canWrite() && hasSetting(31)) ensure(31, lean>0 ? 0 : 1);
  modPill(); hdKeySign(key); hdGuideDraw();
  helpChord(null); const home=hdChord(key, hdHome(key)); if(home) helpChord(home.root, home.q);   // beginner mode lights home: where it is, not what the duck is
}

const HDMENU_G={key:"hunt", title:"CHORD HUNT",
  rules:()=>`<p>EVERY ROUND OPENS WITH ITS KEY. THEN, FOR EACH DUCK, HOME SOUNDS FIRST, THE TONIC CHORD, AND THEN THE DUCK'S OWN CHORD.</p><p>NAME IT AGAINST HOME AND PLAY IT ON THE BUTTONS TO SHOOT: vi IN G IS Em. THREE SHELLS A DUCK, AND A WRONG CHORD SPENDS ONE.</p><p>HIT ENOUGH OF THE TEN TO CLEAR THE ROUND, OR THE DOG LAUGHS AND IT COSTS A LIFE.</p><p>PLUCK THE HARP TO HEAR IT AGAIN: A LOW STRING FOR HOME, A HIGH ONE FOR THE DUCK.</p><p>FIRST-SHOT HITS WITH NO HELP BUILD YOUR PURE EAR, UP TO ×4. GOLDEN DUCKS SING A CHORD FROM THE NEXT LEVEL UP: TRIPLE POINTS, AND NO HARM IF THEY GET AWAY.</p><p>NOW AND THEN THE DOG FETCHES A POWER-UP. PLAY THE CHORD ON ITS TAG TO TAKE IT.</p>`,
  stat:()=>`DUCKS ${blast.ducks} · ROUND ${blast.round}`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("FIELD GUIDE", ["NAMES","NUMERALS ×1.25","NONE ×1.5"], ()=>hdGuide(), i=>{ saved.hdGuide=i; save(); });
  },
  levels:HD_LEVELS,
  begin:i=>beginHunt(i), demo:()=>hdDemo(), modNote:"title"};
function hdMenu(over){ arcadeMenu(HDMENU_G, over); }
function beginHunt(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  hdClear();
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, round:0, ducks:0, ear:0, phase:"play", over:false, duck:null, tag:null, key:null, rnd:null, hdBags:null, hdPower:null, hdLastKey:null, modFor:null, guideAt:saved.hdGuide||0});
  saved.huntStart=level; save();
  stats.streak=0; scoreboard(); hdLayout(); hdBar(); hdPanel();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(hdTick);
  banner(`LEVEL ${level+1}`, `${hdLevel().n.toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start");
  if(!settings.sounds) gameLater(()=>banner("TURN THE SOUND ON", "THIS ONE'S ALL EARS"), 2400);
  gameLater(()=>hdRoundStart(), 1800);
}

// ---------- a round ----------
// The dog walks out sniffing while the key's cadence plays and its sign goes up, then dives into the
// grass. At the migration level there's no cadence: each duck brings its own key.
function hdRoundStart(){
  if(!blast || blast.phase!=="play") return;
  const L=hdLevel();
  blast.round++; blast.rnd={slots:[], n:0, gold:false, last:null};
  hdBar(); hdPanel();
  banner(`ROUND ${blast.round}`, L.roam ? "EVERY DUCK FROM A KEY OF ITS OWN" : `${L.n.toUpperCase()} · ${hdQuota()} OF ${HD_ROUND} TO CLEAR`);
  if(L.roam){ blast.key=null; hdKeySign(null); hdGuideDraw(); gameLater(()=>hdNextDuck(), 2200); return; }
  const key=hdPickKey(L);
  gameLater(()=>{ if(blast.phase!=="play") return;
    hdApplyKey(key);
    const ms=hdPlay(hdCadence(key));
    hdDogWalk(ms);
    gameLater(()=>hdNextDuck(), ms+1300); }, 1500);
}
// the next duck, or flock; or the round's over
function hdNextDuck(){
  if(!blast || blast.phase!=="play") return;
  const L=hdLevel(), r=blast.rnd;
  if(r.n>=HD_ROUND) return hdRoundEnd();
  if(L.roam){ const key=hdPickKey(L, Math.random()<.35); hdApplyKey(key); }
  const key=blast.key;
  // a golden duck, once a round at most, extra to the ten: a chord from the next level up (in a major
  // key: a minor key's III and VI are its own chords, not the chromatic ones)
  const gold = !r.gold && L.gold && r.n>=3 && (key.minor===!!L.minor) && (Math.random()<.16 || (r.n===HD_ROUND-1 && Math.random()<.5));
  let targets=null, flock=null;
  if(gold){
    const pool=key.minor ? (L.minorPool||HD_MINOR) : L.pool, lean=hdLean(key, pool);
    const opts=L.gold.filter(n=>{ const g=hdLean(key,[n]); return g===0 || g===lean; }).map(n=>hdChord(key,n)).filter(Boolean);   // never one the modifier's way can't reach
    if(opts.length){ r.gold=true; targets=[rnd(opts)]; }
  }
  if(!targets && L.flocks && HD_ROUND-r.n>=2){
    const fits=HD_FLOCKS.filter(f=>f.p.length<=HD_ROUND-r.n && f.p.every(n=>hdChord(key,n)) && f!==r.lastFlock);
    if(fits.length){ flock=rnd(fits); r.lastFlock=flock; targets=flock.p.map(n=>hdChord(key,n)); }
  }
  if(!targets){
    const pool=key.minor ? (L.minorPool||HD_MINOR) : L.pool;
    // now and then a decoy: the same chord as the last duck. Did you hear it, or assume it changed?
    let num = r.last && blast.level>=2 && Math.random()<.12 && pool.includes(r.last) ? r.last : hdDeal("deg:"+key.minor, pool);
    if(num===r.last && Math.random()<.5) num=hdDeal("deg:"+key.minor, pool);   // the bag, mostly: a repeat is rarer than chance would make it
    targets=[hdChord(key,num)];
  }
  if(!gold) targets.forEach(t=>{ t.slot=r.n++; });
  r.last=targets[targets.length-1].num;
  hdLaunch(targets, {gold, flock});
}
// The duck's moment: home, then its chord (or a flock's progression), with whatever power-up is
// helping, the ducks rising out of the grass as their chord sounds; then the clock runs.
function hdLaunch(targets, {gold=false, flock=null, demo=false}={}){
  const key=blast.key, L=hdLevel(), P=k=>!demo && hdPowerOn(k);
  const home=hdChord(key, hdHome(key)), hv=hdVoice(home.pc, home.q);
  const inv = L.inv && !gold;
  const voiced=targets.map(t=>{ const b = inv ? 1+Math.floor(Math.random()*2) : 0; return {t, bass:b, ...hdVoice(t.pc, t.q, {bass:b, near:hv.upper})}; });
  // the plan: home; then (BASS SCOPE) each bass alone before its chord; the chords; (ARPEGGIO) each
  // spelled upward, slowly; (RESOLVE) the last one going where it wants to go
  const seq=[{at:0, notes:hv.notes, dur:.85}], solo=targets.length===1;
  let t=1.15; const onset=[];
  voiced.forEach(v=>{
    if(P("bass")){ seq.push({at:t, notes:[v.bass], dur:.7, vel:96}); t+=.85; }
    onset.push(t); seq.push({at:t, notes:v.notes, dur: solo ? 1.4 : .9}); t+= solo ? 1.55 : 1.0;
  });
  if(P("arp")) voiced.forEach(v=>{ v.notes.forEach((n,i)=>seq.push({at:t+i*.3, notes:[n], dur:.5})); t+=v.notes.length*.3+.35; });
  if(P("resolve")){ const last=voiced[voiced.length-1], to=last.t.to ? hdChord(key, last.t.to) : home;
    if(to){ const tv=hdVoice(to.pc, to.q, {near:last.upper}); seq.push({at:t, notes:tv.notes, dur:1}); t+=1.15; } }
  const ms=hdPlay(seq);
  if(P("drone")) hdDrone(home.pc, ms/1000+30);
  const shells=Math.max(3, targets.length+2);
  const duck={targets:targets.map(x=>({...x, hit:false})), i:0, shells, shellsMax:shells, gold, flock, open:false, aided:false, first:true, voiced, home:hv, seq,
    tint:P("tint"), slow:P("slow"), left:0, total:0, demo};
  blast.duck=duck; hdPanel();
  // the ducks come up out of the grass as their chords sound, each where the grass is
  const W=blast.L.W, speed=(95+12*Math.min(blast.level,12))*(duck.slow?.6:1)/Math.sqrt(speedMul());
  targets.forEach((tg,i)=>gameLater(()=>{ if(blast.duck!==duck) return;
    const x=W*(.15+.7*((i+.5)/targets.length))+(Math.random()-.5)*W*.12;
    hdBirdNew(x, speed, {gold, n: targets.length>1 ? i+1 : 0, tint: duck.tint ? tg.q : null, target:i});
  }, onset[i]*1000));
  gameLater(()=>{ if(blast.duck!==duck) return;
    duck.open=true; duck.openAt=performance.now();
    duck.total = hdWindow(targets.length, duck.slow) + Math.max(0, ms/1000-onset[0]);
    duck.left=duck.total; }, onset[0]*1000);
}
// how long a duck flies before it's away: shorter with the speed and the level, longer for a flock
function hdWindow(n, slow){ return Math.max(2.4, 5*speedMul()*Math.pow(.95, blast.level))*(1+.55*(n-1))*(slow?1.6:1); }

// ---------- the ducks, flying ----------
// Each bird keeps its own position and heading; they zigzag up through the sky on diagonals, as
// the old ducks did, bounce off its edges, and turn now and then.
const HD_DUCK_UP=["....WW..........","....WWW.........","....WWWW..GGG...",".....WWWW.GGGG..",".....WWWWGGEGGOO","......WWWGGGG...","TT..BBBBBCCC....",".TTBBBBBBBBB....","..BBBBBBBBBB....","...BBBBBBBB.....","................","................"];
const HD_DUCK_DOWN=["................","................","..........GGG...","..........GGGG..",".........GGEGGOO",".........GGGG...","TT..BBBBBCCC....",".TTBBBBBBBBB....","..BBBWWWWBBB....","...BBWWWWBB.....","....WWWW........","....WWW........."];
// a sprite from rows of letters, one letter a colour (its class), a dot clear; runs of a letter as one rect
function hdSvg(rows, cls=""){
  const w=rows[0].length, h=rows.length; let r="";
  rows.forEach((row,y)=>{ for(let x=0;x<w;x++){ const c=row[x]; if(c==="."||c===" ") continue; let e=x; while(row[e+1]===c) e++; r+=`<rect class="p${c}" x="${x}" y="${y}" width="${e-x+1}" height="1"/>`; x=e; } });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const HD_DUCK=`<span class="hdfr f1">${hdSvg(HD_DUCK_UP)}</span><span class="hdfr f2">${hdSvg(HD_DUCK_DOWN)}</span>`;
// a quality's plumage, under TINT: the bird's body takes the colour of its kind of chord
const HD_TINTS={"":"#E9A23B","m":"#4D8FD6","°":"#9B6BD6","7":"#E0533D","maj7":"#5CC27A","m7":"#3FB8B0"};
const HD_TINT_NAMES={"":"MAJOR","m":"MINOR","°":"DIMINISHED","7":"DOMINANT 7TH","maj7":"MAJOR 7TH","m7":"MINOR 7TH"};
function hdBirdNew(x, speed, {gold=false, n=0, tint=null, target=0}={}){
  const el=document.createElement("div"); el.className="hdduck"+(gold?" gold":"");
  el.innerHTML=HD_DUCK+(n?`<b class="hdnum">${n}</b>`:"");
  if(tint!=null && HD_TINTS[tint]) el.style.setProperty("--dbody", HD_TINTS[tint]);
  blast.field.appendChild(el);
  const a=-Math.PI/2+(Math.random()<.5?-1:1)*(.35+Math.random()*.4);
  const b={el, x, y:blast.L.grassTop+16, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, speed, state:"rise", turn:.9+Math.random(), target};
  blast.birds.push(b); hdBirdDraw(b); sfx("flap");
  return b;
}
function hdBirdDraw(b){ b.el.style.transform=`translate(${Math.round(b.x-32)}px,${Math.round(b.y-24)}px)`; b.el.classList.toggle("left", b.vx<0); }
function hdMove(dt){
  const L=blast.L; if(!L) return;
  for(const b of blast.birds){
    if(b.state==="rise" || b.state==="fly"){
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(b.state==="rise" && b.y<L.grassTop-50) b.state="fly";
      if(b.state==="fly"){
        if(b.x<26){ b.x=26; b.vx=Math.abs(b.vx); } if(b.x>L.W-26){ b.x=L.W-26; b.vx=-Math.abs(b.vx); }
        if(b.y<L.skyTop){ b.y=L.skyTop; b.vy=Math.abs(b.vy); } if(b.y>L.grassTop-50){ b.y=L.grassTop-50; b.vy=-Math.abs(b.vy); }
        b.turn-=dt; if(b.turn<=0){ b.turn=.7+Math.random()*1.3;                 // a new diagonal, never flat, never straight up
          const a=(Math.random()<.5?-1:1)*(.45+Math.random()*.7)+(Math.random()<.5?0:Math.PI); b.vx=Math.cos(a)*b.speed; b.vy=Math.sin(a)*b.speed; }
      }
    } else if(b.state==="away"){ b.y-=b.speed*1.8*dt; b.x+=b.vx*.25*dt; if(b.y<-60) b.state="gone"; }
    else if(b.state==="fall"){ b.y+=300*dt; if(b.y>L.grassTop+24) b.state="gone"; }
    if(b.state==="gone") b.el.remove(); else hdBirdDraw(b);
  }
  blast.birds=blast.birds.filter(b=>b.state!=="gone");
}
function hdTick(now){
  if(!blast || blast.kind!=="hunt") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase==="play" || blast.phase==="demo") hdMove(dt);
  if(blast.phase==="play"){
    const d=blast.duck;
    if(d && d.open && !d.done){ d.left-=dt; if(d.left<=0) hdAway("TOO SLOW"); }
    const tg=blast.tag;
    if(tg){ tg.left-=dt; if(tg.left<=0) hdTagGone(); }
  }
  blast.raf=requestAnimationFrame(hdTick);
}

// ---------- shooting ----------
// A chord from the buttons. Right, and the duck (or the flock's next) is shot at once. Wrong, and it
// waits a moment first: a chord of two or three buttons (a maj7, a diminished) passes through a
// simpler one on the way, which shouldn't cost a shell.
function huntChord(voices){
  if(!blast || blast.kind!=="hunt") return;
  if(blast.phase==="demo" && blast.demo){ endHdDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const key=blast.key, name=chordName(pitches, key ? key.f : devFifths());
  clearTimeout(blast.hdPend); blast.hdPend=null;
  if(blast.tag){ hdTagChord(pitches, name); return; }
  const d=blast.duck;
  if(!d || !d.open || d.done){ heard(name,false, d ? "LISTEN FIRST: HOME, THEN THE DUCK" : "WAIT FOR THE DUCK"); return; }
  const t=d.targets[d.i];
  if(isChord(pitches, t.pc, t.q)){ heard(name,true); hdHit(d); return; }
  blast.hdPend=gameLater(()=>{ blast.hdPend=null; if(blast.duck===d && !d.done) hdWrong(d, pitches, name); }, 450);
}
function hdWrong(d, pitches, name){
  d.shells--; d.first=false; blast.ear=0; hdPanel();
  const num=hdNumeralOf(pitches, blast.key);
  heard(name,false, num ? `THAT'S ${num}` : "NOT IN THIS KEY");
  sfx("bang"); hdFlash(); buzz(blast.field,true);
  if(d.shells<=0) hdAway("OUT OF SHELLS");
}
// the zapper's flash: the screen goes white for a moment as the shot fires (dimmed, and gone with
// reduced motion)
function hdFlash(){ const f=blast.flashEl; if(!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
function hdHit(d){
  const t=d.targets[d.i], b=blast.birds.find(x=>x.target===d.i && (x.state==="fly"||x.state==="rise"));
  t.hit=true; d.i++;
  sfx("hit"); hdFlash();
  const quick=d.total ? Math.max(0, d.left/d.total) : 0;
  const unaided=d.first && !d.aided && !hdPowerAny(d);
  if(unaided) blast.ear=(blast.ear||0)+1;
  let pts=(20+30*quick)*(d.first?2:1)*hdEarMult()*(d.gold?3:1)*(blast.level+1);
  pts=mulPts(Math.round(pts)); blast.score+=pts; blast.ducks++; stats.streak=blast.ducks; scoreboard();
  if(t.slot!=null){ blast.rnd.slots[t.slot]="hit"; }
  const x=b ? b.x : blast.L.W/2, y=b ? b.y : blast.L.H/2;
  if(b){ b.state="shot"; b.el.classList.add("shot"); gameLater(()=>{ if(b.state==="shot"){ b.state="fall"; b.el.classList.add("falling"); } }, 380); }
  popup(x, y-28, `+${pts}${d.first?" FIRST SHOT":""}${d.gold?" GOLD":""}`, d.gold?"#FFD35A":undefined);
  explode(x, y, 14, d.gold ? ["#FFD35A","#FFF4C2","#E9A23B"] : ["#F1E8D2","#C9A06A","#8B5A2B"]);   // feathers
  d.first=true;                                                  // a flock's next duck has its own first shot
  hdBar(); hdPanel();
  if(d.i<d.targets.length) return;                               // the rest of the flock still flying
  // all down: the dog comes up holding them, the chord named on a card
  d.done=true; d.open=false;
  let flockPts=0;
  if(d.flock && d.targets.every(x=>x.hit)){ flockPts=mulPts(25*d.targets.length*(blast.level+1)); blast.score+=flockPts; }
  gameLater(()=>{
    hdDogHold(x, d, flockPts);
    helpChord(null); helpChord(t.root, t.q);                      // beginner mode: what it was, once it's down
  }, 750);
  gameLater(()=>hdDuckDone(d, true), 2300 + (d.flock?900:0));
}
// away: the sky flushes pink, the dog laughs, and the answer is played and shown
function hdAway(why){
  const d=blast.duck; if(!d || d.done) return;
  d.done=true; d.open=false; clearTimeout(blast.hdPend);
  blast.birds.forEach(b=>{ if(b.state==="fly"||b.state==="rise") b.state="away"; });
  d.targets.forEach(t=>{ if(!t.hit && t.slot!=null) blast.rnd.slots[t.slot]="miss"; });
  if(!d.gold){ blast.ear=0; }
  sfx("away"); hdPanel(); hdBar();
  blast.tintEl && blast.tintEl.classList.add("on");
  const left=d.targets.filter(t=>!t.hit);
  heard(left.map(t=>t.sym).join(" "), false, `${why}: ${d.gold ? "THE GOLDEN DUCK GOT AWAY, NO HARM DONE" : "IT GOT AWAY"}`);
  hdQuiet();
  gameLater(()=>{ blast.tintEl && blast.tintEl.classList.remove("on");
    hdDogLaugh(left);
    // the answer: home, then what it was, so the ear joins them up
    const seq=[{at:0, notes:d.home.notes, dur:.8}]; let at=1.0;
    d.voiced.filter(v=>!v.t.hit).forEach(v=>{ seq.push({at, notes:v.notes, dur:.9}); at+=1.0; });
    hdPlay(seq);
    const t=left[0]; if(t){ helpChord(null); helpChord(t.root, t.q); }
  }, 900);
  gameLater(()=>hdDuckDone(d, false), 3600+left.length*700);
}
function hdDuckDone(d, hit){
  if(!blast || blast.duck!==d) return;
  hdDogDown(); hdQuiet();
  blast.duck=null; hdPowerUsed();
  if(blast.key){ const home=hdChord(blast.key, hdHome(blast.key)); helpChord(null); if(home) helpChord(home.root, home.q); }
  hdPanel(); hdBar();
  if(hit && hdFetchMaybe(()=>gameLater(()=>hdNextDuck(), 500))) return;
  gameLater(()=>hdNextDuck(), 700);
}
function hdRoundEnd(){
  const r=blast.rnd, hits=r.slots.filter(s=>s==="hit").length, q=hdQuota();
  blast.key && hdKeySign(null);
  if(hits>=q){
    let bonus=0; if(hits===HD_ROUND){ bonus=mulPts(100*(blast.level+1)); blast.score+=bonus; }
    banner(hits===HD_ROUND ? "PERFECT!" : "ROUND CLEAR", `${hits} OF ${HD_ROUND}${bonus?` · +${bonus}`:""}`); sfx("level", blast.key && {pc:pcOfName(blast.key.name), minor:blast.key.minor});
    blast.level++;
    if(blast.level<HD_LEVELS.length) gameLater(()=>banner(`LEVEL ${blast.level+1}`, hdLevel().n.toUpperCase()), 2400);
    else gameLater(()=>banner(`LEVEL ${blast.level+1}`, "FASTER!"), 2400);
    hdBar();
    gameLater(()=>hdRoundStart(), 5000);
    return;
  }
  blast.lives--; hdBar(); sfx("miss"); buzz(blast.field,true);
  hdDogLaugh([]);
  banner("THE DOG LAUGHS", `${hits} OF ${HD_ROUND}: ${q} NEEDED${blast.lives>0?" · FLY IT AGAIN":""}`);
  if(blast.lives<=0){ gameLater(()=>hdOver(), 2600); return; }
  gameLater(()=>{ hdDogDown(); hdRoundStart(); }, 3600);
}
function hdOver(){
  hdQuiet(); hdClear();
  blast.phase="over"; blast.over=true;
  const best=Math.max(saved.best.hunt||0, blast.score); saved.best.hunt=best; save();
  if(canWrite() && hasSetting(35)) borrow(35, keyIndexOf(0));
  hdBar(); hdMenu(true);
}
// the harp, the duck call: a low string for home, a high one for the duck again
function huntNote(pc){
  if(!blast || blast.kind!=="hunt" || blast.phase!=="play") return;
  hdReplay(mod(pc,12)<6 ? "home" : "duck");
}
function hdReplay(what){
  const d=blast && blast.kind==="hunt" && blast.phase==="play" && blast.duck; if(!d || d.done) return;
  d.aided=true;                                                    // help: the hit won't build the pure ear
  if(what==="home") hdPlay([{at:0, notes:d.home.notes, dur:.9}]);
  else hdPlay(d.voiced.map((v,i)=>({at:i*1.0, notes:v.notes, dur:.9})));
  heard(what==="home" ? "HOME" : "THE DUCK", true, "");
}
document.addEventListener("keydown", e=>{
  if(!blast || blast.kind!=="hunt" || blast.phase!=="play" || e.repeat || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(typeof kbOn==="function" && kbOn()) return;                   // keyboard play: the letters are chord buttons
  if(e.code==="KeyH"){ e.preventDefault(); hdReplay("home"); } else if(e.code==="KeyR"){ e.preventDefault(); hdReplay("duck"); }
});

// ---------- the dog ----------
// He walks out sniffing at the start of a round and dives into the grass; comes up holding what was
// shot, a card with its numeral and name; laughs at a miss; and now and then fetches a power-up.
const HD_DOG_SIDE1=["....................","............EE......","...........EDDDD....","..........EEDKDDD...","..........EEDDDDDDNN","....T.....EEDDDDDD..","....TT....EDDDWWW...",".....TDDDDDDDDWW....",".....DDWWDDDDDDD....",".....DDWWWDDDDDD....",".....DDDDDDDDDDD....",".....DD.DD..DD.DD...",".....DD.DD..DD.DD..."];
const HD_DOG_SIDE2=["....................","....................","............EE......","...........EDDDD....","..........EEDKDDD...","....T.....EEDDDDDDNN","...TT.....EEDDDDDD..",".....TDDDDDDDDWWW...",".....DDWWDDDDDDD....",".....DDWWWDDDDDD....",".....DDDDDDDDDDD....","......DD.DD.DD.DD...","......DD.DD.DD.DD..."];
const HD_DOG_HOLD=["....EE......EE....","...EEED....DEEE...","...EEDDDDDDDDEE...","...EEDKDDDDKDEE...","...EEDDDDDDDDEE...","....EDDWNNWDDE....",".....DDWWWWDD.....",".....DDDWWDDD...DD","....DDDDDDDDDD..DD","...DDDDWWWWDDDDDD.","...DDDWWWWWWDDDD..","...DDDWWWWWWDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD..."];
const HD_DOG_LAUGH1=["....EE......EE....","...EEED....DEEE...","...EEDDDDDDDDEE...","...EEKKDDDDKKEE...","...EEDDDDDDDDEE...","....EDDWNNWDDE....",".....DWNNNNWD.....",".....DDWNNWDD.....","....DDDDWWDDDD....","...DDDDWWWWDDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD..."];
const HD_DOG_LAUGH2=["..................","....EE......EE....","...EEED....DEEE...","...EEDDDDDDDDEE...","...EEKKDDDDKKEE...","...EEDDDDDDDDEE...","....EDDWNNWDDE....",".....DDWNNWDD.....",".....DDDWWDDD.....","....DDDDWWDDDD....","...DDDDWWWWDDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD...","...DDDWWWWWWDDD..."];
const HD_DOG={
  walk:`<span class="hdfr f1">${hdSvg(HD_DOG_SIDE1)}</span><span class="hdfr f2">${hdSvg(HD_DOG_SIDE2)}</span>`,
  hold:hdSvg(HD_DOG_HOLD),
  laugh:`<span class="hdfr f1">${hdSvg(HD_DOG_LAUGH1)}</span><span class="hdfr f2">${hdSvg(HD_DOG_LAUGH2)}</span>`,
};
function hdDogShow(mode, html, x, cls=""){
  const el=blast.dogEl; if(!el) return null;
  el.hidden=false; el.className=`hddog ${mode} ${cls}`.trim(); el.innerHTML=html;
  el.style.transition="none"; el.style.left=`${Math.round(x)}px`;
  return el;
}
// out across the grass, sniffing, for as long as the cadence plays, then a leap into the grass
function hdDogWalk(ms){
  const L=blast.L, el=hdDogShow("walk", HD_DOG.walk, -130); if(!el) return;
  el.style.top=`${L.grassTop-10}px`; el.style.transform="translate(0,0)";
  void el.offsetWidth; el.style.transition=`left ${ms/1000}s linear`; el.style.left=`${Math.round(L.W*.38)}px`;
  sfx("sniff");
  gameLater(()=>{ if(!blast.dogEl || !blast.dogEl.classList.contains("walk")) return; el.classList.add("leap"); }, ms);
  gameLater(()=>{ if(!blast.dogEl || !blast.dogEl.classList.contains("walk")) return; el.classList.add("dive"); }, ms+450);
  gameLater(()=>{ if(blast.dogEl && blast.dogEl.classList.contains("walk")) blast.dogEl.hidden=true; }, ms+900);
}
// up from the grass at x, behind it; down again after
function hdDogUp(mode, html, x, card){
  const L=blast.L, el=hdDogShow(mode, html, x-52, "behind"); if(!el) return;
  el.style.top=`${L.grassTop-74}px`; el.style.transform="translateY(100px)";   // head and shoulders over the grass
  void el.offsetWidth; el.style.transition="transform .35s steps(5)"; el.style.transform="translateY(0)";
  if(card){ const c=document.createElement("div"); c.className="hdcard"; c.innerHTML=card; el.appendChild(c); }
}
function hdDogDown(){
  const el=blast && blast.dogEl; if(!el || el.hidden || el.classList.contains("walk")) return;
  el.style.transition="transform .3s steps(4)"; el.style.transform="translateY(100px)";
  gameLater(()=>{ if(blast.dogEl===el && el.style.transform==="translateY(100px)") el.hidden=true; }, 330);
}
// the shot ducks held up, and the card: numeral big, chord name, what it's called; a flock's names
function hdDogHold(x, d, flockPts){
  const t=d.targets, many=t.length>1, held=t.map(()=>`<span class="hdheld">${hdSvg(HD_DUCK_DOWN)}</span>`).join("");
  const card = many
    ? `<b>${t.map(c=>c.num).join("–")}</b><i>${t.map(c=>c.sym).join(" ")}</i>${d.flock?`<small>${d.flock.n}${flockPts?` · +${flockPts}`:""}</small>`:""}`
    : `<b>${t[0].num}</b><i>${t[0].sym}</i><small>${d.gold?"GOLDEN · ":""}${t[0].fn}</small>`;
  hdDogUp("hold", `<span class="hdhand">${held}</span>`+HD_DOG.hold, Math.max(60, Math.min(blast.L.W-60, x)), card);
  if(d.gold) blast.dogEl.classList.add("gold");
  sfx("fetch");
}
function hdDogLaugh(left){
  const card = left.length ? `<b>${left.map(c=>c.num).join("–")}</b><i>${left.map(c=>c.sym).join(" ")}</i><small>IT WAS</small>` : "";
  hdDogUp("laugh", HD_DOG.laugh, blast.L.W/2, card);
  hdLaughSound();
}
// the laugh: a little falling chuckle, three times
function hdLaughSound(){
  if(!settings.sounds || !piano.ctx || piano.ctx.state!=="running") return;
  const ctx=piano.ctx, t=ctx.currentTime+.02, out=ctx.createGain(); out.gain.value=.12; out.connect(ctx.destination);
  for(let k=0;k<3;k++) [[392,330],[349,294]].forEach(([a,b],j)=>{ const o=ctx.createOscillator(), g=ctx.createGain(), at=t+k*.3+j*.12;
    o.type="square"; o.frequency.setValueAtTime(a,at); o.frequency.exponentialRampToValueAtTime(b,at+.1);
    g.gain.setValueAtTime(.8,at); g.gain.exponentialRampToValueAtTime(.001,at+.11); o.connect(g).connect(out); o.start(at); o.stop(at+.13); });
}

// ---------- a clean field ----------
function hdClear(){
  if(!blast) return;
  (blast.birds||[]).forEach(b=>b.el.remove()); blast.birds=[];
  blast.duck=null; blast.tag=null; clearTimeout(blast.hdPend);
  if(blast.dogEl){ blast.dogEl.hidden=true; blast.dogEl.innerHTML=""; }
  if(blast.tintEl) blast.tintEl.classList.remove("on");
  hdKeySign(null); hdGuideDraw(); hdPanel();
}
// any sound the game holds on: the drone
function hdQuiet(){
  const dr=blast && blast.drone; if(!dr) return; blast.drone=null;
  try{ const t=piano.ctx.currentTime; dr.g.gain.setTargetAtTime(0,t,.08); dr.osc.forEach(o=>o.stop(t+.4)); }catch(e){}
}
// a tonic drone, two octaves of it, held under the duck
function hdDrone(pc, secs){
  hdQuiet(); if(!settings.sounds || !piano.ctx) return;
  try{ const ctx=piano.ctx, t=ctx.currentTime, g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.3); g.connect(piano.out||ctx.destination);
    const osc=[36,48].map(m=>{ const o=ctx.createOscillator(); o.type="triangle"; o.frequency.value=440*Math.pow(2,(m+pc-69)/12); o.connect(g); o.start(t); o.stop(t+secs); return o; });
    blast.drone={g, osc}; }catch(e){}
}

// ---------- Chord Hunt' demo ----------
function hdDemo(){
  if(!blast || blast.kind!=="hunt") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; hdLayout(); hdClear();
  const {token, say, step}=demoShell(endHdDemo);
  const key=hdKey("C"), show=(t)=>{ blast.key=key; hdKeySign(key); blast.guideEl.hidden=false;
    blast.guideEl.innerHTML=HD_LEVELS[1].pool.map(n=>{ const c=hdChord(key,n); return `<span${t===n?' class="lit"':""}><b>${n}</b><i>${c.sym}</i></span>`; }).join(""); };
  sfx("attract");
  (async()=>{
    // a duck flying, and what happens to it: shot and held up, or away and laughed at
    const duck=async(num, {miss=false, wrong=null}={})=>{
      const c=hdChord(key,num), home=hdChord(key,"I"), hv=hdVoice(home.pc,home.q), v=hdVoice(c.pc,c.q,{near:hv.upper});
      hdPlay([{at:0, notes:hv.notes, dur:.85},{at:1.15, notes:v.notes, dur:1.4}]); helpChord("C","");
      await step(1150); const b=hdBirdNew(fieldW()*.55, 110, {target:0}); await step(1800);
      if(wrong){ const w=hdChord(key,wrong); demoPlay(hdVoice(w.pc,w.q).notes); hdFlash(); sfx("bang"); heard(w.sym,false,`THAT'S ${wrong}`); await step(1600); }
      if(miss){ b.state="away"; blast.tintEl.classList.add("on"); sfx("away"); await step(900); blast.tintEl.classList.remove("on");
        hdDogLaugh([c]); hdPlay([{at:0, notes:hv.notes, dur:.8},{at:1, notes:v.notes, dur:.9}]); helpChord(c.root,c.q); await step(2600); hdDogDown(); return; }
      helpChord(c.root,c.q); demoPlay(v.notes); hdFlash(); sfx("hit"); heard(c.sym,true); b.state="shot"; b.el.classList.add("shot");
      await step(380); b.state="fall"; b.el.classList.add("falling"); await step(700);
      hdDogHold(b.x, {targets:[{...c, hit:true}]}); await step(2300); hdDogDown(); helpChord(null);
    };
    try{
      say("CHORD HUNT","DUCK HUNT BY EAR. EVERY CHORD IS HEARD AGAINST HOME."); await step(3400);
      say("THE KEY","EACH ROUND OPENS WITH ITS KEY: THE DOG SNIFFS OUT A CADENCE, AND UP GOES THE SIGN.");
      show(); const ms=hdPlay(hdCadence(key)); hdDogWalk(ms); await step(ms+1400);
      say("LISTEN","HOME SOUNDS FIRST, C MAJOR, THEN THE DUCK'S CHORD AS IT RISES. HOW FAR FROM HOME IS IT?");
      await duck("IV");
      say("","IT WAS IV: IN C THAT'S F. PLAY IT ON THE BUTTONS AND IT'S DOWN. THE GUIDE ALONG THE GRASS SAYS WHAT EACH NUMERAL IS.");
      show("IV"); await step(3400); show();
      say("THREE SHELLS","A WRONG CHORD SPENDS A SHELL, AND SAYS WHAT IT WAS. RUN OUT, OR RUN OUT OF TIME, AND IT GETS AWAY.");
      await duck("vi", {miss:true, wrong:"V"});
      say("HEAR IT AGAIN","PLUCK THE HARP: A LOW STRING FOR HOME, A HIGH ONE FOR THE DUCK. NO HELP, FIRST SHOT, AND YOUR PURE EAR CLIMBS TO ×4."); await step(4200);
      say("POWER-UPS","NOW AND THEN THE DOG FETCHES ONE. PLAY THE CHORD ON ITS TAG: A DRONE UNDER THE DUCK, ITS BASS ALONE, A SLOW ARPEGGIO, WHERE IT RESOLVES…");
      hdDogUp("hold", `<span class="hdhand">${hdTagLook("drone","G")}</span>`+HD_DOG.hold, fieldW()*.5); await step(4400); hdDogDown();
      say("LATER","THE RELATIVE MINOR, EVERY TRIAD, MINOR KEYS, SEVENTHS, BORROWED CHORDS, SECONDARY DOMINANTS, INVERSIONS, WHOLE PROGRESSIONS, AND KEYS THAT WANDER."); await step(4400);
      say("READY?","HIT ENOUGH OF EACH TEN TO CLEAR THE ROUND. GOLDEN DUCKS SCORE TRIPLE."); sfx("level"); await step(2800);
      endHdDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endHdDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); hdQuiet(); blast.phase="menu"; hdClear(); helpChord(null);
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
