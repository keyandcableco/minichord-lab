// The chord matrix a game deals from: which chord each of the minichord's seven button combinations
// plays. Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with
// the others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// A game that asks for chords by type (major, minor, 7 …) can instead be dealt the chords of another
// matrix, chosen at the start: STANDARD (the buttons as they come, or with Barry Harris mode its
// sixths), ALTERNATE (the stock alternate layout: sus4, sus2, 7sus4, maj9, m9, add9, 6/9), or CUSTOM
// (the alternate layout as the player's preset has loaded its slots, 202 to 208, from the firmware's
// catalogue). A game names its chords in standard terms; mxMap swaps each for whatever the same
// buttons play in the chosen matrix, so a level of "major and minor" becomes one of the major and minor
// buttons, sus4 and sus2 on the alternate matrix.
const MX_COMBO_ROWS=[[0],[1],[2],[0,2],[1,2],[0,1],[0,1,2]];   // the buttons, in slot order: major, minor, 7, major and 7, minor and 7, major and minor, all three
const MX_STANDARD=["","m","7","maj7","m7","°","+"];
const MX_BARRY=["6","m6","7","maj7","m7","°7","+"];
const MX_ALTERNATE=["sus4","sus2","7sus4","maj9","m9","add9","6/9"];
// the firmware's catalogue, by index (a slot holds 1 plus the index; 0 is the slot's own default),
// each as the chord it sounds in twelve: past the eighteenth come the just chords, which in twelve
// sound as supermajor, subminor, neutral, harmonic 7th, neutral 7th, subminor 7th, utonal tetrad,
// harmonic 9th, otonal hexad, just augmented and supermajor 7th
const MX_CATALOGUE=["","m","7","maj7","m7","°","+","6","m6","°7","m7♭5","sus4","sus2","7sus4","maj9","m9","add9","6/9",
  "","m","m","7","m7","m7","m7♭5","9","7","+","maj7"];
const MX_SLOT_DEFAULT=[11,12,13,14,15,16,17];
// the notes the minichord sounds for each, above the root (a ninth plays four of its five: no fifth)
const MX_TONES={"":[0,4,7],"m":[0,3,7],"7":[0,4,7,10],"maj7":[0,4,7,11],"m7":[0,3,7,10],"°":[0,3,6],"+":[0,4,8],
  "6":[0,4,7,9],"m6":[0,3,7,9],"°7":[0,3,6,9],"m7♭5":[0,3,6,10],"sus4":[0,5,7],"sus2":[0,2,7],"7sus4":[0,5,7,10],
  "maj9":[0,2,4,11],"m9":[0,2,3,10],"add9":[0,2,4,7],"6/9":[0,2,4,9],"9":[0,2,4,10]};
// the chords Chord Invaders' tiers don't price, by how many notes and how much tension
Object.entries({"sus4":15,"sus2":15,"7sus4":25,"add9":30,"maj9":40,"m9":40,"9":40,"6/9":45,"m7♭5":45}).forEach(([q,v])=>{ if(BLAST_WORTH[q]==null) BLAST_WORTH[q]=v; });
// and the two the spelling tables lack, as letter steps and semitones above the root
if(!FORM["9"]) FORM["9"]=[[0,0],[2,4],[6,10],[8,14]];
if(!FORM["m7♭5"]) FORM["m7♭5"]=[[0,0],[2,3],[4,6],[6,10]];

const MX_CHOICES=[["STANDARD","standard"],["ALTERNATE","alternate"],["CUSTOM","custom"]];
// which the connected firmware can do: the alternate layout (39), and slots to load it from (202 to 208)
function mxAvailable(){ return MX_CHOICES.filter(([,v])=> v==="standard" || (v==="alternate" && hasSetting(39)) || (v==="custom" && hasSetting(202))); }
// (a demo teaches the standard game: its chords, whatever the player has chosen or switched on)
const mxDemo=()=> !!(blast && blast.phase==="demo");
const mxChoice=()=> !mxDemo() && mxAvailable().some(([,v])=>v===saved.chordMatrix) ? saved.chordMatrix : "standard";
// the seven chords the buttons play now, in slot order
function mxNow(){
  const c=mxChoice();
  if(c==="alternate") return MX_ALTERNATE;
  if(c==="custom") return MX_SLOT_DEFAULT.map((d,i)=>{ const v=mc.params[202+i]|0; return MX_CATALOGUE[(v<=0 || v>MX_CATALOGUE.length) ? d : v-1]; });
  return !mxDemo() && mc.params && mc.params[33]===1 ? MX_BARRY : MX_STANDARD;
}
// a chord type as a game names it (standard, or Barry Harris's), as the same buttons play it now
function mxMap(q){ let i=MX_STANDARD.indexOf(q); if(i<0) i=MX_BARRY.indexOf(q); return i<0 ? q : mxNow()[i]; }
// the buttons that play a chord type now, for the on-screen minichord
function mxRows(q){ const i=mxNow().indexOf(q); return i<0 ? null : MX_COMBO_ROWS[i]; }
// set the minichord to the chosen matrix as a game starts: standard needs nothing (every game holds
// the standard layout already); the alternate layout with its stock chords; or with the preset's own
function mxApply(){
  if(!canWrite()) return;
  const c=mxChoice();
  if(c==="standard") return;
  ensure(39,1);
  if(c==="alternate" && hasSetting(202)) for(let i=0;i<7;i++) ensure(202+i,0);
}
const mxStandard=()=>mxChoice()==="standard";
// a chord type as a game names it, dealt on the chosen matrix (on the standard one it stays as it is)
const mxQ=q=> mxStandard() ? q : mxMap(q);
// A level's name on another matrix: "Major and minor" means the major and minor buttons, which play
// sus4 and sus2 on the alternate one, so a level that brings in chord types is named after the chords
// it brings, as the matrix plays them; one that only changes roots or keys keeps its name (or an
// alternative given for it, where the name would talk about chords, "Triads in G and F").
const MX_Q_NAME={"":"major","m":"minor","°":"dim","+":"aug","°7":"dim7"};
function mxList(qs){ const n=qs.map(q=>MX_Q_NAME[q]??q); return n.length<2 ? n.join("") : n.slice(0,-1).join(", ")+" and "+n[n.length-1]; }
function mxLevelName(name, qsOf, i, opt={}){
  if(mxStandard()) return name;
  const now=[...new Set(qsOf(i).map(mxMap))], before=new Set(i>0 ? qsOf(i-1).map(mxMap) : []);
  const added=now.filter(q=>!before.has(q));
  if(!added.length) return opt.alt || name;
  const s=mxList(added); return s[0].toUpperCase()+s.slice(1)+(opt.suffix||"");
}
// a tag for the HUD while a matrix other than the standard one plays
const mxTag=()=> ({alternate:" · ALTERNATE", custom:" · CUSTOM"})[mxChoice()] || "";
