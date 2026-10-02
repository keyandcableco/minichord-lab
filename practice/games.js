// The Practice Room's own games: spelling, the staff, how to press a chord, the round generators, the
// mystery settings, the alternate layout, Reshape and Seven chords.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

const mc=new Minichord(); window.mc=mc;
const piano=new Piano();
// A page put away (another tab, the phone's home screen, its screen locked) goes quiet: the sound is
// paused where it is, held notes and noise included, and picks up again when the page comes back.
let pianoAway=false;
document.addEventListener("visibilitychange", ()=>{
  const ctx=piano.ctx; if(!ctx) return;
  if(document.hidden){ if(ctx.state==="running"){ pianoAway=true; ctx.suspend().catch(()=>{}); } }
  else if(pianoAway){ pianoAway=false; ctx.resume().catch(()=>{}); }
});
const $=id=>document.getElementById(id);
const mod=(a,n)=>((a%n)+n)%n;
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; };
const canWrite=()=>!!(mc.sysex && mc.out && mc.params[35]!==undefined);
/** the no-minichord text for a round, or why a connected one can't take the setting yet */
function offline(plain){
  if(!mc.midi || !mc.inputs.length) return plain+" With a minichord connected, the game sets it for you.";
  if(!mc.sysex) return plain+" Your minichord is connected, but the browser didn't allow system-exclusive access, so the game can't change its settings. Allow \"MIDI device control & reprogram\" in the site settings and reload.";
  if(!mc.out) return plain+" The minichord's chord port isn't showing as an output, so the game can't change its settings.";
  return plain+" Reading your minichord's settings; this round will reset itself on your minichord as soon as they arrive.";
}

// ---------- spelling ----------
const MAJOR=[0,2,4,5,7,9,11];
const LETTERS="CDEFGAB", NAT=[0,2,4,5,7,9,11];
const ACC={"-2":"𝄫","-1":"♭","0":"","1":"♯","2":"𝄪"};
const parse=name=>({li:LETTERS.indexOf(name[0]), acc:[...name.slice(1)].reduce((s,c)=>s+({"♯":1,"♭":-1,"𝄪":2,"𝄫":-2}[c]||0),0)});
const pcOfName=name=>{ const {li,acc}=parse(name); return mod(NAT[li]+acc,12); };
/** the note `steps` letters and `semis` semitones above a named note, spelled by letter; null past a double accidental */
function above(name, steps, semis){
  const {li,acc}=parse(name), tl=(li+steps)%7, target=mod(NAT[li]+acc+semis,12);
  let a=mod(target-NAT[tl],12); if(a>6) a-=12;
  return Math.abs(a)>2 ? null : LETTERS[tl]+ACC[a];
}
// chord tones as [letter steps, semitones]; ninths sit above the octave
const FORM={
  "":[[0,0],[2,4],[4,7]], "m":[[0,0],[2,3],[4,7]], "°":[[0,0],[2,3],[4,6]], "+":[[0,0],[2,4],[4,8]],
  "7":[[0,0],[2,4],[4,7],[6,10]], "maj7":[[0,0],[2,4],[4,7],[6,11]], "m7":[[0,0],[2,3],[4,7],[6,10]],
  "6":[[0,0],[2,4],[4,7],[5,9]], "m6":[[0,0],[2,3],[4,7],[5,9]], "°7":[[0,0],[2,3],[4,6],[6,9]],
  "sus4":[[0,0],[3,5],[4,7]], "sus2":[[0,0],[1,2],[4,7]], "7sus4":[[0,0],[3,5],[4,7],[6,10]],
  "maj9":[[0,0],[2,4],[6,11],[8,14]], "m9":[[0,0],[2,3],[6,10],[8,14]], "add9":[[0,0],[2,4],[4,7],[8,14]], "6/9":[[0,0],[2,4],[5,9],[8,14]],
};
// which buttons make each chord, so a reveal teaches the instrument too
// The chord buttons are a grid: seven columns, one per letter, and three rows (major, minor, 7), so a
// chord is the button where its column meets a row, and the richer chords are two or three of that
// column's rows held together.
const BUTTONS={"":"on the major row","m":"on the minor row","7":"on the 7 row","maj7":"holding its major and 7 rows","m7":"holding its minor and 7 rows",
  "°":"holding its major and minor rows","+":"holding all three rows","6":"on the major row, in Barry Harris mode","m6":"on the minor row, in Barry Harris mode",
  "°7":"holding its major and minor rows, in Barry Harris mode","sus4":"on the major row, with the alternate layout","sus2":"on the minor row, with the alternate layout",
  "7sus4":"on the 7 row, with the alternate layout","maj9":"holding its major and 7 rows, with the alternate layout","m9":"holding its minor and 7 rows, with the alternate layout",
  "add9":"holding its major and minor rows, with the alternate layout","6/9":"holding all three rows, with the alternate layout"};
const QNAME={"":"major","m":"minor","°":"dim","+":"aug"};
const SETS={standard:["","m","7","maj7","m7","°","+"], barry:["6","m6","7","maj7","m7","°7","+"],
  alt:["sus4","sus2","7sus4","maj9","m9","add9","6/9"]};
SETS.all=[...new Set([...SETS.standard,...SETS.barry])];   // the alternate layout is each player's own, so the game leaves it out
const ROOTS=["C","C♯","D♭","D","E♭","E","F","F♯","G♭","G","A♭","A","B♭","B"];
function spellChord(root,q){
  const tones=FORM[q].map(([st,se])=>above(root,st,se));
  if(tones.some(t=>t==null)) return null;
  if(settings.doubles!=="on" && tones.some(t=>/[𝄪𝄫]/.test(t))) return null;
  return tones;
}
function pickChord(){
  for(let k=0;k<200;k++){
    const q=rnd(SETS[settings.set]), root=rnd(ROOTS), tones=spellChord(root,q);
    if(tones) return {root, q, tones, sym:root+q};
  }
  return {root:"C", q:"", tones:["C","E","G"], sym:"C"};
}
// major keys by their place on the line of fifths
const KEY_BY_FIFTHS={"-6":"G♭","-5":"D♭","-4":"A♭","-3":"E♭","-2":"B♭","-1":"F","0":"C","1":"G","2":"D","3":"A","4":"E","5":"B","6":"F♯","7":"C♯"};
const KEY_FIFTHS=[0,1,2,3,4,5,-1,-2,-3,-4,-5,-6,6,7,8,9,10,11,12,-8,-7];
const sigText=f=> f===0 ? "no sharps or flats" : `${Math.abs(f)} ${f>0?"sharp":"flat"}${Math.abs(f)>1?"s":""}`;
const keyIndexOf=f=>KEY_FIFTHS.indexOf(f);
function questionKey(){
  // "set on the minichord": a new key each time, written to the key signature (address 35),
  // so every note of the key is a plain button and the modifier is only for what's outside it
  if(settings.keysrc==="set"){
    const f=rnd([-5,-4,-3,-2,-1,0,1,2,3,4,5,6]);
    ensure(35,keyIndexOf(f));
    return {name:KEY_BY_FIFTHS[f], fifths:f};
  }
  if(settings.keysrc==="follow" && mc.keyIndex!=null){ const f=KEY_FIFTHS[mc.keyIndex]; if(KEY_BY_FIFTHS[f]) return {name:KEY_BY_FIFTHS[f], fifths:f}; }
  const f=rnd([-5,-4,-3,-2,-1,0,1,2,3,4,5,6]); return {name:KEY_BY_FIFTHS[f], fifths:f};
}
const DEGREES=[{n:"I",st:0,se:0,q:""},{n:"ii",st:1,se:2,q:"m"},{n:"iii",st:2,se:4,q:"m"},{n:"IV",st:3,se:5,q:""},{n:"V",st:4,se:7,q:""},{n:"vi",st:5,se:9,q:"m"},{n:"vii°",st:6,se:11,q:"°"}];
const SEVENTHS={I:["Imaj7","maj7"],ii:["ii7","m7"],iii:["iii7","m7"],IV:["IVmaj7","maj7"],V:["V7","7"],vi:["vi7","m7"]};

// ---------- the staff, engraved in Bravura ----------
// SMuFL glyphs drawn at four staff spaces sit exactly on the note they are placed at,
// so nothing below is nudged by eye: the clef on G4, noteheads and accidentals on their steps.
const SP=14;                                                         // one staff space, in px
const GLYPH={clef:"\uE050", whole:"\uE0A2", "-2":"\uE264", "-1":"\uE260", "0":"\uE261", "1":"\uE262", "2":"\uE263"};
const ADV={"-2":1.652, "-1":0.904, "0":0.672, "1":0.996, "2":1.0};                 // advance widths, staff spaces
const EXT={"-2":[1.75,-0.7], "-1":[1.76,-0.7], "0":[1.36,-1.34], "1":[1.4,-1.39], "2":[0.51,-0.5]};   // reach above and below the note
function drawStaff(tones){
  const s=$("staff"); s.innerHTML="";
  const NS="http://www.w3.org/2000/svg", el=(t,a)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); s.appendChild(e); return e; };
  const TOP=60, y=dn=>TOP+(38-dn)*SP/2;                              // F5 (step 38) on the top line
  for(let k=0;k<5;k++) el("line",{class:"line",x1:8,x2:392,y1:TOP+k*SP,y2:TOP+k*SP});
  el("text",{class:"glyph",x:16,y:y(32)}).textContent=GLYPH.clef;     // the G clef curls round G4
  const r=parse(tones[0]), base=28+r.li;                              // root between C4 and B4
  const notes=tones.map((t,i)=>({dn:base+FORM_STEPS[i], acc:parse(t).acc})).sort((a,b)=>a.dn-b.dn);
  const W=1.688*SP, X=240;
  // in a second, the upper note sits to the right
  notes.forEach((n,i)=>{ n.x = (i>0 && n.dn-notes[i-1].dn===1 && !notes[i-1].shifted) ? (n.shifted=true, X+W) : X; });
  for(const n of notes){
    for(let L=28; L>=n.dn; L-=2) el("line",{class:"ledger",x1:n.x-.4*SP,x2:n.x+W+.4*SP,y1:y(L),y2:y(L)});
    for(let L=40; L<=n.dn; L+=2) el("line",{class:"ledger",x1:n.x-.4*SP,x2:n.x+W+.4*SP,y1:y(L),y2:y(L)});
    el("text",{class:"glyph",x:n.x,y:y(n.dn)}).textContent=GLYPH.whole;
  }
  // accidentals in columns leftward from the notes, top note first; an accidental
  // joins a column only if it clears everything already there
  const cols=[], withAcc=notes.filter(n=>n.acc).sort((a,b)=>b.dn-a.dn);
  for(const n of withAcc){
    const k=String(n.acc), up=y(n.dn)-EXT[k][0]*SP, down=y(n.dn)-EXT[k][1]*SP;
    let c=0; while(cols[c] && cols[c].items.some(o=>!(down<o.up-1 || up>o.down+1))) c++;
    cols[c]=cols[c]||{items:[],width:0}; cols[c].items.push({up,down}); cols[c].width=Math.max(cols[c].width, ADV[k]*SP);
    n.col=c; n.k=k;
  }
  let x=X-.25*SP; const colX=[];
  cols.forEach((c,i)=>{ x-=c.width; colX[i]=x; x-=.18*SP; });
  for(const n of withAcc) el("text",{class:"glyph",x:colX[n.col]+cols[n.col].width-ADV[n.k]*SP,y:y(n.dn)}).textContent=GLYPH[n.k];
}
let FORM_STEPS=[];
// A key signature engraved on the treble staff, sharps in the order F C G D A E B and flats
// B E A D G C F, each on its line or space, then the key's scale in whole notes after it.
const SIG_SHARPS=[38,35,39,36,33,37,34], SIG_FLATS=[34,37,33,36,32,35,31];
function drawKeySig(f, tonic){
  const s=$("staff"); s.innerHTML="";
  const NS="http://www.w3.org/2000/svg", el=(t,a)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); s.appendChild(e); return e; };
  const TOP=60, y=dn=>TOP+(38-dn)*SP/2;
  for(let k=0;k<5;k++) el("line",{class:"line",x1:8,x2:392,y1:TOP+k*SP,y2:TOP+k*SP});
  el("text",{class:"glyph",x:16,y:y(32)}).textContent=GLYPH.clef;
  const n=Math.abs(f), pos=f>0?SIG_SHARPS:SIG_FLATS, g=GLYPH[f>0?"1":"-1"];
  for(let i=0;i<n;i++) el("text",{class:"glyph",x:62+i*SP*1.05,y:y(pos[i])}).textContent=g;
  // the scale, no accidentals of its own: the signature supplies them
  const {li}=parse(tonic), start=28+li+(li>=5?-7:0), x0=78+n*SP*1.05, W=(392-x0)/8.2;
  for(let k=0;k<8;k++){ const dn=start+k, x=x0+k*W;
    for(let L=28; L>=dn; L-=2) el("line",{class:"ledger",x1:x-.4*SP,x2:x+1.688*SP+.4*SP,y1:y(L),y2:y(L)});
    el("text",{class:"glyph",x,y:y(dn)}).textContent=GLYPH.whole; }
}


