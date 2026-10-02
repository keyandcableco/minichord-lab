/* ============================================================================
 * counterpoint.js: two-voice species counterpoint for Minichord Lab, after Fux's Gradus ad
 * Parnassum (1725). Pure: no page, no device, so it runs in Node as it does in the browser.
 *
 * Pitches are MIDI note numbers. A mode is one of MODES (or one moved to another final): its
 * final's pitch class and its steps above the final. Intervals are counted by degree within the
 * mode, so B–F is a diminished fifth and F–B an augmented fourth, and the raised seventh of a
 * cadence (musica ficta, C♯ in D Dorian) is the seventh degree raised, not a new letter.
 *
 * A counterpoint is a list of bars, one per cantus note: in the first species a note per bar (a
 * plain number will do), in the second and fourth two, [downbeat, upbeat], with null for the half
 * rest a line may open with (the fourth always does) and a single note in the last bar. In the fourth
 * species a downbeat the same as the upbeat before it is that note tied over the bar line.
 * ========================================================================== */

const mod=(a,n)=>((a%n)+n)%n;

// ---------- parallels, as Choir checks them ----------
// Two voices moving the same way from one fifth or octave to another, or the outer voices moving the
// same way into one with the top voice leaping more than a whole step: the rule the firmware's strict
// voice leading avoids. prev and next are Maps of voice -> MIDI note; each flag names the two voices
// (a sounding below b) and its kind: P5 or P8 for parallels, H5 or H8 for direct (hidden) ones.
export function findParallels(prev, next){
  const both=[...next.keys()].filter(i=>prev.has(i)).sort((a,b)=>next.get(a)-next.get(b));
  const flags=[];
  for(let x=0;x<both.length;x++) for(let y=x+1;y<both.length;y++){
    const a=both[x], b=both[y];                                     // a sounds below b now
    const ma=next.get(a)-prev.get(a), mb=next.get(b)-prev.get(b);
    if(!ma || !mb || (ma>0)!==(mb>0)) continue;
    const before=(((prev.get(b)-prev.get(a))%12)+12)%12, after=(((next.get(b)-next.get(a))%12)+12)%12;
    if(after!==0 && after!==7) continue;
    if(before===after) flags.push({a,b,kind:after===7?"P5":"P8"});
    else if(x===0 && y===both.length-1 && Math.abs(mb)>2) flags.push({a,b,kind:after===7?"H5":"H8"});
  }
  return flags;
}

// ---------- the modes ----------
// ficta: the step a final cadence raises by a semitone, where the mode has a whole tone below its
// final (Dorian's C becomes C♯); Phrygian, Lydian and Ionian need none.
export const MODES={
  dorian:    {name:"Dorian",     final:2, steps:[0,2,3,5,7,9,10], ficta:10},
  phrygian:  {name:"Phrygian",   final:4, steps:[0,1,3,5,7,8,10], ficta:null},
  lydian:    {name:"Lydian",     final:5, steps:[0,2,4,6,7,9,11], ficta:null},
  mixolydian:{name:"Mixolydian", final:7, steps:[0,2,4,5,7,9,10], ficta:10},
  aeolian:   {name:"Aeolian",    final:9, steps:[0,2,3,5,7,8,10], ficta:10},
  ionian:    {name:"Ionian",     final:0, steps:[0,2,4,5,7,9,11], ficta:null},
};

/** a note's place in the mode: pos counts degrees from the final in its octave (D4 in D Dorian 0, A4 4,
 * D5 7), alt is +1 for a degree raised (C♯), -1 lowered, 0 the mode's own */
export function degree(mode, midi){
  const rel=midi-mode.final, oct=Math.floor(rel/12), r=rel-12*oct, s=mode.steps;
  let i=s.indexOf(r);
  if(i>=0) return {pos:oct*7+i, alt:0};
  i=s.indexOf(r-1);
  if(i>=0) return {pos:oct*7+i, alt:1};
  if(r+1===12) return {pos:(oct+1)*7, alt:-1};
  i=s.indexOf(r+1);
  return i>=0 ? {pos:oct*7+i, alt:-1} : null;
}

