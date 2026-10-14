// Trading Fours: a drum battle, four bars each, the rival's call answered on the harp's drum pads.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Trading Fours ----------
// A versus fighter (two health bars, a roster of rivals) where the blows are drum breaks. Two pixel
// drummers face each other at their kits. The rival plays four bars, the call; the player answers four
// bars on the pads (the harp's twelve strings, in harp drums), the time running on underneath without a
// gap: call, answer, call, answer, a quiet hi-hat foot on 2 and 4 keeping it. One count-in bar starts a
// bout, and nothing stops it until somebody falls.
//   The answer is judged on how well it matches the call's RHYTHM, not its exact drums (tfSimilarity):
// on a grid of sixteenths, where the hits fall (the same sixteenth counts in full, one either side
// half), low drums for low and high for high (the pads' registers, rhythm.js RH_REGISTER: the same
// register in full, the next one half), the accents (a hit well above the player's own usual
// strength, where the call's were), and how many. The player's own steady lateness or earliness is
// taken out first, so a laggy screen or a drummer who sits behind the beat isn't marked down for it.
// Each answer is rated ECHO! (85% alike), ANSWERED (60%), CLOSE (35%), OFF THE PAGE, or SILENCE, and
// lands a blow: the rival loses 40·S^1.5, the player 28·(1−S)^1.3, so a fair answer (70%) takes about
// five exchanges to K.O. the first rival, and four silences lose the bout.
//   The roster (the levels): MAX BACKBEAT on rock, DONA BOSSA on bossa nova, GL1TCH-9000 on clicks
// and cuts (a robot: stutters, accents where they shouldn't be), and the boss, USTAD TEENTAL, on tabla:
// four bars of four beats are one cycle of teental's sixteen matras, and an answer landing its last
// hit on sam, the cycle's first beat (the next call's first), earns a bonus. After the boss the roster
// comes round again, faster. Each rival's calls are made from its own vocabulary, deterministically
// (the same rival, round and exchange, the same call), getting harder each exchange or two.
//   Time is the audio clock's (rhythm.js): the calls, the count-in and the time-keeper are scheduled
// on it ahead of time, and each pad is judged by when it was HEARD (rhHeard of its event's time).

// ---------- the roster ----------
const TF_ROSTER=[
  {n:"MAX BACKBEAT", style:"ROCK", kit:"studio", bpm:96, look:"max"},
  {n:"DONA BOSSA", style:"BOSSA NOVA", kit:"brushes", bpm:120, look:"dona"},
  {n:"GL1TCH-9000", style:"CLICKS AND CUTS", kit:"cliqhop", bpm:104, look:"bot"},
  {n:"USTAD TEENTAL", style:"TEENTAL", kit:"tabla", bpm:76, look:"ustad", boss:true},
];
const TF_HP=100, TF_SAM_HIT=8;                 // health each, and the extra blow of an answer landing on sam
const tfRivalAt=L=> TF_ROSTER[((L||0)%TF_ROSTER.length+TF_ROSTER.length)%TF_ROSTER.length];
const tfRival=()=> (blast && blast.rival) || tfRivalAt(blast ? blast.level : 0);
const tfLap=L=> Math.floor((L||0)/TF_ROSTER.length);
const tfPadNames=kit=> typeof RH_PAD_NAMES!=="undefined" && RH_PAD_NAMES[kit] || null;
// a rival's tempo: its own, a tenth faster each time round the roster, and SPEED's (gently: its
// square root, so RELAXED is a steady groove and WILD a fast one, not a crawl and a blur)
function tfBpm(L){ const sp=typeof speedMul==="function" ? speedMul() : 1; return Math.round(tfRivalAt(L).bpm*(1+.1*tfLap(L))/Math.sqrt(sp)); }

// ---------- the rivals' vocabulary ----------
// A call is four bars of sixteenths (a step a sixteenth, 64 to the call; the boss's tihai lands on
// step 64, the next cycle's sam). Each hit: its step (a fraction for a ratchet's later hits), its pad
// (0-11 as the harp's strings, the firmware's voices), its velocity.
// Bars are written here a step a character: a voice's letter (the firmware's K S R C H O Y T U L M B:
// kick, snare, rim, clap, hat, open hat, cymbal, low and high tom, low and high conga, bell), lower case
// a hit, upper case an accent, '.' a rest; [ky] two voices at once; a digit after a step a ratchet,
// that many hits in it.
const TF_LETTERS="KSRCHOYTULMBZ";
function tfLine(str){
  const out=[]; let i=0;
  for(const m of String(str).replace(/[\s|]/g,"").matchAll(/\[([A-Za-z]+)\]([2-6]?)|([A-Za-z.])([2-6]?)/g)){
    const letters=m[1]||m[3], n=+(m[2]||m[4]||1);
    if(letters!==".") for(const c of letters){ const pad=TF_LETTERS.indexOf(c.toUpperCase()); if(pad<0 || pad>11) continue;
      for(let j=0;j<n;j++) out.push({step:i+j/n, pad, vel: n>1 ? 84 : c===c.toUpperCase() ? 124 : 96}); }
    i++;
  }
  return out;
}
// The firmware's own grooves, ported (generator/drums.py in Ben Poilvé's minichord firmware, BSD-3):
// a line a voice as it writes them ('.' rest, o a ghost, x a hit, X an accent, 3 a ratchet; bars
// between |). A call doesn't play a whole groove (no drummer could echo three voices at once on
// twelve pads): it takes it a step at a time, the first voice in `order` playing there, the groove's
// skeleton, as a drummer trading fours plays the groove's shape round the kit.
const TF_GROOVES={
  rock:      {K:"x.......x.x.....", S:"....x.......x...", H:"x.x.x.x.x.x.x.x."},
  popEighths:{K:"x.....x.x.......", S:"....x.......x...", H:"x.o.x.o.x.o.x.o."},
  think:     {K:"x.....x...x.....", S:"....x.......x...", H:"xxxxxxxxxxxxxxxx"},
  amen:      {K:"x.x.......xx....|x.x.......x.....", S:"....x..x.x..x..x|....x..x.x....x.", H:"x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x."},
  funk:      {K:"x..x..x...x..x..", S:"....x..o.o..x..o", H:"xoxoxoxoxoxoxoxo"},
  bossa:     {R:"x..x..x...x..x..|..x..x..x..x....", K:"x..xx..xx..xx..x|x..xx..xx..xx..x", H:"x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x."},
  cuts:      {K:"x...x...x...x...", C:"....x.......x...", R:"..x...x...x...x.", H:".xx..x.x.xx..xx.", L:"x.....x.....x..."},
  cliqhop:   {K:"x.....x...x.....|x.....x..x..x...", S:"........X.......|........X.....3.", R:"..x...x..x.x..x.|.x..x...x..x...x",
              H:"x.xxx.x.x.xxx.x.|x.xxx.x.x.xx3.x.", B:"...o.....o....o.|.o.....o...o...."},
  microsound:{K:"x...........o...", R:"......x.....x..x", H:".x.x.x...x.x.x..", L:"x.......x.....o.", M:"....o.......o..."},
};
function tfSkel(lines, order, bar=0){
  const hits={}, out=[];
  for(const c of order){ const l=lines[c]; if(!l) continue; const bars=l.split("|"); hits[c]=rhParseGrid(bars[bar%bars.length],4); }
  const at=(c,s)=>(hits[c]||[]).filter(h=>Math.floor(h.step+1e-9)===s);
  for(let s=0;s<16;s++){ const c=[...order].find(c=>at(c,s).length); if(c) at(c,s).forEach(h=>out.push({step:h.step, pad:TF_LETTERS.indexOf(c), vel:h.vel})); }
  return out;
}
// The second half of a fill bar, as the firmware makes its fills (drums.py fill_family): toms down the
// kit, a snare roll to a last stroke a thirty-second before the bar line, a brush's sweep rising from a
// whisper, a glitch's stutter ratcheting faster to the bar line; each over n sixteenths, louder as it
// goes.
function tfFill(family, n=8){
  const v=[...Array(n)].map((_,i)=>Math.round(60+60*i/Math.max(n-1,1))), third=Math.max(Math.floor(n/3),1), f=[];
  const put=(c,s,vel)=>f.push({step:16-n+s, pad:TF_LETTERS.indexOf(c), vel});
  if(family==="toms"){ for(let i=0;i<n;i++) put(i<third ? "S" : i<2*third ? "U" : "T", i, v[i]); put("K", n-1, 110); }
  else if(family==="snare_roll"){ for(let i=0;i<n;i++) put("S", i, v[i]); put("S", n-.5, 120); }
  else if(family==="brush"){ for(let i=0;i<n;i++) put("S", i, Math.round(30+50*i/Math.max(n-1,1))); put("K", n-1, 90); }
  else if(family==="stutter"){ for(let i=0;i<n;i++){ const d= i<Math.floor(n/2) ? 1 : i<n-2 ? 2 : 3; for(let j=0;j<d;j++) put("S", i+j/d, v[i]); put("U", i+.5, 50+8*i); } put("K", n-1, 110); }
  return f;
}
// a fill bar: the groove's first half, then the fill; the easier ones only on the eighths (and the last)
function tfFillBar(head, family, d){
  const tail=tfFill(family);
  return head.filter(h=>h.step<8).concat(d>=3 ? tail : tail.filter(h=>h.step===15 || h.step%2===0));
}
// The tabla's: bols, the strokes' own names, a matra (a beat here, four sixteenths) each, '/' sharing a
// matra between strokes, '-' a rest, capitals accented, (bracketed) a ghost; each bol the strokes struck
// together, as the firmware's tabla kit has them (drums.py BOLS): Dha is Na with Ge, Dhin Tin with Ge,
// both hands at once.
const TF_BOLS={dha:"ML", dhin:"OL", dhi:"OL", na:"M", ta:"M", naa:"Y", tin:"O", tun:"T", tu:"T", te:"H", ti:"H", ne:"U", ra:"U",
  ge:"L", ghe:"L", gee:"B", ka:"C", ke:"C", ki:"C", kat:"C"};
