// Harp Command's sounds: missile launches, airbursts and a city's siren, in noise and low booms.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.command={
  shoot: ({tone,noise})=>{ noise(0,.3,500,3500,.8,"bandpass",3); tone("triangle",220,880,0,.25,.35); },          // a missile going up
  boom:  ({tone,noise})=>{ noise(0,.8,2500,60,1); tone("sine",110,35,0,.7,.9); noise(.05,.4,6000,800,.3,"highpass"); },   // an airburst
  miss:  ({tone,noise})=>{ noise(0,.4,1200,80,.8); tone("sine",80,40,0,.4,.8);                                    // a cannon hit, and its siren
    [0,.2,.4].forEach(at=>tone("sawtooth",880,587,at,.18,.3)); },
  level: ({tone})=>{ [[392,0,.1],[523,.12,.1],[659,.24,.1],[784,.36,.35]].forEach(([f,at,d])=>{ tone("triangle",f,0,at,d,.7); tone("square",f/2,0,at,d,.2); }); },   // a bugle call
  shield:({tone})=>{ tone("triangle",600,2400,0,.35,.5); tone("triangle",900,3600,.05,.35,.3); },
};
