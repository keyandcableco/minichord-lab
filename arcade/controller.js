// The harp as a game controller: the standard strip, the keymaster grid or the arcade wheel read as
// a d-pad, drawn as the plate fitted is; and the joystick plate (its stick, A, B and the click), the d-pad, the menus and pause.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the harp as a game controller ----------
// With the harp in chromatic mode each section plays one known note (string n, counted from the
// lowest, plays the nth note up from C), so a game can read the harp as a d-pad. Two layouts:
//
// The standard minichord's strip, twelve sections stacked with the high notes at the top: three
// for up, two left, A, B, two right, three down. The big zones at each end are easy to hit blind.
// The keymaster harp's four rows of three, a d-pad as it stands: the bottom row (strings 1-3)
// down, the top row (10-12) up, 4 and 7 left, 6 and 9 right, 5 is B and 8 is A.
//   standard, top to bottom      keymaster
//   12 11 10  ▲                  10 11 12   ▲ ▲ ▲
//    9  8     ◀                   7  8  9   ◀ A ▶
//    7        A                   4  5  6   ◀ B ▶
//    6        B                   1  2  3   ▼ ▼ ▼
//    5  4     ▶
//    3  2  1  ▼
// (side: the room a game leaves for it beside the field)
const KM_LAYOUTS={
  strip:{byString:["down","down","down","right","right","B","A","left","left","up","up","up"], drawOrder:[11,10,9,8,7,6,5,4,3,2,1,0], cols:1, side:84},
  // the keymaster's corners do nothing, so up, down, left and right are each clearly apart
  keymaster:{byString:[null,"down",null,"left","B","right","left","A","right",null,"up",null], drawOrder:[9,10,11,6,7,8,3,4,5,0,1,2], cols:3, side:150},
  // the keymaster as a d-pad by its contact numbers: 2 down, 3 right, 4 left, 5 up, and A and B on 10
  // and 9, a row clear of the directions; the rest do nothing
  kmpad:{byString:[null,"down","right","left","up",null,null,null,"B","A",null,null], drawOrder:[9,10,11,6,7,8,3,4,5,0,1,2], cols:3, side:150},
  // the arcade wheel: the standard strip's zones on a ring round a hub (whPlate), drawn as it is
  wheel:{byString:["down","down","down","right","right","B","A","left","left","up","up","up"], drawOrder:[11,10,9,8,7,6,5,4,3,2,1,0], cols:1, wheel:true, side:130},
  // the drum pads plate's two columns of six (dpPlate), top to bottom: ▲ ▲ / ◀ ▶ / ▼ ▼ / a row that
  // does nothing / A B / A B. By contact: T2 T3 up, T1 left, T4 right, T6 T5 down, T7 T10 nothing,
  // T8 T12 A, T9 T11 B (contact Tn is string 12-n)
  drumpads:{byString:["A","B",null,"B","A",null,"down","down","right","up","up","left"], drawOrder:[11,10,9,8,7,6,5,4,3,2,1,0], cols:2, pads:true, side:110},
};
// The plates by what the arcade makes of them (mc.plate, core/minichord.js). "arcade": a game
// controller, HARP set to it: drawn as it is (the keymaster, the wheel, the joystick), or, for the
// drum pads and the xy pad, played as the strip until they have layouts of their own. "strip": twelve
// zones in the stock strip's order (twin rows' zig-zag too), so its d-pad lands where it should: drawn
// as the strip, HARP set to it. "play": a plate for playing, not games (strings, ribbons, corners):
// played as the strip, and the title screen says so. The stock strip, and a plate the firmware doesn't
// name, leave HARP to the player, who may have any of them fitted on a firmware too old to say.
const PLATE_GAMES={keymaster:"arcade", wheel:"arcade", joystick:"arcade", drumpads:"arcade", xy:"arcade", piano:"strip", twinrows:"strip",
  framed:"play", zipper24:"play", fretlesswrap:"play", fretless:"play", pianoglide:"play", torus:"play", tesseract:"play", split:"play", splitxy:"play", celtic:"play"};
const PLATE_NAMES={keymaster:"THE KEYMASTER", wheel:"THE ARCADE WHEEL", piano:"THE PIANO PLATE", twinrows:"TWIN ROWS", framed:"FRAMED STRINGS", zipper24:"ZIPPER 24",
  fretlesswrap:"THE FRETLESS WRAP", fretless:"THE FRETLESS", pianoglide:"PIANO GLIDE", drumpads:"THE DRUM PADS", xy:"THE XY PAD", torus:"THE TORUS",
  tesseract:"THE TESSERACT", split:"THE SPLIT PLATE", splitxy:"THE SPLIT XY PLATE", celtic:"THE CELTIC PLAIT"};
/** the plate fitted, by name: "stock" with no minichord, or one played on the page */
const plateFitted=()=> typeof mc!=="undefined" && mc && !mc.virtual && mc.plate || "stock";
/** what the title screen says of a plate that isn't a game controller, or "" */
const plateNote=()=>{ const p=plateFitted(); return PLATE_GAMES[p]==="play" ? `${PLATE_NAMES[p]}: A PLATE FOR PLAYING, NOT GAMES. FIT THE STRIP, KEYMASTER OR WHEEL` : ""; };
// The harp layouts on offer, each [its name in HARP, its layout, what it is]: with a plate the
// minichord names, that plate's; otherwise all four, the player's choice.
const HARP_ALL=[["STRIP","strip","THE STANDARD HARP: TWELVE STRINGS IN A LINE"],["GRID","keymaster","THE KEYMASTER'S FOUR ROWS OF THREE"],["D-PAD","kmpad","THE KEYMASTER AS A D-PAD"],
  ["WHEEL","wheel","THE ARCADE WHEEL: ITS RING THE D-PAD, ITS HUB A AND B"],
  ["DRUM PADS","drumpads","THE DRUM PADS: THE TOP PAIR UP, LEFT AND RIGHT, A PAIR DOWN, A AND B AT THE FOOT"]];
