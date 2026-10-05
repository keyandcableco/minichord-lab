// The arcade kit (menus, option rows, demo stages, setup), the CRT look, the score multiplier, the
// arcade settings, the bezel's buttons, game over, and high scores.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the arcade kit: what every game's title screen and demo share ----------
// A game describes its menu (title, rules, option rows, levels, what the game over line counts,
// where the modifier note goes) and arcadeMenu builds it, the same way for all of them; a demo
// asks demoShell for its stage and its clock. A fix here lands in every game at once.

// a game's title screen or game over screen, from its description:
//   key       where its best score is kept (saved.best[key])
//   title     its name, as the title screen shows it
//   rules()   the rules, as paragraphs
//   stat()    what the game over line counts beside the score (the level, unless it says otherwise)
//   (its options are ARCADE_OPTS's, below: the ones whose on(kind) is true for it)
//   levels    its levels (objects with n, or plain names); ok(i) whether this minichord can play one,
//             and needs, what to say when it can't; sig(), anything else its title screen depends on
//   begin(i)  start at level i; demo(), its demo
//   modNote   where the modifier note shows: "always", "title" (not at game over) or false
function arcadeMenu(g, over){
  if(over && hsOffer(()=>arcadeMenu(g,true))) return;
  if(!over) newRun();                                          // back at the title: nothing from before carries on
  const ov=document.createElement("div"); ov.className="overlay";
  const best=saved.best[g.key]||0;
  if(over){
    ov.innerHTML=`<h3 class="over">GAME OVER</h3><p>SCORE ${blast.score} · ${g.stat ? g.stat() : `LEVEL ${blast.level+1}`} · BEST ${best}</p>`;
    const again=document.createElement("button"); again.className="go"; again.innerHTML=`PLAY AGAIN<small>from level ${blast.startLevel+1}</small>`;
    again.onclick=()=>g.begin(blast.startLevel); ov.appendChild(again);
    sfx("over");
  } else {
    ov.innerHTML=`<h3>${g.title}</h3>${g.rules()}`;
    const how=document.createElement("button"); how.className="howto"; how.textContent="▶ HOW TO PLAY"; how.onclick=()=>g.demo(); ov.appendChild(how);
  }
  blast.menuAgain = over ? null : ()=>arcadeMenu(g);              // the title again, should an option change what it offers
  ov.appendChild(arcadeOpts(over ? ["game"] : ["game","setup"]));
  const lp=document.createElement("p"); lp.className = over ? "" : "blink"; lp.textContent = over ? "OR START FROM" : "CHOOSE A LEVEL"; ov.appendChild(lp);
  const lv=document.createElement("div"); lv.className="levels";
  g.levels.forEach((L,i)=>{ const b=document.createElement("button"), ok=g.ok ? g.ok(i) : true, n=g.levelName ? g.levelName(i) : typeof L==="string" ? L : L.n;
    b.innerHTML=`${i+1}<small>${n}${ok?"":`<br>${g.needs}`}</small>`; b.disabled=!ok; b.onclick=()=>g.begin(i); lv.appendChild(b); });
  ov.appendChild(lv);
  if(g.ok) blast.menuSig=g.levels.map((_,i)=>g.ok(i)).join()+(g.sig ? g.sig() : "");
  if(!over && best){ const p=document.createElement("p"); p.textContent=`BEST ${best}`; ov.appendChild(p); }
  if(g.modNote==="always" || (g.modNote==="title" && !over)) arcadeModNote(ov);
  arcadeKeys(ov);
  if(!over) arcadeCredit(ov);
  if(over) hsGameOverLine(ov);
  blast.field.appendChild(ov); blast.overlay=ov;
  if(over) overTimeout(ov, ()=>arcadeMenu(g));
  else cabinet(ov);
}
// a demo's stage: the DEMO banner with its title and caption, a skip button, the token that stops it,
// and its clock (step throws once the demo has been stopped, which ends the script)
function demoShell(end){
  newRun();
  const el=document.createElement("div"); el.className="demo"; blast.field.appendChild(el); blast.field.classList.add("demoing");
  const token={run:true, el}; blast.demo=token;
  gameLater(()=>{ if(blast.demo===token) helperSync(true); }, 0);         // the on-screen minichord, to show what's pressed
  el.innerHTML=`<div class="demohead"><span class="demotag blink">DEMO</span><span class="demotitle"></span><button class="demoskip">SKIP ▶</button></div><p class="democap"></p>`;
  el.querySelector(".demoskip").onclick=()=>end(token);
  const say=(t,c)=>{ el.querySelector(".demotitle").textContent=t||""; el.querySelector(".democap").textContent=c; };
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), step=async ms=>{ await sleep(ms); if(!token.run) throw 0; };
  return {el, token, say, sleep, step};
}
// a demo's chord, heard on the page's piano
// what a demo plays, lit on the on-screen minichord: one note its harp string, a chord its buttons
function demoLight(notes){
  if(!blast || blast.phase!=="demo") return;
  if(notes.length===1){ if(Number.isInteger(notes[0])) helpString(mod(notes[0],12)); return; }
  const id=chordId(notes); if(!id) return;
  helpChord((devFifths()<0 ? FLAT_NAMES : SHARP_NAMES)[id.root], id.quality);
}
function demoPlay(notes){ demoLight(notes); heardAt=performance.now(); if(settings.sounds && piano.ctx){ const go=()=>piano.play(notes,{when:.02,dur:1}); piano.ctx.state==="running"?go():piano.ctx.resume().then(go).catch(()=>{}); } }
// Every stretch of a game, a play from level start to game over, a demo, a title screen, is a run
// of its own. A timer set with gameLater belongs to the run that set it, and only fires if that run is
// still going: a timer from a game that's over can't reach into the next one (Play Again pressed at
// once, say, while the old game still had a wave or a radio call on its way).
function newRun(){ if(blast) blast.gen=(blast.gen||0)+1; }
function gameLater(fn, ms){ const b=blast, g=b && b.gen;
  const run=()=>{ if(!(b && blast===b && b.gen===g)) return; if(b.phase==="bonus"){ setTimeout(run,200); return; } fn(); };   // a bonus playing: wait for it
  return setTimeout(run, ms||0); }
// A title screen rebuilt because the minichord's settings changed what it offers (once they first
// arrive, usually). Only at a quiet moment: not while the title loop is mid-way through its rules,
// points or scores, which it would redraw under the player; and if they were choosing options, they
// stay on that page.
function menuRebuild(build){
  const old=blast.overlay, hid=old.hidden, st=old.dataset.stage, pg=old.dataset.optpage;
  if(st && st!=="title" && st!=="options") return false;            // mid-loop: the next device update tries again
  old.remove(); blast.overlay=null; build(); blast.overlay.hidden=hid;
  if(st==="options" && blast.overlay.dataset.stage){ cabStage(blast.overlay,"options"); blast.overlay.dataset.optpage=pg||"options"; }
  return true;
}
// The arcade's preset, put on the minichord for the length of a game and given back after (in one
// message where the firmware can push and pop). Two parts:
//   what playing needs, always: glide off, since a gliding chord isn't read until it lands, so a fast
//     change feels like a press that didn't register; and chords that don't retrigger on their own;
//   what only changes the sound, unless the player keeps their own (ARCADE SOUND): vibrato off on the
//     chords and the strings, so a chord to name is a steady one, and no delay echoing the last chord
//     over the next.
// (The rhythm mode is a switch on the instrument, not a setting, so it can't be borrowed: a game asks
// for it to be off when it sees chords arrive on the beat.)
const ARCADE_PLAY ={199:0, 21:0};                    // glide chords, retrigger chords
const ARCADE_SOUND={175:0, 76:0, 183:0};             // chord vibrato, harp vibrato, chord delay mix
const arcadeCleanSound=()=> saved.arcadeSound!=="mine";
function arcadePreset(){
  for(const [a,v] of Object.entries(ARCADE_PLAY)) if(hasSetting(+a)) ensure(+a, v);
  if(arcadeCleanSound()) for(const [a,v] of Object.entries(ARCADE_SOUND)) if(hasSetting(+a)) ensure(+a, v);
}
// setting up for the minichord, once per game: its settings read regularly, and whatever it borrows
function arcadeSetup(fn){ if(blast.setupDone) return; blast.setupDone=true; poll(true); arcadeVolumes();
  if(hasSetting(39)) ensure(39,0);      // the standard chord layout: every game asks for its chords
  if(canWrite()) arcadePreset();        // glide off, and a clean sound unless the player keeps their own
  if(fn) fn(); }
