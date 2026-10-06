// Dominant Kong: the barrel game, where every barrel is a dominant seventh and the way up is a cadence
// home. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
// ---------- Dominant Kong ----------
// The old girder game, as a lesson in tension and release. Kong, at the top of the girders, is the
// dominant: everything he throws is tension. Each barrel wears a dominant seventh (G7, in C), and as
// it rolls down the sloping girders it can be jumped (A on the harp) or resolved: play the chord it
// resolves to (C, for G7) and it breaks. A deceptive resolution (G7 to Am) breaks it for more. Later
// barrels are secondary dominants (D7 to G), tritone substitutes (D♭7, which resolves to C as well
// as G7 does) and backdoor dominants (B♭7 to C). A barrel that rolls all the way down into the drum
// unresolved comes back out as a fireball: a diminished seventh, wandering the girders, put out by
// any chord a semitone above one of its four notes, the four ways it can resolve.
//
// The way up is a chain of fifths home. Home is at the top, the key's I. Each floor below is a
// dominant away from the floor above it: V7 under home, V of V under that, and so on down, so a climb
// from the bottom plays B7 E7 A7 D7 G7 C, the ragtime chain, the circle of fifths walked home. A
// floor's ladders up open when the next floor's chord is played; the first levels lock only the
// last ladder, home, and each later level one more, until the whole chain's locked.
//
// Every other stage is the rivets: eight rivets in the girders, each one of the key's chords (I ii
// iii IV V vi vii° I). Stand on a rivet and play its chord to pull it; pull all eight and Kong comes
// down. A pulled rivet leaves a gap, to be jumped. The fireballs wander there too.
//
// As the old game: a fall from higher than a short drop costs a life, as does a barrel, a fireball or
// Kong himself; the bonus counts down as the stage goes on and is paid at the end of it, and runs out
// costs a life. The hammer (a piano's, here) is up in the air on two girders: jump to it, and for a
// while every barrel and fireball it's swung at breaks, though a cook carrying one can't climb.
// The player walks while a way's held on the harp (kmHeld, ../controller.js) or the arrow keys.
// LABELS on the title screen: chords by NAME, or by NUMERAL for half as much again.
//
// And the lifts, the old game's elevators: up a tower, onto a lift rising (and off it before it reaches
// the top), across to the second lift, which is a knob (it goes where the steering knob's turned), and
// up to home, while Kong throws springs that bounce along the top and drop down the far side, each a
// dominant seventh like the barrels. Without the knobs (or with the knob steering the player), the
// second lift runs down on its own, as the old game's did. Still to come, the old game's conveyors: the cement pans each a chord to sort.

// ---------- the stages ----------
// A floor is a girder from x0 to x1, its top at yL on the left and yR on the right (sloped, the old
// game's way), with any gaps pulled in it; a ladder joins floor lo to floor hi at x. The kitchen's
// pixels are the old game's: the screen 224 wide, and as the old game's 244 tall on a desktop's field or
// a phone held sideways. On a phone held upright each stage is made taller to fill it (dkTall): the
// girders and the rivets given more floors, a little further apart, and the lifts' towers and shafts
// drawn out. Built as each stage starts; dkGirders(6, 33), dkRivets(5, 40) and dkTowers(1) are the old game's.
const DK_W=224;
let DK_H=244;
// The girders: n of them (even, so Kong's is always the one running downhill to the right), s pixels
// apart, home 34 over Kong's. Each one sloped against the one under it; its ladders the old game's,
// taken in turn up a taller stage.
const DK_RUNGS=[[32,96],[64,176],[40,112],[72,168]];
function dkGirders(n, s){
  const H=79+s*(n-1), avg=i=>H-11-s*i, floors=[], ladders=[];
  for(let i=0;i<n;i++){
    const a=avg(i), odd=i%2===1;
    floors.push(i===0 ? {x0:0, x1:224, yL:a+3, yR:a-3} : odd ? {x0:0, x1:208, yL:a-3, yR:a+3} : {x0:16, x1:224, yL:a+3, yR:a-3});
  }
  floors.push({x0:80, x1:136, yL:avg(n-1)-34, yR:avg(n-1)-34, home:true});
  [80,184].forEach(x=>ladders.push({lo:0, hi:1, x}));
  for(let j=1;j<n-1;j++) DK_RUNGS[(j-1)%4].forEach(x=>ladders.push({lo:j, hi:j+1, x}));
  ladders.push({lo:n-1, hi:n, x:124});
  const hammers=[{f:1, x:168}, {f:4, x:196}, ...(n>=10 ? [{f:7, x:168}] : [])];
  return {kind:"girders", H, floors, ladders, start:{f:0, x:48}, kong:{f:n-1, x:24}, drum:{x:12}, hammers, scale:n/6};
}
// The rivets: m floors (the ground and the rest of girders with two rivets each), s pixels apart,
// Kong on the top one.
function dkRivets(m, s){
  const H=84+s*(m-1), floors=[], ladders=[], rivets=[];
  for(let i=0;i<m;i++) floors.push(i===0 ? {x0:0, x1:224, yL:H-8, yR:H-8} : {x0:16, x1:208, yL:H-8-s*i, yR:H-8-s*i});
  for(let j=0;j<m-1;j++) (j%2 ? [64,160] : [24,112,200]).forEach(x=>ladders.push({lo:j, hi:j+1, x}));
  for(let i=1;i<m;i++) rivets.push({f:i, x:40}, {f:i, x:184});
  return {kind:"rivets", H, floors, ladders, rivets, start:{f:0, x:40}, kong:{f:m-1, x:112}, scale:m/5};
}
// The lifts: towers and ledges, two shafts (the left one rising, the right one the knob), Kong on a
// ledge at the top left, home at the top right; drawn out k times as tall below home.
const DK_LIFTS={
  floors:[{x0:0,x1:40,yL:236,yR:236}, {x0:0,x1:40,yL:186,yR:186}, {x0:0,x1:40,yL:136,yR:136}, {x0:84,x1:116,yL:196,yR:196}, {x0:84,x1:116,yL:136,yR:136},
    {x0:168,x1:224,yL:136,yR:136}, {x0:168,x1:224,yL:86,yR:86}, {x0:204,x1:224,yL:40,yR:40, home:true}, {x0:0,x1:44,yL:44,yR:44}],
  ladders:[[0,1,20],[1,2,20],[3,4,100],[5,6,184],[6,7,214]].map(([lo,hi,x])=>({lo, hi, x})),
  lifts:[{x:60, way:-1}, {x:142, knob:true}], top:50, bottom:240,
  start:{f:0, x:16}, kong:{f:8, x:22}, drop:198,
};
function dkTowers(k){
  const y=v=>40+(v-40)*k;
  return {...DK_LIFTS, kind:"lifts", H:40+204*k, floors:DK_LIFTS.floors.map(F=>({...F, yL:y(F.yL), yR:y(F.yR)})), top:y(DK_LIFTS.top), bottom:y(DK_LIFTS.bottom), scale:1+(k-1)/2};
}
const DK_GIRDERS=dkGirders(6, 33), DK_RIVETS=dkRivets(5, 40);
// How tall a stage the room has, in the stage's pixels, with it right across the screen (pixel.js); and
// each stage made to fill it: the fewest floors (and the most) that keep them no further apart than a
// stage reads well at.
function dkTall(){ const {aw, ah}=pxRoom(); return ah/Math.max(DK_LEAST, aw/DK_W); }
function dkStageFor(kind){
  const T=dkTall();
  if(kind==="lifts") return dkTowers(Math.max(1, Math.min(2, Math.floor((T-40)/204*100)/100)));
  if(kind==="rivets"){ let m=5; while(m<9 && (T-84)/(m-1)>56) m++; return dkRivets(m, Math.max(40, Math.min(56, Math.floor((T-84)/(m-1))))); }
  let n=6; while(n<10 && (T-79)/(n-1)>46) n+=2;
  return dkGirders(n, Math.max(33, Math.min(46, Math.floor((T-79)/(n-1)))));
}
const dkHomeF=(S=dkStage())=> S.floors.findIndex(F=>F.home);
const DK_EPS=1e-3;
const dkStage=()=> blast.stage;
const dkSurf=(f, x, S=dkStage())=>{ const F=S.floors[f]; return F.yL+(x-F.x0)*(F.yR-F.yL)/(F.x1-F.x0); };
const dkGap=(f, x)=> (blast.gaps||[]).some(g=>g.f===f && x>g.x-4 && x<g.x+4);
const dkOn=(f, x, S=dkStage())=>{ const F=S.floors[f]; return !!F && x>=F.x0-DK_EPS && x<=F.x1+DK_EPS && !dkGap(f,x); };
// the way a girder runs downhill: right where its right end's lower
const dkDownhill=f=>{ const F=dkStage().floors[f]; return F.yR>F.yL ? 1 : -1; };
// The lifts' stage: its own copy, the platforms appended as floors. The rising lift has three, a third
// of the shaft apart, coming up from the bottom and gone at the top; the knob's lift one, going where the
// knob's turned (or, without the knobs, three running down, as the old game's).
function dkLiftStage(base){
  const S={...base, floors:base.floors.map(F=>({...F})), plats:[]};
  const span=base.bottom-base.top;
  for(const lift of base.lifts){
    const knob=lift.knob && knobsReady() && !pfKnob("kong"), n=knob ? 1 : 3, way=lift.way || (knob ? 0 : 1);
    for(let i=0;i<n;i++){ const y=knob ? base.bottom-4 : base.top+span*(i+.5)/n;
      const F={x0:lift.x-11, x1:lift.x+11, yL:y, yR:y, plat:true, lift, way, knob}; S.plats.push(S.floors.length); S.floors.push(F); }
  }
  return S;
}
// the platforms moved: the rising ones up and round, the knob's toward where it's turned; a player on
// one goes with it, crushed if it's carried past the top or down off the bottom
function dkLifts(dt){
  const S=dkStage(); if(!S.plats) return;
  const H=blast.hero, span=S.bottom-S.top, pace=dkPace();
  for(const f of S.plats){
    const F=S.floors[f]; let y=F.yL;
    if(F.knob){ const want=S.bottom-4-(blast.liftKnob??0)*(span-4); y+=Math.max(-70*dt, Math.min(70*dt, want-y)); }
    else {
      y+=F.way*24*pace*dt;
      if(y<S.top || y>S.bottom){
        if(H.state==="walk" && H.f===f && blast.phase==="play"){ F.yL=F.yR=y; H.y=y; return dkDie(y<S.top ? "THE TOP" : "THE BOTTOM"); }
        y+= F.way<0 ? span : -span;
      }
    }
    F.yL=F.yR=y;
    if(H.state==="walk" && H.f===f) H.y=y;
  }
}
const dkKnobLift=()=> !!blast && !!dkStage() && dkStage().plats && dkStage().plats.some(f=>dkStage().floors[f].knob);
function dkKnob(knob, v){
  if(!blast || blast.kind!=="kong" || knob!==steerKnob()) return;
  blast.liftKnob=v;
}
// a ladder's lock: the floor above's chord not played yet
const dkLocked=L=> !!blast.locks && blast.locks.has(L.lo);