function harpChoices(){
  const p=plateFitted(), g=PLATE_GAMES[p];
  if(p==="joystick") return [["JOYSTICK","strip","THE JOYSTICK PLATE: THE STICK IS THE D-PAD, A AND B ARE A AND B, THE CLICK PAUSES"]];
  if(p==="wheel") return [HARP_ALL[3]];
  if(p==="keymaster") return [HARP_ALL[1], HARP_ALL[2]];
  if(p==="drumpads") return [HARP_ALL[4]];
  if(p==="xy") return [["XY PAD","strip",`${PLATE_NAMES[p]}: PLAYED AS THE STANDARD STRIP FOR NOW`]];
  if(g==="strip") return [["STRIP","strip",`${PLATE_NAMES[p]}: ITS TWELVE ZONES PLAY AS THE STANDARD STRIP`]];
  if(g==="play") return [["STRIP","strip",plateNote()]];
  return HARP_ALL;
}
/** the layout the harp is read and drawn in: the player's choice, if the plate allows it */
const kmLayoutName=()=>{ const cs=harpChoices(); return (cs.find(c=>c[1]===saved.harpLayout) || cs[0])[1]; };
const kmLayout=()=> KM_LAYOUTS[kmLayoutName()];
const kmGrid=()=>kmLayout().cols===3;          // drawn on the keymaster's plate
const kmWheel=()=>!!kmLayout().wheel;          // drawn as the arcade wheel
/** a layout drawn as its own plate (the wheel, the drum pads): the function that draws it, or null */
const kmDrawn=()=>{ const L=kmLayout(); return L.wheel ? whPlate : L.pads ? dpPlate : null; };
// the d-pad in words, as the layout lays it out, for a game's demo to say
function kmWaysSaid(){
  switch(kmLayoutName()){
    case "kmpad": return "5 UP, 4 LEFT, 3 RIGHT, 2 DOWN";
    case "keymaster": return "THE TOP ROW UP, THE SIDES LEFT AND RIGHT, THE BOTTOM ROW DOWN";
    case "wheel": return "THE RING'S TOP UP, ITS SIDES LEFT AND RIGHT, ITS BOTTOM DOWN";
    case "drumpads": return "THE TOP PAIR UP, THE NEXT LEFT AND RIGHT, THE THIRD PAIR DOWN";
    default: return "THE TOP THREE UP, TWO LEFT, TWO RIGHT, THE BOTTOM THREE DOWN";
  }
}
const KM_GLYPH={up:"▲",left:"◀",A:"A",B:"B",right:"▶",down:"▼"};
// what a zone shows: its arrow or letter, or for a game whose A and B have a clear meaning, a picture
// of it (Chord Sweeper: A sweeps, a burst; B flags, a flag)
// a game whose A and B have a clear meaning shows them as pictures (Chord Sweeper's burst and flag,
// Chord Stack's rotate and slam); everything else shows the letter
const KM_PICTURES={sweeper:()=>typeof SW_GLYPH!=="undefined" && SW_GLYPH, stack:()=>typeof ST_GLYPH!=="undefined" && ST_GLYPH};
const kmGlyph=z=>{ if(z==null) return "";
  const pics=blast && KM_PICTURES[blast.kind] && KM_PICTURES[blast.kind]();
  return (pics && pics[z]) || KM_GLYPH[z]; };
// On the joystick plate the stick is the d-pad and the strip isn't, in the games that steer on one
// (a game that wants the strip says so, blast.jsStrip); the stick's own presses come through here too,
// as the layout's strings (jsAnswer), and those always count.
const kmControl=pc=> jsStripOff() ? null : kmLayout().byString[mod(pc,12)];

// ---------- the harp held ----------
// A walk goes on for as long as its way is held, so a game that walks reads the strings held, not
// only those plucked. A string is held from its "harp" to its "harpoff": the minichord's note-off as
// the finger lifts (harpInOrder makes sure it comes then), and the screen's d-pad and the keyboard's
// number row send the same. Kept by pitch class, as the layouts read them; a zone is held while any
// of its strings is.
const kmHeldAt=new Map();     // pitch class → when it was touched
mc.addEventListener("harp", e=>kmHeldAt.set(mod(e.detail.note,12), performance.now()));
mc.addEventListener("harpoff", e=>kmHeldAt.delete(mod(e.detail.note,12)));
// a page that loses the focus never hears its keys let go
window.addEventListener("blur", ()=>kmHeldAt.clear());
/** the zones held now, the one touched last first: the harp's, or the joystick plate's stick and A and B */
function kmHeld(){
  const at={}, js=jsOn();
  if(!js) for(const [pc,t] of kmHeldAt){ const z=kmControl(pc); if(z && !(at[z]>=t)) at[z]=t; }
  else for(const [z,t] of jsHeldAt) if(!(at[z]>=t)) at[z]=t;
  return Object.keys(at).sort((a,b)=>at[b]-at[a]);
}
/** the way the d-pad is held: of the arrows held, the one touched last; null with none */
const kmHeldWay=()=> kmHeld().find(z=>z==="up" || z==="down" || z==="left" || z==="right") ?? null;

