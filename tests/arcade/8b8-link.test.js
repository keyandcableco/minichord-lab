// The 8b8 Link page (8b8/): a stand-in minichord on two ports, with the test firmware's settings, push
// and pop, and its knobs; and a stand-in 8b8, first as the emulator's core (its serial protocol and
// MIDI queue) and then as the board, over Web Serial with its own MIDI port. Checks what reaches each.
const fs=require("fs"), path=require("path");
const {JSDOM}=require("jsdom");
const ROOT=path.resolve(__dirname,"../..");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
function check(name, ok, detail=""){ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); }
process.on("unhandledRejection", e=>{ console.log("  ✗ error:", e && (e.stack||e.message)); process.exit(1); });

function load(){
  const html=fs.readFileSync(path.join(ROOT,"8b8/index.html"),"utf8");
  const body=html.slice(html.indexOf("<body>")+6, html.indexOf('<script type="module"'));
  const dom=new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {runScripts:"dangerously", pretendToBeVisual:true, url:"http://localhost/8b8/"});
  const w=dom.window;
  for(const k of ["ReadableStream","WritableStream","TextDecoderStream","TextEncoder"]) w[k]=globalThis[k];
  w.HTMLCanvasElement.prototype.getContext=()=>null;   // no canvas here: the lines simply aren't drawn
  const errors=[]; w.addEventListener("error", e=>errors.push(e.message));
  // each module as a script putting its exports on window, as the browser would link them
  const wrap=f=>{ const raw=fs.readFileSync(path.join(ROOT,f),"utf8");
    const names=[...raw.matchAll(/^export (?:async )?(?:class|function|const|let) ([A-Za-z_$][\w$]*)/mg)].map(m=>m[1]);
    return "(function(){"+raw.replace(/^import [\s\S]*?;$/mg,"").replace(/^export \{[^}]*\};$/mg,"").replace(/^export (default )?/mg,"")+"\n"+names.map(n=>`window.${n}=${n};`).join("")+"})();"; };
  w.eval(["core/minichord.js","core/temperaments.js","8b8/params.js","8b8/link.js","8b8/page.js"].map(wrap).join("\n"));
  if(errors.length) throw new Error(errors[0]);
  return w;
}

// ---------- a minichord on two ports, answering as the test firmware does ----------
function minichord(w, extra={}){
  const P=new Array(256).fill(0);
  Object.assign(P, {1:2, 2:80, 3:80, 7:21, 35:0, 97:150, 197:100, 109:4400, 187:96, 237:0, 110:0, 238:0}, extra);
  let held=null; const sent=[], writes=[];
  const port=(id,name)=>({id, name, type:"input", onmidimessage:null, ls:[], addEventListener(t,f){ this.ls.push(f); },
    emit(d){ const e={data:Uint8Array.from(d)}; this.onmidimessage && this.onmidimessage(e); this.ls.forEach(f=>f(e)); }});
  const p1=port("in1","minichord Port 1"), p2=port("in2","minichord Port 2");
  const dump=()=>setTimeout(()=>p1.emit([0xF0, ...P.flatMap(v=>[v&127, (v>>7)&127]), 0xF7]), 3);
  const out={id:"out1", name:"minichord Port 1", send(m){
    sent.push([...m]);
    if(m[0]!==0xF0) return;
    const a=m[1]+128*m[2], v=m[3]+128*m[4];
    if(a!==0){ P[a]=v; writes.push([a,v]); return; }
    if(m[3]===0) dump();
    if(m[3]===5 && !held) held=[...P];
    if(m[3]===6 && held){ for(let i=0;i<256;i++) if(i!==7) P[i]=held[i]; held=null; dump(); }
  }};
  const leo={id:"leo", name:"Arduino Leonardo", got:[], send(m,at){ this.got.push([...m]); }};
  w.mc.midi={inputs:new Map([["in1",p1],["in2",p2]]), outputs:new Map([["out1",out],["leo",leo]]), onstatechange:null};
  w.mc.sysex=true; w.mc._ports();
  return {P, p1, p2, sent, writes, leo, dump,
    /** a preset loaded on the instrument: its settings, reported unasked */
    loadPreset(bank, more={}){ P[1]=bank; Object.assign(P, more, {110:0, 238:0, 41:P[41]+1, 42:P[42]+1, 43:P[43]+1}); dump(); }};
}

