// Chord Invaders' beam and power-ups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the beam ----------
// In manual aim, a chord kept sounding (held down, or latched with the minichord's hold button) fires
// a beam straight up from the ship after a moment, and every falling chord of that chord the beam
// touches is destroyed: sweep the ship with the knob to rake the sky. The beam runs on an energy bar
// that drains while it fires and fills again when it rests.
// ---------- power-ups ----------
// Now and then a power-up falls: a chord in a coloured capsule, collected by playing it like any
// chord, and gone harmlessly if it lands.
//   OMNI BEAM  for eight seconds any chord kept sounding fires a beam that destroys every chord it
//              touches, whatever it is, with no energy used; in auto aim the ship sweeps it by itself
//   SLOW TIME  everything falls at half speed for ten seconds
//   SHIELD     the next chord that lands costs no life
const BEAM_WAIT=350, BEAM_DRAIN=.25, BEAM_FILL=.12, BEAM_HALF=7;   // ms held before it fires; energy a second out and in; px either side of the ship
const POWERS={
  omni:  {name:"OMNI BEAM", icon:"⚡", secs:8,  say:"HOLD ANY CHORD: THE BEAM BLASTS WHATEVER IT TOUCHES"},
  slow:  {name:"SLOW TIME", icon:"⏳", secs:10, say:"EVERYTHING FALLS AT HALF SPEED"},
  shield:{name:"SHIELD",    icon:"🛡", secs:0,  say:"THE NEXT CHORD THAT LANDS COSTS NOTHING"},
};
const powerOn=k=> !!(blast && blast.powers && blast.powers[k] && (POWERS[k].secs===0 || performance.now()<blast.powers[k]));
// a power-up to drop now and then, one at a time, never while one runs
function blastPowerChance(){
  if(!blast || blast.phase!=="play" || blast.items.some(i=>!i.done && i.power)) return null;
  if(Object.keys(POWERS).some(k=>powerOn(k)) || Math.random()>.06) return null;
  return rnd(Object.keys(POWERS));
}
function blastPowerGet(it){
  const P=POWERS[it.power], now=performance.now();
  (blast.powers||(blast.powers={}))[it.power] = P.secs ? now+P.secs*1000 : true;
  banner(P.name+"!", P.say); sfx("level"); blastBar();
}
// a chord that would land: a shield takes it instead
function blastShieldTakes(it){
  if(!powerOn("shield")) return false;
  delete blast.powers.shield;
  popup(it.el.offsetLeft, blast.field.clientHeight-40, "SHIELDED", "#7FE9FF"); sfx("bonus"); blastBar();
  return true;
}
// every frame: time slows, the beam charges, fires and burns what's in it
function blastPowerTick(now, dt){
  // slow time: everything falling (and what's to come) takes twice as long
  if(powerOn("slow")){ const ms=dt*1000*.5; blast.items.forEach(i=>{ if(!i.done) i.t0+=ms; }); blast.next+=ms; if(blast.keyBar) blast.keyBar.t0+=ms; }
  if(blast.powers) for(const k of Object.keys(blast.powers)) if(POWERS[k].secs && now>=blast.powers[k]){ delete blast.powers[k]; banner(`${POWERS[k].name} OVER`); blastBar(); }
  const omni=powerOn("omni");
  // in auto aim the ship only moves for the omni beam, sweeping it by itself
  if(omni && !blast.aimManual) blast.shipWant=.5+.4*Math.sin(now/650);
  // what's sounding: a chord kept on for a moment
  const v=typeof mc!=="undefined" ? mc.voices : [], pitches=v.map(x=>x.note ?? Math.round(x.pitch)), key=pitches.slice().sort().join();
  if(key!==blast.heldKey){ blast.heldKey=key; blast.heldSince=now; }
  const held = pitches.length>=3 && !!chordId(pitches) && now-blast.heldSince>=BEAM_WAIT;
  if(blast.energy==null) blast.energy=1;
  const can = (blast.aimManual || omni) && held && (omni || blast.energy>0);
  if(can && !blast.beamOn) sfx("press");
  blast.beamOn=can;
  if(can && !omni) blast.energy=Math.max(0, blast.energy-BEAM_DRAIN*dt);
  else if(!can) blast.energy=Math.min(1, blast.energy+BEAM_FILL*dt);
  if(blast.aimManual && Math.floor(now/250)!==blast.barTick){ blast.barTick=Math.floor(now/250); blastBar(); }
  if(!can) return;
  // what's in the beam: above the ship, and (unless omni) that very chord
  const shipX=blast.field.clientWidth*(blast.shipF??.5);
  for(const it of blast.items){
    if(it.done || Math.abs(it.el.offsetLeft-shipX) > it.el.offsetWidth/2+BEAM_HALF) continue;
    if(!omni && !blastMatches(it, pitches)) continue;
    blastKill(it, "beam");
  }
}
// the beam, drawn on the field's canvas: from the ship to the top, flickering
function blastBeamDraw(g, sx, sy, now){
  if(!blast.beamOn) return;
  const omni=powerOn("omni"), w=omni?3:2, flick=Math.floor(now/60)%2;
  g.fillStyle = omni ? (flick ? "#FF5AA0" : "#FFD35A") : (flick ? "#7FE9FF" : "#F1E8D2");
  g.fillRect(sx-Math.floor(w/2), 0, w, sy-5);
  g.fillStyle="rgba(255,255,255,.5)"; g.fillRect(sx, 0, 1, sy-5);
}
// the HUD's extra: the beam's energy in manual aim, and a power-up while it runs
function blastPowerHud(){
  let h="";
  if(blast.aimManual){ const n=Math.round((blast.energy??1)*6); h+=` · BEAM ${"▮".repeat(n)}${"▯".repeat(6-n)}`; }
  if(blast.powers) for(const k of Object.keys(blast.powers)) if(powerOn(k)){ const P=POWERS[k];
    h+=` · ${P.name}${P.secs?` ${Math.ceil((blast.powers[k]-performance.now())/1000)}`:""}`; }
  return h;
}