function tfBols(str, from=0){
  const out=[]; let m=0;
  for(const tok of String(str).replace(/\|/g," ").split(/\s+/).filter(Boolean)){
    const parts=tok.split("/");
    parts.forEach((p,j)=>{ if(p==="-") return;
      const bol=p.replace(/[()]/g,"").toLowerCase(), vel= p.startsWith("(") ? 56 : p===p.toUpperCase() ? 124 : 96;
      for(const c of TF_BOLS[bol]||"") out.push({step:(from+m)*4+j*4/parts.length, pad:TF_LETTERS.indexOf(c), vel}); });
    m++;
  }
  return out;
}
// teental's theka (drums.py, as the firmware plays it), and its tihai: tirakita dha three times, the
// third dha landing on sam
const TF_TEENTAL="DHA dhin dhin dha  dha dhin dhin dha  dha tin tin ta  ta dhin dhin dha";
const TF_TIHAI="ti/ra ki/ta DHA ti/ra ki/ta DHA ti/ra ki/ta";
// Each rival's bars and fills, tagged with a difficulty (1 plain, 2 the groove's shape, 3 its every
// sixteenth, ratchets and all); the boss's are whole cycles.
const TF_VOCAB={};
function tfVocab(kit){
  if(TF_VOCAB[kit]) return TF_VOCAB[kit];
  const G=TF_GROOVES, S=tfSkel, L=tfLine, b=(d,hits)=>({d, hits});
  let v;
  if(kit==="studio"){ const rock=S(G.rock,"KSH");
    v={bars:[b(1,L("k...s...k...s...")), b(1,S(G.rock,"KS")), b(1,L("k.k.s...k.k.s...")),
        b(2,rock), b(2,S(G.popEighths,"KSH")), b(2,S(G.think,"KS")), b(2,L("k.h.S.h.k.k.S.h.")),
        b(3,S(G.amen,"KS",0)), b(3,S(G.amen,"KS",1)), b(3,S(G.funk,"KS")), b(3,L("[ky].h.s.hkk.h.s.h"))],
      fills:[b(1,L("k...s...s.s.s.s.")), b(1,L("k...s...u.u.t.t.")),
        b(2,tfFillBar(rock,"toms",2)), b(2,tfFillBar(rock,"snare_roll",2)),
        b(3,tfFillBar(rock,"toms",3)), b(3,tfFillBar(rock,"snare_roll",3))]};
  } else if(kit==="brushes"){
    v={bars:[b(1,S(G.bossa,"R",0)), b(1,S(G.bossa,"R",1)), b(1,L("r..r..r.k.r..r..")),
        b(2,S(G.bossa,"RH",0)), b(2,S(G.bossa,"K",0)), b(2,S(G.bossa,"RH",1)), b(2,L("r..R..r...r..R..")),
        b(3,S(G.bossa,"RKH",0)), b(3,S(G.bossa,"RKH",1)), b(3,S(G.bossa,"RK",0))],
      fills:[b(1,L("r..r..r...c.c.k.")), b(1,L("..r..r..s.s.s.k.")),
        b(2,tfFillBar(S(G.bossa,"R",0),"brush",2)), b(2,tfFillBar(S(G.bossa,"R",1),"brush",2)),
        b(3,tfFillBar(S(G.bossa,"RK",0),"brush",3))]};
  } else if(kit==="cliqhop"){
    v={bars:[b(1,S(G.cuts,"KR")), b(1,L("k...s...k.k.s...")), b(1,L("k...s3..k...s3..")),
        b(2,S(G.microsound,"KRLM")), b(2,L("k..K..k...K..k..")), b(2,S(G.cuts,"KCR")), b(2,L("k...s...k.k.s3s3")),
        b(3,S(G.cliqhop,"KSR",0)), b(3,S(G.cliqhop,"KSR",1)), b(3,S(G.cuts,"KCRH")), b(3,L("k.k.S.r3k..r.S3.s3."))],
      fills:[b(1,L("k...s...s...s3..")), b(1,L("k.k.s...k..Ks3..")),
        b(2,tfFillBar(S(G.cuts,"KR"),"stutter",2)), b(2,tfFillBar(L("k..K..k........."),"stutter",2)),
        b(3,tfFillBar(S(G.cuts,"KCR"),"stutter",3))]};
  } else {   // the tabla: a whole cycle at a time
    const kayda="DHA/dha ti/ta dha/dha tin/na  dha/dha ti/ta dha/dha dhin/na  ta/ta ti/ta ta/ta tin/na  dha/dha ti/ta dha/dha dhin/na";
    const land=tfBols("DHA",16);
    v={calls:[b(1,tfBols(TF_TEENTAL)), b(1,tfBols("DHA dhin dhin dha  dha dhin dhin dha  dha tin tin ta  ta dhin dhin DHA")),
        b(2,tfBols(kayda)), b(2,tfBols("DHA dhin dhin dha  dha dhin dhin dha  dha/ge na/ge ti/na ka/ta  ta/ke dhin/na ge/na DHA")),
        b(3,tfBols("DHA/dha ti/ta dha/dha tin/na  ta/ta ti/ta dha/dha dhin/na").concat(tfBols(TF_TIHAI,8), land)),
        b(3,tfBols("DHA dhin dhin dha  dha dhin dhin dha").concat(tfBols(TF_TIHAI,8), land))]};
  }
  return TF_VOCAB[kit]=v;
}
// The call of exchange ex against rival L: its difficulty rising every other exchange (and a step
// for each time round the roster); groove, groove, groove, fill, the grooves at first the same bar
// over again; the same every time for the same rival, round and exchange.
function tfCall(L, ex){
  const R=tfRivalAt(L), V=tfVocab(R.kit), d=Math.min(3, 1+Math.floor(ex/2)+tfLap(L)), rnd=rhSeeded(`${R.n}|${tfLap(L)}|${ex}`);
  const pick=list=>{ const at=list.filter(x=>x.d===d), up=list.filter(x=>x.d<=d), from= at.length && rnd()<.65 ? at : up.length ? up : list; return from[Math.floor(rnd()*from.length)].hits; };
  let hits;
  if(V.calls) hits=pick(V.calls);
  else { const a=pick(V.bars), b= d===1 && rnd()<.6 ? a : pick(V.bars), c= rnd()<.5 ? a : pick(V.bars), f=pick(V.fills);
    hits=[a,b,c,f].flatMap((bar,i)=>bar.map(h=>({...h, step:h.step+16*i}))); }
  return {d, hits:hits.map(h=>({...h})).sort((x,y)=>x.step-y.step || x.pad-y.pad)};
}

