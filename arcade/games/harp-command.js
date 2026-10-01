// Harp Command: notes fall toward twelve cannons; pluck the string that plays each. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Harp Command ----------
// Missile Command for the harp. Twelve cannons stand along the bottom of the field, one under each
// of the harp's strings, lowest on the left. Notes fall toward them, and plucking the string that
// plays a falling note fires that string's cannon at it: soon the hand knows where every note lives
// on the strip. It shares Chord Invaders' cabinet (the starfield, the sounds, the banners, the title
// and game over screens) and climbs from all twelve notes with their names showing, to a key's
// scale on the strings, to scale degrees, other scales, and notes read off the staff.
//
// The game sets the harp itself: chromatic mode for the chromatic levels, and for the others the
// scale on a key (the custom scale on the key signature, harp mode 10, where the firmware has it,
// the plain major scale, mode 1, where it doesn't). Harp mode is written last, since writing it is
// what makes the firmware retune the strings. Everything goes back when the game is left.
const HC_LEVELS=[
  {n:"Chromatic, names showing", kind:"chrom", labels:true},
  {n:"Chromatic", kind:"chrom"},
  {n:"Major keys", kind:"scale", scales:["major"]},
  {n:"Scale degrees", kind:"scale", scales:["major"], degrees:true},
  {n:"Solfège", kind:"scale", scales:["major"], solfa:true},
  {n:"Minors and modes", kind:"scale", scales:["natural minor","harmonic minor","dorian","mixolydian","major pentatonic","minor pentatonic"], custom:true},
  {n:"On the staff", kind:"scale", scales:["major"], staff:true},
];
const HC_SCALES={"major":[0,2,4,5,7,9,11],"natural minor":[0,2,3,5,7,8,10],"harmonic minor":[0,2,3,5,7,8,11],
  "dorian":[0,2,3,5,7,9,10],"mixolydian":[0,2,4,5,7,9,10],"major pentatonic":[0,2,4,7,9],"minor pentatonic":[0,3,5,7,10]};