// Manual aim needs knobs that change nothing on the instrument: the chord and harp knobs always move
// their volumes, and the mod knob's main function is a setting of the preset. On firmware with knob
// layer (19), a game puts the knobs on their alternates and points those at unused addresses, so
// turning them changes nothing while "knobs send MIDI" still reports where they are. False without it.
// An alternate can point at 21 to 219; 217, 218 and 219 are the ones no firmware uses (213 to 215 were,
// until firmware 22 made them the palm mute and the harp's note-off on lift).
const KNOBS_NOWHERE=[217,218,219];
function arcadeKnobsInert(){
  if(!canWrite() || !hasSetting(117) || (mc.params[7]??0)<19) return false;
  if(knobsReady()) borrow(238,1);
  borrow(117,1); borrow(10,KNOBS_NOWHERE[0]); borrow(12,KNOBS_NOWHERE[1]); borrow(16,KNOBS_NOWHERE[2]);
  return true;
}
// The minichord's chord and harp volumes (addresses 3 and 2, on the knobs by default) are also its MIDI
// velocities: turned right down, it sends notes a game can't hear. So a game turns up whichever it
// listens to, if it's down, for as long as it plays, and says so; and if one goes down mid-game, it says that.
const ARCADE_HARP=new Set(["command","snake","asteroids","stack","fifths","breakout","fleet","sweeper","racer","chomp","burger","kong"]);
const ARCADE_CHORDS=k=>k!=="command";
function arcadeVolumes(){
  const up=[];
  if(ARCADE_CHORDS(blast.kind) && hasSetting(3) && (mc.params[3]??100)<25){ borrow(3,70); up.push("CHORD"); }
  if(ARCADE_HARP.has(blast.kind) && hasSetting(2) && (mc.params[2]??100)<25){ borrow(2,70); up.push("HARP"); }
  if(up.length) banner(`${up.join(" AND ")} VOLUME UP`, "IT WAS DOWN, SO THE GAME COULDN'T HEAR IT");
}
function arcadeVolumeWatch(){
  if(!blast || blast.phase!=="play" || !canWrite()) return;
  const down=[]; if(ARCADE_CHORDS(blast.kind) && (mc.params[3]??100)<5) down.push("CHORD"); if(ARCADE_HARP.has(blast.kind) && (mc.params[2]??100)<5) down.push("HARP");
  const key=down.join(); if(key===blast.volWarned) return; blast.volWarned=key;
  if(down.length) banner(`TURN THE ${down.join(" AND ")} VOLUME UP`, "AT ZERO THE GAME CAN'T HEAR YOU");
}

// ---------- the CRT look ----------
// An optional old-monitor look for the arcade: scanlines, a soft glow, the picture's corners
// darkened and rounded as a tube's are, a faint roll and flicker, and a slight colour fringe on the
// lettering. All of it is drawn over the field by the browser's own compositor, so it costs next to
// nothing, even on a slow machine. Switched on the title screens' options (SCREEN), and remembered.
// a field in the cabinet is CRT unless the cabinet's plain; one in the page, as the player chose
function crtSync(){ document.querySelectorAll(".field.arcade").forEach(f=>{ const cab=f.closest(".fscab"); f.classList.toggle("crt", cab ? !cab.classList.contains("plain") : !!saved.crt); }); }
new MutationObserver(()=>{ if(saved.crt) crtSync(); }).observe(document.getElementById("special")||document.body, {childList:true});