// ---------- the judge ----------
// How alike an answer is to its call, 0 to 1, as a whole and bar by bar. call: [{step, pad, vel}];
// answer: [{step (sixteenths from the answer's start, as played: fractional), pad, vel, flat?}], flat
// for a hit with no strength of its own (the screen's pads, the keys). opts: {kit (whose registers),
// reg (or the registers themselves), flat (no accents to judge)}.
//   The player's steady offset (rhRobustOffset of each hit's distance from its nearest sixteenth) is
// taken off first. Hits within a quarter of a sixteenth of each other are one onset (two pads struck
// together, or a flam), with the registers of all. Each call onset is paired with at most one answer
// onset within a sixteenth and a half: the same sixteenth counts 1, the next one half, times the
// registers' likeness (same 1, next 1/2, far 0, as .5 + .5·likeness). What's paired, over how many each
// played, gives a precision and a recall, and their harmonic mean the rhythm's likeness; the accents
// (a hit well above the player's usual strength, the lower half's middle, against the call's, well
// above its own) and how alike the counts are temper it. Silence is 0, an exact echo 1, a stream of random hits low.
const TF_REG_ROLE=[0,1,1,1,2,2,2,0,1,0,1,2,2];
function tfSimilarity(call, answer, opts={}){
  const reg=opts.reg || (typeof RH_REGISTER!=="undefined" && RH_REGISTER[opts.kit||"studio"]) || TF_REG_ROLE;
  const bars=opts.bars||4, per=opts.per||16, rg=p=>reg[p]??1;
  const med=a=>{ if(!a.length) return 0; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
  call=call||[]; answer=answer||[];
  const out={score:0, bars:Array(bars).fill(0), rhythm:0, accent:null, density:0, offset:0,
    callMatched:call.map(()=>false), answerMatched:answer.map(()=>false), sam:false, n:{call:0, answer:0}};
  // onsets: hits close together as one
  const onsets=(hits, shift)=>{ const o=[];
    hits.map((h,i)=>i).sort((i,j)=>hits[i].step-hits[j].step).forEach(i=>{ const h=hits[i], s=h.step-shift, last=o[o.length-1];
      if(last && s-last.step<=.25){ last.regs.add(rg(h.pad)); last.vel=Math.max(last.vel, h.vel??100); last.idx.push(i); last.flat=last.flat && !!h.flat; }
      else o.push({step:s, regs:new Set([rg(h.pad)]), vel:h.vel??100, idx:[i], flat:!!h.flat}); });
    return o; };
  const C=onsets(call,0); out.n.call=C.length;
  if(!answer.length || !C.length) return out;
  let off=typeof rhRobustOffset==="function" ? rhRobustOffset(answer.map(a=>a.step-Math.round(a.step))) : 0;
  off=Math.max(-.45, Math.min(.45, off||0)); out.offset=off;
  const A=onsets(answer,off); out.n.answer=A.length;
  // the registers' likeness, both ways round: each register in one set against the nearest in the other
  const one=(x,y)=>[...x].reduce((s,r)=>s+Math.max(...[...y].map(q=> q===r ? 1 : Math.abs(q-r)===1 ? .5 : 0)),0)/x.size;
  const regSim=(a,b)=>(one(a,b)+one(b,a))/2;
  const pairs=[];
  C.forEach((c,i)=>A.forEach((a,j)=>{ const d=Math.abs(a.step-c.step); if(d<=1.5) pairs.push({i, j, d, v:(d<=.5 ? 1 : .5)*(.5+.5*regSim(c.regs,a.regs))}); }));
  pairs.sort((x,y)=>y.v-x.v || x.d-y.d);
  const byC=new Map(), byA=new Map();
  for(const p of pairs) if(!byC.has(p.i) && !byA.has(p.j)){ byC.set(p.i,p); byA.set(p.j,p); }
  let M=0; byC.forEach(p=>M+=p.v);
  const P=M/A.length, Rc=M/C.length;
  out.rhythm= P+Rc>0 ? 2*P*Rc/(P+Rc) : 0;
  out.density=Math.min(A.length,C.length)/Math.max(A.length,C.length);
  // the accents, where the player has strengths to tell them by
  if(!(opts.flat || A.every(a=>a.flat)) && byC.size){
    const up=v=>{ const m=med(v), q=med(v.filter(x=>x<=m)); return Math.max(q+22, m+6); }, upA=up(A.filter(a=>!a.flat).map(a=>a.vel)), upC=up(C.map(c=>c.vel));
    let wrong=0; byC.forEach(p=>{ const c=C[p.i], a=A[p.j]; if((c.vel>=upC)!==(!a.flat && a.vel>=upA)) wrong++; });
    out.accent=1-wrong/byC.size;
  }
  out.score=Math.max(0, Math.min(1, out.rhythm*(out.accent==null ? 1 : .8+.2*out.accent)*(.4+.6*out.density)));
  // bar by bar
  const barOf=s=>Math.max(0, Math.min(bars-1, Math.floor((s+.5)/per)));
  out.bars=out.bars.map((_,b)=>{ const nc=C.filter(c=>barOf(c.step)===b).length, na=A.filter(a=>barOf(a.step)===b).length;
    if(!nc && !na) return 1; if(!nc || !na) return 0;
    let m=0; byC.forEach(p=>{ if(barOf(C[p.i].step)===b) m+=p.v; });
    const p=Math.min(1,m/na), r=m/nc; return p+r>0 ? 2*p*r/(p+r) : 0; });
  byC.forEach(p=>{ C[p.i].idx.forEach(k=>out.callMatched[k]=true); A[p.j].idx.forEach(k=>out.answerMatched[k]=true); });
  const last=A[A.length-1]; out.sam=!!last && Math.abs(last.step-bars*per)<=.5;   // the last hit on the next downbeat: sam
  return out;
}
const TF_RATINGS=[[.85,"ECHO!","#FFD35A"],[.6,"ANSWERED","#7FE08A"],[.35,"CLOSE","#7FE9FF"],[0,"OFF THE PAGE","#FF5AA0"]];
function tfRate(S, n){ if(!n) return {name:"SILENCE", col:"#9A93B8"}; const r=TF_RATINGS.find(([m])=>S>=m); return {name:r[1], col:r[2]}; }
const tfDamage=S=>({foe:Math.round(40*Math.pow(S,1.5)), me:Math.round(28*Math.pow(1-S,1.3))});

// ---------- the game ----------
function genFours(){
  return {kind:"fours", prompt:"Trading Fours", sub:"A drum battle: the rival plays four bars, you answer four on the harp's strings as drum pads. Echo the rhythm to land the blows.",
    answer:{type:"fours", name:"the call's rhythm, answered"}, hint:"Listen for where the hits fall, low and high, and the accents: the drums needn't be the same.", context:0};
}
function startFours(){
  blast={kind:"fours", score:0, lives:1, level:0, over:true, phase:"menu", raf:0, field:null, hud:null, fx:null, noShip:true,
    last:performance.now(), rival:TF_ROSTER[0], padNames:tfPadNames(TF_ROSTER[0].kit), bpm:tfBpm(0),
    hp:{me:TF_HP, foe:TF_HP}, shown:{me:TF_HP, foe:TF_HP}, st:"idle", bout:null, calls:{}, answers:{}, myHits:[], fly:[]};
  tfDevice();
  if(typeof rhKeysOn==="function") rhKeysOn();                    // the number row as pads, with or without a minichord (rhythm.js)
  stats.streak=0; scoreboard(); buildSpecial();
  tfMenu();
  blast.raf=requestAnimationFrame(tfTick);
}
// harp drums on, in the rival's kit (rhythm.js); once the second page of settings is in, if it came late
function tfDevice(){
  if(!blast || blast.kind!=="fours" || !canWrite()) return;
  arcadeSetup(()=>{ if(typeof rhDevice==="function") rhDevice(tfRival().kit); });
  if(mc.page1 && typeof rhReady==="function" && !rhReady() && typeof rhDevice==="function") rhDevice(tfRival().kit);
}
function buildFoursField(box){
  const field=document.createElement("div"); field.className="field arcade fours"; field.setAttribute("aria-label","The stage");
  const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
  const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
  box.append(field);
  if(blast && blast.kind==="fours"){
    Object.assign(blast, {field, hud, heard:hd, fx:fxInit(field), layoutKey:null});
    const scr=document.createElement("canvas"); scr.className="ccscreen"; blast.fx.cv.after(scr); blast.screen=scr;   // its own screen, at the old arcade's resolution
    if(blast.overlay) field.appendChild(blast.overlay);
  }
  tfBar(); setTimeout(helperSync);
}
function tfBar(){
  if(!blast || blast.kind!=="fours" || !blast.hud) return;
  const R=tfRival(), lap=tfLap(blast.level);
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">VS ${R.n}${lap ? ` · ROUND ${lap+1}` : ""}</span><span class="lives">${blast.bpm||tfBpm(blast.level)} BPM</span>`;
}
// the rival at level L: its kit's names on the pads, its kit on the minichord, its tempo, both fresh
function tfSetRival(L, device=true){
  const R=tfRivalAt(L);
  Object.assign(blast, {level:L, rival:R, padNames:tfPadNames(R.kit), bpm:tfBpm(L), calls:{}, answers:{}, result:null,
    hp:{me:TF_HP, foe:TF_HP}, shown:{me:TF_HP, foe:TF_HP}, helpNamesStale:true});
  if(typeof tdPadLabels==="function") tdPadLabels();
  if(R.kit==="tabla" && typeof rhLoad==="function") rhLoad("tabla");   // the recorded strokes, decoded while the count-in plays
  if(device && canWrite() && typeof rhDevice==="function") rhDevice(R.kit);
  tfBar();
}

// ---------- the title screen ----------
const TFMENU_G={key:"fours", title:"TRADING FOURS",
  rules:()=>`<p>A DRUM BATTLE. YOUR RIVAL PLAYS FOUR BARS, THE CALL; YOU ANSWER WITH FOUR BARS ON THE PADS, THE HARP'S TWELVE STRINGS AS DRUMS. THE TIME NEVER STOPS: CALL, ANSWER, CALL, ANSWER, A HI-HAT KEEPING IT ON 2 AND 4.</p><p>ANSWER WITH THE CALL'S RHYTHM, NOT ITS EXACT DRUMS: HITS IN THE SAME PLACES, LOW DRUMS FOR LOW AND HIGH FOR HIGH, THE ACCENTS WHERE THEY WERE. ECHO IT CLOSELY AND YOUR RIVAL TAKES THE BLOW; MISS IT AND YOU DO.</p><p>K.O. A RIVAL AND THE NEXT STEPS UP: MAX BACKBEAT ON ROCK, DONA BOSSA ON BRUSHES, GL1TCH-9000, AND THE BOSS, USTAD TEENTAL, ON TABLA: SIXTEEN BEATS TO A CYCLE, AND A BONUS FOR LANDING YOUR LAST HIT ON SAM, THE NEXT CYCLE'S FIRST.</p><p>THE SHEET SHOWS THE CALL AS IT'S PLAYED, HIGH DRUMS ON THE TOP LINE, LOW ON THE BOTTOM, AND YOUR ANSWER UNDER IT. ${playOnScreen() ? "TAP THE PADS UNDER THE GAME, OR THE KEYS 1 TO =" : "ON THE MINICHORD THE GAME TURNS HARP DRUMS ON, IN THE RIVAL'S KIT. ON THE KEYBOARD, 1 TO = ARE THE PADS, SPACE THE KICK"}.${typeof jsOn==="function" && jsOn() ? " THE STICK HELD UP AS YOU STRIKE MAKES AN ACCENT, DOWN A GHOST NOTE." : ""}</p>${typeof rhNeeds==="function" && rhNeeds() ? `<p>${rhNeeds()}${typeof rhBlocked!=="function" || rhBlocked() ? ": PLAY ON THE KEYBOARD" : ""}.</p>` : ""}`,
  stat:()=>`VS ${tfRival().n}`,
  levels:TF_ROSTER, begin:i=>beginFours(i), demo:()=>tfDemo(), modNote:false};
function tfMenu(over){ arcadeMenu(TFMENU_G, over); }
function beginFours(level){
  newRun();
  piano.start(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT);
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  Object.assign(blast,{score:0, lives:1, startLevel:level, phase:"play", over:false, modFor:null, halted:null, kos:0, exchanges:0, myHits:[], fly:[], hearOnly:!!saved.tfHearOnly});
  tfSetRival(level);
  saved.foursStart=level; save(); stats.streak=0; scoreboard();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(tfTick);
  sfx("bell");
  if(typeof rhStart==="function") rhStart();                       // the scheduler, bound to this game
  tfBout(0);
}
// A bout's clock: a count-in bar from a little ahead of now (the output's latency, and a margin), then
// exchange after exchange, each a call of four bars and an answer of four, ex the first of them (a
// bout picked up again after a pause starts with the exchange it was in, its call again). Everything
// is on the audio clock in seconds; nothing begins until that clock is running (a context just made
// takes a moment to start), unless it never does (the test harness's), when the page's clock stands in.
function tfBout(ex=0){
  if(!blast || blast.kind!=="fours" || !(blast.phase==="play" || blast.phase==="demo")) return;
  if(document.hidden){ blast.halted={ex}; blast.st="halt"; return; }
  const c=rhCtx();
  if(c && !rhClockOverride && !(c.currentTime>0) && (blast.clockWait=(blast.clockWait||0)+1)<=12){ blast.st="wait"; gameLater(()=>tfBout(ex), 40); return; }
  blast.clockWait=0;
  const beat=60/blast.bpm, step=beat/4, bar=4*beat, tc=rhCtxNow()+rhLead()+.05, t0=tc+bar-ex*8*bar;
  blast.bout={t0, tc, beat, step, bar, live:!!rhLiveCtx(), sched:ex-1, judged:ex-1, first:ex};
  blast.answers={}; blast.st="count"; blast.ex=ex;
  for(let i=0;i<4;i++) rhAt(tc+i*beat, i ? "click" : "accent", i ? 85 : 105, blast.rival.kit);
  tfSchedule(ex);
}
const tfEnd=()=> blast.rival.boss ? 64.5 : 63.5;                    // where an answer's window closes, in sixteenths
const tfCallFor=e=> blast.calls[e] || (blast.calls[e]=tfCall(blast.level, e));
const tfCallStart=e=> blast.bout.t0+e*8*blast.bout.bar;
// an exchange's sounds, queued a call ahead: the call, and the time under its call and its answer
function tfSchedule(e){
  const B=blast.bout, R=blast.rival, cs=tfCallStart(e);
  for(const h of tfCallFor(e).hits) rhAt(cs+h.step*B.step, h.pad, h.vel, R.kit);
  for(let b=0;b<8;b++) for(const k of [1,3]) rhAt(cs+(b*4+k)*B.beat, "chick", 72, R.kit);
  if(R.boss) for(const at of [0,4]) rhAt(cs+at*B.bar, "click", 46, R.kit);   // a soft tick on sam, the cycle's first beat
  B.sched=e;
  if(blast.phase==="demo") tfDemoPlan(e);
}
function tfOver(){
  if(!blast || blast.kind!=="fours" || blast.phase!=="play") return;
  if(typeof rhStop==="function") rhStop();
  blast.phase="over"; blast.over=true; blast.st="idle"; saved.best.fours=Math.max(saved.best.fours||0, blast.score); save(); tfMenu(true);
}

// ---------- each frame ----------
function tfTick(now){
  if(!blast || blast.kind!=="fours") return;
  const dt=Math.max(0, Math.min(DT_MAX,(now-blast.last)/1000)); blast.last=now;
  if(blast.phase==="play" || blast.phase==="demo") tfStep();
  else if(blast.phase==="pause" && blast.bout && !blast.halted) tfHalt();     // the arcade's pause: the music stops, and starts again with a count-in
  blast.jsOwn = blast.phase==="play";                              // the stick is the accent, not a d-pad
  if(blast.fx) fxDraw(now, dt);
  blast.raf=requestAnimationFrame(tfTick);
}
// where the bout is, from the clock as heard: counting in, the call, the answer; the next exchange
// queued as an answer begins, each answer judged once its window has closed
function tfStep(){
  const B=blast.bout; if(!B) return;
  if(blast.halted){ if(!document.hidden) tfResume(); return; }
  if(!["count","call","answer"].includes(blast.st)) return;
  if(!rhClockOverride && B.live!==!!rhLiveCtx()){ tfHalt(); tfResume(); return; }   // the audio clock came alive (or stopped) under the bout: start again on it
  const h=rhNow();
  if(h<B.t0){ blast.st="count"; return; }
  const e=Math.floor((h-B.t0)/(8*B.bar)), into=h-B.t0-e*8*B.bar;
  blast.ex=e; blast.st= into<4*B.bar ? "call" : "answer";
  const want= blast.st==="answer" ? e+1 : e; while(B.sched<want) tfSchedule(B.sched+1);   // (a long frame, a throttled tab: what's past is skipped)
  if(blast.phase==="demo"){ tfDemoStep(h); if(blast.phase!=="demo") return; }   // (the demo may have ended there)
  for(let j=B.judged+1; j<=e; j++){
    if(h<tfCallStart(j)+4*B.bar+tfEnd()*B.step+.03) break;
    tfJudge(j); if(blast.st!=="call" && blast.st!=="answer") return;
  }
}
// a pad struck, heard at context time heard: the player's drummer strikes; in an answer's window it's
// part of the answer (a hit during the call is only heard). Returns the hit taken, or null.
function tfHit(pad, vel=100, heard, flat=false){
  if(!blast || blast.kind!=="fours") return null;
  if(heard==null) heard=rhNow();
  blast.myHits.push({t:heard, pad}); if(blast.myHits.length>8) blast.myHits.shift();
  const B=blast.bout;
  if(!B || !(blast.phase==="play" || blast.phase==="demo") || !["count","call","answer"].includes(blast.st)) return null;
  const e=Math.floor((heard-B.t0-4*B.bar+.5*B.step)/(8*B.bar)); if(e<=B.judged) return null;
  const s=(heard-tfCallStart(e)-4*B.bar)/B.step;
  if(s<-.5 || s>tfEnd()) return null;
  const hit={pad, vel, flat:!!flat, step:s, t:heard};
  (blast.answers[e]=blast.answers[e]||[]).push(hit);
  return hit;
}
// an answer judged: its rating, the blows each way, the points; a K.O. either way ends the bout
function tfJudge(e){
  const B=blast.bout, R=blast.rival, call=tfCallFor(e), ans=blast.answers[e]||[];
  B.judged=e;
  const res=tfSimilarity(call.hits, ans, {kit:R.kit}), rate=tfRate(res.score, res.n.answer), dmg=tfDamage(res.score), sam=!!(R.boss && res.sam);
  if(sam) dmg.foe+=TF_SAM_HIT;
  blast.hp.foe=Math.max(0, blast.hp.foe-dmg.foe); blast.hp.me=Math.max(0, blast.hp.me-dmg.me);
  let pts=mulPts(Math.round(1000*res.score)*(blast.level+1)); if(sam) pts+=mulPts(500*(blast.level+1));
  blast.score+=pts; blast.exchanges=(blast.exchanges||0)+1;
  const h=rhNow();
  blast.result={e, res, rate, dmg, pts, sam, at:h, call, ans};
  // the blows: the player's at the rival, then the rival's back
  if(dmg.foe>0) blast.fly.push({from:"me", at:h, dmg:dmg.foe});
  if(dmg.me>0) blast.fly.push({from:"foe", at:h+(dmg.foe>0 ? .45 : 0), dmg:dmg.me});
  if(res.score>=.85) sfx("crowd");
  tfBar();
  if(blast.hp.foe<=0) tfKO();
  else if(blast.hp.me<=0) tfLost();
}
// the rival down: K.O., the roster, and the next rival steps up
function tfKO(){
  if(typeof rhStop==="function") rhStop();
  blast.st="ko"; blast.koAt=rhNow(); blast.hp.me=Math.max(1, blast.hp.me);
  const bonus=mulPts(2000*(blast.level+1)); blast.score+=bonus; blast.kos=(blast.kos||0)+1; blast.koBonus=bonus; tfBar();
  gameLater(()=>sfx("ko"), 450);
  if(blast.phase==="demo") return;
  gameLater(()=>{ blast.st="roster"; blast.rosterAt=rhNow(); sfx("level"); }, 3000);
  gameLater(()=>{ tfSetRival(blast.level+1); blast.fly=[]; sfx("bell"); tfBout(0); }, 7000);
}
// the player down: game over
function tfLost(){
  if(typeof rhStop==="function") rhStop();
  blast.st="lost"; blast.lostAt=rhNow();
  gameLater(()=>sfx("hurt"), 450);
  if(blast.phase==="demo") return;
  gameLater(tfOver, 3400);
}
// The page hidden (or the arcade's pause): the music stops at once, and the bout waits; on its return
// it picks up from the exchange it was in, its call again, after a fresh count-in, the answer it was
// in the middle of forgotten (nothing is judged across the gap).
function tfHalt(){
  if(!blast || blast.kind!=="fours" || !blast.bout || blast.halted || !["wait","count","call","answer"].includes(blast.st)) return;
  if(typeof rhStop==="function") rhStop();
  blast.halted={ex:blast.bout.judged+1}; blast.st="halt";
}
function tfResume(){
  // (the arcade's pause ended before a frame saw it: the exchange it was in; at a K.O. or the roster,
  // nothing to count back in to)
  if(!blast.halted && !(blast.bout && ["count","call","answer"].includes(blast.st))) return;
  const ex=blast.halted ? blast.halted.ex : blast.bout.judged+1; blast.halted=null;
  if(typeof rhStart==="function") rhStart();
  tfBout(ex);
}
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden && blast && blast.kind==="fours" && (blast.phase==="play" || blast.phase==="demo")) tfHalt();
});
// the stick on the joystick plate, up or down (controller.js), 0 elsewhere
function tfStickY(){
  if(typeof jsOn==="function" && !jsOn()) return 0;
  if(typeof jsXY==="function"){ const s=jsXY(); return (s && s.y) || 0; }
  return (typeof mc!=="undefined" && mc.stick && mc.stick.y) || 0;
}
// A pad struck (the minichord's own, the screen's, the keys', the plate's), timed by its own event:
// heard at rhHeard of that time. The minichord sounds its own pads; the others the page sounds here,
// in the rival's kit. On the joystick plate the stick held up makes it an accent, down a ghost note.
mc.addEventListener("drum", e=>{
  if(!blast || blast.kind!=="fours") return;
  if(blast.phase==="demo"){ if(blast.demo) endTfDemo(blast.demo); return; }    // a real strike ends the demo
  if(blast.phase!=="play") return;
  const d=e.detail||{}, pad=d.pad; if(!Number.isInteger(pad) || pad<0 || pad>11) return;
  if(d.source==="minichord" || d.source==="plate") blast.midiIn=(blast.midiIn||0)+1;
  let vel=d.vel??100, flat=d.source!=="minichord";
  const y=tfStickY(); if(y>.5){ vel=127; flat=false; } else if(y<-.5){ vel=40; flat=false; }
  if(d.source!=="minichord" && typeof rhSound==="function") rhSound(pad, vel, blast.rival.kit);
  tfHit(pad, vel, rhHeard(d.t ?? performance.now()), flat);
});

