// The virtual minichord (practice/virtual.js), which the keyboard and a touch screen play: its chord
// buttons follow the firmware's own rules, so a hand moving on it sounds as it would on the
// instrument. Two buttons landing together are one chord; C to C7 played legato never passes through
// Cmaj7; letting go of a Cmaj7 never sounds the C; another column held under a chord is a slash, but
// not a hand moving on to the next chord; a slash let go ends as itself. And the Lab hears it as it
// hears a minichord: "chord" once settled, "voices" while it sounds, the harp's pluck and release, the
// knobs; slash chords and knob steering are on for it.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, sleep, check, mc}=t;
  await sleep(200);
  w.eval("virtualMinichord('touch', true)"); await sleep(50);
  check("a front end makes it a minichord", mc.virtual===true && w.eval("canWrite()")===true && w.eval("vmOn()"));
  check("which isn't keyboard play: the letters are the games' own", w.eval("kbOn()")===false);
  // every settled chord, as the Lab hears it: the virtual minichord's name for it, and its lowest note
  w.eval("window.__heard=[]; mc.addEventListener('chord', e=>window.__heard.push({name:vmChordName(), low:Math.min(...e.detail.map(v=>v.pitch))}))");
  const heard=()=>w.eval("window.__heard.map(h=>h.name)");
  const clear=()=>w.eval("window.__heard=[]");
  const press=(id,r,c)=>w.eval(`vmPress(${JSON.stringify(id)},${r},${c})`), lift=id=>w.eval(`vmRelease(${JSON.stringify(id)})`);
  const quiet=async()=>{ w.eval("vmReset()"); await sleep(120); clear(); };
  // columns: F 0, C 1, G 2; rows: major 0, minor 1, seventh 2
  // a first press, to start the piano (slow under jsdom, and the timings below are tight)
  press("w",0,3); await sleep(100); await quiet();

  // two buttons landing together: one chord
  w.eval("vmPress('a',0,1); setTimeout(()=>vmPress('b',2,1), 20)"); await sleep(200);   // 20 ms apart in the page's own time
  check("two buttons landing together are one chord", JSON.stringify(heard())==='["Cmaj7"]', heard().join(" "));
  await quiet();

  // C to C7 legato: the seventh down, the major up a moment later
  press("a",0,1); await sleep(150); clear();
  press("b",2,1); await sleep(30); lift("a"); await sleep(200);
  check("C to C7 played legato never passes through Cmaj7", JSON.stringify(heard())==='["C7"]', heard().join(" "));
  await quiet();

  // letting go of a Cmaj7, the buttons lifting a moment apart
  press("a",0,1); press("b",2,1); await sleep(150); clear();
  lift("a"); await sleep(30); lift("b"); await sleep(200);
  check("letting go of a Cmaj7 never sounds the C or the C7", heard().length===0, heard().join(" "));
  await quiet();

  // but a button let go and the rest held: the smaller chord, once it stands
  press("a",0,1); press("b",2,1); await sleep(150); clear();
  lift("a"); await sleep(200);
  check("Cmaj7 with the major let go, the rest held, is C7", JSON.stringify(heard())==='["C7"]', heard().join(" "));
  await quiet();

  // a slash: another column held under the chord
  press("a",0,1); await sleep(150); clear();
  press("b",0,0); await sleep(200);
  const h=w.eval("window.__heard");
  check("another column held under a chord makes a slash chord", JSON.stringify(heard())==='["C/F"]', heard().join(" "));
  check("its bass is the slash note", h.length && ((Math.round(h[0].low)%12)+12)%12===5, h.length ? String(h[0].low) : "");
  // the bass let go, the chord held: the plain chord comes back
  clear(); lift("b"); await sleep(250);
  check("the bass let go, the chord held: the chord on its own", JSON.stringify(heard())==='["C"]', heard().join(" "));
  await quiet();

  // a slash let go, the hands lifting apart: it ends as itself
  press("a",0,1); await sleep(100); press("b",0,0); await sleep(200); clear();
  lift("a"); await sleep(40); lift("b"); await sleep(250);
  check("a slash let go ends as itself, never the bass's chord", heard().length===0, heard().join(" "));
  await quiet();

  // a hand moving on: the next chord pressed a moment before this one's let go
  press("a",0,1); await sleep(150); clear();
  press("b",0,2); await sleep(30); lift("a"); await sleep(200);
  check("the next chord pressed before this one's let go is the next chord, not a slash", JSON.stringify(heard())==='["G"]', heard().join(" "));
  await quiet();

  // the modifier, the way the game has set it (address 31: 0 sharpens, 1 flattens)
  w.eval("vmModifier('m', true)"); press("a",0,1); await sleep(150);
  const flat=w.eval("mc.params[31]")===1;
  check(`the modifier ${flat?"flattens":"sharpens"} the chord, as the game set it`, JSON.stringify(heard())===(flat?'["B"]':'["C♯"]'), heard().join(" "));
  w.eval("vmModifier('m', false)"); await quiet();

  // the voices, while it sounds
  w.eval("window.__voices=0; mc.addEventListener('voices', ()=>window.__voices++)");
  press("a",1,4); await sleep(150);
  check("while it sounds, the Lab sees its voices", w.eval("window.__voices")>0 && w.eval("mc.voices.length")===4, `${w.eval("window.__voices")} events, ${w.eval("mc.voices.length")} voices`);
  await quiet();
  check("and none once it's let go", w.eval("mc.voices.length")===0);

  // the harp: a pluck and its release
  w.eval("window.__harp=[]; mc.addEventListener('harp', e=>window.__harp.push('on '+e.detail.note)); mc.addEventListener('harpoff', e=>window.__harp.push('off '+e.detail.note))");
  w.eval("vmPluck('p', 4)"); await sleep(20); w.eval("vmLetGo('p')"); await sleep(20);
  check("a string plucked and let go: its note, then its release", w.eval("window.__harp.join()")==="on 64,off 64", w.eval("window.__harp.join()"));

  // the knobs
  check("knob steering waits for a front end with knobs", w.eval("knobsReady()")===false);
  w.eval("vmKnobs(true)");
  check("then the knob games steer by its knobs", w.eval("knobsReady()")===true);
  w.eval("window.__knob=null; mc.addEventListener('knob', e=>window.__knob=e.detail)");
  w.eval("vmKnob(2, .5)"); await sleep(10);
  const k=w.eval("window.__knob");
  check("a knob turned reports as a minichord's does", k && k.knob===2 && Math.abs(k.value-.5)<.01, JSON.stringify(k));

  // slash chords are on: Chord Invaders' slash levels can be chosen
  const slashLevels=w.eval("BLAST_LEVELS.map((l,i)=>l.slash ? i : -1).filter(i=>i>=0)");
  check("Chord Invaders' slash levels are open to it", slashLevels.length>0 && slashLevels.every(i=>w.eval(`levelOk(${i})`)), slashLevels.join());

  // two front ends: putting one away leaves the other playing
  w.eval("keyboardMinichord(true)");
  check("the keyboard can join it", w.eval("kbOn()")===true);
  w.eval("keyboardMinichord(false)");
  check("and leave it, the touch screen still playing", w.eval("vmOn()")===true && w.eval("kbOn()")===false && mc.virtual===true);
  w.eval("virtualMinichord('touch', false)");
  check("put away by every front end, it's gone", mc.virtual===false && !w.eval("mc.virtualKnobs") && w.eval("knobsReady()")===false);
  t.done();
})();
