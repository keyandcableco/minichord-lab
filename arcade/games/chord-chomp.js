// Chord Chomp: eat the dots, catch the ghosts by their chords. With its demo.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Chomp ----------
// The old maze game, played on both halves of the minichord. The right hand steers on the harp, read
// as a d-pad as Chord Snake reads it, or on a knob turned as a dial; the left hand holds chords.
// Eating the dots is as it always was, with nothing to get right or wrong, but a chord held on the
// buttons makes them sing: each dot plays the chord's next note, up through two octaves and back down,
// so a run down a corridor is an arpeggio, and a corner taken with a new chord held changes the
// harmony. With nothing held they go waka-waka, as they always did.
//
// A chord latches (the default): pressed, it stays on after the buttons are let go, until another is
// pressed, or the same one again to let it go, so a thumb on a phone needn't hold it while the other
// steers. HOLD, chosen on the title screen, counts a chord only while it's held, for a quarter more.
// A chord actually held counts either way.
//
// The four ghosts each wear a chord of the maze's key, as a numeral (I, IV, V and vi at first). A
// power pellet doesn't turn them all blue: only the ghost whose chord is held turns blue and runs,
// and can be caught. The other three keep chasing. Let go of the chord, or change it, and that ghost
// is dangerous again. Ghosts caught in a cadence's order score a bonus: V then I a perfect cadence,
// IV (or ii), V then I a full one, IV then I plagal, V then vi deceptive, anything then V a half.
//
// The fruit is a key. Twice a maze a key signature turns up below the ghosts' house for a while:
// set the minichord to that key with the key change combo before it goes and the maze changes key.
// Its colour changes, and the ghosts' numerals now name that key's chords, which are plain buttons
// with the minichord in the key. Keys further round the circle of fifths score more. On firmware
// without the combo, the new key's home chord takes it, and the game sets the key itself.
//
// Capsules turn up in the maze now and then, taken by running through them: FERMATA (the ghosts hold
// still), REST (the dots go silent and the ghosts lose track of you) and DA CAPO (a life).
// Each maze cleared is a level: the next one deals the ghosts other chords and runs a little faster.
//
// And once a game, not mentioned on the title screen: a key taken leaves a little minichord in the
// tunnel for a few seconds. Eat it and it's a jam session: everything stops, the ghosts dance, and
// their four chords are put in a progression's order (I – vi – IV – V, say). Play it on the buttons,
// a chord at a time against the clock: each one catches its ghost, and all four the biggest bonus.

// ---------- the maze ----------
// # wall, . dot, o power pellet, - the ghosts' door, G inside their house, a space an empty path.
// The row through the ghosts' house runs off both sides, a tunnel to the other. This is the maze on a
// desktop's field, or a phone held sideways: a little taller than it's wide.
const CC_BASE=[
  "###########################",
  "#o...........#...........o#",
  "#.###.###.##.#.##.###.###.#",
  "#.###.###.##.#.##.###.###.#",
  "#.........................#",
  "#.###.#.###########.#.###.#",
  "#.###.#.###########.#.###.#",
  "#.....#.............#.....#",
  "#####.####.#####.####.#####",
  "#####.#             #.#####",
  "#####.# ## ##-## ## #.#####",
  "     .  ## #GGG# ##  .     ",
  "#####.# ## ##### ## #.#####",
  "#####.#             #.#####",
  "#####.#.###.###.###.#.#####",
  "#.........................#",
  "#.###.###.##.#.##.###.###.#",
  "#.###.###.##.#.##.###.###.#",
  "#o.......................o#",
  "#####.##.#########.##.#####",
  "#.....##.....#.....##.....#",
  "#.######.###.#.###.######.#",
  "#.######.###.#.###.######.#",
  "#.........................#",
  "#.###.###.###.###.###.###.#",
  "#o.......................o#",
  "#.###.##.###.#.###.##.###.#",
  "#.........................#",
  "###########################",
];
// A phone held upright is twice as tall as it's wide, so there the maze is made taller to fill it, as
// the space falling chords have in Chord Invaders fills it: bands of rows put in above the ghosts' house
// (under the top's corridor) and below it (under the player's start), each band ending in a corridor
// right across, so any one goes against any other. Each is the same both sides and has no dead end.
const CC_BANDS=[
  ["#.####.#####.#.#####.####.#",
   "#......#####.#.#####......#",
   "#.####.#####.#.#####.####.#",
   "#.........................#"],
  ["#.#####.#.#######.#.#####.#",
   "#.#####.#.#######.#.#####.#",
   "#o.......................o#"],
  ["#.####.#.#########.#.####.#",
   "#.####.#.....#.....#.####.#",
   "#.####.#.###.#.###.#.####.#",
   "#.........................#"],
  ["#.###.###.###.###.###.###.#",
   "#.........................#"],
  ["#.###.#.###########.#.###.#",
   "#.###.#.###########.#.###.#",
   "#.....#.............#.....#",
   "###.#.####.#####.####.#.###",
   "#.........................#"],
  ["#.###.###.##.#.##.###.###.#",
   "#.###.###.##.#.##.###.###.#",
   "#.........................#"],
];
const CC_MOST=63;                                                         // rows, at the most
// n rows of bands, their order turned by s: never the same band twice running, and at most one with
// power pellets, not at the end beside the foot's, nor at the start under the top's
function ccBands(n, s, foot){
  const pel=b=>b.some(r=>r.includes("o"));
  const go=(n, prev, had, first)=>{
    if(!n) return [];
    for(let i=0;i<CC_BANDS.length;i++){
      const b=CC_BANDS[(s+i)%CC_BANDS.length], p=pel(b);
      if(b===prev || b.length>n || (p && (had || (foot ? b.length===n : first)))) continue;
      const rest=go(n-b.length, b, had||p, false);
      if(rest) return [b, ...rest];
    }
    return null;
  };
  return (go(n, null, false, true)||[]).flat();
}
// The maze, `rows` tall (or as near as bands make it), the bands dealt differently each maze (seed),
// and everything placed in it: where the player starts, the ghosts' house and door, the key's place.
const CC_COLS=CC_BASE[0].length;
let CC_MAZE, CC_ROWS, CC_TUNNEL, CC_START, CC_FRUIT, CC_OUT, CC_IN, CC_GHOSTS;
function ccBuild(rows, seed=0){
  let extra=Math.max(0, Math.min(CC_MOST, rows)-CC_BASE.length); if(extra===1) extra=0;
  let up=Math.floor(extra/2); if(up===1) up=0; else if(extra-up===1) up--;
  const top=ccBands(up, seed), foot=ccBands(extra-up, seed+3, true);
  CC_MAZE=[...CC_BASE.slice(0,5), ...top, ...CC_BASE.slice(5,24), ...foot, ...CC_BASE.slice(24)];
  CC_ROWS=CC_MAZE.length; CC_TUNNEL=CC_MAZE.findIndex(r=>r[0]===" ");
  const t=CC_TUNNEL-11;                                                   // rows put in above the house
  CC_START={x:13, y:23+t}; CC_FRUIT={x:13, y:13+t}; CC_OUT={x:13, y:9+t}; CC_IN={x:13, y:11+t};
  // the ghosts: where each starts, the corner it heads for when scattering, its colour
  CC_GHOSTS=[
    {at:{x:13,y:9+t},  corner:[25,-3], col:"#FF3B30"},
    {at:{x:12,y:11+t}, corner:[1,-3],  col:"#FFB8FF"},
    {at:{x:13,y:11+t}, corner:[26,CC_ROWS+2], col:"#00E5FF"},
    {at:{x:14,y:11+t}, corner:[0,CC_ROWS+2],  col:"#FFB852"},
  ];
}
ccBuild(CC_BASE.length);
const CC_DIRS={up:[0,-1], left:[-1,0], down:[0,1], right:[1,0]};
const CC_OPP={up:"down", down:"up", left:"right", right:"left"};
const CC_ORDER=["up","left","down","right"];                       // the old game's tie-break
// scatter, chase, scatter, chase … in seconds of play, then chase for good
const CC_WAVES=[7,20,7,20,5,20,5];
const ccCell=(x,y)=> y<0 || y>=CC_ROWS ? "#" : CC_MAZE[y][mod(x,CC_COLS)];
// whether a ghost's door and house are open to it: on its way out, or its eyes on the way home
const ccHouseOpen=e=> e.ghost && (e.state==="leaving" || e.state==="eyes" || e.state==="house");
function ccOpen(e, d){
  const [dx,dy]=CC_DIRS[d], c=ccCell(e.x+dx, e.y+dy);
  return c!=="#" && ((c!=="-" && c!=="G") || ccHouseOpen(e));
}
// where something is, in tiles, between the tile it left and the next
function ccPos(e){ const [dx,dy]=e.dir && e.p ? CC_DIRS[e.dir] : [0,0]; return {x:e.x+dx*e.p, y:e.y+dy*e.p}; }
// moved on by n tiles: at each tile's centre choose(e) picks the way on, or null to stop there
function ccAdvance(e, n, choose){
  for(let guard=0; n>1e-9 && guard<8; guard++){
    if(e.p<=0){ const d=choose(e); if(!d){ e.stopped=true; return; } e.dir=d; e.stopped=false; }
    const step=Math.min(n, 1-e.p); e.p+=step; n-=step;
    if(e.p>=1-1e-9){ const [dx,dy]=CC_DIRS[e.dir]; e.x=mod(e.x+dx,CC_COLS); e.y+=dy; e.p=0; ccArrive(e); if(e.state==="house") return; }   // home: it waits there
  }
}
// turned straight round, mid-tile: heading back to the tile it left
function ccReverse(e){
  if(!e.dir) return;
  if(e.p>0){ const [dx,dy]=CC_DIRS[e.dir]; e.x=mod(e.x+dx,CC_COLS); e.y+=dy; e.p=1-e.p; }
  e.dir=CC_OPP[e.dir];
}

