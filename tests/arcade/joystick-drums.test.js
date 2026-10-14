// The drum games on the joystick plate. Firmware 91 has harp drums there (the strip's places and A, B
// and the click strike the kit as ordinary channel-10 notes): the usual harp-drums setup, nothing
// needed. Firmware 90 hasn't: the page plays the pads itself. The strip is made chromatic from C and
// its volume borrowed down to nothing, and core/minichord.js (mc.drumFallback) turns its places (pad =
// pitch class) and A, B and the click (kick, snare, closed hat) into "drum" events from source "plate",
// timed by the MIDI message, counted as playing; a soft note says firmware 91 would sound them. The
// click is the hi-hat in play, never pause.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- firmware 90: the fallback
    const T=t.load("time-pilot"), {w, mc, sleep, button, writes}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4, 343:0}}); await sleep(150);
    const ev=s=>w.eval(s);
    check("firmware 90 on the plate: the page plays the pads (mc.drumFallback)", ev("mc.drumFallback")===true);
    check("the strip silent: harp volume borrowed to 0", mc.params[2]===0 && ev("borrowed[2]")===80);
    check("and chromatic from C, so a place is its pad", mc.params[98]===1);
    check("harp drums not asked for (no use there on 90)", !writes.some(([a,v])=>a===343 && v===1));
    check("a soft note, not a block", ev("rhNeeds()")==="FIRMWARE 91 SOUNDS THE PADS ON THE MINICHORD" && ev("rhBlocked()")===false && ev("rhReady()")===true);
    const drums=[], harps=[]; mc.addEventListener("drum", e=>drums.push(e.detail)); mc.addEventListener("harp", e=>harps.push(e.detail));
    const waited=ev("cabWaiting()");
    mc._harp([0x90, 72+5, 1], 4321.5);
    check("a title screen wakes at a pad", waited && !ev("cabWaiting()"));
    check("a strip place: a \"drum\" from the plate, its pitch class the pad, timed by the message", drums.length===1 && drums[0].pad===5 && drums[0].source==="plate" && drums[0].t===4321.5 && drums[0].vel===100, JSON.stringify(drums));
    check("not a harp string", harps.length===0);
    mc._harp([0x80, 72+5, 0]);
    check("its note-off: nothing", drums.length===1 && harps.length===0);
    // single port mode: the harp on its own channel of the chord port
    mc.params[108]=1; mc.params[107]=2;
    mc.handle([0x91, 72+2, 1], 50); mc.handle([0x81, 72+2, 0], 90);
    check("single port mode: the harp channel's notes too", drums.length===2 && drums[1].pad===2 && drums[1].t===50 && harps.length===0, JSON.stringify(drums.slice(1)));
    mc.params[108]=0;
    drums.length=0;
    button("a", true, 100); button("a", false); button("b", true, 200); button("b", false); button("click", true, 300); button("click", false);
    check("A, B and the click: the kick, the snare and the closed hat, each timed", drums.map(d=>d.pad).join()==="0,1,4" && drums.every(d=>d.source==="plate") && drums.map(d=>d.t).join()==="100,200,300", JSON.stringify(drums));
    // a title screen wakes at a pad
    await T.start(0); await sleep(200);
    check("playing", ev("blast.phase")==="play");
    const n0=ev("blast.midiIn||0");
    mc._harp([0x90, 72, 1]); mc._harp([0x80, 72, 0]);
    check("a plate pad in play counts as playing the minichord", ev("blast.midiIn||0")===n0+1);
    button("click"); button("click", false); await sleep(5);
    check("the click in play: the hi-hat, never pause", ev("blast.phase")==="play" && drums[drums.length-1].pad===4);
    w.eval("restoreAll()"); await sleep(20);
    check("given back after: the harp's volume", mc.params[2]===80);
  }
  { // ---- firmware 91: harp drums as on any plate
    const T=t.load("time-pilot"), {w, mc, sleep}=T;
    await sleep(150); T.connect({firmware:91, extra:{243:4}}); await sleep(150);
    const ev=s=>w.eval(s);
    check("firmware 91 on the plate: harp drums on, out on the harp's port", mc.params[343]===1 && mc.params[340]===2, `343=${mc.params[343]} 340=${mc.params[340]}`);
    check("nothing needed, no fallback, the strip's volume left alone", ev("rhNeeds()")==="" && ev("mc.drumFallback")===false && mc.params[2]===80 && ev("rhReady()"));
    const drums=[]; mc.addEventListener("drum", e=>drums.push(e.detail));
    mc._harp([0x90, 72+5, 100]);
    mc.handle([0x99, 38, 90], 600);
    check("the instrument's own channel-10 pads are the drums", drums.length===1 && drums[0].pad===1 && drums[0].source==="minichord" && drums[0].t===600, JSON.stringify(drums));
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
