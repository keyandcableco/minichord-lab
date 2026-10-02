// Chord Hunt' power-ups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// Now and then, from the second level, after a duck's been shot, the dog comes up with something in
// his mouth instead: a tag with a power-up and a chord of the key on it. Play the chord before he
// drops it and it's yours. One at a time, and none fetched while one runs. They're ways of listening,
// each for the next few ducks (a flock counts as one):
//   DRONE      home held under the duck, low, so its pull against the tonic is heard
//   BASS SCOPE the duck's bass note alone before its chord: the line under the harmony
//   ARPEGGIO   the duck's chord spelled upward slowly after it sounds
//   RESOLVE    the duck's chord moves where it wants to go (V to I, V of vi to vi), which says what it is
//   PLUMAGE    each duck coloured by its kind of chord: major, minor, diminished, dominant 7th…
//   SLOW-MO    the ducks fly slower, and stay up longer
//   DA CAPO    a life back, or one more with every heart full (powers.js: it's every game's)
// A hit with one running is a help, so it doesn't build the pure ear (nor does it break it).
// What runs is kept as blast.hdPower = {k, uses}.
const HD_POWERS={
  drone:  {name:"DRONE",      icon:"🎻", uses:3, say:"HOME HELD UNDER THE NEXT THREE DUCKS", page:"FOR THREE DUCKS, HOME HELD LOW UNDER THE DUCK'S CHORD: HEAR IT PULL."},
  bass:   {name:"BASS SCOPE", icon:"🔭", uses:3, say:"THE BASS ALONE, THEN THE CHORD", page:"FOR THREE DUCKS, THE BASS NOTE ALONE BEFORE THE CHORD: THE LINE UNDER THE HARMONY."},
  arp:    {name:"ARPEGGIO",   icon:"🪜", uses:3, say:"EACH CHORD SPELLED UPWARD, SLOWLY", page:"FOR THREE DUCKS, THE CHORD SPELLED UPWARD, NOTE BY NOTE, AFTER IT SOUNDS."},
  resolve:{name:"RESOLVE",    icon:"🧭", uses:3, say:"EACH CHORD GOES WHERE IT WANTS TO", page:"FOR THREE DUCKS, THE CHORD MOVES WHERE IT WANTS TO GO: V TO I, ii TO V, V OF vi TO vi."},
  tint:   {name:"PLUMAGE",    icon:"🎨", uses:4, say:"DUCKS COLOURED BY THEIR KIND OF CHORD", page:"FOR FOUR DUCKS, EACH BIRD COLOURED BY ITS KIND: MAJOR GOLD, MINOR BLUE, DIMINISHED PURPLE, DOMINANT RED…"},
  slow:   {name:"SLOW-MO",    icon:"🐢", uses:3, say:"THE DUCKS FLY SLOWER AND STAY UP LONGER", page:"FOR THREE DUCKS, THEY FLY SLOWER AND STAY UP HALF AS LONG AGAIN."},
  dacapo: DA_CAPO,
};
const HD_FETCH_CHANCE=.24, HD_TAG_SECS=5;
const hdPowerOn=k=>{ const p=blast && blast.kind==="hunt" && blast.hdPower; return !!(p && p.k===k && p.uses>0); };
// a power-up helping this duck: one that changes what's heard or seen of it
const hdPowerAny=d=> !!(blast.hdPower && !d.demo && ["drone","bass","arp","resolve","tint","slow"].includes(blast.hdPower.k));
// the tag's look, in the dog's mouth and on the title screen's POWER-UPS page
const hdTagLook=(k, name)=>`<span class="hdtag pu-${k}"><i class="puicon">${HD_POWERS[k].icon}</i><b>${name}</b></span>`;
// after a hit, now and then: the dog fetches a tag. True if he did (then() runs once it's over).
function hdFetchMaybe(then){
  if(!blast || blast.phase!=="play" || blast.level<1 || blast.hdPower || Math.random()>=HD_FETCH_CHANCE || !blast.key) return false;
  const k=powerPick(HD_POWERS); if(!k) return false;
  const chords=["I","IV","V","vi","ii"].map(n=>hdChord(blast.key, blast.key.minor ? {I:"i",IV:"iv",V:"V",vi:"VI",ii:"III"}[n] : n)).filter(Boolean);
  const c=rnd(chords); if(!c) return false;
  blast.tag={k, chord:c, left:HD_TAG_SECS, then};
  hdDogUp("hold fetch", `<span class="hdhand">${hdTagLook(k, c.sym)}</span>`+HD_DOG.hold, blast.L.W*(.3+Math.random()*.4), `<small>PLAY ${c.sym} TO TAKE IT</small>`);
  sfx("fetch");
  return true;
}
function hdTagChord(pitches, name){
  const tg=blast.tag; if(!tg) return;
  if(!isChord(pitches, tg.chord.pc, tg.chord.q)){ heard(name,false,`THE TAG SAYS ${tg.chord.sym}`); return; }
  heard(name,true,""); blast.tag=null;
  hdPowerGet(tg.k);
  hdDogDown(); tg.then();
}
function hdTagGone(){ const tg=blast.tag; blast.tag=null; hdDogDown(); if(tg) tg.then(); }
function hdPowerGet(k){
  const P=HD_POWERS[k];
  if(P.instant){ daCapo(); hdBar(); return; }
  blast.hdPower={k, uses:P.uses};
  banner(P.name+"!", P.say); sfx("level"); hdBar();
}
// a duck's over: a use gone
function hdPowerUsed(){
  const p=blast.hdPower; if(!p) return;
  if(--p.uses<=0){ blast.hdPower=null; banner(`${HD_POWERS[p.k].name} OVER`); }
  hdBar();
}
// the HUD's word for what's running
function hdPowerHud(){
  const p=blast && blast.hdPower; if(!p || !hdPowerOn(p.k)) return "";
  const P=HD_POWERS[p.k]; return ` · ${P.icon} ${P.name}${p.uses>1?` ×${p.uses}`:""}`;
}