const HC_DEG=["1","2","3","4","5","6","7"];
// notes on screen at once, and how much sooner the next one comes
const HC_DENSITY=[["FEW",2,1.4],["SOME",4,1],["MANY",7,.62],["SWARM",10,.42]];
const hcDensity=()=>HC_DENSITY[saved.hcDensity??1]||HC_DENSITY[1];
// hits to reach the next level: more than before, and a few more at each level
const hcHitsToLevel=level=>14+3*level;
const customHarp=()=>canWrite() && hasSetting(236) && (mc.params[7]??0)>9;
const hcLevelOk=i=>{ const L=HC_LEVELS[i]; return !(L.custom && !customHarp()); };
function genCommand(){
  return {kind:"command", prompt:"Harp Command", sub:"Notes fall toward the cannons along the bottom, one cannon under each of the harp's strings, lowest on the left. Pluck the string that plays a falling note and its cannon shoots it down. Three that land and it's game over.",
    answer:{type:"command", get name(){ const l=hcLowest(); return l ? l.label : "the lowest note"; }},
    get hint(){ const l=hcLowest(); return l ? `The lowest is ${l.name}: string ${l.string+1} from the left.` : "Wait for a note to fall."; },
    hearFn:()=>{ const l=hcLowest(); return l ? [[60+l.pc,0]] : []; },
    context:0};
}
const hcLowest=()=> blast && blast.kind==="command" ? blast.items.filter(i=>!i.done).sort((a,b)=>a.t0-b.t0)[0] || null : null;
// the strings as the harp is tuned now: each string's pitch class and name, lowest string first
function hcStrings(){
  const w=blast.wave;
  if(!w || w.kind==="chrom") return [...Array(12)].map((_,i)=>({pc:i, name:SHARP_NAMES[i], alt: FLAT_NAMES[i]!==SHARP_NAMES[i] ? FLAT_NAMES[i] : null, deg:null}));
  const T=pcOfName(w.tonic), iv=HC_SCALES[w.scale], names=scaleNoteNames({iv}, w.tonic);
  return [...Array(12)].map((_,k)=>({pc:mod(T+iv[k%iv.length],12), name:names[k%iv.length], deg:(k%iv.length)+1}));
}
// a new key and scale for the harp, at the start of a game and every eight hits
function hcNewWave(quiet){
  const L=HC_LEVELS[blast.level];
  if(L.kind==="chrom"){ blast.wave={kind:"chrom"}; }
  else {
    const f=rnd([-5,-4,-3,-2,-1,0,1,2,3,4,5]), tonic=KEY_BY_FIFTHS[f];   // five flat keys, five sharp, and C
    blast.wave={kind:"scale", scale:rnd(L.scales), tonic, f};
  }
  hcTuneHarp(); hcLabels(); blast.helpNamesStale=true;
  const w=blast.wave;
  if(w.kind==="scale" && !quiet) banner(`${w.tonic} ${w.scale.toUpperCase()}`, "THE STRINGS PLAY ITS SCALE NOW");
  blastBarCommand();
}
// set the harp for the wave: chromatic, or the scale on the key; harp mode last, so the strings retune
function hcTuneHarp(){
  if(!canWrite()) return;
  harpInOrder();
  const w=blast.wave;
  if(w.kind==="chrom"){ if(hasSetting(116)) borrow(116,1); borrow(98,1); if(hasSetting(36)) borrow(36, mc.params[36] ?? 0); return; }
  borrow(98,0);
  borrow(35, keyIndexOf(w.f));
  if(customHarp()){ borrow(236, maskOf(HC_SCALES[w.scale])); borrow(36,10); }
  else borrow(36,1);                                     // stock firmware: the major scale on the key
  modPill();
}
// the cannons' labels under the field: the string's note, shown on the named level only
function hcLabels(){
  if(!blast || !blast.labels) return;
  if(blast.phase==="demo"){ hcLabelsShow(!!blast.demoLabels); return; }   // a resize in the demo keeps the scene's labels
  const L=HC_LEVELS[blast.level], st=hcStrings();
  blast.labels.innerHTML="";
  st.forEach((x,i)=>{ const l=document.createElement("span"); l.innerHTML = L.labels ? hcLabelText(x) : ""; l.style.left=`${blast.cannons[i].x}px`; blast.labels.appendChild(l); });
}
function hcLayout(){
  const W=blast.field.clientWidth||800, m=W*.06;
  blast.cannons=[...Array(12)].map((_,i)=>({x: m+(W-2*m)*i/11, fired:(blast.cannons&&blast.cannons[i])?blast.cannons[i].fired:0}));
}
function startCommand(){
  blast={kind:"command", items:[], score:0, lives:3, level:0, hits:0, next:0, fall:9000, gap:2600, over:true, phase:"menu", raf:0,
    field:null, hud:null, fx:null, last:performance.now(), wave:{kind:"chrom"}, cannons:null, labels:null};
  commandDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  commandMenu();
  blast.raf=requestAnimationFrame(commandTick);
}
// the minichord connected (or already there): keep reading it; between games the harp is chromatic
function commandDevice(){
  if(!blast || blast.kind!=="command" || !canWrite()) return;
  arcadeSetup(()=>{ if(!(35 in borrowed)) borrow(35, mc.params[35]); if(hasSetting(30)) ensure(30,0); });
  // what this minichord can play decides which levels are open: redraw the title screen when that changes
  const sig=HC_LEVELS.map((_,i)=>hcLevelOk(i)).join();
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ menuRebuild(()=>commandMenu()); }
  // Only on the title and game over screens: the demo sets its own keys (D major) and the bonus round
  // its own strings, and the minichord reports in many times a second, which used to flip the demo's
  // labels back to chromatic over and over.
  const idle = blast.phase==="menu" || blast.phase==="over";
  if(idle && blast.wave.kind!=="chrom"){ blast.wave={kind:"chrom"}; hcTuneHarp(); hcLabels(); }
  if(idle && mc.params[98]!==1 && !blast.tunedMenu){ blast.tunedMenu=true; hcTuneHarp(); }
}
function buildCommandField(box){
  const field=document.createElement("div"); field.className="field arcade command"; field.setAttribute("aria-label","Falling notes over twelve cannons");
  const ground=document.createElement("div"); ground.className="ground"; field.appendChild(ground);
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const labels=document.createElement("div"); labels.className="strings"; field.appendChild(labels);
  box.append(field);
  if(blast && blast.kind==="command"){
    blast.items.filter(i=>!i.done).forEach(i=>field.appendChild(i.el));
    blast.field=field; blast.hud=hud; blast.heard=hd; blast.labels=labels; blast.fx=fxInit(field);
    setTimeout(()=>{ applyChordSize(); hcLayout(); hcLabels(); });
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  blastBarCommand();
  setTimeout(helperSync);
}
function blastBarCommand(){
  if(!blast || blast.kind!=="command" || !blast.hud) return;
  const w=blast.wave, key = w && w.kind==="scale" ? ` · ${w.tonic} ${w.scale.toUpperCase()}` : "";
  const toGo = blast.phase==="play" ? ` · NEXT ${Math.max(0,hcHitsToLevel(blast.level)-(blast.levelHits||0))}` : "";
  const pw = typeof hcPowerHud==="function" ? hcPowerHud() : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${key}${toGo}${pw}</span><span class="lives">${livesHtml()}</span>`;
}
const COMMANDMENU_G={key:"command", title:"HARP COMMAND",
  rules:()=>`<p>NOTES FALL TOWARD YOUR CANNONS.</p><p>PLUCK THE STRING THAT PLAYS ONE AND ITS CANNON FIRES.</p><p class="starline">${PIXEL_STAR}NOTES SCORE BIG AND NEVER HURT.</p><p>A WRONG STRING FREEZES YOUR CANNONS.</p><p>POWER-UPS FALL NOW AND THEN: PLUCK THEIR STRING TO TAKE THEM.</p><p>EVERY TWO LEVELS, SPELL IT: ALL BUT ONE NOTE SPELL A CHORD. PLUCK THE ODD ONE, OR PLAY THE CHORD FOR THE REST.</p>`,
  rows:row=>{
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("NOTE SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
    // how many notes fall at once: more targets on the screen, more chances at the right string, at any speed
    row("NOTES AT ONCE", HC_DENSITY.map(x=>x[0]), ()=>saved.hcDensity??1, i=>{ saved.hcDensity=i; save(); });
  },
  levels:HC_LEVELS, ok:hcLevelOk, needs:"NEEDS THE TEST FIRMWARE",
  begin:i=>beginCommand(i), demo:()=>commandDemo(), modNote:false};
function commandMenu(over){ arcadeMenu(COMMANDMENU_G, over); }
function beginCommand(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(commandTick);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  blast.items.forEach(i=>i.el.remove());
  Object.assign(blast,{items:[], hcPower:null, score:0, lives:3, level, startLevel:level, hits:0, levelHits:0, next:performance.now()+1400,
    fall:9000*Math.pow(.93,level)*speedMul(), gap:2400*Math.pow(.93,level)*speedMul(), over:false, phase:"play"});
  saved.commandStart=level; save();
  stats.streak=0; scoreboard(); hcLayout();
  hcNewWave(true);
  const w=blast.wave, keyLine = w.kind==="scale" ? ` · ${w.tonic} ${w.scale.toUpperCase()}` : "";
  banner(`LEVEL ${level+1}`, `${HC_LEVELS[level].n.toUpperCase()}${keyLine} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start");
  if(canWrite()) poll(true);
}
// a falling note: a name, a scale degree, or a note on a little staff, above the string that plays it
function hcSpawn(now){
  const L=HC_LEVELS[blast.level], st=hcStrings(), onScreen=new Set(blast.items.filter(i=>!i.done).map(i=>i.string));
  const power=hcPowerChance(), bonus=!power && Math.random()<.12;   // now and then a power-up, plucked like a note
  for(let k=0;k<30;k++){
    const string=Math.floor(Math.random()*12); if(onScreen.has(string)) continue;
    const x=st[string];
    const el=document.createElement("span"); el.className="fchord fnote"+(bonus?" bonus":"");
    const name = x.alt && Math.random()<.5 ? x.alt : x.name;   // chromatic: C♯ or D♭, the same string
    let label=name;
    if(L.staff){ el.innerHTML=(bonus?PIXEL_STAR:"")+hcStaffSvg(x.name, string); label=x.name; }
    else if(L.degrees){ label=HC_DEG[x.deg-1]; el.innerHTML=bonus?PIXEL_STAR:""; el.append(label); }
    else if(L.solfa){ label=SOLFA[x.deg-1]; el.innerHTML=bonus?PIXEL_STAR:""; el.append(label); }   // do re mi on the key
    else { el.innerHTML=bonus?PIXEL_STAR:""; el.append(name); }
    if(power){ el.classList.add("power", `pu-${power}`); el.insertAdjacentHTML("afterbegin", hcPowerLook(power, "")); }
    el.style.left=`${blast.cannons[string].x}px`; el.style.top="0"; el.style.transform="translate(-50%,24px)";
    blast.field.appendChild(el);
    blast.items.push({el, string, pc:x.pc, name, label, bonus, power, t0:now});
    return;
  }
}
// a note on a small treble staff, in the octave its string sits in
function hcStaffSvg(name, string){
  const li=LETTERS.indexOf(name[0]), acc=name.includes("♯")?"\uE262":name.includes("♭")?"\uE260":"";
  const w=blast.wave, T=w.kind==="scale" ? pcOfName(w.tonic) : 0;
  // strings climb from the tonic near middle C: the string's octave on the staff
  const tonicDn=28+LETTERS.indexOf((w.tonic||"C")[0]), perOct=w.kind==="scale" ? HC_SCALES[w.scale].length : 12;
  let dn=tonicDn+Math.floor(string/perOct)*7; while(mod(dn,7)!==li) dn++;
  const SP=6, top=12, y=d=>top+(38-d)*SP/2, W=74, H=top*2+SP*4+12, nx=W/2+10;   // a treble clef on the left, so the note can be read
  let lines=""; for(let i=0;i<5;i++) lines+=`<line x1="2" x2="${W-2}" y1="${top+i*SP}" y2="${top+i*SP}" stroke="currentColor" stroke-width="1"/>`;
  let ledgers=""; for(let L=28; L>=dn; L-=2) ledgers+=`<line x1="${nx-5}" x2="${nx+12}" y1="${y(L)}" y2="${y(L)}" stroke="currentColor" stroke-width="1.2"/>`;
  for(let L=40; L<=dn; L+=2) ledgers+=`<line x1="${nx-5}" x2="${nx+12}" y1="${y(L)}" y2="${y(L)}" stroke="currentColor" stroke-width="1.2"/>`;
  return `<svg class="minstaff" viewBox="0 0 ${W} ${H+10}" width="${W*1.35}" height="${(H+10)*1.35}" aria-label="${name}">${lines}${ledgers}
    <text x="4" y="${y(32)}" font-family="Minichord Lab Music" font-size="${SP*4}" fill="currentColor">\uE050</text>
    <text x="${nx-2}" y="${y(dn)}" font-family="Minichord Lab Music" font-size="${SP*4}" fill="currentColor">\uE0A4</text>
    ${acc?`<text x="${nx-13}" y="${y(dn)}" font-family="Minichord Lab Music" font-size="${SP*4}" fill="currentColor">${acc}</text>`:""}</svg>`;
}
function commandTick(now){
  if(!blast || blast.kind!=="command") return;
  const dt=Math.min(.05,(now-blast.last)/1000); blast.last=now;
  if(blast.fx) fxDraw(now, dt);
  if(blast.phase!=="play"){ blast.raf=requestAnimationFrame(commandTick); return; }
  hcPowerTick(now, dt);                                              // slow time, multishot, a power running out
  const live=blast.items.filter(i=>!i.done);
  const [,most,gapMul]=hcDensity();
  if(now>=blast.next && live.length<most){ hcSpawn(now); blast.next=now+blast.gap*gapMul*(.8+Math.random()*.4); }
  const H=fieldH();
  for(const it of live){
    const y=(now-it.t0)/blast.fall;
    if(y>=1){ hcMiss(it); if(blast.phase!=="play"){ blast.raf=requestAnimationFrame(commandTick); return; } continue; }
    it.y=24+y*(H-110); it.el.style.transform=`translate(-50%,${it.y}px)`;   // moved, not re-laid out
  }
  const low=hcLowest(); markLowest(blast.items, low);
  helpString(low ? low.string : -1);
  blast.raf=requestAnimationFrame(commandTick);
}
function hcMiss(it){
  it.el.style.top=`${it.y||24}px`; it.el.style.transform="";                // back to top, so the miss animation can move it
  it.done=true; it.el.classList.add("miss"); setTimeout(()=>it.el.remove(),600);
  const x=it.el.offsetLeft, y=blast.field.clientHeight-70;
  if(it.bonus || it.power){ popup(x,y,"GONE","#7FE9FF"); return; }   // a ★ note or a power-up costs nothing if it lands
  if(hcShieldTakes(it)) return;
  blast.lives--; blastBarCommand(); buzz(blast.field, true); sfx("miss"); popup(x,y,"MISS","#FF4B3E");
  if(blast.lives<=0){
    blast.over=true; blast.phase="over"; poll(canWrite());
    const best=Math.max(saved.best.command||0, blast.score); saved.best.command=best; save();
    blast.items.forEach(i=>i.el.remove()); blastBarCommand(); commandMenu(true);
  }
}
// A string that plays no falling note freezes the cannons for a moment, longer the higher the level,
// so running a hand down the strip loses more time than it wins. Plucks while frozen do nothing.
const FREEZE_MS=()=>1200+150*(blast.level||0);
function commandNote(pc){
  if(!blast || blast.kind!=="command") return;
  if(blast.phase==="demo" && blast.demo){ endCommandDemo(blast.demo); return; }
  const inRound = typeof bonusPlaying==="function" && bonusPlaying();     // its own bonus round: the cannons fire as ever
  if(blast.phase!=="play" && !inRound) return;
  if(!inRound && performance.now()<(blast.frozenUntil||0)){ heard("FROZEN",false); return; }
  const hit=blast.items.filter(i=>!i.done && i.pc===pc).sort((a,b)=>(a.bonus-b.bonus)||(a.t0-b.t0))[0];
  const name=(hcStrings().find(x=>x.pc===pc)||{name:SHARP_NAMES[pc]}).name;
  if(!hit && inRound){ heard(name,false); buzz(blast.field,true); return; }   // nothing on that string: no freeze in a round
  if(!hit){
    heard(name,false); buzz(blast.field,true); sfx("freeze");
    blast.frozenUntil=performance.now()+FREEZE_MS(); blast.field.classList.add("frozen");
    gameLater(()=>{ if(blast && blast.field && performance.now()>=(blast.frozenUntil||0)) blast.field.classList.remove("frozen"); }, FREEZE_MS()+20);
    popup(blast.field.clientWidth/2, blast.field.clientHeight-70, "FROZEN", "#7FE9FF");
    return;
  }
  heard(hit.name||name,true);
  if(inRound){                                                    // the shot flies, then the round decides
    hit.done=true; hit.el.classList.remove("low");
    const c=blast.cannons[hit.string]; c.fired=performance.now();
    const fr=blast.field, x=hit.el.offsetLeft, y=(hit.y||24)+hit.el.offsetHeight/2, b=blast.bonus;
    sfx("shoot");
    blast.fx.missiles.push({x0:c.x/PX, y0:(fr.clientHeight-30)/PX, x1:x/PX, y1:y/PX, t0:performance.now(), dur:160, hit:()=>{ if(!b.over) b.g.shot(b, hit); }});
    return;
  }
  hcShootDown(hit);
}
// a note shot down, by its string or by multishot: the shot flies from its cannon, it scores, a
// power-up it carried is taken, and enough of them make the next level
function hcShootDown(hit){
  hit.done=true; hit.el.classList.remove("low");
  const c=blast.cannons[hit.string]; c.fired=performance.now();
  const fr=blast.field, x=hit.el.offsetLeft, y=(hit.y||24)+hit.el.offsetHeight/2, pts=mulPts((hit.bonus?50:10)*(blast.level+1));
  sfx("shoot");
  blast.fx.missiles.push({x0:c.x/PX, y0:(fr.clientHeight-30)/PX, x1:x/PX, y1:y/PX, t0:performance.now(), dur:160,
    hit:()=>{ sfx(hit.bonus||hit.power?"bonus":"boom"); hit.el.classList.add("gone"); setTimeout(()=>hit.el.remove(),50);
      explode(x,y, hit.bonus||hit.power?44:26, hit.power?["#FF5AA0","#FFD35A","#7FE9FF"]:hit.bonus?["#7FE9FF","#FFFFFF","#B9F3FF","#FFD35A"]:undefined); popup(x,y-10,`+${pts}`, hit.bonus?"#7FE9FF":undefined); }});
  if(hit.power) hcPowerGet(hit);
  blast.hits++; blast.score+=pts; stats.streak=blast.hits; scoreboard();
  blast.levelHits=(blast.levelHits||0)+1;
  if(blast.levelHits>=hcHitsToLevel(blast.level)){
    blast.levelHits=0;
    const was=blast.level;
    for(let n=blast.level+1;n<HC_LEVELS.length;n++) if(hcLevelOk(n)){ blast.level=n; break; }
    blast.fall=Math.max(3500*speedMul(), blast.fall*.9); blast.gap=Math.max(900*speedMul(), blast.gap*.9);
    sfx("level");
    if(blast.level!==was) banner(`LEVEL ${blast.level+1}`, HC_LEVELS[blast.level].n.toUpperCase());
    // a new key for the scale levels once the field is clear of the old key's notes
    gameLater(()=>{ if(blast && blast.kind==="command" && blast.phase==="play"){ blast.items.forEach(i=>{ if(!i.done){ i.done=true; i.el.remove(); } }); hcNewWave(); } }, 2400);
  }
  blastBarCommand();
}

// ---------- Harp Command's demo ----------
// The strings as cannons: names over them, a note falling, the string lighting and firing; then a key
// on the strings, a scale degree and a note on the staff. Same cabinet and captions as the chord demo.
const HC_DEMO=[
  {title:"THE HARP", text:"YOUR CANNONS ARE THE HARP'S TWELVE STRINGS, THE LOWEST ON THE LEFT.", hold:3600, wave:{kind:"chrom"}, labels:true},
  {note:4, text:"A NOTE FALLS. PLUCK THE STRING THAT PLAYS IT.", wave:{kind:"chrom"}, labels:true},
  {note:10, text:"EVERY STRING FIRES ITS OWN CANNON.", wave:{kind:"chrom"}, labels:true},
  {freeze:true, text:"PLUCK A STRING THAT ISN'T FALLING AND YOUR CANNONS FREEZE.", hold:2800, wave:{kind:"chrom"}, labels:true},
  {title:"KEYS", text:"IN A KEY, THE STRINGS PLAY ITS SCALE: HERE D MAJOR, FROM D.", hold:3600, wave:{kind:"scale",scale:"major",tonic:"D",f:2}, labels:true},
  {note:2, text:"F♯ IS THE THIRD STRING NOW.", wave:{kind:"scale",scale:"major",tonic:"D",f:2}, labels:true},
  {note:4, degrees:true, text:"SCALE DEGREES: 5 MEANS THE FIFTH NOTE OF THE SCALE.", wave:{kind:"scale",scale:"major",tonic:"D",f:2}, labels:true},
  {note:4, solfa:true, text:"SOLFÈGE: DO RE MI FA SOL. SOL IS THE FIFTH NOTE TOO.", wave:{kind:"scale",scale:"major",tonic:"D",f:2}, labels:true},
  {note:5, staff:true, text:"AND LAST, NOTES READ OFF THE STAFF.", wave:{kind:"scale",scale:"major",tonic:"D",f:2}, labels:false},
  {note:7, power:"multi", title:"POWER-UPS", text:"POWER-UPS FALL NOW AND THEN: PLUCK ONE TO TAKE IT. MULTISHOT FIRES EVERY CANNON.", wave:{kind:"chrom"}, labels:true},
  {title:"READY?", text:"CHOOSE A LEVEL. PLUCK EACH NOTE BEFORE IT LANDS.", hold:2800, wave:{kind:"chrom"}, labels:false},
];
function commandDemo(){
  if(!blast || blast.kind!=="command") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo"; hcLayout();
  const {el, token, say, sleep, step}=demoShell(endCommandDemo), $d=s=>el.querySelector(s);
  demoHarp("command");
  sfx("attract");
  (async()=>{
    for(const sc of HC_DEMO){
      if(!token.run) return;
      $d(".demotitle").textContent=sc.title||""; $d(".democap").textContent=sc.text;
      blast.wave=sc.wave; blast.demoLabels=sc.labels; blast.labels && hcLabelsShow(sc.labels);
      blast.helpNamesStale=true; helpString(-1);                        // the harp's names follow the scene's key
      if(sc.freeze){ await sleep(700); if(!token.run) return; sfx("freeze"); blast.frozenUntil=performance.now()+1600; popup(blast.field.clientWidth/2, blast.field.clientHeight-70, "FROZEN", "#7FE9FF"); }
      if(sc.note==null){ await sleep(sc.hold||3000); continue; }
      const st=hcStrings(), x=st[sc.note];
      const ch=document.createElement("span"); ch.className="fchord fnote democh";
      if(sc.staff) ch.innerHTML=hcStaffSvg(x.name, sc.note); else ch.textContent = sc.degrees ? String(x.deg) : sc.solfa ? SOLFA[x.deg-1] : x.name;
      if(sc.power){ ch.classList.add("power", `pu-${sc.power}`); ch.insertAdjacentHTML("afterbegin", hcPowerLook(sc.power, "")); }
      ch.style.left=`${blast.cannons[sc.note].x}px`; ch.style.top="96px"; blast.field.appendChild(ch);
      helpString(sc.note);                                              // the string to pluck lights on the harp
      void ch.offsetWidth;                                               // its starting place drawn first, so the fall animates
      ch.style.transition="top 2s linear"; ch.style.top="200px";
      await sleep(1300); if(!token.run){ ch.remove(); return; }
      // the string lights and fires, and the note plays
      const c=blast.cannons[sc.note]; c.fired=performance.now(); sfx("press");
      if(settings.sounds && piano.ctx){ const go=()=>piano.play([60+x.pc],{when:.02,dur:1}); piano.ctx.state==="running" ? go() : piano.ctx.resume().then(go).catch(()=>{}); }
      const fld=blast.field, x1=ch.offsetLeft, y1=ch.offsetTop+ch.offsetHeight/2;
      sfx("shoot");
      blast.fx.missiles.push({x0:c.x/PX, y0:(fld.clientHeight-30)/PX, x1:x1/PX, y1:y1/PX, t0:performance.now(), dur:200, hit:()=>{ sfx("boom"); explode(x1,y1); ch.remove(); }});
      await sleep(900); helpString(-1);
      if(sc.power){ if(!token.run) return; await hcDemoSpray(sleep, token); if(!token.run) return; }
      await sleep(700);
    }
    if(token.run) endCommandDemo(token);
  })();
}
// the demo's multishot: a few notes fall, and every cannon under one fires at once
async function hcDemoSpray(sleep, token){
  const P=HC_POWERS.multi; banner(P.name+"!", P.say); sfx("level");
  const st=hcStrings(), strings=[1,4,6,9,11], fld=blast.field;
  const notes=strings.map((k,i)=>{ const ch=document.createElement("span"); ch.className="fchord fnote democh"; ch.textContent=st[k].name;
    ch.style.left=`${blast.cannons[k].x}px`; ch.style.top=`${70+i%3*30}px`; fld.appendChild(ch); return {ch,k}; });
  await sleep(900); if(!token.run){ notes.forEach(n=>n.ch.remove()); return; }
  sfx("shoot");
  notes.forEach(({ch,k})=>{ const c=blast.cannons[k]; c.fired=performance.now();
    const x1=ch.offsetLeft, y1=ch.offsetTop+ch.offsetHeight/2;
    blast.fx.missiles.push({x0:c.x/PX, y0:(fld.clientHeight-30)/PX, x1:x1/PX, y1:y1/PX, t0:performance.now(), dur:200, hit:()=>{ explode(x1,y1); ch.remove(); }}); });
  setTimeout(()=>sfx("boom"), 200);
  await sleep(1200); notes.forEach(n=>n.ch.remove());
}
function hcLabelsShow(on){ const st=hcStrings(); [...blast.labels.children].forEach((l,i)=>{ l.innerHTML = on ? hcLabelText(st[i]) : ""; l.style.left=`${blast.cannons[i].x}px`; }); }
// a string's label: its name, and on the chromatic strip the black-key strings' flat name under the sharp
const hcLabelText=x=> x.alt ? `${x.name}<br>${x.alt}` : x.name;
function endCommandDemo(token){
  if(blast && blast.demo===token) demoHarpDone();
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.wave={kind:"chrom"}; hcLabelsShow(false);
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.kind==="command" && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) commandDemo(); }, 25000);
  cabRestart();
}
