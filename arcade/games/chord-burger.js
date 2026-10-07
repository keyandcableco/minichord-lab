// Chord Burger: BurgerTime, where a burger is a chord voicing. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
// ---------- Chord Burger ----------
// The old kitchen game, and a burger is a chord. Four plates stand along the bottom, each with its
// four ingredients lying on the floors above it: bun, patty, lettuce, bun. The minichord plays every
// chord in four voices, so the two line up one for one: read from the plate up, a burger is a chord
// read from the bass up, and each ingredient is spelled with its note. Walk the whole width of an
// ingredient and it drops a floor, knocking down any below it; nothing ever changes their order, so a
// plate's voicing can be read off its column from the moment the kitchen opens. As each lands on its
// plate it sounds its note.
//
// A full plate is served by playing its chord on the minichord, voiced as stacked. The chord buttons
// name it; a knob swings the chord's inversion (the minichord's address 37), so the right note is on
// the bottom; a second knob sets its spacing (38: close, drop 2, drop 3, drop 2 and 4), for the open
// voicings. In close position a triad's fourth voice is its bass again, so the two buns are the same
// note: the buns are the bass. Up to the open kitchens a serve is judged on the chord and its bass, so
// a slash chord does as well as the knob; from them on, on the whole stack, note for note. A wrong
// serve costs nothing but time: a plate's hot for a few seconds, worth half as much again, then cools.
//
// The sour notes (a hot dog, an egg, a pickle) chase the cook along the floors and up the ladders,
// each wearing a note; one that touches the cook costs a life. An ingredient dropped on one squashes
// it, and any standing on an ingredient as it drops ride it all the way down, as in the old game: it
// knocks everything under it down onto its plate, floor by floor, still in its order, and comes to
// rest on the lowest floor, the riders squashed there for a bonus that doubles with every one. It's
// left there to be walked across, onto the plate, to finish the burger. The pepper is a chord: play one, and every
// sour note in the kitchen whose note is in it is harmonised, sweet and harmless for a few seconds. Five
// shakes a kitchen, spent only on a chord that harmonises something (or one wasted on sour notes it
// doesn't catch); a chord that serves a plate peppers for free.
//
// A kitchen's four plates, left to right, are a progression of its key; served in that order, it's a
// COMBO MEAL. From the Orders kitchens a ticket hangs over each plate and its column is out of order:
// FLIP (A on the harp, or Space) swaps the ingredient the cook stands on with the next one down its
// column, a few flips a kitchen. A burger served to its ticket scores a bonus; one served otherwise,
// its ticket's chord played, for half. Bonus food turns up now and then: SIDE ORDER (a shake of
// pepper), FERMATA (the sour notes hold still) and DA CAPO (a life).
//
// The cook walks for as long as the way is held on the harp (kmHeld, ../controller.js) or the arrow
// keys; a way held while walking past a ladder takes it. VOICING on the title screen: MINE (the knobs
// are the player's, half as much again) or SET FOR ME (the game turns the knobs to each plate as it
// fills, and the player only names the chord).

// ---------- the kitchen ----------
// Five floors, each a girder or girders across the kitchen's 29 squares, joined by ladders. Each
// plate's ingredients lie four wide above it, on four of the five floors; an ingredient falls to the
// next floor down with a girder under it, and from the lowest, onto its plate.
const BK_COLS=29, BK_NF=5, BK_SPANS=[2,9,16,23];                    // squares across, floors, each plate's left square
const BK_KITCHENS=[
  {floors:[[[0,28]],[[0,28]],[[0,28]],[[0,28]],[[0,28]]],
   ladders:[[0,7,14,21,28],[1,8,13,22,27],[0,6,15,20,28],[1,7,14,21,27]],
   cols:[[0,1,2,4],[0,2,3,4],[0,1,3,4],[1,2,3,4]]},
  {floors:[[[0,28]],[[0,13],[15,28]],[[0,28]],[[0,6],[8,20],[22,28]],[[0,28]]],
   ladders:[[0,8,13,20,28],[1,6,15,22,27],[0,8,14,20,28],[1,6,13,15,22,27]],
   cols:[[0,1,3,4],[0,1,2,4],[1,2,3,4],[0,2,3,4]]},
  {floors:[[[0,28]],[[0,28]],[[0,10],[14,28]],[[0,28]],[[0,28]]],
   ladders:[[1,7,14,20,27],[0,8,15,21,28],[1,6,14,22,27],[0,8,13,20,28]],
   cols:[[0,1,2,3],[0,1,3,4],[0,2,3,4],[1,2,3,4]]},
];
const BK_START={x:14, f:4};
const BK_EPS=1e-4, BK_CLIMB=3.5;                                     // a floor climbed costs what three and a half squares walked do
const bkKitchen=()=> blast.kitchen;
const bkOnFloor=a=> Math.abs(a.y-Math.round(a.y))<BK_EPS;
/** the girder under x on floor f, as [from, to], or null */
function bkSeg(f, x, K=bkKitchen()){
  if(f<0 || f>=BK_NF) return null;
  return K.floors[f].find(([a,b])=>x>=a-BK_EPS && x<=b+BK_EPS) || null;
}
const bkLadder=(gap, x, K=bkKitchen())=> gap>=0 && gap<BK_NF-1 && K.ladders[gap].includes(x);
// whether an ingredient four wide from x0 lies on a girder on floor f
const bkHolds=(f, x0, K=bkKitchen())=> !!bkSeg(f, x0, K) && bkSeg(f, x0, K)===bkSeg(f, x0+3, K);

// ---------- getting about ----------
// The cook and the sour notes go the same way: x in squares along a floor, y in floors (a whole number
// on a floor, between two on a ladder). Each moment the first of the ways asked for that can be taken
// is taken: along a girder to its end, or up or down a ladder, one within half a square of a floor
// first stepped onto. Walking stops at each ladder it passes while a way up or down is asked for, so
// that way can be taken there.
function bkCan(a, w){
  if(w==="left" || w==="right"){
    if(!bkOnFloor(a)) return null;
    const s=bkSeg(Math.round(a.y), a.x); if(!s) return null;
    const lim= w==="left" ? s[0] : s[1];
    return Math.abs(lim-a.x)>BK_EPS ? {w, lim} : null;
  }
  if(w!=="up" && w!=="down") return null;
  const up=w==="up";
  if(!bkOnFloor(a)) return {w, lim: up ? Math.floor(a.y) : Math.ceil(a.y)};      // on a ladder: on to the next floor
  const f=Math.round(a.y), col=Math.round(a.x);
  if(Math.abs(col-a.x)>.5+BK_EPS || !bkLadder(up ? f-1 : f, col)) return null;
  return {w, align:col, lim: up ? f-1 : f+1};
}
function bkMove(a, dist, ways, tread){
  a.moving=false;
  for(let guard=0; guard<10 && dist>BK_EPS; guard++){
    let plan=null; for(const w of ways){ plan=bkCan(a,w); if(plan) break; }
    if(!plan) return;
    a.moving=true; a.dir=plan.w;
    if(plan.align!=null && Math.abs(a.x-plan.align)>BK_EPS){       // onto the ladder's square first
      const d=Math.min(dist, Math.abs(plan.align-a.x)); a.x+=Math.sign(plan.align-a.x)*d; dist-=d;
      if(Math.abs(plan.align-a.x)<BK_EPS) a.x=plan.align;
      if(tread) tread(a);
      continue;
    }
    if(plan.w==="left" || plan.w==="right"){
      const s= plan.w==="left" ? -1 : 1, f=Math.round(a.y);
      if(a.goal!=null && Math.abs(a.goal-a.x)<BK_EPS) return;        // the demo's cook stands on the square it walked to
      let stop=plan.lim;
      if(a.goal!=null && (a.goal-a.x)*s>0 && (a.goal-stop)*s<0) stop=a.goal;
      if(ways.some(w=>w==="up" || w==="down"))
        for(const gap of [f-1,f]) for(const col of bkKitchen().ladders[gap]||[]) if((col-a.x)*s>BK_EPS && (col-stop)*s<0) stop=col;
      const d=Math.min(dist, Math.abs(stop-a.x)); a.x+=s*d; dist-=d;
      if(Math.abs(stop-a.x)<BK_EPS) a.x=stop;
      if(tread) tread(a);
    } else {
      const s= plan.w==="up" ? -1 : 1, d=Math.min(dist/BK_CLIMB, Math.abs(plan.lim-a.y));
      a.y+=s*d; dist-=d*BK_CLIMB;
      if(Math.abs(plan.lim-a.y)<BK_EPS) a.y=plan.lim;
    }
  }
}

