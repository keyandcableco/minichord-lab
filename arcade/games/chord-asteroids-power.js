// Chord Asteroids' power-ups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// Now and then a power-up rock drifts in: a chord rock in a coloured capsule, cracked by its chord
// like any rock. It bursts into its power instead of its notes, and costs nothing if it reaches the
// ship. One at a time: none comes while one runs (Resolution runs until it's spent).
//   PEDAL POINT  for ten seconds the last string plucked is held: every note rock of that note is shot
//                down as it comes, wherever it is, and a string with no rock to hit moves the pedal
//                there instead of jamming the gun
//   FERMATA      everything holds still for six seconds: the rocks stop where they are, and none come
//   RESOLUTION   held until used: play the home chord of the minichord's key and every rock on the
//                screen is blown up, scoring as if cracked or shot
//   DA CAPO      a life back, or one more with every heart full (kit.js: it's every game's)
// What runs is kept as blast.asPower = {k, powerUntil, pc}: one key, so the bonus round's pause moves
// its end on with the rest of the game's clocks (powerUntil is one of BONUS_TIME_KEYS).
const AS_POWERS={
  pedal:   {name:"PEDAL POINT", icon:"📌", secs:10, say:"PLUCK A NOTE AND IT'S HELD: EVERY ROCK OF IT IS SHOT", page:"FOR 10 SECONDS THE LAST NOTE YOU PLUCK IS HELD: EVERY ROCK OF THAT NOTE IS SHOT DOWN AS IT COMES."},
  fermata: {name:"FERMATA",     icon:"⏸", secs:6,  say:"EVERYTHING HOLDS STILL",                              page:"FOR 6 SECONDS EVERYTHING HOLDS STILL: THE ROCKS STOP WHERE THEY ARE, AND NO MORE COME."},
  resolve: {name:"RESOLUTION",  icon:"🏠", secs:0,  get say(){ return `PLAY ${asHomeChord()} WHEN YOU NEED IT: EVERY ROCK GOES`; }, page:"KEEP IT FOR A TIGHT SPOT: PLAY THE HOME CHORD OF YOUR KEY AND EVERY ROCK ON THE SCREEN IS BLOWN UP."},
  dacapo:  DA_CAPO,
};
const AS_POWER_CHANCE=.08, AS_PEDAL_MS=260;
const asPowerOn=k=>{ const p=blast && blast.kind==="asteroids" && blast.asPower; return !!(p && p.k===k && (!AS_POWERS[k].secs || performance.now()<p.powerUntil)); };
// the key's home chord: the tonic of the key the minichord is set to (C without one)
const asHomeChord=()=> (typeof mc!=="undefined" && mc.keyName) || "C";
// a held note's name, spelled for the key
const asPedalName=pc=> spell(pc, devFifths());
// a power-up to send in with this rock, now and then: never in the demo or a bonus round, never two
function asPowerChance(){
  if(!blast || blast.phase!=="play" || blast.asPower || blast.rocks.some(r=>!r.dead && r.power)) return null;
  return Math.random()<AS_POWER_CHANCE ? powerPick(AS_POWERS) : null;
}
// the capsule's look, in the field and on the title screen's POWER-UPS page
const asPowerLook=(k, inner)=>`<i class="puicon">${AS_POWERS[k].icon}</i>${inner}`;
function asPowerGet(rock){
  const P=AS_POWERS[rock.power];
  if(P.instant){ daCapo(); asBar(); return; }
  blast.asPower={k:rock.power, powerUntil: P.secs ? performance.now()+P.secs*1000 : 0, pc:null};
  if(rock.power==="pedal") blast.sprayAt=0;
  banner(P.name+"!", P.say); sfx("level"); asBar();
}
// Pedal point: a pluck holds its note. It returns true when the pluck is taken care of (no rock of the
// note to shoot now, which would otherwise jam the gun).
function asPedalPluck(pc, hasRock){
  if(!asPowerOn("pedal")) return false;
  blast.asPower.pc=pc; blast.sprayAt=0; asBar();
  if(hasRock) return false;
  heard(`${asPedalName(pc)} HELD`, true); sfx("press");
  return true;
}
// Resolution: the home chord, played while it's held, blows up everything there is. True if it went.
function asResolve(pitches){
  if(!asPowerOn("resolve") || !isChord(pitches, pcOfName(asHomeChord()), "")) return false;
  blast.asPower=null;
  let pts=0;
  for(const r of blast.rocks){ if(r.dead) continue;
    pts += r.kind==="chord" ? (r.power ? 0 : asChordPoints(r)) : mulPts(10*(blast.level+1));
    explode(r.x, r.y, r.kind==="chord"?34:16, ["#FFD35A","#FFFFFF","#FF8A3D"]); asKill(r); }
  blast.score+=pts;
  heard(asHomeChord(), true); sfx("boom"); sfx("bonus");
  popup(blast.cx, blast.cy-34, pts ? `RESOLVED +${pts}` : "RESOLVED", "#FFD35A");
  banner("RESOLUTION!", "HOME AGAIN"); asBar();
  return true;
}
// every frame of play: a power runs out, the pedal fires. Fermata is asTick's: it doesn't move a thing.
function asPowerTick(now, dt){
  const p=blast.asPower; if(!p) return;
  const P=AS_POWERS[p.k];
  if(P.secs && now>=p.powerUntil){ blast.asPower=null; banner(`${P.name} OVER`); asBar(); return; }
  if(p.k==="fermata") blast.next+=dt*1000;                       // nothing new comes while it holds
  if(p.k==="pedal" && p.pc!=null && now>=(blast.sprayAt||0)){
    blast.sprayAt=now+AS_PEDAL_MS;
    const r=blast.rocks.find(x=>!x.dead && x.kind==="note" && x.pc===p.pc);
    if(r) asShootNote(r, true);
  }
  if(P.secs && Math.floor(now/250)!==blast.asBarTick){ blast.asBarTick=Math.floor(now/250); asBar(); }   // the countdown in the HUD
}
const asFrozen=()=> asPowerOn("fermata");
// the HUD's word for what's running
function asPowerHud(){
  const p=blast && blast.asPower; if(!p || !asPowerOn(p.k)) return "";
  const P=AS_POWERS[p.k];
  if(p.k==="resolve") return ` · ${P.name}: PLAY ${asHomeChord()}`;
  return ` · ${P.name} ${Math.max(0,Math.ceil((p.powerUntil-performance.now())/1000))}${p.k==="pedal" && p.pc!=null ? ` · ${asPedalName(p.pc)} HELD` : ""}`;
}
// drawn round the ship: the pedal's ring while it runs, gold for a resolution held
function asPowerDraw(g, U, now){
  const p=blast.asPower; if(!p || !asPowerOn(p.k) || p.k==="fermata") return;
  const flick=Math.floor(now/120)%2;
  g.strokeStyle = p.k==="pedal" ? (flick ? "#FF8A3D" : "#FFD35A") : (flick ? "#FFD35A" : "#FFF4C2");
  g.lineWidth=U*.6; g.beginPath(); g.arc(blast.cx, blast.cy, (p.k==="pedal"?9:11)*U, 0, Math.PI*2); g.stroke();
}