// ---------- how to press a chord on this minichord ----------
// The buttons carry letters and play them with the key signature's accidentals;
// the modifier (address 31) raises or, if set to flat, lowers one semitone more.
const devFifths=()=> mc.keyIndex!=null ? mc.keyFifths : 0;
const keyAcc=(li,f)=>{ const idx="FCGDAEB".indexOf(LETTERS[li]); return Math.floor((f+6-idx)/7); };
const modDir=()=> mc.params[31]===1 ? -1 : 1;
const modWord=()=> modDir()>0 ? "sharp" : "flat";
function pressRoot(rootName){
  const f=devFifths(), {li,acc}=parse(rootName), m=modDir(), target=pcOfName(rootName);
  const ka=keyAcc(li,f), label=L=>`the ${L} column`;
  if(acc===ka) return label(LETTERS[li]) + (ka ? ` (${LETTERS[li]}${ACC[ka]} in this key)` : "");
  if(acc===ka+m) return `${label(LETTERS[li])} with the ${modWord()} modifier`;
  // otherwise another letter reaches the same note
  for(let d=1; d<7; d++) for(const s of [li+d, li-d]){
    const L=mod(s,7), base=mod(NAT[L]+keyAcc(L,f),12);
    if(base===target) return `${label(LETTERS[L])}, the same note as ${rootName}`;
    if(mod(base+m,12)===target) return `${label(LETTERS[L])} with the ${modWord()} modifier, the same note as ${rootName} (or switch the modifier to ${m>0?"flat":"sharp"} to use ${LETTERS[li]})`;
  }
  return `the ${LETTERS[li]} button`;
}
const howTo=(root,q)=>`${pressRoot(root)}, ${BUTTONS[q]}`;

// ---------- the games ----------
function genSpell(){
  const c=pickChord(); const letters = settings.order==="shuffled" ? shuffle(c.tones) : c.tones;
  return {kind:"spell", prompt:letters.join("  "), sub:"Which chord is spelled like this? Press it.",
    answer:{type:"chord", root:pcOfName(c.root), q:c.q, name:c.sym, tones:c.tones, spellRoot:c.root},
    hint:`The root is ${c.root}.`, hear:c.tones, context:0};
}
function genStaff(){
  const c=pickChord();
  return {kind:"staff", prompt:"", staff:c.tones, sub:"Which chord is written here? Press it.",
    answer:{type:"chord", root:pcOfName(c.root), q:c.q, name:c.sym, tones:c.tones, spellRoot:c.root},
    hint:`Its letters are ${c.tones.join(" ")}.`, hear:c.tones, context:0};
}
function genNumeral(){
  const key=questionKey();
  let choices=[];
  for(const d of DEGREES){
    const root=above(key.name,d.st,d.se); if(!root) continue;
    choices.push({label:d.n, root, q:d.q});
    if(SEVENTHS[d.n]) choices.push({label:SEVENTHS[d.n][0], root, q:SEVENTHS[d.n][1]});
  }
  if(settings.secondary==="on") for(const d of DEGREES.slice(1,6)){
    const target=above(key.name,d.st,d.se), root=target && above(target,4,7);
    if(root) choices.push({label:`V7 of ${d.n}`, root, q:"7"});
  }
  choices=choices.filter(c=>spellChord(c.root,c.q));
  const c=rnd(choices), tones=spellChord(c.root,c.q);
  const numHtml=c.label.replace(/ of /,' <span class="in">of</span> ');
  return {kind:"numeral", prompt:`${c.label} in ${key.name} major`, promptHtml:`<span class="num">${numHtml}</span> <span class="in">in</span> <span class="keyname">${key.name} major</span>`, sub:"Press the chord this numeral names.",
    answer:{type:"chord", root:pcOfName(c.root), q:c.q, name:c.root+c.q, tones, spellRoot:c.root},
    hint:`${key.name} major's scale: ${[0,1,2,3,4,5,6].map(i=>above(key.name,i,[0,2,4,5,7,9,11][i])).join(" ")}.`, hear:tones, context:key.fifths};
}
function genSlash(){
  const key=questionKey();
  for(let k=0;k<100;k++){
    const d=rnd(DEGREES.slice(0,6)), root=above(key.name,d.st,d.se), tones=spellChord(root,d.q);
    // the slash is another button: a note of the key, most often the chord's own third or fifth
    const pool=[tones[1],tones[2],tones[1],tones[2], ...[0,1,2,3,4,5,6].map(i=>above(key.name,i,[0,2,4,5,7,9,11][i]))];
    const bass=rnd(pool); if(!bass || bass===root) continue;
    return {kind:"slash", prompt:`${root}${d.q}/${bass}`, sub:`Play this slash chord: hold ${root}${d.q}, then press its ${bass[0]} column as well.`,
      answer:{type:"slash", root:pcOfName(root), q:d.q, bass:pcOfName(bass), name:`${root}${d.q}/${bass}`, tones, spellRoot:root, bassName:bass},
      hint: tones.includes(bass) ? `${bass} is the chord's ${tones.indexOf(bass)===1?"third":"fifth"}, so this is an inversion.` : `${bass} isn't in ${root}${d.q}: the slash adds it underneath.`,
      hear:[bass, ...tones], context:key.fifths, needs: (mc.params[7]??0)>=13 ? [{addr:113,value:1,what:`"Slash voice" set to Bass, so the slash note is the bass`}]
      : [{addr:23,value:0,what:`"Slash replaces" set to Root, so the slash note is the bass`},{addr:110,value:1,what:"MPE output on, so the game can see which voice took the slash note"}]};
  }
}
function diatonic(f){ const t=KEY_BY_FIFTHS[f]; return DEGREES.slice(0,6).map(d=>({root:pcOfName(above(t,d.st,d.se)), q:d.q, name:above(t,d.st,d.se)+d.q, n:d.n})); }
function genKey(){
  for(let k=0;k<300;k++){
    const f=rnd([-5,-4,-3,-2,-1,0,1,2,3,4,5,6]);
    const chords=shuffle(diatonic(f)).slice(0, rnd([3,4]));
    const fits=[-5,-4,-3,-2,-1,0,1,2,3,4,5,6].filter(g=>{ const d=diatonic(g); return chords.every(c=>d.some(x=>x.root===c.root && x.q===c.q)); });
    if(fits.length!==1) continue;
    const tonic=KEY_BY_FIFTHS[f];
    // each chord's numeral in the answer key sits under it, shown once you've guessed wrong or it's answered
    const stack=chords.map(c=>`<span class="chordstack"><span>${c.name}</span><span class="rn">${c.n}</span></span>`).join(" ");
    return {kind:"key", prompt:chords.map(c=>c.name).join("  "), promptHtml:stack, sub:"These chords all live in one major key. Which? Set it on the minichord with the key combo, play its home chord, or pick it below.",
      learn:`In ${tonic} major, ${chords.map(c=>`${c.name} is ${c.n}`).join(", ")}. Its key signature: ${sigText(f)}${f?`, ${sigList(f).join(" ")}`:""}; its home chord is ${pressRoot(tonic)}, with the major button.`,
      answer:{type:"key", tonic:pcOfName(tonic), fifths:f, name:`${tonic} major`, tonicName:tonic},
      hint:`Its key signature has ${sigText(f)}.`, hearChords:chords, context:f};
  }
}
const DEGREE_NAMES=["tonic","supertonic","mediant","subdominant","dominant","submediant","leading tone"];
const ORD=["1st","2nd","3rd","4th","5th","6th","7th"];
// what the harp rounds ask of the minichord: chromatic mode overrides every scale mode, so it has to be off
const NOT_CHROMATIC={addr:98,value:0,what:"the harp out of chromatic mode"};
const PER_CHORD={addr:36,value:8,what:`the harp choosing a scale for each chord ("Harp scale mode: Scale per chord")`};
function genHarp(){
  const key=questionKey(), i=Math.floor(Math.random()*7), note=above(key.name,i,[0,2,4,5,7,9,11][i]);
  const style=rnd(["number","name","letter"]);
  const ask = style==="number" ? (i ? `its ${ORD[i]}` : "its root") : style==="name" ? `its ${DEGREE_NAMES[i]}` : `${/^[AEF]/.test(note)?"an":"a"} ${note}`;
  return {kind:"harp", prompt:`Hold ${key.name} and pluck ${ask}`, sub:`Hold ${key.name} major and the harp plays the ${key.name} major scale. Find the note on it.`,
    answer:{type:"note", pc:pcOfName(note), name:note}, hint: style==="letter" ? `It's the ${ORD[i]} of the scale.` : `It's ${note}.`, hear:[note], context:key.fifths,
    needs:[PER_CHORD,NOT_CHROMATIC], pressRoot:key.name, holdHint:()=>`Hold ${pressRoot(key.name)}, on the major row.`};
}
function genMissing(){
  let c; for(let k=0;k<50;k++){ c=pickChord(); if(c.tones.length>=3) break; }
  const gap=1+Math.floor(Math.random()*(c.tones.length-1));
  const shown=c.tones.map((t,i)=>i===gap?"?":t);
  const STEP_NAME={1:"second",2:"third",3:"fourth",4:"fifth",5:"sixth",6:"seventh",8:"ninth"};
  return {kind:"missing", prompt:`${c.sym} = ${shown.join("  ")}`, gapPrompt:true, sub:"Hold the chord and pluck the missing note on the harp, or pick it below.",
    answer:{type:"note", pc:pcOfName(c.tones[gap]), name:c.tones[gap]}, hint:`It's the chord's ${STEP_NAME[FORM[c.q][gap][0]]}.`,
    hear:c.tones, context:0, needs:[{addr:36,value:0,ok:v=>v===0||v===8,what:`the harp following the chord or choosing a scale for it ("Follow chord" or "Scale per chord")`},NOT_CHROMATIC]};
}