// ---------- chords, keys and levels ----------
// a chord by its numeral: [letters up, semitones up, kind of chord]
const BK_NUM={
  "I":[0,0,""], "ii":[1,2,"m"], "iii":[2,4,"m"], "IV":[3,5,""], "V":[4,7,""], "vi":[5,9,"m"],
  "Imaj7":[0,0,"maj7"], "ii7":[1,2,"m7"], "iii7":[2,4,"m7"], "IVmaj7":[3,5,"maj7"], "V7":[4,7,"7"], "vi7":[5,9,"m7"],
};
// the progressions a kitchen's plates can be, left to right, by the chords they need
const BK_PROGS={
  triad:[{seq:["I","vi","IV","V"], name:"THE FIFTIES"}, {seq:["I","V","vi","IV"], name:"THE FOUR CHORDS"}, {seq:["I","IV","V","I"], name:"THREE CHORDS AND THE TRUTH"},
    {seq:["vi","IV","I","V"], name:"THE MINOR FOUR"}, {seq:["ii","V","I","vi"], name:"ii–V–I"}, {seq:["I","iii","IV","V"], name:"THE STROLL"}],
  seventh:[{seq:["ii7","V7","Imaj7","vi7"], name:"ii–V–I"}, {seq:["Imaj7","vi7","ii7","V7"], name:"THE TURNAROUND"}, {seq:["iii7","vi7","ii7","V7"], name:"ROUND THE CIRCLE"},
    {seq:["IVmaj7","V7","iii7","vi7"], name:"THE ROYAL ROAD"}],
  two:[{seq:["I","vi7","IV","ii7"], name:"SIXES AND SEVENS"}, {seq:["IV","ii7","I","vi7"], name:"SIXES AND SEVENS"}],
};
BK_PROGS.mixed=[...BK_PROGS.triad, ...BK_PROGS.seventh];
// The levels. inv and sp: the inversions and spacings dealt; must: one the level's about, dealt to at
// least two plates; full: a serve judged on the whole stack, not only the chord and its bass; keys:
// how far round the circle of fifths the kitchen's key can be (none: C); orders: tickets and FLIP;
// hidden: the ingredients unlettered until they land.
const BK_LEVELS=[
  {n:"Root position",       q:"triad",   inv:[0],       sp:[0]},
  {n:"First inversion",     q:"triad",   inv:[0,1],     sp:[0], must:{inv:1}},
  {n:"Second inversion",    q:"triad",   inv:[0,1,2],   sp:[0], must:{inv:2}},
  {n:"Any inversion",       q:"triad",   inv:[0,1,2],   sp:[0], keys:2},
  {n:"Sevenths",            q:"seventh", inv:[0,1,2,3], sp:[0], keys:2, knob:true},
  {n:"Drop 2",              q:"mixed",   inv:[0,1,2],   sp:[0,1], must:{sp:1}, full:true, keys:2},
  {n:"Drop 3, drop 2+4",    q:"mixed",   inv:[0,1,2],   sp:[0,1,2,3], must:{sp:2}, full:true, keys:3},
  {n:"Orders",              q:"triad",   inv:[0,1,2],   sp:[0,1], full:true, keys:2, orders:true},
  {n:"Two names",           q:"two",     inv:[0],       sp:[0], full:true, keys:2},
  {n:"By ear",              q:"mixed",   inv:[0,1,2],   sp:[0,1], full:true, keys:3, hidden:true},
];
const bkLevel=(i=blast.level)=> BK_LEVELS[Math.min(i, BK_LEVELS.length-1)];
const BK_INV=["ROOT","1ST INV","2ND INV","3RD INV"], BK_SP=["CLOSE","DROP 2","DROP 3","DROP 2+4"];
// what this minichord can play: the knob levels need the inversion set from here, the whole-stack
// levels the spacing too; the rest only a bass, which a slash chord gives
const bkVoices=()=> canWrite() && hasSetting(37) && hasSetting(38);
const bkLevelOk=i=>{ const L=BK_LEVELS[i]; return L.full ? bkVoices() : L.knob ? canWrite() && hasSetting(37) : true; };
function bkKey(f){
  const name=KEY_BY_FIFTHS[f]; return {f, name, label:`${name} MAJOR`, pc:pcOfName(name)};
}
// A plate's chord: the numeral in the key, its inversion and spacing, and the four voices the
// minichord sounds for it (firmwareStack, ../../practice/games.js), low to high, each spelled.
// The pitches are the firmware's two octaves up (chord shuffling 5), so every drop has room.
function bkChord(key, num, inv=0, sp=0){
  const d=BK_NUM[num]; if(!d) return null;
  const root=above(key.name, d[0], d[1]); if(!root) return null;
  const tones=spellChord(root, d[2]); if(!tones || tones.some(t=>/[𝄪𝄫]/.test(t))) return null;
  const rootPc=pcOfName(root), seventh=tones.length===4;
  if(!seventh && inv>2) inv=0;
  const pitches=firmwareStack(rootPc, VL_TONES[d[2]], inv, sp, 24).map(p=>p+24);
  const nameOf=pc=>tones.find(t=>pcOfName(t)===mod(pc,12));
  const names=pitches.map(nameOf), pcs=pitches.map(p=>mod(p,12));
  const bass=names[0], sym=root+d[2]+(pcs[0]!==rootPc ? "/"+bass : "");
  return {num, root, q:d[2], rootPc, inv, sp, seventh, pitches, pcs, names, bass, bassPc:pcs[0], sym,
    say:`${sym}${sp ? " · "+BK_SP[sp] : ""}`};
}
// the other name a stack can go by: a minor seventh with its third in the bass is its relative's sixth
function bkOtherName(c){
  if(c.q!=="m7" || c.inv!==1) return null;
  return `${c.names[0]}6`;
}

// ---------- the game ----------
function genBurger(){
  return {kind:"burger", prompt:"Chord Burger", sub:"Walk the ingredients down onto the plates; a full plate is a chord, read from the plate up. Serve it by playing it, voiced as stacked.",
    answer:{type:"burger", get name(){ const p=blast && blast.kind==="burger" && bkReady()[0]; return p ? p.chord.sym : "a full plate's chord"; }},
    get hint(){ const p=blast && blast.kind==="burger" && bkReady()[0]; return p ? `Read it from the plate up: ${p.stack.map(i=>i.name).join(" ")}.` : "Fill a plate first."; },
    context:0};
}
function startBurger(){
  blast={kind:"burger", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), clock:0, cook:null, sour:[], ings:[], plates:[], st:"idle", voicing:{inv:0, sp:0}};
  bkDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  bkMenu();
  blast.raf=requestAnimationFrame(bkTick);
}
// The harp chromatic, a d-pad; the key signature the kitchen's; the chords voiced from the knobs, two
// octaves up so every drop has room, without voice leading, which would re-voice them; and the knobs
// sending where they are, inert where the firmware can make them so.
function bkDevice(){
  if(!blast || blast.kind!=="burger" || !canWrite()) return;
  arcadeSetup(()=>{
    kmHarp();
    if(hasSetting(35)) borrow(35, keyIndexOf(blast.key ? blast.key.f : 0));
    if(hasSetting(111)) ensure(111,0);
    if(hasSetting(120)) ensure(120,5);
    if(hasSetting(198)){ const was=(198 in borrowed) ? borrowed[198] : (mc.params[198]??2); ensure(198, Math.max(0, was-1)); }   // shuffling 5 is an octave over the usual: down one, to sound as before
    if(hasSetting(37)) ensure(37, blast.voicing.inv);
    if(hasSetting(38)) ensure(38, blast.voicing.sp);
    if(knobsReady()) borrow(238,1);
    blast.knobsInert=arcadeKnobsInert();
  });
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==BK_LEVELS.map((_,i)=>bkLevelOk(i)).join()) menuRebuild(()=>bkMenu());
  bkKeyCheck();
  if(blast.phase==="play" && !pollT) poll(true);
}
function buildBurgerField(box){
  const field=document.createElement("div"); field.className="field arcade burger"; field.setAttribute("aria-label","The kitchen");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="burger"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), strip:kmStrip(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // the kitchen's own screen, at the old game's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  bkBar(); setTimeout(helperSync);
}
function bkBar(){
  if(!blast || blast.kind!=="burger" || !blast.hud) return;
  const k=blast.key ? ` · ${blast.key.label}` : "", v=blast.voicing, L=blast.phase==="play" || blast.phase==="demo" ? bkLevel() : null;
  const voice=L && (L.full || L.knob || L.inv.length>1) ? ` · ${BK_INV[v.inv]}${L.full ? " · "+BK_SP[v.sp] : ""}` : "";
  const flips=L && L.orders ? ` · FLIP ${blast.flips??0}` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${k}${voice} · PEPPER ${blast.pepper??0}${flips}${bkPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const bkAuto=()=> !!saved.bkAuto;
const BKMENU_G={key:"burger", title:"CHORD BURGER",
  rules:()=>`<p>WALK ACROSS AN INGREDIENT TO DROP IT A FLOOR. WALK THEM ALL DOWN ONTO THE PLATES.</p><p>A FULL PLATE IS A CHORD, READ FROM THE PLATE UP: THE BOTTOM BUN IS THE BASS. SERVE IT BY PLAYING IT, ${bkAuto() ? "THE KNOBS TURNED FOR YOU" : "VOICED AS STACKED: ONE KNOB PUTS THE RIGHT NOTE ON THE BOTTOM, THE OTHER OPENS IT OUT"}.</p><p>THE SOUR NOTES WEAR NOTES. PEPPER THEM WITH A CHORD THAT HAS THEIR NOTE IN IT, OR DROP AN INGREDIENT ON THEM. DROP ONE WITH THEM ON IT AND IT KNOCKS ALL UNDER IT DOWN ONTO THE PLATE.</p><p>SERVE THE PLATES LEFT TO RIGHT FOR A COMBO MEAL.</p><p>${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME" : pfKnob("burger") ? pfSteerSay("FLIP") : "WALK ON THE HARP OR THE ARROW KEYS: HOLD THE WAY"}.</p>`,
  levels:BK_LEVELS, ok:i=>bkLevelOk(i), needs:"NEEDS A MINICHORD THE GAME CAN VOICE", begin:i=>beginBurger(i), demo:()=>bkDemo(), modNote:"title"};
function bkMenu(over){ arcadeMenu(BKMENU_G, over); }
function beginBurger(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, kitchenN:0, phase:"play", over:false, clock:0, demoAuto:false, demoWays:null, keySet:false});
  if(canWrite() && hasSetting(33)) ensure(33,0);                // no Barry Harris: the plain chords
  saved.burgerStart=level; save();
  stats.streak=0; scoreboard();
  bkNewKitchen(); bkPlace();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(bkTick);
  bkLevelBanner();
  sfx("start"); bkBar();
}
// on the screen's minichord, how to set the key while it's still the player's to set
const bkKeyHint=()=> keyOnScreen() && bkComboOk() && !blast.keySet ? ` · SET IT: ${keyHoldHow(blast.key.f)}` : "";
function bkLevelBanner(){ banner(`LEVEL ${blast.level+1}`, `${bkLevel().n.toUpperCase()} · ${blast.key.label}${bkKeyHint()}`); }