/** the mode's notes from low (itself in the mode) upwards, count of them: the harp's strings */
export function modeWindow(mode, low, count=12){
  const out=[]; for(let m=low; out.length<count; m++){ const d=degree(mode,m); if(d && !d.alt) out.push(m); }
  return out;
}

/** the harp's twelve strings for a counterpoint to this cantus: above it, from its lowest note up;
 * below it, up to its highest note, so the line has room under the cantus. shift moves the window
 * that many degrees further from the cantus, for a cantus that leaves too little room. */
export function harpWindow(mode, cantus, above=true, shift=0, count=12){
  if(above){ const w=modeWindow(mode, Math.min(...cantus), count+shift); return w.slice(shift); }
  const top=Math.max(...cantus), w=modeWindow(mode, top-36, 3*count).filter(m=>m<=top);
  return w.slice(w.length-count-shift, w.length-shift);
}

// ---------- intervals and motion ----------
const MAJOR_STEPS=[0,2,4,5,7,9,11];
/** the interval between two notes, by degree within the mode: its number (1 unison, 8 octave, 10 a
 * tenth), quality (P M m A d), name ("m6", "P12", "A4") and class: perfect (unisons, fifths, octaves),
 * imperfect (thirds and sixths) or dissonant (the fourth among them, in two voices) */
export function interval(mode, a, b){
  const lo=Math.min(a,b), hi=Math.max(a,b), semis=hi-lo;
  const dl=degree(mode,lo), dh=degree(mode,hi);
  const steps=Math.max(0, dl && dh ? dh.pos-dl.pos : Math.round(semis*7/12));
  const simple=steps%7, octs=Math.floor(steps/7), diff=semis-12*octs-MAJOR_STEPS[simple];
  let quality;
  if(simple===0 || simple===3 || simple===4) quality = diff===0 ? "P" : diff<0 ? "d".repeat(-diff) : "A".repeat(diff);
  else quality = diff===0 ? "M" : diff===-1 ? "m" : diff<-1 ? "d".repeat(-diff-1) : "A".repeat(diff);
  let cls="dissonant";
  if(quality==="P" && simple!==3) cls="perfect";
  else if((quality==="M" || quality==="m") && (simple===2 || simple===5)) cls="imperfect";
  return {semis, steps, number:steps+1, simple:simple+1, quality, name:quality+(steps+1), class:cls};
}

/** how two voices move from one pair of notes to the next: contrary, oblique (one holds), similar
 * (the same way), parallel (the same way, keeping their distance), or none (both hold) */
export function motion(a0, a1, b0, b1){
  const da=a1-a0, db=b1-b0;
  if(!da && !db) return "none";
  if(!da || !db) return "oblique";
  if(Math.sign(da)!==Math.sign(db)) return "contrary";
  return b1-a1===b0-a0 ? "parallel" : "similar";
}