// ---------- chords, keys and levels ----------
// The barrels: a dominant seventh, and where it goes. kind "dom" resolves down a fifth (its root up a
// fourth), and deceptively to the minor chord a step above its root; "sub", the tritone substitute,
// resolves down a semitone; "back", the backdoor ♭VII7, up a step. What each is, by numeral in the key:
// [semitones up from the tonic, kind, numeral]
const DK_BARRELS={
  "V7":[7,"dom","V7"], "V/V":[2,"dom","V7/V"], "V/ii":[9,"dom","V7/ii"], "V/vi":[4,"dom","V7/vi"], "V/iii":[11,"dom","V7/iii"], "V/IV":[0,"dom","V7/IV"],
  "subV":[1,"sub","♭II7"], "subV/V":[8,"sub","♭VI7"], "back":[10,"back","♭VII7"],
};
const DK_RES={dom:5, sub:11, back:2};
// the chain home, from the floor under home down: V7, V of V, and each a fifth further round
const DK_CHAIN=["V7","V/V","V/ii","V/vi","V/iii"];
// The levels, a stage each: the girders, the lifts and the rivets in turn. barrels: what Kong throws; chain: how
// many of the ladders up are locked, from home down; fire: barrels in the drum come out fireballs;
// keys: how far round the circle of fifths the stage's key can be; rivets: the eight chords; minor:
// a minor key's; numerals: labelled by numeral whatever LABELS says.
const DK_LEVELS=[
  {n:"V7 to I",                 stage:"girders", barrels:["V7"], chain:1},
  {n:"The key's chords",        stage:"rivets",  rivets:"triads"},
  {n:"V of V",                  stage:"girders", barrels:["V7","V/V"], chain:2, keys:1},
  {n:"The lifts",               stage:"lifts",   barrels:["V7","V/V"], keys:1},
  {n:"Rivets by numeral",       stage:"rivets",  rivets:"triads", numerals:true, keys:2},
  {n:"Secondary dominants",     stage:"girders", barrels:["V7","V/V","V/ii","V/vi"], chain:4, fire:true, keys:2},
  {n:"The lifts, substituted",  stage:"lifts",   barrels:["V7","subV","V/V","subV/V"], keys:2},
  {n:"Rivets in sevenths",      stage:"rivets",  rivets:"sevenths", fire:true, keys:2},
  {n:"Tritone substitutes",     stage:"girders", barrels:["V7","subV","V/V","subV/V"], chain:5, fire:true, keys:2},
  {n:"Rivets in a minor key",   stage:"rivets",  rivets:"minor", fire:true, keys:2},
  {n:"The backdoor",            stage:"girders", barrels:["V7","back","subV","V/ii","V/vi"], chain:6, fire:true, keys:3},
  {n:"The whole chain, by numeral", stage:"girders", barrels:["V7","V/V","V/ii","V/vi","subV","back"], chain:6, fire:true, numerals:true, keys:3},
];
const dkLevel=(i=blast.level)=> DK_LEVELS[i<DK_LEVELS.length ? i : 5+((i-DK_LEVELS.length)%(DK_LEVELS.length-5))];
const dkNumerals=()=> !!saved.dkNumerals || !!(blast && blast.phase!=="menu" && dkLevel().numerals);
const DK_RIVET_SETS={
  triads:  [["I",0,0,""],["ii",1,2,"m"],["iii",2,4,"m"],["IV",3,5,""],["V",4,7,""],["vi",5,9,"m"],["vii°",6,11,"°"],["I",0,0,""]],
  sevenths:[["Imaj7",0,0,"maj7"],["ii7",1,2,"m7"],["iii7",2,4,"m7"],["IVmaj7",3,5,"maj7"],["V7",4,7,"7"],["vi7",5,9,"m7"],["vii°",6,11,"°"],["Imaj7",0,0,"maj7"]],
  minor:   [["i",0,0,"m"],["ii°",1,2,"°"],["III",2,3,""],["iv",3,5,"m"],["V",4,7,""],["VI",5,8,""],["vii°",6,11,"°"],["i",0,0,"m"]],
};
function dkKey(f, minor){
  const major=KEY_BY_FIFTHS[f], name=minor ? above(major, 5, 9) : major;
  return {f, name, minor:!!minor, label:`${name} ${minor ? "MINOR" : "MAJOR"}`, pc:pcOfName(name)};
}
const dkPlain=root=> !!root && !/[𝄪𝄫]|♭♭|♯♯/.test(root);
// a chord of the key: spelled from the key's name, letters and semitones up
function dkSpell(key, steps, semis, q, num){
  const root=above(key.name, steps, semis); if(!dkPlain(root) || !spellChord(root, q)) return null;
  return {root, q, pc:pcOfName(root), sym:root+q, num};
}
// a barrel's chord, and what resolves it
function dkBarrel(key, id){
  const [semis, kind, num]=DK_BARRELS[id], pc=mod(key.pc+semis,12);
  const names=key.f<0 || kind!=="dom" ? FLAT_NAMES : SHARP_NAMES;
  const root= kind==="dom" ? dkDomRoot(key, id) : names[pc];
  const to=mod(pc+DK_RES[kind],12);
  return {id, kind, root, pc, sym:root+"7", num, to, deceptive: kind==="dom" ? mod(pc+2,12) : null};
}
// a secondary dominant's root, spelled from the degree it's the dominant of
function dkDomRoot(key, id){
  const of={"V7":[4,7], "V/V":[1,2], "V/ii":[5,9], "V/vi":[2,4], "V/iii":[6,11], "V/IV":[0,0]}[id];
  return above(key.name, of[0], of[1]) || SHARP_NAMES[mod(key.pc+of[1],12)];
}
// a fireball: a diminished seventh, four notes a minor third apart; any chord rooted a semitone above
// one of them puts it out
function dkFire(){
  const root=Math.floor(Math.random()*12), pcs=[0,3,6,9].map(s=>mod(root+s,12)), names=SHARP_NAMES;
  return {pc:root, sym:names[root]+"°7", to:new Set(pcs.map(p=>mod(p+1,12)))};
}

