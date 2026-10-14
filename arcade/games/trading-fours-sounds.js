// Trading Fours' sounds: a blow landing on either drummer, the K.O., the round bell, and the crowd.
// (The calls, the time and the pads are the rhythm engine's, arcade/rhythm.js, on the audio clock;
// these are the game's effects.)
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.fours={
  blow:  ({tone,noise})=>{ noise(0,.12,3000,200,.8); tone("square",180,60,0,.14,.5); },
  hurt:  ({tone,noise})=>{ noise(0,.1,1500,150,.6); tone("square",140,50,0,.18,.45); },
  ko:    ({tone,noise})=>{ [0,.18,.36].forEach(at=>{ noise(at,.15,4000,200,.8); tone("square",200,50,at,.15,.5); }); tone("triangle",523,1047,.6,.5,.6); },
  bell:  ({tone})=>{ tone("sine",1568,1568,0,.9,.5); tone("sine",2349,2349,0,.6,.25); },
  crowd: ({noise})=>noise(0,1.2,2500,900,.4,"bandpass",.8),
};