// ---------- the rules ----------
// Each finding has a severity: fatal (forbidden outright: a crash), fault (forbidden, but a slip
// rather than a wreck), style (allowed, but Aloysius would rather not) or praise.
export const RULES={
  dissonance:   {severity:"fatal", text:"A dissonance"},
  passing:      {severity:"fatal", text:"A dissonance that doesn't pass"},
  parallel5:    {severity:"fatal", text:"Parallel fifths"},
  parallel8:    {severity:"fatal", text:"Parallel octaves"},
  start:        {severity:"fatal", text:"Begin on a perfect consonance"},
  end:          {severity:"fatal", text:"End on the unison or octave"},
  cadence:      {severity:"fatal", text:"The cadence: a major sixth to the octave, or a minor third to the unison, by step"},
  direct:       {severity:"fault", text:"A perfect consonance reached by similar motion"},
  antiparallel: {severity:"fault", text:"Fifths or octaves by contrary motion"},
  downbeats:    {severity:"fault", text:"Fifths or octaves on successive downbeats"},
  unison:       {severity:"fault", text:"A unison between the first and last bars"},
  melodic:      {severity:"fault", text:"A leap no singer should be asked for"},
  unrecovered:  {severity:"fault", text:"A leap not turned back from"},
  crossing:     {severity:"fault", text:"The voices cross"},
  overlap:      {severity:"fault", text:"A voice moves past where the other just was"},
  chromatic:    {severity:"fault", text:"A note outside the mode"},
  repeat:       {severity:"style", text:"A repeated note"},
  run:          {severity:"style", text:"Too many thirds or sixths in a row"},
  spacing:      {severity:"style", text:"The voices more than a tenth apart"},
  climax:       {severity:"style", text:"The highest note comes more than once"},
  outline:      {severity:"style", text:"A tritone outlined"},
  resolution:   {severity:"fatal", text:"A suspension must resolve down by step to a consonance"},
  suspension:   {severity:"fault", text:"A suspension Fux doesn't allow"},
  upbeats:      {severity:"fault", text:"Fifths or octaves on successive upbeats"},
  untied:       {severity:"style", text:"The tie broken"},
  ninth:        {severity:"style", text:"A ninth suspended to the octave"},
  contrary:     {severity:"praise", text:"Contrary motion"},
  suspended:    {severity:"praise", text:"A suspension, resolved"},
};
// in the second species a note repeated is a fault: it undoes the point of two notes to one
const SEVERITY_2={repeat:"fault"};

// the counterpoint as one line of sounding notes, each with the cantus note under it
function line(cantus, cp){
  const out=[];
  cp.forEach((bar,i)=>{
    const notes=Array.isArray(bar) ? bar : [bar];
    notes.forEach((p,j)=>{ if(p!=null) out.push({bar:i, beat:j, last:j===notes.length-1, c:cantus[i], p}); });
  });
  return out;
}

/** every finding in a counterpoint against its cantus: [{bar, beat, rule, severity, text}], in order.
 * A counterpoint shorter than its cantus is checked as far as it goes (nothing about how it ends,
 * and a leap or a dissonance waiting on the next note isn't judged yet): what the solver needs. */
