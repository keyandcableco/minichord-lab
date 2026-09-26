/* ============================================================================
 * theory.js: pitch-class set tools for Minichord Lab, in any equal division N
 * (12 for the usual chromatic, 19 and 31 for the minichord's EDO temperaments)
 * ========================================================================== */
import {spell} from "./minichord.js";

const mod=(a,n)=>((a%n)+n)%n;

/** continuous pitch class in semitones, 0 <= pc < 12 */
export const pcOf = pitch => mod(pitch,12);
/** nearest step of the division for a pitch, 0..N-1 */
export const stepOf = (pitch,N=12) => mod(Math.round(pcOf(pitch)*N/12), N);
/** sorted distinct steps of a set of pitches */
export const pcSet = (pitches,N=12) => [...new Set(pitches.map(p=>stepOf(p,N)))].sort((a,b)=>a-b);

/** how many times each interval class occurs, classes 1..floor(N/2) */
export function intervalVector(set,N=12){
  const v=new Array(Math.floor(N/2)).fill(0);
  for(let i=0;i<set.length;i++) for(let j=i+1;j<set.length;j++){
    let d=mod(set[j]-set[i],N); d=Math.min(d,N-d); if(d) v[d-1]++;
  }
  return v;
}

// Rahn's normal form: the rotation with the smallest span, ties broken from the right
function normal(set,N){
  const s=[...set].sort((a,b)=>a-b), n=s.length; if(n<2) return s.map(x=>x-s[0]||0);
  let best=null;
  for(let r=0;r<n;r++){
    const rot=s.slice(r).concat(s.slice(0,r).map(x=>x+N));
    const t=rot.map(x=>x-rot[0]);
    if(!best || better(t,best)) best=t;
  }
  return best;
}
function better(a,b){
  for(let i=a.length-1;i>0;i--){ if(a[i]!==b[i]) return a[i]<b[i]; }
  return false;
}
/** prime form: the more compact of the set's normal form and its inversion's */
export function primeForm(set,N=12){
  if(!set.length) return [];
  const a=normal(set,N), b=normal(set.map(x=>mod(-x,N)),N);
  return better(b,a) ? b : a;
}

// Forte numbers for three- and four-note sets in twelve steps (Rahn prime forms)
const FORTE={
  "012":"3-1","013":"3-2","014":"3-3","015":"3-4","016":"3-5","024":"3-6","025":"3-7","026":"3-8","027":"3-9","036":"3-10","037":"3-11","048":"3-12",
  "0123":"4-1","0124":"4-2","0134":"4-3","0125":"4-4","0126":"4-5","0127":"4-6","0145":"4-7","0156":"4-8","0167":"4-9","0235":"4-10",
  "0135":"4-11","0236":"4-12","0136":"4-13","0237":"4-14","0146":"4-Z15","0157":"4-16","0347":"4-17","0147":"4-18","0148":"4-19",
  "0158":"4-20","0246":"4-21","0247":"4-22","0257":"4-23","0248":"4-24","0268":"4-25","0358":"4-26","0258":"4-27","0369":"4-28","0137":"4-Z29",
};
const FAMILIAR={
  "3-11":"major and minor triads","3-10":"diminished triad","3-12":"augmented triad","3-9":"sus chords, stacked fourths",
  "3-7":"minor 7th without its 5th","3-8":"dominant 7th without its 5th","3-4":"major 7th without its 5th","3-3":"major and minor third on one root",
  "4-26":"minor 7th and major 6th","4-27":"dominant 7th and half-diminished 7th","4-20":"major 7th","4-28":"diminished 7th",
  "4-19":"minor-major 7th, augmented with a major 7th","4-22":"add9 chords","4-23":"7sus4, stacked fourths","4-24":"augmented 7th, 9th without a 5th",
  "4-25":"French sixth","4-Z29":"all-interval tetrachord","4-Z15":"all-interval tetrachord","4-11":"9th chords without their 5th","4-14":"minor add9",
};
const fmtStep = x => x<10 ? String(x) : x===10 ? "t" : x===11 ? "e" : `(${x})`;
export function setClass(set,N=12){
  const pf=primeForm(set,N);
  const key=pf.map(fmtStep).join("");
  const forte = N===12 ? FORTE[key]||null : null;
  return {prime:pf, primeText: N===12 ? `(${key})` : `(${pf.join(" ")})`, forte, familiar: forte ? FAMILIAR[forte]||null : null};
}

