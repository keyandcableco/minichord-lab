// A minichord plugged in while the one drawn on the screen plays (a phone's arcade puts that one up
// by itself when it finds none): the screen's steps aside, as at Connect, and the real one is heard,
// written to and asked for its settings.
const harness=require("./harness");
const t=harness.load("invaders"), {w, d, mc, check, sleep}=t;
(async()=>{
  await sleep(250);
  await t.start(0);
  // the page has MIDI already (reconnected by itself), with no minichord on the other end
  const sent=[], outs=new Map(), ins=new Map();
  mc.midi={inputs:ins, outputs:outs}; mc.sysex=mc.sysexGranted=true;
  mc._ports();
  w.eval("touchMinichord(true)"); await sleep(80);
  check("no minichord found: the screen's plays", w.eval("vmOn()") && mc.virtual===true && mc.out && mc.out.id==="virtual");
  // something else turns up first: the screen's keeps its place
  ins.set("k", {id:"k", name:"USB Keyboard"}); mc._ports();
  check("another MIDI device plugged in leaves the screen's minichord playing", w.eval("vmOn()") && mc.out && mc.out.id==="virtual");
  // then the minichord
  ins.set("in1", {id:"in1", name:"minichord Port 1"});
  outs.set("out1", {id:"out1", name:"minichord Port 1", send(m){ sent.push([...m]); }});
  mc._ports(); await sleep(80);
  check("the minichord plugged in: the screen's steps aside", !w.eval("vmOn()") && mc.virtual===false && !d.getElementById("tdeck"), mc.virtual);
  check("and the real one is the Lab's to write to", mc.out && mc.out.id==="out1" && mc.sysex===true && !Object.prototype.hasOwnProperty.call(mc, "writeParam"));
  check("asked for its settings", sent.some(m=>m.join()==="240,0,0,0,0,247"), JSON.stringify(sent));
  const n=sent.length; w.eval("mc.writeParam(31, 1)");
  check("a setting written goes to the minichord", sent.length>n, JSON.stringify(sent.slice(n)));
  // the minichord's chords are heard
  w.eval("window.__heard=0; mc.addEventListener('voices', ()=>window.__heard++)");
  ins.get("in1").onmidimessage({data:[0x90,60,100]}); await sleep(60);
  check("its notes are heard", w.eval("window.__heard")>0 && mc.notes.size>0);
  t.done();
})();
