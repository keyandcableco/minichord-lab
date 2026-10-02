// Harp Command's power-ups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// Now and then a power-up falls: a note in a coloured capsule over its string, taken by plucking
// that string like any note, and gone harmlessly if it lands. One at a time, and none falls while
// one runs (a shield runs until it's spent).
//   MULTISHOT  for six seconds every cannon fires at will: every note in the sky is shot down as it
//              comes, scoring as if plucked
//   SLOW TIME  everything falls at half speed for ten seconds
//   SHIELD     the next note that lands costs no life; it glows over the cannons until then
//   DA CAPO    a life back, or one more with every heart full (kit.js: it's every game's)
// What runs is kept as blast.hcPower = {k, powerUntil}: one key, so the bonus round's pause moves
// its end on with the rest of the game's clocks (powerUntil is one of BONUS_TIME_KEYS).
const HC_POWERS={
  multi: {name:"MULTISHOT", icon:"💥", secs:6,  say:"EVERY CANNON FIRES AT WILL", page:"FOR 6 SECONDS EVERY CANNON FIRES AT WILL: EVERY NOTE THAT FALLS IS SHOT DOWN, AND SCORES."},
  slow:  {name:"SLOW TIME", icon:"⏳", secs:10, say:"THE NOTES FALL AT HALF SPEED",  page:"FOR 10 SECONDS, THE NOTES FALL AT HALF SPEED."},
  shield:{name:"SHIELD",    icon:"🛡", secs:0,  say:"THE NEXT NOTE THAT LANDS COSTS NOTHING", page:"THE NEXT NOTE THAT LANDS COSTS NO LIFE."},
  dacapo:DA_CAPO,
};
const HC_POWER_CHANCE=.07, HC_SPRAY_MS=280;
const hcPowerOn=k=>{ const p=blast && blast.kind==="command" && blast.hcPower; return !!(p && p.k===k && (!HC_POWERS[k].secs || performance.now()<p.powerUntil)); };
// a power-up to drop with this note, now and then: never in the demo or a bonus round, never two
function hcPowerChance(){
  if(!blast || blast.phase!=="play" || blast.hcPower || blast.items.some(i=>!i.done && i.power)) return null;
  return Math.random()<HC_POWER_CHANCE ? powerPick(HC_POWERS) : null;
}
// the capsule's look, in the field and on the title screen's POWER-UPS page
const hcPowerLook=(k, inner)=>`<i class="puicon">${HC_POWERS[k].icon}</i>${inner}`;
function hcPowerGet(it){
  const P=HC_POWERS[it.power];
  if(P.instant){ daCapo(); blastBarCommand(); return; }
  blast.hcPower={k:it.power, powerUntil: P.secs ? performance.now()+P.secs*1000 : 0};
  if(it.power==="multi") blast.sprayAt=0;                      // the first volley straight away
  banner(P.name+"!", P.say); sfx("level"); blastBarCommand();
}
// a note that would land: a shield takes it instead, and is spent
function hcShieldTakes(it){
  if(!hcPowerOn("shield")) return false;
  blast.hcPower=null;
  popup(it.el.offsetLeft, blast.field.clientHeight-70, "SHIELDED", "#7FE08A"); sfx("shield"); blastBarCommand();
  return true;
}
// every frame of play: time slows, the cannons spray, a power runs out
function hcPowerTick(now, dt){
  const p=blast.hcPower; if(!p) return;
  const P=HC_POWERS[p.k];
  if(P.secs && now>=p.powerUntil){ blast.hcPower=null; banner(`${P.name} OVER`); blastBarCommand(); return; }
  // slow time: what falls, and what's still to come, takes twice as long
  if(p.k==="slow"){ const ms=dt*1000*.5; blast.items.forEach(i=>{ if(!i.done) i.t0+=ms; }); blast.next+=ms; }
  // multishot: a volley every moment, one shot from each string with a note over it
  if(p.k==="multi" && now>=(blast.sprayAt||0)){
    blast.sprayAt=now+HC_SPRAY_MS;
    blast.items.filter(i=>!i.done && !i.power && i.y!=null).forEach(i=>hcShootDown(i));
  }
  if(P.secs && Math.floor(now/250)!==blast.hcBarTick){ blast.hcBarTick=Math.floor(now/250); blastBarCommand(); }   // the countdown in the HUD
}
// the HUD's word for what's running
function hcPowerHud(){
  const p=blast && blast.hcPower; if(!p || !hcPowerOn(p.k)) return "";
  const P=HC_POWERS[p.k];
  return ` · ${P.name}${P.secs ? ` ${Math.max(0,Math.ceil((p.powerUntil-performance.now())/1000))}` : ""}`;
}
// the shield, drawn on the field's canvas: a flickering green line over the cannons and their names
function hcShieldDraw(g, W, H, now){
  if(!hcPowerOn("shield")) return;
  const y=H-Math.ceil(84/PX), flick=Math.floor(now/90)%2;
  g.fillStyle = flick ? "#7FE08A" : "#B6F5BE";
  for(let x=2; x<W-2; x+=3) g.fillRect(x, y+((x>>2)%2), 2, 1);
}