/** is b a turn (Tn) or a mirror image (TnI) of a? Returns {kind:"T"|"I", n} or null */
export function relation(a,b,N=12){
  if(a.length!==b.length || !a.length) return null;
  const B=b.join(",");
  for(let n=0;n<N;n++) if(a.map(x=>mod(x+n,N)).sort((x,y)=>x-y).join(",")===B) return {kind:"T",n};
  for(let n=0;n<N;n++) if(a.map(x=>mod(n-x,N)).sort((x,y)=>x-y).join(",")===B) return {kind:"I",n};
  return null;
}
/** turns (other than 0) that leave the set unchanged, and whether some mirror does */
export function symmetry(set,N=12){
  const S=set.join(","), turns=[];
  for(let n=1;n<N;n++) if(set.map(x=>mod(x+n,N)).sort((x,y)=>x-y).join(",")===S) turns.push(n);
  let mirror=false;
  for(let n=0;n<N;n++) if(set.map(x=>mod(n-x,N)).sort((x,y)=>x-y).join(",")===S){ mirror=true; break; }
  return {turns, mirror};
}

// chord names in twelve steps: interval sets above the root, in order of preference
const QUALITIES=[
  ["", [0,4,7]], ["m",[0,3,7]], ["°",[0,3,6]], ["+",[0,4,8]], ["sus4",[0,5,7]], ["sus2",[0,2,7]], ["5",[0,7]],
  ["7",[0,4,7,10]], ["maj7",[0,4,7,11]], ["m7",[0,3,7,10]], ["m7♭5",[0,3,6,10]], ["°7",[0,3,6,9]],
  ["6",[0,4,7,9]], ["m6",[0,3,7,9]], ["m(maj7)",[0,3,7,11]], ["7sus4",[0,5,7,10]], ["+7",[0,4,8,10]],
  ["add9",[0,2,4,7]], ["m(add9)",[0,2,3,7]], ["6/9",[0,2,4,7,9]], ["6/9",[0,2,4,9]], ["9",[0,2,4,7,10]], ["maj9",[0,2,4,7,11]], ["m9",[0,2,3,7,10]],
  ["7",[0,4,10]], ["maj7",[0,4,11]], ["m7",[0,3,10]], ["9",[0,2,4,10]], ["maj9",[0,2,4,11]], ["m9",[0,2,3,10]],
];
/** the chord's root, quality symbol and bass (pitch classes in twelve steps), or null if it has no name here */
export function chordId(pitches){
  if(!pitches.length) return null;
  const set=pcSet(pitches,12), bass=stepOf(Math.min(...pitches),12);
  const S=set.join(",");
  let found=null;
  for(const [q,iv] of QUALITIES){
    for(const root of set){
      if(iv.map(x=>mod(root+x,12)).sort((a,b)=>a-b).join(",")!==S) continue;
      if(!found || (root===bass && found.root!==bass)) found={root,q};
    }
    if(found && found.root===bass) break;
  }
  return found ? {root:found.root, quality:found.q, bass} : null;
}
/** a chord symbol for pitches in twelve steps, spelled for the key, or null */
export function chordName(pitches,keyFifths=0){
  const id=chordId(pitches); if(!id) return null;
  const name=spell(id.root,keyFifths)+id.quality;
  return id.root===id.bass ? name : `${name}/${spell(id.bass,keyFifths)}`;
}
/** could these pitches be the chord with this root and quality symbol? (a missing 5th is allowed) */
export function isChord(pitches, root, quality){
  const S=pcSet(pitches,12).join(",");
  return QUALITIES.some(([q,iv])=>q===quality && iv.map(x=>mod(root+x,12)).sort((a,b)=>a-b).join(",")===S);
}
/** the pitch classes of a chord, full form */
export function chordTones(root, quality){
  const q=QUALITIES.find(([name])=>name===quality); return q ? q[1].map(x=>mod(root+x,12)) : [];
}