// ---------- mystery settings: the game borrows a setting and you work out what it did ----------
// Scales named for what they are, from their own root. The harp plays them through its
// custom scale (address 236, one bit per chromatic degree) on the key's tonic (mode 10).
const SCALE_LIB=[
  {n:"Major", iv:[0,2,4,5,7,9,11], lv:"everyday", hint:"Seven notes with a major third, and half steps only between 3 and 4, and 7 and 8."},
  {n:"Natural minor", iv:[0,2,3,5,7,8,10], lv:"everyday", hint:"Seven notes with a minor third, a flat sixth and a flat seventh."},
  {n:"Harmonic minor", iv:[0,2,3,5,7,8,11], lv:"everyday", hint:"A minor third, and a leap of three semitones between the sixth and the seventh."},
  {n:"Melodic minor", iv:[0,2,3,5,7,9,11], lv:"everyday", hint:"Minor at the bottom and major at the top: only the third is flat."},
  {n:"Major pentatonic", iv:[0,2,4,7,9], lv:"everyday", hint:"Five notes, no half steps, and a major third."},
  {n:"Minor pentatonic", iv:[0,3,5,7,10], lv:"everyday", hint:"Five notes, no half steps, starting with a leap of a minor third."},
  {n:"Blues", iv:[0,3,5,6,7,10], lv:"everyday", hint:"The minor pentatonic with one chromatic note squeezed between the fourth and fifth."},
  {n:"Dorian", iv:[0,2,3,5,7,9,10], lv:"modes", hint:"Minor, but with a major sixth."},
  {n:"Phrygian", iv:[0,1,3,5,7,8,10], lv:"modes", hint:"Minor, with a half step right above the root."},
  {n:"Lydian", iv:[0,2,4,6,7,9,11], lv:"modes", hint:"Major, with a raised fourth."},
  {n:"Mixolydian", iv:[0,2,4,5,7,9,10], lv:"modes", hint:"Major, with a flat seventh."},
  {n:"Locrian", iv:[0,1,3,5,6,8,10], lv:"modes", hint:"A half step above the root and a flat fifth: the unsettled one."},
  {n:"Lydian dominant", iv:[0,2,4,6,7,9,10], lv:"exotic", hint:"Major with a raised fourth and a flat seventh."},
  {n:"Altered", iv:[0,1,3,4,6,8,10], lv:"exotic", hint:"Every tension at once: flat and sharp ninths, a sharp eleventh and a flat thirteenth over a major third."},
  {n:"Hungarian minor", iv:[0,2,3,6,7,8,11], lv:"exotic", hint:"Harmonic minor with a raised fourth: two leaps of three semitones."},
  {n:"Neapolitan minor", iv:[0,1,3,5,7,8,11], lv:"exotic", hint:"Phrygian's flat second with harmonic minor's raised seventh."},
  {n:"Neapolitan major", iv:[0,1,3,5,7,9,11], lv:"exotic", hint:"A flat second and minor third, then a bright major top half."},
  {n:"Persian", iv:[0,1,4,5,6,8,11], lv:"exotic", hint:"A flat second, a major third and a flat fifth, with a leap up to the seventh."},
  {n:"Enigmatic", iv:[0,1,4,6,8,10,11], lv:"exotic", hint:"A whole-tone run in the middle, framed by half steps at both ends."},
  {n:"Iwato", iv:[0,1,5,6,10], lv:"exotic", hint:"Five notes with half steps above the root and above the fourth."},
  {n:"Whole tone", iv:[0,2,4,6,8,10], lv:"exotic", hint:"Six notes, every step the same size."},
  {n:"Diminished, half-whole", iv:[0,1,3,4,6,7,9,10], lv:"exotic", hint:"Eight notes, alternating half and whole steps."},
  {n:"Sixth-diminished (Barry Harris)", iv:[0,2,4,5,7,8,9,11], lv:"exotic", hint:"A major scale with one extra note, a flat sixth."},
  {n:"Phrygian dominant (hijaz)", iv:[0,1,4,5,7,8,10], lv:"exotic", hint:"A half step above the root, then a leap up to a major third."},
  {n:"Double harmonic", iv:[0,1,4,5,7,8,11], lv:"exotic", hint:"Two leaps of three semitones: between the second and third, and the sixth and seventh."},
  {n:"In sen", iv:[0,1,5,7,10], lv:"exotic", hint:"Five notes: a half step above the root, then a leap up to the fourth."},
  {n:"Hirajoshi", iv:[0,2,3,7,8], lv:"exotic", hint:"Five notes with two half steps, between the second and third, and the fifth and sixth."},
];
// How a scale or chord is built, shown once it's found: its degrees against the major scale,
// its steps, and its notes on the root. Seven-note scales are spelled a letter a degree.
const DEG12=["1","♭2","2","♭3","3","4","♯4","5","♭6","6","♭7","7"];
const ACC_TXT={"-2":"𝄫","-1":"♭","0":"","1":"♯","2":"𝄪"};
const STEP_TXT={1:"H",2:"W",3:"W+H",4:"2W",5:"2W+H"};
/** a scale's notes on its root, a letter a degree for seven-note scales */
function scaleNoteNames(sc, root){
  const r=pcOfName(root), flat=/♭/.test(root)||root==="F", seven=sc.iv.length===7;
  return sc.iv.map((x,k)=>(seven && above(root,k,x)) || (flat ? FLAT_NAMES : SHARP_NAMES)[mod(r+x,12)]);
}
function scaleLearn(sc, root){
  const seven=sc.iv.length===7;
  const degrees=sc.iv.map((x,k)=> seven ? ACC_TXT[x-MAJOR[k]]+(k+1) : (x===6 && !sc.iv.includes(5) ? "♯4" : x===6 ? "♭5" : DEG12[x]));
  const steps=sc.iv.concat(12).slice(1).map((x,k)=>STEP_TXT[x-sc.iv[k]]||`${x-sc.iv[k]}`);
  let notes="";
  if(root){
    const r=pcOfName(root), flat=/♭/.test(root)||["F"].includes(root);
    notes=sc.iv.map((x,k)=>{ const n = seven ? above(root,k,x) : null; return n || (flat ? FLAT_NAMES : SHARP_NAMES)[mod(r+x,12)]; }).join(" ");
  }
  return `${sc.n}: ${degrees.join(" ")} · steps ${steps.join(" ")}${notes?` · on ${root}: ${notes}`:""}. ${sc.hint}`;
}
const QUALITY_TXT={"":"a major triad: a major third with a minor third on top","m":"a minor triad: a minor third with a major third on top",
  "7":"a major triad with a minor seventh, the dominant seventh","maj7":"a major triad with a major seventh","m7":"a minor triad with a minor seventh",
  "°":"a diminished triad: two minor thirds","+":"an augmented triad: two major thirds","6":"a major triad with a major sixth",
  "m6":"a minor triad with a major sixth","°7":"a diminished triad with a diminished seventh: minor thirds all the way up"};
function chordLearn(root,q){
  const f=FORM[q]; if(!f) return "";
  const deg=f.map(([st,se])=>{ const maj = st<7 ? MAJOR[st] : MAJOR[st-7]+12; return ACC_TXT[se-maj]+(st+1); });
  const tones=spellChord(root,q);
  return `${root}${q}: ${deg.join(" ")}${tones?` · ${tones.join(" ")}`:""}${QUALITY_TXT[q]?`, ${QUALITY_TXT[q]}`:""}.`;
}
function scalePool(){
  const lv=settings.scaleset;
  return SCALE_LIB.map((x,i)=>({...x,i})).filter(x=> lv==="all" || x.lv===lv || (lv==="modes" && (x.n==="Major"||x.n==="Natural minor")));   // exotic stands alone
}
const maskOf=iv=>iv.reduce((m,x)=>m|(1<<x),0);
// Answering a scale round on the minichord. The church modes have a real answer on the chord
// buttons: each has the notes of one major scale, so you press that major chord. Scales without
// a parent major scale get a keypad: up to seven choices, lettered C to B, and you press the
// chord button with the answer's letter.
const MODE_OFFSET={"Major":0,"Dorian":2,"Phrygian":4,"Lydian":5,"Mixolydian":7,"Natural minor":9,"Locrian":11};
function scaleAnswer(pool, sc, rootPc){
  const modesOnly = pool.every(x=>x.n in MODE_OFFSET);
  if(modesOnly){
    return {choices:pool.map(x=>({value:x.i,label:x.n})), parent:mod(rootPc-MODE_OFFSET[sc.n],12), rootPc,
      how:"Answer on the minichord by pressing the major chord whose scale has the same notes, or pick below."};
  }
  const others=shuffle(pool.filter(x=>x.i!==sc.i)).slice(0,6);
  const keypad=shuffle([sc,...others]).map((x,k)=>({value:x.i, letter:LETTERS[k], label:`${LETTERS[k]} · ${x.n}`}));
  return {choices:keypad, keypad, how:"Answer on the minichord by pressing the chord button in the answer's letter column, or pick below."};
}
function genScale(){
  const pool=scalePool(), sc=rnd(pool), key=questionKey();
  if(canWrite()){
    borrow(236,maskOf(sc.iv)); borrow(36,10); if(mc.params[98]===1) borrow(98,0);
  }
  const tonic=KEY_BY_FIFTHS[KEY_FIFTHS[mc.keyIndex??0]] || key.name;
  const ans=scaleAnswer(pool, sc, canWrite() ? pcOfName(tonic) : pcOfName(key.name));
  return {wantsWrite:!canWrite(), borrows:[237,236,36,98], kind:"scale", prompt:"A mystery scale", sub: canWrite() ? `The harp now plays a mystery scale on ${tonic}, your minichord's key. Run along the strings, listen to its steps, then name it. ${ans.how}`
      : offline(`Press Hear it for a mystery scale on ${key.name}, then name it.`),
    answer:{type:"choice", value:sc.i, name:sc.n}, hint:sc.hint, context:key.fifths, learn:scaleLearn(sc, canWrite() ? tonic : key.name), scaleNames:scaleNoteNames(sc, canWrite() ? tonic : key.name),
    choices:ans.choices, keypad:ans.keypad, parent:ans.parent, rootPc:ans.rootPc,
    hearFn:()=>{ const r=canWrite() ? pcOfName(tonic) : pcOfName(key.name); const notes=sc.iv.map(x=>60+r+x); notes.push(72+r); return notes.map((n,k)=>[n,k*.32]); }};
}