// ---------- the 8b8 as its emulator core ----------
function emulator(w, {pins=true}={}){
  const lines=[], midi=[], replies=[];
  const params=w.SOUNDS_8B8.Init.slice(), pinned=new Map();
  w.AudioContext=class{ constructor(){ this.sampleRate=48000; this.destination={}; }
    createScriptProcessor(){ return {connect(){}, disconnect(){}}; } resume(){ return Promise.resolve(); } close(){} };
  w.Module={HEAPF32:new Float32Array(4096), _malloc:()=>0, ccall(f, r, types, args){
    if(f==="emu_send_line"){ const l=args[0]; lines.push(l);
      if(l==="DUMP") replies.push("LAYOUT:98,57", "PRESET:"+params.join(","));
      else if(/^P:\d+:\d+$/.test(l)){ const [,i,v]=l.split(":").map(Number); params[i]=v; replies.push(`V:${i}:${v}`); }
      else if(l.startsWith("LOAD:")){ l.slice(5).split(",").forEach((v,i)=>params[i]=+v); replies.push("PRESET:"+params.join(",")); }
      else if(l.startsWith("PCT:")) replies.push("PCT:"+(l==="PCT:off"?0:1));
      // a firmware with pinned voices answers with the mask of them; one without says nothing
      else if(pins && l==="PIN:off"){ pinned.clear(); replies.push("PIN:0"); }
      else if(pins && l.startsWith("PIN:")){ const [ch,v]=l.slice(4).split(":").map(Number); for(const [c,x] of pinned) if(x===v) pinned.delete(c);
        if(v<9) pinned.set(ch,v); else pinned.delete(ch); replies.push("PIN:"+[...pinned.values()].reduce((m,x)=>m|1<<x,0)); }
      else if(l==="DIAG") replies.push("RAM:-1:-1", "DIAG "+Array.from({length:9},(_,v)=>`${v}:c${v%3}/${v===0?"n43":v===5?"perc":"free"}/${v===0?"S":"-"}/0`).join(" ")+" ");
    }
    else if(f==="emu_midi_raw") midi.push(args.slice());
    else if(f==="emu_read_lines"){ const s=replies.join("\n"); replies.length=0; return s; }
  }};
  return {lines, midi, params, pinned, last:re=>[...lines].reverse().find(l=>re.test(l))};
}