// ---------- voice leading ----------
const circ = (a,b) => { const d=mod(b-a,12); return d>6 ? d-12 : d; };   // signed shortest move between pitch classes
/** every way to give each voice one of k targets, keeping only those that use every target when there are enough voices */
function* assignments(nVoices,k){
  const idx=new Array(nVoices).fill(0);
  while(true){
    if(nVoices<k || new Set(idx).size===k) yield idx.slice();
    let i=0; while(i<nVoices && ++idx[i]===k){ idx[i]=0; i++; }
    if(i===nVoices) return;
  }
}
/** the least total motion, in semitones, that could take these voices to the next chord's pitch classes */
export function smoothestMotion(prevPitches, nextPitches){
  const pcs=[...new Set(nextPitches.map(p=>Math.round(pcOf(p)*1000)/1000))];
  if(!prevPitches.length || !pcs.length) return 0;
  let best=Infinity;
  for(const a of assignments(prevPitches.length, pcs.length)){
    let s=0; a.forEach((t,v)=>{ s+=Math.abs(circ(pcOf(prevPitches[v]), pcs[t])); });
    if(s<best) best=s;
  }
  return best;
}
/** voices moved to the next chord as smoothly as possible (every pitch class used, the rest doubled) */
export function voiceLead(prevPitches, pcs){
  let best=null, bestCost=Infinity;
  for(const a of assignments(prevPitches.length, pcs.length)){
    const next=a.map((t,v)=>prevPitches[v]+circ(pcOf(prevPitches[v]), pcs[t]));
    const cost=next.reduce((s,p,v)=>s+Math.abs(p-prevPitches[v]),0);
    if(cost<bestCost){ bestCost=cost; best=next; }
  }
  return best.sort((x,y)=>x-y);
}

// ---------- roughness ----------
const hz = p => 440*Math.pow(2,(p-69)/12);
/** Sethares's roughness for tones with the given number of harmonics, each softer by `rolloff` */
export function roughness(pitches, partials=6, rolloff=0.88){
  const f=[], a=[];
  for(const p of pitches) for(let k=1;k<=partials;k++){ f.push(hz(p)*k); a.push(Math.pow(rolloff,k-1)); }
  let d=0;
  for(let i=0;i<f.length;i++) for(let j=i+1;j<f.length;j++){
    const lo=Math.min(f[i],f[j]), x=Math.abs(f[i]-f[j]);
    const s=0.24/(0.0207*lo+18.96);
    d += Math.min(a[i],a[j]) * (Math.exp(-3.51*s*x) - Math.exp(-5.75*s*x));
  }
  return d;
}

/** frequency in Hz of a pitch in semitones (69 = A4) */
export const hzOf = (pitch, aHz=440) => aHz*Math.pow(2,(pitch-69)/12);

// ---------- pure ratios and beats ----------
const INTERVAL_NAMES=["unison","minor 2nd","major 2nd","minor 3rd","major 3rd","perfect 4th","tritone","perfect 5th","minor 6th","major 6th","minor 7th","major 7th"];
// the pure ratio a tuner listens for, for each interval inside an octave
const PURE={0:[1,1],1:[16,15],2:[9,8],3:[6,5],4:[5,4],5:[4,3],6:[7,5],7:[3,2],8:[8,5],9:[5,3],10:[9,5],11:[15,8]};
const gcd=(a,b)=>b?gcd(b,a%b):a;
/** name, nearest pure ratio, how far off it the interval is, and how fast its closest overtones beat */
export function beatInfo(lowPitch, highPitch, aHz=440){
  const [lo,hi] = lowPitch<=highPitch ? [lowPitch,highPitch] : [highPitch,lowPitch];
  const semis=Math.round(hi-lo), oct=Math.floor(semis/12), ic=semis-12*oct;
  let [P,Q]=PURE[ic];
  if(ic===10){ const c=(hi-lo-12*oct)*100; if(Math.abs(c-968.8)<Math.abs(c-1017.6)) [P,Q]=[7,4]; }   // harmonic 7th when closer
  P*=2**oct; const g=gcd(P,Q); P/=g; Q/=g;
  const f1=hzOf(lo,aHz), f2=hzOf(hi,aHz);
  const cents=1200*Math.log2((f2/f1)/(P/Q));
  const beat=Math.abs(Q*f2-P*f1);
  const name = oct===0 ? INTERVAL_NAMES[ic] : ic===0 ? (oct===1?"octave":`${oct} octaves`) : `${INTERVAL_NAMES[ic]} + ${oct===1?"an octave":oct+" octaves"}`;
  return {name, P, Q, cents, beat, f1, f2, lowHarmonic:P, highHarmonic:Q};
}