// The keymaster harp as it looks: a leaning black plate with its twelve white notes in four rising
// rows of three, strings 1 to 3 the lowest row, 10 to 12 the top. Positions are percentages of the
// plate, measured from a photograph of it.
const KM_PLATE_DOTS=[[19,87.5],[50,78.5],[81,68],[19,67],[50,57.5],[81,47.5],[19,46.5],[50,36.5],[81,27],[19,26],[50,16.5],[81,8.5]].map(([x,y])=>[x,y+1.5]);   // three even columns, centred on the plate
const KM_PLATE_SHAPE="1.5,23.6 72.9,0.3 98.5,5 98.5,76.4 26.3,99.3 1.5,96.3";
/** fill el with the plate; label(stringIndex) gives each note's text. Returns the notes by string. */
function kmPlate(el, label){
  el.classList.add("kmplate");
  el.innerHTML=`<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="${KM_PLATE_SHAPE}" fill="#0C0B0F" stroke="#4A443C" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  const dots=[];
  KM_PLATE_DOTS.forEach(([x,y],sI)=>{ const d=document.createElement("span"); d.className="kdot"; d.dataset.pc=sI; d.style.left=x+"%"; d.style.top=y+"%"; d.innerHTML=label(sI); el.appendChild(d); dots[sI]=d; });
  return dots;
}
// played on a touch screen the deck under the game is the controller (practice/touch.js), so the one
// beside the field isn't shown, and the games that leave room for it needn't; and the rules speak of
// what's on the screen, not the keys and the mouse
// A minichord plugged into a phone (touch.js tdBareUp) has the game's screen alone: the strip's room is
// the game's on so small a screen (touch.css hides it), though beginner mode and the demos keep the room
// they leave for the game's own minichord, which lights what to press.
const playOnScreen=()=> typeof tdOn==="function" && tdOn();
const kmStripShown=()=> !playOnScreen() && !(document.querySelector(".fscab.bare") && !saved.beginner && !(blast && blast.phase==="demo"));
/** the controller drawn beside the field, as the harp is laid out, lit as it's touched */
function kmStrip(field){
  const L=kmLayout(), el=document.createElement("div"); el.setAttribute("aria-label","The harp as a controller");
  if(jsOn()){ el.className="kmstrip jspic"; el.setAttribute("aria-label","The joystick plate as a controller"); jsPlate(el); }
  else if(kmDrawn()){ el.className="kmstrip"; el.setAttribute("aria-label", L.wheel ? "The arcade wheel as a controller" : "The drum pads as a controller"); whZones(kmDrawn()(el, sI=>kmGlyph(L.byString[sI])), L); }
  else if(L.cols===3){   // the keymaster: its own plate, each note marked with what it does
    el.className="kmstrip plate";
    kmPlate(el, sI=>kmGlyph(L.byString[sI])+`<i class="kmn">${sI+1}</i>`).forEach((d,sI)=>{ const z=L.byString[sI]; d.classList.add("km",`km-${z}`); d.dataset.zone=z; });
  } else {
    el.className="kmstrip line";
    L.drawOrder.forEach(pc=>{ const z=L.byString[pc], c=document.createElement("span"); c.className=`km km-${z}`; c.dataset.zone=z; c.dataset.pc=pc; c.innerHTML=kmGlyph(z); el.appendChild(c); });
  }
  field.appendChild(el); return el;
}
// the harp layout changed: draw the controller beside the field again, and the minichord's with it
function kmRestrip(){
  if(!blast || !blast.field) return;
  (blast.stripOrig||blast.strip)?.remove(); blast.stripOrig=null;
  blast.strip=kmStrip(blast.field);
  if(blast.kind==="snake"){ snLayout(); snDraw(); }
  if(blast.kind==="sweeper"){ swLayout(); swDraw(); }
  if(blast.kind==="chomp" || blast.kind==="burger" || blast.kind==="kong" || blast.kind==="bros") blast.layoutKey=null;
  helperSync(true);
}
function kmFlash(strip, pc){ if(!strip) return;
  // the joystick plate drawn: a press of the stick or A or B lights that, a strip note its key
  const c= strip.classList.contains("jspic") && jsEdging ? strip.querySelector(`[data-zone="${kmLayout().byString[mod(pc,12)]}"]`) : strip.querySelector(`[data-pc="${mod(pc,12)}"]`);
  if(!c) return; c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit"); }
// set the harp up as a controller: chromatic, first rank, untransposed, and as loud as the player chose
// A preset's harp shuffling (address 40) swaps strings round, so the section you touch plays another
// string's note: every game that reads the harp turns it off while it plays, and gives it back after.
// And from firmware 22 a string can sound as the finger lifts (pluck on lift, 216), its note can last
// until the sound dies rather than the finger (215), and a few pads down at once can be a palm that
// silences them (213): a game wants each string as it's touched, held until it's let go, every one.
const HARP_AT_TOUCH={40:0, 216:0, 215:1, 213:0};
const harpInOrder=()=>{ for(const [a,v] of Object.entries(HARP_AT_TOUCH)) if(hasSetting(+a)) ensure(+a,v); };
function kmHarp(){
  if(!canWrite()) return;
  harpInOrder();
  if(hasSetting(116)) borrow(116,1);
  borrow(98,1); if(hasSetting(36)) borrow(36, mc.params[36] ?? 0);   // harp mode written last: the strings retune
  if(hasSetting(30)) ensure(30,0);
  const vol=[null,30,0][saved.harpSound??1]; if(vol!=null && hasSetting(97) && !jsOn()) borrow(97,vol);   // (the joystick plate's strip isn't the controller: left as it is)
}

// ---------- the joystick plate ----------
// Greg's joystick piano (harp plate 4, firmware 90 on): a thumbstick that clicks when pressed in, two
// buttons, A and B, and a strip of twelve places drawn as an octave of piano keys, C at the bottom.
// The minichord sends the stick and buttons as CCs (core/minichord.js: mc.stick, mc.buttons, the
// "stick" and "button" events) once "knobs send MIDI" is on, which every game asks for on this plate
// (jsPreset). Here they become the arcade's controller:
//   the d-pad      the stick pushed four ways is the harp's d-pad pressed (answerNote with the layout's
//                  string for that way, exactly what a pluck there does), and A and B the harp's A and B:
//                  in the games that steer on the harp's d-pad, initials, title screens and menus. A game
//                  that reads the stick itself says so (blast.jsOwn) and gets none of this.
//   held           kmHeld() includes the ways the stick is held (eight, vertical first) and A and B, for
//                  the games that walk while a way is held
//   analog         jsXY(), jsWay4(), jsWays8() and jsAngle() for a game to read the stick as it likes
//   the click      PAUSE, in every game (jsPause), but in the drum games, where it's the hi-hat
// The strip plays notes (it's a harp), and in the d-pad games it's ignored as a d-pad (kmControl).
const jsOn=()=> typeof mc!=="undefined" && !!mc && !mc.virtual && mc.plate==="joystick";
// The Lab's own dead zone, on top of the firmware's 8%: where the stick rests isn't bench-checked yet,
// and may sit a few counts off the middle. Past it the travel is rescaled to run 0 to 1.
const JS_DEAD=.15;
const jsAxis=v=>{ const a=Math.abs(v||0); return a<=JS_DEAD ? 0 : Math.sign(v)*Math.min(1,(a-JS_DEAD)/(1-JS_DEAD)); };
/** the stick, past the dead zone: x right and y UP, each -1 to 1 */
function jsXY(){ const s=(typeof mc!=="undefined" && mc && mc.stick) || {x:0,y:0}; return {x:jsAxis(s.x), y:jsAxis(s.y)}; }
// The stick as a d-pad, with hysteresis: a way comes on at half travel and goes off under 0.3, and
// while one's held the other axis can't take over, so a sweep round the diagonal is never two presses.
let jsW4=null, jsWv=null, jsWh=null;
/** the way the stick is pushed, four ways: "up", "down", "left", "right" or null */
function jsWay4(){
  if(!jsOn()){ jsW4=null; return null; }
  const {x,y}=jsXY(), along={right:x, left:-x, up:y, down:-y};
  if(jsW4 && along[jsW4]<.3) jsW4=null;
  if(!jsW4 && Math.max(Math.abs(x),Math.abs(y))>=.5) jsW4 = Math.abs(x)>=Math.abs(y) ? (x>0?"right":"left") : (y>0?"up":"down");
  return jsW4;
}
/** the ways the stick is held, eight ways: up to one vertical then one horizontal, each on at 0.4, off under 0.25 */
function jsWays8(){
  if(!jsOn()){ jsWv=jsWh=null; return []; }
  const {x,y}=jsXY();
  if(jsWv && (jsWv==="up" ? y : -y)<.25) jsWv=null;
  if(!jsWv && Math.abs(y)>=.4) jsWv = y>0 ? "up" : "down";
  if(jsWh && (jsWh==="right" ? x : -x)<.25) jsWh=null;
  if(!jsWh && Math.abs(x)>=.4) jsWh = x>0 ? "right" : "left";
  return [jsWv, jsWh].filter(Boolean);
}
/** where the stick points: a, radians clockwise from up (0 up, π/2 right); mag, how far, 0 to 1 */
// The dead zone here is round, not an axis at a time as jsXY's is: that would pull every angle toward
// up, down, left and right (a stick 10° off upright would read 2°).
function jsAngle(){
  const s=(typeof mc!=="undefined" && mc && mc.stick) || {x:0,y:0}, r=Math.hypot(s.x||0, s.y||0);
  const mag= r<=JS_DEAD ? 0 : Math.min(1,(r-JS_DEAD)/(1-JS_DEAD));
  return {a: mag ? mod(Math.atan2(s.x||0, s.y||0), 2*Math.PI) : 0, mag};
}
// held: the stick's ways and A and B, each from when it went down (kmHeld reads them)
const jsHeldAt=new Map();
let jsEdging=false;            // a press of the stick going in through answerNote: kmControl lets it through
const jsStripOff=()=> !jsEdging && jsOn() && typeof blast!=="undefined" && !!blast && typeof KM_GAMES!=="undefined" && KM_GAMES.includes(blast.kind) && !blast.jsStrip;
// a press: what a pluck of the layout's string for that way (or A, or B) does
function jsAnswer(zone){
  const i=kmLayout().byString.indexOf(zone); if(i<0) return;
  jsEdging=true; try{ answerNote(i); } finally { jsEdging=false; }
}
mc.addEventListener("stick", ()=>jsStick());
mc.addEventListener("button", e=>jsButton(e.detail));
function jsStick(){
  const was=jsW4, way=jsWay4(), ways=jsWays8(), now=performance.now();
  for(const z of ["up","down","left","right"]){ if(!ways.includes(z)) jsHeldAt.delete(z); else if(!jsHeldAt.has(z)) jsHeldAt.set(z, now); }
  jsPicSync();
  if(!jsOn() || !blast || !blast.field) return;
  if(way && way!==was) jsPress(way);
  else if(cabWaiting() && jsAngle().mag>.2) cabWake();                    // any real move wakes a title screen
}
function jsButton(d){
  if(d.name==="a" || d.name==="b"){ const z=d.name.toUpperCase(); if(d.down){ if(!jsHeldAt.has(z)) jsHeldAt.set(z, performance.now()); } else jsHeldAt.delete(z); }
  jsPicSync();
  if(!jsOn() || !d.down || !blast || !blast.field) return;
  if(d.name==="click") return jsClick();
  jsPress(d.name.toUpperCase());
}
// The stick's way, A or B pressed, wherever the arcade is: initials, a title screen waking, a demo
// skipped, the menus, and in play the games that steer on the harp's d-pad.
function jsPress(zone){
  if(jsPaused()) return;
  // a bonus round has controls of its own; TUNE IT's are the d-pad's (up and right sharpen, A locks it)
  if(blast.bonus && !bonusInField()){ if(blast.bonus.g.id==="tune") jsAnswer(zone); return; }
  if(blast.hsEntry){ jsAnswer(zone); return; }
  if(cabWaiting()){ cabWake(); return; }
  if(blast.phase==="demo"){ blast.demo?.el?.querySelector(".demoskip")?.click(); return; }
  if(blast.phase==="menu" || blast.phase==="over"){ jsMenu(zone); return; }
  if((blast.phase==="play" || bonusInField()) && KM_GAMES.includes(blast.kind) && !blast.jsOwn) jsAnswer(zone);
}
// the click: pause, or go on; the drum games' hi-hat in their play; elsewhere it wakes a title screen
function jsClick(){
  if(jsPaused()){ jsResume(); return; }
  if(blast.phase==="play"){ if(!DRUM_GAMES.has(blast.kind)) jsPause(); return; }
  if(blast.phase==="demo"){ blast.demo?.el?.querySelector(".demoskip")?.click(); return; }
  if(cabWaiting()) cabWake();
}

// ---------- the arcade wheel ----------
// The arcade wheel (harp plate 9, firmware 99 on): a ring of ten zones round a hub of two. The ring
// plays notes like any harp, so as a controller it's the standard strip's d-pad already (kmControl);
// and while a finger is on it the minichord also sends its bearing (core/minichord.js: mc.wheel, the
// "wheel" event). Here that's for the games that can use an angle — Fifths Defender aims by it, Key
// Racer steers by it — read as the stick is: a bearing, a signed turn, and a 4- or 8-way direction.
// Nothing presses the d-pad from here: the ring's own notes do that, as they always have.
const whOn=()=> typeof mc!=="undefined" && !!mc && !mc.virtual && (mc.params[7]??0)>=99 && mc.plate==="wheel";
/** where the finger is on the ring: a, radians clockwise from the top (0 up, π/2 right); on, whether it's there */
function whAngle(){ const w=(typeof mc!=="undefined" && mc && mc.wheel) || {angle:0, touched:false}; return {a:w.angle*2*Math.PI, on:whOn() && !!w.touched}; }
/** the wheel as a steering wheel: how far it's turned from the top, -π to π, right positive; 0 untouched */
function whTurn(){ const {a, on}=whAngle(); return on ? mod(a+Math.PI, 2*Math.PI)-Math.PI : 0; }
// The ring as a d-pad, with hysteresis like the stick's: a way is the quarter (or eighth) the bearing
// is in, held until the finger moves WH_HYST past the boundary to the next or lifts, so one resting on
// a line doesn't flicker between two.
const WH_HYST=8*Math.PI/180;
let whW4=null, whW8=null;
const whOff=(a,c)=>Math.abs(mod(a-c+Math.PI, 2*Math.PI)-Math.PI);
/** the way the finger is on the ring, four ways: "up", "right", "down", "left" or null */
function whWay4(){
  const {a, on}=whAngle(); if(!on) return whW4=null;
  if(whW4!=null && whOff(a, whW4*Math.PI/2)>Math.PI/4+WH_HYST) whW4=null;
  if(whW4==null) whW4=mod(Math.round(a/(Math.PI/2)), 4);
  return ["up","right","down","left"][whW4];
}
/** eight ways: the vertical then the horizontal of the eighth the finger is in, as jsWays8 gives them */
function whWays8(){
  const {a, on}=whAngle(); if(!on){ whW8=null; return []; }
  if(whW8!=null && whOff(a, whW8*Math.PI/4)>Math.PI/8+WH_HYST) whW8=null;
  if(whW8==null) whW8=mod(Math.round(a/(Math.PI/4)), 8);
  return [["up"],["up","right"],["right"],["down","right"],["down"],["down","left"],["left"],["up","left"]][whW8];
}

// ---------- the arcade wheel, drawn ----------
// As it's made (~/minichord-harp-plates, make_plates.py plate_arcade_wheel): a 32 x 56 mm pill, the
// ring of ten zones (8 to 15 mm out) round a hub of two (7 mm), A over the top right of a diagonal
// seam and B the bottom left. Clockwise from the top left the ring's contacts and their widths: T1-T3
// 30° each across the top, T8 and T9 45° down the right, T10-T12 30° along the bottom, T5 and T4 45°
// up the left. Contact Tn is string 12-n as the arcade reads the harp (C at T12), so the ring is the
// standard strip's d-pad and the hub its A and B. Each zone is a group (data-pc its string) holding
// its shape and its label, lit as the strip's are (lit, hit, demo-on); a dot shows where a finger is
// on the ring while the minichord sends it (whOn).
const WH_RING=[[1,30],[2,30],[3,30],[8,45],[9,45],[10,30],[11,30],[12,30],[5,45],[4,45]];
const WH_CX=16, WH_CY=28, WH_R=15, WH_IN=8, WH_HUB=7, WH_DOT=11.5;
/** fill el with the wheel; label(stringIndex) gives each zone's text (or a picture's svg). Returns the zones by string. */
function whPlate(el, label){
  whCss(); el.classList.add("whpic");
  const pt=(a,r)=>`${(WH_CX+r*Math.cos(a*Math.PI/180)).toFixed(2)} ${(WH_CY+r*Math.sin(a*Math.PI/180)).toFixed(2)}`;
  const xy=(a,r)=>pt(a,r).split(" ");
  const lab=(sI,a,r,size)=>{ const t=label(sI)||"", [x,y]=xy(a,r);
    return /^<svg/.test(t) ? t.replace(/^<svg/, `<svg x="${(x-size/2).toFixed(2)}" y="${(y-size/2).toFixed(2)}" width="${size}" height="${size}"`) : `<text x="${x}" y="${y}" class="whlbl" style="font-size:${(size*.62).toFixed(2)}px">${t}</text>`; };
  let svg=`<svg viewBox="0 0 32 56" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x=".4" y=".4" width="31.2" height="55.2" rx="15.6" class="whbody"/>`;
  svg+=`<circle cx="${WH_CX}" cy="${WH_CY}" r="${WH_R+.6}" class="whrim"/>`;
  let a=-135;
  for(const [t,w] of WH_RING){
    const sI=12-t, a0=a+.8, a1=a+w-.8;
    svg+=`<g class="whz" data-pc="${sI}"><path d="M${pt(a0,WH_R)}A${WH_R} ${WH_R} 0 0 1 ${pt(a1,WH_R)}L${pt(a1,WH_IN)}A${WH_IN} ${WH_IN} 0 0 0 ${pt(a0,WH_IN)}Z"/>${lab(sI,a+w/2,(WH_R+WH_IN)/2,4.4)}</g>`;
    a+=w;
  }
  // the hub's halves either side of the seam, top left to bottom right: A (string 6) above, B (5) below
  for(const [sI,mid] of [[6,-45],[5,135]]){
    const [dx,dy]=[.45*Math.cos(mid*Math.PI/180), .45*Math.sin(mid*Math.PI/180)];
    svg+=`<g class="whz whhub" data-pc="${sI}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})"><path d="M${pt(mid-90,WH_HUB)}A${WH_HUB} ${WH_HUB} 0 0 1 ${pt(mid+90,WH_HUB)}Z"/>${lab(sI,mid,WH_HUB*.45,5)}</g>`;
  }
  svg+=`<circle r="1.5" class="whdot" cx="${WH_CX}" cy="${WH_CY-WH_DOT}"/></svg>`;
  el.innerHTML=svg;
  const zones=[]; el.querySelectorAll(".whz").forEach(g=>{ zones[+g.dataset.pc]=g; g.whLabel=g.querySelector("text"); });
  whPicSync();
  return zones;
}
/** mark the zones with what they do in the layout, as the strip's are (km, km-up …, data-zone) */
function whZones(zones, L){ zones.forEach((g,sI)=>{ const z=L.byString[sI]; g.classList.add("km",`km-${z}`); g.dataset.zone=z; }); }
// every drawing of the wheel on the page, as the finger is on the ring now
function whPicSync(){
  if(typeof document==="undefined") return;
  const {a, on}=whAngle();
  document.querySelectorAll(".whpic .whdot").forEach(d=>{
    d.classList.toggle("on", on);
    if(on){ d.setAttribute("cx", (WH_CX+WH_DOT*Math.sin(a)).toFixed(2)); d.setAttribute("cy", (WH_CY-WH_DOT*Math.cos(a)).toFixed(2)); }
  });
}
mc.addEventListener("wheel", whPicSync);
function whCss(){
  if(typeof document==="undefined" || document.getElementById("whCss")) return;
  const st=document.createElement("style"); st.id="whCss";
  st.textContent=`.whpic svg{display:block;width:100%;height:100%;overflow:visible}
.kmstrip.whpic{display:block;top:50%;bottom:auto;width:110px;height:auto;aspect-ratio:32/56;max-height:calc(100% - 60px);transform:translateY(-50%);border:none;background:none}
.helper.hharp.whpic{display:block;background:none;border:none;padding:0;height:min(220px,55%);width:auto;aspect-ratio:32/56}
.helper.hharp.whpic .whbody{fill-opacity:.45}
.whpic .whbody{fill:#0C0B0F;stroke:#4A443C;stroke-width:.6}
.whpic .whrim{fill:none;stroke:#2E2A40;stroke-width:.5}
.kmstrip.dppic{width:84px;aspect-ratio:32/74}
.helper.hharp.dppic{aspect-ratio:32/74}
.whpic .whz path,.whpic .whz rect{fill:#16132A;stroke:#3D3656;stroke-width:.4}
.whpic .whz.km-A path,.whpic .whz.km-B path,.whpic .whz.km-A rect,.whpic .whz.km-B rect{fill:#3A1414;stroke:#8B2A2A}
.whpic .whz.km-null{opacity:.28}
.whpic .whlbl{fill:#9A93B5;font-family:"Press Start 2P",monospace;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.whpic .whz.km-A .whlbl,.whpic .whz.km-B .whlbl{fill:#FFD35A}
.whpic .whz.lit path,.whpic .whz.demo-on path,.whpic .whz.lit rect,.whpic .whz.demo-on rect{fill:#FFD35A;stroke:#FFF4C2}
.whpic .whz.lit .whlbl,.whpic .whz.demo-on .whlbl{fill:#16132A}
.whpic .whz.hit path,.whpic .whz.hit rect{animation:whhit .3s ease-out}
@keyframes whhit{from{fill:#FFD35A}}
.whpic .whdot{fill:#7FE9FF;stroke:#000;stroke-width:.4;opacity:0;transition:opacity .15s}
.whpic .whdot.on{opacity:1}`;
  document.head.appendChild(st);
}

// ---------- the drum pads, drawn ----------
// As it's made (~/minichord-harp-plates, drum pads PCB): a 32 x 74 mm plate, two columns of six pads
// with seams between them where neighbours' copper interlocks (drawn as the gaps). Top to bottom,
// left then right, the contacts T2 T3, T1 T4, T6 T5, T7 T10, T8 T9, T12 T11; contact Tn is string
// 12-n, as on the wheel. Its zones are the wheel's (whz), lit the same way.
const DP_ROWS=[[2,3],[1,4],[6,5],[7,10],[8,9],[12,11]];
/** fill el with the drum pads; label(stringIndex) gives each pad's text (or a picture's svg). Returns the pads by string. */
function dpPlate(el, label){
  whCss(); el.classList.add("whpic","dppic");
  const m=1.4, gap=1.6, w=(32-2*m-gap)/2, h=(74-2*m-5*gap)/6;
  let svg=`<svg viewBox="0 0 32 74" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x=".4" y=".4" width="31.2" height="73.2" rx="2.2" class="whbody"/>`;
  DP_ROWS.forEach((row,r)=>row.forEach((t,c)=>{
    const sI=12-t, x=m+c*(w+gap), y=m+r*(h+gap), cx=x+w/2, cy=y+h/2, lab=label(sI)||"";
    const inner=/^<svg/.test(lab) ? lab.replace(/^<svg/, `<svg x="${(cx-2.6).toFixed(2)}" y="${(cy-2.6).toFixed(2)}" width="5.2" height="5.2"`) : `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" class="whlbl" style="font-size:3.1px">${lab}</text>`;
    svg+=`<g class="whz" data-pc="${sI}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="1.4"/>${inner}</g>`;
  }));
  el.innerHTML=svg+`</svg>`;
  const pads=[]; el.querySelectorAll(".whz").forEach(g=>{ pads[+g.dataset.pc]=g; g.whLabel=g.querySelector("text"); });
  return pads;
}

// ---------- the menus, on the stick ----------
// A title screen's options and levels and the game over screen, as the arrow keys and Enter work them:
// the stick up and down moves from line to line (and repeats while it's held), left and right change an
// option, A presses the line (with none chosen on the options, on to the levels, as Enter does), B goes
// back from the levels to the options, as Escape does.
let jsRepT=0;
function jsMenu(zone, again){
  const ov=blast.overlay; if(!ov || ov.hidden) return;
  const stage=ov.dataset.stage, levels=ov.dataset.optpage==="levels";
  const page= stage==="options" ? ov.querySelector(levels ? ".cab-levelpage" : ".cab-optpage") : stage ? null : ov;
  if(!page) return;
  const items=[...page.querySelectorAll("button.go, button.howto, button.opt, .levels button")].filter(b=>!b.disabled && !b.closest("[hidden]"));
  const at=items.indexOf(document.activeElement), cur=items[at];
  const focus=b=>{ if(b) b.focus(); };
  const firstLevel=()=>page.querySelector(".levels button:not(:disabled)") || items[0];
  if(zone==="up" || zone==="down"){
    focus(at<0 ? (levels ? firstLevel() : items[zone==="up" ? items.length-1 : 0]) : items[Math.max(0, Math.min(items.length-1, at+(zone==="up"?-1:1)))]);
    jsRepeat(zone, again);
  } else if(zone==="left" || zone==="right"){
    if(cur && cur.jsStep){ cur.jsStep(zone==="left" ? -1 : 1); jsRepeat(zone, again); }
  } else if(zone==="A"){
    if(cur) cur.click();
    else if(stage==="options" && !levels){ ov.dataset.optpage="levels"; sfx("press"); focus(ov.querySelector(".cab-levelpage .levels button:not(:disabled)")); }
    else focus(levels ? firstLevel() : items[0]);
  } else if(zone==="B"){
    if(stage==="options" && levels){ ov.dataset.optpage="options"; sfx("press"); focus(ov.querySelector(".cab-optpage .go")); }
  }
}
// held, a way repeats: after a moment, then briskly, for as long as the stick stays that way (an
// option's value a little less briskly than the lines, so one that goes round can still be stopped on)
const JS_REPEAT={first:420, lines:110, values:220};
function jsRepeat(zone, again){
  clearTimeout(jsRepT); const b=blast;
  const go=ms=>{ jsRepT=gameLater(()=>{ if(blast!==b || jsWay4()!==zone || !["menu","over"].includes(b.phase)) return; jsMenu(zone, true); }, ms); };
  go(!again ? JS_REPEAT.first : zone==="up" || zone==="down" ? JS_REPEAT.lines : JS_REPEAT.values);
}

// ---------- pause ----------
// The click (or P on the keyboard, or PAUSE in the phone's menu) stops a game where it is, as the
// bonus rounds do: the phase "pause" stops its clock and its moves, its timers wait (gameLater), and
// going on moves every time it keeps on by how long it stood (bonusShift). Only in play. The drum games
// keep the click as their hi-hat; P pauses them only if the game can count itself back in
// (tpResume/tfResume): the band can't stop mid-bar and carry on as if it hadn't.
// (Key Fleet has a "pause" of its own between waves: the arcade's is the one marked jsPaused)
const jsPaused=()=> !!(typeof blast!=="undefined" && blast && blast.jsPaused && blast.phase==="pause");
const jsDrumResume=k=> k==="pilot" ? (typeof tpResume==="function" ? tpResume : null) : k==="fours" ? (typeof tfResume==="function" ? tfResume : null) : null;
function jsCanPause(){ return !!(blast && blast.field && blast.phase==="play" && !blast.bonus && (!DRUM_GAMES.has(blast.kind) || jsDrumResume(blast.kind))); }
function jsPause(){
  if(!jsCanPause()) return false;
  blast.pausePhase=blast.phase; blast.phase="pause"; blast.jsPaused=true; blast.pauseStart=performance.now();
  if(typeof rhStop==="function") rhStop();                                   // the drums, if any, stop at once
  jsHush(true);
  blast.field.querySelectorAll(".jspause").forEach(e=>e.remove());
  const el=document.createElement("div"); el.className="jspause";
  el.innerHTML=`<div class="jspbox"><b class="blink">PAUSED</b><span>${jsOn() ? "CLICK THE STICK OR P TO GO ON" : jsTouch() ? "TAP HERE TO GO ON" : "PRESS P, OR CLICK HERE, TO GO ON"}</span></div>`;
  el.addEventListener("click", e=>{ e.stopPropagation(); jsResume(); });
  jsCss(); blast.field.appendChild(el); sfx("press");
  return true;
}
function jsResume(){
  if(!jsPaused()) return false;
  const d=performance.now()-(blast.pauseStart||performance.now());
  blast.field && blast.field.querySelectorAll(".jspause").forEach(e=>e.remove());
  if(!DRUM_GAMES.has(blast.kind)){ bonusShift(blast, d); bonusShiftOwn(d); }   // the drum games' clock is the audio's: they count back in
  if(blast.startedAt) blast.startedAt+=d;                                   // the time played, for the scores, leaves the pause out (every game: it's the page's clock)
  blast.phase=blast.pausePhase||"play"; blast.pausePhase=null; blast.jsPaused=false; blast.last=performance.now();
  jsHush(false);
  const r=jsDrumResume(blast.kind); if(r && DRUM_GAMES.has(blast.kind)) r();
  sfx("press");
  return true;
}
const jsPauseToggle=()=> jsPaused() ? jsResume() : jsPause();
// a phone or a tablet, played on its screen or with a minichord plugged in (the bare cabinet): tapped, not clicked
const jsTouch=()=> playOnScreen() || !!document.querySelector(".fscab.phone") || (typeof matchMedia==="function" && matchMedia("(pointer:coarse)").matches);
// What a game holds sounding stops with it, and starts again as it goes on: Chopper Rescue's radio
// tuning in (the station's tone, the radio's and the static, as the dial has them) and Chord Hunt's drone.
function jsHush(on){
  const ch= blast.kind==="chopper" && blast.tune && blast.tune.audio;
  if(ch){ ch.g.gain.value= on ? 0 : .09; if(on) ch.ng.gain.value=0; else if(typeof chDial==="function") chDial(blast.tune.dial); }
  const dr= blast.kind==="hunt" && blast.drone;
  if(dr) try{ const t=piano.ctx.currentTime; dr.g.gain.cancelScheduledValues?.(t); dr.g.gain.setTargetAtTime(on ? 0 : .05, t, .05); }catch(e){}
}
// P pauses and goes on (no letter row of keyboard play has it); while paused, the game's keys wait
document.addEventListener("keydown", e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  const paused=jsPaused();
  if(e.code==="KeyP" && !e.ctrlKey && !e.metaKey && !e.altKey){
    if(paused || jsCanPause()){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) jsPauseToggle(); }
    return;
  }
  if(paused && !["KeyF","F2","Tab"].includes(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// ---------- the minichord's setup, on the joystick plate ----------
// Every game, on this plate: "knobs send MIDI" on, or the stick and buttons say nothing; and the stick's
// own sound off, for as long as the game plays: joystick mode 396 (which bends every voice and adds
// vibrato) and what the stick's ways and the buttons are pointed at (402 to 414; 0 points them nowhere,
// so a preset's button can't, say, shift the strip an octave under a game that reads its notes). Those
// are settings 256 and up, read with the second page (mc.page1): asked for if it isn't in, and set once
// it is. The harp plate (243) and the stick's orientation (397) are the instrument's own: never written.
const JS_QUIET={396:0, 402:0, 404:0, 406:0, 408:0, 410:0, 412:0, 414:0};
function jsPreset(){
  if(!jsOn() || !canWrite() || !blast) return;
  blast.jsWant=true;                                                         // set again when page 1 comes (below)
  if(hasSetting(238)) ensure(238,1);
  if(!mc.page1){ if(!blast.jsAsked){ blast.jsAsked=true; if(typeof mc.requestPage1==="function") mc.requestPage1(); else mc.control(7,1); } return; }
  for(const [a,v] of Object.entries(JS_QUIET)) ensure(+a, v);
}
// Not after "Put my settings back" (until the next game sets it up again). Nor after a preset loaded
// mid-game, once the stick's settings are among what the game wants: the room's own listener (room.js,
// which runs after this) sets them again and keeps the new preset's values to give back after, which a
// borrow here first, with the old preset's values still kept, would stop.
mc.addEventListener("page1", ()=>{
  if(!blast || !blast.jsWant || !canWrite() || (typeof userRestored!=="undefined" && userRestored)) return;
  if(typeof page1Preset!=="undefined" && page1Preset && typeof wanted!=="undefined" && Object.keys(JS_QUIET).every(a=>a in wanted)) return;
  jsPreset();
});
// the plate found (its settings arrive after the page is drawn) or gone: the pictures follow, and the
// menus' words. Nothing held carries over.
let jsWas=false, plateWas=null;
mc.addEventListener("device", ()=>{
  const was=plateWas ?? "stock|"+(KM_LAYOUTS[saved.harpLayout] ? saved.harpLayout : "strip");   // as the page was first drawn
  const on=jsOn(), plate=plateFitted()+"|"+kmLayoutName(); if(on===jsWas && plate===was) return;
  if(on!==jsWas){ jsHeldAt.clear(); jsW4=jsWv=jsWh=null; }
  jsWas=on; plateWas=plate;
  const note=blast && blast.overlay && blast.overlay.querySelector(".cabplate"); if(note) note.textContent=KM_GAMES.includes(blast.kind) ? plateNote() : "";
  if(!blast || !blast.field) return;
  if(blast.strip && typeof KM_GAMES!=="undefined" && KM_GAMES.includes(blast.kind)) kmRestrip();
  else helperSync(true);
  if(typeof optsRefresh==="function") optsRefresh();
  const cp=blast.overlay && blast.overlay.querySelector(".cabpress"); if(cp) cp.textContent=cabPress();
});

// ---------- the joystick plate, drawn ----------
// As it looks: a dark plate, the strip down its left side as an octave of piano keys (twelve equal
// places, C at the bottom), the stick's round cap to the right, A and B along the foot. Its parts lit as
// they're used: the stick's way, A, B, the click, and a key as the strip plays it (kmFlash, helpString).
// The same drawing beside the field, on the on-screen minichord, and as the harp in beginner mode.
const JS_WHITE=[[0,0,1.5],[2,1.5,3.5],[4,3.5,5],[5,5,6.5],[7,6.5,8.5],[9,8.5,10.5],[11,10.5,12]];   // pitch class, from, to (in places)
const JS_BLACK=[1,3,6,8,10];
function jsPlate(el){
  jsCss(); el.classList.add("jspic");
  const top=.8, bot=59.3, ph=(bot-top)/12, y=p=>bot-p*ph;                  // place p's lower edge
  const keys=[];
  let svg=`<svg viewBox="0 0 32 76" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x=".5" y=".5" width="31" height="75" rx="2.5" class="jsbody"/>`;
  svg+=`<rect x=".6" y="${top-.3}" width="9.4" height="${bot-top+.6}" class="jsstripbg"/>`;
  for(const [pc,a,b] of JS_WHITE) svg+=`<rect data-pc="${pc}" class="jskey jsw" x="1" y="${(y(b)+.15).toFixed(2)}" width="8.6" height="${((b-a)*ph-.3).toFixed(2)}"/>`;
  for(const pc of JS_BLACK) svg+=`<rect data-pc="${pc}" class="jskey jsb" x="1" y="${(y(pc+1)+.25).toFixed(2)}" width="5.4" height="${(ph-.5).toFixed(2)}"/>`;
  const cx=20.8, cy=39.5;                                                    // the cap in its round gate, the four ways round it
  svg+=`<circle cx="${cx}" cy="${cy}" r="7.6" class="jsgate"/>`;
  svg+=`<g class="jscapg"><circle cx="${cx}" cy="${cy}" r="4.2" data-zone="click" class="jscap"/><circle cx="${cx}" cy="${cy}" r="1.8" class="jscapdot"/></g>`;
  for(const [z,dx,dy,r] of [["up",0,-1,0],["right",1,0,90],["down",0,1,180],["left",-1,0,270]])
    svg+=`<path data-zone="${z}" class="jsway" transform="translate(${cx+dx*9.1} ${cy+dy*9.1}) rotate(${r})" d="M0 -1.4L1.5 .9H-1.5Z"/>`;
  for(const [z,x] of [["A",8],["B",23.4]]) svg+=`<circle data-zone="${z}" class="jsbtn" cx="${x}" cy="64.6" r="4.4"/><text x="${x}" y="73.9" class="jslbl">${z}</text>`;
  el.innerHTML=svg+`</svg>`;
  el.querySelectorAll(".jskey").forEach(k=>{ keys[+k.dataset.pc]=k; });
  jsPicSync();
  return keys;
}
// every drawing of the plate on the page, as the stick and buttons are now
function jsPicSync(){
  if(typeof document==="undefined") return;
  const pics=document.querySelectorAll(".jspic"); if(!pics.length) return;
  const s=jsXY(), b=(mc && mc.buttons)||{};
  pics.forEach(p=>{
    p.querySelectorAll(".jsway").forEach(w=>w.classList.toggle("on", jsHeldAt.has(w.dataset.zone)));
    p.querySelectorAll(".jsbtn").forEach(w=>w.classList.toggle("on", !!b[w.dataset.zone.toLowerCase()]));
    const g=p.querySelector(".jscapg"); if(g) g.setAttribute("transform", `translate(${(s.x*2.6).toFixed(2)} ${(-s.y*2.6).toFixed(2)})`);
    p.querySelector(".jscap")?.classList.toggle("on", !!b.click);
  });
}
// The drawing's look, and the PAUSED screen's: put on the page once, from here, so a game's own page
// (which loads only the shared scripts and its own) has them too.
function jsCss(){
  if(typeof document==="undefined" || document.getElementById("jsCss")) return;
  const st=document.createElement("style"); st.id="jsCss";
  st.textContent=`.jspic svg{display:block;width:100%;height:100%;overflow:visible}
.kmstrip.jspic{display:block;top:50%;bottom:auto;width:70px;height:auto;aspect-ratio:32/76;max-height:calc(100% - 60px);transform:translateY(-50%)}
.helper.hharp.jspic{display:block;background:none;border:none;padding:0;height:min(250px,60%);width:auto;aspect-ratio:32/76}
.helper.hharp.jspic .jsbody{fill-opacity:.45}
.helper .board .jspic{opacity:.92}
.jspic .jsbody{fill:#0C0B0F;stroke:#4A443C;stroke-width:.6}
.jspic .jsstripbg{fill:#050407}
.jspic .jsw{fill:#F4F2EA}
.jspic .jsb{fill:#16132A;stroke:#3D3656;stroke-width:.3}
.jspic .jsgate{fill:#16132A;stroke:#3D3656;stroke-width:.6}
.jspic .jsway{fill:#3D3656}
.jspic .jscap{fill:#2A2638;stroke:#9A93B5;stroke-width:.6}
.jspic .jscapdot{fill:#4A4560;pointer-events:none}
.jspic .jsbtn{fill:#5A1B1B;stroke:#8B2A2A;stroke-width:.5}
.jspic .jslbl{fill:#9A93B5;font:400 3.4px "Press Start 2P",monospace;text-anchor:middle}
.jspic .jsway.on,.jspic .jsway.demo-on,.jspic .jskey.lit,.jspic .jskey.demo-on{fill:#FFD35A}
.jspic .jsbtn.on,.jspic .jsbtn.demo-on{fill:#FFD35A;stroke:#FFF4C2}
.jspic .jscap.on,.jspic .jscap.demo-on{stroke:#FFD35A;stroke-width:1.2}
.jspic .hit{animation:jshit .3s ease-out}
@keyframes jshit{from{fill:#FFD35A}}
.jspause{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(5,4,10,.72);cursor:pointer;text-align:center;padding:0 16px}
.jspause .jspbox{display:flex;flex-direction:column;align-items:center;gap:16px;background:#0C0B14;border:3px solid #FFD35A;box-shadow:0 0 0 3px #000,0 0 24px rgba(255,211,90,.35);padding:22px 26px;max-width:min(440px,92%)}
.jspause b{font:400 clamp(1.1rem,4.5vw,2rem) "Press Start 2P",monospace;color:#FFD35A;text-shadow:3px 3px 0 #000}
.jspause span{font:400 clamp(.5rem,1.6vw,.62rem) "Press Start 2P",monospace;color:#F1E8D2;line-height:1.8;text-shadow:2px 2px 0 #000}`;
  document.head.appendChild(st);
}
