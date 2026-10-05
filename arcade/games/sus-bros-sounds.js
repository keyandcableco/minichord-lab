// Sus Bros.' sounds: the jump, the bump under a floor, a pest flipped and righting itself, angry, out
// of a pipe and down one; a suspension sounded; a resolution, on the chord it resolves to; a coin, on
// its note of the scale; the POW; the old game's death.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

const sbHz=m=>440*2**((m-69)/12);
GAME_SFX.bros={
  jump:    ({tone})=>tone("square",392,1047,0,.16,.35),
  land:    ({tone})=>tone("square",130,90,0,.04,.3),
  bump:    ({tone,noise})=>{ tone("square",220,110,0,.08,.45); noise(0,.06,1500,300,.3); },
  flip:    ({tone})=>{ tone("square",660,330,0,.12,.4); tone("square",330,660,.1,.1,.3); },
  right:   ({tone})=>{ [330,392,494].forEach((f,i)=>tone("square",f,0,i*.06,.07,.35)); },
  angry:   ({tone})=>{ [523,466,523,466].forEach((f,i)=>tone("square",f,0,i*.05,.05,.35)); },
  pipe:    ({tone})=>tone("square",110,330,0,.25,.35),
  pipein:  ({tone})=>tone("square",330,110,0,.25,.3),
  sus:     ({tone})=>{ tone("triangle",523,0,0,.4,.4); tone("triangle",698,0,0,.4,.3); },            // a 4th held over, waiting
  resolve: ({tone}, pc=0)=>{ [0,4,7,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.05,.3,.5)); },
  coin:    ({tone}, m=72)=>{ tone("square",sbHz(m),0,0,.08,.35); tone("square",sbHz(m+12),0,.07,.25,.35); },
  pow:     ({tone,noise})=>{ noise(0,.5,2000,80,.9); tone("square",90,40,0,.4,.6); },
  die:     ({tone})=>{ [659,587,523,494,440,392,349].forEach((f,i)=>tone("square",f,0,i*.1,.09,.4)); tone("triangle",98,0,.75,.6,.6); },
  clear:   ({tone})=>{ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone("square",f,0,i*.09,.1,.35)); },
};