// Chord scales: the game writes a real scale into the custom scale and sets the harp to
// "Custom · on the chord" (mode 11), so the scale sits on whatever chord you hold. The chord
// is picked to fit the scale: its third, fifth and seventh all come from the scale.
function chordFor(iv){
  const has=x=>iv.includes(x);
  const opts=[];
  if(has(4)&&has(7)) opts.push(""); if(has(3)&&has(7)) opts.push("m");
  if(has(4)&&has(7)&&has(10)) opts.push("7"); if(has(4)&&has(7)&&has(11)) opts.push("maj7"); if(has(3)&&has(7)&&has(10)) opts.push("m7");
  if(has(3)&&has(6)) opts.push("°"); if(has(4)&&has(8)&&!has(7)) opts.push("+");
  const playable=opts.filter(q=>SETS.standard.includes(q));
  return playable.length ? rnd(playable) : (has(3) ? "m" : "");
}
function genChordScale(){
  const pool=scalePool(), sc=rnd(pool), q=chordFor(sc.iv);
  const root=rnd(ROOTS.filter(r=>spellChord(r,q)));
  if(canWrite()){
    borrow(236,maskOf(sc.iv)); borrow(36,11); if(mc.params[98]===1) borrow(98,0);
  }
  const r=pcOfName(root), ans=scaleAnswer(pool, sc, r);
  return {wantsWrite:!canWrite(), borrows:[237,236,36,98], kind:"chordscale", prompt:`Press ${root}`, sub: canWrite() ? `Any chord on ${root} builds the mystery scale on the harp. Hold it, run along the strings, and name the scale. ${ans.how}`
      : offline(`Hear it plays ${root}${q}, then a mystery scale on ${root}. Name the scale.`),
    answer:{type:"choice", value:sc.i, name:`${root} ${sc.n}`}, hint:`${sc.hint} ${root}${q} fits it best.`, context:0, holdHint:()=>`Press ${pressRoot(root)}.`, learn:scaleLearn(sc, root), scaleNames:scaleNoteNames(sc, root),
    choices:ans.choices, keypad:ans.keypad, parent:ans.parent, rootPc:ans.rootPc, listenRoot:r, pressRoot:root,
    hearFn:()=>[...FORM[q].map(f=>[48+r+f[1],0]), ...sc.iv.concat(12).map((x,k)=>[60+r+x,1.3+k*.28])]};
}

// Solfège for a major key, one syllable a degree; do again at the top
const SOLFA=["do","re","mi","fa","sol","la","ti","do"];
// Play by number: tunes in scale degrees, plucked on the harp in the key's major scale.
// Play by solfège is the same game with the tunes in syllables, do re mi, instead of numbers.
const TUNES=[
  {n:"Up the scale", d:[1,2,3,4,5,6,7,8]}, {n:"Down the scale", d:[8,7,6,5,4,3,2,1]}, {n:"Up and down the chord", d:[1,3,5,8,5,3,1]},
  {n:"Twinkle, Twinkle, Little Star", d:[1,1,5,5,6,6,5,4,4,3,3,2,2,1]}, {n:"Ode to Joy", d:[3,3,4,5,5,4,3,2,1,1,2,3,3,2,2]},
  {n:"Frère Jacques", d:[1,2,3,1,1,2,3,1,3,4,5,3,4,5]}, {n:"Mary Had a Little Lamb", d:[3,2,1,2,3,3,3,2,2,2,3,5,5]},
  {n:"When the Saints Go Marching In", d:[1,3,4,5,1,3,4,5,1,3,4,5,3,1,3,2]}, {n:"Amazing Grace", d:[5,1,3,1,3,2,1,6,5]},
];
function genMelody(solfa=false){
  const key=questionKey(), t=rnd(TUNES);
  const pcs=t.d.map(n=>mod(pcOfName(key.name)+MAJOR[(n-1)%7],12));
  return {kind:"melody", solfa, prompt:t.n, sub: solfa ? `Hold ${key.name} major and pluck it in solfège: do is ${key.name}, sol is the fifth note up, and the last do is ${key.name} again. Octaves don't matter.`
      : `Hold ${key.name} major and pluck it by number: 1 is ${key.name}, 8 is ${key.name} again. Octaves don't matter.`, pressRoot:key.name, holdHint:()=>`Hold ${pressRoot(key.name)}, with the major button.`,
    answer:{type:"melody", degrees:t.d, pcs, pos:0, name:t.n}, hint:`The next note is ${spell(pcs[0],key.fifths)}.`, context:key.fifths,
    hearFn:()=>pcs.map((p,k)=>[60+p+(t.d[k]===8?12:0),k*.42]),
    needs:[PER_CHORD,NOT_CHROMATIC]};
}

// Simon says: the game plays a melody, you pluck it back, and it grows by a note each time
let simon=null;
function genSimon(){
  const key=questionKey(), tonic=pcOfName(key.name);
  simon={key, seq:[], pos:0, best:saved.best.simonLen||0};
  simonGrow();
  return {kind:"simon", prompt:`Simon says, in ${key.name} major`, promptHtml:`Simon says <span class="in">in</span> <span class="keyname">${key.name} major</span>`, sub:`Hold ${key.name} major. Listen, then pluck the melody back on the harp. Each time you get it, it grows by a note.`,
    answer:{type:"simon", name:"the melody"}, hint:"Press Hear it to hear the melody again.", context:key.fifths, pressRoot:key.name, holdHint:()=>`Hold ${pressRoot(key.name)}, with the major button.`,
    hearFn:()=>simon.seq.map((d,k)=>[60+tonic+MAJOR[(d-1)%7]+(d===8?12:0),k*.55]), needs:[PER_CHORD,NOT_CHROMATIC]};
}
function simonGrow(){
  const last=simon.seq.length ? simon.seq[simon.seq.length-1] : 1;
  let d; do { d=1+Math.floor(Math.random()*8); } while(simon.seq.length && Math.abs(d-last)>4);
  simon.seq.push(d); simon.pos=0;
}
async function simonPlay(){ if(!q || q.kind!=="simon") return; await hear(); }

// The chromatic harp (address 98): twelve strings, C to B, whatever the key or chord
const CHROMATIC={addr:98,value:1,what:"the harp in chromatic mode, twelve strings from C to B"};
const MOVES={steps:[1,2], thirds:[1,2,3,4], fifths:[1,2,3,4,5,7], all:[1,2,3,4,5,6,7,8,9]};
const MOVE_NAMES={1:"a half step",2:"a whole step",3:"a minor third",4:"a major third",5:"a fourth",6:"a tritone",7:"a fifth",8:"a minor sixth",9:"a major sixth"};
let dirs=null;
const SHARP_NAMES=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"], FLAT_NAMES=["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];
// letters each move spans: a minor sixth up from F is D♭, five letters on, not C♯; a half step
// is named the way the harp's strings are, sharp going up and flat going down
const MOVE_LETTERS={1:1,2:1,3:2,4:2,5:3,6:3,7:4,8:5,9:5};
const dirName=k=>dirs.names[k];
function spellMove(from, iv, up, pc){
  if(iv===1) return up ? SHARP_NAMES[pc] : FLAT_NAMES[pc];
  const st=MOVE_LETTERS[iv], n = up ? above(from,st,iv) : above(from,(7-st)%7,12-iv);
  if(n && !/[𝄪𝄫]/.test(n)) return n;
  return up ? SHARP_NAMES[pc] : FLAT_NAMES[pc];                 // past a double accidental, the plain name
}
function genDirections(){
  const start=Math.floor(Math.random()*12), set=MOVES[settings.dirset]||MOVES.steps;
  const moves=[]; let at=start; const path=[start];
  for(let k=0;k<8;k++){ const iv=rnd(set), up=Math.random()<.5; at=mod(at+(up?iv:-iv),12); moves.push({iv,up}); path.push(at); }
  const names=[spell(start,0)];
  moves.forEach((m,k)=>names.push(spellMove(names[k], m.iv, m.up, path[k+1])));
  dirs={moves, path, names, pos:0};
  return {kind:"directions", prompt:`Start on ${names[0]}`, nameOf:dirSpell, sub:"Pluck it, then follow each direction from the note you're on. Twelve strings, one octave: from B, up goes round to C.",
    answer:{type:"dirs", name:"the path"}, hint:"", context:0, needs:[CHROMATIC],
    hearFn:()=>[[60+start,0]]};
}
// Every name in the round agrees with the prompt: the note you're looking for is spelled as the
// path spells it, and any other string the way the move was going, sharps up and flats down.
function dirSpell(pc){
  if(!dirs) return spell(pc,0);
  if(pc===dirs.path[dirs.pos]) return dirs.names[dirs.pos];
  const m=dirs.moves[dirs.pos-1]; return (m && !m.up ? FLAT_NAMES : SHARP_NAMES)[pc];
}
function dirsPrompt(){
  if(dirs.pos===0) return `Start on ${dirs.names[0]}`;
  const m=dirs.moves[dirs.pos-1]; return `${m.up?"Up":"Down"} ${MOVE_NAMES[m.iv]}`;
}
function genPluckChord(){
  const c=pickChord(), names=new Map(c.tones.map(t=>[pcOfName(t),t])), flat=/♭/.test(c.root)||c.root==="F";
  return {kind:"pluckchord", prompt:c.sym, nameOf:pc=>names.get(pc) || (flat?FLAT_NAMES:SHARP_NAMES)[pc], learn:chordLearn(c.root,c.q), sub:"Pluck every note of this chord on the chromatic harp, in any order.",
    answer:{type:"collect", pcs:[...new Set(c.tones.map(pcOfName))], got:new Set(), name:`${c.sym}: ${c.tones.join(" ")}`, tones:c.tones}, hint:`Its letters are ${c.tones.join(" ")}.`,
    hear:c.tones, context:0, needs:[CHROMATIC]};
}
function genBuildScale(){
  const sc=rnd(scalePool()), root=rnd(ROOTS), r=pcOfName(root);
  const pcs=sc.iv.map(x=>mod(r+x,12)).concat([r]);
  // the scale's own spelling, a letter a degree for seven-note scales, so the chips agree with the prompt
  const flat=/♭/.test(root)||root==="F", names=new Map();
  sc.iv.forEach((x,k)=>{ const n = sc.iv.length===7 ? above(root,k,x) : null; names.set(mod(r+x,12), n || (flat?FLAT_NAMES:SHARP_NAMES)[mod(r+x,12)]); });
  return {kind:"buildscale", prompt:`${root} ${sc.n.toLowerCase()}`, sub:`Pluck the scale up from ${root} to ${root} again, one note at a time, on the chromatic harp.`,
    nameOf:pc=>names.get(pc) || (flat?FLAT_NAMES:SHARP_NAMES)[pc], learn:scaleLearn(sc, root),
    answer:{type:"sequence", pcs, pos:0, name:`${root} ${sc.n.toLowerCase()}`}, hint:sc.hint, context:0, needs:[CHROMATIC],
    hearFn:()=>sc.iv.concat(12).map((x,k)=>[60+r+x,k*.32])};
}

