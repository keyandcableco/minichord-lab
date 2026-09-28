// Chord Invaders: chords fall through space; play each before it lands. (Its demo is in invaders-
// demo.js, the space it falls through in ../screen.js.)
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Invaders (once the Sight reader) ----------
// An arcade round for everyone: chord symbols fall from the top, and each one played on the
// buttons before it lands is blasted. Three that land and the round is over. It starts with
// major and minor on the seven buttons as your key plays them and climbs every eight chords,
// a little faster each time: 7 chords, the roots the modifier reaches, maj7 and m7,
// diminished and augmented, inversions, any slash chord, and last Barry Harris mode, switched
// on mid-round once the field is clear. The modifier is set one way for the whole round.
//
// From level 3, every level also drops a key bar, "Key of D major". Set that key signature
// with the key change combo before it lands and the chords that follow, all from that key,
// are plain buttons; leave it and they need the modifier.
const BLAST_LEVELS=[{q:["","m"],acc:false},{q:["","m","7"],acc:false},{q:["","m","7"],acc:true},
  {q:["","m","7","maj7","m7"],acc:true},{q:["","m","7","maj7","m7","°","+"],acc:true},
  {q:["","m","7","maj7","m7","°","+"],acc:true,slash:"inversion"},      // C/E, Am/C: the bass is the chord's third or fifth
  {q:["","m","7","maj7","m7","°","+"],acc:true,slash:"any"},            // D/C, G/F: any button under the chord
  {q:["","m","7","maj7","m7","°","+"],acc:true,slash:"any",barry:true}]; // 6, m6 and °7 join, mid-round
// slash chords need the slash note in the bass: firmware 13's slash voice set to Bass
const slashReady=()=>!canWrite() || (mc.params[7]??0)>=13;
const levelOk=l=> !(BLAST_LEVELS[l].slash && !slashReady()) && !(BLAST_LEVELS[l].barry && (!canWrite() || settings.set==="barry"));
function nextLevel(l){ for(let n=l+1;n<BLAST_LEVELS.length;n++) if(levelOk(n)) return n; return l; }
const BARRY_SWAP={"":"6","m":"m6","°":"°7"};
let blast=null;
function genBlaster(){
  return {kind:"blaster", prompt:"Chord Invaders", sub:"Chords fall through space. Play each one on the buttons before it lands and the ship shoots it down; the lowest is lit. Three that land and it's game over. ★ chords score five times as much and do no harm if they get past. When a key bar falls, set that key signature with the key change combo, and the chords after it get easier. What the game hears shows at the foot of the field.",
    answer:{type:"blaster", get name(){ const l=lowestBlast(); return l ? l.sym : "the lowest chord"; }},
    get hint(){ const l=lowestBlast(); return l ? `The lowest is ${l.sym}: ${(spellChord(l.root,l.q)||[]).join(" ")}${l.bass?`, over ${l.bass} in the bass`:""}.` : "Wait for a chord to fall."; },
    hearFn:()=>{ const l=lowestBlast(); return l ? [...(l.bass?[[36+pcOfName(l.bass),0]]:[]), ...FORM[l.q].map(f=>[48+pcOfName(l.root)+f[1],0])] : []; },
    context:0, barry: settings.set==="barry" ? "6" : ""};
}
const lowestBlast=()=> blast ? blast.items.filter(i=>!i.done).sort((a,b)=>a.t0-b.t0)[0] || null : null;
const blastQuals=()=>BLAST_LEVELS[blast.level].q.map(x=> (settings.set==="barry" || blast.barry) ? (BARRY_SWAP[x]??x) : x);
function blastRoots(plainOnly){
  const f=canWrite() ? devFifths() : 0, out=[], lv=BLAST_LEVELS[blast.level];
  for(let li=0; li<7; li++){
    const ka=keyAcc(li,f);
    if(Math.abs(ka)<=1) out.push(LETTERS[li]+ACC[ka]);
    const a=ka+blast.dir, n=LETTERS[li]+(ACC[a]??"");
    if(!plainOnly && lv.acc && Math.abs(a)===1 && !["E♯","B♯","F♭","C♭"].includes(n)) out.push(n);
  }
  return out;
}