// ---------- keys and chords ----------
// a chord by its numeral: [letters up, semitones up, kind of chord, the kinds that count as it]
const CC_NUM={
  "I":[0,0,""], "ii":[1,2,"m"], "iii":[2,4,"m"], "IV":[3,5,""], "V":[4,7,""], "vi":[5,9,"m"],
  "Imaj7":[0,0,"maj7"], "ii7":[1,2,"m7"], "iii7":[2,4,"m7"], "IVmaj7":[3,5,"maj7"], "V7":[4,7,"7"], "vi7":[5,9,"m7"],
  // the secondary dominants: a seventh chord, though its plain triad does too, except V/IV's, which would be I
  "V/V":[1,2,"7",["7",""]], "V/vi":[2,4,"7",["7",""]], "V/ii":[5,9,"7",["7",""]], "V/IV":[0,0,"7",["7"]],
  // borrowed from the parallel minor
  "iv":[3,5,"m"], "♭VI":[5,8,""], "♭VII":[6,10,""], "♭III":[2,3,""],
};
// The levels: which numerals the ghosts wear (four of them; "fixed" always, two of "more"), whether
// their chords are named or left as numerals, and how far round the circle of fifths a key that
// turns up can be.
const CC_LEVELS=[
  {n:"I, IV, V and vi, named", pool:["I","IV","V","vi"], names:true, far:1},
  {n:"I, IV, V and vi",        pool:["I","IV","V","vi"], far:1},
  {n:"Every chord of the key", fixed:["I","V"], more:["ii","iii","IV","vi"], far:2},
  {n:"Sevenths",               fixed:["Imaj7","V7"], more:["ii7","iii7","IVmaj7","vi7"], far:2},
  {n:"Secondary dominants",    fixed:["I","V"], more:["V/V","V/vi","V/ii","V/IV"], far:3},
  {n:"Borrowed chords",        fixed:["I","V"], more:["iv","♭VI","♭VII","♭III"], far:3},
];
const ccLevel=(i=blast.level)=> CC_LEVELS[Math.min(i, CC_LEVELS.length-1)];
const ccPlain=root=> !!root && !/^[CF]♭|^[EB]♯|[𝄪𝄫]|♭♭|♯♯/.test(root);
function ccKey(f){
  const name=KEY_BY_FIFTHS[f], k={f, name, label:`${name} MAJOR`};
  k.home={root:name, pc:pcOfName(name), q:""};
  return k;
}
// a chord of the key by its numeral, spelled; null if it can't be spelled plainly
function ccChord(key, num){
  const d=CC_NUM[num]; if(!d || !key.name) return null;
  const root=above(key.name, d[0], d[1]); if(!ccPlain(root) || !spellChord(root, d[2])) return null;
  return {num, root, q:d[2], qs:d[3]||[d[2]], sym:root+d[2], pc:pcOfName(root)};
}
const ccIs=(pitches, c)=> !!c && c.qs.some(q=>isChord(pitches, c.pc, q));
// the four numerals of a maze, dealt to the ghosts in a shuffled order
function ccDeal(L){ return shuffle(L.pool ? [...L.pool] : [...L.fixed, ...shuffle([...L.more]).slice(0,2)]); }
// the key change combo needs the test firmware; without it, a key that turns up is played for
const ccComboOk=()=> keyComboReady() && hasSetting(35);