// Smooth moves: voice-leading challenges from the chord you hold, judged on the minichord's
// real voicings. The firmware's voice-leading search is ported below, so every challenge is
// checked to have an answer before it's set.
function firmwareVoicing(root, tones, prev, range=12){
  const n=tones.length, anchor=[0,1,2,3].map(v=>root+tones[v%n]+12*Math.floor(v/n));
  if(!prev) return anchor;
  const lo=Math.max(0,Math.min(...anchor)-range), hi=Math.max(...anchor)+range, pool=[], pt=[];
  for(let note=lo; note<=hi && pool.length<40; note++){ const i=tones.indexOf(mod(note-root,12)); if(i>=0){ pool.push(note); pt.push(i); } }
  if(pool.length<4) return anchor;
  const full=(1<<n)-1, M=1<<n, U=32767;
  const cost=[0,1,2,3].map(()=>pool.map(()=>new Array(M).fill(U)));
  const cI=[0,1,2,3].map(()=>pool.map(()=>new Array(M).fill(0))), cM=[0,1,2,3].map(()=>pool.map(()=>new Array(M).fill(0)));
  pool.forEach((p,i)=>{ cost[0][i][1<<pt[i]]=Math.abs(p-prev[0]); });
  for(let v=1;v<4;v++){
    const best=new Array(M).fill(U), bI=new Array(M).fill(0);
    for(let i=0;i<pool.length;i++){
      if(i>0) for(let m=0;m<M;m++) if(cost[v-1][i-1][m]<best[m]){ best[m]=cost[v-1][i-1][m]; bI[m]=i-1; }
      const bit=1<<pt[i], step=Math.abs(pool[i]-prev[v]);
      for(let m=0;m<M;m++){ if(best[m]===U) continue; const r=m|bit, t=best[m]+step; if(t<cost[v][i][r]){ cost[v][i][r]=t; cI[v][i][r]=bI[m]; cM[v][i][r]=m; } }
    }
  }
  let bt=U, idx=0; for(let i=0;i<pool.length;i++) if(cost[3][i][full]<bt){ bt=cost[3][i][full]; idx=i; }
  if(bt===U) return anchor;
  const out=[0,0,0,0]; let m=full;
  for(let v=3;v>=1;v--){ out[v]=pool[idx]; const ni=cI[v][idx][m], nm=cM[v][idx][m]; idx=ni; m=nm; }
  out[0]=pool[idx]; return out;
}
const VL_TONES={"":[0,4,7],"m":[0,3,7],"7":[0,4,7,10],"maj7":[0,4,7,11],"m7":[0,3,7,10],"°":[0,3,6],"+":[0,4,8]};
let smooth={from:null};                 // the chord you're holding: {v:[four pitches, bass to top], name}
const pcsOf=v=>[...new Set(v.map(p=>mod(Math.round(p),12)))].sort((a,b)=>a-b).join();
const VOICE_NAMES=["Bass","Tenor","Alto","Top"];
const CHALLENGES={
  one:{say:"Change chord so that only one voice moves.", test:(f,v)=>pcsOf(v)!==pcsOf(f) && v.filter((p,i)=>Math.round(p)!==Math.round(f[i])).length===1},
  keepTop:{say:t=>`Change chord but keep the top voice on ${t}.`, test:(f,v)=>pcsOf(v)!==pcsOf(f) && Math.round(v[3])===Math.round(f[3])},
  topTo:{test:(f,v,T)=>mod(Math.round(v[3]),12)===mod(T,12) && Math.abs(Math.round(v[3])-T)<=2},
  twoCommon:{say:"Play a chord that keeps exactly two of these notes.", test:(f,v)=>{ const a=new Set(f.map(p=>mod(Math.round(p),12))); return [...new Set(v.map(p=>mod(Math.round(p),12)))].filter(p=>a.has(p)).length===2; }},
  tiny:{say:"Move to a new chord with two semitones of voice motion or less, in total.", test:(f,v)=>pcsOf(v)!==pcsOf(f) && v.reduce((s,p,i)=>s+Math.abs(Math.round(p)-Math.round(f[i])),0)<=2},
};
function genSmooth(){
  const need=[{addr:110,value:1,what:"MPE output on, so the game can follow each voice"},{addr:111,value:1,what:"voice leading on"}];
  if(!smooth.from) return {kind:"smooth", prompt:"Play any chord to start", sub:"Then each challenge starts from the chord you're holding, and every move becomes the next starting point.",
    answer:{type:"smooth", start:true, name:"a starting chord"}, hint:"Any chord will do.", context:0, needs:need};
  const f=smooth.from.v.map(Math.round), range=mc.params[112]??12, base=48;
  // every chord the standard buttons play, voiced from here the way the minichord would
  const cands=[]; for(let r=0;r<12;r++) for(const q of ["","m","7","maj7","m7"]){ const v=firmwareVoicing(r,VL_TONES[q],f.map(x=>x-base),range).map(x=>x+base); cands.push({r,q,v,name:spell(r,devFifths())+q}); }
  // a different challenge from the last one, when another has an answer from here
  const types=shuffle(Object.keys(CHALLENGES)).sort((a,b)=>(a===smooth.lastType)-(b===smooth.lastType));
  for(const t of types){
    let T=null, sols;
    if(t==="topTo"){ const tops=[...new Set(cands.map(c=>c.v[3]).filter(x=>x!==f[3] && Math.abs(x-f[3])<=2))]; if(!tops.length) continue; T=rnd(tops); sols=cands.filter(c=>CHALLENGES.topTo.test(f,c.v,T)); }
    else sols=cands.filter(c=>CHALLENGES[t].test(f,c.v));
    if(!sols.length) continue;
    const topName=spell(mod(f[3],12),devFifths());
    const say = t==="topTo" ? `Make the top voice move from ${topName} to ${spell(mod(T,12),devFifths())}.` : t==="keepTop" ? CHALLENGES.keepTop.say(topName) : CHALLENGES[t].say;
    smooth.lastType=t;
    return {kind:"smooth", prompt:say, sub:`You're holding ${smooth.from.name}. Find a chord that does it: the minichord's voice leading decides where each voice goes.`,
      answer:{type:"smooth", challenge:t, target:T, name:sols.slice(0,3).map(c=>c.name).join(", ")}, hint:`One that works: ${rnd(sols).name}.`, context:0, needs:need};
  }
  smooth.from=null; return genSmooth();     // nothing reachable from here: start afresh
}
// Which voice moved: two chords, voiced the way the minichord's voice leading voices them,
// where only one of the four voices moves. Listening only, so it needs no minichord.
const SATB=["Bass","Tenor","Alto","Soprano"];
const STEP_WORDS=["","a semitone","a whole tone","a minor third","a major third","a fourth","a tritone","a fifth"];
const ROOT_NAMES=["C","D♭","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
// a note spelled as the tone it is in the chord: G♯ in A maj7, not A♭
function toneIn(r,q,pc){
  const f=FORM[q].find(([,se])=>se===mod(pc-r,12));
  return (f && above(ROOT_NAMES[r],f[0],f[1])) || ROOT_NAMES[mod(pc,12)];
}
function genWhichVoice(){
  const base=48, quals=["","m","7","maj7","m7"];
  const want=Math.floor(Math.random()*4);      // the voice to move, so each comes up as often
  for(let tries=0; tries<60; tries++){
    const r=Math.floor(Math.random()*12), q=rnd(quals);
    const f=firmwareVoicing(r,VL_TONES[q],null,12);
    const moves=[];
    for(let r2=0;r2<12;r2++) for(const q2 of quals){
      const v=firmwareVoicing(r2,VL_TONES[q2],f,12);
      if(CHALLENGES.one.test(f,v) && v[want]!==f[want]) moves.push({r2,q2,v});
    }
    if(!moves.length) continue;
    const m=rnd(moves), k=want, d=m.v[k]-f[k];
    const from=toneIn(r,q,f[k]), to=toneIn(m.r2,m.q2,m.v[k]);
    const size=Math.abs(d)<STEP_WORDS.length ? STEP_WORDS[Math.abs(d)] : `${Math.abs(d)} semitones`;
    return {kind:"whichvoice", prompt:"Which voice moved?", sub:"Hear it plays two chords, voiced the way the minichord's voice leading voices them. Only one of the four voices moves. Which one?",
      answer:{type:"choice", value:k, name:`the ${SATB[k].toLowerCase()}, ${from} to ${to}, as ${ROOT_NAMES[r]+q} goes to ${ROOT_NAMES[m.r2]+m.q2}`},
      hint:`It moves ${d>0?"up":"down"} ${size}.`, context:0,
      choices:SATB.map((l,i)=>({value:i,label:l})),
      hearFn:()=>[...f.map(p=>[base+p,0]), ...m.v.map(p=>[base+p,1.5])]};
  }
  return genSmooth();
}
const INTERVALS=["","a semitone up","a whole tone up","a minor third up","a major third up","a fourth up","a tritone up","a fifth up","a minor sixth up","a major sixth up","a minor seventh up","a major seventh up"];
function genTranspose(){
  const t=1+Math.floor(Math.random()*11);
  if(canWrite()){ borrow(30,t); }
  const name=spell(t,0);
  return {wantsWrite:!canWrite(), borrows:[30], kind:"transpose", prompt:"What does the C column's major button play now?", sub: canWrite() ? "The minichord is secretly transposed. Play its C chord (with the key signature set to C) against Hear it, which plays a true C major, and name the chord it really sounds."
      : "Hear it plays C major, then the C column's major chord on a secretly transposed minichord. Which chord is the second one?",
    answer:{type:"choice", value:t, name:`${name} major (${INTERVALS[t]})`}, hint:`It's ${INTERVALS[t]}.`, context:0,
    choices:[1,2,3,4,5,6,7,8,9,10,11].map(v=>({value:v,label:spell(v,0)})),
    hearFn:()=> canWrite() ? [[48,0],[52,0],[55,0],[60,0]] : [[48,0],[52,0],[55,0],[60,0],[48+t,1.4],[52+t,1.4],[55+t,1.4],[60+t,1.4]]};
}
const TEMPERS=[0,1,2,3,4];
const TEMPER_HINTS={0:"Every key sounds the same, and every third beats a little.",1:"Major thirds are pure in the common keys, and one key is badly out: try A♭ major.",
  2:"C major is perfectly still, and keys far from C go sour.",3:"Fifths are pure and major thirds are wide and bright, beating fast.",4:"Every key works, but the keys near C are sweeter than the far ones."};
function genTemper(){
  const t=rnd(TEMPERS);
  if(canWrite()){ borrow(237,t); }
  return {wantsWrite:!canWrite(), borrows:[237], kind:"temper", prompt:"A mystery temperament", sub: canWrite() ? "Your minichord is secretly retuned. Play C major, then A♭ and E major, listen to how still or rough each is, and name the temperament."
      : "Hear it plays C, A♭ and E major in a mystery temperament. How still or rough is each? Name the temperament.",
    answer:{type:"choice", value:t, name:TEMPERAMENT_TABLE[t].label}, hint:TEMPER_HINTS[t], context:0,
    choices:TEMPERS.map(v=>({value:v,label:TEMPERAMENT_TABLE[v].label})),
    hearFn:()=>[[48,60,64,67],[44,56,60,63],[52,56,59,64]].flatMap((ch,k)=>ch.map(n=>[tune(n,t,0),k*1.5]))};
}
// Tune up plays the chord voices as a plain tone, so nothing but the tuning makes them beat:
// one oscillator in the waveform you choose (sine, triangle, sawtooth or square, the firmware's
// 0, 3, 1 and 2), the others and the noise silent, an organ envelope, the filter open and still,
// no tremolo, vibrato, pitch bend, glide, delay, reverb or crunch. All of it is borrowed and
// goes back when you leave the game. Values are as the firmware stores them: floats times 100.
const WAVES={sine:0, triangle:3, sawtooth:1, square:2};
const PLAIN_TONE={121:30, 123:100, 124:0, 127:0, 130:0, 135:0, 136:0,
  137:5, 138:0, 139:0, 140:100, 141:150,
  143:5000, 144:0, 145:70, 149:100, 154:0, 155:0,
  157:0, 159:0, 161:0, 163:0, 170:0, 175:0,
  176:0, 182:100, 183:0, 184:0, 185:0, 199:0};
const TONE_ADDRS=new Set([...Object.keys(PLAIN_TONE).map(Number), 122]);
function plainTone(){
  for(const [a,v] of Object.entries(PLAIN_TONE)) borrow(+a,v);
  borrow(122, WAVES[settings.tuneWave] ?? 0);
}
function genTune(){
  const off=(Math.random()<.5?-1:1)*(15+Math.floor(Math.random()*55));   // 1.5 to 7 Hz off, in tenths of a hertz
  tuneState={secret:4400+off, nudge:0};
  if(canWrite()){ plainTone(); borrow(109,tuneState.secret); }
  return {wantsWrite:!canWrite(), borrows:[109, ...TONE_ADDRS], kind:"tune", prompt:"Tune it back to A = 440", sub: canWrite() ? "Your minichord's tuning has been knocked off, and it now plays a plain tone with nothing moving in it, so the only beating you hear is the tuning. Hold its A chord, turn on the reference, and slide until the beating stops. Then lock it in. Choose the tone to hear the beats in a different colour."
      : "The second tone plays a minichord knocked out of tune. Turn on both, slide until the beating stops, then lock it in.",
    answer:{type:"tune"}, hint:"Slow beats mean you're close. If they speed up as you slide, go the other way.", context:0};
}



// ---------- the alternate layout's games ----------
// The minichord's alternate chord layout (address 39) lets each of the seven button
// combinations play any chord from the firmware's catalogue (addresses 202-208). These games
// load it with chords the player can't see and ask them to find one by ear. The game knows
// what it loaded, so it can tell which combination is held from the notes that sound. The
// catalogue's twelve-note chords, as intervals above the root; a five-note chord sounds
// four of its notes on four voices, so a held chord is matched as a subset.
const CAT={1:["","major",[0,4,7]],2:["m","minor",[0,3,7]],3:["7","dominant 7th",[0,4,7,10]],4:["maj7","major 7th",[0,4,7,11]],
  5:["m7","minor 7th",[0,3,7,10]],6:["°","diminished",[0,3,6]],7:["+","augmented",[0,4,8]],8:["6","major 6th",[0,4,7,9]],
  9:["m6","minor 6th",[0,3,7,9]],10:["°7","diminished 7th",[0,3,6,9]],11:["m7♭5","half-diminished 7th",[0,3,6,10]],
  12:["sus4","sus4",[0,5,7]],13:["sus2","sus2",[0,2,7]],14:["7sus4","7sus4",[0,5,7,10]],15:["maj9","major 9th",[0,4,7,11,2]],
  16:["m9","minor 9th",[0,3,7,10,2]],17:["add9","add9",[0,4,7,2]],18:["6/9","6/9",[0,4,7,9,2]]};
const COMBOS=["the major row","the minor row","the 7 row","major and 7","minor and 7","major and minor","all three"];
const altReady=()=>canWrite() && mc.params[202]!==undefined;
let alt=null, heldVoices=[];
function altNeeds(slots, extra=[]){
  return [{addr:39,value:1,what:"its alternate chord layout, loaded with secret chords"},
    ...slots.map((v,i)=>({addr:202+i,value:v,what:""})), ...extra];
}
function altRoot(){ const r=rnd(blastRootsPlain()); return {root:r, rootPc:pcOfName(r)}; }
function blastRootsPlain(){ const f=canWrite()?devFifths():0, out=[]; for(let li=0;li<7;li++){ const ka=keyAcc(li,f); if(Math.abs(ka)<=1) out.push(LETTERS[li]+ACC[ka]); } return out; }
/** which loaded slot the held notes are: the chord whose notes contain them with the fewest left over */
function heldSlot(slots, rootPc){
  const rel=[...new Set(heldVoices.map(v=>mod(Math.round(v.pitch)-rootPc,12)))];
  if(rel.length<2) return -1;
  let best=-1, bestLeft=99;
  slots.forEach((idx,i)=>{ const c=CAT[idx]; if(!c) return; const tones=c[2].map(x=>mod(x,12));
    if(rel.every(x=>tones.includes(x)) && tones.length-rel.length<bestLeft){ bestLeft=tones.length-rel.length; best=i; } });
  return best;
}
// which of the three chord buttons each of the seven combinations presses, in slot order
const COMBO_BITS=[[1,0,0],[0,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,0],[1,1,1]];
/** the layout as pictures: for each combination, the three buttons with the pressed ones filled, and its chord */
function layoutDiagram(labels, target, shown){
  const grid=document.createElement("div"); grid.className="layoutgrid"; grid.setAttribute("aria-label","The alternate layout");
  labels.forEach((lab,i)=>{
    if(!lab || (shown && !shown.includes(i))) return;
    const c=document.createElement("div"); c.className="combo"+(i===target?" target":"");
    const b=document.createElement("div"); b.className="btns";
    ["maj","min","7"].forEach((t,k)=>{ const s=document.createElement("span"); s.textContent=t; if(COMBO_BITS[i][k]) s.className="on"; b.appendChild(s); });
    const n=document.createElement("b"); n.textContent=lab[0]; c.append(b,n);
    if(lab[1]){ const sm=document.createElement("small"); sm.textContent=lab[1]; c.appendChild(sm); }
    c.title=`${COMBOS[i]}: ${lab[0]}`;
    grid.appendChild(c);
  });
  return grid;
}
function layoutText(slots, root, shown){ return slots.map((idx,i)=>idx&&CAT[idx] ? `${COMBOS[i]}: ${root}${CAT[idx][0]}` : null).filter((x,i)=>x && (!shown || shown.includes(i))).join(" · "); }
function altOffline(kind, prompt){
  return {kind, wantsWrite:true, prompt, sub:"This game loads secret chords into your minichord's alternate layout, so it needs a minichord connected on the test-allFeatures firmware.",
    answer:{type:"alt", name:""}, hint:"Connect a minichord to play.", context:0};
}

// Hidden layout: seven secret chords, one to find
const HIDDEN_POOLS={basic:[1,2,3,4,5,6,7,8,9,10,11], ext:[12,13,14,15,16,17,18,3,4,5], all:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]};
function distinctSeven(pool){
  // seven different chords, no two of which a player could hold identically
  for(let t=0;t<200;t++){ const pick=[...pool].sort(()=>Math.random()-.5).slice(0,7); if(pick.length<7) continue;
    const sets=pick.map(i=>CAT[i][2].map(x=>mod(x,12)).sort((a,b)=>a-b).join(","));
    if(new Set(sets).size===7) return pick; }
  return [1,2,3,4,5,6,7];
}
function genHidden(){
  if(!altReady()) return altOffline("hidden","Hidden layout");
  const {root,rootPc}=altRoot(), slots=distinctSeven(HIDDEN_POOLS[settings.hiddenPool]||HIDDEN_POOLS.basic), t=Math.floor(Math.random()*7);
  alt={kind:"hidden", root, rootPc, slots, target:t};
  const c=CAT[slots[t]];
  return {kind:"hidden", prompt:`Find the ${root}${c[0]}`, promptHtml:`Find the <span class="num">${root}${c[0]}</span>`,
    sub:`Your minichord's alternate layout now holds seven secret chords, all on ${root}. Hold ${pressRoot(root)} with different combinations of the major, minor and 7 buttons, listen, and press the spacebar (or Found it) while you hold the ${c[1]}.`,
    needs:altNeeds(slots), pressRoot:root, context:0, barry:"",
    answer:{type:"alt", name:`${root}${c[0]}, on ${COMBOS[t]}`},
    hint:`A ${c[1]} is ${c[2].map(x=>["1","♭2","2","♭3","3","4","♭5","5","♯5","6","♭7","7"][mod(x,12)]+(x===2?" (the 9th)":"")).join(" ")}.`,
    get learn(){ return `The layout was ${layoutText(alt.slots, alt.root)}.`; },
    layout:()=>({labels:alt.slots.map(idx=>CAT[idx]?[alt.root+CAT[idx][0], CAT[idx][1]]:null), target:alt.target}),
    hearFn:()=>c[2].map(x=>[48+rootPc+x,0])};
}
// Odd one out: three chords of a family and an impostor, on four combinations
const FAMILIES=[
  {n:"major-colour chords", members:[4,15,18,17,8], imp:[14,3,5,16,11]},
  {n:"minor-colour chords", members:[2,5,16,9], imp:[4,3,11,17]},
  {n:"suspended chords", members:[12,13,14], imp:[1,17,2,8]},
  {n:"diminished chords", members:[6,10,11], imp:[2,7,5]},
  {n:"dominant chords", members:[3,14], extra:[16], imp:[4,9,13]},
];
function genOddOne(){
  if(!altReady()) return altOffline("oddone","Odd one out");
  const fam=rnd(FAMILIES.filter(f=>f.members.length>=3)), {root,rootPc}=altRoot();
  const three=[...fam.members].sort(()=>Math.random()-.5).slice(0,3), imp=rnd(fam.imp), four=[...three,imp].sort(()=>Math.random()-.5);
  const slots=[...four,0,0,0], t=four.indexOf(imp);
  alt={kind:"oddone", root, rootPc, slots, target:t};
  return {kind:"oddone", prompt:"Odd one out", sub:`Four chords on ${root}: ${COMBOS.slice(0,4).join(", ")}. Three of them are ${fam.n}; one isn't. Hold ${pressRoot(root)}, find the impostor by ear, and press the spacebar (or Found it) while you hold it.`,
    needs:altNeeds(slots), pressRoot:root, context:0, barry:"",
    answer:{type:"alt", name:`${root}${CAT[imp][0]}, on ${COMBOS[t]}`},
    hint:`The ${fam.n} here share ${fam.n.startsWith("major")?"a major third and a major 7th or 6th":fam.n.startsWith("minor")?"a minor third":fam.n.startsWith("sus")?"no third at all":"a diminished fifth"}.`,
    get learn(){ return `${layoutText(alt.slots, alt.root, [0,1,2,3])}. The impostor was the ${CAT[imp][1]}.`; },
    layout:()=>({labels:alt.slots.map(idx=>CAT[idx]?[alt.root+CAT[idx][0], CAT[idx][1]]:null), target:alt.target, shown:[0,1,2,3]}),
    hearFn:()=>four.flatMap((idx,k)=>CAT[idx][2].map(x=>[48+rootPc+x,k*1.4]))};
}
// Shades of the third: 31-EDO's five thirds on one root, subminor to supermajor
const SHADES=[{idx:20,n:"subminor",steps:7},{idx:2,n:"minor",steps:8},{idx:21,n:"neutral",steps:9},{idx:1,n:"major",steps:10},{idx:19,n:"supermajor",steps:11}];
const EDO31=12/31;
function heldShade(rootPc){
  // the third's size, in 31-EDO steps, from the voices' exact pitches (MPE)
  const ps=heldVoices.map(v=>v.pitch); if(ps.length<2) return null;
  const root=ps.slice().sort((a,b)=>Math.abs(mod(a-rootPc+6,12)-6)-Math.abs(mod(b-rootPc+6,12)-6))[0];
  for(const p of ps){ const c=mod(p-root,12); if(c>2.3 && c<4.6){ const st=Math.round(c/EDO31); return SHADES.find(x=>x.steps===st)||null; } }
  return null;
}
function genShades(){
  if(!altReady()) return altOffline("shades","Shades of the third");
  const {root,rootPc}=altRoot(), order=[0,1,2,3,4,5,6].sort(()=>Math.random()-.5);
  const slots=Array(7).fill(0); SHADES.forEach((sh,k)=>slots[order[k]]=sh.idx); slots[order[5]]=12; slots[order[6]]=13;   // sus4 and sus2 fill the other two
  const mode=settings.shadesMode, target = mode==="which" ? rnd(SHADES) : null;
  alt={kind:"shades", root, rootPc, slots, mode, target, pos:0};
  const extra=[{addr:237, get value(){ return mc.temperamentValue(12)??11; }, what:"31-EDO"},{addr:110,value:1,what:"MPE output, so the exact pitches arrive"}];
  const combosOf=sh=>COMBOS[slots.indexOf(sh.idx)];
  return {kind:"shades", prompt: mode==="which" ? "Which third did you hear?" : "Darkest to brightest",
    sub: mode==="which" ? `Your minichord is in 31-EDO, with five kinds of triad on ${root} hidden on its button combinations, from subminor to supermajor. Press Hear it, then find that triad on the minichord and press the spacebar (or Found it) while you hold it.`
      : `Your minichord is in 31-EDO, with five kinds of triad on ${root} hidden on its button combinations: subminor, minor, neutral, major and supermajor, their thirds a 31st of an octave apart. Try them all as often as you like; when you're holding the darkest, press the spacebar (or Add it) to put it first, then the next brightest, and so on.`,
    needs:altNeeds(slots, extra), pressRoot:root, context:0, barry:"",
    answer:{type:"alt", name: mode==="which" ? `the ${target.n} triad, on ${combosOf(target)}` : "subminor, minor, neutral, major, supermajor"},
    hint: mode==="which" ? `Its third is ${Math.round(target.steps*38.71)} cents: ${["","","","","","","","a septimal minor third, darker than minor","a minor third","halfway between minor and major","a major third","a septimal major third, brighter than major"][target.steps]}.` : "The darker the third, the smaller it is: subminor is about 270 cents, supermajor about 426.",
    get learn(){ return `The five: ${SHADES.map(sh=>`${sh.n} on ${combosOf(sh)} (a ${Math.round(sh.steps*38.71)}-cent third)`).join(" · ")}.`; },
    layout:()=>({labels:alt.slots.map(idx=>{ const sh=SHADES.find(x=>x.idx===idx); return sh ? [sh.n, `${Math.round(sh.steps*38.71)}-cent third`] : CAT[idx] ? [alt.root+CAT[idx][0], ""] : null; }),
      target: alt.target ? alt.slots.indexOf(alt.target.idx) : -1}),
    hearFn:()=>{ const sh=target||SHADES[alt.pos]||SHADES[0]; return [[48+rootPc,0],[48+rootPc+sh.steps*EDO31,0],[48+rootPc+18*EDO31,0]]; }};
}
// Playing a chord only lets you hear it; the spacebar is what answers, so every combination
// can be tried and compared as often as you like.
function answerAltChord(voices){ heldVoices=voices; }
function submitAlt(){
  if(!q || solved || !alt || !["hidden","oddone","shades"].includes(q.kind)) return;
  if(!heldVoices.length){ feedback("Hold a chord first, then press the spacebar.","bad"); return; }
  if(alt.kind==="shades" && alt.mode==="order"){
    const sh=heldShade(alt.rootPc); if(!sh) return wrong("That isn't one of the five triads (sus chords fill the other two combinations).");
    const want=SHADES[alt.pos];
    if(sh===want){ alt.pos++; buildSpecial(); if(alt.pos===SHADES.length) return correct("Darkest to brightest: subminor, minor, neutral, major, supermajor."); chime("step"); feedback(`${sh.n[0].toUpperCase()+sh.n.slice(1)}. Now the next brightest.`,"good"); return; }
    if(alt.pos>0 && SHADES.indexOf(sh)<alt.pos){ feedback(`The ${sh.n} is already in your order.`,""); return; }
    firstTry=false; buzz(); feedback(`That's the ${sh.n}. ${alt.pos ? `There's one darker than that still to place after the ${SHADES[alt.pos-1].n}.` : "There's a darker one to start with."}`,"bad"); return;
  }
  if(alt.kind==="shades"){
    const sh=heldShade(alt.rootPc); if(!sh){ wrong("That isn't one of the five triads (sus chords fill the other two combinations)."); return; }
    return sh===alt.target ? correct(`The ${sh.n} triad.`) : wrong(`That's the ${sh.n} triad. Listen again: yours was ${sh.steps<alt.target.steps?"brighter":"darker"}.`);
  }
  const i=heldSlot(alt.slots, alt.rootPc);
  if(i<0) return wrong(`That isn't one of the chords on ${alt.root}. Hold ${pressRoot(alt.root)} with the combinations.`);
  if(i===alt.target) return correct(`That's it: ${alt.root}${CAT[alt.slots[i]][0]}, on ${COMBOS[i]}.`);
  wrong(`That's the ${CAT[alt.slots[i]][1]}${alt.kind==="oddone"?", one of the family":""}. Keep listening.`);
}
// In the layout games the spacebar always answers. A button the mouse last clicked (Next, say)
// would otherwise take the spacebar as a click of its own, so it's caught first, on the way down,
// and its release is swallowed too, since buttons fire on the key's release.
const altKey=e=> e.code==="Space" && q && ["hidden","oddone","shades"].includes(q.kind) && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"");
document.addEventListener("keydown", e=>{
  if(!altKey(e)) return;
  e.preventDefault(); e.stopPropagation();
  if(!e.repeat){ if(document.activeElement && document.activeElement.tagName==="BUTTON") document.activeElement.blur(); submitAlt(); }
}, true);
document.addEventListener("keyup", e=>{ if(altKey(e)){ e.preventDefault(); e.stopPropagation(); } }, true);