// A fresh kitchen: its layout, its key, its progression dealt to the plates, the ingredients lettered
// with their plates' notes, the pepper and flips topped up.
function bkNewKitchen(){
  bkFloorsApart(); blast.layoutKey=null;
  const L=bkLevel(), n=blast.kitchenN||0;
  blast.kitchen=BK_KITCHENS[n % BK_KITCHENS.length];
  const f = L.keys ? rnd([...Array(2*L.keys+1).keys()].map(i=>i-L.keys)) : 0;
  bkSetKey(bkKey(f));
  bkDeal();
  blast.pepper=5; blast.flips=L.orders ? 3 : 0; blast.served=[]; blast.caps=[]; blast.capNext=blast.clock+25; blast.drops=0;
  blast.fermataUntil=0; blast.sweetUntil=0;
}
function bkSetKey(key){
  blast.key=key; blast.keySet=false; blast.keyByGame=false;
  if(blast.phase==="play" && canWrite() && hasSetting(35) && !bkComboOk()){ blast.keyByGame=true; borrow(35, keyIndexOf(key.f)); }
  bkKeyCheck();
}
// the progression and each plate's voicing: the level's new voicing on two plates at least
function bkDeal(){
  const L=bkLevel(), K=bkKitchen();
  let prog=null, chords=null;
  for(let tries=0; tries<40 && !chords; tries++){
    prog=rnd(BK_PROGS[L.q]);
    const must=L.must ? shuffle([0,1,2,3]).slice(0,2) : [];
    const cs=prog.seq.map((num,p)=>{
      const two=L.q==="two" && /7$/.test(num);
      let inv = two ? 1 : must.includes(p) && L.must.inv!=null ? L.must.inv : rnd(L.inv);
      let sp = must.includes(p) && L.must.sp!=null ? rnd(L.sp.filter(s=>s>=L.must.sp)) : rnd(L.sp);
      return bkChord(blast.key, num, inv, sp);
    });
    if(cs.every(Boolean)) chords=cs;
  }
  blast.prog=prog;
  blast.plates=chords.map((c,p)=>({p, x0:BK_SPANS[p], chord:c, ticket:L.orders ? c : null, stack:[], state:"filling", readyAt:0}));
  // each plate's ingredients on its floors, the bottom bun lowest; for an order, two of the columns a
  // swap out of order, so the kitchen's three flips are enough with one to spare
  blast.ings=[]; const scramble=shuffle([0,1,2,3]).slice(0,2);
  blast.plates.forEach((P,p)=>{
    const floors=[...K.cols[p]].sort((a,b)=>b-a), notes=P.chord.names.map((name,k)=>({name, pitch:P.chord.pitches[k], pc:P.chord.pcs[k]}));
    if(L.orders && scramble.includes(p)) for(let s=0; s<8; s++){ const k=Math.floor(Math.random()*3); if(notes[k].pc===notes[k+1].pc) continue; [notes[k],notes[k+1]]=[notes[k+1],notes[k]]; break; }
    floors.forEach((f,k)=>blast.ings.push({p, k, x0:P.x0, f, y:f, state:"rest", pressed:[0,0,0,0], ...notes[k]}));
  });
}
// everyone where they start: after a lost life too (the ingredients stay where they are)
function bkPlace(){
  blast.cook={x:BK_START.x, y:BK_START.f, dir:"left", moving:false};
  const L=bkLevel(), count=Math.min(5, 3+Math.floor(blast.level/3)+Math.floor((blast.kitchenN||0)/4));
  const notes=bkSourPool();
  blast.sour=Array.from({length:count}, (_,i)=>({i, kind:["dog","egg","pickle"][i%3], x:i%2 ? BK_COLS-1 : 0, y:i%2 ? 0 : BK_NF-1, dir:i%2?"left":"right",
    state:"wait", at:blast.clock+2+i*2.6*Math.sqrt(speedMul()), ...bkSourNote(notes)}));
  blast.st="ready"; blast.stUntil=blast.clock+(blast.phase==="play" ? 1.8 : .2);
  bkHeldReset();
}
// the notes a sour note can wear: outside the key at first, so a chord of the key won't catch it by
// chance; anything from the Sevenths on
function bkSourPool(){
  const key=blast.key, inKey=new Set(MAJOR.map(s=>mod(key.pc+s,12)));
  const pcs=[...Array(12).keys()].filter(pc=>blast.level>=4 || !inKey.has(pc));
  return pcs;
}
function bkSourNote(pool){
  const pc=rnd(pool), names=blast.key.f<0 ? FLAT_NAMES : SHARP_NAMES;
  return {pc, name:names[pc]};
}

// ---------- each frame ----------
function bkTick(now){
  if(!blast || blast.kind!=="burger") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;   // a frame stamped before the game began counts for nothing, not for less
  if((blast.phase==="play" || blast.phase==="demo") && blast.cook) bkStep(dt);
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(bkTick);
}
// how fast, in squares a second: slower at the relaxed speeds, a little faster each kitchen
const bkSpeed=()=> 4.6/Math.sqrt(speedMul())*(1+.035*Math.min(blast.kitchenN||0,10));
const bkSourSpeed=()=> bkSpeed()*Math.min(.9, .58+.03*blast.level+.015*(blast.kitchenN||0))*(blast.demoAuto?.7:1);
const bkFallSpeed=3.2;                                                 // floors a second
function bkStep(dt){
  blast.clock+=dt;
  if(blast.st==="ready"){ if(blast.clock>=blast.stUntil) blast.st="go"; return; }
  if(blast.st==="dying"){ if(blast.clock>=blast.stUntil) bkAfterDeath(); return; }
  if(blast.st==="clear"){ if(blast.clock>=blast.stUntil) bkNextKitchen(); return; }
  if(blast.st!=="go") return;
  bkMove(blast.cook, bkSpeed()*dt, bkWays(), bkTread);
  bkFalls(dt);
  bkSourStep(dt);
  bkCollide();
  bkTimers();
}