// ---------- the picture ----------
// Its own screen at the old arcade's resolution (pixel.js), as Sus Bros.' is: on a wide field at least
// 288 by 168, on an upright one (a phone) 144 by 190, as big as fits, and then as much wider or taller
// as the field's shape asks, so it fills it (the stage taking the extra).
// From the top: the health bars, with the names under them; the stage, the two drummers at their kits
// facing each other in front of the rival's own backdrop; what's happening (the call, the answer); and
// the sheet, the four bars (in a row, or two by two upright), each with the call's hits over the
// answer's, high drums on the top line, low on the bottom.
function tfLayout(){
  const {aw, ah}=pxRoom(), wide=aw>=ah*1.15, Wm= wide ? 288 : 144, Hm= wide ? 168 : 190, dpr=window.devicePixelRatio||1;
  let k=Math.min(aw/Wm, ah/Hm);
  if(dpr<2) k=Math.max(1, Math.floor(k*dpr+1e-9))/dpr;              // a whole number of a desktop screen's pixels a pixel
  const W=Math.max(Wm, Math.min(wide ? 420 : 200, Math.floor(aw/k+1e-9))), H=Math.max(Hm, Math.min(wide ? 260 : 400, Math.floor(ah/k+1e-9)));
  const f=pxFit(W, H, 1, false, true);
  pxPlace(blast.screen, f);
  const sw= wide ? 4 : 3, cols= wide ? 4 : 2, gap= wide ? 5 : 8, barW=16*sw, rowH=35;
  const sheetH=(4/cols)*rowH, x0=Math.floor((W-(cols*barW+(cols-1)*gap))/2), sheetTop=H-sheetH-2;
  const status=sheetTop-11, floor=status-5, top=22, stageH=floor-top;
  // the drummers twice as big where the stage has the height; upright, then, close to the sides and
  // without their crash cymbals, so the two kits still have the stage's middle between them
  const sc= stageH>=(wide ? 86 : 76) ? 2 : 1, compact=!wide && sc===2;
  blast.lay={W, H, wide, sw, cols, gap, barW, rowH, x0, sheetTop, status, floor, top, sc, compact,
    px: compact ? 16 : Math.round(W*(wide ? .2 : .22)), rx: compact ? W-16 : Math.round(W*(wide ? .8 : .78))};
}
// the sheet's bar b: its left edge, and the top of its row
const tfBarAt=b=>{ const L=blast.lay; return {x:L.x0+(b%L.cols)*(L.barW+L.gap), y:L.sheetTop+Math.floor(b/L.cols)*L.rowH}; };
const TF_ME="#7FE9FF", TF_FOE="#FF5AA0";
function tfDraw(_, now){
  const s=blast.screen, g=s && s.getContext("2d"); if(!g || !g.fillRect) return;
  const lk=`${fieldW()}x${fieldH()}@${window.devicePixelRatio||1}|${blast.phase==="demo"}|${!!saved.beginner}`;
  if(blast.layoutKey!==lk || !blast.lay){ blast.layoutKey=lk; tfLayout(); }
  const L=blast.lay, h=rhNow(), R=tfRival(), live=blast.phase==="play" || blast.phase==="demo";
  g.imageSmoothingEnabled=false;
  // the health bars drain to where they now are
  const sh=blast.shown, step=Math.min(.1,(now-(blast.drawnAt||now))/1000)*40;
  for(const k of ["me","foe"]){ const to=blast.hp[k]; sh[k]= sh[k]>to ? Math.max(to, sh[k]-step) : to; }
  blast.drawnAt=now;
  tfBackdrop(g, L, R, now);
  if(live && blast.st==="roster") tfRoster(g, L, now);
  else { tfStage(g, L, R, h, now, live); tfSheet(g, L, R, h, now, live); }
  tfHealth(g, L, R, now, live);
}
// a line of the arcade's lettering, k times as big
function tfText(g, text, cx, y, col, k=1){
  if(k===1){ pxText(g, text, cx, y, col); return; }
  const chars=[...text], x0=Math.round(cx-chars.length*4*k); y=Math.round(y);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1],[2,2]]) chars.forEach((ch,i)=>{ const m=pxGlyph(ch,"#000"); if(m) g.drawImage(m, x0+i*8*k+dx, y+dy, 8*k, 8*k); });
  chars.forEach((ch,i)=>{ const m=pxGlyph(ch,col); if(m) g.drawImage(m, x0+i*8*k, y, 8*k, 8*k); });
}
const tfRect=(g,x,y,w,h,c)=>{ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),w,h); };
const tfDisc=(g,cx,cy,r,c)=>{ for(let dy=-r;dy<=r;dy++){ const w=Math.round(Math.sqrt(r*r-dy*dy)); tfRect(g,cx-w,cy+dy,2*w+1,1,c); } };
// each rival's place: a rock club's brick and amps, a beach at night, a circuit board, a palace's arches
function tfBackdrop(g, L, R, now){
  const W=L.W, H=L.H, fl=L.floor, k=R.kit, top=L.top;
  tfRect(g,0,0,W,H,"#07060C");
  if(k==="studio"){
    tfRect(g,0,top,W,fl-top,"#3A1418");
    for(let y=top+2, row=0;y<fl;y+=5, row++) for(let x=(row%2)*6-6;x<W;x+=12) tfRect(g,x,y,11,4,"#4E1C20");
    for(const ax of [3, W-21]){ tfRect(g,ax,fl-34,18,34,"#1A1A22"); tfRect(g,ax+1,fl-33,16,15,"#2A2A33"); tfRect(g,ax+1,fl-17,16,16,"#2A2A33");
      for(let y=fl-31;y<fl-19;y+=3) tfRect(g,ax+3,y,12,1,"#1A1A22"); tfRect(g,ax+7,fl-36,4,2,"#C8C8D8"); }
  } else if(k==="brushes"){
    const span=Math.max(1,fl-top), sea=top+Math.round(span*.6);
    tfRect(g,0,top,W,sea-top,"#141A44"); tfRect(g,0,sea,W,fl-sea,"#10305A");
    tfDisc(g,Math.round(W*.6),top+9,4,"#F1E8D2"); tfDisc(g,Math.round(W*.6)+2,top+8,4,"#141A44");      // a crescent moon
    for(let i=0;i<14;i++) tfRect(g,(i*37+11)%W, top+3+((i*13)%Math.max(8,sea-top-6)),1,1,"#B9C7E6");
    for(let x=0;x<W;x+=7) tfRect(g,x+((Math.floor(now/500)+x)%3),sea+2+((x*5)%Math.max(2,fl-sea-3)),3,1,"#2E5A9A");
    const palm=(x,dir)=>{ for(let y=fl-1;y>fl-30;y--) tfRect(g,x+Math.round(Math.sin((fl-y)/9)*2*dir),y,2,1,"#2A1A10");
      const tx=x+Math.round(Math.sin(29/9)*2*dir), ty=fl-31;
      for(const [dx,dy] of [[-9,4],[-6,1],[0,-2],[6,1],[9,4]]) for(let i=0;i<=6;i++) tfRect(g,tx+Math.round(dx*i/6),ty+Math.round(dy*i/6+(i*i)/9),2,1,"#1E5A2E"); };
    palm(7,1); palm(W-9,-1);
  } else if(k==="cliqhop"){
    tfRect(g,0,top,W,fl-top,"#06120C");
    for(let x=4;x<W;x+=16) tfRect(g,x,top,1,fl-top,"#0E3A22");
    for(let y=top+6;y<fl;y+=12) tfRect(g,0,y,W,1,"#0E3A22");
    for(let i=0;i<12;i++){ const x=4+16*((i*5)%Math.max(1,Math.floor((W-8)/16))), y=top+6+12*((i*3)%Math.max(1,Math.floor((fl-top-8)/12))), on=(Math.floor(now/250)+i)%3===0;
      tfRect(g,x-1,y-1,3,3,"#0E3A22"); tfRect(g,x,y,1,1, on ? "#7FE08A" : "#1E6A3A"); }
  } else {
    tfRect(g,0,top,W,fl-top,"#2A0E1C");
    for(let x=-8;x<W;x+=30){ const r=12;
      for(let y=top+4;y<fl;y++){ const t=y-top-4, a= t<r ? r-Math.round(Math.sqrt(r*r-(r-t)*(r-t))) : 0;
        tfRect(g,x+a,y,1,1,"#C8A040"); tfRect(g,x+2*r-a,y,1,1,"#C8A040"); } }
    tfRect(g,0,top,W,3,"#8B2252"); tfRect(g,0,top+3,W,1,"#C8A040");
  }
  // the stage's floor
  tfRect(g,0,fl,W,H-fl,"#07060C");
  tfRect(g,0,fl,W,2, k==="tabla" ? "#8B2252" : k==="cliqhop" ? "#1E6A3A" : k==="brushes" ? "#C8A070" : "#5A3A2A");
  if(k==="tabla") for(let x=0;x<W;x+=4) tfRect(g,x,fl+1,2,1,"#C8A040");
}
// health bars, Street Fighter's: full from the middle out, what was just lost draining in white
function tfHealth(g, L, R, now, live){
  const W=L.W, half=Math.floor(W/2), bw=half-12, y=3;
  const bar=(x0, dir, hp, shown, col)=>{                          // x0 the bar's inner end
    const left= dir>0 ? x0+1 : x0-bw-1, f=Math.round(bw*Math.max(0,shown)/TF_HP), n=Math.round(bw*Math.max(0,hp)/TF_HP);
    tfRect(g, left-1, y-1, bw+2, 8, "#000"); tfRect(g, left, y, bw, 6, "#E8323C");
    if(dir<0){ tfRect(g, x0-1-f, y, f, 6, "#F1E8D2"); tfRect(g, x0-1-n, y, n, 6, col); }
    else { tfRect(g, x0+1, y, f, 6, "#F1E8D2"); tfRect(g, x0+1, y, n, 6, col); }
    tfRect(g, left, y, bw, 1, "rgba(255,255,255,.3)");
  };
  const hp=blast.hp, sh=blast.shown, col=v=> v<=25 && Math.floor(now/250)%2 ? "#FF9A3C" : "#FFD35A";
  bar(half-8, -1, hp.me, sh.me, col(hp.me));
  bar(half+8, 1, hp.foe, sh.foe, col(hp.foe));
  // the K.O. between them, flashing red once one is near
  const near=(hp.me<=25 || hp.foe<=25) && live;
  tfRect(g, half-8, y-2, 16, 10, "#000"); pxText(g, "KO", half, y-1, near && Math.floor(now/300)%2 ? "#FF3B30" : "#C8A040", false);
  pxText(g, "YOU", 15, 12, TF_ME);
  pxText(g, R.n, W-3-[...R.n].length*4, 12, TF_FOE);
}
// The stage: the two drummers at their kits, the blows flying between them, the rating, the count-in,
// and what's happening on the line over the sheet.
function tfStage(g, L, R, h, now, live){
  const fl=L.floor, B=blast.bout, st=live ? blast.st : "idle", sc=L.sc;
  // the rival strikes on each of the call's hits as it's heard, the player on each of theirs
  let foeStrike=null, meStrike=null;
  if(live && B && ["call","answer","count"].includes(st))
    for(const e of [blast.ex, blast.ex-1]) if(e>=B.first && blast.calls[e]){ const cs=tfCallStart(e);
      for(const x of blast.calls[e].hits){ const t=cs+x.step*B.step, age=h-t; if(age>=0 && age<.09 && (!foeStrike || t>foeStrike.t)) foeStrike={t, pad:x.pad}; } }
  for(const x of blast.myHits||[]){ const age=h-x.t; if(age>=-.02 && age<.09 && (!meStrike || x.t>meStrike.t)) meStrike=x; }
  // the blows, and who they've landed on
  let meHurt=null, foeHurt=null;
  blast.fly=(blast.fly||[]).filter(f=>h-f.at<1.4);
  for(const f of blast.fly){ const age=h-f.at, land=age-.32, mine=f.from==="me";
    if(age>=0 && land<0){ const a=age/.32, x0=mine ? L.px+14*sc : L.rx-14*sc, x1=mine ? L.rx-2*sc : L.px+2*sc;
      tfBlow(g, x0+(x1-x0)*a, fl-18*sc-Math.sin(a*Math.PI)*8, mine ? TF_ME : TF_FOE, mine ? 1 : -1, now); }
    if(land>=0){ if(mine) foeHurt=land; else meHurt=land;
      if(land<.9) pxText(g, `-${f.dmg}`, mine ? L.rx : L.px, fl-24*sc-Math.round(land*8), mine ? "#FFD35A" : "#FF5AA0");
      if(!f.sounded){ f.sounded=true; sfx(mine ? "blow" : "hurt"); } }
  }
  const koFoe= live && (st==="ko" || st==="roster"), koMe= live && st==="lost";
  tfFighter(g, "you", L.px, fl, 1, sc, {strike:meStrike, hurt:meHurt, down:koMe, win:koFoe, now, kit:R.kit, compact:L.compact});
  tfFighter(g, R.look, L.rx, fl, -1, sc, {strike:foeStrike, hurt:foeHurt, down:koFoe, win:koMe, now, kit:R.kit, compact:L.compact});
  if(!live) return;
  // words over the stage
  const mid=Math.floor(L.W/2), ty=L.top+4;
  if(st==="count" && B){ const n=4-Math.floor((h-B.tc)/B.beat); if(n>=1 && n<=4) tfText(g, String(n), mid, ty+6, "#FFD35A", 3); }
  else if(st==="ko"){ const a=h-blast.koAt; if(a>1.5 || Math.floor(a/.25)%2===0) tfText(g, "K.O.", mid, ty+4, "#FF3B30", 3);
    if(a>1.6) pxText(g, `+${blast.koBonus}`, mid, ty+34, "#FFD35A"); }
  else if(st==="lost") tfText(g, "YOU LOSE", mid, ty+4, "#FF3B30", 2);
  else if(st==="halt" || st==="wait") pxText(g, st==="halt" ? "PAUSED" : "READY", mid, ty+6, "#F1E8D2");
  else { const r=blast.result;
    if(r && h-r.at<2.4){ const n=[...r.rate.name].length, k= n>(L.compact ? 5 : 8) ? 1 : 2, pct=Math.round(r.res.score*100);   // (upright, clear of the drummers' heads)
      tfText(g, r.rate.name, mid, ty, r.rate.col, k);
      pxText(g, L.compact ? `${pct}%` : `${pct}% · +${r.pts}`, mid, ty+8*k+3, "#F1E8D2");
      if(r.sam) pxText(g, "ON SAM!", mid, ty+8*k+13, "#FFD35A"); } }
  // the line over the sheet
  let say="";
  if(st==="count") say=`VS ${R.n}`;
  else if(st==="call" || st==="answer"){ const n=Math.max(1, Math.min(4, Math.floor((h-tfCallStart(blast.ex)-(st==="answer" ? 4*B.bar : 0))/B.bar)+1));
    say= st==="call" ? `${L.wide ? "THE CALL" : "CALL"} · BAR ${n}` : `${L.wide ? "YOUR ANSWER" : "ANSWER"} · BAR ${n}`; }
  else if(st==="ko") say=`${R.n} IS DOWN`;
  else if(st==="lost") say="GAME OVER";
  if(say && [...say].length*8>L.W-4) say=say.replace(/^VS /,"");
  if(say) pxText(g, say, mid, L.status+1, st==="answer" ? TF_ME : st==="call" ? TF_FOE : "#F1E8D2");
}
function tfBlow(g, x, y, col, dir, now){
  x=Math.round(x); y=Math.round(y);
  for(let i=1;i<6;i++) tfRect(g, x-dir*(2+i*3), y+((i+Math.floor(now/60))%3)-1, 2, 1, i<3 ? col : "rgba(255,255,255,.4)");
  tfRect(g,x-2,y-3,5,7,col); tfRect(g,x-3,y-2,7,5,col); tfRect(g,x-1,y-1,3,3,"#FFFFFF");
}
// ---------- the drummers ----------
// Each drawn a rectangle at a time, facing the other (dir 1 to the right), sc pixels a pixel, from
// where it sits: x its middle, fl the floor. Its look: skin, clothes, hair and hat, and what it plays:
// a drum kit (bass drum, tom, snare, hi-hat, crash), a robot's drum machine, or the tabla on the floor.
// It strikes: its stick on the drum for the hit's register (high a cymbal, middle the snare, low its
// foot on the kick, or the tabla's two drums), flinches when a blow lands, and falls at a K.O.
const TF_LOOKS={
  you:  {skin:"#C68B59", shade:"#9A6640", shirt:"#2FB8FF", trim:"#F1E8D2", legs:"#2A2A50", shoe:"#F1E8D2", kit:"#2F6BFF", gear:"kit", hat:"cap"},
  max:  {skin:"#F0C090", shade:"#C89868", shirt:"#1A1A22", trim:"#F1E8D2", legs:"#3060A8", shoe:"#1A1A22", kit:"#E8323C", gear:"kit", hat:"mane", hair:"#2A1A12"},
  dona: {skin:"#B8784E", shade:"#8E5A38", shirt:"#FFD35A", trim:"#FF9A3C", legs:"#FFD35A", shoe:"#8B2252", kit:"#2EB872", gear:"kit", hat:"bun", hair:"#1A0E08", brush:true},
  bot:  {skin:"#9AA4B8", shade:"#6A7488", shirt:"#6A7488", trim:"#7FE9FF", legs:"#4A5468", shoe:"#2A2A3A", kit:"#4A5468", gear:"machine", hat:"bot"},
  ustad:{skin:"#B87850", shade:"#8E5A38", shirt:"#F1E8D2", trim:"#8B2252", legs:"#F1E8D2", shoe:"#F1E8D2", kit:"#8B5A2B", gear:"tabla", hat:"turban", hair:"#FF9A3C"},
};
function tfFighter(g, look, x, fl, dir, sc, o){
  const P=TF_LOOKS[look]||TF_LOOKS.you, now=o.now||0;
  const hurt=o.hurt!=null && o.hurt<.45, flash=hurt && Math.floor(o.hurt/.06)%2===0;
  const ox=x-(hurt ? dir*2*sc : 0), oy=fl-(o.win && Math.floor(now/180)%2 ? sc : 0);   // a winner bobs
  const r=(rx,ry,w,hh,c)=>{ g.fillStyle= flash && c!=="#000" ? "#FFFFFF" : c; g.fillRect(dir>0 ? ox+rx*sc : ox-(rx+w)*sc, oy+ry*sc, w*sc, hh*sc); };
  const line=(x0,y0,x1,y1,c)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1); for(let i=0;i<=n;i++) r(Math.round(x0+(x1-x0)*i/n), Math.round(y0+(y1-y0)*i/n), 1, 1, c); };
  const seated=P.gear!=="tabla", lift= seated ? 0 : 5;               // the ustad sits on the floor
  const reg=o.strike ? ((typeof RH_REGISTER!=="undefined" && (RH_REGISTER[o.kit||"studio"]||[])[o.strike.pad]) ?? 1) : null;
  // what it plays, in front of it
  if(P.gear==="kit"){
    line(9,-11,9,-1,"#777"); line(16,-20,16,-1,"#777"); if(!o.compact) line(21,-26,20,-1,"#777");
    r(8,-10,7,10,P.kit); r(8,-10,7,1,"#F1E8D2"); r(8,-1,7,1,"#F1E8D2"); r(14,-9,1,8,"#F1E8D2");
    r(9,-15,5,3,P.kit); r(9,-15,5,1,"#F1E8D2");
    r(6,-14,6,3,"#C8C8D8"); r(6,-14,6,1,"#FFFFFF");
    const crash=!o.compact && o.strike && o.strike.pad===6, hat=reg===2 && !crash;
    r(13,hat ? -20 : -21,7,1,"#FFD35A"); r(13,-20,7,1,"#C8A040");
    if(!o.compact){ r(17,crash ? -26 : -27,7,1,"#FFD35A"); if(crash) r(24,-28,1,1,"#FFFFFF"); }
  } else if(P.gear==="machine"){
    line(12,-12,12,-1,"#4A5468"); line(10,-1,14,-1,"#4A5468");
    r(7,-16,12,5,"#2A2A3A"); r(7,-16,12,1,"#9AA4B8");
    for(let i=0;i<3;i++) r(8+i*4,-14,3,2, o.strike && reg===2-i ? "#FFFFFF" : ["#FF5AA0","#FFD35A","#7FE9FF"][i]);
    r(17,-18,1,2, Math.floor(now/200)%2 ? "#7FE08A" : "#1E6A3A");
  } else {
    r(7,-6,6,6,"#B8B8C8"); r(8,-7,4,1,"#2A2A3A"); r(7,-1,6,1,"#8A8A9A");             // the bayan, metal, its black spot
    r(13,-8,4,8,P.kit); r(13,-8,4,1,"#2A2A3A"); r(14,-8,2,1,"#000"); r(13,-4,4,1,"#C8A040");   // the dayan, wood
  }
  if(o.down){   // K.O.'d: flat out behind the kit, stars round the head
    r(-17,-3,12,3,P.shirt); r(-23,-5,7,6,P.skin); r(-5,-3,9,2,P.legs); r(4,-3,2,3,P.shoe);
    if(P.hat==="mane" || P.hat==="bun") r(-24,-6,3,7,P.hair); else if(P.hat==="turban") r(-24,-6,3,7,P.hair); else if(P.hat==="cap") r(-24,-6,2,6,P.shirt);
    for(let i=0;i<3;i++){ const a=now/200+i*2.1; r(-20+Math.round(Math.cos(a)*5),-10+Math.round(Math.sin(a)*2),1,1,"#FFD35A"); }
    return;
  }
  // the stool and legs (the ustad's crossed in front of him)
  const foot=!!o.strike && reg===0 && P.gear==="kit";
  if(seated){ r(-4,-9,6,2,"#555"); line(-1,-7,-1,-1,"#444"); line(-3,-1,1,-1,"#444");
    r(-1,-11,7,3,P.legs); r(5,-9,3,8,P.legs); r(5,foot ? -1 : -2,4,2,P.shoe); if(foot) line(10,-3,12,-6,"#C8C8D8"); }
  else { r(-5,-5,11,4,P.legs); r(-6,-2,13,2,P.legs); }
  if(P.hat==="bun") r(-3,-12,8,3,P.shirt);                          // a dress
  // the arms: the far one held back, the near one striking
  const sy=-19+lift;
  const pose=w=>{
    if(P.gear==="tabla") return w==="rest" ? {e:{x:3,y:-10}, h:{x:9,y:-11}} : w===0 ? {e:{x:3,y:-9}, h:{x:9,y:-8}} : {e:{x:4,y:-10}, h:{x:14,y:-9}};
    if(P.gear==="machine") return w==="rest" ? {h:{x:5,y:-19}, t:{x:8,y:-24}} : {h:{x:[13,11,9][w]??11,y:-16}, t:{x:[16,12,9][w]??12,y:-15}};
    return w==="rest" ? {h:{x:4,y:-22}, t:{x:6,y:-28}} : w===2 ? {h:{x:8,y:-19}, t:{x:14,y:-21}} : {h:{x:6,y:-15}, t:{x:10,y:-14}}; };
  const arm=(p, skin, dx=0)=>{
    if(p.e){ line(dx,sy,p.e.x+dx,p.e.y,skin); line(p.e.x+dx,p.e.y,p.h.x+dx,p.h.y,skin); r(p.h.x+dx,p.h.y-1,2,2,skin); return; }   // the tabla's hands
    line(dx,sy,p.h.x+dx,p.h.y,skin); line(dx+1,sy,p.h.x+dx,p.h.y+1,skin);
    if(p.t){ line(p.h.x+dx,p.h.y,p.t.x+dx,p.t.y, P.gear==="machine" ? "#7FE9FF" : "#F1D9A0"); if(P.brush) r(p.t.x+dx-1,p.t.y-1,2,2,"#C8C8D8"); } };
  arm(pose("rest"), P.shade, -1);
  // the body, the head
  r(-3,-21+lift,6,11,P.shirt);
  if(look==="you") r(-3,-17,6,1,P.trim);
  if(look==="max"){ r(0,-18,2,2,"#F1E8D2"); r(-3,-21,1,6,P.skin); }
  if(look==="bot"){ r(-1,-18,2,2,Math.floor(now/400)%2 ? "#7FE08A" : "#1E6A3A"); r(-3,-21,6,1,P.trim); }
  if(look==="ustad"){ r(-3,-16+lift,6,2,P.trim); r(1,-21+lift,1,11,P.trim); }
  const hy=-28+lift; r(-3,hy,7,7,P.skin);
  r(2,hy+2,1,1,"#16132A"); r(2,hy+5,2,1,P.shade);
  if(P.hat==="cap"){ r(-4,hy-1,7,2,P.shirt); r(-6,hy,3,1,P.shirt); }
  else if(P.hat==="mane"){ r(-4,hy-1,7,2,P.hair); r(-5,hy,3,10,P.hair); r(-3,hy+1,7,1,"#E8323C"); r(1,hy+2,3,1,"#000"); }
  else if(P.hat==="bun"){ r(-4,hy-1,7,2,P.hair); r(-4,hy,2,4,P.hair); r(-7,hy-1,3,3,P.hair); r(-7,hy-3,2,2,"#FF3B30"); r(0,hy+6,1,1,"#FFD35A"); }
  else if(P.hat==="bot"){ r(-3,hy,7,1,P.shade); r(-1,hy+2,5,2,"#7FE9FF"); r(-3,hy+3,1,1,P.shade); line(0,hy-1,0,hy-4,"#9AA4B8"); r(0,hy-5,1,1,Math.floor(now/300)%2 ? "#FF3B30" : "#7A2020"); }
  else if(P.hat==="turban"){ r(-4,hy-2,8,3,P.hair); r(-3,hy-3,6,1,P.hair); r(1,hy-2,2,1,"#FFD35A"); r(0,hy+4,4,3,"#F1E8D2"); }
  arm(pose(o.strike && !foot ? reg : "rest"), P.skin);
}
// The sheet: each bar's three lines (high, middle, low), the call's hits over the answer's. While the
// rival plays, its hits appear as heard (unless THE CALL is HEAR ONLY), the answer's line cleared ahead
// of them; while the player answers, theirs appear as they're played; once judged, what matched is
// lit and what was missed blinks, until the next call wipes across it.
function tfSheet(g, L, R, h, now, live){
  const B=blast.bout, sw=L.sw, st=live ? blast.st : "idle";
  for(let b=0;b<4;b++){ const {x,y}=tfBarAt(b);
    tfRect(g,x-1,y+7,L.barW+1,27,"#0C0A18");
    for(const ly of [12,26]) tfRect(g,x-1,y+ly,L.barW+1,4,"#13102A");      // the middle line of each, shaded
    for(let s=0;s<16;s+=4) tfRect(g,x+s*sw,y+7,1,27, s ? "#1E1A33" : "#3A3458");
    tfRect(g,x-1,y+20,L.barW+1,1,"#3A3458");
    if(R.boss) pxText(g, ["X","2","0","3"][b], x+3, y-1, b===0 ? "#FFD35A" : b===2 ? "#7FE9FF" : "#C8A040", false);
    else pxText(g, String(b+1), x+3, y-1, "#5A5478", false);
  }
  if(R.boss){ const {x,y}=tfBarAt(3); pxText(g,"X",x+L.barW+5,y-1,"#FFD35A",false); tfRect(g,x+L.barW+2,y+7,sw,27,"#2A2418"); }
  if(!live || !B) return;
  const reg=p=>((typeof RH_REGISTER!=="undefined" && (RH_REGISTER[R.kit]||[])[p]) ?? 1);
  // (a hit a shade before a bar line, as played, is that bar's first: drawn there, not past the last bar's end)
  const mark=(step, pad, row, col)=>{ const b=Math.max(0,Math.min(3, Math.floor((step+.5)/16))), {x,y}=tfBarAt(b), s=Math.max(0, step-16*b);
    tfRect(g, x+Math.round(s*sw), y+(row ? 22 : 8)+(2-reg(pad))*4, Math.max(2,sw-1), 3, col); };
  const blink=Math.floor(now/180)%2===0, r=blast.result;
  // the last judged exchange, lit and blinking, from step `from` on
  const shown=(res, from)=>{
    res.call.hits.forEach((x,i)=>{ if(x.step<from) return; if(res.res.callMatched[i]) mark(x.step,x.pad,0,"#FFD35A"); else if(blink) mark(x.step,x.pad,0,TF_FOE); });
    res.ans.forEach((x,i)=>{ const s=Math.max(0, x.step-res.res.offset); if(s<from) return; mark(s,x.pad,1, res.res.answerMatched[i] ? "#FFFFFF" : "#4A5A6A"); }); };
  const e=blast.ex;
  if(st==="call" || st==="answer"){
    const inCall=st==="call", p=(h-tfCallStart(e)-(inCall ? 0 : 4*B.bar))/B.step, call=tfCallFor(e);
    if(inCall && r && r.e===e-1) shown(r, p);                     // the last answer's result, wiped as the call goes
    if(!blast.hearOnly) call.hits.forEach(x=>{ if(!inCall || x.step<=p) mark(x.step,x.pad,0, x.vel>=110 ? "#FFFFFF" : TF_FOE); });
    if(!inCall) (blast.answers[e]||[]).forEach(x=>mark(Math.max(0,x.step),x.pad,1, x.vel>=110 && !x.flat ? "#FFFFFF" : TF_ME));
    // where the music is: a line down the call's row, then the answer's
    if(p>=0 && p<64.5){ const b=Math.min(3,Math.floor(p/16)), {x,y}=tfBarAt(b); tfRect(g, x+Math.round((p-16*b)*sw), y+(inCall ? 7 : 21), 1, 13, inCall ? TF_FOE : TF_ME); }
  } else if(r) shown(r, -1);
}
// The roster between rivals (Punch-Out's): the four, the beaten ones K.O.'d, the next one blinking,
// each a portrait (its head and shoulders, framed), its name and tempo.
function tfRoster(g, L, now){
  const W=L.W, H=L.H, mid=Math.floor(W/2), next=blast.level+1, lap=tfLap(next), at=next%TF_ROSTER.length;
  tfRect(g,0,L.top,W,H-L.top,"#07060C");
  pxText(g, lap ? `ROUND ${lap+1} · FASTER` : "THE ROSTER", mid, L.top+4, "#FFD35A");
  const rowH=Math.max(26, Math.min(44, Math.floor((H-L.top-20)/TF_ROSTER.length))), x0=Math.max(4, mid-80), blink=Math.floor(now/250)%2;
  TF_ROSTER.forEach((R,i)=>{ const y=L.top+18+i*rowH+Math.floor((rowH-24)/2), done=i<at, isNext=i===at, n=[...R.n].length;
    tfRect(g,x0,y,24,24, isNext ? (blink ? "#FFFFFF" : "#FFD35A") : done ? "#3A3458" : "#9A93B8"); tfRect(g,x0+1,y+1,22,22,"#1A1630");
    g.save(); g.beginPath(); g.rect(x0+1,y+1,22,22); g.clip();
    tfFighter(g, R.look, x0+12, y+(R.look==="ustad" ? 53 : 63), 1, 2, {now, kit:R.kit});
    g.restore();
    if(done){ g.globalAlpha=.55; tfRect(g,x0+1,y+1,22,22,"#07060C"); g.globalAlpha=1; pxText(g, "KO", x0+12, y+8, "#FF3B30"); }
    pxText(g, R.n, x0+30+n*4, y+3, isNext ? (blink ? "#FFFFFF" : "#FFD35A") : done ? "#5A5478" : "#F1E8D2");
    const bpm=`${tfBpm(lap*TF_ROSTER.length+i)} BPM`;
    pxText(g, isNext ? `${bpm} · NEXT` : bpm, x0+30+[...(isNext ? `${bpm} · NEXT` : bpm)].length*4, y+13, done ? "#3A3458" : isNext ? "#FFD35A" : "#9A93B8");
  });
}