// ---------- the game ----------
function genChomp(){
  return {kind:"chomp", prompt:"Chord Chomp", sub:"Eat the dots; a chord held makes them sing. After a power pellet, hold a ghost's chord to turn it blue and catch it.",
    answer:{type:"chomp", get name(){ const g=blast && blast.kind==="chomp" && ccNearest(); return g ? g.chord.sym : "a ghost's chord"; }},
    get hint(){ const k=blast && blast.kind==="chomp" && blast.key; return k && blast.ghosts ? `In ${k.label}: ${blast.ghosts.map(g=>`${g.num} is ${g.chord.sym}`).join(", ")}.` : "Hold a ghost's chord after a power pellet."; },
    context:0};
}
function startChomp(){
  blast={kind:"chomp", score:0, lives:3, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), clock:0, ghosts:[], dots:null, pac:null, st:"idle"};
  ccDevice();
  stats.streak=0; scoreboard(); buildSpecial();
  ccMenu();
  blast.raf=requestAnimationFrame(ccTick);
}
// the harp chromatic, so each section is a known note and the strip a d-pad; the key signature the
// maze's, so a chord of the key is a plain button; the knobs sending MIDI, to steer; and the key
// change combo listened for
function ccDevice(){
  if(!blast || blast.kind!=="chomp" || !canWrite()) return;
  arcadeSetup(()=>{ kmHarp(); if(hasSetting(35)) borrow(35, keyIndexOf(blast.key ? blast.key.f : 0)); if(knobsReady()) borrow(238,1); });
  if(blast.phase==="menu" && blast.overlay && blast.ccSig!==ccMenuSig()) menuRebuild(()=>ccMenu());   // its rules say how a key's taken
  ccKeyCheck();
  if(blast.phase==="play" && !pollT) poll(true);
}
function buildChompField(box){
  const field=document.createElement("div"); field.className="field arcade chomp"; field.setAttribute("aria-label","The maze");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  const jam=document.createElement("div"); jam.className="ccjam"; jam.hidden=true; field.appendChild(jam);
  box.append(field);
  if(blast && blast.kind==="chomp"){
    Object.assign(blast, {field, hud, heard:hd, jamEl:jam, fx:fxInit(field), strip:kmStrip(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // the maze's own screen, at the old game's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  ccBar(); setTimeout(helperSync);
}
function ccBar(){
  if(!blast || blast.kind!=="chomp" || !blast.hud) return;
  const k=blast.key ? ` · ${blast.key.label}` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${k}${ccPowerHud()}</span><span class="lives">${livesHtml()}</span>`;
}

// ---------- the title screen ----------
const ccMenuSig=()=> `${ccComboOk()}|${knobsReady()}|${steerKnob()}`;
const CCMENU_G={key:"chomp", title:"CHORD CHOMP",
  rules:()=>`<p>EAT THE DOTS. PLAY A CHORD ON THE BUTTONS AND THEY SING IT, A NOTE A DOT. ${ccLatch() ? "IT STAYS ON TILL YOU PLAY ANOTHER, OR THE SAME AGAIN TO LET IT GO. OR CHOOSE HOLD, FOR A QUARTER MORE: THEN A CHORD ONLY COUNTS WHILE IT'S HELD." : "A CHORD ONLY COUNTS WHILE IT'S HELD (A QUARTER MORE POINTS); CHOOSE LATCH TO HAVE IT STAY ON."}</p><p>THE GHOSTS WEAR CHORDS OF THE KEY. EAT A POWER PELLET, THEN PLAY A GHOST'S CHORD: THAT GHOST TURNS BLUE AND YOU CAN CATCH IT. THE OTHERS STILL CHASE YOU.</p><p>CATCH THEM IN A CADENCE'S ORDER FOR A BONUS: V THEN I, OR IV, V THEN I FOR THE BIGGEST.</p><p>WHEN A KEY TURNS UP, ${ccComboOk() ? "SET IT WITH THE KEY CHANGE COMBO" : "PLAY ITS HOME CHORD"} BEFORE IT GOES, AND THE MAZE CHANGES KEY. FARTHER KEYS SCORE MORE.</p><p>${playOnScreen() ? "STEER WITH THE ARROWS UNDER THE GAME." : knobsReady() ? `STEER ON THE HARP, THE ARROW KEYS, OR THE ${KNOB_NAMES[steerKnob()]} KNOB: IT POINTS THE WAY, UP IN THE MIDDLE, DOWN AT EITHER END. HOLD IT AT AN END AND IT KEEPS GOING ROUND.` : "STEER ON THE HARP OR THE ARROW KEYS."}</p>`,
  levels:CC_LEVELS, begin:i=>beginChomp(i), demo:()=>ccDemo(), modNote:"title"};
function ccMenu(over){ blast.ccSig=ccMenuSig(); arcadeMenu(CCMENU_G, over); }
function beginChomp(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:3, level, startLevel:level, maze:0, phase:"play", over:false, clock:0, demoAuto:false, demoHeld:null, powerTold:false, modFor:null, jamUsed:false, jam:null, latched:null,
    knobV:null, knobQ:null, knobOffset:0, knobDue:0, edgeAt:null});
  if(canWrite() && hasSetting(33)) ensure(33,0);                // no Barry Harris: the plain chords
  ccSetKey(ccKey(0));
  saved.chompStart=level; save();
  stats.streak=0; scoreboard();
  ccNewMaze(); ccPlace();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(ccTick);
  banner(`LEVEL ${level+1}`, `${ccLevel().n.toUpperCase()} · ${blast.key.label}`);
  sfx("start"); ccBar();
}
// the maze's key: the minichord set to it, the ghosts' chords spelled in it
function ccSetKey(key){
  blast.key=key; blast.mazeCv=null; blast.heldKey=null;
  for(const g of blast.ghosts) g.chord=ccChord(key, g.num);
  if(blast.phase==="play" && canWrite() && hasSetting(35)) borrow(35, keyIndexOf(key.f));   // borrowed even when the combo already set it, so it's what the game wants kept
}
// a fresh maze: as tall as the room it has, every dot back, the ghosts dealt their numerals, the keys
// that will turn up
function ccNewMaze(){
  ccBuild(ccRowsFor(), blast.maze||0); blast.layoutKey=null;
  blast.dots=CC_MAZE.map(r=>[...r].map(c=> c==="." ? 1 : c==="o" ? 2 : 0));
  blast.total=blast.left=blast.dots.flat().filter(Boolean).length;
  blast.fruitAt=[Math.floor(blast.total*.7), Math.floor(blast.total*.3)];   // dots left when a key turns up
  const nums=ccDeal(ccLevel());
  blast.ghosts=CC_GHOSTS.map((G,i)=>({i, ghost:true, num:nums[i], chord:ccChord(blast.key, nums[i]), col:G.col, corner:G.corner, x:0, y:0, p:0, dir:null}));
  blast.fruit=null; blast.mini=null; blast.caps=[]; blast.capNext=blast.clock+18; blast.powerUntil=0; blast.mazeCv=null; blast.heldKey=null;
}
// everyone where they start: after a lost life too
function ccPlace(){
  const P={x:CC_START.x, y:CC_START.y, p:0, dir:"left", stopped:false};
  blast.pac=P; blast.want="left"; blast.powerUntil=0; blast.fermataUntil=0; blast.restUntil=0; blast.modeClock=0; blast.wave=0;
  const pace=Math.sqrt(speedMul());
  blast.ghosts.forEach((g,i)=>{ Object.assign(g, {x:CC_GHOSTS[i].at.x, y:CC_GHOSTS[i].at.y, p:0, dir:i?null:"left", scared:false, inbound:false,
    state:i?"house":"out", releaseAt:blast.clock+[0,1.5,5,9][i]*pace}); });
  blast.st="ready"; blast.stUntil=blast.clock+(blast.phase==="play" ? 1.8 : .2);
}

// ---------- each frame ----------
function ccTick(now){
  if(!blast || blast.kind!=="chomp") return;
  const dt=Math.min(DT_MAX,(now-blast.last)/1000); blast.last=now;
  if((blast.phase==="play" || blast.phase==="demo") && blast.pac) ccStep(dt);
  if(blast.phase==="play") ccKnobTick(now);
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(ccTick);
}
// how fast, in tiles a second: slower at the relaxed speeds, a little faster each maze
const ccSpeed=()=> 5.6/Math.sqrt(speedMul())*(1+.04*Math.min(blast.maze||0,10))*(blast.demoAuto?.8:1);
function ccGhostSpeed(g){
  const s=ccSpeed();
  if(g.state==="eyes") return s*1.8;
  if(g.state!=="out") return s*.5;
  if(g.y===CC_TUNNEL && (g.x<6 || g.x>20)) return s*.5;                      // the tunnel slows them
  if(g.scared) return s*.55;
  return s*Math.min(.97, .86+.02*blast.level+.01*(blast.maze||0))*(blast.demoAuto?.6:1);
}
const ccPowerOn=()=> blast.clock<blast.powerUntil;
const ccPowerSecs=()=> Math.max(4, 9-.6*blast.level-.3*(blast.maze||0))*Math.sqrt(speedMul());
function ccStep(dt){
  blast.clock+=dt;
  ccHeldSync();
  if(blast.st==="ready"){ if(blast.clock>=blast.stUntil) blast.st="go"; return; }
  if(blast.st==="dying"){ if(blast.clock>=blast.stUntil) ccAfterDeath(); return; }
  if(blast.st==="clear"){ if(blast.clock>=blast.stUntil) ccNextMaze(); return; }
  if(blast.st==="jam"){ blast.powerUntil+=dt; blast.fermataUntil+=dt; blast.restUntil+=dt; ccJamTick(); return; }   // everything waits for the band
  if(blast.st==="pause"){ blast.powerUntil+=dt; blast.fermataUntil+=dt; if(blast.clock>=blast.stUntil) blast.st="go"; return; }   // a ghost caught: a moment to see its points
  if(blast.st!=="go") return;
  if(blast.demoAuto) ccAutopilot();
  ccAdvance(blast.pac, ccSpeed()*dt, ccPacChoose);
  ccPacTile();
  if(blast.st!=="go") return;                                          // the last dot: the maze is cleared
  // the waves of scatter and chase run on while there's no power; at each change the ghosts turn round
  if(!ccPowerOn()){ blast.modeClock+=dt; let t=0, w=0; for(;w<CC_WAVES.length;w++){ t+=CC_WAVES[w]; if(blast.modeClock<t) break; }
    if(w!==blast.wave){ blast.wave=w; blast.ghosts.forEach(g=>{ if(g.state==="out" && !g.scared) ccReverse(g); }); } }
  const power=ccPowerOn(), still=blast.clock<blast.fermataUntil;
  for(const g of blast.ghosts){
    if(g.state==="house"){ if(blast.clock>=g.releaseAt){ g.state="leaving"; g.dir=null; } else continue; }
    // only the ghost whose chord is held is blue, and only while the power lasts
    const want = power && g.state==="out" && blast.heldGhost===g;
    if(want && !g.scared){ g.scared=true; ccReverse(g); } else if(!want && g.scared) g.scared=false;
    if(still && g.state!=="eyes") continue;                              // FERMATA: they hold
    ccAdvance(g, ccGhostSpeed(g)*dt, ccGhostChoose);
  }
  ccCollide();
  ccTimers();
}
// held chords: the minichord's sounding voices (the demo holds its own)
function ccHeldSync(){
  const sounding=((typeof mc!=="undefined" && mc.voices) || []).map(x=>x.pitch);
  const v = blast.phase==="demo" ? (blast.demoHeld||[]) : sounding.length ? sounding : ccLatch() && blast.latched || [];
  const k=v.map(p=>Math.round(p)).join();
  if(k===blast.heldKey) return;
  blast.heldKey=k;
  if(k!==blast.arpKey){ blast.arpKey=k; blast.arp=0; }                  // a new chord starts its tune from the bottom
  blast.held = v.length ? {pitches:v, seq:ccArp(v)} : null;
  blast.heldGhost = blast.held ? blast.ghosts.find(g=>g.chord && g.state==="out" && ccIs(v, g.chord)) || null : null;
}
// LATCH (the default) or HOLD (a quarter more)
const ccLatch=()=> !saved.ccHold;
const ccSame=(a,b)=>{ const x=chordId(a), y=chordId(b); return !!x && !!y && x.root===y.root && x.quality===y.quality; };
// the dots' tune for a chord: its notes from the bottom, up two octaves and back down
function ccArp(pitches){
  const ps=[...new Set(pitches.map(p=>Math.round(p)))].sort((a,b)=>a-b), low=ps[0], base=60+mod(low,12);
  const one=[...new Set(ps.map(p=>base+mod(p-low,12)))].sort((a,b)=>a-b);
  const up=[...one, ...one.map(p=>p+12), base+24];
  return [...up, ...up.slice(1,-1).reverse()];
}
// the timers: the power, the key that's up, the capsules, and the modifier and the helper
function ccTimers(){
  const fr=blast.fruit;
  if(fr && blast.clock>=fr.until && blast.phase==="play"){ blast.fruit=null; sfx("gone"); ccPop(CC_FRUIT, `${fr.key.name}: GONE`, "#9A93B5"); }
  blast.caps=blast.caps.filter(c=>blast.clock<c.until);
  if(blast.mini && blast.clock>=blast.mini.until) blast.mini=null;
  if(blast.phase==="play" && blast.clock>=blast.capNext){ blast.capNext=blast.clock+20+Math.random()*12; ccCapSpawn(); }
  // the chord to play next: the nearest ghost's while the power lasts, a key's home on the old firmware
  const near = ccPowerOn() ? ccNearest() : null, home = fr && !ccComboOk() ? fr.key.home : null;
  const c = near ? near.chord : home;
  if(c){ arcadeMod(c.root); helpChord(c.root, c.q); } else helpChord(null);
  if(Math.floor(blast.clock*4)!==blast.hudTick && (ccPowerOn() || blast.clock<blast.fermataUntil || blast.clock<blast.restUntil || blast.powerShown)){
    blast.hudTick=Math.floor(blast.clock*4); blast.powerShown = ccPowerOn() || blast.clock<blast.fermataUntil || blast.clock<blast.restUntil; ccBar(); }
}
const ccNearest=()=>{ if(!blast.pac) return null; const P=ccPos(blast.pac); let best=null, bd=1e9;
  for(const g of blast.ghosts){ if(g.state!=="out" || !g.chord) continue; const G=ccPos(g), d=(P.x-G.x)**2+(P.y-G.y)**2; if(d<bd){ bd=d; best=g; } } return best; };

// ---------- the player ----------
function ccPacChoose(e){
  const w=blast.want;
  if(w && ccOpen(e,w)) return w;
  return e.dir && ccOpen(e,e.dir) ? e.dir : null;
}
// a dot, a pellet or a capsule where the player is
function ccPacTile(){
  const P=ccPos(blast.pac), tx=mod(Math.round(P.x),CC_COLS), ty=Math.round(P.y);
  const c=blast.caps.find(c=>c.x===tx && c.y===ty); if(c){ blast.caps=blast.caps.filter(x=>x!==c); ccPowerGet(c.k); }
  const mi=blast.mini; if(mi && mi.x===tx && mi.y===ty){ blast.mini=null; ccJamStart(); return; }
  const v=blast.dots[ty] && blast.dots[ty][tx]; if(!v) return;
  blast.dots[ty][tx]=0; blast.left--;
  if(blast.phase==="play"){ blast.score+=mulPts((v===2?50:10)*(blast.level+1)); }
  ccSing(v===2);
  if(v===2) ccPowerStart();
  if(blast.phase==="play" && blast.fruitAt.includes(blast.left)) ccFruitSpawn();
  if(blast.left<=0 && blast.phase==="play") ccClear();
  else ccBar();
}
// what a dot sounds: the held chord's next note, its whole chord for a pellet, or the old waka
function ccSing(pellet){
  if(blast.clock<blast.restUntil) return;                            // REST: silent
  const h=blast.held;
  if(!h){ blast.waka=(blast.waka||0)+1; sfx(pellet ? "pellet" : "waka", blast.waka); return; }
  if(pellet){ sfx("strum", h.seq.slice(0, Math.ceil(h.seq.length/2))); return; }
  const m=h.seq[blast.arp % h.seq.length]; blast.arp++; blast.sung=m;
  sfx("sing", m);
}
function ccPowerStart(){
  blast.powerUntil=blast.clock+ccPowerSecs(); blast.chain=0; blast.caught=[];
  blast.heldKey=null;                                                  // whatever's held counts at once
  if(blast.phase!=="play") return;
  sfx("power"); ccBar();
  if(!blast.powerTold){ blast.powerTold=true; banner("POWER!", `${ccLatch() ? "PLAY" : "HOLD"} A GHOST'S CHORD: IT TURNS BLUE, AND YOU CAN CATCH IT`); }
}

// ---------- the ghosts ----------
function ccGhostChoose(g){
  const all=CC_ORDER.filter(d=>ccOpen(g,d)), on=all.filter(d=>d!==CC_OPP[g.dir]), list=on.length ? on : all;
  if(!list.length) return null;
  if(g.scared) return rnd(list);
  const [tx,ty]=ccTarget(g);
  let best=list[0], bd=1e9;
  for(const d of list){ const [dx,dy]=CC_DIRS[d], x=g.x+dx, y=g.y+dy, dd=(x-tx)**2+(y-ty)**2; if(dd<bd){ bd=dd; best=d; } }
  return best;
}
// where each ghost is making for: the old game's four characters, chasing; their corners, scattering
// (and while the player rests, since they've lost track of them)
function ccTarget(g){
  if(g.state==="leaving") return [CC_OUT.x, CC_OUT.y];
  if(g.state==="eyes") return g.inbound ? [CC_IN.x, CC_IN.y] : [CC_OUT.x, CC_OUT.y];
  if(blast.clock<blast.restUntil || blast.wave%2===0) return g.corner;
  const P=blast.pac, [dx,dy]=CC_DIRS[P.dir||"left"];
  if(g.i===0) return [P.x, P.y];
  if(g.i===1) return [P.x+4*dx, P.y+4*dy];
  if(g.i===2){ const r=blast.ghosts[0], ax=P.x+2*dx, ay=P.y+2*dy; return [2*ax-r.x, 2*ay-r.y]; }
  return (P.x-g.x)**2+(P.y-g.y)**2>64 ? [P.x, P.y] : g.corner;
}
// at a tile's centre: out of the house, or the eyes home and in
function ccArrive(e){
  if(!e.ghost) return;
  if(e.state==="leaving" && e.x===CC_OUT.x && e.y===CC_OUT.y){ e.state="out"; e.dir="left"; blast.heldKey=null; }
  else if(e.state==="eyes" && !e.inbound && e.x===CC_OUT.x && e.y===CC_OUT.y){ e.inbound=true; e.dir=null; }
  else if(e.state==="eyes" && e.inbound && e.x===CC_IN.x && e.y===CC_IN.y){ e.state="house"; e.inbound=false; e.dir=null; e.releaseAt=blast.clock+.8; }
}
function ccCollide(){
  const P=ccPos(blast.pac);
  for(const g of blast.ghosts){
    if(g.state!=="out") continue;
    const G=ccPos(g); let dx=Math.abs(P.x-G.x); dx=Math.min(dx, CC_COLS-dx);
    if(dx>=.6 || Math.abs(P.y-G.y)>=.6) continue;
    if(g.scared){ ccCatch(g); return; }
    if(blast.phase==="play"){ ccDie(g); return; }
  }
}
// a blue ghost caught: its points, doubling through the power, and a cadence if the catches make one
const CC_FN={"I":["T"], "Imaj7":["T"], "V":["D"], "V7":["D"], "IV":["PD","S"], "IVmaj7":["PD","S"], "ii":["PD"], "ii7":["PD"], "iv":["PD","S"],
  "V/V":["PD"], "vi":["VI"], "vi7":["VI"], "♭VI":["VI"], "♭VII":["B"]};
const CC_CADENCES=[
  {seq:["PD","D","T"], name:"FULL CADENCE",      pts:1500},
  {seq:["D","T"],      name:"PERFECT CADENCE",   pts:500},
  {seq:["B","T"],      name:"BACKDOOR CADENCE",  pts:400},
  {seq:["S","T"],      name:"PLAGAL CADENCE",    pts:300},
  {seq:["D","VI"],     name:"DECEPTIVE CADENCE", pts:300},
  {seq:["*","D"],      name:"HALF CADENCE",      pts:200},
];
function ccCadence(list){
  for(const c of CC_CADENCES){
    const n=c.seq.length; if(list.length<n) continue; const tail=list.slice(-n);
    if(c.seq.every((f,i)=>f==="*" || (CC_FN[tail[i]]||[]).includes(f))) return {...c, path:tail.join(" → ")};
  }
  return null;
}
function ccCatch(g){
  g.scared=false; g.state="eyes"; g.inbound=false; blast.heldKey=null;
  const pts=mulPts(200*2**Math.min(3, blast.chain||0)*(blast.level+1));
  blast.chain=(blast.chain||0)+1; (blast.caught||(blast.caught=[])).push(g.num);
  if(blast.phase==="play") blast.score+=pts;
  ccPop(g, `+${pts}`, "#7FE9FF"); sfx("catch", g.chord.pc);
  heard(`${g.chord.sym} · ${g.num}`, true);
  blast.st="pause"; blast.stUntil=blast.clock+.6;
  const cad=ccCadence(blast.caught);
  if(cad){ const cp=mulPts(cad.pts*(blast.level+1)); if(blast.phase==="play") blast.score+=cp; banner(cad.name, `${cad.path} · +${cp}`); gameLater(()=>sfx("cadence", blast.key && blast.key.home.pc), 250); }
  ccBar();
}
function ccDie(g){
  if(blast.st!=="go") return;
  blast.st="dying"; blast.stUntil=blast.clock+1.7; blast.diedAt=blast.clock;
  sfx("die"); buzz(blast.field, true);
  heard(`${g.chord.sym} · ${g.num}`, false, ccPowerOn() ? `CAUGHT: ${ccLatch() ? "PLAY" : "HOLD"} ITS CHORD AND IT TURNS BLUE` : "CAUGHT");
}
function ccAfterDeath(){
  blast.lives--; ccBar();
  if(blast.lives<=0) return ccOver();
  banner(`${blast.lives} ${blast.lives===1?"LIFE":"LIVES"} LEFT`, "");
  blast.fruit=null; ccPlace();
}
function ccOver(){
  blast.phase="over"; blast.over=true; blast.st="idle"; poll(false);
  const best=Math.max(saved.best.chomp||0, blast.score); saved.best.chomp=best; save();
  helpChord(null); ccBar(); ccMenu(true);
}
// every dot eaten: the maze flashes, then the next, a level up
function ccClear(){
  blast.st="clear"; blast.stUntil=blast.clock+2.2; blast.fruit=null; blast.caps=[]; blast.powerUntil=0;
  sfx("clear"); ccBar();
}
function ccNextMaze(){
  blast.maze=(blast.maze||0)+1;
  blast.level++;                                                        // past the last level, its chords again, faster
  ccNewMaze(); ccPlace();
  banner(`LEVEL ${blast.level+1}`, `${ccLevel().n.toUpperCase()} · ${blast.key.label}`);
  sfx("level"); ccBar();
}

// ---------- the key that turns up ----------
// a key a step or more round the circle of fifths from the maze's, whose chords spell plainly; set
// with the key change combo (or its home chord played) before it goes, the maze changes key
function ccFruitSpawn(){
  if(blast.fruit) return;
  const L=ccLevel(), here=blast.key.f, opts=[];
  for(let f=-6; f<=6; f++){ const d=Math.abs(f-here); if(d<1 || d>L.far) continue;
    const k=ccKey(f); if(blast.ghosts.every(g=>ccChord(k, g.num))) opts.push(f); }
  if(!opts.length) return;
  const f=rnd(opts), key=ccKey(f), dist=Math.abs(f-here);
  blast.fruit={f, key, dist, until:blast.clock+16*Math.sqrt(speedMul()), pts:500+250*(dist-1)};
  sfx("fruit");
  banner(`KEY OF ${key.name}`, ccComboOk() ? "SET IT WITH THE KEY CHANGE COMBO BEFORE IT GOES" : `PLAY ${key.name}, ITS HOME CHORD, BEFORE IT GOES`);
}
function ccKeyTo(fr){
  const was=blast.key;
  blast.fruit=null; ccSetKey(fr.key);
  if(blast.phase==="play"){
    const pts=mulPts(fr.pts*(blast.level+1)); blast.score+=pts; ccPop(CC_FRUIT, `+${pts}`, "#FFD35A");
    const g=blast.ghosts.find(g=>/^V7?$/.test(g.num)) || blast.ghosts[0];
    banner(`→ ${fr.key.label}`, `${was.name} TO ${fr.key.name}: ${g.num} IS ${g.chord.sym} NOW`);
    if(!blast.jamUsed){ blast.jamUsed=true; blast.mini={...rnd([{x:2,y:CC_TUNNEL},{x:24,y:CC_TUNNEL}]), until:blast.clock+10*Math.sqrt(speedMul())}; gameLater(()=>sfx("mini"), 900); }
  }
  sfx("key", fr.key.home.pc); ccBar();
}
// the minichord's key, as it reports it: the key that's up taken, or any other put back
function ccKeyCheck(){
  if(!blast || blast.phase!=="play" || !blast.key || !hasSetting(35) || mc.params[35]==null || mc.presetLoaded) return;
  const f=devFifths(); if(f===blast.key.f) return;
  const fr=blast.fruit;
  if(fr && f===fr.f) return ccKeyTo(fr);
  heard(`KEY OF ${KEY_BY_FIFTHS[f]||mc.keyName||"?"}`, false, fr ? `THE KEY UP IS ${fr.key.name}` : "NO KEY HAS TURNED UP");
  sfx("wrong");
  borrow(35, keyIndexOf(blast.key.f));                                  // back to the maze's key
}

// ---------- power-ups ----------
// capsules in the maze, now and then, taken by running through them
//   FERMATA   for 5 seconds the ghosts hold still where they are (touching one still costs a life)
//   REST      for 7 seconds the dots are silent and the ghosts lose track of you, wandering to their corners
//   DA CAPO   a life back, or one more (powers.js: it's every game's)
const CC_POWERS={
  fermata:{name:"FERMATA", icon:"⏸", secs:5, say:"THE GHOSTS HOLD STILL", page:"FOR 5 SECONDS THE GHOSTS HOLD STILL WHERE THEY ARE. RUNNING INTO ONE STILL COSTS A LIFE."},
  rest:   {name:"REST",    icon:"💤", secs:7, say:"SILENCE: THE GHOSTS LOSE TRACK OF YOU", page:"FOR 7 SECONDS THE DOTS ARE SILENT AND THE GHOSTS LOSE TRACK OF YOU, WANDERING OFF TO THEIR CORNERS."},
  dacapo: DA_CAPO,
};
const ccPowerLook=k=>`<span class="cccap pu-${k}"><i class="puicon">${CC_POWERS[k].icon}</i></span>`;
function ccCapSpawn(){
  const P=blast.pac, spots=[];
  for(let y=0;y<CC_ROWS;y++) for(let x=0;x<CC_COLS;x++){ const c=CC_MAZE[y][x];
    if((c==="." || c===" ") && !(y===CC_TUNNEL && (x<5 || x>21)) && Math.abs(x-P.x)+Math.abs(y-P.y)>=8 && !(x===CC_FRUIT.x && y===CC_FRUIT.y)) spots.push({x,y}); }
  if(!spots.length) return;
  const at=rnd(spots); blast.caps.push({...at, k:powerPick(CC_POWERS), until:blast.clock+10});
}
function ccPowerGet(k){
  const P=CC_POWERS[k];
  if(P.instant){ if(blast.phase==="play"){ daCapo(); ccBar(); } return; }
  if(k==="fermata") blast.fermataUntil=blast.clock+P.secs;
  if(k==="rest") blast.restUntil=blast.clock+P.secs;
  if(blast.phase==="play"){ banner(P.name+"!", P.say); sfx("capsule"); }
  ccBar();
}
function ccPowerHud(){
  if(!blast.pac) return "";
  const out=[];
  if(ccLatch() && blast.latched) out.push(`♪ ${chordName(blast.latched, devFifths())}`);
  if(ccPowerOn()) out.push(`⚡ ${Math.ceil(blast.powerUntil-blast.clock)}`);
  if(blast.clock<blast.fermataUntil) out.push(`${CC_POWERS.fermata.icon} FERMATA`);
  if(blast.clock<blast.restUntil) out.push(`${CC_POWERS.rest.icon} REST`);
  return out.length ? " · "+out.join(" · ") : "";
}

// ---------- the minichord ----------
// A chord from the buttons. Holding one is what the game reads (the dots sing it, a ghost turns
// blue); this says what was heard, and on firmware without the key change combo, a key that's up is
// taken by its home chord.
function chompChord(voices){
  if(!blast || blast.kind!=="chomp") return;
  if(blast.phase==="demo" && blast.demo){ endCcDemo(blast.demo); return; }
  if(blast.phase!=="play") return;
  const pitches=voices.map(v=>v.pitch); if(!chordId(pitches)) return;
  const name=chordName(pitches, devFifths()), fr=blast.fruit;
  if(blast.st==="jam") return ccJamChord(pitches, name);
  if(fr && !ccComboOk() && isChord(pitches, fr.key.home.pc, "")){
    heard(name, true); if(canWrite() && hasSetting(35)) borrow(35, keyIndexOf(fr.f)); ccKeyTo(fr); return; }
  if(ccLatch()){
    if(blast.latched && ccSame(blast.latched, pitches)){ blast.latched=null; heard(name, true); ccBar(); return; }   // the same again: let go
    blast.latched=pitches; ccBar();
  }
  const g=blast.ghosts.find(g=>g.chord && g.state!=="eyes" && ccIs(pitches, g.chord));
  if(g) heard(`${name} · ${g.num}`, true); else heard(name, false, "NO GHOST WEARS IT");
}
// the harp, as a d-pad
function chompHarp(pc){
  if(!blast || blast.kind!=="chomp") return;
  kmFlash(blast.strip, pc);
  if(blast.phase==="demo" && blast.demo){ endCcDemo(blast.demo); return; }
  ccTurn(kmControl(pc));
}
// a way to go: taken at the next turning it's open, at once if it's straight back
function ccTurn(d){
  if(!blast || blast.kind!=="chomp" || blast.phase!=="play" || !CC_DIRS[d]) return;
  blast.want=d;
  const P=blast.pac; if(P && P.p>0 && P.dir===CC_OPP[d]) ccReverse(P);
}
// The knob steers too, as a dial: its whole turn is one lap, up in the middle, right a quarter of the
// way clockwise, left a quarter anticlockwise and down at either end, so it points roughly the way to
// go. A way is taken once the knob has rested on it a moment, so one swept past on the way to another
// (round through right, from up to down) isn't taken at a turning on the way; and the knob has to go
// a little past the line between two ways to change, so one resting on the line holds still. And it
// turns endlessly, as Fifths Defender's does: held against either end stop, the dial keeps stepping
// round that way, the whole mapping turning with it, so the knob never has to jump back.
const CC_KNOB=["up","right","down","left"];
const CC_EDGE=.025, CC_EDGE_WAIT=380, CC_EDGE_STEP=380, CC_SETTLE=70, CC_STICK=.12;   // how close to a stop counts, how long before it steps and how often; how long a way's rested on; how far past the line (in quarter turns)
function ccKnob(v){
  if(!blast || blast.kind!=="chomp" || blast.phase!=="play") return;
  blast.knobV=v;
  const a=(v-.5)*4+(blast.knobOffset||0);                                // in quarter turns from up
  if(blast.knobQ!=null && Math.abs(a-blast.knobQ)<.5+CC_STICK) return;
  blast.knobQ=Math.round(a); blast.knobDue=performance.now()+CC_SETTLE;
}
function ccKnobTick(now){
  const v=blast.knobV, end = v==null ? 0 : v<=CC_EDGE ? -1 : v>=1-CC_EDGE ? 1 : 0;
  if(!end) blast.edgeAt=null;
  else if(blast.edgeAt==null) blast.edgeAt=now+CC_EDGE_WAIT;
  else if(now>=blast.edgeAt){ blast.edgeAt=now+CC_EDGE_STEP; blast.knobOffset=(blast.knobOffset||0)+end; ccKnob(v); }
  if(blast.knobDue && now>=blast.knobDue){ blast.knobDue=0; ccTurn(CC_KNOB[mod(blast.knobQ,4)]); }
}
document.addEventListener("keydown", e=>{
  if(!q || q.kind!=="chomp" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const letters = !(typeof kbOn==="function" && kbOn());          // in keyboard play the letters are the instrument's
  const k=Object.assign({ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}, letters?{KeyW:"up",KeyS:"down",KeyA:"left",KeyD:"right"}:{})[e.code];
  if(k && blast && blast.phase==="play"){ e.preventDefault(); ccTurn(k); }
});

// ---------- drawing ----------
// An arcade screen of its own, at the old game's resolution: eight pixels a square, the maze 216 pixels
// wide, every sprite and letter drawn pixel by pixel with nothing smoothed, then shown exactly as big as
// fits, right across a phone held upright (pxFit's fill: on some phones a whole number of its own
// pixels a pixel would leave a fifth of its width empty). The arcade's own pixel font for the chords
// and READY!, its sharps and flats drawn to match.
// The maze is made as tall as the room it has at that size (ccRowsFor), so on a phone held upright it
// fills the screen top to bottom, as Chord Invaders does: a little taller over the screen's minichord,
// nearly twice as tall with a minichord plugged in and the game's screen alone. Each maze takes the
// room's shape as it starts; one already under way when the room changes (the minichord plugged in or
// pulled out, the phone turned) is kept, shown whole if it fits with squares big enough to play on, and
// where it doesn't, at the room's width (or the smallest size big enough) with the view following the
// player across it, as the old handheld versions scrolled theirs.
const CC_T=8, CC_SMALL=12;                                             // native pixels a square; CSS pixels a square, at the least
function ccRowsFor(){
  const {aw, ah}=pxRoom(), sq=Math.max(CC_SMALL, aw/CC_COLS);
  return Math.floor(ah/sq+1e-9);
}
function ccLayout(){
  const NW=CC_COLS*CC_T, NH=CC_ROWS*CC_T, f=pxFit(NW, NH, CC_SMALL/CC_T, false, true);   // the whole maze, unless that's too small (pixel.js)
  Object.assign(blast, {tile:CC_T, k:f.k, view:{x:0, y:0, w:f.w, h:f.h}, scrolls:NW>f.w || NH>f.h, cam:null, mazeCv:null, scrLeft:f.left, scrTop:f.top});
  pxPlace(blast.screen, f);
  ccCamera(0);
}
// where the maze sits on the screen: whole, or the player in the middle of the view as far as the
// maze's edges allow, eased there (and jumped, through the tunnel)
function ccCamera(dt){
  const t=blast.tile, v=blast.view, P=blast.pac ? ccPos(blast.pac) : {x:CC_START.x, y:CC_START.y};
  const axis=(v0, len, maze, focus, was)=>{
    if(maze<=len) return Math.floor(v0+(len-maze)/2);
    const want=v0+Math.max(len-maze, Math.min(0, len/2-focus));
    if(was==null || !dt || Math.abs(want-was)>len/2) return want;
    return was+(want-was)*Math.min(1, dt*7);
  };
  const c=blast.cam||{};
  c.x=axis(v.x, v.w, t*CC_COLS, (P.x+.5)*t, c.x); c.y=axis(v.y, v.h, t*CC_ROWS, (P.y+.5)*t, c.y);
  blast.cam=c; blast.ox=Math.round(c.x); blast.oy=Math.round(c.y);
}
const ccInView=(x,y,m=0)=>{ const v=blast.view; return !v || (x>=v.x-m && x<=v.x+v.w+m && y>=v.y-m*2 && y<=v.y+v.h+m); };

// ---------- sprites ----------
// the player: a disc 13 across, its mouth open by an angle, facing its way
function ccPacSprite(dir, open, col){
  const rot={right:0, down:Math.PI/2, left:Math.PI, up:-Math.PI/2}[dir||"left"], rows=[];
  for(let y=0;y<13;y++){ let r=""; for(let x=0;x<13;x++){ const dx=x-6, dy=y-6, d2=dx*dx+dy*dy;
    let a=Math.atan2(dy,dx)-rot; a=Math.atan2(Math.sin(a),Math.cos(a));
    r+= d2<=42 && !(open>0 && Math.abs(a)<open/2 && d2>0) ? "#" : "."; } rows.push(r); }
  return pxSprite(`pac|${dir}|${open.toFixed(2)}|${col}`, rows, {"#":col});
}
// a ghost, 14 square: its body and hem (two of them, for the wiggle), its eyes looking its way; or
// frightened, blue with a wobbly mouth; or only its eyes, going home
const CC_GHOST_BODY=[".....####.....","...########...","..##########..",".############.",".############.",".############.",
  "##############","##############","##############","##############","##############","##############"];
const CC_GHOST_HEM=[["##.###..###.##","#...##..##...#"], ["####.####.####",".##...##...##."]];
const CC_LOOK={left:[-1,0,0,2], right:[1,0,2,2], up:[0,-1,1,0], down:[0,1,1,3]};   // the whites' shift, then the pupils' place in them
function ccGhostSprite(col, frame, look, mode){
  return pxSprite(`gh|${col}|${frame}|${look}|${mode}`, (()=>{
    const rows=(mode==="eyes" ? Array(14).fill(".".repeat(14)) : [...CC_GHOST_BODY, ...CC_GHOST_HEM[frame]]).map(r=>[...r]);
    const put=(x,y,c)=>{ if(rows[y] && x>=0 && x<14) rows[y][x]=c; };
    if(mode==="scared" || mode==="ending"){
      for(const ex of [4,8]) for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]]) put(ex+a,5+b,"f");
      for(let x=2;x<=11;x++) put(x, 9+(Math.floor((x-2)/2)%2), "f");
    } else {
      const [dx,dy,px,py]=CC_LOOK[look]||CC_LOOK.left, white=[".##.","####","####","####",".##."];
      for(const bx of [2,8]){ white.forEach((r,y)=>[...r].forEach((c,x)=>{ if(c==="#") put(bx+dx+x, 3+dy+y, "w"); }));
        for(const [a,b] of [[0,0],[1,0],[0,1],[1,1]]) put(bx+dx+px+a, 3+dy+py+b, "p"); }
    }
    return rows.map(r=>r.join(""));
  })(), {"#": mode==="scared" ? "#2121FF" : mode==="ending" ? "#F1E8D2" : col, "f": mode==="ending" ? "#FF4B3E" : "#FFB8AE", "w":"#FFFFFF", "p":"#2121DE"});
}
const CC_PELLET=["..####..",".######.","########","########","########","########",".######.","..####.."];
// the capsules' icons, 7 square, and the little minichord, as the arcade draws it, smaller
const CC_ICONS={
  fermata:["..###..",".#...#.","#.....#","#..#..#",".......",".......","......."],
  rest:   ["#####..","...#...","..#....",".#.####","#####.#",".....#.","....###"],
  dacapo: [".##.##.","#######","#######","#######",".#####.","..###..","...#..."],
};
// The little minichord is the arcade's own pixel minichord (pixel-minichord.js, from
// pixel-minichord.txt), as the lobby's INSERT MINICHORD sign has it: 36 by 19, pixel for pixel, in its
// gold, dark and red. It fits the side tunnel's run exactly.
function ccMiniSprite(){
  let cv=PX_SPR.get("mini"); if(cv) return cv;
  const W=typeof PIXEL_MINICHORD_W!=="undefined" ? PIXEL_MINICHORD_W : 1, H=typeof PIXEL_MINICHORD_H!=="undefined" ? PIXEL_MINICHORD_H : 1;
  const rows=Array.from({length:H}, ()=>Array(W).fill("."));
  if(typeof PIXEL_MINICHORD_PATHS!=="undefined") for(const m of PIXEL_MINICHORD_PATHS.matchAll(/fill="([^"]+)" d="([^"]+)"/g))
    for(const p of m[2].matchAll(/M(\d+) (\d+)/g)) rows[+p[2]][+p[1]]=m[1];
  const pal={}; rows.flat().forEach(c=>{ if(c!==".") pal[c]=c; });          // each pixel's own colour
  return pxSprite("mini", rows.map(r=>r.map(c=>c==="." ? "." : c)), pal);
}

// ---------- the maze ----------
// The old game's walls: a line one pixel wide inset three pixels into each wall square along the sides
// that face a path, joined round the corners, so a corridor between two walls is fourteen pixels, room
// for the player's thirteen. In the key's colour (white, to flash a cleared maze).
const ccWall=f=>`hsl(${mod(235+f*30,360)},85%,${f%2?58:62}%)`;
function ccMazePaint(col){
  const T=CC_T, I=3, cv=document.createElement("canvas"); cv.width=CC_COLS*T; cv.height=CC_ROWS*T;
  const g=cv.getContext("2d"); if(!g || !g.fillRect) return cv;
  const wall=(x,y)=> x<0 || x>=CC_COLS ? y!==CC_TUNNEL : y<0 || y>=CC_ROWS ? true : "#-".includes(CC_MAZE[y][x]);
  const h=(x0,x1,y)=>g.fillRect(x0,y,x1-x0+1,1), v=(x,y0,y1)=>g.fillRect(x,y0,1,y1-y0+1);
  g.fillStyle=col;
  for(let y=0;y<CC_ROWS;y++) for(let x=0;x<CC_COLS;x++){
    if(CC_MAZE[y][x]!=="#") continue;
    const X=x*T, Y=y*T, W=(dx,dy)=>wall(x+dx,y+dy);
    const xs=X+(W(-1,0)?0:I), xe=X+T-1-(W(1,0)?0:I), ys=Y+(W(0,-1)?0:I), ye=Y+T-1-(W(0,1)?0:I);
    if(!W(0,-1)) h(xs, xe, Y+I);
    if(!W(0,1)) h(xs, xe, Y+T-1-I);
    if(!W(-1,0)) v(X+I, ys, ye);
    if(!W(1,0)) v(X+T-1-I, ys, ye);
    for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){                 // an inside corner, round a path's diagonal
      if(!W(dx,0) || !W(0,dy) || W(dx,dy)) continue;
      const cx= dx<0 ? X+I : X+T-1-I, cy= dy<0 ? Y+I : Y+T-1-I;
      v(cx, dy<0 ? Y : cy, dy<0 ? cy : Y+T-1); h(dx<0 ? X : cx, dx<0 ? cx : X+T-1, cy);
    }
  }
  g.fillStyle="#FFB8FF"; g.fillRect(CC_OUT.x*T, (CC_OUT.y+1)*T+I, T, 2);   // the ghosts' door
  return cv;
}

// ---------- each frame ----------
function ccDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  if(!blast.dots){ g.clearRect(0,0,s.width,s.height); return; }
  const lk=`${fieldW()}x${fieldH()}@${window.devicePixelRatio||1}|${CC_ROWS}|${kmStripShown()}|${!!saved.beginner}|${blast.phase==="demo"}|${saved.harpLayout||""}`;
  if(blast.layoutKey!==lk){ blast.layoutKey=lk; ccLayout(); }
  if(blast.scrolls){ ccCamera(Math.min(.1, (now-(blast.camAt||now))/1000)); blast.camAt=now; }
  const t=CC_T, ox=blast.ox, oy=blast.oy, clock=blast.clock;
  g.imageSmoothingEnabled=false;
  g.fillStyle="#000"; g.fillRect(0,0,s.width,s.height);
  // the maze, in the key's colour; cleared, flashing white as the old game's did
  const flash=blast.st==="clear" && Math.floor((clock-(blast.stUntil-2.2))*4)%2;
  const mcol=flash ? "#FFFFFF" : ccWall(blast.key ? blast.key.f : 0);
  if(!blast.mazeCv || blast.mazeCol!==mcol){ blast.mazeCv=ccMazePaint(mcol); blast.mazeCol=mcol; }
  g.drawImage(blast.mazeCv, ox, oy);
  // the dots, and the pellets blinking
  const blink=Math.floor(clock*3)%2===0 || blast.st!=="go", pel=pxSprite("pellet", CC_PELLET, {"#":"#FFB8AE"});
  g.fillStyle="#FFB8AE";
  for(let y=0;y<CC_ROWS;y++) for(let x=0;x<CC_COLS;x++){
    const v=blast.dots[y][x]; if(!v) continue;
    if(v===1) g.fillRect(ox+x*t+3, oy+y*t+3, 2, 2); else if(blink) g.drawImage(pel, ox+x*t, oy+y*t);
  }
  const at=e=>{ const p=ccPos(e); return {x:ox+(p.x+.5)*t, y:oy+(p.y+.5)*t}; };
  const spr=(cv, p, dy=0)=>g.drawImage(cv, Math.round(p.x-cv.width/2), Math.round(p.y-cv.height/2+dy));
  // nothing drawn outside the maze, so the tunnel swallows what goes through it
  g.save(); g.beginPath(); g.rect(ox, oy, CC_COLS*t, CC_ROWS*t); g.clip();
  // the capsules: a disc with its icon, blinking as it goes
  for(const c of blast.caps){ if(c.until-clock<2.5 && Math.floor(clock*6)%2) continue;
    const p={x:ox+(c.x+.5)*t, y:oy+(c.y+.5)*t};
    spr(ccPacSprite("right", 0, c.k==="dacapo" ? "#FF4B3E" : "#FF5AA0"), p);
    spr(pxSprite("icon|"+c.k, CC_ICONS[c.k], {"#":"#16132A"}), p); }
  // the little minichord, in the tunnel, bobbing
  const mi=blast.mini;
  if(mi && !(mi.until-clock<2.5 && Math.floor(clock*6)%2)) spr(ccMiniSprite(), {x:ox+(mi.x+.5)*t, y:oy+(mi.y+.5)*t}, Math.round(Math.sin(clock*5)));
  // the key that's up, below the ghosts' house: a sign with its name, and its sharps or flats over it
  const fr=blast.fruit;
  if(fr && !(fr.until-clock<3 && Math.floor(clock*5)%2)){
    const cx=ox+(CC_FRUIT.x+.5)*t, cy=oy+(CC_FRUIT.y+.5)*t, n=[...fr.key.name].length, w=n*8+6, x0=Math.round(cx-w/2), y0=Math.round(cy-6);
    g.fillStyle="#FFD35A"; g.fillRect(x0-1, y0-1, w+2, 14); g.fillStyle="#16132A"; g.fillRect(x0, y0, w, 12);
    pxText(g, fr.key.name, cx, y0+2, "#FFD35A", false);
    if(fr.f) pxText(g, `${Math.abs(fr.f)}${fr.f>0?"♯":"♭"}`, cx, y0-11, "#F1E8D2");
  }
  // the ghosts, then the player over them
  const dying=blast.st==="dying", wig=Math.floor(now/140)%2;
  if(!dying || clock-blast.diedAt<.5) for(const gh of blast.ghosts){
    let p=at(gh), dy=0;
    if(gh.state==="house" && blast.st==="go") dy=Math.round(Math.sin(now/180+gh.i)*1.5);             // bobbing at home
    if(blast.st==="jam" && gh.state!=="eyes"){ p={x:p.x+Math.round(Math.sin(now/150+gh.i*1.6)), y:p.y}; dy=-Math.round(Math.abs(Math.sin(now/150+gh.i*1.6))*2); }   // dancing
    const ending=gh.scared && blast.powerUntil-clock<2 && Math.floor(clock*6)%2;
    const mode = gh.state==="eyes" ? "eyes" : gh.scared ? (ending ? "ending" : "scared") : "normal";
    const col = clock<blast.fermataUntil ? "#8FA3C8" : gh.col;
    spr(ccGhostSprite(col, wig, gh.dir||"left", mode), p, dy);
  }
  ccPlayer(g, at(blast.pac), now, spr);
  g.restore();
  // the chords the ghosts wear, the pointers to the ones out of view, READY!
  if(!dying || clock-blast.diedAt<.5) for(const gh of blast.ghosts) ccGhostLabel(g, gh, at(gh));
  if(blast.scrolls) ccOffscreen(g, at);
  if(blast.st==="ready") pxText(g, "READY!", ox+(CC_FRUIT.x+.5)*t, oy+CC_FRUIT.y*t, "#FFE600");
}
// the player: its mouth opening and closing as it goes, three frames; caught, it turns up and opens
// all the way round till it's gone, as the old game's did
function ccPlayer(g, p, now, spr){
  const P=blast.pac;
  let dir=P.dir||"left", open = blast.st==="go" && !P.stopped ? [0,.8,1.6,.8][Math.floor(blast.clock*16)%4] : .8;
  if(blast.st==="dying"){ const k=Math.min(1, Math.max(0, (blast.clock-blast.diedAt-.5)/1)); if(k>=1) return; dir="up"; open=Math.round((.8+k*5.6)*4)/4; }
  const resting=blast.clock<blast.restUntil;
  spr(ccPacSprite(dir, open, resting ? (Math.floor(now/200)%2 ? "#7A6A20" : "#B39A2A") : "#FFE600"), p);
}
// the chord a ghost wears, once it's out: named or as a numeral, by the level, over its head. With the
// power on, the ones that could be caught glow; the one held is blue, its chord white
function ccGhostLabel(g, gh, p){
  if(!gh.chord || gh.state==="eyes" || (gh.state!=="out" && blast.st!=="jam")) return;   // at home, unlabelled (they'd sit on one another), but for the jam
  if(blast.scrolls && !ccInView(p.x, p.y, 4)) return;
  const L=ccLevel(), power=ccPowerOn();
  const col = gh.scared ? "#FFFFFF" : power && gh.state==="out" ? (Math.floor(blast.clock*4)%2 ? "#FFD35A" : "#FFF4C2") : "#F1E8D2";
  let top=p.y-7-10; const up=L.names ? 9 : 0;
  if(top-up<1) top=p.y+8+up;                                             // on the top row: under it, not off the screen
  if(L.names){ pxText(g, gh.chord.sym, p.x, top, col); pxText(g, gh.num, p.x, top-9, "#9A93B5"); }
  else pxText(g, gh.num, p.x, top, col);
  if(blast.clock<blast.fermataUntil) g.drawImage(pxSprite("icon|fermata|w", CC_ICONS.fermata, {"#":"#FFFFFF"}), Math.round(p.x-3), Math.round(p.y+8));
}
// Scrolling, the ghosts out of view: a pointer at the edge of the view in each one's colour (blue if
// it's the one held), level with it, and its chord, so a ghost to catch or to keep clear of is never
// out of mind.
const CC_POINT=["...#","..##",".###","####",".###","..##","...#"];
function ccOffscreen(g, at){
  const v=blast.view, L=ccLevel(), power=ccPowerOn();
  for(const gh of blast.ghosts){
    if(gh.state==="eyes" || (gh.state!=="out" && blast.st!=="jam")) continue;
    const p=at(gh); if(p.x>=v.x && p.x<=v.x+v.w) continue;
    const left=p.x<v.x, y=Math.round(Math.max(v.y+8, Math.min(v.y+v.h-8, p.y))), col=gh.scared ? "#2121FF" : gh.col;
    const arrow=pxSprite(`point|${left}|${col}`, left ? CC_POINT : CC_POINT.map(r=>[...r].reverse().join("")), {"#":col});
    const x=left ? v.x+1 : v.x+v.w-1-arrow.width; g.drawImage(arrow, x, y-3);
    const label=L.names ? gh.chord.sym : gh.num, lx= left ? x+arrow.width+2+[...label].length*4 : x-2-[...label].length*4;
    pxText(g, label, lx, y-4, gh.scared ? "#FFFFFF" : power ? "#FFD35A" : "#F1E8D2");
  }
}
// a popup over a place in the maze
function ccPop(e, text, colour){
  if(!blast.field || blast.phase!=="play" || !blast.k) return;
  const p=e.p!=null ? ccPos(e) : e;
  popup(blast.scrLeft+(blast.ox+(p.x+.5)*CC_T)*blast.k, blast.scrTop+(blast.oy+p.y*CC_T)*blast.k, text, colour);
}