// ---------- the options, and the score multiplier ----------
// Every option an arcade game offers is in one table, ARCADE_OPTS: the title screen's options, game
// over, the settings dialog, the score multiplier and the POINTS page all read it, so a game offers
// the same things everywhere, and what an option scores is written once, beside its value.
// Each option:
//   id, label     its name, and what the screen calls it (label may be a function of the game)
//   group         "game" (how it plays, and what scores more), "setup" (how it looks, sounds and is
//                 steered, scoring nothing) or "arcade" (the whole arcade's, in the settings dialog only)
//   on(k)         whether game k offers it (on this minichord, with these other options)
//   vals(k)       its values: [word, multiplier, what it means, a tag for the score column]
//   say           what it means, where a value doesn't say
//   get(), set(i) where it's kept
// Harder settings score more: every point a game awards is multiplied by the product of the game
// group's multipliers, set when a game begins and shown beside the score, on the options screen as
// they're chosen, and on its own screen in the title loop, the way Pac-Man listed its ghosts.
const MULT_SPEED=[1,1.25,1.5,1.75,2];                      // Relaxed … Wild
// Played on the screen, the harp's strings named, or bare as the instrument's are: offered wherever the
// deck draws the twelve strings, and a quarter more where the game asks for notes by name (not Chord
// Hunt, whose harp is only low or high, nor Between the Frets, whose harp goes in quarter-tones)
const HARP_BY_NAME=new Set(["command","asteroids","breakout","fifths","chopper","fleet","sight"]);
const harpOnScreen=kind=> typeof playOnScreen==="function" && playOnScreen() && typeof TD_PROFILES!=="undefined" && TD_PROFILES[kind]?.harp==="notes";
const KM_GAMES=["snake","stack","sweeper","chomp","burger","kong"];          // the harp as a d-pad: its layout is how the game's played
const KF_TORPS=[1,.85,.7];                                 // Key Fleet: plenty, fewer, few
const SL_WINS=[38,24];                                     // Sight Line: loose, tight (pixels either side of the playhead)
const has=(...ks)=>k=>ks.includes(k);
const flag=(key)=>({get:()=>saved[key]?1:0, set:i=>{ saved[key]=!!i; save(); }});
const ARCADE_OPTS=[
  // ----- the game: how it plays, and what scores more
  {id:"race", group:"game", label:"RACE", on:has("racer"), get:()=>saved.krMode?1:0, set:i=>{ saved.krMode=i; save(); },
    vals:()=>[["GRAND PRIX",1,"EIGHT CIRCUITS, A KEY CENTRE EACH, QUALIFYING FIRST"],["ENDURANCE",1,"ROUND THE CIRCLE OF FIFTHS AGAINST THE CLOCK"]]},
  {id:"matrix", group:"game", label:"CHORDS", on:k=>has("blaster","asteroids","stack","breakout","snake")(k) && typeof mxAvailable==="function" && mxAvailable().length>1,
    get:()=>Math.max(0, mxAvailable().findIndex(([,v])=>v===mxChoice())), set:i=>{ saved.chordMatrix=mxAvailable()[i][1]; save(); optsMenuAgain(); },
    vals:()=>mxAvailable().map(([t,v])=>[t,1, v==="standard" ? "THE MINICHORD'S OWN CHORD BUTTONS" : v==="alternate" ? "THE ALTERNATE LAYOUT: SUS4, SUS2 AND THE REST ON THE BUTTONS" : "THE CHORDS YOUR PRESET HAS LOADED ON THE BUTTONS"])},
  {id:"speed", group:"game", label:"SPEED", on:k=>k!=="sweeper" && k!=="fleet", get:()=>+saved.speed||0, set:i=>{ saved.speed=i; save(); },
    say:"HOW FAST IT COMES AT YOU", vals:()=>SPEEDS.map(([n],i)=>[n.toUpperCase(), MULT_SPEED[i]])},
  {id:"torps", group:"game", label:"TORPEDOES", on:has("fleet"), get:()=>saved.kfTorps??0, set:i=>{ saved.kfTorps=i; save(); },
    vals:()=>[["PLENTY",1,"EVERY FLEET'S FULL LOAD OF TORPEDOES"],["FEWER",1.25,"A SIXTH FEWER TORPEDOES FOR EACH FLEET"],["FEW",1.5,"A THIRD FEWER TORPEDOES: CALL SHIPS EARLY"]]},
  {id:"density", group:"game", label:"NOTES AT ONCE", on:has("command"), get:()=>saved.hcDensity??1, set:i=>{ saved.hcDensity=i; save(); },
    say:"HOW MANY NOTES FALL TOGETHER", vals:()=>[["FEW",.8],["SOME",1],["MANY",1.25],["SWARM",1.5]]},
  {id:"paddle", group:"game", label:"PADDLE", on:has("breakout"), get:()=>saved.boPaddle??1, set:i=>{ saved.boPaddle=i; save(); },
    say:"HOW WIDE THE PADDLE IS", vals:()=>[["NARROW",1.3],["NORMAL",1],["WIDE",.8]]},
  {id:"guide", group:"game", label:"FIELD GUIDE", on:has("hunt"), get:()=>saved.hdGuide||0, set:i=>{ saved.hdGuide=i; save(); },
    vals:()=>[["NAMES",1,"THE KEY'S CHORDS BY NAME AND NUMERAL"],["NUMERALS",1.25,"THE KEY'S CHORDS BY NUMERAL ONLY"],["NONE",1.5,"NO GUIDE: KNOW THE KEY'S CHORDS YOURSELF"]]},
  {id:"aim", group:"game", label:"AIM", on:has("blaster","asteroids"), get:k=>(k==="asteroids" ? saved.asAim : saved.invAim)?1:0,
    set:(i,k)=>{ saved[k==="asteroids" ? "asAim" : "invAim"]=i; save(); },
    vals:k=>[["AUTO",1,"THE SHIP AIMS ITSELF AT THE CHORD YOU PLAY"],["MANUAL",2, k==="asteroids" ? "SPIN THE SHIP YOURSELF: A CHORD OR PLUCK FIRES WHERE IT POINTS" : "STEER UNDER A CHORD YOURSELF, THEN PLAY IT"]]},
  {id:"steer", group:"game", label:"STEER", on:has("racer"), get:()=>saved.krSteer?1:0, set:i=>{ saved.krSteer=i; save(); },
    vals:()=>[["HARP",1,"THE HARP'S TWELVE STRINGS ACROSS THE ROAD"],["KNOB",1.25,"A KNOB STEERS, THE HARP LEFT ALONE"]]},
  {id:"hold", group:"game", label:"CHORDS", on:has("chomp"), ...flag("ccHold"),
    vals:()=>[["LATCH",1,"A CHORD PLAYED ONCE STAYS ON TILL THE NEXT"],["HOLD",1.25,"A CHORD LASTS ONLY AS LONG AS IT'S HELD"]]},
  {id:"voicing", group:"game", label:"VOICING", on:has("burger"), get:()=>saved.bkAuto?0:1, set:i=>{ saved.bkAuto=!i; save(); },
    vals:()=>[["SET FOR ME",1,"THE GAME TURNS THE KNOBS TO EACH PLATE: YOU NAME THE CHORD"],["MINE",1.5,"YOU TURN THE KNOBS: VOICE EACH PLATE AS IT'S STACKED"]]},
  {id:"labels", group:"game", label:"LABELS", on:has("kong"), ...flag("dkNumerals"),
    vals:()=>[["NAMES",1,"EVERY BARREL, LOCK AND RIVET BY ITS CHORD'S NAME"],["NUMERALS",1.5,"BY NUMERAL IN THE KEY: WORK OUT EACH CHORD YOURSELF"]]},
  {id:"glow", group:"game", label:"CHORD GLOW", on:has("snake","stack"), get:()=>saved.noGlow?1:0, set:i=>{ saved.noGlow=!!i; save(); },
    vals:k=>[["ON",1, k==="snake" ? "CARRIED NOTES THAT SPELL A CHORD LIGHT UP" : "A ROW THAT HOLDS A CHORD LIGHTS UP"],["OFF",1.5,"NOTHING LIGHTS UP: SPOT THE CHORDS YOURSELF"]]},
  {id:"next", group:"game", label:"NEXT PIECE", on:has("stack"), ...flag("stNoNext"),
    vals:()=>[["SHOWN",1,"THE NEXT PIECE AND ITS NOTES, BESIDE THE WELL"],["HIDDEN",1.25,"NO PREVIEW: EACH PIECE IS A SURPRISE"]]},
  {id:"circle", group:"game", label:"CIRCLE", on:has("fifths"), ...flag("fdBare"),
    vals:()=>[["NAMED",1,"EVERY KEY NAMED ROUND THE RIM"],["BARE",1.5,"ONLY C NAMED: KNOW THE CIRCLE OF FIFTHS YOURSELF"]]},
  {id:"replays", group:"game", label:"REPLAYS", on:has("frets"), get:()=>saved.frReplays||0, set:i=>{ saved.frReplays=i; save(); },
    vals:()=>[["ANY",1,"HEAR EACH PAIR AGAIN AS OFTEN AS YOU LIKE"],["ONE",1.25,"ONE MORE LISTEN TO EACH PAIR"],["NONE",1.5,"EACH PAIR PLAYS ONCE"]]},
  {id:"timing", group:"game", label:"TIMING", on:has("sight"), get:()=>saved.slTight?1:0, set:i=>{ saved.slTight=!!i; save(); },
    vals:()=>[["LOOSE",1,"A NOTE COUNTS ANYWHERE IN THE WINDOW"],["TIGHT",1.5,"A NARROWER WINDOW: PLAY NEARER THE LINE"]]},
  {id:"modifier", group:"game", label:"MODIFIER", on:k=>MOD_GAMES.has(k) && canWrite(), get:()=>autoMod()?0:1, set:i=>{ saved.autoMod=!i; save(); },
    vals:()=>[["AUTO",1,"THE GAME SETS SHARP OR FLAT FOR THE CHORD YOU NEED NEXT"],["BY HAND",1.25,"YOU SET SHARP OR FLAT: DOUBLE-TAP THE MODIFIER"]]},
  {id:"buttons", group:"game", label:"BUTTONS", on:k=>k!=="command" && typeof playOnScreen==="function" && playOnScreen(), ...flag("tdBare"),
    set:i=>{ saved.tdBare=!!i; save(); if(typeof tdDraw==="function") tdDraw(); },
    vals:()=>[["LABELLED",1,"EACH CHORD BUTTON ON THE SCREEN SHOWS ITS CHORD"],["BARE",1.25,"THE SCREEN'S CHORD BUTTONS BLANK, AS ON THE INSTRUMENT"]]},
  {id:"strings", group:"game", label:"STRINGS", on:k=>harpOnScreen(k), ...flag("tdHarpBare"),
    set:i=>{ saved.tdHarpBare=!!i; save(); if(typeof tdDraw==="function") tdDraw(); },
    vals:k=>[["LABELLED",1,"EACH HARP STRING ON THE SCREEN SHOWS ITS NOTE"],["BARE",HARP_BY_NAME.has(k)?1.25:1,"THE SCREEN'S HARP STRINGS BLANK, AS ON THE INSTRUMENT"]]},
  {id:"beginner", group:"game", label:"BEGINNER", on:()=>true, get:()=>saved.beginner?1:0, set:i=>{ saved.beginner=!!i; save(); helperSync(true); },
    vals:()=>[["OFF",1,"PLAY IT STRAIGHT"],["ON",1,"THE MINICHORD ON SCREEN, LIT WITH WHAT TO PRESS. NO HIGH SCORES","UNRANKED"]]},
  // ----- the setup: how it looks, sounds and is steered
  {id:"harp", group:"setup", label:"HARP", on:k=>KM_GAMES.includes(k) || (saved.beginner && helpUsesHarp(k) && k!=="breakout"), get:harpLayoutIndex,
    set:i=>{ saved.harpLayout=HARP_LAYOUTS[i][1]; save(); if(KM_GAMES.includes(cabKind())) kmRestrip(); else helperSync(true); },
    vals:()=>[["STRIP",1,"THE STANDARD HARP: TWELVE STRINGS IN A LINE"],["GRID",1,"THE KEYMASTER'S FOUR ROWS OF THREE"],["D-PAD",1,"THE KEYMASTER AS A D-PAD"]]},
  {id:"harpAs", group:"setup", label:"HARP AS", on:k=>harpOnScreen(k), ...flag("tdPiano"),
    set:i=>{ saved.tdPiano=!!i; save(); if(typeof tdSync==="function") tdSync(); },
    vals:()=>[["STRINGS",1,"THE SCREEN'S HARP AS THE MINICHORD'S TWELVE STRINGS"],["PIANO",1,"THE SCREEN'S HARP AS AN OCTAVE OF PIANO KEYS, C TO B"]]},
  {id:"harpSound", group:"setup", label:"HARP SOUND", on:has("snake","stack","sweeper","racer","chomp","burger","kong"), get:()=>saved.harpSound??1,
    set:i=>{ saved.harpSound=i; save(); if(blast && blast.setupDone) kmHarp(); },
    say:"THE HARP STEERS HERE: HOW MUCH OF IT YOU HEAR", vals:()=>[["NORMAL",1],["QUIET",1],["OFF",1]]},
  {id:"knob", group:"setup", label:"KNOB", on:k=>knobsReady() && (has("breakout","fifths","stack","asteroids","sight","burger","kong")(k) || (k==="blaster" && saved.invAim) || (k==="racer" && saved.krSteer)),
    get:()=>steerKnob(), set:i=>{ saved.steerKnob=i; save(); }, say:"WHICH OF THE MINICHORD'S KNOBS STEERS", vals:()=>KNOB_NAMES.map(n=>[n,1])},
  {id:"size", group:"setup", label:k=>k==="command" ? "NOTE SIZE" : "LABEL SIZE", on:has("blaster","asteroids","breakout","command"), get:()=>saved.chordSize??1,
    set:i=>{ saved.chordSize=i; save(); applyChordSize(); }, say:"HOW BIG THE LETTERING IS", vals:()=>SIZES.map(([n])=>[n,1])},
  {id:"sound", group:"setup", label:"SOUND", on:()=>canWrite(), get:()=>saved.arcadeSound==="mine"?1:0, set:i=>{ saved.arcadeSound=i?"mine":"clean"; save(); },
    vals:()=>[["CLEAN",1,"NO VIBRATO OR DELAY WHILE YOU PLAY, SO EVERY CHORD IS STEADY"],["MY PRESET",1,"YOUR PRESET'S OWN VIBRATO AND DELAY (GLIDE STAYS OFF)"]]},
  {id:"crt", group:"setup", label:"SCREEN", on:()=>true, ...flag("crt"), set:i=>{ saved.crt=!!i; save(); crtSync(); },
    vals:()=>[["FLAT",1,"A PLAIN, SHARP PICTURE"],["CRT",1,"AN OLD MONITOR: SCANLINES, GLOW AND ROUNDED CORNERS"]]},
  // ----- the arcade's own, in the settings dialog
  {id:"sounds", group:"arcade", label:"SOUNDS", on:()=>true, get:()=>settings.sounds?0:1, set:i=>{ settings.sounds=!i; save(); },
    say:"THE CABINET'S OWN SOUNDS", vals:()=>[["ON",1],["OFF",1]]},
  {id:"full", group:"arcade", label:"FULL SCREEN", on:()=>true, get:()=>FS_MODES.indexOf(fsMode()), set:i=>fsModeSet(i),
    vals:()=>[["AUTO",1,"THE CABINET, OR PLAIN WHERE THE GRAPHICS CAN'T KEEP UP"],["CABINET",1,"ALWAYS THE CABINET: BEZEL, MARQUEE AND CRT"],["PLAIN",1,"ALWAYS PLAIN: THE SCREEN ALONE, FLAT"]]},
  {id:"bonus", group:"arcade", label:"BONUS ROUNDS", on:()=>true, get:()=>saved.bonus===false?1:0, set:i=>{ saved.bonus=!i; save(); },
    say:"A MINI-GAME EVERY TWO LEVELS, FOR POINTS ONLY", vals:()=>[["ON",1],["OFF",1]]},
  {id:"tap", group:"arcade", label:"DOUBLE TAP", on:()=>true, get:()=>settings.modTap==="off"?1:0, set:i=>{ settings.modTap=i?"off":"on"; save(); if(!i) modTap(); },
    vals:()=>[["FLIPS",1,"A DOUBLE TAP ON THE MODIFIER FLIPS SHARP AND FLAT"],["MY PRESET",1,"THE DOUBLE TAP DOES WHAT YOUR PRESET SAYS"]]},
];
const optLabel=(o,k)=> typeof o.label==="function" ? o.label(k) : o.label;
const optsFor=(k, groups)=> ARCADE_OPTS.filter(o=>groups.includes(o.group) && o.on(k));
function diffMult(kind=cabKind()){
  let m=1;
  for(const o of optsFor(kind, ["game"])){ const v=o.vals(kind)[o.get(kind)]; if(v) m*=v[1]; }
  return Math.round(m*100)/100;
}
// a menu's matrix changed: the menu again, so its level names follow
function optsMenuAgain(){ if(blast && blast.menuAgain && blast.overlay && ["menu","over"].includes(blast.phase)) menuRebuild(blast.menuAgain); }
const mulPts=p=>Math.round(p*(blast.mult||1));
const multTag=()=> blast && blast.mult && blast.mult!==1 ? ` ×${blast.mult}` : "";
// what each game's things are worth at level 1 (all of it times the level)
const POINTS_FOR={
  blaster:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["SLASH CHORD","× 1.5"], ["★ CHORD","× 5"], ["KEY SET","25"], ["BY THE BEAM","THE SAME"], powerRow(POWERS)],
  command:()=>[["NOTE","10"],["★ NOTE","50"],powerRow(HC_POWERS)],
  snake:[["CHORD CASHED IN","15 A NOTE"],["★ NOTE","50"],["NOTE DROPPED","−5"]],
  asteroids:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["★ ROCK","× 3"], ["NOTE SHOT","10"], ["CHORD CLEARED","25"], powerRow(AS_POWERS)],
  stack:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,`${v} A NOTE`,sp]), ["ITS NOTES SIDE BY SIDE","× 2"], ["A WHOLE ROW OF ONE CHORD","× 5"], ["CHORDS AT ONCE","× CHORDS"]],
  breakout:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["SLASH CHORD","× 1.5"], ["★ BRICK","× 5"], ["RALLY","UP TO × 4"], ["ARPEGGIO TONE SHOT","20"], ["WHOLE CHORD SHOT","× 2"], ["CODA","50 A BRICK, DRAINING"], powerRow(BO_POWERS, "CAPSULES")],
  fifths:[["ENEMY","10"],["HIT FAR OUT","UP TO +10"],["★ ENEMY","50"]],
  sight:[["NOTE READ","10"],["DEAD ON THE LINE","× 2"],["STREAK","UP TO × 4"],["A TUNE READ","100"]],
  frets:[["RIGHT BY EAR","20"],["FOUND IT WITH THE MODIFIER","30"]],
  sweeper:[["SQUARE SWEPT","5"],["MINE DEFUSED","100"],["SQUARES LEFT UNSWEPT","+2 EACH"],["QUICK CLEAR","UP TO +270"]],
  fleet:[["HIT","10"],["SHIP SUNK","50 A CHORD"],["SUNK BY DEDUCTION","+40 A CHORD UNHIT"],["NO MISSES","× 2"],["TORPEDO LEFT OVER","20"]],
  chopper:()=>[["RESCUE","20"],["FAST RESCUE","UP TO +30"],["WAYPOINT","15"],["WHOLE ROUTE","× 2"],["WRONG PLACE","−2 SECONDS"],powerRow(CH_POWERS)],
  hunt:()=>[["DUCK","20"],["QUICK SHOT","UP TO +30"],["FIRST SHOT","× 2"],["PURE EAR","UP TO × 4"],["GOLDEN DUCK","× 3"],["WHOLE FLOCK","+25 A DUCK"],["PERFECT ROUND","100"],["KEY SET YOURSELF","50"],powerRow(HD_POWERS)],
  racer:()=>[["GATE OF THE KEY","10"],["GATE PLAYED OPEN","20"],["PIVOT CHORD","× 2"],["CAR PULLED OVER","30"],["CAR OVERTAKEN","10"],["TURBO","15"],["CHECKPOINT, HOME PLAYED","50"],["FINISH","50 A PLACE ABOVE 9TH"],["TIME LEFT","10 A SECOND"],powerRow(KR_POWERS, "CAPSULES")],
  chomp:()=>[["DOT","10"],["POWER PELLET","50"],["GHOST CAUGHT","200, 400, 800, 1600"],["HALF CADENCE","200"],["PLAGAL OR DECEPTIVE","300"],["PERFECT CADENCE","500"],["FULL CADENCE","1500"],["KEY SET","500, +250 A FIFTH"],powerRow(CC_POWERS, "CAPSULES")],
  burger:()=>[["INGREDIENT DROPPED","50"],["SOUR NOTE SQUASHED","500"],["RIDDEN DOWN","1000, 2000, 4000, 8000"],["PLATE SERVED","500, 800 A SEVENTH"],["NOT IN ROOT POSITION","× 1.5"],["AN OPEN VOICING","× 2"],["SERVED HOT","× 1.5"],["TICKET FILLED","1000"],["SOUR NOTES PEPPERED","100, 200, 400"],["COMBO MEAL","1500"],["KEY SET","500, +250 A FIFTH"],["KITCHEN CLEAR","1000, +100 A SHAKE LEFT"],powerRow(BK_POWERS, "BONUS FOOD")],
  kong:[["BARREL JUMPED","100"],["BARREL RESOLVED","300, DOUBLING"],["DECEPTIVE RESOLUTION","500"],["FIREBALL PUT OUT","500"],["HAMMER","300 A BARREL"],["A LOCK OPENED","200"],["THE WHOLE CHAIN","500 A LINK"],["RIVET PULLED","200"],["KEY SET","500, +250 A FIFTH"],["BONUS LEFT","PAID AT THE END"]],
};
// the POINTS page's line for a game's power-ups (or capsules): their icons, then their names
const powerRow=(table, word="POWER-UPS")=>{ const P=Object.values(table); return [P.map(p=>p.icon).join(" ")+" "+word, P.map(p=>p.name).join(" · ")]; };
function multRows(kind){
  return optsFor(kind, ["game"]).map(o=>[optLabel(o,kind), o.vals(kind)]).filter(([,v])=>v.some(x=>x[1]!==1))
    .map(([n,v])=>[n, v.map(([t,x])=>`${t} ×${x}`)]);
}
// the points screen in the title loop: the table filling in line by line, then the multipliers
const pointsFor=k=>{ const p=POINTS_FOR[k]; return typeof p==="function" ? p() : (p||[]); };
// The power-ups a game has, for the title screen's POWER-UPS page: each drawn as it looks in the game,
// its name and what it does. A game without any skips the page.
const POWERS_FOR={
  blaster:()=>Object.entries(POWERS).map(([k,P])=>({look:`<span class="fchord power pu-${k}"><i class="puicon">${P.icon}</i>C</span>`, name:P.name, text:P.page})),
  command:()=>Object.entries(HC_POWERS).map(([k,P])=>({look:`<span class="fchord fnote power pu-${k}">${hcPowerLook(k,"E")}</span>`, name:P.name, text:P.page})),
  asteroids:()=>Object.entries(AS_POWERS).map(([k,P])=>({look:`<span class="fchord power pu-${k}">${asPowerLook(k,"F")}</span>`, name:P.name, text:P.page})),
  breakout:()=>[{look:`<span class="bobrick power row1 pwbrick">G</span>`, name:"ARPEGGIO", text:"A GLOWING BRICK: BREAK IT AND ITS CHORD'S TONES RAIN DOWN, THE PADDLE A CANNON. PLUCK EACH TONE ON THE HARP FOR A BONUS, ALL OF THEM FOR THE WHOLE CHORD."},
    ...Object.entries(BO_POWERS).map(([k,P])=>({look:boCapLook(k), name:P.name, text:P.page}))],
  chopper:()=>Object.entries(CH_POWERS).map(([k,P])=>({look:chCrateLook(k,"F"), name:P.name, text:P.page})),
  hunt:()=>Object.entries(HD_POWERS).map(([k,P])=>({look:hdTagLook(k,"G"), name:P.name, text:P.page})),
  racer:()=>Object.entries(KR_POWERS).map(([k,P])=>({look:krPowerLook(k), name:P.name, text:P.page})),
  chomp:()=>Object.entries(CC_POWERS).map(([k,P])=>({look:ccPowerLook(k), name:P.name, text:P.page})),
  burger:()=>Object.entries(BK_POWERS).map(([k,P])=>({look:bkPowerLook(k), name:P.name, text:P.page})),
};
const powersFor=k=> POWERS_FOR[k] ? POWERS_FOR[k]() : [];
function powersRender(el){
  let i=0; const d=()=>`style="animation-delay:${(i++)*.6}s"`;
  el.innerHTML=`<h3>POWER-UPS</h3><p class="ptsub">${cabKind()==="blaster" ? "PLAY A POWER-UP'S CHORD TO TAKE IT" : cabKind()==="command" ? "PLUCK A POWER-UP'S STRING TO TAKE IT" : cabKind()==="asteroids" ? "CRACK A POWER-UP ROCK WITH ITS CHORD TO TAKE IT" : cabKind()==="breakout" ? "BREAK A BRICK THAT HOLDS ONE AND CATCH ITS CAPSULE" : cabKind()==="chopper" ? "PLAY A SUPPLY CRATE'S CHORD TO FLY OUT FOR IT" : cabKind()==="hunt" ? "THE DOG FETCHES THEM: PLAY THE CHORD ON THE TAG" : cabKind()==="racer" ? "CAPSULES ON THE ROAD: DRIVE THROUGH ONE TO TAKE IT" : cabKind()==="chomp" ? "CAPSULES IN THE MAZE: RUN THROUGH ONE TO TAKE IT" : cabKind()==="burger" ? "BONUS FOOD IN THE KITCHEN: WALK THROUGH IT TO TAKE IT" : cabKind()==="kong" ? "THE HAMMER, UP IN THE AIR: JUMP TO IT" : "THEY TURN UP NOW AND THEN"}</p>
    <ul class="pwtable">${powersFor(cabKind()).map(p=>`<li ${d()}><span class="pwlook">${p.look}</span><div><b>${p.name}</b><em>${p.text}</em></div></li>`).join("")}</ul>`;
}
// The lives, as pixel hearts in the HUD: a full heart for each life left, a dark empty one for each
// lost (up to the most this game has had), the one just lost shaking as it drains and one just won
// (DA CAPO, in powers.js) popping in. Every game's HUD uses this, so lives look the same everywhere.
const HEART_OUT="M0 2h1v1h-1zM0 3h1v1h-1zM0 4h1v1h-1zM0 5h1v1h-1zM0 6h1v1h-1zM1 1h1v1h-1zM1 2h1v1h-1zM1 6h1v1h-1zM1 7h1v1h-1zM2 0h1v1h-1zM2 1h1v1h-1zM2 7h1v1h-1zM2 8h1v1h-1zM3 0h1v1h-1zM3 8h1v1h-1zM3 9h1v1h-1zM4 0h1v1h-1zM4 9h1v1h-1zM4 10h1v1h-1zM5 0h1v1h-1zM5 1h1v1h-1zM5 10h1v1h-1zM5 11h1v1h-1zM6 1h1v1h-1zM6 2h1v1h-1zM6 11h1v1h-1zM7 0h1v1h-1zM7 1h1v1h-1zM7 10h1v1h-1zM7 11h1v1h-1zM8 0h1v1h-1zM8 9h1v1h-1zM8 10h1v1h-1zM9 0h1v1h-1zM9 8h1v1h-1zM9 9h1v1h-1zM10 0h1v1h-1zM10 1h1v1h-1zM10 7h1v1h-1zM10 8h1v1h-1zM11 1h1v1h-1zM11 2h1v1h-1zM11 6h1v1h-1zM11 7h1v1h-1zM12 2h1v1h-1zM12 3h1v1h-1zM12 4h1v1h-1zM12 5h1v1h-1zM12 6h1v1h-1z", HEART_FILL="M1 3h1v1h-1zM1 4h1v1h-1zM1 5h1v1h-1zM2 2h1v1h-1zM2 3h1v1h-1zM2 4h1v1h-1zM2 5h1v1h-1zM2 6h1v1h-1zM3 1h1v1h-1zM3 2h1v1h-1zM3 5h1v1h-1zM3 6h1v1h-1zM3 7h1v1h-1zM4 1h1v1h-1zM4 2h1v1h-1zM4 4h1v1h-1zM4 5h1v1h-1zM4 6h1v1h-1zM4 7h1v1h-1zM4 8h1v1h-1zM5 2h1v1h-1zM5 3h1v1h-1zM5 4h1v1h-1zM5 5h1v1h-1zM5 6h1v1h-1zM5 7h1v1h-1zM5 8h1v1h-1zM5 9h1v1h-1zM6 3h1v1h-1zM6 4h1v1h-1zM6 5h1v1h-1zM6 6h1v1h-1zM6 7h1v1h-1zM6 8h1v1h-1zM6 9h1v1h-1zM6 10h1v1h-1zM7 2h1v1h-1zM7 3h1v1h-1zM7 4h1v1h-1zM7 5h1v1h-1zM7 6h1v1h-1zM7 7h1v1h-1zM7 8h1v1h-1zM7 9h1v1h-1zM8 1h1v1h-1zM8 2h1v1h-1zM8 3h1v1h-1zM8 4h1v1h-1zM8 5h1v1h-1zM8 6h1v1h-1zM8 7h1v1h-1zM8 8h1v1h-1zM9 1h1v1h-1zM9 2h1v1h-1zM9 3h1v1h-1zM9 4h1v1h-1zM9 5h1v1h-1zM9 6h1v1h-1zM9 7h1v1h-1zM10 2h1v1h-1zM10 3h1v1h-1zM10 4h1v1h-1zM10 5h1v1h-1zM10 6h1v1h-1zM11 3h1v1h-1zM11 4h1v1h-1zM11 5h1v1h-1z", HEART_SHINE="M3 3h1v1h-1zM3 4h1v1h-1zM4 3h1v1h-1z";
const heartSvg=(full, lost, won)=>`<svg class="heart${full?"":" gone"}${lost?" lost":""}${won?" won":""}" viewBox="0 0 13 12" shape-rendering="crispEdges" aria-hidden="true"><path class="out" d="${HEART_OUT}"/><path class="fill" d="${HEART_FILL}"/>${full?`<path class="shine" d="${HEART_SHINE}"/>`:""}</svg>`;
function livesHtml(){
  const n=Math.max(0, blast.lives||0), now=performance.now();
  if(blast.livesGen!==blast.gen){ blast.livesGen=blast.gen; blast.livesMax=0; blast.livesShown=null; blast.lifeLostAt=blast.lifeWonAt=0; }   // a new game: the hearts it starts with
  blast.livesMax=Math.max(blast.livesMax||0, n);
  if(blast.livesShown!=null && n<blast.livesShown) blast.lifeLostAt=now;
  if(blast.livesShown!=null && n>blast.livesShown) blast.lifeWonAt=now;
  blast.livesShown=n;
  const lost=!!blast.lifeLostAt && now-blast.lifeLostAt<1200, won=!!blast.lifeWonAt && now-blast.lifeWonAt<1200;
  return [...Array(blast.livesMax)].map((_,i)=>heartSvg(i<n, lost && i===n, won && i===n-1)).join("") || "-";
}
function pointsRender(el){
  const k=cabKind(), pts=pointsFor(k), long=pts.length>6;
  let i=0; const d=()=>`style="animation-delay:${(i++)*(long?.28:.45)}s"`;
  el.innerHTML=`<h3>POINTS</h3><ul class="ptable${long?" long":""}">${pts.map(([a,b,sp])=>`<li ${d()}><span>${a}</span>${sp?`<em class="pspell">${sp}</em>`:""}<i></i><b>${b}</b></li>`).join("")}<li class="ptnote" ${d()}>ALL TIMES THE LEVEL</li></ul>
    ${multRows(k).length?`<p class="ptsub" ${d()}>HARDER PLAY SCORES MORE</p>`:""}<ul class="ptable mult">${multRows(k).map(([n,list])=>`<li ${d()}><span>${n}</span><em>${list.join(" · ")}</em></li>`).join("")}</ul>`;
}
// The options as a list, one line each: its name, its value between arrows, and what it scores. A tap
// or click on a line steps to the next value, on the left arrow back; on the keyboard ↑ ↓ move between
// lines and ← → change one. The game's lines come first under the score they make, the setup's after,
// and one line at the foot says what the value chosen means. Lines that depend on another (the harp's
// layout on beginner mode, say) come and go as it changes.
//   groups   which groups to show: ["game","setup"] on the title, ["game"] at game over, all three in
//            the settings dialog
const OPT_HEAD={game:"GAME", setup:"SETUP", arcade:"ARCADE"};
const optTag=(v)=> v[3] || (v[1]!==1 ? `×${v[1]}` : "");
function arcadeOpts(groups){
  const box=document.createElement("div"); box.className="opts";
  const list=document.createElement("div"); list.className="optlist";
  const hint=document.createElement("p"); hint.className="opthint";
  const idle=()=> playOnScreen() ? "TAP AN OPTION TO CHANGE IT" : "CLICK AN OPTION TO CHANGE IT, OR USE THE ARROW KEYS";
  hint.textContent=idle();
  box.append(list, hint);
  const k=()=>cabKind() || settings.mode;
  const say=o=>{ const v=o.vals(k())[o.get(k())]; hint.textContent = v ? `${v[0]}: ${v[2] || o.say || ""}` : idle(); };
  const render=()=>{
    const kind=k(), had=document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.opt : null;
    list.innerHTML="";
    groups.forEach(gr=>{
      const os=optsFor(kind, [gr]); if(!os.length) return;
      const h=document.createElement("div"); h.className="opthead";
      h.innerHTML=`<span>${OPT_HEAD[gr]}</span>${gr==="game" ? `<b>${saved.beginner ? "UNRANKED" : `SCORE ×${diffMult(kind)}`}</b>` : ""}`;
      list.appendChild(h);
      os.forEach(o=>{
        const vs=o.vals(kind), i=Math.max(0, Math.min(vs.length-1, o.get(kind))), v=vs[i], b=document.createElement("button");
        b.type="button"; b.className="opt"; b.dataset.opt=o.id;
        const tag=optTag(v);
        b.innerHTML=`<span class="ol">${optLabel(o,kind)}</span><span class="ov"><i class="arr prev" aria-hidden="true"></i><b>${v[0]}</b><i class="arr next" aria-hidden="true"></i></span><span class="ox${v[3]?" warn":""}">${tag}</span>`;
        b.setAttribute("aria-label", `${optLabel(o,kind)}: ${v[0]}${tag?`, ${tag}`:""}. ${vs.length} choices`);
        const step=d=>{ o.set(((i+d)%vs.length+vs.length)%vs.length, kind); sfx("press"); render(); const n=list.querySelector(`[data-opt="${o.id}"]`); if(n) n.focus({preventScroll:true}); say(o); };
        // a click on the left arrow (or just short of it) steps back; anywhere else, and Enter, on
        b.onclick=e=>{ e.stopPropagation(); const a=b.querySelector(".prev").getBoundingClientRect(); step(e.detail && e.clientX<a.right+8 && e.clientX>a.left-16 ? -1 : 1); };
        b.addEventListener("keydown", e=>{
          if(e.code==="ArrowLeft" || e.code==="ArrowRight"){ e.preventDefault(); e.stopPropagation(); step(e.code==="ArrowLeft" ? -1 : 1); }
          else if(e.code==="ArrowUp" || e.code==="ArrowDown"){ e.preventDefault(); e.stopPropagation();
            const all=[...list.querySelectorAll(".opt")], at=all.indexOf(b), n=all[at+(e.code==="ArrowUp"?-1:1)]; if(n) n.focus(); }
        });
        b.addEventListener("focus", ()=>say(o)); b.addEventListener("mouseenter", ()=>say(o));
        list.appendChild(b);
      });
    });
    if(had){ const n=list.querySelector(`[data-opt="${had}"]`); if(n) n.focus({preventScroll:true}); }
  };
  box.refresh=render;
  render();
  return box;
}
// every list on the page drawn again: what's offered depends on the minichord (a modifier, knobs, the
// screen's own buttons), so when that changes, and when the options page comes up
const optsRefresh=()=>document.querySelectorAll(".opts").forEach(b=>b.refresh && b.refresh());
mc.addEventListener("device", optsRefresh);
mc.addEventListener("status", optsRefresh);
// an option set from outside the list (the minichord's minor row sets the speed): set, and shown
function optSet(id, i){
  const o=ARCADE_OPTS.find(x=>x.id===id), k=cabKind(); if(!o || !o.on(k) || i>=o.vals(k).length) return false;
  o.set(i, k); optsRefresh(); return true;
}


