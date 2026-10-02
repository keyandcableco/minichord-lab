// Key Racer's sounds: the start lights' beeps as the old racer had them, tyres and tin for a crash,
// a whoosh past a car, a horn as one pulls over, the turbo's rise. The engine's hum is the game's own
// (key-racer.js). What's pitched is in the race's key: a gate's chime on its root, the checkpoint's
// bell on the new key's home, the finish fanfare.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.racer={
  beep:      ({tone}, go)=>tone("square", go ? 1046 : 523, 0, 0, go ? .5 : .22, .5),                   // 3, 2, 1, and the higher GO
  collect:   ({tone}, pc)=>{ tone("triangle", pcHz(pc||0), 0, 0, .12, .5); tone("triangle", pcHz((pc||0)+7), 0, .06, .16, .4); },
  open:      ({tone})=>{ tone("square", 1568, 1975, 0, .06, .3); },
  crash:     ({tone,noise})=>{ noise(0,.5,3000,200,1); noise(.02,.35,6000,2500,.5,"bandpass",4); tone("square",140,45,0,.4,.5); },   // the skid and the tin
  bump:      ({noise,tone})=>{ noise(0,.12,900,200,.7); tone("sine",90,50,0,.1,.5); },
  pass:      ({noise})=>noise(0,.35,400,4000,.5,"bandpass",2),
  horn:      ({tone})=>{ tone("square",392,0,0,.16,.3); tone("square",494,0,0,.16,.25); tone("square",392,0,.2,.22,.3); tone("square",494,0,.2,.22,.25); },
  turbo:     ({tone,noise})=>{ tone("sawtooth",110,880,0,.6,.35); noise(0,.6,500,6000,.4,"bandpass",1.5); },
  power:     ({tone})=>{ [784,988,1319].forEach((f,i)=>tone("triangle",f,0,i*.07,.14,.5)); },
  checkpoint:({tone}, pc)=>{ [0,4,7,12].forEach((s,i)=>tone("triangle",pcHz((pc||0)+s),0,i*.08,.18,.55)); },
  finish:    ({tone}, pc)=>{ [0,4,7,12,7,12].forEach((s,i)=>tone("square",pcHz((pc||0)+s,-1),0,i*.11,.16,.4)); tone("triangle",pcHz((pc||0)+12,-1),0,.7,.6,.6); },
  level:     ({tone})=>{ [523,659,784,1047].forEach((f,i)=>tone("square",f,0,i*.08,.12,.4)); },
  miss:      ({tone,noise})=>{ noise(0,.3,1500,200,.6); tone("square",200,80,0,.3,.4); },
};