// ---------- the game ----------
function genKong(){
  return {kind:"kong", prompt:"Dominant Kong", sub:"Climb home through a chain of fifths; jump Kong's dominant barrels, or play where they resolve to break them.",
    answer:{type:"kong", get name(){ const b=blast && blast.kind==="kong" && blast.barrels && blast.barrels[0]; return b ? `${b.chord.sym}'s resolution` : "a barrel's resolution"; }},
    get hint(){ const b=blast && blast.kind==="kong" && blast.barrels && blast.barrels[0]; return b ? `${b.chord.sym} resolves to ${SHARP_NAMES[b.chord.to]}.` : "A dominant seventh resolves down a fifth."; },
    context:0};
}
function startKong(){
  blast={kind:"kong", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), clock:0, hero:null, barrels:[], fires:[], st:"idle"};
  dkDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  dkMenu();
  blast.raf=requestAnimationFrame(dkTick);
}
// the harp chromatic, a d-pad; the key signature the stage's
function dkDevice(){
  if(!blast || blast.kind!=="kong" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(hasSetting(35)) borrow(35, keyIndexOf(blast.key ? blast.key.f : 0)); if(knobsReady()) borrow(238,1); });   // the knobs sending where they are, for the lifts
  dkKeyCheck();
  if(blast.phase==="play" && !pollT) poll(true);
}
function buildKongField(box){
  const field=document.createElement("div"); field.className="field arcade kong"; field.setAttribute("aria-label","The girders");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="kong"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), strip:kmStrip(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // its own screen, at the old game's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  dkBar(); setTimeout(helperSync);
}
function dkBar(){
  if(!blast || blast.kind!=="kong" || !blast.hud) return;
  const k=blast.key ? ` · ${blast.key.label}` : "", b=blast.bonusPts!=null && blast.hero ? ` · BONUS ${Math.max(0,Math.ceil(blast.bonusPts/100)*100)}` : "";
  const ham=blast.hero && blast.clock<(blast.hammerUntil||0) ? ` · HAMMER ${Math.ceil(blast.hammerUntil-blast.clock)}` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${k}${b}${ham}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const DKMENU_G={key:"kong", title:"DOMINANT KONG",
  rules:()=>`<p>KONG IS THE DOMINANT. EVERY BARREL HE THROWS IS A DOMINANT SEVENTH: JUMP IT, OR PLAY THE CHORD IT RESOLVES TO AND IT BREAKS. G7 RESOLVES TO C; G7 TO Am IS DECEPTIVE, AND SCORES MORE.</p><p>THE WAY UP IS A CHAIN OF FIFTHS HOME: A LOCKED LADDER OPENS WHEN YOU PLAY THE CHORD OF THE FLOOR ABOVE IT. HOME IS THE KEY'S I, AT THE TOP.</p><p>ON THE RIVETS, STAND ON EACH AND PLAY ITS CHORD TO PULL IT. PULL THEM ALL AND KONG COMES DOWN.</p><p>${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME, A TO JUMP" : pfKnob("kong") ? pfSteerSay("JUMP") : "WALK ON THE HARP OR THE ARROW KEYS, HOLDING THE WAY; A OR SPACE TO JUMP"}.</p>`,
  levels:DK_LEVELS, begin:i=>beginKong(i), demo:()=>dkDemo(), modNote:"title"};
function dkMenu(over){ arcadeMenu(DKMENU_G, over); }
function beginKong(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, stageN:0, phase:"play", over:false, clock:0});
  if(canWrite() && hasSetting(33)) ensure(33,0);                // no Barry Harris: the plain chords
  saved.kongStart=level; save();
  stats.streak=0; scoreboard();
  dkNewStage(); dkPlace();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(dkTick);
  dkLevelBanner();
  sfx("start"); dkBar();
}
// on the screen's minichord, how to set the key while it's still the player's to set
const dkKeyHint=()=> keyOnScreen() && dkComboOk() && !blast.keySet ? ` · SET IT: ${keyHoldHow(blast.key.f)}` : "";
function dkLevelBanner(){ banner(`LEVEL ${blast.level+1}`, `${dkLevel().n.toUpperCase()} · ${blast.key.label}${dkKeyHint()}${dkKnobLift() ? " · THE RIGHT LIFT IS YOUR KNOB" : ""}`); }

// A fresh stage: its girders (as tall as the room has), its key, the locks on the chain home or the
// rivets dealt, the bonus (more for a taller stage).
function dkNewStage(){
  const L=dkLevel(), S=dkStageFor(L.stage);
  blast.stage = L.stage==="lifts" ? dkLiftStage(S) : S; DK_H=S.H; blast.layoutKey=null;
  const f = L.keys ? rnd([...Array(2*L.keys+1).keys()].map(i=>i-L.keys)) : 0;
  dkSetKey(dkKey(f, L.rivets==="minor"));
  blast.gaps=[]; blast.locks=new Set(); blast.chainWrong=false;
  if(L.stage==="girders"){
    // the floors' chords, from home down; the ladders up locked from home down, L.chain of them
    const h=dkHomeF(S), home=dkSpell(blast.key, 0, 0, "", "I"), floors=[];
    floors[h]=home;
    DK_CHAIN.forEach((id,i)=>{ floors[h-1-i]={...dkBarrel(blast.key, id), q:"7", isChain:true}; });
    blast.floorChord=floors;
    for(let k=0; k<Math.min(6, L.chain||0); k++) blast.locks.add(h-1-k);
    blast.hammers=S.hammers.map(h=>({...h, taken:false})); blast.rivets=null;
  } else if(L.stage==="lifts"){
    blast.floorChord=null; blast.rivets=null; blast.hammers=[];
  } else {
    blast.floorChord=null;
    // the key's eight chords, and on a taller stage, dealt again for the rivets past eight
    const set=DK_RIVET_SETS[L.rivets], deal=()=>shuffle(set.map(([num,st,se,q])=>dkSpell(blast.key, st, se, q, num))), chords=[];
    while(chords.length<S.rivets.length) chords.push(...deal());
    blast.rivets=S.rivets.map((r,i)=>({...r, chord:chords[i], pulled:false}));
    blast.hammers=[];
  }
  blast.kongChord={...dkBarrel(blast.key,"V7"), q:"7"};                // what Kong wears: the dominant
  blast.bonusStart=Math.round((L.stage==="girders" ? 5000 : 6000)*S.scale/100)*100; blast.bonusPts=blast.bonusStart;
  blast.kongDown=0; blast.stageAt=blast.clock; blast.girderCv=null;
}
function dkSetKey(key){
  blast.key=key; blast.keySet=false; blast.keyByGame=false;
  if(blast.phase==="play" && canWrite() && hasSetting(35) && !dkComboOk()){ blast.keyByGame=true; borrow(35, keyIndexOf(key.f)); }
  dkKeyCheck();
}
// everyone where they start, after a lost life too: the barrels and fireballs gone, the locks
// opened and the rivets pulled staying so
function dkPlace(){
  const S=dkStage();
  blast.hero={x:S.start.x, y:dkSurf(S.start.f, S.start.x), f:S.start.f, state:"walk", dir:"right", vx:0, vy:0, moving:false};
  blast.barrels=[]; blast.fires=[]; blast.hammerUntil=0;
  blast.throwAt=blast.clock+1.4; blast.kongPose=0;
  if(dkLevel().stage==="rivets" && dkLevel().fire) blast.fireNext=blast.clock+4;
  blast.st="ready"; blast.stUntil=blast.clock+(blast.phase==="play" ? 1.8 : .2);
  dkHeldReset();
}

// ---------- each frame ----------
function dkTick(now){
  if(!blast || blast.kind!=="kong") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;   // a frame stamped before the game began counts for nothing
  if((blast.phase==="play" || blast.phase==="demo") && blast.hero) dkStep(dt);
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(dkTick);
}
// how fast, in pixels a second: slower at the relaxed speeds, a little faster each stage
const dkPace=()=> (1+.03*Math.min(blast.stageN||0,10))/Math.sqrt(speedMul());
const DK_WALK=46, DK_CLIMB=30, DK_JUMP=130, DK_GRAV=360, DK_FALL_OK=14, DK_ROLL=52;   // the jump: up 23 pixels, in the air 0.7 of a second, long enough to clear a barrel coming at you
const DK_AIR=300;                                                      // steering in the air: from standing to a walk in a sixth of a second
function dkStep(dt){
  blast.clock+=dt;
  if(blast.st==="ready"){ if(blast.clock>=blast.stUntil) blast.st="go"; return; }
  if(blast.st==="dying"){ if(blast.clock>=blast.stUntil) dkAfterDeath(); return; }
  if(blast.st==="clear"){ dkClearing(dt); return; }
  if(blast.st!=="go") return;
  dkLifts(dt);
  if(blast.st!=="go") return;
  dkHero(dt);
  if(blast.st!=="go") return;
  dkKong(dt);
  dkRoll(dt);
  dkFires(dt);
  dkCollide();
  dkTimers(dt);
}