// ---------- an arcade game's own settings ----------
// On an arcade game's page the settings button opens the arcade's settings, not the Practice Room's:
// every option the game offers (ARCADE_OPTS), its title screen's and the arcade's own: sounds, full
// screen, bonus rounds and the double tap. Everything is saved and shared with the title screens'
// options; the game's options apply from the next game, with the score multiplier they give.
function arcadeSettings(){
  const k=settings.mode, dlg=document.createElement("dialog"); dlg.id="arcadeDlg"; dlg.className="arcadedlg";
  dlg.innerHTML=`<h2>${LABELS[k].toUpperCase()} · SETTINGS</h2><p class="anote">THE GAME'S OPTIONS APPLY FROM THE NEXT GAME</p><div class="aend"><button type="button" class="aclose">DONE</button></div>`;
  const opts=arcadeOpts(["game","setup","arcade"]);
  dlg.insertBefore(opts, dlg.querySelector(".aend"));
  // the title screen behind shows the same options: it follows what's changed here
  dlg.querySelector(".aclose").onclick=()=>dlg.close();
  dlg.addEventListener("close", optsRefresh);
  dlg.addEventListener("click", e=>{ if(e.target===dlg) dlg.close(); });   // a click outside closes it
  document.body.appendChild(dlg);
  return dlg;
}