// ---------- the demo ----------
// The autopilot trades with MAX BACKBEAT: a real bout, its answers near-echoes of the calls (now and
// then a hit dropped or played on another drum of the same register, each a few milliseconds off),
// each pad lit on the on-screen minichord as it strikes, captions saying what's going on.
function tfDemo(){
  if(!blast || blast.kind!=="fours") return;
  stopDemo(); clearTimeout(blast.attract); piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  const {say}=demoShell(endTfDemo);
  Object.assign(blast, {phase:"demo", demoSay:say, demoCap:"", demoHits:[], demoLit:0, score:0, fly:[], myHits:[], hearOnly:false, halted:null});
  tfSetRival(0, false);
  say("TRADING FOURS","MAX BACKBEAT PLAYS FOUR BARS: THE CALL. THEN IT'S YOUR TURN: FOUR BARS ON THE PADS.");
  sfx("attract");
  if(typeof rhStart==="function") rhStart();
  tfBout(0);
}
// the demo's answer to exchange e, planned as its call is queued, each hit sounded ahead on the clock
function tfDemoPlan(e){
  const B=blast.bout, R=blast.rival, rnd=rhSeeded(`demo|${e}`), as=tfCallStart(e)+4*B.bar, reg=RH_REGISTER[R.kit]||TF_REG_ROLE;
  for(const c of tfCallFor(e).hits){
    if(c.step>tfEnd() || rnd()<.06) continue;
    let pad=c.pad; if(rnd()<.15){ const same=[...Array(12).keys()].filter(p=>reg[p]===reg[c.pad] && p!==c.pad); if(same.length) pad=same[Math.floor(rnd()*same.length)]; }
    const t=as+c.step*B.step+(rnd()-.5)*.024;
    blast.demoHits.push({t, pad, vel:c.vel}); rhAt(t, pad, c.vel, R.kit);
  }
}
function tfDemoStep(h){
  const B=blast.bout, cap=(k,t,c)=>{ if(blast.demoCap!==k){ blast.demoCap=k; if(blast.demoSay) blast.demoSay(t,c); } };
  blast.demoHits=(blast.demoHits||[]).filter(x=>{ if(x.t>h) return true; tfHit(x.pad, x.vel, x.t); helpString(x.pad); blast.demoLit=h; return false; });
  if(blast.demoLit && h-blast.demoLit>.12){ blast.demoLit=0; helpString(-1); }
  const r=blast.result;
  if(r && h-r.at<4 && blast.st==="call") cap(`r${r.e}`, r.rate.name, r.e===0 ? `${Math.round(r.res.score*100)}% ALIKE: A CLOSE ANSWER LANDS A BLOW AND THE RIVAL'S HEALTH DROPS. A POOR ONE, AND YOURS DOES.` : "AND THE NEXT CALL IS HARDER. FOUR RIVALS, AND A TABLA MASTER AT THE TOP.");
  else if(blast.st==="call") cap(`c${blast.ex}`, "THE CALL", "LISTEN: WHERE THE HITS FALL, LOW DRUMS AND HIGH, AND THE ACCENTS. THE SHEET SHOWS THEM.");
  else if(blast.st==="answer") cap(`a${blast.ex}`, "THE ANSWER", "NOW ECHO IT ON THE PADS: THE SAME RHYTHM, LOW FOR LOW AND HIGH FOR HIGH. THE DRUMS NEEDN'T BE THE SAME.");
  if(B.judged>=1 && r && h-r.at>4) endTfDemo(blast.demo);
}
function endTfDemo(token){
  if(!blast || blast.kind!=="fours" || !token || blast.demo!==token) return;
  if(typeof rhStop==="function") rhStop();
  stopDemo(); helpString(-1);
  Object.assign(blast, {phase:"menu", bout:null, st:"idle", result:null, demoHits:[], demoSay:null, score:0, fly:[], myHits:[], halted:null});
  tfSetRival(0, false);
  if(blast.overlay) blast.overlay.hidden=false;
  cabRestart();
}