// ---------- the way held ----------
// The harp's d-pad held (kmHeld), the arrow keys held, or the demo's ways: the newest first. Steered
// on the knob (pfKnob, ../controls.js), the way to the square it points to, after up or down held on
// the harp: walking with one held, the first ladder that way is taken.
const BK_ARROWS={ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right"};
const bkKeysHeld=new Map();                                           // way → when its key went down
function bkHeldReset(){ bkKeysHeld.clear(); }
function bkWays(){
  if(blast.phase==="demo") return blast.demoWays || [];
  const keys=[...bkKeysHeld.entries()].sort((a,b)=>b[1]-a[1]).map(([w])=>w);
  if(pfKnob()){
    const C=blast.cook, at=pfKnobAt(1, BK_COLS-2); if(at!=null && C) C.goal=Math.round(at);
    const t=C && pfToward(C.x, C.goal, BK_EPS);
    return [...new Set([...keys, ...pfHeld(), ...(t ? [t] : [])])];
  }
  const harp=kmHeld().filter(z=>z==="up" || z==="down" || z==="left" || z==="right");
  return [...new Set([...keys, ...harp])];
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="burger" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const letters = !(typeof kbOn==="function" && kbOn());          // in keyboard play the letters are the instrument's
  const w=Object.assign({...BK_ARROWS}, letters ? {KeyW:"up", KeyS:"down", KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w && blast && blast.phase==="play"){ e.preventDefault(); if(!e.repeat) bkKeysHeld.set(w, performance.now()); return; }
  if(!blast || blast.phase!=="play" || e.repeat) return;
  const turn={BracketLeft:[-1,0], BracketRight:[1,0], Semicolon:[0,-1], Quote:[0,1]}[e.code];
  if(turn){ e.preventDefault(); const v=blast.voicing; bkVoice(v.inv+turn[0], v.sp+turn[1], true); return; }
  if(e.code==="Space"){ e.preventDefault(); bkFlip(); }
});
document.addEventListener("keyup", e=>{
  const letters = !(typeof kbOn==="function" && kbOn());
  const w=Object.assign({...BK_ARROWS}, letters ? {KeyW:"up", KeyS:"down", KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w) bkKeysHeld.delete(w);
});
window.addEventListener("blur", ()=>bkKeysHeld.clear());

// ---------- the ingredients ----------
// the cook's feet on an ingredient press the section under them down
function bkTread(a){
  if(!bkOnFloor(a)) return;
  const f=Math.round(a.y), tx=Math.round(a.x);
  const ing=blast.ings.find(i=>i.state==="rest" && i.f===f && tx>=i.x0 && tx<=i.x0+3); if(!ing) return;
  const s=tx-ing.x0; if(ing.pressed[s]) return;
  ing.pressed[s]=1; sfx("step", s);
  if(ing.pressed.every(Boolean)){ bkDrop(ing); if(blast.phase==="play"){ blast.score+=mulPts(50*(blast.level+1)); bkBar(); } }
}
// Dropped: it falls to the next floor with a girder under it, or onto its plate; one already there is
// knocked down in turn. With sour notes standing on it, it goes on down to the lowest floor
// (ing.ridden), and every one it knocks goes on down onto its plate (ing.through): each, landed,
// falls again once the floor under it is clear (bkThrough), so the column goes down a floor apart,
// in its order.
function bkDrop(ing, through){
  const riders=blast.sour.filter(e=>(e.state==="walk" || e.state==="sweet") && bkOnFloor(e) && Math.round(e.y)===ing.f && e.x>=ing.x0-.5 && e.x<=ing.x0+3.5);
  riders.forEach(e=>{ e.state="ride"; e.ride=ing; });
  if(riders.length) ing.ridden=true;
  if(through) ing.through=true;
  const target=bkNextFloor(ing);
  const ahead=bkFallingTo(ing.p);
  ing.state="fall"; ing.pressed=[0,0,0,0]; ing.riders=[...(ing.riders||[]), ...riders];
  ing.to = target!=null ? {f:target} : {plate:true};
  ing.toY = target!=null ? target : bkPlateY(blast.plates[ing.p].stack.length + ahead);
  blast.drops=(blast.drops||0)+1;
  sfx("drop");
}
// how many of a plate's ingredients are already on their way down onto it
const bkFallingTo=p=> blast.ings.filter(i=>i.p===p && i.state==="fall" && i.to && i.to.plate).length;
// the next floor down with a girder under an ingredient, or null: its plate
function bkNextFloor(ing){
  for(let t=ing.f+1; t<BK_NF; t++) if(bkHolds(t, ing.x0)) return t;
  return null;
}
// one going on down, landed, falls again once nothing in its column is falling to the floor under
// it, or still within a floor of it (so they land on the plate in turn), or waiting there to go on
// down itself
function bkThrough(ing){
  const t=bkNextFloor(ing);
  if(blast.ings.some(o=>o!==ing && o.p===ing.p && (o.state==="fall" ? (t!=null && o.to.f===t) || o.y<ing.y+1 : o.state==="rest" && o.f===t && (o.through || o.ridden)))) return;
  bkDrop(ing, ing.through);
}
function bkFalls(dt){
  for(const ing of blast.ings){
    if(ing.state==="rest" && (ing.through || ing.ridden)){ bkThrough(ing); continue; }
    if(ing.state!=="fall") continue;
    const y0=ing.y; ing.y=Math.min(ing.toY, ing.y+bkFallSpeed*dt);
    for(const e of ing.riders||[]) if(e.state==="ride"){ e.y=ing.y; }
    bkSquashUnder(ing, y0, ing.y);
    if(ing.y>=ing.toY-BK_EPS) bkLand(ing);
  }
}
// sour notes under a falling ingredient are squashed
function bkSquashUnder(ing, y0, y1){
  for(const e of blast.sour){
    if(e.state!=="walk" && e.state!=="sweet") continue;
    if(e.x<ing.x0-.5 || e.x>ing.x0+3.5) continue;
    if(e.y>y0+.05 && e.y<=y1+.05){ bkSquash(e); if(blast.phase==="play"){ const pts=mulPts(500*(blast.level+1)); blast.score+=pts; bkPop(e, `+${pts}`, "#FFD35A"); bkBar(); } }
  }
}
function bkLand(ing){
  const riders=(ing.riders||[]).filter(e=>e.state==="ride");
  if(ing.to.plate){
    const P=blast.plates[ing.p];
    ing.state="plate"; ing.through=ing.ridden=false; ing.k=P.stack.length; ing.y=bkPlateY(ing.k); P.stack.push(ing);
    sfx("note", ing.pitch);
    if(P.stack.length===4) bkPlateFull(P);
  } else {
    const below=blast.ings.find(o=>o!==ing && o.p===ing.p && o.state==="rest" && o.f===ing.to.f);
    ing.state="rest"; ing.f=ing.to.f; ing.y=ing.f;
    sfx("land");
    if(below) bkDrop(below, ing.through || ing.ridden);
    if(ing.ridden && bkNextFloor(ing)==null) ing.ridden=false;          // down on the lowest floor: the ride's over
    if(ing.through || ing.ridden) return;                               // its riders ride on
  }
  if(riders.length){
    riders.forEach(e=>bkSquash(e));
    if(blast.phase==="play"){ const pts=mulPts(500*2**riders.length*(blast.level+1)); blast.score+=pts; bkPop(riders[0], `+${pts}`, "#FFD35A");
      banner(`${riders.length} RODE IT DOWN`, `+${pts}`); bkBar(); }
  }
  ing.riders=null;
}

// ---------- the plates ----------
const BK_T=8, BK_TOP=30, BK_IH=8, BK_PLATE_DROP=48;                    // a square, the top floor's girder, an ingredient's height, the plates under the bottom floor
// A floor's height: 24 pixels, as the old game's, or on a phone held upright, where the kitchen's zoomed
// in to fill the height and scrolls across, 32, so there's more of the kitchen to see up and down and
// less of it lost off the sides. Its height follows. Set as each kitchen starts (a floor's a floor
// however tall: the cook and what falls go by floors).
let BK_FH=24, BK_H=204;
function bkFloorsApart(){
  const {aw, ah}=pxRoom(); BK_FH= ah/aw>1.2 ? 32 : 24; BK_H=108+4*BK_FH;
}
const bkFloorPx=y=> BK_TOP+y*BK_FH;
const bkPlateBase=()=> bkFloorPx(BK_NF-1)+BK_PLATE_DROP;
// the height an ingredient lands at on a plate, k already under it, in floors
const bkPlateY=k=> (bkPlateBase()-k*BK_IH-BK_TOP)/BK_FH;
const bkReady=()=> (blast.plates||[]).filter(P=>P.state==="ready").sort((a,b)=>a.readyAt-b.readyAt);
const bkHotSecs=()=> 5*Math.sqrt(speedMul());
function bkPlateFull(P){
  P.state="ready"; P.readyAt=blast.clock;
  if(blast.phase!=="play") return;
  sfx("ready");
  if(!blast.keySet && bkComboOk()){ blast.keyByGame=true; borrow(35, keyIndexOf(blast.key.f)); }   // not set by the first plate: set for you
  if(!blast.toldServe){ blast.toldServe=true; banner("ORDER UP!", bkAuto() ? "READ IT FROM THE PLATE UP AND PLAY THE CHORD" : "READ IT FROM THE PLATE UP: PLAY THE CHORD, THE KNOB PUTTING THE BOTTOM BUN IN THE BASS"); }
}
// the stack played against a plate: served, or why not
function bkJudge(P, pitches){
  const L=bkLevel(), heard=[...pitches].map(p=>Math.round(p)).sort((a,b)=>a-b).map(p=>mod(p,12));
  const landed=P.stack.map(i=>i.pc), c=P.ticket || P.chord;
  const sameStack=(a,b)=>{ const dd=x=>x.filter((v,i)=>i===0 || v!==x[i-1]); return a.length===b.length ? a.every((v,i)=>v===b[i]) : dd(a).join()===dd(b).join(); };
  if(P.ticket){
    if(!isChord(pitches, c.rootPc, c.q)) return {ok:false};
    const asOrdered=landed.every((pc,k)=>pc===c.pcs[k]);
    if(!asOrdered) return {ok:true, half:true, why:"NOT AS ORDERED"};
    if(!sameStack(heard, landed)) return {ok:false, why:`VOICE IT AS STACKED: ${P.stack.map(i=>i.name).join(" ")}`};
    return {ok:true, ticket:true};
  }
  if(L.full) return sameStack(heard, landed) ? {ok:true} : {ok:false};
  if(!isChord(pitches, c.rootPc, c.q)) return {ok:false};
  return heard[0]===c.bassPc ? {ok:true} : {ok:false, why:`${c.bass} IN THE BASS`};
}
function bkServe(P, res){
  const c=P.chord, hot=blast.clock-P.readyAt<bkHotSecs();
  const cool=hot ? 1.5 : Math.max(.5, 1-(blast.clock-P.readyAt-bkHotSecs())/30);
  let pts=(c.seventh ? 800 : 500)*(c.inv ? 1.5 : 1)*(c.sp ? 2 : 1)*cool*(res.half ? .5 : 1);
  if(res.ticket) pts+=1000;
  pts=mulPts(Math.round(pts)*(blast.level+1));
  P.state="served"; blast.served.push(P.p);
  if(blast.phase==="play"){ blast.score+=pts; bkPop({x:P.x0+1.5, y:bkPlateY(4)}, `+${pts}`, hot ? "#FF9A3C" : "#7FE08A"); }
  sfx("serve", P.stack.map(i=>i.pitch));
  const other=bkOtherName(c);
  heard(`${c.sym}${other ? " = "+other : ""}`, true);
  if(res.why) banner("SERVED", res.why);
  if(blast.served.length===4 && blast.served.every((p,i)=>p===i)){
    const cp=mulPts(1500*(blast.level+1)); if(blast.phase==="play") blast.score+=cp;
    banner("COMBO MEAL!", `${blast.prog.name}: ${blast.prog.seq.join(" – ")} · +${cp}`); gameLater(()=>sfx("meal", blast.key && blast.key.pc), 250);
  }
  bkBar();
  if(blast.plates.every(x=>x.state==="served")) bkClear();
}

// ---------- the sour notes ----------
// They come in from the ends of the floors, one at a time, and make for the cook: along a floor when
// they're on its floor, otherwise for the nearest ladder that way. Now and then one takes a whim and
// wanders off somewhere else for a while, so they don't move as one.
function bkSourStep(dt){
  const still=blast.clock<blast.fermataUntil, sp=bkSourSpeed();
  for(const e of blast.sour){
    if(e.state==="wait"){ if(blast.clock>=e.at){ e.state="walk"; sfx("enter"); } else continue; }
    if(e.state==="squashed"){ if(blast.clock>=e.at) bkRespawn(e); continue; }
    if(e.state==="sweet"){ if(blast.clock>=e.until) e.state="walk"; else continue; }
    if(e.state!=="walk" || still) continue;
    if(blast.clock>=(e.whimAt||0)){ e.whimAt=blast.clock+3+Math.random()*4; e.whim = Math.random()<.3 ? {x:Math.floor(Math.random()*BK_COLS), y:Math.floor(Math.random()*BK_NF)} : null; }
    const x0=e.x, y0=e.y;
    bkMove(e, sp*dt, bkChase(e));
    if(Math.abs(e.x-x0)+Math.abs(e.y-y0)<1e-6){ e.stuck=(e.stuck||0)+dt; if(e.stuck>.6){ e.whim={x:Math.floor(Math.random()*BK_COLS), y:Math.floor(Math.random()*BK_NF)}; e.whimAt=blast.clock+3; e.stuck=0; } }
    else e.stuck=0;
  }
}
function bkChase(e){
  const C=blast.cook, t=e.whim || {x:C.x, y:C.y};
  if(!bkOnFloor(e)) return [e.dir==="up" || e.dir==="down" ? e.dir : (t.y<e.y ? "up" : "down")];
  const f=Math.round(e.y), ways=[];
  if(Math.abs(t.y-e.y)>.5){
    const v= t.y<e.y ? "up" : "down", gap= v==="up" ? f-1 : f, s=bkSeg(f, e.x);
    ways.push(v);
    const cols=(bkKitchen().ladders[gap]||[]).filter(c=>s && c>=s[0] && c<=s[1]);
    if(cols.length){ const best=cols.reduce((a,b)=>Math.abs(b-e.x)+.3*Math.abs(b-t.x) < Math.abs(a-e.x)+.3*Math.abs(a-t.x) ? b : a);
      if(Math.abs(best-e.x)>BK_EPS) ways.push(best<e.x ? "left" : "right"); }
  } else if(Math.abs(t.x-e.x)>.2) ways.push(t.x<e.x ? "left" : "right");
  else if(e.whim) e.whim=null;
  ways.push(e.dir==="left" || e.dir==="right" ? e.dir : "left", "right", "left", "up", "down");
  return ways;
}
function bkSquash(e){ e.state="squashed"; e.ride=null; e.at=blast.clock+5*Math.sqrt(speedMul()); sfx("squash"); }
function bkRespawn(e){
  const left=Math.random()<.5, f=rnd([0, BK_NF-1]);
  Object.assign(e, {x:left ? 0 : BK_COLS-1, y:f, dir:left ? "right" : "left", state:"walk", whim:null, ...bkSourNote(bkSourPool())});
  sfx("enter");
}
function bkCollide(){
  if(blast.phase!=="play" && blast.phase!=="demo") return;
  const C=blast.cook;
  for(const e of blast.sour){
    if(e.state==="walk" && Math.abs(e.x-C.x)<.7 && Math.abs(e.y-C.y)<.2 && blast.phase==="play") return bkDie(e);
  }
  // bonus food, walked through
  const cap=blast.caps.find(c=>Math.abs(c.x-C.x)<.6 && Math.abs(c.y-C.y)<.2);
  if(cap){ blast.caps=blast.caps.filter(c=>c!==cap); bkPowerGet(cap.k); }
}
function bkDie(e){
  if(blast.st!=="go") return;
  blast.st="dying"; blast.stUntil=blast.clock+1.7; blast.diedAt=blast.clock;
  sfx("die"); buzz(blast.field, true);
  heard(`${e.name}`, false, `CAUGHT BY ${e.name}: PEPPER IT WITH A CHORD THAT HAS ${e.name} IN IT`);
}
function bkAfterDeath(){
  blast.lives--; bkBar();
  if(blast.lives<=0) return bkOver();
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`, "");
  for(const i of blast.ings) if(i.state==="fall") bkLand(i);
  bkPlace();
}
function bkOver(){
  blast.phase="over"; blast.over=true; blast.st="idle"; poll(false);
  const best=Math.max(saved.best.burger||0, blast.score); saved.best.burger=best; save();
  helpChord(null); bkBar(); bkMenu(true);
}
// every plate served: the kitchen flashes, then the next, a level up
function bkClear(){
  blast.st="clear"; blast.stUntil=blast.clock+2.2; blast.caps=[];
  const left=mulPts(100*blast.pepper*(blast.level+1)), pts=mulPts(1000*(blast.level+1))+left;
  if(blast.phase==="play"){ blast.score+=pts; gameLater(()=>banner("KITCHEN CLEAR!", `+${pts}${blast.pepper ? ` · ${blast.pepper} PEPPER LEFT` : ""}`), 900); }
  sfx("clear"); bkBar();
}
function bkNextKitchen(){
  blast.kitchenN=(blast.kitchenN||0)+1;
  blast.level++;                                                       // past the last level, its kitchens again, faster
  bkNewKitchen(); bkPlace();
  bkLevelBanner();
  sfx("level"); bkBar();
}

// ---------- the timers ----------
// the bonus food, the voicing set for the player (SET FOR ME), and the helper's chord: the plate
// that's waited longest
function bkTimers(){
  blast.caps=blast.caps.filter(c=>blast.clock<c.until);
  if(blast.phase==="play" && blast.clock>=blast.capNext && (blast.drops||0)>=4){ blast.capNext=blast.clock+22+Math.random()*12; bkCapSpawn(); }
  const P=bkReady()[0], c=P && (P.ticket || P.chord);
  if(c){
    if(bkAuto() && blast.phase==="play"){ if(blast.voicing.inv!==c.inv || blast.voicing.sp!==c.sp) bkVoice(c.inv, c.sp); }
    arcadeMod(c.root); helpChord(c.root, c.q, c.bass!==c.root ? c.bass : undefined);
  } else helpChord(null);
  if(Math.floor(blast.clock*4)!==blast.hudTick && (blast.clock<blast.fermataUntil || blast.powerShown)){
    blast.hudTick=Math.floor(blast.clock*4); blast.powerShown=blast.clock<blast.fermataUntil; bkBar(); }
}

// ---------- power-ups ----------
// bonus food in the kitchen, now and then, taken by walking through it
//   SIDE ORDER  a shake of pepper
//   FERMATA     for 5 seconds the sour notes hold still where they are (touching one still costs a life)
//   DA CAPO     a life back, or one more (powers.js: it's every game's)
const BK_POWERS={
  side:   {name:"SIDE ORDER", icon:"🍟", say:"A SHAKE OF PEPPER", page:"A SHAKE OF PEPPER MORE, FOR THE SOUR NOTES."},
  fermata:{name:"FERMATA",    icon:"⏸", secs:5, say:"THE SOUR NOTES HOLD STILL", page:"FOR 5 SECONDS THE SOUR NOTES HOLD STILL WHERE THEY ARE. WALKING INTO ONE STILL COSTS A LIFE."},
  dacapo: DA_CAPO,
};
const bkPowerLook=k=>`<span class="cccap bkcap pu-${k}"><i class="puicon">${BK_POWERS[k].icon}</i></span>`;
function bkCapSpawn(){
  const C=blast.cook, spots=[];
  for(let f=0; f<BK_NF; f++) for(const [a,b] of bkKitchen().floors[f]) for(let x=a+1; x<b; x++)
    if(Math.abs(x-C.x)+Math.abs(f-C.y)*3>=8 && !blast.ings.some(i=>i.state==="rest" && i.f===f && x>=i.x0-1 && x<=i.x0+4)) spots.push({x, y:f});
  if(!spots.length) return;
  blast.caps.push({...rnd(spots), k:powerPick(BK_POWERS), until:blast.clock+10});
  sfx("food");
}
function bkPowerGet(k){
  const P=BK_POWERS[k];
  if(P.instant){ if(blast.phase==="play"){ daCapo(); bkBar(); } return; }
  if(k==="side") blast.pepper++;
  if(k==="fermata") blast.fermataUntil=blast.clock+P.secs;
  if(blast.phase==="play"){ banner(P.name+"!", P.say); sfx("capsule"); }
  bkBar();
}
function bkPowerHud(){
  return blast.cook && blast.clock<blast.fermataUntil ? ` · ${BK_POWERS.fermata.icon} FERMATA` : "";
}

// ---------- the key ----------
// The kitchen's key, as Chord Hunt asks for its: set it with the key change combo for points, and its
// chords are plain buttons; not set by the time the first plate fills, the game sets it. Without the
// combo, the game sets it at once.
const bkComboOk=()=> keySetReady() && hasSetting(35);
function bkKeyCheck(){
  if(!blast || blast.phase!=="play" || !blast.key || !hasSetting(35) || mc.params[35]==null || mc.presetLoaded) return;
  const f=devFifths();
  if(f===blast.key.f){
    if(blast.keySet) return;
    blast.keySet=true;
    if(blast.keyByGame || !blast.key.f) return;                         // set for the player, or C, set already
    const dist=Math.abs(blast.key.f), pts=mulPts((500+250*(dist-1))*(blast.level+1));
    blast.score+=pts; heard(`KEY OF ${blast.key.name}`, true); bkPop({x:14, y:0}, `+${pts}`, "#FFD35A"); sfx("key", blast.key.pc); bkBar();
    return;
  }
  if(blast.keySet){ blast.keyByGame=true; borrow(35, keyIndexOf(blast.key.f)); }   // the kitchen's key, once it's set: back to it
}

// ---------- the minichord ----------
// A chord from the buttons: a full plate served, if it's that plate's, and the pepper, whatever it is.
function burgerChord(voices){
  if(!blast || blast.kind!=="burger") return;
  if(blast.phase==="demo" && blast.demo){ endBkDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.st!=="go") return;
  const pitches=voices.map(v=>v.pitch); if(!chordId(pitches)) return;
  const name=chordName(pitches, devFifths());
  let served=null, why="";
  for(const P of bkReady()){ const r=bkJudge(P, pitches); if(r.ok){ served=P; bkServe(P, r); break; } if(r.why && !why) why=r.why; }
  const peppered=bkPepper(pitches, !!served);
  if(served || peppered) return;
  const P=bkReady()[0];
  if(P) heard(name, false, why ? `THAT'S ${name}: ${why}` : `READ IT FROM THE PLATE UP: ${P.stack.map(i=>i.name).join(" ")}`);
  else heard(name, false, "NO PLATE'S FULL YET");
}
// The pepper: every sour note in the kitchen whose note is in the chord, harmonised, however far off
// (a reach round the cook made a right chord miss with nothing to say why). A shake spent on one that
// catches something, or wasted on sour notes about that it doesn't; free with a serve. True when
// it's said what happened.
function bkPepper(pitches, free){
  const pcs=new Set(pitches.map(p=>mod(Math.round(p),12)));
  const near=blast.sour.filter(e=>e.state==="walk" || e.state==="sweet");
  if(!near.length) return false;
  if(!free && blast.pepper<=0){ heard(chordName(pitches, devFifths()), false, "NO PEPPER LEFT"); return true; }
  const hit=near.filter(e=>pcs.has(e.pc));
  if(!free) blast.pepper--;
  // a miss with a plate waiting says what was wrong with it, the shake gone all the same
  if(!hit.length){ if(free) return false; sfx("sour"); bkBar(); if(bkReady().length) return false;
    heard(chordName(pitches, devFifths()), false, `SOUR! ${near.map(e=>e.name).join(", ")} ISN'T IN IT`); return true; }
  const until=blast.clock+4*Math.sqrt(speedMul());
  hit.forEach(e=>{ e.state="sweet"; e.until=until; e.pepperAt=blast.clock; });
  const pts=mulPts(100*2**(hit.length-1)*(blast.level+1));
  if(blast.phase==="play"){ blast.score+=pts; bkPop(hit[0], `+${pts}`, "#FFB8FF"); }
  sfx("pepper", [...hit.map(e=>60+e.pc)]);
  if(!free) heard(`${chordName(pitches, devFifths())} · ${hit.map(e=>e.name).join(" ")}`, true);
  bkBar(); return true;
}
// the harp: A flips (steered on the knob, any touch but its top and bottom); the rest is read held (bkWays)
function burgerHarp(pc){
  if(!blast || blast.kind!=="burger") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endBkDemo(blast.demo); return; }
  if(pfKnob() ? pfHarpZone(pc)==="jump" : kmControl(pc)==="A") bkFlip();
}
// FLIP: the ingredient underfoot swapped with the next one down its column (the Orders kitchens)
function bkFlip(){
  if(!blast || blast.kind!=="burger" || blast.phase!=="play" || blast.st!=="go" || !bkLevel().orders) return;
  const C=blast.cook; if(!bkOnFloor(C)) return;
  const f=Math.round(C.y), tx=Math.round(C.x);
  const ing=blast.ings.find(i=>i.state==="rest" && i.f===f && tx>=i.x0 && tx<=i.x0+3);
  if(!ing){ heard("FLIP", false, "STAND ON AN INGREDIENT TO FLIP IT"); return; }
  if(blast.flips<=0){ heard("FLIP", false, "NO FLIPS LEFT"); sfx("wrong"); return; }
  const below=blast.ings.filter(i=>i.p===ing.p && i.state==="rest" && i.f>f).sort((a,b)=>a.f-b.f)[0];
  if(!below){ heard("FLIP", false, "NOTHING BELOW IT TO SWAP WITH"); sfx("wrong"); return; }
  for(const k of ["name","pitch","pc"]) [ing[k], below[k]]=[below[k], ing[k]];
  blast.flips--; ing.flipAt=below.flipAt=blast.clock; sfx("flip"); bkBar();
}
// The knobs: the steering knob swings the inversion, the other the spacing, each a quarter of its
// turn a step. SET FOR ME leaves them be; the game turns them.
const bkSpaceKnob=()=> steerKnob()===0 ? 1 : 0;
function bkKnob(knob, v){
  if(!blast || blast.kind!=="burger" || blast.phase!=="play" || bkAuto()) return;
  const step=Math.min(3, Math.floor(v*4)), w=blast.voicing;
  if(knob===steerKnob()) bkVoice(step, w.sp, true);
  else if(knob===bkSpaceKnob()) bkVoice(w.inv, step, true);
}
function bkVoice(inv, sp, byHand){
  if(byHand && bkAuto()) return;
  inv=Math.max(0, Math.min(3, inv)); sp=Math.max(0, Math.min(3, sp));
  const w=blast.voicing; if(inv===w.inv && sp===w.sp) return;
  const was={...w}; blast.voicing={inv, sp};
  if(canWrite()){ if(inv!==was.inv && hasSetting(37)) borrow(37, inv); if(sp!==was.sp && hasSetting(38)) borrow(38, sp); }
  if(byHand) sfx("press");
  bkBar();
}

// ---------- drawing ----------
// An arcade screen of its own, as Chord Chomp's: eight pixels a square, the kitchen 232 across, every
// sprite and letter drawn pixel by pixel, shown exactly as big as fits on a phone (pxFit's fill), a
// whole number of the screen's own pixels a pixel on a desktop. On a phone held upright it's zoomed in
// to fill the height, its floors further apart (bkFloorsApart), and scrolls across, the view following
// the cook, so long as nearly half the kitchen (two of its plates) is in view (BK_ACROSS); where it's
// too small to read (held sideways), the least size that reads; on a wide field, zoomed in further
// (pxZoom). The sour notes out of view pointed to.
const BK_LEAST=4/3, BK_W=BK_COLS*BK_T, BK_ACROSS=.45;
function bkLayout(){
  const f=pxFit(BK_W, BK_H, BK_LEAST, true, true, BK_ACROSS);
  Object.assign(blast, {k:f.k, view:{x:0, y:0, w:f.w, h:f.h}, scrolls:BK_W>f.w || BK_H>f.h, cam:null, scrLeft:f.left, scrTop:f.top});
  pxPlace(blast.screen, f);
  bkCamera(0);
}
function bkCamera(dt){
  const v=blast.view, C=blast.cook || {x:BK_START.x, y:BK_START.f};
  const axis=(len, all, focus, was)=>{
    if(all<=len) return Math.floor((len-all)/2);
    const want=Math.max(len-all, Math.min(0, len/2-focus));
    if(was==null || !dt) return want;
    return was+(want-was)*Math.min(1, dt*7);
  };
  const c=blast.cam||{};
  c.x=axis(v.w, BK_W, (C.x+.5)*BK_T, c.x); c.y=axis(v.h, BK_H, bkFloorPx(C.y)-8, c.y);
  blast.cam=c; blast.ox=Math.round(c.x); blast.oy=Math.round(c.y);
}

// ---------- sprites ----------
// The cook: a chef's hat and whites, 12 by 16; walking, two steps; climbing, his back
const BK_COOK={
  stand:["....WWWW....","...WWWWWW...","...WWWWWW...","....WWWW....","....SSSS....","....SSKS....","....SSSS....","...WWWWWW...",
         "..WWWWWWWW..","..SWWWWWWS..","...WWWWWW...","...BBBBBB...","...BB..BB...","...BB..BB...","..KKK..KKK..","............"],
  step: ["....WWWW....","...WWWWWW...","...WWWWWW...","....WWWW....","....SSSS....","....SSKS....","....SSSS....","...WWWWWW...",
         "..WWWWWWWW..","..SWWWWWWS..","...WWWWWW...","...BBBBBB...","..BB....BB..",".BB......BB.",".KK......KK.","............"],
  climb:["....WWWW....","...WWWWWW...","...WWWWWW...","....WWWW....","....SSSS....","....SSSS....","..S.SSSS.S..","..SWWWWWWS..",
         "...WWWWWW...","...WWWWWW...","...WWWWWW...","...BBBBBB...","...BB..BB...","...BB...B...","..KKK...K...","............"],
};
const BK_COOK_PAL={W:"#FFFFFF", S:"#FFB8AE", K:"#16132A", B:"#4F7BFF"};
function bkCookSprite(pose, left, col){
  const rows=BK_COOK[pose].map(r=> left ? [...r].reverse().join("") : r);
  return pxSprite(`bkcook|${pose}|${left}|${col||""}`, rows, col ? {W:col, S:col, K:"#16132A", B:col} : BK_COOK_PAL);
}
// the sour notes, 12 by 14: a hot dog, an egg, a pickle, with eyes and feet; harmonised, sweet pink
const BK_SOUR={
  dog:   ["....RRRR....","...RRRRRR...","..YRRRRRRY..","..YRWWRWWY..","..YRWKRWKY..","..YRRRRRRY..","..YRRRRRRY..","..YRRRRRRY..",
          "..YRRRRRRY..","..YRRRRRRY..","...RRRRRR...","....RRRR....","...KK..KK...","..KKK..KKK.."],
  egg:   ["....WWWW....","...WWWWWW...","..WWWWWWWW..","..WWWWWWWW..","..WWYYYYWW..",".WWYYYYYYWW.",".WWYKYYKYWW.",
          ".WWYYYYYYWW.","..WWYYYYWW..","..WWWWWWWW..","...WWWWWW...","....WWWW....","...KK..KK...","..KKK..KKK.."],
  pickle:["....GGG.....","...GGGGG....","...GGWGWG...","...GGKGKG...","...GGGGGG...","...GLGGGG...","...GGGGLG...","...GGGGGG...",
          "...GLGGGG...","...GGGGLG...","...GGGGGG...","....GGGG....","...KK..KK...","..KKK..KKK.."],
};
const BK_SOUR_PAL={dog:{R:"#E0442C", Y:"#F2C14E", W:"#FFFFFF", K:"#16132A"}, egg:{W:"#FFFFFF", Y:"#FFD35A", K:"#16132A"}, pickle:{G:"#3FAF3F", L:"#8FE08F", W:"#FFFFFF", K:"#16132A"}};
function bkSourSprite(kind, frame, sweet){
  const rows=BK_SOUR[kind].map((r,y)=> frame && y>=12 ? (y===12 ? "..KK....KK.." : ".KKK....KKK.") : r);
  const pal=sweet ? Object.fromEntries(Object.entries(BK_SOUR_PAL[kind]).map(([c,v])=>[c, c==="K" ? "#7A3A6A" : "#FFC8F0"])) : BK_SOUR_PAL[kind];
  return pxSprite(`bksour|${kind}|${frame}|${sweet}`, rows, pal);
}
// the ingredients, 32 by 8, by where they go in the burger: the bottom bun, the patty, the lettuce, the top bun
const BK_ING=[
  {rows:["################","################","################","################","################","################",".##############.","..############.."], col:"#E8A54A", ink:"#5A2E0A"},
  {rows:[".##############.","################","################","################","################","################","################",".##############."], col:"#8A4A2A", ink:"#FFE3C2"},
  {rows:["#.##.##.##.##.##","################","################","################","################","################","################","##.##.##.##.##.#"], col:"#5FCF4F", ink:"#16402A"},
  {rows:["...##########...",".##############.","################","################","################","################","################","################"], col:"#F2B65A", ink:"#5A2E0A"},
];
function bkIngSprite(k, sec){
  const I=BK_ING[k], rows=I.rows.map(r=>[...r].map(c=>c+c).join("").slice(sec*8, sec*8+8));   // the 16-wide pattern doubled, a section its quarter
  return pxSprite(`bking|${k}|${sec}`, rows, {"#":I.col});
}

// ---------- each frame ----------
const bkGirder=f=> f ? "#FFFFFF" : "#2F6BFF";
function burgerDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  if(!blast.kitchen || !blast.cook){ g.clearRect(0,0,s.width,s.height); return; }
  const lk=`${fieldW()}x${fieldH()}@${window.devicePixelRatio||1}|${BK_FH}|${kmStripShown()}|${!!saved.beginner}|${blast.phase==="demo"}|${saved.harpLayout||""}`;
  if(blast.layoutKey!==lk){ blast.layoutKey=lk; bkLayout(); }
  if(blast.scrolls){ bkCamera(Math.min(.1, (now-(blast.camAt||now))/1000)); blast.camAt=now; }
  const K=bkKitchen(), ox=blast.ox, oy=blast.oy, clock=blast.clock, T=BK_T;
  g.imageSmoothingEnabled=false;
  g.fillStyle="#000"; g.fillRect(0,0,s.width,s.height);
  const flash=blast.st==="clear" && Math.floor((clock-(blast.stUntil-2.2))*4)%2;
  // the ladders, then the girders over their ends
  g.fillStyle="#C9A86A";
  K.ladders.forEach((cols,gap)=>cols.forEach(c=>{ const x=ox+c*T, y0=oy+bkFloorPx(gap), y1=oy+bkFloorPx(gap+1);
    g.fillRect(x+1, y0, 1, y1-y0); g.fillRect(x+6, y0, 1, y1-y0); for(let y=y0+3; y<y1; y+=4) g.fillRect(x+1, y, 6, 1); }));
  K.floors.forEach((segs,f)=>segs.forEach(([a,b])=>{ const x=ox+a*T, w=(b-a+1)*T, y=oy+bkFloorPx(f);
    g.fillStyle=bkGirder(flash); g.fillRect(x, y, w, 3); g.fillStyle=flash ? "#FFFFFF" : "#9CC0FF"; g.fillRect(x, y, w, 1); }));
  // the plates, their stacks, and what's on them
  const pb=oy+bkPlateBase(), L=blast.phase==="play" || blast.phase==="demo" ? bkLevel() : BK_LEVELS[0];
  for(const P of blast.plates){
    const x=ox+P.x0*T-3;
    g.fillStyle="#E6E6F0"; g.fillRect(x, pb+1, 38, 2); g.fillStyle="#9A93B5"; g.fillRect(x+3, pb+3, 32, 1);
    const cx=ox+(P.x0+2)*T;
    if(P.state==="ready"){
      const hot=clock-P.readyAt<bkHotSecs();
      if(Math.floor(clock*3)%2 || !hot) pxText(g, hot ? "HOT!" : "READY", cx, pb+6, hot ? "#FF9A3C" : "#FFD35A");
      if(hot) for(let i=0;i<3;i++){ const sy=pb-4*BK_IH-4-((clock*14+i*5)%10); g.fillStyle="#B9C7E6"; g.fillRect(cx-6+i*6+Math.round(Math.sin(clock*4+i)), Math.round(sy), 1, 2); }
    }
    else if(P.state==="served") pxText(g, P.chord.sym, cx, pb+6, "#7FE08A");
    else if(P.ticket) pxText(g, P.ticket.sym, cx, pb+6, "#FFD35A");
  }
  // the ingredients: resting on their girders (a section trodden sagging), falling, or on their plates
  for(const ing of blast.ings){
    const x=ox+ing.x0*T, bottom=oy+(ing.state==="plate" ? bkPlateBase()-ing.k*BK_IH : bkFloorPx(ing.y)+(ing.state==="rest" ? 0 : 0));
    const wob=ing.state==="fall" ? Math.round(Math.sin(clock*30)*.6) : 0;
    for(let sec=0; sec<4; sec++){
      const sag=ing.state==="rest" && ing.pressed[sec] ? 2 : 0;
      g.drawImage(bkIngSprite(ing.k, sec), x+sec*T, bottom-BK_IH+sag+(sec%2?wob:-wob));
    }
    const shown=!L.hidden || ing.state==="plate";
    if(shown){ const fl=ing.flipAt && clock-ing.flipAt<.6 && Math.floor(clock*10)%2; pxText(g, ing.name, x+16, bottom-BK_IH, fl ? "#FFFFFF" : BK_ING[ing.k].ink, false); }
    else pxText(g, "?", x+16, bottom-BK_IH, BK_ING[ing.k].ink, false);
  }
  // the bonus food: a disc with its icon, blinking as it goes
  for(const c of blast.caps){ if(c.until-clock<2.5 && Math.floor(clock*6)%2) continue;
    const x=ox+(c.x+.5)*T, y=oy+bkFloorPx(c.y)-6;
    g.fillStyle=c.k==="dacapo" ? "#FF4B3E" : c.k==="side" ? "#FFD35A" : "#FF5AA0"; g.fillRect(x-5, y-4, 10, 8); g.fillRect(x-4, y-5, 8, 10);
    pxText(g, c.k==="dacapo" ? "+" : c.k==="side" ? "S" : "F", x, y-4, "#16132A", false); }
  // the sour notes, with their notes over them
  const dying=blast.st==="dying", wig=Math.floor(now/160)%2;
  for(const e of blast.sour){
    if(e.state==="wait" || e.state==="squashed") continue;
    const x=ox+(e.x+.5)*T, foot=oy+bkFloorPx(e.y), sweet=e.state==="sweet";
    if(sweet && e.until-clock<1 && Math.floor(clock*8)%2) continue;
    const spr=bkSourSprite(e.kind, e.moving||e.state==="ride" ? wig : 0, sweet);
    g.drawImage(spr, Math.round(x-6), Math.round(foot-14));
    const still=clock<blast.fermataUntil;
    if(foot>=5) pxText(g, e.name, x, Math.max(1, foot-25), sweet ? "#FFC8F0" : still ? "#8FA3C8" : "#F1E8D2");     // kept in the view; above it, pointed to
    if(sweet && clock-(e.pepperAt||0)<.5) for(let i=0;i<6;i++){ const a=i*1.05+clock*9, r=6+(clock-e.pepperAt)*16; g.fillStyle="#FFFFFF"; g.fillRect(Math.round(x+Math.cos(a)*r), Math.round(foot-7+Math.sin(a)*r), 1, 1); }
  }
  // the cook
  const C=blast.cook;
  if(!(dying && clock-blast.diedAt>.4 && Math.floor(clock*8)%2)){
    const climbing=!bkOnFloor(C) || (C.moving && (C.dir==="up" || C.dir==="down"));
    const pose=climbing ? "climb" : C.moving && Math.floor(clock*8)%2 ? "step" : "stand";
    const spr=bkCookSprite(pose, C.dir==="left" || (climbing && Math.floor(clock*6)%2), dying ? "#FF4B3E" : null);
    g.drawImage(spr, Math.round(ox+(C.x+.5)*T-6), Math.round(oy+bkFloorPx(C.y)-16));
  }
  if(C && C.goal!=null && blast.phase==="play") pxKnobMark(g, ox+(C.goal+.5)*T, blast.view.h);
  if(blast.scrolls) pxOffscreen(g, blast.view, ox, oy, blast.sour.filter(e=>e.state!=="wait" && e.state!=="squashed")
    .map(e=>({x:(e.x+.5)*T, y:bkFloorPx(e.y), col:e.state==="sweet" ? "#FF5AA0" : "#F1E8D2", label:e.name, ink:"#F1E8D2"})));
  if(blast.st==="ready") pxText(g, "READY!", ox+BK_W/2, oy+bkFloorPx(2)-20, "#FFE600");
}
// a popup over a place in the kitchen (x in squares, y in floors)
function bkPop(e, text, colour){
  if(!blast.field || blast.phase!=="play" || !blast.k) return;
  popup(blast.scrLeft+(blast.ox+(e.x+.5)*BK_T)*blast.k, blast.scrTop+(blast.oy+bkFloorPx(e.y)-20)*blast.k, text, colour);
}