// ---------- Reshape ----------
// Hold a chord and turn it into another by plucking the harp: the cantus (firmware 14) gives
// the plucked note to one chord voice, which moves alone while the rest hold. C to Am is one
// move, the G up to A. The minichord sounds four voices, so one note of a triad is doubled,
// and C to Em moves both Cs down to B: two plucks. After every move the game works out which
// voice still has to go where and points the cantus (address 115) at it, so you only have to
// know which note to pluck. At the top level it stops aiming and you choose the voice yourself.
// Each move changes some of the held chord's notes (semitones above its root) to others;
// `once` moves only one voice of a doubled note, `bass` moves the lowest voice.
const RESHAPES={
  1:[{from:[4],to:[3],on:""},{from:[7],to:[9],on:""},{from:[7],to:[8],on:""},{from:[4],to:[5],on:""},
     {from:[0],to:[10],on:"",once:true},{from:[0],to:[11],on:"",once:true},{from:[0],to:[9],on:"",once:true},
     {from:[3],to:[4],on:"m"},{from:[7],to:[8],on:"m"},{from:[0],to:[10],on:"m",once:true},{from:[0],to:[9],on:"m",once:true}],
  2:[{from:[0],to:[11],on:""},{from:[4,7],to:[5,9],on:""},{from:[4,7],to:[5,8],on:""},{from:[0,7],to:[10,9],on:"",once:true},
     {from:[7],to:[5],on:"m"},{from:[3,7],to:[4,9],on:""},{from:[4,7],to:[3,8],on:""}],
  3:[{bass:11,on:""},{bass:10,on:""},{bass:9,on:""},{bass:2,on:""},{bass:10,on:"m"},{bass:5,on:""}],
};
let reshape=null;
const RESHAPE_STEPS=[0,1,1,2,2,3,3,4,5,5,6,6];   // letters above the root for each semitone
const cantusOk=()=>canWrite() && (mc.params[7]??0)>=14;
function genReshape(){
  const lvl=+settings.reshapeLevel||1, pool=RESHAPES[lvl===4?(Math.random()<.5?1:2):lvl];
  for(let tries=0;tries<50;tries++){
    const mv=rnd(pool), root=rnd(ROOTS), r=pcOfName(root), sq=mv.on;
    if(!spellChord(root,sq)) continue;
    const start=FORM[sq].map(f=>f[1]);                                   // the chord's notes above its root
    // the new chord, voiced the way the minichord would sound it: root doubled an octave up
    let voices=[...start, 12];
    if(mv.bass!=null){ voices=[mv.bass-12, ...voices.slice(1)]; }
    else voices=voices.map((x,i)=>{ const k=mv.from.indexOf(mod(x,12)); if(k<0) return x;
      if(mv.once && voices.findLastIndex(y=>mod(y,12)===mod(x,12))!==i) return x;     // only the upper of a doubled note: the bass keeps the root
      return x-mod(x,12)+mv.to[k]; });
    const target=voices.map(x=>mod(r+x,12)), tset=[...new Set(target)].sort((a,b)=>a-b);
    const bassPc = mv.bass!=null ? mod(r+mv.bass,12) : null;
    const id=chordId(voices.map(x=>48+r+x)); if(!id) continue;
    const semi=mod(id.root-r,12), tRoot=above(root,RESHAPE_STEPS[semi],semi); if(!tRoot) continue;
    const bassName = bassPc!=null ? above(root,RESHAPE_STEPS[mod(bassPc-r,12)],mod(bassPc-r,12)) : null;
    const sym=tRoot+id.quality+(bassPc!=null && bassPc!==id.root ? `/${bassName}` : "");
    const startSym=root+sq;
    if(sym===startSym) continue;
    const newPcs=[...new Set(target)].filter(pc=>!start.some(x=>mod(r+x,12)===pc));
    if(!newPcs.length && bassPc==null) continue;
    const toneNames=spellTones(voices.map(x=>48+r+x),0,tRoot);
    reshape={root, sq, startSym, sym, tset, bassPc, startSet:[...new Set(start.map(x=>mod(r+x,12)))].sort((a,b)=>a-b),
      newPcs: bassPc!=null ? [bassPc] : newPcs, got:new Set(), phase:"hold", voices:[], aimed:null, diy:lvl===4, names:toneNames, showAim:false};
    const needs=[CHROMATIC]; if(bassPc!=null && (mc.params[7]??0)>=13) needs.push({addr:113,value:1,what:"slash voice on the bass"});
    const how = !cantusOk() ? offline(`With the minichord this is played by holding ${startSym} and plucking; here, pick the new note${reshape.newPcs.length>1?"s":""} ${startSym} needs to become ${sym}.`)
      : lvl===4 ? `Hold ${startSym} and pluck the harp to make it ${sym}. You aim the cantus: set it to the voice that has to move (on the double tap or a knob) before you pluck.`
      : bassPc!=null ? `Hold ${startSym}, then move the bass: pluck the new bass note on the harp, or press its button as a slash. Keep holding the chord.`
      : `Hold ${startSym}, then pluck the harp to change the notes that have to move. The game points the cantus at the right voice for you, so you only need the note; keep holding the chord.`;
    return {kind:"reshape", prompt:`${startSym} → ${sym}`, promptHtml:`<span class="keyname">${startSym}</span> <span class="in">→</span> <span class="num">${sym}</span>`,
      sub:how, pressRoot:root, needs, context:0, barry:sq,
      holdHint:()=>`Hold ${pressRoot(root)}${sq==="m"?", on the minor row":", on the major row"}.`,
      answer:{type:"reshape", name:sym, spellRoot:root, q:sq},
      get hint(){ const m=reshapeNext(); return m ? `Pluck ${toneNames.get(m.to)}: the ${VOICE_WORDS[m.rank]} moves from ${reshapeName(m.fromPc)} to ${toneNames.get(m.to)}.` : `Hold ${startSym} first.`; },
      learn:`${startSym} to ${sym}: ${reshapeMoves()}.`,
      hearFn:()=>[...start.concat([12]).map(x=>[48+r+x,0]), ...voices.map(x=>[48+r+x,1.4])]};
  }
  return genSmooth();
}
const VOICE_WORDS=["bass","tenor","alto","soprano"];
function reshapeName(pc){ const n=spellTones(reshape.startSet.map(x=>48+x),0,reshape.root).get(pc); return n || spell(pc,0); }
function reshapeMoves(){
  const r=reshape; if(r.bassPc!=null) return `the bass moves to ${r.names.get(r.bassPc) || spell(r.bassPc,0)}`;
  const gone=r.startSet.filter(pc=>!r.tset.includes(pc)).map(reshapeName), come=r.newPcs.map(pc=>r.names.get(pc)||spell(pc,0));
  return `${gone.join(" and ")} ${gone.length>1?"move":"moves"} to ${come.join(" and ")}${r.startSet.length===3 && gone.length===1 && r.startSym.slice(-1)!=="7" ? "" : ""}, the other notes hold`;
}
/** the next move: which voice (counted from the bottom) goes to which note */
function reshapeNext(){
  const r=reshape; if(!r || r.phase!=="shape" || !r.voices.length) return null;
  const pcs=r.voices.map(v=>mod(Math.round(v),12));
  if(r.bassPc!=null) return pcs[0]!==r.bassPc ? {rank:0, fromPc:pcs[0], to:r.bassPc} : null;
  const missing=r.newPcs.filter(pc=>!pcs.includes(pc));
  // a note still to come but every voice on a note of the new chord: one of a doubled note moves (C to C7 moves the upper C)
  if(missing.length && pcs.every(pc=>r.tset.includes(pc))){
    for(let i=pcs.length-1;i>0;i--) if(pcs.indexOf(pcs[i])!==i){
      const to=missing[0]; return {rank:i, fromPc:pcs[i], to};
    }
  }
  for(let i=pcs.length-1;i>=0;i--){                 // from the top down, so the tune moves first
    if(r.tset.includes(pcs[i])) continue;
    const dests = missing.length ? missing : r.newPcs;
    const to=dests.slice().sort((a,b)=>Math.min(mod(a-pcs[i],12),mod(pcs[i]-a,12))-Math.min(mod(b-pcs[i],12),mod(pcs[i]-b,12)))[0];
    return {rank:i, fromPc:pcs[i], to};
  }
  return null;
}
function reshapeAim(){
  const r=reshape; if(!r || r.diy || !cantusOk()) return;
  const m=reshapeNext(); if(!m) return;
  r.aimed=m.rank; ensure(115, m.rank+1);                // cantus 1 bass .. 4 soprano, from the bottom
}
function answerReshape(voices){
  const r=reshape, P=voices.map(v=>v.pitch).sort((a,b)=>a-b), pcs=P.map(p=>mod(Math.round(p),12));
  const set=[...new Set(pcs)].sort((a,b)=>a-b).join(",");
  if(set===r.tset.join(",") && (r.bassPc==null || pcs[0]===r.bassPc) && r.phase==="shape"){ r.voices=P; buildSpecial(); return correct(`That's ${r.sym}: ${reshapeMoves()}.`); }
  if(set===r.startSet.join(",")){                      // holding the starting chord: begin, or begin again
    const fresh=r.phase!=="shape"; r.phase="shape"; r.voices=P; reshapeAim(); buildSpecial();
    if(fresh) feedback(`Holding ${r.startSym}. Now ${r.bassPc!=null ? "move the bass" : "pluck the note that changes"}.`,"good");
    return;
  }
  if(r.phase!=="shape"){ later(()=>feedback(`That's not ${r.startSym} yet. Hold ${r.startSym} to start.`,"bad")); return; }
  // part way there, or a wrong note
  const prev=r.voices; r.voices=P;
  const wrongPc=pcs.find(pc=>!r.tset.includes(pc) && !r.startSet.includes(pc));
  if(wrongPc!=null){ firstTry=false; r.showAim=true; buzz(); feedback(`${spell(wrongPc,0)} isn't in ${r.sym}. Pluck another note: the same voice will take it.`,"bad"); buildSpecial(); return; }
  const moved=pcs.some((pc,i)=>prev[i]==null || mod(Math.round(prev[i]),12)!==pc);
  if(!moved){ buildSpecial(); return; }
  chime("step"); reshapeAim(); buildSpecial();
  const m=reshapeNext(); feedback(m ? `Good. ${r.diy ? "Another voice still has to move." : "One more move."}` : "", "good");
}
function answerReshapeNote(pc){        // without a minichord: pick the new notes
  const r=reshape;
  if(!r.newPcs.includes(pc)){ firstTry=false; buzz(); feedback(`${spell(pc,0)} isn't one of the notes that change.`,"bad"); return; }
  r.got.add(pc); buildSpecial();
  if(r.got.size===r.newPcs.length) return correct(`That's ${r.sym}: ${reshapeMoves()}.`);
  chime("step");
}