export function check({cantus, cp, mode, species=1, above=true}){
  const found=[], L=line(cantus,cp), n=cantus.length;
  const complete = cp.length===n && L.length>0 && L[L.length-1].bar===n-1;
  const add=(t,rule)=>found.push({bar:t.bar, beat:t.beat, rule, severity:(species===2 && SEVERITY_2[rule]) || RULES[rule].severity, text:RULES[rule].text});
  const iv=t=>interval(mode,t.c,t.p), mel=(a,b)=>interval(mode,a.p,b.p);
  const strong=t=>species===1 || t.beat===0;
  const cadenceNote=t=>t.bar===n-2 && t.last;   // the note that steps to the final
  // the fourth species' ties: a downbeat held over from the upbeat before it. The line as sung (for
  // its leaps, repeats, climax) has each tied note once.
  L.forEach((t,k)=>{ const q=L[k-1]; t.tied = species===4 && t.beat===0 && !!q && q.bar===t.bar-1 && q.p===t.p; });
  const ML=L.filter(t=>!t.tied), mAt=new Map(ML.map((t,i)=>[t,i]));
  let run=0, runKind=0, lastDown=null, lastUp=null;
  L.forEach((t,k)=>{
    const I=iv(t), prev=L[k-1], next=L[k+1], first=k===0, final=complete && k===L.length-1;
    // the sound itself
    if(species===4){
      // A tied downbeat may clash, as a suspension: prepared by the tie, it must step down to a
      // consonance on the upbeat. Above the cantus, 7–6 and 4–3 (9–8 grudgingly; 2–1 not at all);
      // below it, 2–3 (or 9–10). Any other note, an upbeat or a downbeat not tied, must be consonant.
      if(t.tied && I.class==="dissonant"){
        const sp=I.simple, ok = above ? sp===7 || sp===4 || (sp===2 && I.number>8) : sp===2;
        if(!ok) add(t,"suspension"); else if(above && sp===2) add(t,"ninth");
        if(next || complete){
          const res = next && next.bar===t.bar && next.p<t.p && mel(t,next).steps===1 && iv(next).class!=="dissonant";
          if(!res) add(t,"resolution"); else if(ok) add(t,"suspended");
        }
      } else if(I.class==="dissonant") add(t,"dissonance");
      if(t.beat===0 && !t.tied && t.bar>0 && t.bar<n-1) add(t,"untied");
    } else if(I.class==="dissonant"){
      if(strong(t)) add(t,"dissonance");
      else if(next || complete){
        const by=(a,b)=>mel(a,b).steps===1;
        const passes=prev && next && by(prev,t) && by(t,next) && Math.sign(t.p-prev.p)===Math.sign(next.p-t.p);
        if(!passes) add(t,"passing");
      }
    }
    if(above ? t.p<t.c : t.p>t.c) add(t,"crossing");
    if(first && (I.class!=="perfect" || (!above && I.simple===5))) add(t,"start");
    if(!first && !final && I.semis===0 && strong(t)) add(t,"unison");
    if(I.number>10) add(t,"spacing");
    if(degree(mode,t.p)?.alt && !cadenceNote(t)) add(t,"chromatic");
    if(final){
      if(!(I.class==="perfect" && I.simple===1)) add(t,"end");
      const Ip=prev && iv(prev);
      const want = above ? Ip && Ip.quality==="M" && Ip.simple===6 : Ip && Ip.quality==="m" && Ip.simple===3;
      if(prev && !(want && motion(prev.c,t.c,prev.p,t.p)==="contrary" && mel(prev,t).steps===1 && interval(mode,prev.c,t.c).steps===1)) add(prev,"cadence");
    }
    // thirds or sixths, one kind, more than three in a row (downbeats, in the second species)
    if(strong(t)){
      const kind = I.class==="imperfect" ? I.simple : 0;
      run = kind && kind===runKind ? run+1 : (kind ? 1 : 0); runKind=kind;
      if(run===4) add(t,"run");
    }
    if(prev){
      // how the voices move (in the fourth species, mostly one at a time: the ties)
      const Ip=iv(prev), m=motion(prev.c,t.c,prev.p,t.p);
      if(I.class==="perfect" && Ip.class==="perfect" && I.simple===Ip.simple && m!=="oblique" && m!=="none")
        add(t, m==="contrary" ? "antiparallel" : I.simple===5 ? "parallel5" : "parallel8");
      else if(I.class==="perfect" && (m==="similar" || m==="parallel")) add(t,"direct");
      if(m==="contrary") add(t,"contrary");
      if(prev.bar!==t.bar && (above ? t.p<prev.c || t.c>prev.p : t.p>prev.c || t.c<prev.p)) add(t,"overlap");
    }
    // the line itself, as sung: a tied note is one note
    const mi=mAt.get(t), mp=mi>0 ? ML[mi-1] : null, mp2=mi>1 ? ML[mi-2] : null;
    if(mp){
      const M=mel(mp,t), dir=Math.sign(t.p-mp.p);
      if(!dir) add(t,"repeat");
      else if(M.quality!=="P" && M.quality!=="M" && M.quality!=="m" || M.simple===7 || M.number>8 ||
              (M.number===6 && (M.quality==="M" || dir<0))) add(t,"melodic");
      // a leap of a fourth or more is followed by a turn the other way
      if(mp2){ const before=mel(mp2,mp); if(before.number>=4 && Math.sign(t.p-mp.p)!==-Math.sign(mp.p-mp2.p)) add(mp,"unrecovered"); }
    }
    // the fourth species: fifths or octaves from one upbeat to the next, the ties between them no help
    if(species===4 && t.beat===1){
      if(lastUp && lastUp.bar===t.bar-1){ const Iu=iv(lastUp); if(I.class==="perfect" && Iu.class==="perfect" && I.simple===Iu.simple) add(t,"upbeats"); }
      lastUp=t;
    }
    // fifths or octaves from one downbeat to the next, not saved by the upbeat between unless it leaps
    // a fourth or more
    if(species===2 && t.beat===0){
      if(lastDown && prev && prev!==lastDown && lastDown.bar===t.bar-1){
        const Id=iv(lastDown);
        if(I.class==="perfect" && Id.class==="perfect" && I.simple===Id.simple && mel(lastDown,prev).number<4) add(t,"downbeats");
      }
      lastDown=t;
    }
  });
  if(complete){
    // one highest note (a tied one counts once)
    const top=Math.max(...ML.map(t=>t.p)), tops=ML.filter(t=>t.p===top);
    if(tops.length>1) add(tops[1],"climax");
    // a run in one direction whose ends are a tritone apart
    let s=0;
    for(let k=1;k<ML.length;k++){
      const d=Math.sign(ML[k].p-ML[k-1].p), on=k+1<ML.length ? Math.sign(ML[k+1].p-ML[k].p) : 0;
      if(d && d===on) continue;                                     // the run goes on
      if(d && k-s>=2){ const q=interval(mode,ML[s].p,ML[k].p); if(q.name==="A4" || q.name==="d5") add(ML[k],"outline"); }
      s=k;
    }
    found.sort((x,y)=>x.bar-y.bar || x.beat-y.beat);
  }
  return found;
}