// ---------- the bezel's buttons: reset and sound ----------
// Top right of the cabinet's bezel, across from the modifier pill: a RESET button like the old
// console's, a plain dark rectangle, and a sound button with a speaker that shows whether it's on.
// Reset starts the game afresh, from a cold boot: the screen fills with garbage, a RAM check runs,
// the ROMs are counted and the minichord looked for, and then the game's title comes up.
const SPEAKER_ON='<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 5h3v4H1zM4 4h1v6H4zM5 3h1v8H5zM6 2h1v10H6zM9 5h1v4H9zM11 3h1v8h-1zM13 1h1v12h-1z"/></svg>';
const SPEAKER_OFF='<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 5h3v4H1zM4 4h1v6H4zM5 3h1v8H5zM6 2h1v10H6z"/><path fill="#FF4B3E" d="M9 4h1v1H9zM10 5h1v1h-1zM11 6h1v2h-1zM12 5h1v1h-1zM13 4h1v1h-1zM10 8h1v1h-1zM9 9h1v1H9zM12 8h1v1h-1zM13 9h1v1h-1z"/></svg>';
function bezelButtons(){
  const box=document.createElement("div"); box.className="bezelctl";
  box.innerHTML=`<div class="nesbtn"><span>SOUND</span><button type="button" id="muteBtn"></button></div>
    <div class="nesbtn"><span>RESET</span><button type="button" id="resetBtn" aria-label="Reset: start the game afresh"></button></div>
    <div class="nesbtn"><span>SCREEN</span><button type="button" id="fullBtn"></button></div>`;
  document.querySelector("section.game .gamebar").appendChild(box);
  const mute=box.querySelector("#muteBtn");
  const draw=()=>{ mute.innerHTML = settings.sounds ? SPEAKER_ON : SPEAKER_OFF; mute.classList.toggle("off", !settings.sounds);
    mute.setAttribute("aria-label", settings.sounds ? "Sound on: turn it off" : "Sound off: turn it on"); mute.title = settings.sounds ? "Sound on" : "Sound off"; };
  mute.onclick=()=>{ settings.sounds=!settings.sounds; save(); soundButton(); draw(); if(settings.sounds){ piano.start(); sfx("press"); } };
  draw();
  box.querySelector("#resetBtn").onclick=()=>coldBoot();
  box.querySelector("#fullBtn").onclick=()=>fullToggle(); fullLabels();
}
function coldBoot(){
  if(!blast || !blast.field || blast.booting) return;
  // whatever game over was doing ends here: the GAME OVER splash, the initials and their countdown
  clearTimeout(blast.splashT); if(blast.hsEntry && blast.hsEntry.cancel) blast.hsEntry.cancel();
  blast.field.querySelectorAll(".hssplash, .hsentry").forEach(e=>e.remove());
  const field=blast.field; blast.booting=true;
  stopDemo(); cancelAnimationFrame(blast.raf);
  const el=document.createElement("div"); el.className="boot"; field.appendChild(el);
  const glyphs="▓▒░█▄▀■□▪◘◙♠♣♥♦•○◊¤§¶ABCDEF0123456789@#$%&*+=?";
  const cols=[ "#FF4B3E","#7FE9FF","#FFD35A","#F1E8D2","#FF5AA0","#6FA7D8","#7FBF6A" ];
  const garbage=()=>{ let h=""; for(let r=0;r<22;r++){ let line=""; for(let c=0;c<46;c++) line+= Math.random()<.18 ? " " : glyphs[Math.floor(Math.random()*glyphs.length)];
    h+=`<div style="color:${cols[Math.floor(Math.random()*cols.length)]}">${line}</div>`; } return h; };
  const hex=n=>Math.floor(Math.random()*16**n).toString(16).toUpperCase().padStart(n,"0");
  const lines=[
    "MINICHORD ARCADE SYSTEM  REV 3.1",
    "(C) THE KEY & CABLE CO.",
    "",
    `RAM CHECK  0000-7FFF ... <b>OK</b>`,
    `ROM CHECK  ${ARCADE_GAMES.length}/${ARCADE_GAMES.length}  SUM ${hex(4)} ... <b>OK</b>`,
    `SOUND .............. <b>${settings.sounds?"OK":"MUTED"}</b>`,
    `MIDI ............... <b>${canWrite()?"MINICHORD FOUND":"NO MINICHORD"}</b>`,
    "",
    `LOADING ${LABELS[settings.mode].toUpperCase()} …`,
  ];
  sfx("attract");
  let t=0; const tick=()=>{
    if(!el.isConnected) return;
    t++;
    if(t<=12){ el.innerHTML=`<pre class="garbage">${garbage()}</pre>`; setTimeout(tick, 75); return; }   // the screen full of rubbish, most of a second
    if(t===13){ el.innerHTML='<div class="bootlines"></div>'; }
    const box=el.querySelector(".bootlines"), i=t-13;
    if(i<lines.length){ const d=document.createElement("div"); d.innerHTML=lines[i]||"&nbsp;"; box.appendChild(d); if(/OK|FOUND/.test(lines[i])) sfx("press"); setTimeout(tick, i<2?220:320); return; }
    setTimeout(()=>{ el.remove(); if(blast) blast.booting=false; stopBlaster(); nextQuestion(); fsAdopt(); sfx("start"); }, 700);
  };
  tick();
}

