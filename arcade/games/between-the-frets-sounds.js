// Between the Frets' sounds, all unpitched: a game about quarter-tones has no use for a chime in
// twelve-note tuning. Clicks, a shaker, dull thumps and a drum roll.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.frets={
  tick:  ({noise})=>noise(0,.03,4000,4000,.8,"bandpass",6),
  right: ({noise})=>{ noise(0,.08,7000,7000,.5,"highpass"); noise(.1,.08,7000,7000,.5,"highpass"); noise(.2,.04,3000,3000,.8,"bandpass",5); },
  miss:  ({noise})=>{ noise(0,.3,600,80,.9); noise(.12,.25,500,80,.6); },
  level: ({noise})=>{ for(let i=0;i<10;i++) noise(i*.04,.04,2500,2000,.3+i*.05,"bandpass",2); noise(.42,.5,8000,1000,.8,"highpass"); },
};