/** whether a finding is forbidden (fatal or a fault), not just a matter of style or praise */
export const forbidden=f=>f.severity==="fatal" || f.severity==="fault";

// ---------- the solver ----------
// a small seeded random: the same seed, the same counterpoint
function rand(seed){ let a=seed>>>0; return ()=>{ a=a+0x6D2B79F5>>>0; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

/** a counterpoint to the cantus with nothing forbidden in it, and as little to grumble at as can be
 * found, from the notes given (the harp's strings): the cadence may raise the mode's ficta step. The
 * second species opens on the downbeat and ends on a whole note. null if none is found in budget
 * (60000 tries of a note, a few seconds at worst). */
export function solve(opts){
  // the second species tries two notes in the penultimate bar first, then (as Fux allows, where the
  // mode has no fifth to give there) a whole note
  const budget=opts.budget||60000;
  if(opts.species!==2) return solveWith(opts, false, budget);
  return solveWith(opts, false, budget*2/3) || solveWith(opts, true, budget/3);
}
function solveWith({cantus, mode, species=1, above=true, pitches, seed=1}, wholePenult, budget){
  const n=cantus.length, r=rand(seed);
  const slots=[];
  for(let b=0;b<n;b++){
    if(species===4){ if(b===0) slots.push({bar:0, beat:0, fixed:null}, {bar:0, beat:1}); else if(b<n-1) slots.push({bar:b, beat:0}, {bar:b, beat:1}); else slots.push({bar:b, beat:0}); continue; }
    for(let j=0;j<(species===2 && b<n-1 && !(wholePenult && b===n-2) ? 2 : 1);j++) slots.push({bar:b, beat:j});
  }
  const raised=pitches.filter(p=>mode.ficta!=null && mod(p-mode.final,12)===mode.ficta).map(p=>p+1);
  const shape=flat=>{ const cp=[]; flat.forEach((p,i)=>{ const s=slots[i]; if(species===1) cp[s.bar]=p; else (cp[s.bar]||(cp[s.bar]=[])).push(p); }); return cp; };
  const styleOf=fs=>fs.filter(f=>f.severity==="style").length;
  // the ending is known before the search starts: the last note a unison or octave with the cantus,
  // the one before it the sixth or third that steps into it
  const c1=cantus[n-1], c0=cantus[n-2];
  const finals=pitches.filter(p=>(above ? p>=c1 : p<=c1) && mod(p-c1,12)===0);
  const cadences=pitches.concat(raised).filter(p=>{ const I=interval(mode,c0,p);
    return (above ? p>c0 && I.quality==="M" && I.simple===6 : p<c0 && I.quality==="m" && I.simple===3) && finals.some(f=>interval(mode,p,f).steps===1); });
  let checks=0;                                                     // the budget is for all the tries together
  for(let allow=0; allow<=3; allow++){
    // A place in the line that led nowhere, remembered by the notes just before it and the style
    // spent so far, so the search doesn't walk into it again. (The rules that look further back,
    // the climax and an outlined tritone, are only judged at the end, so now and then a way is
    // given up that might have done.)
    const dead=new Set(), flat=[];
    const go=(i,spent)=>{
      if(i===slots.length) return shape(flat);
      const key=i+":"+flat.slice(Math.max(0,i-3),i).join(",")+":"+spent;
      if(dead.has(key)) return null;
      const s=slots[i], prev=flat[i-1];
      if(s.fixed!==undefined){ flat[i]=s.fixed; const got=go(i+1,spent); if(got) return got; flat.length=i; return null; }   // the fourth species' opening rest
      const pool = i===slots.length-1 ? finals : s.bar===n-2 && slots[i+1].bar===n-1 ? cadences
        : species===4 && s.beat===0 && prev!=null ? [prev].concat(pitches.filter(p=>p!==prev)) : pitches;   // the tie first
      const cands=pool.map(p=>({p, k:r()+(prev==null ? 0 : .12*Math.abs(degree(mode,p).pos-degree(mode,prev).pos))-(species===4 && s.beat===0 && p===prev ? 1 : 0)})).sort((x,y)=>x.k-y.k);
      for(const {p} of cands){
        if(++checks>budget) return null;
        flat[i]=p;
        const fs=check({cantus, cp:shape(flat.slice(0,i+1)), mode, species, above}), st=styleOf(fs);
        if(!fs.some(forbidden) && st<=allow){ const got=go(i+1,st); if(got) return got; }
      }
      flat.length=i;
      if(checks<=budget) dead.add(key);
      return null;
    };
    const got=go(0,0);
    if(got) return got;
    if(checks>budget) return null;
  }
  return null;
}

// ---------- the cantus firmi ----------
const LETTER={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
/** a note's name to MIDI: "C4" 60, "F#3" 54, "Bb4" 70 */
export const midiOf=name=>{ const m=/^([A-G])([#b♯♭]?)(-?\d)$/.exec(name); return 12*(+m[3]+1)+LETTER[m[1]]+({"#":1,"♯":1,b:-1,"♭":-1}[m[2]]||0); };
// Fux's cantus firmi for two voices, one in each mode. TO VERIFY against a facsimile of the 1725
// Gradus before release: written down from memory, not from the source.
export const CANTUS=[
  {mode:"dorian",     notes:"D4 F4 E4 D4 G4 F4 A4 G4 F4 E4 D4"},
  {mode:"phrygian",   notes:"E4 C4 D4 C4 A3 A4 G4 E4 F4 E4"},
  {mode:"lydian",     notes:"F4 G4 A4 F4 D4 E4 F4 C5 A4 F4 G4 F4"},
  {mode:"mixolydian", notes:"G3 C4 B3 G3 C4 E4 D4 G4 E4 C4 D4 B3 A3 G3"},
  {mode:"aeolian",    notes:"A3 C4 B3 D4 C4 E4 F4 E4 D4 C4 B3 A3"},
  {mode:"ionian",     notes:"C4 E4 F4 G4 E4 A4 G4 E4 F4 E4 D4 C4"},
].map(c=>({...c, cantus:c.notes.split(" ").map(midiOf)}));
