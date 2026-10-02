// Chopper Rescue's power-ups.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// Now and then, from the second level, a supply crate is dropped with a call: it lands on the map at
// a chord of the call's key, marked with its name (the one place on the map that is), and lies there
// till the call's over. Play its chord and the chopper flies out for it and back, the flare still
// burning: a detour worth taking only if there's time. One at a time, and none drops while one runs.
//   TAILWIND  for 20 seconds the flare burns at half speed
//   RADAR     the next two calls come decoded: the radio says the chord straight away
//   WINCH     the next survivors come up without a signal, scoring as if they'd been answered
//   DA CAPO   a life back, or one more with every heart full (powers.js: it's every game's)
// What runs is kept as blast.chPower = {k, powerUntil, uses}: one key, as the other games keep theirs.
const CH_POWERS={
  tailwind:{name:"TAILWIND", icon:"💨", secs:20, say:"THE FLARE BURNS AT HALF SPEED", page:"FOR 20 SECONDS THE FLARE BURNS AT HALF SPEED."},
  radar:   {name:"RADAR",    icon:"📡", secs:0, uses:2, say:"THE NEXT TWO CALLS COME DECODED", page:"THE NEXT TWO CALLS COME DECODED: THE RADIO SAYS THE CHORD STRAIGHT AWAY."},
  winch:   {name:"WINCH",    icon:"🪝", secs:0, uses:1, say:"THE NEXT SURVIVORS COME UP WITHOUT A SIGNAL", page:"THE NEXT SURVIVORS COME UP WITHOUT A SIGNAL, SCORING AS IF THEY'D BEEN ANSWERED."},
  dacapo:  DA_CAPO,
};
const CH_CRATE_CHANCE=.25;
const chPowerOn=k=>{ const p=blast && blast.kind==="chopper" && blast.chPower; return !!(p && p.k===k && (CH_POWERS[k].secs ? performance.now()<p.powerUntil : p.uses>0)); };
// the crate's look, on the map and on the title screen's POWER-UPS page
const chCrateLook=(k, name)=>`<span class="chcrate pu-${k}"><i class="puicon">${CH_POWERS[k].icon}</i><b>${name}</b></span>`;
// a crate with this call, now and then: at a chord of its key that's none of the emergencies' places
function chCrateDrop(call){
  blast.crate=null;
  if(!blast || blast.phase!=="play" || blast.level<1 || blast.chPower || !call.key || Math.random()>=CH_CRATE_CHANCE) return;
  const taken=new Set((blast.emerg||[]).map(e=>e.col+","+e.row));
  const spots=CH_DEG.map(([st,q])=>({root:chRoot(call.key,st), q})).filter(c=>chPlain({legs:[c]}) && !call.legs.some(l=>pcOfName(l.root)===pcOfName(c.root) && l.q===c.q))
    .map(c=>({...c, ...chPad(c.root,c.q)})).filter(c=>c.col>=0 && !taken.has(c.col+","+c.row));
  if(!spots.length) return;
  const k=powerPick(CH_POWERS); if(!k) return;
  blast.crate={k, ...rnd(spots)};
}
// a chord played: the crate's, and the chopper flies out for it. True if it went for the crate.
function chCrateFly(pitches, name){
  const c=blast.crate; if(!c || !isChord(pitches, pcOfName(c.root), c.q)) return false;
  heard(name, true, "SUPPLY CRATE");
  blast.busy=true; blast.pos={col:c.col, row:c.row}; chPlace(false); sfx("fly");
  gameLater(()=>{ if(!blast || blast.kind!=="chopper") return;
    blast.crate=null; chDrawMap(); chPowerGet(c.k);
    const [x,y]=chXY(c.col,c.row); popup(x,y-30,CH_POWERS[c.k].name,"#7FE9FF");
    gameLater(()=>{ if(!blast || blast.kind!=="chopper") return; blast.pos={base:true}; chPlace(false); blast.busy=false; }, 500); }, 600);
  return true;
}
function chPowerGet(k){
  const P=CH_POWERS[k];
  if(P.instant){ daCapo(); chBar(); return; }
  blast.chPower={k, powerUntil: P.secs ? performance.now()+P.secs*1000 : 0, uses:P.uses||0};
  banner(P.name+"!", P.say); sfx("level");
  if(k==="radar" && blast.call) chRadar(blast.call);                 // the call that's on now, decoded too
  chBar();
}
// radar: the call's chord said on the radio as soon as it's typed out. True if radar decoded it.
function chRadar(call){
  if(!chPowerOn("radar") || call.decoded) return false;
  call.decoded=true; if(--blast.chPower.uses<=0) blast.chPower=null; chBar();
  const t=blast.radioEl.querySelector(".chtext");
  const show=()=>{ if(!blast || blast.call!==call || !t.isConnected) return;
    if(t.textContent.length<((call.weak?"(WEAK) ":"")+call.text).length) return void setTimeout(show, 60);   // still typing
    const l=call.legs[blast.leg]; const h=document.createElement("em"); h.className="chhint radar"; h.textContent=` 📡 ${call.legs.length>1 ? call.legs.slice(blast.leg).map(x=>x.root+x.q).join(" → ") : l.root+l.q}`; t.appendChild(h); };
  show();
  return true;
}
// the winch: taken instead of the signal, once. True if it took it.
function chWinch(tones, then){
  if(!chPowerOn("winch")) return false;
  blast.chPower=null; chBar();
  banner("WINCH!", "THEY'RE COMING UP"); sfx("winch");
  const pts=mulPts(10*tones*(blast.level+1)); blast.score+=pts;
  gameLater(()=>{ if(blast && blast.kind==="chopper") then(pts); }, 700);
  return true;
}
// every frame of play: the tailwind holds the flare back, a power runs out
function chPowerTick(now, dt){
  const p=blast.chPower; if(!p) return;
  const P=CH_POWERS[p.k];
  if(P.secs && now>=p.powerUntil){ blast.chPower=null; banner(`${P.name} OVER`); chBar(); return; }
  if(p.k==="tailwind" && blast.call){ const ms=dt*1000*.5; blast.deadline+=ms; blast.callAt+=ms; }
  if(P.secs && Math.floor(now/250)!==blast.chBarTick){ blast.chBarTick=Math.floor(now/250); chBar(); }   // the countdown in the HUD
}
// the HUD's word for what's running
function chPowerHud(){
  const p=blast && blast.chPower; if(!p || !chPowerOn(p.k)) return "";
  const P=CH_POWERS[p.k];
  return ` · ${P.icon} ${P.name}${P.secs ? ` ${Math.max(0,Math.ceil((p.powerUntil-performance.now())/1000))}` : p.uses>1 ? ` ×${p.uses}` : ""}`;
}
