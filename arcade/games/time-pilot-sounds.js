// Time Pilot's sounds: an enemy going down as the clouds part, a plane of your own lost in the clouds,
// a bank held, and the time warp between the eras. (The click and the pads are the rhythm engine's,
// arcade/rhythm.js, on the audio clock; these are the game's effects, kept short and off the beat's
// way: in play the only sounds on the beat are the click and the pads.)
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.pilot={
  down:  ({tone,noise})=>{ noise(0,.16,3000,200,.35); tone("square",300,70,0,.14,.18); },
  lost:  ({tone,noise})=>{ tone("sawtooth",392,98,0,.9,.4); noise(.1,.8,1200,100,.4); },
  clear: ({tone})=>{ [784,988,1319].forEach((f,i)=>tone("triangle",f,0,i*.08,.18,.45)); },
  warp:  ({tone,noise})=>{ tone("sine",200,2400,0,1.2,.5); tone("sine",300,3600,.1,1.1,.3); noise(0,1.2,500,8000,.25,"bandpass",3); },
};
