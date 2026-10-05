// The minichord's controls as the arcade games share them: the knobs that steer, and the harp
// played as notes rather than a d-pad. Part of Minichord Lab's Practice Room page
// (practice/index.html), loaded there in order with the others as plain scripts sharing one scope;
// see practice/boot.js. Kept out of any one game's file so a game loaded on its own has them.
"use strict";

// ---------- the knobs ----------
// whether the minichord can send its knobs as MIDI: the setting, on firmware that has it
// (or a virtual one, practice/virtual.js, played with knobs: on a touch screen)
const knobsReady=()=>canWrite() && hasSetting(238) && ((mc.params[7]??0)>=10 || !!mc.virtualKnobs);
// a knob: it wakes a title screen; in the games that use one, it steers
// Only the chosen knob steers (the modulation knob unless the player picks another on the title
// screen), so brushing a neighbour mid-game doesn't throw the paddle or the aim across the screen.
// A one-step wobble back the way it came is ignored, so a knob resting between two values holds
// still. And while the minichord is sending its knobs, the mouse doesn't steer, so a hand resting on
// the mouse can't fight the knob.
const KNOB_NAMES=["CHORD","HARP","MOD"];
const steerKnob=()=> saved.steerKnob ?? 2;
const knobHold={};
mc.addEventListener("knob", e=>{
  if(!blast || !blast.field) return;
  const {knob, value}=e.detail;
  if(blast.bonus && !bonusInField()){ bonusKnob(value, knob); return; }       // a bonus round: any knob (an in-field one steers the game)
  if(blast.hsEntry){ if(knob===steerKnob()) blast.hsEntry.knob(value); return; }
  if(cabWaiting()){
    const base=(blast.knobBase||(blast.knobBase={}));
    if(base[knob]==null) base[knob]=value;                                   // the first report is where it rests
    else if(knob===steerKnob() && Math.abs(value-base[knob])>.08){ base[knob]=null; cabWake(); }   // a real turn wakes it
    return;
  }
  if(blast.knobBase) blast.knobBase={};
  if(blast.helpBoard && typeof helpKnob==="function") helpKnob(knob, value);   // the on-screen minichord's knob turns too
  if(blast.kind==="chopper"){ chopperKnob(value); return; }                   // any knob tunes the radio
  if(blast.kind==="asteroids" && blast.aimManual && knob===asAimKnob()){ asAim(value); return; }
  if(blast.kind==="burger"){ bkKnob(knob, value); return; }                    // both knobs voice the chord   // manual aim: the other knob spins the ship
  if(knob!==steerKnob()) return;
  const step=Math.round(value*127), h=knobHold[knob] || (knobHold[knob]={last:null, dir:0});
  const d = h.last==null ? 1 : step-h.last;                                   // the first reading always counts
  if(d===0 || (h.last!=null && Math.abs(d)===1 && h.dir && Math.sign(d)!==h.dir)) return;   // a wobble back: hold
  h.dir=Math.sign(d); h.last=step; blast.knobAt=performance.now();
  const v=step/127;
  if(blast.kind==="stack") return stKnob(v);
  if(blast.kind==="asteroids") return asKnob(v);
  if(blast.kind==="sight") return sightKnob(v);
  if(blast.kind==="racer") return krKnob(v);
  // Chord Invaders' ship, in manual aim; an in-field bonus round is steered the same way
  if(blast.kind==="blaster"){ if(blast.aimManual && (blast.phase==="play" || bonusPlaying())) blast.shipWant=.06+v*.88; return; }
  if(blast.kind==="fifths") return fdKnob(v);
  if(blast.kind!=="breakout") return;
  const W=blast.W||blast.field.clientWidth; blast.paddle.target=v*(W-blast.paddle.w); blast.steer="knob";
});
// the mouse steers only when the knobs can't: no minichord sending them, and none turned lately (on a
// virtual minichord a finger on the field steers as well as its knob, but not straight after the knob)
const mouseMaySteer=()=> (!knobsReady() || !!mc.virtual) && performance.now()-(blast?.knobAt||0)>4000;

// ---------- the harp as notes ----------
// the harp plays notes, not a d-pad: chromatic from C, untransposed, at its own volume (Chord
// Asteroids, and every game since whose harp plays notes)
function asHarp(){
  if(!canWrite()) return;
  harpInOrder();
  if(hasSetting(116)) borrow(116,1);
  borrow(98,1); if(hasSetting(36)) borrow(36, mc.params[36] ?? 0);
  if(hasSetting(30)) ensure(30,0);
}