// ---------- the way held ----------
const DK_ARROWS={ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right"};
const dkKeysHeld=new Map();
function dkHeldReset(){ dkKeysHeld.clear(); }
// Steered on the knob (pfKnob, ../controls.js): the way to where it points, after up or down held on the harp.
function dkWays(){
  if(blast.phase==="demo") return blast.demoWays || [];
  const keys=[...dkKeysHeld.entries()].sort((a,b)=>b[1]-a[1]).map(([w])=>w);
  if(pfKnob()){
    const H=blast.hero; blast.pfAt=pfKnobAt(8, DK_W-8);
    const t=H && pfToward(H.x, blast.pfAt, 1);
    return [...new Set([...keys, ...pfHeld(), ...(t ? [t] : [])])];
  }
  const harp=kmHeld().filter(z=>z==="up" || z==="down" || z==="left" || z==="right");
  return [...new Set([...keys, ...harp])];
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="kong" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const letters = !(typeof kbOn==="function" && kbOn());
  const w=Object.assign({...DK_ARROWS}, letters ? {KeyW:"up", KeyS:"down", KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w && blast && blast.phase==="play"){ e.preventDefault(); if(!e.repeat) dkKeysHeld.set(w, performance.now()); return; }
  if(e.code==="Space" && blast && blast.phase==="play" && !e.repeat){ e.preventDefault(); dkJump(); }
});
document.addEventListener("keyup", e=>{
  const letters = !(typeof kbOn==="function" && kbOn());
  const w=Object.assign({...DK_ARROWS}, letters ? {KeyW:"up", KeyS:"down", KeyA:"left", KeyD:"right"} : {})[e.code];
  if(w) dkKeysHeld.delete(w);
});
window.addEventListener("blur", ()=>dkKeysHeld.clear());

// ---------- the player ----------
// Walking: along the girder, its slope under the feet; off its end, or into a pulled rivet's gap, a
// fall. A way up or down taken onto a ladder within four pixels, if it isn't locked (up) and no hammer's
// carried. Climbing: up or down the ladder only. In the air: the jump's arc, or a fall, landing on
// the first girder the feet come down through; down further than a short drop, it's fatal. A way held
// in the air steers, picking up to a walk's speed that way; let go, and the jump carries on as it was.
function dkHero(dt){
  const H=blast.hero, S=dkStage(), ways=dkWays(), pace=dkPace(), hammer=blast.clock<(blast.hammerUntil||0);
  H.moving=false;
  if(H.state==="walk"){
    for(const w of [...ways.filter(w=>w==="up" || w==="down"), ...ways.filter(w=>w==="left" || w==="right")]){
      if(w==="up" || w==="down"){
        if(hammer) continue;
        const L=S.ladders.find(L=>(w==="up" ? L.lo===H.f : L.hi===H.f) && Math.abs(L.x-H.x)<4);
        if(!L) continue;
        if(w==="up" && dkLocked(L)){ if(!H.toldLock || blast.clock-H.toldLock>2){ H.toldLock=blast.clock; dkLockSay(L); } continue; }
        Object.assign(H, {state:"climb", L, x:L.x, dir:w}); break;
      }
      const s= w==="left" ? -1 : 1, nx=pfKnob() ? pfStop(H.x, H.x+s*DK_WALK*pace*dt, blast.pfAt) : H.x+s*DK_WALK*pace*dt;
      H.dir=w; H.moving=true;
      if(!dkOn(H.f, nx) && nx>=0 && nx<=DK_W){ H.x=nx; dkTakeOff(0, 0); return; }
      H.x=Math.max(0, Math.min(DK_W, nx)); H.y=dkSurf(H.f, H.x);
      break;
    }
    if(H.state==="walk") dkHammerGrab();
  }
  if(H.state==="climb"){
    const L=H.L, w=ways.find(w=>w==="up" || w==="down");
    if(!w) return;
    H.dir=w; H.moving=true;
    const top=dkSurf(L.hi, L.x), bottom=dkSurf(L.lo, L.x);
    H.y+= (w==="up" ? -1 : 1)*DK_CLIMB*pace*dt;
    if(H.y<=top){ Object.assign(H, {y:top, f:L.hi, state:"walk", L:null}); dkArrive(); }
    else if(H.y>=bottom){ Object.assign(H, {y:bottom, f:L.lo, state:"walk", L:null}); }
    return;
  }
  if(H.state==="air"){
    const w=ways.find(w=>w==="left" || w==="right");
    if(w){ const want=(w==="left" ? -1 : 1)*DK_WALK, step=DK_AIR*pace*dt;
      H.vx= H.vx<want ? Math.min(want, H.vx+step) : Math.max(want, H.vx-step); H.dir=w; H.moving=true; }
    const y0=H.y; H.vy+=DK_GRAV*pace*pace*dt; H.x=Math.max(2, Math.min(DK_W-2, H.x+H.vx*pace*dt)); H.y+=H.vy*dt;
    dkHammerGrab();
    if(H.vy>0){
      const land=S.floors.map((F,f)=>f).filter(f=>dkOn(f, H.x) && y0<=dkSurf(f,H.x)+(S.floors[f].plat ? 3 : .5) && H.y>=dkSurf(f,H.x)).sort((a,b)=>dkSurf(a,H.x)-dkSurf(b,H.x))[0];
      if(land!=null){
        const drop=dkSurf(land,H.x)-H.fromY;
        Object.assign(H, {state:"walk", f:land, y:dkSurf(land,H.x), vx:0, vy:0});
        if(drop>DK_FALL_OK && blast.phase==="play") return dkDie("A FALL");
        sfx("land"); if(land!==H.fromF) dkArrive();
        return;
      }
      if(H.y>DK_H+8 && blast.phase==="play") return dkDie("A FALL");
    }
  }
}
function dkTakeOff(vy, vx){ const H=blast.hero; Object.assign(H, {state:"air", vy, vx, fromY:H.y, fromF:H.f, jumped:new Set()}); }
function dkJump(){
  const H=blast.hero; if(!H || H.state!=="walk" || blast.st!=="go") return;
  const w=dkWays().find(w=>w==="left" || w==="right"), s= w==="left" ? -1 : w==="right" ? 1 : 0;
  dkTakeOff(-DK_JUMP*dkPace(), s*DK_WALK); if(w) H.dir=w;               // the jump's arc as fast as the game: as high, longer at the slower speeds
  sfx("jump");
}
// on a new floor: home, at the top of the girders, clears the stage
function dkArrive(){
  const H=blast.hero, F=dkStage().floors[H.f];
  if(F.home) dkHome();
}
function dkHammerGrab(){
  const H=blast.hero;
  for(const h of blast.hammers||[]){
    if(h.taken) continue;
    const hy=dkSurf(h.f, h.x)-22;
    if(Math.abs(H.x-h.x)<7 && H.y-14<hy+6 && H.y>hy-2){ h.taken=true; blast.hammerUntil=blast.clock+9*Math.sqrt(speedMul()); sfx("hammer"); if(blast.phase==="play") banner("HAMMER!", "A PIANO'S: SWING IT AT THE BARRELS"); dkBar(); }
  }
}
function dkLockSay(L){
  const c=blast.floorChord[L.hi];
  heard("LOCKED", false, `THE FLOOR ABOVE IS ${dkLabel(c)}: PLAY IT TO CLIMB`);
}

// ---------- Kong and his barrels ----------
const dkThrowGap=()=> Math.max(1.5, 3.6-.18*blast.level-.05*(blast.stageN||0))*Math.sqrt(speedMul());
function dkKong(dt){
  const L=dkLevel();
  if(L.stage==="rivets") return;
  if(blast.clock>=blast.throwAt-.5) blast.kongPose=1;
  if(blast.clock>=blast.throwAt){
    blast.throwAt=blast.clock+dkThrowGap()*(.8+Math.random()*.4); blast.kongPose=2; blast.poseUntil=blast.clock+.35;
    const id=rnd(L.barrels), chord=dkBarrel(blast.key, id), K=dkStage().kong;
    if(L.stage==="lifts") blast.barrels.push({x:K.x+16, y:dkSurf(K.f, K.x), f:K.f, dir:1, state:"spring", vy:-60, chord, spin:0, tried:new Set()});
    else blast.barrels.push({x:K.x+20, y:dkSurf(K.f, K.x+20), f:K.f, dir:1, state:"roll", chord, spin:0, tried:new Set()});
    sfx("throw");
  }
  if(blast.kongPose===2 && blast.clock>=blast.poseUntil) blast.kongPose=0;
}
// Rolling downhill; at a ladder's top now and then down it (more often with the player below); off a
// girder's end, a fall to the next; at the bottom left, into the drum.
function dkRoll(dt){
  const S=dkStage(), H=blast.hero, pace=dkPace();
  for(const b of blast.barrels){
    b.spin+=dt*10;
    if(b.state==="spring"){
      b.vy+=DK_GRAV*.7*pace*pace*dt; b.y+=b.vy*dt; b.x+=44*pace*dt;
      if(b.x>=S.drop){ b.x=S.drop; b.state="drop"; b.vy=40; continue; }
      if(b.y>=S.top-6 && b.vy>0){ b.y=S.top-6; b.vy=-95*pace; sfx("boing"); }
      continue;
    }
    if(b.state==="drop"){ b.vy+=DK_GRAV*.8*dt; b.y+=b.vy*dt; if(b.y>DK_H+12) b.gone=true; continue; }
    if(b.state==="roll"){
      const nx=b.x+b.dir*DK_ROLL*pace*dt;
      const L=S.ladders.find(L=>L.hi===b.f && (L.x-b.x)*(L.x-nx)<=0 && !b.tried.has(L));
      if(L){ b.tried.add(L); const below=H.f<b.f && Math.abs(H.x-L.x)<60; if(Math.random()<(below ? .55 : .22)){ Object.assign(b, {state:"ladder", x:L.x, L}); continue; } }
      if(b.f===0 && S.drum && nx<=S.drum.x+6){ b.gone=true; dkDrum(b); continue; }
      if(!dkOn(b.f, nx)){ Object.assign(b, {state:"fall", x:nx, vy:20}); continue; }
      b.x=nx; b.y=dkSurf(b.f, b.x);
    } else if(b.state==="ladder"){
      b.y+=DK_ROLL*.7*pace*dt;
      const bottom=dkSurf(b.L.lo, b.x);
      if(b.y>=bottom){ Object.assign(b, {state:"roll", y:bottom, f:b.L.lo, dir:dkDownhill(b.L.lo), L:null}); }
    } else if(b.state==="fall"){
      const y0=b.y; b.vy+=DK_GRAV*.8*dt; b.y+=b.vy*dt; b.x+=b.dir*12*dt;
      const land=S.floors.map((F,f)=>f).filter(f=>f<b.f && dkOn(f,b.x) && y0<=dkSurf(f,b.x)+.5 && b.y>=dkSurf(f,b.x))[0];
      if(land!=null){ Object.assign(b, {state:"roll", f:land, y:dkSurf(land,b.x), dir:dkDownhill(land)}); sfx("bounce"); }
      else if(b.y>DK_H+10) b.gone=true;
    }
  }
  blast.barrels=blast.barrels.filter(b=>!b.gone);
}
// a barrel in the drum, unresolved: a flare, and from the fire levels on, a fireball
function dkDrum(b){
  blast.flareAt=blast.clock;
  if(dkLevel().fire && blast.fires.length<3 && dkStage().drum){ dkSpawnFire(dkStage().drum.x+10, 0); }
  sfx("flare");
}
function dkSpawnFire(x, f){
  blast.fires.push({x, f, y:dkSurf(f,x), state:"walk", dir:1, chord:dkFire(), think:0});
  sfx("fire");
}
// The fireballs wander: along a girder, now and then up or down a ladder, turning at the ends, drawn
// a little toward the player on the same floor.
function dkFires(dt){
  const S=dkStage(), H=blast.hero, sp=22*dkPace();
  if(dkLevel().stage==="rivets" && dkLevel().fire && blast.clock>=(blast.fireNext||1e9) && blast.fires.length<2+Math.floor(blast.level/4)){
    blast.fireNext=blast.clock+9; const left=Math.random()<.5; dkSpawnFire(left ? 20 : DK_W-20, 1+Math.floor(Math.random()*(S.floors.length-2)));
  }
  for(const e of blast.fires){
    if(e.state==="walk"){
      if(blast.clock>=e.think){ e.think=blast.clock+.8+Math.random()*1.2;
        if(H.f===e.f && Math.random()<.65) e.dir= H.x<e.x ? -1 : 1; else if(Math.random()<.3) e.dir=-e.dir;
        const L=S.ladders.find(L=>(L.lo===e.f || L.hi===e.f) && Math.abs(L.x-e.x)<6);
        if(L && Math.random()<.5){ Object.assign(e, {state:"climb", L, x:L.x, up:L.lo===e.f}); continue; } }
      const nx=e.x+e.dir*sp*dt;
      if(!dkOn(e.f, nx)){ e.dir=-e.dir; continue; }
      e.x=nx; e.y=dkSurf(e.f, e.x);
    } else {
      const L=e.L, top=dkSurf(L.hi,L.x), bottom=dkSurf(L.lo,L.x);
      e.y+=(e.up ? -1 : 1)*sp*.8*dt;
      if(e.up && e.y<=top){ Object.assign(e, {state:"walk", f:L.hi, y:top, L:null}); if(dkStage().floors[e.f].home){ e.state="climb"; e.L=L; e.up=false; } }
      else if(!e.up && e.y>=bottom) Object.assign(e, {state:"walk", f:L.lo, y:bottom, L:null});
    }
  }
}
// touching a barrel, a fireball or Kong: fatal, unless the hammer's swung at it; jumped clean over a
// barrel, points
function dkCollide(){
  const H=blast.hero, hammer=blast.clock<(blast.hammerUntil||0);
  const hit=(x,y,w,h)=> Math.abs(H.x-x)<(w+8)/2 && H.y-15<y && H.y>y-h;
  for(const b of blast.barrels){
    if(hammer && Math.abs(b.x-(H.x+(H.dir==="left"?-8:8)))<10 && b.y>H.y-26 && b.y<H.y+4){ dkBreak(b, 300, "#FFD35A"); continue; }
    if(hit(b.x, b.y, 10, 9)){ if(blast.phase==="play") return dkDie(b.chord.sym); continue; }
    if(H.state==="air" && Math.abs(b.x-H.x)<8 && b.y-10>=H.y-1 && b.y-H.y<34 && !H.jumped.has(b)){
      H.jumped.add(b);
      if(blast.phase==="play"){ const pts=mulPts(100*(blast.level+1)); blast.score+=pts; dkPop(b, `+${pts}`, "#F1E8D2"); dkBar(); }
      sfx("hop");
    }
  }
  for(const e of blast.fires){
    if(hammer && Math.abs(e.x-(H.x+(H.dir==="left"?-8:8)))<10 && e.y>H.y-26 && e.y<H.y+4){ dkQuench(e, 500); continue; }
    if(hit(e.x, e.y, 10, 12) && blast.phase==="play") return dkDie(e.chord.sym);
  }
  blast.barrels=blast.barrels.filter(b=>!b.gone); blast.fires=blast.fires.filter(e=>!e.gone);
  const S=dkStage(), K=S.kong; if(K && H.f===K.f && Math.abs(H.x-K.x)<20 && blast.phase==="play" && !blast.kongDown) dkDie("KONG");
}
function dkBreak(b, pts, col){
  b.gone=true; blast.breaks=(blast.breaks||[]).concat([{x:b.x, y:b.y, at:blast.clock}]);
  if(blast.phase==="play"){ const p=mulPts(pts*(blast.level+1)); blast.score+=p; dkPop(b, `+${p}`, col); dkBar(); }
  sfx("break");
}
function dkQuench(e, pts){
  e.gone=true; blast.breaks=(blast.breaks||[]).concat([{x:e.x, y:e.y, at:blast.clock, fire:true}]);
  if(blast.phase==="play"){ const p=mulPts(pts*(blast.level+1)); blast.score+=p; dkPop(e, `+${p}`, "#7FE9FF"); dkBar(); }
  sfx("quench");
}
function dkDie(what){
  if(blast.st!=="go") return;
  blast.st="dying"; blast.stUntil=blast.clock+1.8; blast.diedAt=blast.clock;
  sfx("die"); buzz(blast.field, true);
  heard(what, false, what==="A FALL" ? "TOO FAR TO FALL" : what==="KONG" ? "KONG CAUGHT YOU" : what==="TIME" ? "THE BONUS RAN OUT" : `${what} CAUGHT YOU: JUMP IT, OR PLAY WHERE IT RESOLVES`);
}
function dkAfterDeath(){
  blast.lives--; dkBar();
  if(blast.lives<=0) return dkOver();
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`, "");
  blast.bonusPts=blast.bonusStart;
  dkPlace();
}
function dkOver(){
  blast.phase="over"; blast.over=true; blast.st="idle"; poll(false);
  const best=Math.max(saved.best.kong||0, blast.score); saved.best.kong=best; save();
  helpChord(null); dkBar(); dkMenu(true);
}

// ---------- the end of a stage ----------
// Home: the chain resolved; the bonus paid, and the chain's own if every lock was opened without a
// wrong chord. The rivets: Kong comes down.
function dkHome(){
  if(blast.st!=="go") return;
  blast.st="clear"; blast.stUntil=blast.clock+3; blast.clearKind="home"; blast.barrels=[]; blast.fires=[];
  const L=dkLevel(), links=Math.min(6, L.chain||0), bonus=Math.max(0, Math.round(blast.bonusPts/100)*100);
  const chain = links>1 && !blast.chainWrong ? mulPts(500*links*(blast.level+1)) : 0;
  if(blast.phase==="play"){ blast.score+=bonus+chain; banner("HOME!", `${blast.key.name} · BONUS ${bonus}${chain ? ` · THE CHAIN +${chain}` : ""}`); }
  sfx("home", blast.key.pc); dkBar();
}
function dkKongDown(){
  if(blast.st!=="go") return;
  blast.st="clear"; blast.stUntil=blast.clock+3.4; blast.clearKind="rivets"; blast.kongDown=blast.clock; blast.barrels=[]; blast.fires=[];
  const bonus=Math.max(0, Math.round(blast.bonusPts/100)*100);
  if(blast.phase==="play"){ blast.score+=bonus; banner("KONG'S DOWN!", `EVERY CHORD OF ${blast.key.label} · BONUS ${bonus}`); }
  sfx("kongdown"); dkBar();
}
function dkClearing(dt){
  if(blast.clock>=blast.stUntil) dkNextStage();
}
function dkNextStage(){
  blast.stageN=(blast.stageN||0)+1; blast.level++;
  dkNewStage(); dkPlace();
  dkLevelBanner(); sfx("level"); dkBar();
}

// ---------- the timers ----------
// the bonus counting down (run out, a life); the helper lit with the next chord: the nearest barrel's
// resolution, or the lock or rivet at hand
function dkTimers(dt){
  if(blast.phase==="play"){
    const was=Math.ceil(blast.bonusPts/100);
    blast.bonusPts-=100*dt/(2.2*Math.sqrt(speedMul()));
    if(Math.ceil(blast.bonusPts/100)!==was) dkBar();
    if(blast.bonusPts<=0) return dkDie("TIME");
  }
  if(blast.clock>=(blast.hammerUntil||0) && blast.hammerShown){ blast.hammerShown=false; dkBar(); }
  if(blast.clock<(blast.hammerUntil||0)){ const s=Math.ceil(blast.hammerUntil-blast.clock); if(s!==blast.hammerShown){ blast.hammerShown=s; dkBar(); } }
  const c=dkNext();
  if(c){ arcadeMod(c.root); helpChord(c.root, c.q); } else helpChord(null);
}
// the chord most worth playing now
function dkNext(){
  const H=blast.hero;
  const lock=dkStage().ladders.find(L=>L.lo===H.f && dkLocked(L) && Math.abs(L.x-H.x)<20);
  if(lock){ const c=blast.floorChord[lock.hi]; return {root:c.root, q:c.q||""}; }
  const r=(blast.rivets||[]).find(r=>!r.pulled && r.f===H.f && Math.abs(r.x-H.x)<8);
  if(r) return {root:r.chord.root, q:r.chord.q};
  const b=[...blast.barrels].sort((a,b)=>Math.hypot(a.x-H.x,a.y-H.y)-Math.hypot(b.x-H.x,b.y-H.y))[0];
  if(b){ const names=blast.key.f<0 ? FLAT_NAMES : SHARP_NAMES; return {root:names[b.chord.to], q:""}; }
  return null;
}

// ---------- the key ----------
const dkComboOk=()=> keySetReady() && hasSetting(35);
function dkKeyCheck(){
  if(!blast || blast.phase!=="play" || !blast.key || !hasSetting(35) || mc.params[35]==null || mc.presetLoaded) return;
  const f=devFifths();
  if(f===blast.key.f){
    if(blast.keySet) return;
    blast.keySet=true;
    if(blast.keyByGame || !blast.key.f) return;
    const dist=Math.abs(blast.key.f), pts=mulPts((500+250*(dist-1))*(blast.level+1));
    blast.score+=pts; heard(`KEY OF ${blast.key.name}`, true); sfx("key", blast.key.pc); dkBar();
    return;
  }
  if(blast.keySet){ blast.keyByGame=true; borrow(35, keyIndexOf(blast.key.f)); }
  else if(dkComboOk() && blast.clock-(blast.stageAt||0)>12){ blast.keyByGame=true; borrow(35, keyIndexOf(blast.key.f)); }   // not set after a while: set for you
}

// ---------- the minichord ----------
// A chord does everything it can: every barrel it resolves breaks (deceptively, for more), every
// fireball it's a resolution of goes out, the lock at hand opens, the rivet underfoot comes out.
function kongChord(voices){
  if(!blast || blast.kind!=="kong") return;
  if(blast.phase==="demo" && blast.demo){ endDkDemo(blast.demo); return; }
  if(blast.phase!=="play" || blast.st!=="go") return;
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  dkPlay(pitches, id);
}
function dkPlay(pitches, id){
  const name=chordName(pitches, devFifths()), root=mod(id.root,12), minor=/^m(?!aj)|°|dim/.test(id.quality||"");
  const did=[];
  // the lock at hand: the floor above's chord
  const H=blast.hero, lock=dkStage().ladders.find(L=>L.lo===H.f && dkLocked(L));
  if(lock){
    const c=blast.floorChord[lock.hi];
    if(isChord(pitches, c.pc, c.q||"")){ blast.locks.delete(lock.lo); did.push("open");
      if(blast.phase==="play"){ const p=mulPts(200*(blast.level+1)); blast.score+=p; dkPop({x:lock.x, y:dkSurf(lock.hi, lock.x)}, `+${p}`, "#7FE08A"); }
      sfx("unlock", c.pc); banner(c.isChain ? "A LINK IN THE CHAIN" : "HOME'S OPEN", `${dkLabel(c)}: THE FLOOR ABOVE`); }
  }
  // the rivet underfoot
  const r=(blast.rivets||[]).find(r=>!r.pulled && r.f===H.f && Math.abs(r.x-H.x)<8 && H.state==="walk");
  if(r && isChord(pitches, r.chord.pc, r.chord.q)){
    r.pulled=true; blast.gaps.push({f:r.f, x:r.x}); did.push("rivet");
    H.x=r.x+(H.x<r.x || (H.x===r.x && H.dir==="left") ? -5 : 5); H.y=dkSurf(H.f, H.x);   // the player steps off the hole it leaves
    if(blast.phase==="play"){ const p=mulPts(200*(blast.level+1)); blast.score+=p; dkPop(r, `+${p}`, "#FFD35A"); }
    sfx("rivet");
    if(blast.rivets.every(x=>x.pulled)) dkKongDown();
  }
  // the barrels: resolved, or deceived
  const res=blast.barrels.filter(b=>b.chord.to===root);
  const dec=blast.barrels.filter(b=>b.chord.deceptive===root && minor && !res.includes(b));
  const all=[...res.map(b=>[b,300]), ...dec.map(b=>[b,500])];
  all.forEach(([b,pts],i)=>dkBreak(b, pts*2**i, i ? "#FF9A3C" : "#FFD35A"));
  if(res.length) did.push("resolved"); if(dec.length) did.push("deceptive");
  if(dec.length && blast.phase==="play") banner("DECEPTIVE!", `${dec[0].chord.sym} TO ${name}`);
  // the fireballs
  const out=blast.fires.filter(e=>e.chord.to.has(root));
  out.forEach(e=>dkQuench(e, 500)); if(out.length) did.push("quenched");
  blast.barrels=blast.barrels.filter(b=>!b.gone); blast.fires=blast.fires.filter(e=>!e.gone);
  if(did.length){ heard(`${name}${res.length ? " · RESOLVED" : dec.length ? " · DECEPTIVE" : ""}`, true); dkBar(); return; }
  if(lock) blast.chainWrong=true;
  const b=blast.barrels[0];
  heard(name, false, lock ? `THE FLOOR ABOVE IS ${dkLabel(blast.floorChord[lock.hi])}` : r ? `THIS RIVET IS ${dkLabel(r.chord)}` : b ? `NOTHING RESOLVES TO ${name}` : "NOTHING TO PLAY IT AT");
}
// a chord as it's labelled: by name, or by numeral
const dkLabel=c=> c ? (dkNumerals() && c.num ? c.num : c.sym) : "";
// the harp: A jumps (steered on the knob, any touch but its top and bottom); the rest is read held (dkWays)
function kongHarp(pc){
  if(!blast || blast.kind!=="kong") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endDkDemo(blast.demo); return; }
  const z=kmControl(pc); if(pfKnob() ? pfHarpZone(pc)==="jump" : z==="A" || z==="B") dkJump();
}

// ---------- drawing ----------
// Its own screen at the old game's resolution, as Chord Chomp's: the girders 224 across, every sprite
// and letter drawn pixel by pixel, shown exactly as big as fits on a phone (pxFit's fill), a whole
// number of the screen's own pixels a pixel on a desktop. On a phone held upright the whole stage fills
// its width, as the old cabinet's screen did, and its height, the stage built as tall (dkStageFor). Where it would come out too small to read a barrel's chord (with the screen's minichord
// under it, or held sideways), it's shown at the least size that reads and the view follows the player
// up and across it, as Chord Chomp's does, the player low in it, to see what's coming down. On a wide
// field, zoomed in further (pxZoom).
const DK_LEAST=4/3, DK_LOOK=.62;                                       // CSS pixels a pixel, at the least; how far down the view the player is kept
function dkLayout(){
  const f=pxFit(DK_W, DK_H, DK_LEAST, true, true);
  Object.assign(blast, {k:f.k, view:{x:0, y:0, w:f.w, h:f.h}, scrolls:DK_W>f.w || DK_H>f.h, cam:null, girderCv:null, scrLeft:f.left, scrTop:f.top});
  pxPlace(blast.screen, f);
  dkCamera(0);
}
function dkCamera(dt){
  const v=blast.view, H=blast.hero || {x:DK_W/2, y:DK_H/2};
  const axis=(len, all, focus, at, was)=>{
    if(all<=len) return Math.floor((len-all)/2);
    const want=Math.max(len-all, Math.min(0, len*at-focus));
    if(was==null || !dt) return want;
    return was+(want-was)*Math.min(1, dt*7);
  };
  const c=blast.cam||{};
  c.x=axis(v.w, DK_W, H.x, .5, c.x); c.y=axis(v.h, DK_H, H.y-8, DK_LOOK, c.y);
  blast.cam=c; blast.ox=Math.round(c.x); blast.oy=Math.round(c.y);
}

// ---------- sprites ----------
// the player: a cap and the arcade's cyan, 12 by 16; walking, jumping, climbing, swinging the hammer
const DK_HERO={
  stand:["....RRRR....","...RRRRRR...","..RRRRRRRRR.","...HSSSKS...","...HSSSSS...","....SSSS....","...CCCCCC...","..CCCCCCCC..",
         ".SCCCCCCCCS.",".SCCCCCCCCS.","...YYYYYY...","...YYYYYY...","...YY..YY...","...YY..YY...","..BBB..BBB..","..BBB..BBB.."],
  walk: ["....RRRR....","...RRRRRR...","..RRRRRRRRR.","...HSSSKS...","...HSSSSS...","....SSSS....","...CCCCCC...","..CCCCCCCC..",
         ".SCCCCCCCCS.",".SCCCCCCCCS.","...YYYYYY...","...YYYYYY...","..YY....YY..",".YY......YY.",".BBB....BBB.","BBB......BBB"],
  jump: ["....RRRR....","...RRRRRR...","..RRRRRRRRR.","...HSSSKS...","...HSSSSS...","S...SSSS...S","SS.CCCCCC.SS","..CCCCCCCC..",
         "..CCCCCCCC..","..CCCCCCCC..","...YYYYYY...","...YYYYYY...","..YY....YY..",".YY......YY.",".BB......BB.","............"],
  climb:["....RRRR....","...RRRRRR...","...RRRRRR...","...HHHHHH...","...HHHHHH...","S...HHHH...S","SS.CCCCCC.SS","..CCCCCCCC..",
         "..CCCCCCCC..","..CCCCCCCC..","...YYYYYY...","...YYYYYY...","...YY..YY...","...YY...YY..","..BBB...BBB.","..BBB......."],
};
const DK_HERO_PAL={R:"#FF3B30", H:"#7A4A2A", S:"#FFC8A0", K:"#16132A", C:"#00E5FF", Y:"#2A5BD7", B:"#7A4A2A"};
function dkHeroSprite(pose, left, frame){
  const p = pose==="walk" && !frame ? "stand" : pose;
  let rows=DK_HERO[p];
  if(left) rows=rows.map(r=>[...r].reverse().join(""));
  return pxSprite(`dkhero|${p}|${left}`, rows, DK_HERO_PAL);
}
// Kong, 32 by 30: arms down, one raised to throw, both up beating his chest
function dkKongSprite(pose){
  const body=[
    "...........BBBBBBBBBB...........",".........BBBBBBBBBBBBBB.........","........BBBBFFFFFFFFBBBB........","........BBBFFKFFFFKFFBBB........",
    "........BBBFFFFFFFFFFBBB........","........BBBFFFKKKKFFFBBB........","........BBBBFFWWWWFFBBBB........",".........BBBBFFFFFFBBBB.........",
    "......BBBBBBBBBBBBBBBBBBBB......","....BBBBBBBBTTTTTTTTBBBBBBBB....","...BBBBBBBBTTTTTTTTTTBBBBBBBB...","..BBBBBBBBTTTTTTTTTTTTBBBBBBBB..",
    "..BBBBBBBBTTTTTTTTTTTTBBBBBBBB..","..BBBBBBBBTTTTTTTTTTTTBBBBBBBB..","..BBBBBBBBTTTTTTTTTTTTBBBBBBBB..","..BBBBBBBBBTTTTTTTTTTBBBBBBBBB..",
    "..BBBBBBBBBBTTTTTTTTBBBBBBBBBB..","..BBBB..BBBBBBBBBBBBBBBB..BBBB..","..BBB....BBBBBBBBBBBBBB....BBB..","..BBB....BBBBBBBBBBBBBB....BBB..",
    "..FFF....BBBBBBBBBBBBBB....FFF..",".........BBBBBB..BBBBBB.........","........BBBBBB....BBBBBB........","........BBBBB......BBBBB........",
    ".......FFFFFF......FFFFFF.......",".......FFFFFF......FFFFFF.......",
  ];
  const rows=body.map(r=>[...r]);
  const raise=(from, to)=>{                                            // the arm in columns from..to lifted beside his head
    for(let y=16; y<=20; y++) for(let x=from; x<=to; x++) rows[y][x]=".";
    for(let y=1; y<=8; y++) for(let x=from; x<=to; x++) if(Math.abs(x-(from+to)/2)<2) rows[y][x]="B";
    for(let x=from; x<=to; x++) if(Math.abs(x-(from+to)/2)<2.5) rows[0][x]="F";
  };
  if(pose>=1) raise(1, 6);                                             // one arm up, to throw
  if(pose===2) raise(25, 30);                                          // both, beating his chest
  rows.forEach((r,y)=>rows[y]=r.join(""));
  return pxSprite(`dkkong|${pose}`, rows, {B:"#8A4A1A", F:"#E8A070", K:"#16132A", W:"#FFFFFF", T:"#C88850"});
}
const DK_BARREL=[["..OOOOOO..",".OBBBBBBO.","OBBOOOOBBO","OBBBBBBBBO","OOOOOOOOOO","OBBBBBBBBO","OBBOOOOBBO","OBBBBBBBBO",".OBBBBBBO.","..OOOOOO.."],
                 ["..OOOOOO..",".OBBOBBBO.","OBBBOBBBBO","OBBBBOBBBO","OBBBBBOBBO","OBBBBBBOBO","OBBBBBBBOO","OBBBBBBBBO",".OBBBBBBO.","..OOOOOO.."]];
const DK_FIRE=[["....RR....","...RYYR...","..RYYYYR..",".RYYWYYWR.",".RYYKYYKR.","RYYYYYYYYR","RYYYYYYYYR",".RYYYYYYR.","..RRYYRR..",".R..RR..R."],
               ["...RR.....","..RYYR..R.","..RYYYYR..",".RYYWYYWR.",".RYYKYYKR.","RYYYYYYYYR","RYYYYYYYYR",".RYYYYYYR.","..RRYYRR..","R..RR..R.."]];
const DK_HAMMER=["..TTTTTT..","..TTTTTT..","..TTTTTT..","....WW....","....WW....","....WW....","....WW....","....WW...."];
const DK_LOCK=[".###.","#o.o#","#o.o#","#####","##o##","##o##","#####"];
const DK_HOME=["......RR......",".....RRRR.....","....RRRRRR....","...RRRRRRRR...","..RRRRRRRRRR..",".RRRRRRRRRRRR.","..WWWWWWWWWW..","..WWYYWWWWWW..","..WWYYWWDDWW..","..WWWWWWDDWW..","..WWWWWWDDWW.."];

// ---------- each frame ----------
// The girders, drawn once a stage (and again as a rivet's pulled or a lock opens): the old game's red
// girders, two rails and the struts between, following the slope pixel by pixel.
function dkPaint(){
  const S=dkStage(), cv=document.createElement("canvas"); cv.width=DK_W; cv.height=DK_H;
  const g=cv.getContext("2d"); if(!g || !g.fillRect) return cv;
  // ladders first, under the girders' rails
  for(const L of S.ladders){
    const top=Math.round(dkSurf(L.hi, L.x)), bottom=Math.round(dkSurf(L.lo, L.x)), locked=dkLocked(L);
    g.fillStyle=locked ? "#4A4A6A" : "#00D8E8";
    g.fillRect(L.x-4, top, 1, bottom-top); g.fillRect(L.x+3, top, 1, bottom-top);
    for(let y=top+4; y<bottom; y+=4) g.fillRect(L.x-4, y, 8, 1);
    if(locked){ g.fillStyle="#FF3B30"; for(let y=top+2; y<top+8; y+=3) g.fillRect(L.x-6, y, 12, 1); }
  }
  S.floors.forEach((F,f)=>{
    if(F.plat) return;
    for(let x=Math.round(F.x0); x<Math.round(F.x1); x++){
      if(dkGap(f, x+.5)) continue;
      const y=Math.round(dkSurf(f, x));
      g.fillStyle=F.home ? "#FF5AA0" : "#E8323C";
      g.fillRect(x, y, 1, 1); g.fillRect(x, y+6, 1, 1);
      const m=mod(x,8); if(m===0 || m===7) g.fillRect(x, y+1, 1, 5); else { g.fillRect(x, y+1+Math.floor(m*5/7), 1, 1); }
    }
  });
  // the pulled rivets' gaps, the rivets still in
  for(const r of blast.rivets||[]){ if(r.pulled) continue; const y=Math.round(dkSurf(r.f, r.x)); g.fillStyle="#FFD35A"; g.fillRect(r.x-3, y, 6, 7); g.fillStyle="#B8860B"; g.fillRect(r.x-3, y+6, 6, 1); }
  return cv;
}
function kongDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  if(!blast.stage || !blast.hero){ g.clearRect(0,0,s.width,s.height); return; }
  const lk=`${fieldW()}x${fieldH()}@${window.devicePixelRatio||1}|${DK_H}|${kmStripShown()}|${!!saved.beginner}|${blast.phase==="demo"}|${saved.harpLayout||""}`;
  if(blast.layoutKey!==lk){ blast.layoutKey=lk; dkLayout(); }
  if(blast.scrolls){ dkCamera(Math.min(.1, (now-(blast.camAt||now))/1000)); blast.camAt=now; }
  const S=dkStage(), ox=blast.ox, oy=blast.oy, clock=blast.clock, H=blast.hero;
  g.imageSmoothingEnabled=false;
  g.fillStyle="#000"; g.fillRect(0,0,s.width,s.height);
  const sig=`${S.kind}|${S.H}|${!!S.plats}|${[...(blast.locks||[])].join()}|${(blast.gaps||[]).map(x=>x.f+":"+x.x).join()}|${(blast.rivets||[]).filter(r=>r.pulled).length}`;
  if(!blast.girderCv || blast.girderSig!==sig){ blast.girderCv=dkPaint(); blast.girderSig=sig; }
  g.drawImage(blast.girderCv, ox, oy);
  const spr=(cv, x, y)=>g.drawImage(cv, Math.round(ox+x-cv.width/2), Math.round(oy+y-cv.height));
  // the girders' chords: each locked ladder's, at its foot; home at the top
  if(S.kind==="girders"){
    for(const L of S.ladders){ if(!dkLocked(L)) continue;
      const c=blast.floorChord[L.hi], y=dkSurf(L.lo, L.x)-30, bl=Math.floor(clock*2)%2 && H.f===L.lo, label=dkLabel(c), col=bl ? "#FFFFFF" : "#FFD35A";
      pxText(g, label, ox+L.x-4, oy+y, col);                              // the chord that opens it, and a padlock
      g.drawImage(pxSprite(`dklock|${col}`, DK_LOCK, {"#":col, "o":"#000"}), Math.round(ox+L.x-4+[...label].length*4+2), Math.round(oy+y)); }
    const hf=dkHomeF(S), hm=S.floors[hf], hx=(hm.x0+hm.x1)/2;
    spr(pxSprite("dkhome", DK_HOME, {R:"#FF5AA0", W:"#F1E8D2", Y:"#FFD35A", D:"#7A4A2A"}), hx-12, hm.yL);
    pxText(g, "HOME", ox+hx+12, oy+hm.yL-20, "#FF5AA0"); pxText(g, dkLabel(blast.floorChord[hf]), ox+hx+12, oy+hm.yL-11, "#F1E8D2");
    // the drum, flaring when a barrel goes in
    const d=S.drum, dy=dkSurf(0, d.x);
    g.fillStyle="#2A5BD7"; g.fillRect(ox+d.x-8, oy+dy-14, 16, 14); g.fillStyle="#7FB0FF"; g.fillRect(ox+d.x-8, oy+dy-11, 16, 1); g.fillRect(ox+d.x-8, oy+dy-4, 16, 1);
    if(clock-(blast.flareAt||-9)<.6 || (dkLevel().fire && Math.floor(clock*6)%2)){ g.fillStyle="#FF9A3C"; for(let i=0;i<5;i++) g.fillRect(ox+d.x-6+i*3, oy+dy-16-((i*7+Math.floor(clock*12))%4), 2, 3); }
  }
  // the lifts: each shaft's cables top and bottom, the platforms, the knob's lift marked KNOB
  if(S.plats){
    for(const lift of S.lifts){ g.fillStyle="#9A93B5"; g.fillRect(ox+lift.x-10, oy+S.top-8, 1, S.bottom-S.top+8); g.fillRect(ox+lift.x+10, oy+S.top-8, 1, S.bottom-S.top+8);
      g.fillStyle="#E8323C"; g.fillRect(ox+lift.x-12, oy+S.top-10, 25, 3); g.fillRect(ox+lift.x-12, oy+S.bottom, 25, 3);
      if(lift.knob && dkKnobLift()) pxText(g, "KNOB", ox+lift.x, oy+S.top-22, "#7FE9FF"); }
    for(const f of S.plats){ const F=S.floors[f], y=Math.round(F.yL); g.fillStyle=F.knob ? "#7FE9FF" : "#E8323C"; g.fillRect(ox+F.x0, oy+y, F.x1-F.x0, 3); g.fillStyle="#16132A"; g.fillRect(ox+F.x0+2, oy+y+1, F.x1-F.x0-4, 1); }
    const hm=S.floors[dkHomeF(S)]; spr(pxSprite("dkhome", DK_HOME, {R:"#FF5AA0", W:"#F1E8D2", Y:"#FFD35A", D:"#7A4A2A"}), hm.x0+10, hm.yL);
    pxText(g, "HOME", ox+hm.x0-6, oy+hm.yL-20, "#FF5AA0");
  }
  // the rivets' chords, under their girders
  for(const r of blast.rivets||[]){ if(r.pulled) continue; const y=dkSurf(r.f, r.x);
    const near=H.f===r.f && Math.abs(H.x-r.x)<8; pxText(g, dkLabel(r.chord), ox+r.x, oy+y+9, near ? "#FFFFFF" : "#FFD35A"); }
  // the hammers, up in the air
  for(const h of blast.hammers||[]){ if(h.taken) continue; spr(pxSprite("dkhammer", DK_HAMMER, {T:"#C88850", W:"#F1E8D2"}), h.x, dkSurf(h.f,h.x)-16+Math.round(Math.sin(clock*4))); }
  // Kong
  const K=S.kong;
  if(K){
    let ky=dkSurf(K.f, K.x), kx=K.x;
    if(blast.kongDown){ const t=clock-blast.kongDown; ky=Math.min(DK_H, ky+Math.max(0,t-.6)**2*160); }
    const pose= S.kind==="rivets" ? (Math.floor(clock*3)%2 ? 2 : 0) : blast.kongPose||0;
    spr(dkKongSprite(pose), kx, ky);
    pxText(g, dkNumerals() ? "V7" : (blast.kongChord ? blast.kongChord.sym : "V7"), ox+kx, oy+ky-16, "#16132A", false);
  }
  // the barrels, rolling, each with its chord
  for(const b of blast.barrels){
    spr(pxSprite(`dkbarrel|${Math.floor(b.spin)%2}`, DK_BARREL[Math.floor(b.spin)%2], {O:"#5A2E0A", B:"#C87830"}), b.x, b.y);
    if(oy+b.y>=5) pxText(g, dkLabel(b.chord), ox+b.x, Math.max(1, oy+b.y-19), "#F1E8D2");     // kept in the view; above it, pointed to
  }
  for(const e of blast.fires){
    spr(pxSprite(`dkfire|${Math.floor(clock*6)%2}`, DK_FIRE[Math.floor(clock*6)%2], {R:"#FF3B30", Y:"#FFD35A", W:"#FFFFFF", K:"#16132A"}), e.x, e.y);
    if(oy+e.y>=5) pxText(g, e.chord.sym, ox+e.x, Math.max(1, oy+e.y-19), "#FF9A3C");
  }
  // the breaks: a burst of splinters, or of sparks
  blast.breaks=(blast.breaks||[]).filter(k=>clock-k.at<.5);
  for(const k of blast.breaks){ const t=clock-k.at; g.fillStyle=k.fire ? "#7FE9FF" : "#C87830";
    for(let i=0;i<8;i++){ const a=i*.785; g.fillRect(Math.round(ox+k.x+Math.cos(a)*t*40), Math.round(oy+k.y-5+Math.sin(a)*t*40), 2, 2); } }
  // the player
  const dying=blast.st==="dying";
  if(!(dying && clock-blast.diedAt>.3 && Math.floor(clock*8)%2)){
    const pose= H.state==="climb" ? "climb" : H.state==="air" ? "jump" : H.moving ? "walk" : "stand";
    const left = H.state==="climb" ? Math.floor(H.y/4)%2===0 : H.dir==="left";
    spr(dkHeroSprite(pose, left, Math.floor(clock*8)%2), H.x, H.y);
    if(clock<(blast.hammerUntil||0)){ const up=Math.floor(clock*6)%2, hx=H.x+(H.dir==="left" ? -9 : 9);
      g.drawImage(pxSprite("dkhammer", DK_HAMMER, {T:"#C88850", W:"#F1E8D2"}), Math.round(ox+hx-5), Math.round(oy+H.y-(up ? 24 : 12))); }
  }
  if(blast.phase==="play") pxKnobMark(g, blast.pfAt!=null ? ox+blast.pfAt : null, blast.view.h);
  if(blast.scrolls) dkOffscreen(g);
  if(blast.st==="ready") pxText(g, "READY!", blast.scrolls ? ox+H.x : ox+DK_W/2, blast.scrolls ? oy+H.y-34 : oy+DK_H/2-30, "#FFE600");
}
// Scrolling, the barrels and fires out of view pointed to at the edge, with their chords
function dkOffscreen(g){
  pxOffscreen(g, blast.view, blast.ox, blast.oy, [
    ...blast.barrels.map(b=>({x:b.x, y:b.y, col:"#C87830", label:dkLabel(b.chord), ink:"#F1E8D2"})),
    ...blast.fires.map(e=>({x:e.x, y:e.y, col:"#FF3B30", label:e.chord.sym, ink:"#FF9A3C"}))]);
}
function dkPop(e, text, colour){
  if(!blast.field || blast.phase!=="play" || !blast.k) return;
  popup(blast.scrLeft+(blast.ox+e.x)*blast.k, blast.scrTop+(blast.oy+e.y-24)*blast.k, text, colour);
}

// ---------- the demo ----------
// It plays itself on the real girders: the harp's d-pad, a barrel jumped, a barrel resolved (G7, then
// C), a deceptive one, a locked ladder opened by the floor above's chord, home.
function dkDemo(){
  if(!blast || blast.kind!=="kong") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endDkDemo);
  blast.phase="demo"; blast.level=0; blast.stageN=0; blast.clock=0; blast.layoutKey=null;
  dkNewStage(); dkPlace(); blast.st="go"; blast.throwAt=1e9; blast.demoWays=[];
  const zones=(...zs)=>{ if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.toggle("demo-on", zs.includes(c.dataset.zone))); };
  const H=blast.hero, S=dkStage(), K=S.kong;
  const barrel=(id, x, f)=>{ const chord=dkBarrel(blast.key, id); const b={x, y:dkSurf(f,x), f, dir:dkDownhill(f), state:"roll", chord, spin:0, tried:new Set(S.ladders)}; blast.barrels.push(b); return b; };
  const chordOf=(pc, q)=>FORM[q].map(f=>48+pc+f[1]);
  sfx("attract");
  (async()=>{
    try{
      say("DOMINANT KONG","KONG IS THE DOMINANT. EVERYTHING HE THROWS IS TENSION: A DOMINANT SEVENTH. HOME, THE TONIC, IS AT THE TOP."); blast.kongPose=2; await step(4200); blast.kongPose=0;
      say("WALK ON THE HARP","HOLD THE WAY: THE TOP THREE UP A LADDER, TWO LEFT, TWO RIGHT, THE BOTTOM THREE DOWN. A JUMPS.");
      blast.demoWays=["right"]; zones("right"); await step(1600); blast.demoWays=[]; zones(); await step(400);
      say("JUMP IT","A BARREL ROLLING AT YOU: JUMP IT FOR POINTS.");
      const b1=barrel("V7", H.x+70, 0); b1.dir=-1;
      for(let k=0;k<60 && b1.x-H.x>22;k++) await step(50);
      zones("A"); dkJump(); await step(900); zones(); b1.gone=true; await step(800);
      say("OR RESOLVE IT",`IT'S ${b1.chord.sym}: PLAY WHERE IT RESOLVES, ${SHARP_NAMES[b1.chord.to]}, AND IT BREAKS.`);
      const b2=barrel("V7", H.x+80, 0); b2.dir=-1; await step(1800);
      demoPlay(chordOf(b2.chord.to, "")); dkPlay(chordOf(b2.chord.to, ""), {root:b2.chord.to, quality:""}); await step(1800);
      say("DECEPTIVE",`OR TO THE MINOR CHORD A STEP ABOVE ITS ROOT: ${b2.chord.sym} TO Am, DECEPTIVE, FOR MORE.`);
      const b3=barrel("V7", H.x+80, 0); b3.dir=-1; await step(1800);
      demoPlay(chordOf(b3.chord.deceptive, "m")); dkPlay(chordOf(b3.chord.deceptive, "m"), {root:b3.chord.deceptive, quality:"m"}); await step(2000);
      say("THE CHAIN HOME","A LOCKED LADDER OPENS WHEN YOU PLAY THE CHORD OF THE FLOOR ABOVE. UNDER HOME, G7; UNDER THAT, D7: A CHAIN OF FIFTHS.");
      blast.locks=new Set([K.f-1, K.f]); blast.girderCv=null; await step(4600);
      say("RIVETS","EVERY OTHER STAGE, THE RIVETS: EACH IS A CHORD OF THE KEY. STAND ON ONE AND PLAY IT TO PULL IT. PULL THEM ALL, AND KONG COMES DOWN."); await step(4600);
      say("READY?",`CHOOSE A LEVEL. ${playOnScreen() ? "WALK WITH THE ARROWS UNDER THE GAME, A TO JUMP" : pfKnob("kong") ? "TURN THE KNOB TO WHERE YOU WANT TO STAND; TOUCH THE HARP TO JUMP" : "WALK ON THE HARP OR THE ARROW KEYS, A TO JUMP"}.`); sfx("level"); await step(2800);
      endDkDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endDkDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoWays=null;
  blast.hero=null; blast.barrels=[]; blast.fires=[]; blast.stage=null; blast.key=null; blast.layoutKey=null; blast.st="idle"; blast.rivets=null; blast.hammers=[];
  if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.remove("demo-on"));
  helpChord(null); dkBar();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  cabRestart();
}