// ---------- Seven chords ----------
// The game sets your minichord's key signature (address 35) and you play the key's seven
// chords in order, I to vii°. With the signature set, every one of them is a plain button,
// no modifier: that is what a key signature is, the sharps or flats a key always uses.
let diat=null;
const sigList=f=>{ const order=f>0?"FCGDAEB":"BEADGCF"; return [...order.slice(0,Math.abs(f))].map(L=>L+(f>0?"♯":"♭")); };
function genDiatonic(){
  const f=rnd([-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6]), name=KEY_BY_FIFTHS[f];
  ensure(35,keyIndexOf(f));
  const chords=DEGREES.map(d=>{ const root=above(name,d.st,d.se); return {label:d.n, root, q:d.q, rootPc:pcOfName(root)}; });
  diat={f, name, chords, pos:0};
  const acc=sigList(f), what = f===0 ? "no sharps or flats: every button plays its plain letter" : `${sigText(f)}, ${acc.join(", ")}: the minichord now plays every ${acc.map(a=>a[0]).join(", ")} button as ${acc.join(", ")}`;
  return {kind:"diatonic", prompt:`${name} major`, promptHtml:`<span class="keyname">${name} major</span>`, keysig:f,
    sub: canWrite() ? `Your minichord's key signature is set to ${name} major, ${what}. A key signature is the sharps or flats a key always uses, so its seven buttons now play exactly ${name} major's notes, no modifier. Play its seven chords in order: I, ii, iii, IV, V, vi, vii°.`
      : offline(`${name} major's key signature is ${what}. Play its seven chords in order, I to vii°, with the pickers.`),
    answer:{type:"diatonic", get name(){ return diat.chords.map(c=>c.root+c.q).join(" "); }},
    get hint(){ const c=diat.chords[diat.pos]; return c ? `${c.label} is ${c.root}${c.q}: ${howTo(c.root,c.q)}.` : ""; },
    hearFn:()=>diat.chords.flatMap((c,k)=>FORM[c.q].map(x=>[48+c.rootPc+x[1],k*.9])),
    context:f, barry:"", learn:`${name} major: ${[0,1,2,3,4,5,6].map(i=>above(name,i,MAJOR[i])).join(" ")}. Its chords: ${chords.map(c=>`${c.label} ${c.root}${c.q}`).join(" · ")}. Major on I, IV and V, minor on ii, iii and vi, diminished on vii.`};
}
function answerDiatonic(voices){
  const pitches=voices.map(v=>v.pitch), c=diat.chords[diat.pos];
  if(isChord(pitches,c.rootPc,c.q)){
    diat.pos++; buildSpecial();
    if(diat.pos===diat.chords.length) return correct(`All seven chords of ${diat.name} major.`);
    chime("step"); feedback(`${c.label}: ${c.root}${c.q}.`,"good"); return;
  }
  const said=chordName(pitches, diat.f) || "that";
  later(()=>wrong(`You played ${said}. ${c.label} in ${diat.name} major is next.`));
}
