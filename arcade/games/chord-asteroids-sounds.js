// Chord Asteroids' sounds: a low pew, rocks that boom by their size, the ship breaking up, a jammed
// radio, and the heartbeat that quickens as the rocks close in (only while nothing is being played).
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.asteroids={
  shoot: ({tone})=>{ tone("triangle",900,200,0,.12,.8); tone("square",450,100,0,.08,.2); },
  boom:  ({tone,noise}, r=24)=>{ const big=Math.max(0,Math.min(1,(r-10)/40));   // a big rock lower and longer than a small one
    noise(0,.2+big*.35,4000-big*2800,80,.9); tone("sine",220-big*150,30,0,.2+big*.2,.7); },
  miss:  ({tone,noise})=>{ noise(0,1.1,5000,60,1); tone("sawtooth",220,30,0,.8,.4); noise(.2,.8,2000,100,.5); },
  jam:   ({tone,noise})=>{ for(let i=0;i<7;i++) noise(i*.06,.04,2000+Math.random()*3000,2500,.6,"bandpass",4); tone("square",120,0,0,.35,.15); },   // radio static
  level: ({tone})=>{ [784,587,392,523,784,1047].forEach((f,i)=>tone("triangle",f,0,i*.08,.14,.6)); },
  beat:  ({tone,noise}, i=0)=>{ tone("triangle",i?104:117,i?70:78,0,.12,.9); noise(0,.06,400,100,.5); },   // dum, dum
};