(async()=>{
  // ---- the pieces on their own ----
  {
    const w=load();
    const c=w.tuningCents(4, 442, false), z=w.tuningCents(4, 442, true);
    check("over plain MIDI the 8b8 is sent the temperament and the A", c[0]===12+8 && c[9]===0+8, c.join(","));
    check("with bends it is sent only the A, the bends carrying the temperament", z.every(x=>x===8), z.join(","));
    check("19, 24 and 31 are flagged as out of reach without bends", !w.tuningReaches(12,false) && w.tuningReaches(12,true) && w.tuningReaches(4,false));
    check("the arpeggio shape follows the chord, inversions too", w.arpFor([57,60,64])===2 && w.arpFor([52,55,60])===1 && w.arpFor([47,50,53])===5 && w.arpFor([48,50,55])===3);
    check("a knob covers a setting's whole range", w.knobValue(w.PARAM.warp_rate,0)===1 && w.knobValue(w.PARAM.warp_rate,1)===120);
    // lanes: sixteen voices for fourteen lanes, the oldest handed on with its note let go
    const r=new w.Router(); r.mpe=true; const outs=[];
    for(let c=1;c<=4;c++) outs.push(...r.route("chord",[0x90|c,60+c,90]));
    for(let c=1;c<=12;c++) outs.push(...r.route("harp",[0x90|c,72+c,90]));
    const lanes=outs.filter(m=>(m[0]&0xF0)===0x90).map(m=>m[0]&15);
    check("each MPE voice gets a lane of its own, never the master or the drums", new Set(lanes.slice(0,14)).size===14 && !lanes.includes(0) && !lanes.includes(9), lanes.join(" "));
    check("when the lanes run out the oldest is let go before it's reused", outs.some(m=>m[0]===0x81 && m[1]===61));
    const off=r.route("chord",[0x84,64,20]);
    check("a note-off finds its own lane", off.length===1 && off[0][0]===0x84 && off[0][1]===64, JSON.stringify(off));
    check("and one whose lane was handed on sends nothing, its note let go already", r.route("chord",[0x81,61,20]).length===0);
    check("the minichord's controllers stay home (the 8b8 maps 70 to 119 onto its settings)", r.route("chord",[0xB1,74,64]).length===0 && r.route("chord",[0xB0,22,64]).length===0);
    // the clock, run on a stand-in time
    let now=0; const ticks=[], steps=[];
    const k=new w.Clock({now:()=>now, tick:(t,at)=>ticks.push([t,at]), step:(i,at)=>steps.push([i,at]), every:1e9});
    k.setTempo(120); k.start(); now=1000; k._pump(); k.stop();
    const clocks=ticks.filter(t=>t[0]==="clock");
    check("the clock starts, then 24 pulses a beat", ticks[0][0]==="start" && Math.abs(clocks[24][1]-clocks[0][1]-500)<1e-6, `${clocks.length} pulses in 1.1 s at 120`);
    check("a sixteenth every six pulses, on the pulse", steps.length && steps[1][1]===clocks[6][1] && steps[4][0]===4);
    check("and it stops with a Stop", ticks[ticks.length-1][0]==="stop");
  }

  // ---- the emulator ----
  {
    const w=load(), d=w.document;
    const mini=minichord(w, {237:4, 109:4420});
    await sleep(60);
    const emu=emulator(w);
    d.getElementById("emu").click(); await sleep(1100);   // the 8b8 answers, and the probe for push and pop runs
    check("the page asks the 8b8 for its settings, and reads them", emu.lines[0]==="DUMP" && w.eb.known, w.eb.layout);
    check("the minichord is pushed before anything is borrowed", mini.sent.filter(m=>m[0]===0xF0 && m[1]===0 && m[3]===5).length>=2);
    check("its MPE output and knobs are borrowed", mini.P[110]===1 && mini.P[238]===1, mini.writes.map(x=>x.join("=")).join(" "));
    check("the 8b8 is told it's getting MPE", emu.last(/^MPE:/)==="MPE:1");
    check("and is tuned: with bends, only the minichord's A (442)", emu.last(/^PCT:/)==="PCT:"+Array(12).fill(8).join(","), emu.last(/^PCT:/));
    emu.midi.length=0;
    // a chord with its bends, and two strings, all numbered from channel 2 on their ports
    [[1,57],[2,60],[3,64]].forEach(([c,n])=>{ mini.p1.emit([0xE0|c,0,66]); mini.p1.emit([0x90|c,n,100]); });
    mini.p2.emit([0xE0|1,0,64]); mini.p2.emit([0x91,69,90]); mini.p2.emit([0x92,72,90]);
    const ons=emu.midi.filter(m=>(m[0]&0xF0)===0x90), lanes=ons.map(m=>m[0]&15);
    check("chord and harp voices reach the 8b8 on lanes of their own", ons.length===5 && new Set(lanes).size===5, lanes.join(" "));
    const bendLane=emu.midi.find(m=>(m[0]&0xF0)===0xE0)[0]&15;
    check("each bend goes to its voice's lane, ahead of the note", bendLane===lanes[0]);
    // the knobs
    d.getElementById("knob2").value=String(w.PARAM.warp_rate); d.getElementById("knob2").dispatchEvent(new w.Event("change"));
    mini.p1.emit([0xB0,22,127]);
    check("the modulation knob turns the 8b8 setting it's given", emu.last(/^P:/)===`P:${w.PARAM.warp_rate}:120`, emu.last(/^P:/));
    // the arpeggio follows the chord (A minor just played)
    d.getElementById("arpFollow").checked=true; d.getElementById("arpFollow").dispatchEvent(new w.Event("change"));
    [[1,57],[2,60],[3,64]].forEach(([c,n])=>mini.p1.emit([0x80|c,n,20])); await sleep(120);
    [[1,59],[2,62],[3,65]].forEach(([c,n])=>mini.p1.emit([0x90|c,n,100])); await sleep(250);
    check("with the arpeggio following, a B diminished chord sets it to Dim", emu.last(/^P:40:/)==="P:40:5", emu.last(/^P:40:/));
    // without exact tuning, the temperament goes to the 8b8 instead
    d.getElementById("exact").checked=false; d.getElementById("exact").dispatchEvent(new w.Event("change")); await sleep(50);
    check("without exact tuning MPE is given back", mini.P[110]===0 && emu.last(/^MPE:/)==="MPE:0");
    check("and the 8b8 plays Werckmeister III itself, plus the A", emu.last(/^PCT:/)==="PCT:20,10,12,14,10,18,8,16,12,8,16,12", emu.last(/^PCT:/));
    // the harp on drums: without MPE, the note's letter picks the drum
    d.getElementById("harpMode").value="drums"; d.getElementById("harpMode").dispatchEvent(new w.Event("change"));
    emu.midi.length=0; mini.p2.emit([0x90,62,90]);
    check("the harp plays the 8b8's kit on channel 10", emu.midi.length===1 && emu.midi[0][0]===0x99 && emu.midi[0][1]===w.KIT[2][0], JSON.stringify(emu.midi));
    // a sound kept with the preset comes back when the preset does
    const sel=d.getElementById("sound"); sel.value="Arcade Warp"; sel.dispatchEvent(new w.Event("change")); await sleep(120);
    d.getElementById("keep").click();
    sel.value="Init"; sel.dispatchEvent(new w.Event("change")); await sleep(120);
    mini.loadPreset(5); await sleep(150);
    check("a preset loaded on the instrument puts back what the page borrowed", mini.P[238]===1, `knobs ${mini.P[238]}`);
    emu.lines.length=0; mini.loadPreset(2); await sleep(150);
    check("and loading the preset the sound was kept with loads it on the 8b8", (emu.last(/^LOAD:/)||"")==="LOAD:"+w.SOUNDS_8B8["Arcade Warp"].join(","));
    // the clock reaches the minichord
    d.getElementById("play").click(); await sleep(300); d.getElementById("play").click();
    const rt=mini.sent.filter(m=>m.length===1).map(m=>m[0]);
    check("Play sends the minichord Start and clock, Stop a Stop", rt[0]===0xFA && rt.filter(b=>b===0xF8).length>10 && rt[rt.length-1]===0xFC, `${rt.length} messages`);
    // giving back
    mini.P[41]=99; mini.writes.length=0;
    d.getElementById("giveback").click(); await sleep(60);
    check("giving back is one pop for the minichord, putting back even what the page never touched", mini.writes.length===0 && mini.P[238]===0 && mini.P[41]!==99);
    check("and the 8b8's own tuning comes back", emu.last(/^PCT:/)==="PCT:off" && emu.last(/^MPE:/)==="MPE:0");
  }

  // ---- the chord voices, latched to voices of their own ----
  {
    const w=load(), d=w.document;
    const mini=minichord(w, {111:0});
    await sleep(60);
    const emu=emulator(w);
    d.getElementById("emu").click(); await sleep(1100);
    const ch=(id,v)=>{ const el=d.getElementById(id); if(el.type==="checkbox") el.checked=v; else el.value=String(v); el.dispatchEvent(new w.Event("change")); };
    ch("pinOn", true); await sleep(100);
    check("latching pins the four chord channels to their voices, with legato", ["PIN:1:0:255:1","PIN:2:1:255:1","PIN:3:2:255:1","PIN:4:3:255:1"].every(l=>emu.lines.includes(l)), emu.lines.filter(l=>l.startsWith("PIN")).join(" "));
    check("and turns the minichord's voice leading on, so its voices come bottom to top", mini.P[111]===1);
    const rowName=i=>d.getElementById("pins").tBodies[0].rows[i].cells[0].textContent;
    check("the voices are named bass to soprano once they're led", rowName(0)==="Bass" && rowName(3)==="Soprano", rowName(0));
    emu.midi.length=0;
    [[1,43],[2,55],[3,59],[4,62]].forEach(([c,n])=>{ mini.p1.emit([0xE0|c,0,64]); mini.p1.emit([0x90|c,n,100]); });
    mini.p2.emit([0x91,67,90]);
    const ons=emu.midi.filter(m=>(m[0]&0xF0)===0x90);
    check("each chord voice plays on its own channel, 1 to 4", ons.slice(0,4).map(m=>m[0]&15).join()==="1,2,3,4", JSON.stringify(ons));
    check("and the harp keeps clear of them", (ons[4][0]&15)>4, `channel ${ons[4][0]&15}`);
    // a voice left out, and the bass down an octave
    const row=i=>d.getElementById("pins").tBodies[0].rows[i].querySelectorAll("input,select");
    row(2)[0].checked=false; row(2)[0].dispatchEvent(new w.Event("change"));
    row(0)[4].value="-1"; row(0)[4].dispatchEvent(new w.Event("change")); await sleep(30);
    [[1,43],[3,59]].forEach(([c,n])=>mini.p1.emit([0x80|c,n,20]));
    emu.midi.length=0;
    mini.p1.emit([0x91,45,100]); mini.p1.emit([0x93,60,100]);
    check("a voice can be left out, and the bass moved down an octave", emu.midi.length===1 && emu.midi[0][0]===0x91 && emu.midi[0][1]===33, JSON.stringify(emu.midi));
    mini.p1.emit([0x81,45,20]);
    check("its note-off follows it down", emu.midi.some(m=>m[0]===0x81 && m[1]===33));
    // giving a line another line's voice swaps the two
    emu.lines.length=0;
    row(1)[1].value="0"; row(1)[1].dispatchEvent(new w.Event("change")); await sleep(30);
    check("choosing another line's 8b8 voice swaps them", emu.lines.includes("PIN:1:1:255:1") && emu.lines.includes("PIN:2:0:255:1"), emu.lines.filter(l=>l.startsWith("PIN")).join(" "));
    // the voice map
    await sleep(500);
    const cells=[...d.getElementById("chips").children].map(c=>c.textContent);
    check("the nine voices are shown as the 8b8 reports them, latched ones named", /Tenor/.test(cells[0]) && /G2/.test(cells[0]) && /drum/.test(cells[5]), cells.join(" | "));
    // the minichord's voicing, from the page
    ch("cantus", 4); await sleep(30);
    check("the cantus can be set from here", mini.P[115]===4);
    d.getElementById("giveback").click(); await sleep(60);
    check("giving back frees the 8b8's voices and the minichord's voicing", emu.last(/^PIN/)==="PIN:off" && mini.P[115]===0 && mini.P[111]===0);
  }
  {
    // an 8b8 whose firmware has no PIN yet
    const w=load(), d=w.document;
    minichord(w); await sleep(60);
    const emu=emulator(w, {pins:false});
    d.getElementById("emu").click(); await sleep(1100);
    d.getElementById("pinOn").checked=true; d.getElementById("pinOn").dispatchEvent(new w.Event("change"));
    await sleep(1700);
    check("an 8b8 without pinned voices says so, and the chord voices share lanes as before", !d.getElementById("pinWarn").hidden && /feature\/pinned-voices/.test(d.getElementById("pinWarn").textContent) && !w.router.pinned);
  }

  // ---- the board, over USB: settings by serial, notes to its MIDI port ----
  {
    const w=load(), d=w.document;
    const mini=minichord(w, {237:2});
    await sleep(60);
    const lines=[]; let push;
    const readable=new w.ReadableStream({start(c){ push=t=>c.enqueue(t); }});
    const writable=new w.WritableStream({write(chunk){ const t=new TextDecoder().decode(chunk).trim(); lines.push(t);
      if(t==="DUMP") push(new TextEncoder().encode("LAYOUT:98,57\r\nPRESET:"+w.SOUNDS_8B8.Init.join(",")+"\r\n")); }});
    w.navigator.serial={requestPort:async()=>({open:async()=>{}, readable, writable, close:async()=>{}})};
    d.getElementById("usb").click(); await sleep(1100);
    check("over USB the 8b8's own MIDI port is found for the notes", d.getElementById("out").value==="leo" && !d.getElementById("outRow").hidden);
    check("its settings go over serial", lines[0]==="DUMP" && lines.includes("MPE:1") && lines.some(l=>l.startsWith("PCT:")), lines.slice(0,5).join(" | "));
    mini.p1.emit([0xE1,0,66]); mini.p1.emit([0x91,60,100]);
    const got=mini.leo.got;
    check("the notes and their bends go to the 8b8's MIDI port", got.some(m=>(m[0]&0xF0)===0xE0) && got.some(m=>(m[0]&0xF0)===0x90 && m[1]===60), JSON.stringify(got));
    // no MIDI port: notes as text, and the tuning can't arrive by bends
    d.getElementById("out").value=""; d.getElementById("out").dispatchEvent(new w.Event("change"));
    await sleep(50);
    mini.p1.emit([0x92,64,100]);
    check("over serial alone, notes go as NON lines", lines.some(l=>/^NON:\d+:64:100$/.test(l)));
    check("and the 8b8 is tuned by letter instead, just intonation from the minichord", lines.filter(l=>l.startsWith("PCT:")).pop()==="PCT:"+w.TEMPERAMENT_TABLE[2].cents.join(","), lines.filter(l=>l.startsWith("PCT:")).pop());
    check("with a warning that glide is lost", !d.getElementById("tuneWarn").hidden);
  }

  const bad=results.filter(r=>!r).length;
  console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