// ---------- the demo ----------
// It plays itself in the real kitchen: an ingredient walked down, a cascade, a plate read from the
// plate up and served, an inversion turned to on the knob, a sour note peppered with a chord that has
// its note, and two ridden down.
function bkDemo(){
  if(!blast || blast.kind!=="burger") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endBkDemo);
  blast.phase="demo"; blast.level=0; blast.kitchenN=0; blast.clock=0; blast.layoutKey=null;
  blast.kitchen=BK_KITCHENS[0]; blast.key=bkKey(0); bkFloorsApart();
  bkDeal(); blast.pepper=5; blast.flips=0; blast.served=[]; blast.caps=[]; blast.fermataUntil=0;
  blast.cook={x:BK_START.x, y:BK_START.f, dir:"left", moving:false}; blast.sour=[]; blast.st="go"; blast.demoWays=[];
  const zones=(...zs)=>{ if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.toggle("demo-on", zs.includes(c.dataset.zone))); };
  const walkTo=async(x, f)=>{
    for(let k=0; k<160; k++){
      const C=blast.cook, onF=bkOnFloor(C);
      if(onF && Math.round(C.y)===f && Math.abs(C.x-x)<BK_EPS){ blast.demoWays=[]; C.goal=null; zones(); return; }
      let ways; C.goal=null;
      if(!onF || Math.round(C.y)!==f){ const v= f<C.y ? "up" : "down", gap= v==="up" ? Math.round(C.y)-1 : Math.round(C.y);
        const cols=onF ? bkKitchen().ladders[gap].filter(c=>bkSeg(Math.round(C.y),c)===bkSeg(Math.round(C.y),C.x)) : [];
        const best=cols.length ? cols.reduce((a,b)=>Math.abs(b-C.x)+Math.abs(b-x)<Math.abs(a-C.x)+Math.abs(a-x) ? b : a) : C.x;
        ways= !onF ? [C.dir==="up"||C.dir==="down" ? C.dir : v] : [v, best<C.x ? "left" : "right"]; }
      else { ways=[x<C.x ? "left" : "right"]; C.goal=x; }
      blast.demoWays=ways; zones(ways[0]);
      await step(60);
    }
    blast.demoWays=[]; blast.cook.goal=null; zones();
  };
  const fill=P=>{ for(const ing of blast.ings.filter(i=>i.p===P.p && i.state==="rest").sort((a,b)=>b.f-a.f)){ ing.state="plate"; ing.k=P.stack.length; P.stack.push(ing); } P.state="ready"; P.readyAt=blast.clock; };
  const serve=P=>{ demoPlay(P.chord.pitches.map(p=>p-12)); bkServe(P, {ok:true}); };
  sfx("attract");
  (async()=>{
    try{
      say("CHORD BURGER","FOUR PLATES, EACH BURGER A CHORD. ITS INGREDIENTS LIE ON THE FLOORS ABOVE IT, EACH SPELLED WITH ITS NOTE."); await step(4200);
      const P1=blast.plates[1], P2=blast.plates[2];
      say("WALK ON THE HARP", saved.harpLayout==="kmpad" ? "THE KEYMASTER AS A D-PAD: HOLD 5 UP, 4 LEFT, 3 RIGHT, 2 DOWN, AS LONG AS YOU WANT TO GO." : "HOLD THE WAY YOU WANT TO GO: THE TOP THREE UP, TWO LEFT, TWO RIGHT, THE BOTTOM THREE DOWN.");
      await step(2600);
      say("DROP IT","WALK ACROSS AN INGREDIENT AND IT DROPS A FLOOR. FROM THE BOTTOM FLOOR, ONTO ITS PLATE.");
      await walkTo(P1.x0-1, BK_NF-1); await step(1600);
      say("A CASCADE","DROP ONE ONTO ANOTHER AND IT KNOCKS THAT ONE DOWN. THE ORDER NEVER CHANGES.");
      await walkTo(P2.x0-1, BK_NF-2); await walkTo(P2.x0+4, BK_NF-2); await step(2600);
      fill(P1);
      say("READ IT FROM THE PLATE UP",`${P1.stack.map(i=>i.name).join(" ")}: THE BUNS ARE THE BASS, ${P1.stack[0].name}. ${P1.chord.sym}, ROOT POSITION. PLAY IT TO SERVE IT.`); await step(4200);
      serve(P1); await step(2200);
      fill(P2); P2.chord=bkChord(blast.key, P2.chord.num, 1, 0);
      P2.stack.forEach((ing,k)=>Object.assign(ing, {name:P2.chord.names[k], pitch:P2.chord.pitches[k], pc:P2.chord.pcs[k]}));
      say("AN INVERSION",`${P2.stack.map(i=>i.name).join(" ")}: ${P2.stack[0].name} IN THE BASS, THE CHORD'S 3RD. TURN THE KNOB TO 1ST INV, THEN PLAY ${P2.chord.root}.`);
      await step(1800); bkVoice(1, 0); sfx("press"); await step(1600); serve(P2); await step(2200);
      const pc=mod(blast.key.pc+6,12), e={i:0, kind:"pickle", x:blast.cook.x+5, y:blast.cook.y, dir:"left", state:"walk", pc, name:SHARP_NAMES[pc]};
      blast.sour=[e];
      say("SOUR NOTES",`THEY WEAR NOTES, AND CATCH YOU. PEPPER ONE WITH A CHORD THAT HAS ITS NOTE IN IT: ${e.name} IS IN D.`); await step(2400);
      const d=[62,66,69]; demoPlay(d); bkPepper(d, true); await step(3200);
      say("RIDE THEM DOWN","DROP AN INGREDIENT WITH SOUR NOTES ON IT AND THEY RIDE IT DOWN, A FLOOR FURTHER FOR EACH, FOR A BONUS THAT DOUBLES."); await step(4200);
      say("SERVE THEM IN ORDER","SERVE THE PLATES LEFT TO RIGHT AND THEY'RE A PROGRESSION: A COMBO MEAL."); await step(3800);
      say("READY?",`CHOOSE A LEVEL. ${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME" : pfKnob("burger") ? "TURN THE KNOB TO WHERE YOU WANT TO STAND" : "WALK ON THE HARP OR THE ARROW KEYS"}.`); sfx("level"); await step(2800);
      endBkDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endBkDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoAuto=false; blast.demoWays=null;
  blast.cook=null; blast.sour=[]; blast.ings=[]; blast.plates=[]; blast.caps=[]; blast.key=null; blast.kitchen=null; blast.layoutKey=null; blast.st="idle";
  blast.voicing={inv:0, sp:0}; if(canWrite()){ if(hasSetting(37)) borrow(37,0); if(hasSetting(38)) borrow(38,0); }
  if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.remove("demo-on"));
  helpChord(null); bkBar();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  cabRestart();
}
