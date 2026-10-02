// What every arcade game's power-ups share: picking one, and DA CAPO, the extra life.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js. It comes before the games, whose
// tables of power-ups hold DA_CAPO.
"use strict";

// ---------- DA CAPO: the extra life, a power-up for every game ----------
// From the top: a heart back, or with every heart full, one heart more, up to five. It's rarer than
// a game's own power-ups and never comes with no room for another heart. A game puts DA_CAPO in its
// table of power-ups (so it's on the POWER-UPS page), draws from that table with powerPick, gives
// its capsule the class pu-dacapo, and on taking it calls daCapo() and redraws its HUD. It runs for
// no time: nothing is kept, so it never stops another power-up coming.
const DA_CAPO={name:"DA CAPO", icon:"❤️", secs:0, instant:true, weight:.35, most:5,
  say:"FROM THE TOP: A LIFE BACK", page:"A LIFE BACK, OR WITH EVERY HEART FULL, ONE HEART MORE."};
const daCapoRoom=()=> !!blast && (blast.lives||0)<DA_CAPO.most;
// one of a table of power-ups, by their weights (1 unless given): da capo only with room for it
function powerPick(table){
  const ks=Object.keys(table).filter(k=>table[k]!==DA_CAPO || daCapoRoom());
  let r=Math.random()*ks.reduce((t,k)=>t+(table[k].weight??1), 0);
  for(const k of ks){ r-=table[k].weight??1; if(r<0) return k; }
  return ks[ks.length-1] ?? null;
}
// taken: a heart back, or one more; the banner says which. The game redraws its own HUD.
function daCapo(){
  if(!daCapoRoom()) return false;
  const full=(blast.lives||0)>=(blast.livesMax||3);
  blast.lives++;
  banner(DA_CAPO.name+"!", full ? "FROM THE TOP: AN EXTRA LIFE" : "FROM THE TOP: A LIFE BACK"); sfx("life");
  return true;
}