// ---------- game over, then back to the title loop ----------
// Left alone, a game over screen goes back to the title, rules, board and demo after a while, as a
// cabinet does. Not while initials are being entered, and not once the player has started again.
function overTimeout(ov, toTitle){
  clearTimeout(blast.overT);
  blast.overT=setTimeout(()=>{
    if(!blast || blast.overlay!==ov || blast.phase!=="over" || blast.hsEntry) return;
    ov.remove(); blast.overlay=null; blast.phase="menu"; toTitle();
  }, 25000);
}

// ---------- high scores ----------
// Every arcade game keeps a board of the ten best, shown in the title loop after the rules, and
const HS_SECONDS=20;        // the countdown on the initials, as a cabinet has
// entered arcade-style at game over: three initials picked with the arrow keys, the harp's d-pad or
// the steering knob, confirmed with a chord or Enter. Scores count only when a minichord was
// connected and played through the game. They go to the shared board (arcade-scores on the
// flask-stack, reached through Tailscale Funnel) and to this browser's own board, which is also
// what's shown if the shared one can't be reached.
const SCORES_API=String(SCORES_HOST||"").replace(/\/+$/,"");   // the Funnel address of arcade-scores (core/scores.js), no trailing slash
const scoresOnline=()=> !!SCORES_API && !SCORES_API.includes("SCORES-HOST");
const HS_SLUG={blaster:"invaders", command:"harp-command", snake:"chord-snake", asteroids:"chord-asteroids", stack:"chord-stack", breakout:"chord-breakout", fifths:"fifths-defender", chopper:"chopper-rescue", fleet:"key-fleet", sweeper:"chord-sweeper", frets:"between-the-frets", sight:"sight-line", hunt:"chord-hunt", racer:"key-racer", chomp:"chord-chomp", burger:"chord-burger", kong:"dominant-kong"};
const HS_CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const hsCache={};                                        // the shared boards, as last fetched
const hsSlug=()=> HS_SLUG[cabKind()];
const hsLocal=slug=> (saved.hiscores && saved.hiscores[slug]) || [];
function hsFetch(slug, force){
  const c=hsCache[slug];
  if(!scoresOnline()) return Promise.resolve(null);
  if(c && !force && performance.now()-c.at<60000) return Promise.resolve(c.scores);
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),4000);
  return fetch(`${SCORES_API}/api/scores/${slug}`,{signal:ctl.signal}).then(r=>r.ok?r.json():null).then(j=>{ clearTimeout(t); if(j){ hsCache[slug]={at:performance.now(), scores:j.scores}; return j.scores; } return null; }).catch(()=>{ clearTimeout(t); return null; });
}
// the board to show: the shared one if it answered, otherwise this browser's
async function hsBoard(slug){ const g=await hsFetch(slug); return g ? {scores:g, shared:true} : {scores:hsLocal(slug), shared:false}; }
// a score counts when a minichord was connected and played through the game
function hsEligible(){ return !!(blast && canWrite() && !blast.helped && (blast.midiIn||0)>=5 && blast.score>0); }
const hsSeconds=()=> Math.round((performance.now()-(blast.startedAt||performance.now()))/1000);
// at game over: offer the initials entry if the score makes the board; next() shows the game over screen
function hsOffer(next){
  if(!blast || blast.hsDone) return false;
  blast.hsDone=true;
  if(!hsEligible()){ blast.hsNote = !canWrite() ? "CONNECT A MINICHORD TO PUT SCORES ON THE BOARD" : blast.helped ? "BEGINNER MODE WAS ON: THIS ONE STAYS OFF THE BOARD" : ""; return false; }
  const slug=hsSlug(), score=blast.score;
  hsBoard(slug).then(({scores})=>{
    if(!blast || blast.phase!=="over") return;
    const makes = scores.length<10 || score>scores[scores.length-1].score;
    if(!makes){ next(); return; }
    gameOverSplash(score, ()=>hsEntry(slug, score, next));
  });
  return true;
}
// Before the initials: GAME OVER, the final score and level, held for a few seconds while nothing the
// player does counts, so the chord or knob turn still in their hands when they lost can't set a letter.
function gameOverSplash(score, then){
  const ov=document.createElement("div"); ov.className="overlay hssplash";
  ov.innerHTML=`<h3 class="over">GAME OVER</h3><p class="hsfinal">${score.toLocaleString("en-US")}</p><p>LEVEL ${blast.level+1}</p><p class="hsnext">…</p>`;
  blast.field.appendChild(ov); sfx("over");
  gameLater(()=>{ if(blast && blast.phase==="over"){ const n=ov.querySelector(".hsnext"); n.textContent="NEW HIGH SCORE!"; n.classList.add("blink"); sfx("bonus"); } }, 1800);
  blast.splashT=setTimeout(()=>{ ov.remove(); if(blast && blast.phase==="over") then(); }, 3600);
}
function hsEntry(slug, score, next){
  const ov=document.createElement("div"); ov.className="overlay hsentry";
  const letters=(saved.hsInitials||"AAA").split("");
  ov.innerHTML=`<h3>NEW HIGH SCORE!</h3><p class="hsscore">${score.toLocaleString("en-US")}</p><p>ENTER YOUR INITIALS</p><div class="hsletters">${letters.map(()=>"<span></span>").join("")}</div>
    <p class="hscount"><i>${HS_SECONDS}</i></p>
    <p class="padhint">▲▼, A KNOB OR THE HARP PICKS A LETTER · ◀▶ MOVES · A CHORD OR ENTER SETS IT</p>
    <button type="button" class="hsno">NO THANKS · DON'T SEND MY SCORE</button>
    <p class="padhint">LEFT ALONE, IT ISN'T SENT</p>`;
  blast.field.appendChild(ov);
  const st={letters, pos:0, ov, done:false};
  // A cabinet's countdown: left alone, the entry goes and the score isn't sent; anything the player
  // does puts the full time back. NO THANKS (or Escape) declines at once.
  let left=HS_SECONDS;
  const num=ov.querySelector(".hscount i");
  const tick=()=>{
    if(st.done) return;
    left--; num.textContent=Math.max(0,left);
    ov.querySelector(".hscount").classList.toggle("low", left<=5);
    if(left<=5 && left>0) sfx("press");
    if(left<=0){ clearInterval(st.timer); skip("TIME UP: SCORE NOT ENTERED"); }
  };
  st.timer=setInterval(tick, 1000);
  const keepAlive=()=>{ left=HS_SECONDS; num.textContent=left; ov.querySelector(".hscount").classList.remove("low"); };
  const draw=()=>{ [...ov.querySelectorAll(".hsletters span")].forEach((e,i)=>{ e.textContent=st.letters[i]; e.classList.toggle("on", i===st.pos); }); };
  const step=d=>{ if(!settled()) return; keepAlive(); const i=HS_CHARS.indexOf(st.letters[st.pos]); st.letters[st.pos]=HS_CHARS[mod(i+d, HS_CHARS.length)]; sfx("press"); draw(); };
  const move=d=>{ if(!settled()) return; keepAlive(); st.pos=Math.max(0,Math.min(2,st.pos+d)); draw(); };
  const opened=performance.now(), settled=()=>performance.now()-opened>700;   // a moment's grace before input counts
  const set=()=>{ if(!settled()) return; keepAlive(); sfx("key"); if(st.pos<2){ st.pos++; draw(); } else finish(); };
  const finish=async()=>{
    if(st.done) return; st.done=true; blast.hsEntry=null; clearInterval(st.timer);
    const initials=st.letters.join(""); saved.hsInitials=initials;
    // played without a minichord: kept with how, so these can have a board of their own one day
    const played = typeof kbOn==="function" && kbOn() ? "keys" : typeof tdOn==="function" && tdOn() ? "touch" : undefined;
    const entry={initials, score, level:blast.level+1, speed:+saved.speed||0, created:Date.now()/1000, ...(played ? {played} : {})};
    // this browser's board
    const local=[...hsLocal(slug), entry].sort((a,b)=>b.score-a.score).slice(0,10);
    (saved.hiscores||(saved.hiscores={}))[slug]=local; save();
    // the shared board
    let rank=local.indexOf(entry)+1, shared=false;
    if(scoresOnline() && !mc.virtual){                      // keyboard play: this computer's board only
      ov.querySelector(".padhint").textContent="SENDING…";
      try{
        const r=await fetch(`${SCORES_API}/api/scores/${slug}`,{method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({initials, score, level:blast.level+1, speed:+saved.speed||0, seconds:hsSeconds(), firmware:mc.params[7]??null, mult:blast.mult||1})});
        const j=await r.json().catch(()=>({}));
        if(r.ok){ rank=j.rank; shared=true; hsCache[slug]={at:performance.now(), scores:j.scores}; } else blast.hsNote=(j.error||"").toUpperCase();
      }catch(e){ blast.hsNote="THE SHARED BOARD COULDN'T BE REACHED: KEPT ON THIS COMPUTER"; }
    }
    blast.hsResult=`${initials} · #${rank} ON ${shared?"THE BOARD":played==="touch"?"THIS DEVICE'S BOARD":"THIS COMPUTER'S BOARD"}${played==="touch"?" · TOUCH PLAY":mc.virtual?" · KEYBOARD PLAY":""}`;
    sfx("level"); ov.remove(); next();
  };
  // declined (or left alone): nothing is sent or kept, and the game over screen says so
  const skip=(why)=>{ if(st.done) return; st.done=true; blast.hsEntry=null; clearInterval(st.timer);
    blast.hsNote=why||"SCORE NOT ENTERED"; sfx("miss"); ov.remove(); next(); };
  // RESET: the entry simply ends, nothing after it
  const cancel=()=>{ st.done=true; clearInterval(st.timer); ov.remove(); if(blast) blast.hsEntry=null; };
  ov.querySelector(".hsno").onclick=()=>skip("NO THANKS: SCORE NOT SENT");
  blast.hsEntry={step, move, set, finish, skip, cancel, back:()=>move(-1), knob:v=>{   // relative: where the knob rests when a letter comes up is that letter; a sixth of a turn either way is six letters
    if(!settled()) return;
    if(st.knobBase==null || st.knobPos!==st.pos){ st.knobBase=v; st.knobPos=st.pos; st.knobFrom=HS_CHARS.indexOf(st.letters[st.pos]); return; }
    const d=Math.round((v-st.knobBase)*36); if(!d) return;                     // a knob that is merely sitting there reports anyway: only a letter that changes is someone being here
    keepAlive();
    st.letters[st.pos]=HS_CHARS[mod(st.knobFrom+d, HS_CHARS.length)]; draw(); }, type:ch=>{ if(!settled()) return; keepAlive(); st.letters[st.pos]=ch; draw(); set(); }};
  draw(); sfx("bonus");
}
// the game over screen says what became of the score
function hsGameOverLine(ov){
  const t=blast.hsResult || blast.hsNote; if(!t) return;
  const p=document.createElement("p"); p.className="hsresult"; p.textContent=t;
  const h=ov.querySelector("h3"); h && h.nextSibling ? ov.insertBefore(p, h.nextSibling.nextSibling) : ov.appendChild(p);
}
document.addEventListener("keydown", e=>{
  const h=blast && blast.hsEntry; if(!h || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(e.code==="ArrowUp") h.step(1); else if(e.code==="ArrowDown") h.step(-1);
  else if(e.code==="ArrowLeft" || e.code==="Backspace") h.move(-1); else if(e.code==="ArrowRight") h.move(1);
  else if(e.code==="Enter" || e.code==="Space") h.set();
  else if(e.code==="Escape") h.skip();
  else if(/^Key[A-Z]$|^Digit[0-9]$/.test(e.code)) h.type(e.code.slice(-1));
}, true);
// the board, drawn for the title loop
function hsRender(el, {scores, shared}, highlight){
  const ord=n=>n+(["TH","ST","ND","RD"][(n%100>10&&n%100<14)?0:Math.min(n%10,4)%4]||"TH");
  el.innerHTML=`<h3>HIGH SCORES</h3><p class="hswhere">${shared?"":"ON THIS COMPUTER"}</p>`+
    (scores.length ? `<ol class="hsboard">${scores.map((r,i)=>`<li class="${i===0?"top":""}${highlight&&r.initials===highlight?" me":""}"><span>${ord(i+1)}</span><b>${r.initials}</b><span>${r.score.toLocaleString("en-US")}</span><small>L${r.level}</small></li>`).join("")}</ol>`
      : `<p>NO SCORES YET. BE THE FIRST.</p>`)+`<p class="padhint">SCORES COUNT WHEN A MINICHORD IS PLAYED</p>`;
}