// ---------- the jam session ----------
// The little minichord eaten: the maze stops, the ghosts dance, and their four chords are put in a
// progression's order, home first, then the chords that lead away, the predominants, the dominant
// last (I – vi – IV – V; Imaj7 – iii7 – ii7 – V7). Each played in turn catches its ghost; a wrong one
// costs a second and a half. All four before the time's up is the biggest bonus in the game.
const ccJamRank=num=>{ const f=CC_FN[num]||[]; return f.includes("T") ? 0 : /^(vi|vi7|iii|iii7|♭VI|♭III)$/.test(num) ? 1 : f.includes("D") ? 4 : f.includes("PD") ? 3 : 2; };
const ccJamSecs=()=> 11*Math.sqrt(speedMul());
function ccJamStart(){
  const seq=blast.ghosts.filter(g=>g.chord).sort((a,b)=>ccJamRank(a.num)-ccJamRank(b.num));
  if(seq.length<2) return;
  blast.jam={seq, i:0, until:blast.clock+ccJamSecs(), secs:ccJamSecs()};
  blast.st="jam"; blast.want=null;
  if(blast.phase==="play"){ blast.field && blast.field.querySelectorAll(".banner").forEach(b=>b.remove()); sfx("jam"); }   // the chart says it all
  ccJamDraw();
}
function ccJamTick(){
  const j=blast.jam; if(!j) return ccJamEnd();
  if(blast.clock>=j.until) return ccJamEnd();
  const c=j.seq[j.i].chord; arcadeMod(c.root); helpChord(c.root, c.q);
  const bar=blast.jamEl && blast.jamEl.querySelector(".ccjamtime i"); if(bar) bar.style.transform=`scaleX(${Math.max(0,(j.until-blast.clock)/j.secs).toFixed(3)})`;
}
function ccJamChord(pitches, name){
  const j=blast.jam; if(!j) return;
  const g=j.seq[j.i];
  if(!ccIs(pitches, g.chord)){ j.until-=1.5; heard(name, false, `NEXT IS ${g.num}`); sfx("wrong"); return; }
  heard(`${name} · ${g.num}`, true);
  if(g.state==="out"){ g.state="eyes"; g.inbound=false; g.scared=false; }
  const pts=mulPts(400*(blast.level+1)); if(blast.phase==="play") blast.score+=pts;
  ccPop(g, `+${pts}`, "#7FE9FF"); sfx("catch", g.chord.pc);
  j.i++; ccJamDraw(); ccBar();
  if(j.i>=j.seq.length){
    const bonus=mulPts(3000*(blast.level+1)); if(blast.phase==="play") blast.score+=bonus;
    banner("WHAT A JAM!", `${j.seq.map(g=>g.num).join(" – ")} · +${bonus}`); gameLater(()=>sfx("cadence", blast.key && blast.key.home.pc), 250);
    ccJamEnd(true);
  }
}
function ccJamEnd(all){
  const j=blast.jam; blast.jam=null;
  if(blast.jamEl){ blast.jamEl.hidden=true; blast.jamEl.innerHTML=""; }
  if(j && !all) banner("THAT'S THE SET", `${j.i} OF ${j.seq.length} PLAYED`);
  blast.heldKey=null; helpChord(null); ccBar();
  blast.st="pause"; blast.stUntil=blast.clock+1.2;                    // a moment before the chase is back on
}
// the band's chart: the four chords in order, the one to play lit, the ones played green, the time left
function ccJamDraw(){
  const j=blast.jam, el=blast.jamEl; if(!j || !el) return;
  const names=ccLevel().names;
  el.hidden=false;
  el.innerHTML=`<h4>JAM SESSION</h4><div class="ccjamchips">${j.seq.map((g,i)=>`<span class="${i<j.i?"done":i===j.i?"now":""}" style="--gc:${g.col}"><b>${g.num}</b>${names||i<j.i?`<i>${g.chord.sym}</i>`:""}</span>`).join("")}</div><div class="ccjamtime"><i></i></div>`;
}
// ---------- the demo ----------
// It plays itself on the real maze: the harp's d-pad toured, the dots singing C and then F, a power
// pellet and the V ghost turning blue for its chord and caught, a key turning up and taken, the
// capsules. The autopilot runs for the nearest dot, or for the ghost the demo is after.
function ccAutopilot(){
  if(blast.clock<(blast.autoAt||0)) return; blast.autoAt=blast.clock+.12;
  const P=blast.pac, [dx,dy]=P.p>0 ? CC_DIRS[P.dir] : [0,0], sx=mod(P.x+dx,CC_COLS), sy=P.y+dy;
  const goal = blast.demoTarget ? (x,y)=>{ const G=ccPos(blast.demoTarget); return x===mod(Math.round(G.x),CC_COLS) && y===Math.round(G.y); } : (x,y)=>blast.dots[y][x]>0;
  const seen=new Set([sx+","+sy]), Q=[[sx,sy,null]];
  while(Q.length){ const [x,y,first]=Q.shift();
    for(const d of CC_ORDER){ const [ex,ey]=CC_DIRS[d], nx=mod(x+ex,CC_COLS), ny=y+ey, k=nx+","+ny, c=ccCell(nx,ny);
      if(c==="#" || c==="-" || c==="G" || seen.has(k)) continue; seen.add(k);
      const f=first||d; if(goal(nx,ny)){ blast.want=f; if(P.p>0 && P.dir===CC_OPP[f]) ccReverse(P); return; } Q.push([nx,ny,f]); } }
}
function ccDemo(){
  if(!blast || blast.kind!=="chomp") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {token, say, step}=demoShell(endCcDemo);
  blast.phase="demo"; blast.level=0; blast.maze=0; blast.clock=0; blast.layoutKey=null;
  blast.key=ccKey(0); blast.ghosts=[];
  ccNewMaze();
  const nums=["V","IV","I","vi"]; blast.ghosts.forEach((g,i)=>{ g.num=nums[i]; g.chord=ccChord(blast.key, nums[i]); });
  ccPlace(); blast.capNext=1e9; blast.demoAuto=true; blast.demoHeld=null; blast.demoTarget=null;
  const zones=(...zs)=>{ if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.toggle("demo-on", zs.includes(c.dataset.zone))); };
  const hold=c=>{ const v=FORM[c.q].map(f=>48+c.pc+f[1]); blast.demoHeld=v; demoPlay(v); };
  sfx("attract");
  (async()=>{
    try{
      say("CHORD CHOMP","EAT THE DOTS. THE GHOSTS WEAR CHORDS OF THE KEY: THIS MAZE IS IN C MAJOR."); await step(3600);
      const pad=saved.harpLayout==="kmpad", grid=kmLayout().cols===3;
      say("STEER ON THE HARP", pad ? "THE KEYMASTER AS A D-PAD: 5 UP, 4 LEFT, 3 RIGHT, 2 DOWN." : grid ? "ITS FOUR ROWS OF THREE ARE A D-PAD: TOP UP, SIDES LEFT AND RIGHT, BOTTOM DOWN." : "THE TOP THREE GO UP, THE NEXT TWO LEFT, TWO RIGHT BELOW A AND B, THE BOTTOM THREE DOWN.");
      for(const z of ["up","left","right","down"]){ zones(z); sfx("press"); await step(900); } zones();
      if(knobsReady() && typeof helpKnob==="function"){
        say("OR TURN THE KNOB", `THE ${KNOB_NAMES[steerKnob()]} KNOB POINTS THE WAY: UP IN THE MIDDLE, RIGHT, DOWN AT EITHER END, LEFT. HOLD IT AT AN END AND IT KEEPS GOING ROUND.`);
        for(const v of [.5,.75,1,.25,.5]){ helpKnob(steerKnob(), v); await step(900); } }
      say("THE DOTS SING",`PLAY A CHORD AND EACH DOT YOU EAT PLAYS ITS NEXT NOTE. HERE, C.${ccLatch() ? " IT STAYS ON TILL YOU PLAY ANOTHER." : ""}`); hold(ccChord(blast.key,"I")); await step(4200);
      say("CHANGE THE CHORD",`F NOW, AND THE DOTS SING F. ${ccLatch() ? "PLAY F AGAIN TO LET IT GO" : "LET GO"}, AND THEY GO WAKA-WAKA.`); hold(ccChord(blast.key,"IV")); await step(4200);
      blast.demoHeld=null; helpChord(null);
      say("POWER PELLET","EAT ONE, THEN PLAY A GHOST'S CHORD. ONLY THAT GHOST TURNS BLUE: CATCH IT. THE OTHERS STILL CHASE YOU.");
      ccPowerStart(); blast.powerUntil=blast.clock+30;
      const v=blast.ghosts.find(g=>g.num==="V"); if(v.state!=="out"){ Object.assign(v,{state:"out", x:CC_OUT.x, y:CC_OUT.y, p:0, dir:"left"}); }
      await step(1400); hold(v.chord); blast.demoTarget=v;
      for(let k=0;k<30 && v.state==="out";k++) await step(200);
      if(v.state==="out" && v.scared) ccCatch(v);
      blast.demoTarget=null; blast.demoHeld=null; blast.powerUntil=0; await step(1600);
      say("CADENCES","CATCH THEM IN A CADENCE'S ORDER: V THEN I IS A PERFECT CADENCE. IV, V THEN I, A FULL ONE, SCORES MOST."); await step(4600);
      const fr={f:1, key:ccKey(1), dist:1, until:blast.clock+30, pts:500}; blast.fruit=fr; sfx("fruit");
      say("A KEY TURNS UP", ccComboOk() ? "SET IT WITH THE KEY CHANGE COMBO BEFORE IT GOES, AND THE MAZE CHANGES KEY." : "PLAY ITS HOME CHORD BEFORE IT GOES, AND THE MAZE CHANGES KEY."); await step(3800);
      ccKeyTo(fr);
      say("G MAJOR NOW","THE GHOSTS' NUMERALS NAME G'S CHORDS: V IS D NOW. KEYS FARTHER ROUND THE CIRCLE OF FIFTHS SCORE MORE."); await step(4400);
      say("CAPSULES",`${CC_POWERS.fermata.icon} FERMATA HOLDS THE GHOSTS STILL. ${CC_POWERS.rest.icon} REST HIDES YOU FROM THEM. ${DA_CAPO.icon} DA CAPO IS A LIFE. RUN THROUGH ONE TO TAKE IT.`); await step(4800);
      say("READY?",`CHOOSE A LEVEL. ${playOnScreen() ? "STEER WITH THE ARROWS UNDER THE GAME" : knobsReady() ? `STEER ON THE HARP, THE ARROW KEYS OR THE ${KNOB_NAMES[steerKnob()]} KNOB` : "STEER ON THE HARP OR THE ARROW KEYS"}.`); sfx("level"); await step(2800);
      endCcDemo(token);
    }catch(e){ /* skipped */ }
  })();
}
function endCcDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu"; blast.demoAuto=false; blast.demoHeld=null; blast.demoTarget=null;
  blast.dots=null; blast.pac=null; blast.ghosts=[]; blast.fruit=null; blast.mini=null; blast.jam=null; blast.caps=[]; blast.key=null; blast.layoutKey=null; blast.st="idle";
  if(blast.strip) [...blast.strip.children].forEach(c=>c.classList.remove("demo-on"));
  helpChord(null); ccBar();
  if(blast.overlay) blast.overlay.hidden=false;
  clearTimeout(blast.attract);
  cabRestart();
}
