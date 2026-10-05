// Sus Bros.: every phase's pests spell in every key it deals; the sus layout loaded where the minichord
// has the alternate layout's slots and SUSPEND is chosen, and given back, and left alone by default
// (RESOLVE), a flipped pest sounding its suspension then; the player walks while a way's held and jumps on A,
// bumping the floor above and flipping what's on it there, a second bump righting it; RESOLVE
// clears a flipped pest with its resolution; SUSPEND wants its sus chord first; the crab
// angered by one bump, a dominant then, flipped by the second and resolved home; the ice melted a
// semitone above one of its notes; a pest left flipped rights itself faster; one down the bottom pipe
// comes back out at the top, faster; a cleared pest sends a coin of the scale; the POW flips them all;
// a walking pest catches the player; every pest cleared clears the phase; and the screen's minichord
// plays the sus layout.
const t=require("./harness").load("sus-bros");
(async()=>{
  const {sb, sleep, check, mc, w}=t;
  await sleep(150); t.connect({firmware:21, extra:{39:0}}); await sleep(100);
  const E=s=>w.eval(s);
  const play=async pitches=>{ sb.answerChord(pitches.map((pitch,voice)=>({pitch, voice}))); await sleep(30); };
  const ch=c=>E(`FORM[${JSON.stringify(c.q)}]`).map(f=>48+c.pc+f[1]);
  const hold=pc=>mc._harp([0x90, 60+pc, 100]), lift=pc=>mc._harp([0x80, 60+pc, 0]);
  const RIGHT=3, A=6;

  const spelled=E(`(()=>{ const out=[], was=blast.key;
    for(let lv=0; lv<SB_LEVELS.length; lv++) for(const f of [-3,-2,-1,0,1,2,3]){ const L=SB_LEVELS[lv]; if(Math.abs(f)>(L.keys||0)) continue; blast.key=sbKey(f);
      for(const kind of Object.keys(L.pests)){ const degs = kind==="crab" || kind==="ice" ? ["V"] : kind==="fly" ? L.degrees.filter(d=>SB_SUS2_OK.includes(d)) : L.degrees;
        for(const deg of degs) for(const angry of [false,true]){ const c=sbPestChords({kind, deg, angry, dim:sbDim()}); if(!c.sus || (kind!=="ice" && !c.res)) out.push(lv+" "+blast.key.name+" "+kind+" "+deg); } } }
    blast.key=was; return out; })()`);
  check("every phase's pests, and what resolves them, spell in every key it deals", !spelled.length, spelled.slice(0,4).join("; "));
  check("a sus2 pest's 2nd is in the key: never on iii", E(`(()=>{ const k=sbKey(0); return SB_SUS2_OK.every(d=>{ const c=sbChord(k,d,"sus2"); const s=spellChord(c.root,"sus2"); return s.every(n=>MAJOR.includes(mod(pcOfName(n),12))); }); })()`));

  E(`saved.sbSuspend=true`);                                           // SUSPEND, for the bonus: the sus layout
  const a=await t.start(0); await sleep(2100);
  check("SUSPEND: the sus layout loaded: the alternate layout on, its slots major, minor, 7, sus4, sus2, 7sus4, °7",
    mc.params[39]===1 && [202,203,204,205,206,207,208].map(x=>mc.params[x]).join()===E("SB_SLOTS").join() && E("SB_SLOTS").join()==="1,2,3,12,13,14,10");
  a.queue.splice(0, a.queue.length, {kind:"creeper", deg:"I"}); a.pests.length=0; a.nextOut=1e9;   // one left in the pipe, never let out, so the phase isn't over
  const H=a.hero;
  hold(RIGHT); await sleep(500); lift(RIGHT); await sleep(100);
  check("a way held on the harp walks the player", H.x>66 && H.state==="walk", H.x.toFixed(1));
  // a creeper on the first floor, over the player's head; a jump bumps the floor and flips it
  const mk=(kind, deg, f, x, dir=1)=>{ E(`blast.pests.push(Object.assign(sbSpawn({kind:"${kind}", deg:"${deg}"}, true), {x:${x}, f:${f}, y:SB_FLOORS[${f}].y, dir:${dir}}))`); const e=a.pests[a.pests.length-1]; e.stunUntil=1e9; return e; };
  const e=mk("creeper","IV",1,60); Object.assign(H, {x:60, y:204, f:0, state:"walk"});
  hold(A); lift(A); await sleep(500);
  check("A jumps; the head bumps the floor above and flips the pest on it", e.state==="flipped", e.state);
  await sleep(500); Object.assign(H, {x:60, y:204, f:0, state:"walk"}); hold(A); lift(A); await sleep(500);
  check("bumped again, a flipped pest rights itself, a step faster", e.state==="walk" && e.tier===1);
  E(`sbHit(blast.pests[0])`);
  // SUSPEND: the resolution alone isn't enough
  const c=E(`sbPestChords(blast.pests[0])`);
  check("a creeper on IV in C is Fsus4, resolving to F", c.sus.sym==="Fsus4" && c.res.sym==="F");
  await play(ch(c.res));
  check("SUSPEND: the resolution alone doesn't clear it, and says to suspend first", e.state==="flipped" && /SUSPENSION FIRST: Fsus4/.test(t.heard()), t.heard());
  const s0=a.score; await play(ch(c.sus)); await play(ch(c.res));
  check("its sus chord, then its resolution, clears it", !a.pests.includes(e) && a.score-s0===Math.round(1610*1.5) || (!a.pests.includes(e) && a.score-s0>=1600), `${a.score-s0}`);
  check("and a coin of the scale comes out of a pipe", a.coins.length===1 && a.coins[0].note==="C");
  // the coin taken: its note
  const coin=a.coins[0]; Object.assign(coin, {x:H.x, y:H.y, f:H.f}); await sleep(80);
  check("walked into, the coin's taken", a.coins.length===0);
  // RESOLVE, the default: a flipped pest sounds its suspension, and its resolution alone clears it
  E(`saved.sbSuspend=false`);
  const e2=mk("creeper","ii",1,60); a.sounded=null; E(`sbHit(blast.pests[0])`);
  check("RESOLVE: flipped, a pest sounds its suspension (Dsus4)", a.sounded==="Dsus4", a.sounded);
  await play(ch(E(`sbChord(blast.key,"ii","")`)));
  check("RESOLVE: a wrong chord (D for Dsus4 in C, not Dm) leaves it", e2.state==="flipped");
  await play(ch(E(`sbChord(blast.key,"ii","m")`)));
  check("its resolution, Dm, clears it", !a.pests.includes(e2));
  E(`saved.sbSuspend=true`);
  // the crab: angry at the first bump (a dominant seventh), flipped at the second, resolved home
  const k=mk("crab","V",1,60); E(`sbHit(blast.pests[0])`);
  check("the crab's first bump angers it: G7sus4 is G7 now", k.angry && k.state==="walk" && E(`sbPestChords(blast.pests[0]).sus.sym`)==="G7");
  E(`sbHit(blast.pests[0])`);
  await play(ch(E(`sbChord(blast.key,"V","7")`))); await play(ch(E(`sbChord(blast.key,"I","")`)));
  check("the second flips it, and G7 then C resolves it home", !a.pests.includes(k));
  // the ice
  const ice=mk("ice","V",2,100); const up=[...ice.dim.to][2];
  await play([48+up, 52+up, 55+up]);
  check("the ice melts for a chord a semitone above one of its notes", !a.pests.includes(ice), ice.dim.sym);
  // left flipped too long: righted, faster
  const e3=mk("creeper","I",1,60); E(`sbHit(blast.pests[0])`); e3.until=a.clock+.05; await sleep(200);
  check("left flipped too long, a pest rights itself, faster", e3.state==="walk" && e3.tier===1);
  // down the bottom pipe, out at the top again, faster
  Object.assign(e3, {f:0, y:204, x:20, dir:-1, stunUntil:0, tier:1}); await sleep(400);
  check("walked into a bottom pipe, it's gone down it", e3.state==="piped");
  e3.until=a.clock; await sleep(80);
  check("and comes back out at the top, a step faster", e3.state==="walk" && e3.f===3 && e3.tier===2);
  // the POW
  a.pests.length=0; const p1=mk("creeper","I",1,30), p2=mk("creeper","V",2,150), pow=a.pow;
  E(`sbBump(1, 120)`);
  check("bumped from under, the POW flips every pest on a floor", p1.state==="flipped" && p2.state==="flipped" && a.pow===pow-1);
  // caught
  a.pests.length=0; const lives=a.lives; const p3=mk("creeper","I",0,H.x+3); p3.stunUntil=0; await sleep(80);
  check("a walking pest that reaches the player is a life", a.st==="dying");
  await sleep(1900); await sleep(1500);
  check("lost; the player back on the ground", a.lives===lives-1 && a.st==="go" && a.hero.f===0);
  // the phase cleared
  a.pests.length=0; a.queue.length=0; const last=mk("creeper","I",1,60); E(`sbHit(blast.pests[0])`);
  await play(ch(E(`sbChord(blast.key,"I","sus4")`))); await play(ch(E(`sbChord(blast.key,"I","")`)));
  check("every pest cleared, the phase is", a.st==="clear");
  await sleep(2700);
  check("and the next phase begins", a.level===1 && a.queue.length===5);
  sb.restoreAll(); await sleep(50);
  check("leaving gives the layout and its slots back", mc.params[39]===0 && mc.params[202]===0);
  // RESOLVE, the default: the minichord's own layout left alone
  E(`saved.sbSuspend=false; blast.setupDone=false; blast.phase="menu"; blast.overlay && blast.overlay.remove(); blast.overlay=null; sbMenu()`);
  await t.start(0); await sleep(300);
  check("by default (RESOLVE) the minichord's own layout is left alone", mc.params[39]===0 && mc.params[205]===0);
  sb.restoreAll(); await sleep(50);

  // the screen's minichord plays the sus layout: C's major and 7 together, Csus4
  w.eval("keyboardMinichord(true)"); await sleep(100);
  mc.params[39]=1; E("SB_SLOTS").forEach((v,i)=>mc.params[202+i]=v);
  t.key("KeyW"); await sleep(60); t.key("KeyX"); await sleep(200);
  const said=(t.d.querySelector(".kbnow")||{}).textContent;
  check("the screen's minichord plays the sus layout: major and 7 held, sus4", said==="Csus4", said);
  t.done();
})();
