// The 8b8 Link page (8b8/index.html): the minichord on one side, the 8b8 on the other, and the
// controls between. What goes across, and why each thing goes the way it does, is in link.js.
import {Minichord} from "../core/minichord.js";
import {TEMPERAMENT_TABLE} from "../core/temperaments.js";
import {PARAMS_8B8, LAYOUT_8B8, SOUNDS_8B8, PARAM, KIT, DRUM_CH, DRUM_ROWS, Router, EightBit, Clock,
  tuningCents, tuningReaches, knobValue, arpFor, ENVELOPES, AY_VOICES, DEFAULT_PINS} from "./link.js";

const $=id=>document.getElementById(id);
const mc=new Minichord(); window.mc=mc;
const eb=new EightBit(); window.eb=eb;
const router=new Router(); window.router=router;
const NAMES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
const KNOB_NAMES=["Chord knob","Harp knob","Modulation knob"];

// ---------- remembered between visits ----------
const st={chord:true, harp:"voice", exact:true, silence:false, arp:false, knobs:["","",""], clockMini:true, bpm:null,
  pattern:DRUM_ROWS.map((_,r)=>Array.from({length:16},(_,i)=> r===0 ? i%8===0 : r===1 ? i%8===4 : r===2 ? i%2===0 : false)),
  banks:{}, pin:false, voices:DEFAULT_PINS.map(v=>({voice:v, env:null, legato:true, on:true, oct:0}))};
try{ Object.assign(st, JSON.parse(localStorage.getItem("lab-8b8")||"{}")); }catch(e){}
const save=()=>{ try{ localStorage.setItem("lab-8b8", JSON.stringify(st)); }catch(e){} };

// ---------- the log: what the 8b8 says, and what the page sends it ----------
const logLines=[];
function log(s){ logLines.push(s); if(logLines.length>60) logLines.shift(); const el=$("log"); el.textContent=logLines.join("\n"); el.scrollTop=el.scrollHeight; }
eb.addEventListener("line", e=>{ if(!/^(V:|DIAG |RAM:|Received )/.test(e.detail)) log("« "+e.detail); });

// ---------- lights ----------
const lit={};
function flash(id){ const el=$(id); el.classList.add("lit"); clearTimeout(lit[id]); lit[id]=setTimeout(()=>el.classList.remove("lit"),120); }

// ---------- transports: how the page reaches the 8b8 ----------
// The board: settings over its serial port, notes to its USB MIDI port, chosen below. Without a MIDI
// port the notes go over serial too, as NON and NOF lines, which carry no bend.
let serial=null, midiOut=null, via=null, outChoice=null;   // outChoice: the port picked by hand, if one was   // via: "usb" or "emu"
async function openSerial(){
  const port=await navigator.serial.requestPort();
  await port.open({baudRate:115200});
  const enc=new TextEncoder(), writer=port.writable.getWriter();
  const t={
    line(s){ writer.write(enc.encode(s+"\n")).catch(()=>{}); if(!/^(NON|NOF):/.test(s)) log("» "+s); },
    midi(b, at){
      if(midiOut){ try{ midiOut.send(b, at); }catch(e){} return; }
      const go=()=>{ const type=b[0]&0xF0, ch=b[0]&15;
        if(type===0x90 && b[2]>0) t.line(`NON:${ch}:${b[1]}:${b[2]}`);
        else if(type===0x80 || type===0x90) t.line(`NOF:${ch}:${b[1]}`); };
      const d=at ? at-performance.now() : 0; d>2 ? setTimeout(go,d) : go();
    },
    receive:null,
    async close(){ try{ reader && await reader.cancel(); }catch(e){} try{ writer.releaseLock(); await port.close(); }catch(e){} },
  };
  let reader=null;
  (async()=>{
    const dec=port.readable.pipeThrough(new TextDecoderStream()); reader=dec.getReader(); let buf="";
    try{ for(;;){ const {value, done}=await reader.read(); if(done) break;
      buf+=value; const lines=buf.split(/\r?\n/); buf=lines.pop(); for(const l of lines) t.receive && t.receive(l); } }
    catch(e){ /* unplugged */ }
    if(serial===t) lost("The 8b8 went away. Plug it back in and connect again.");
  })();
  return t;
}
// The emulator: the 8b8's own firmware compiled for the browser, from its site, into a Web Audio
// node here: 8b8.keyandcable.com, or its GitHub Pages address if that doesn't answer. ?core=<url>
// loads it from elsewhere (a local build, say).
const CORES=[new URLSearchParams(location.search).get("core")].filter(Boolean).concat(["https://8b8.keyandcable.com/", "https://keyandcableco.github.io/8bit8asterd/"]);
let audio=null;
function loadCore(i=0){
  if(window.Module && window.Module.ccall) return Promise.resolve(window.Module);
  const base=CORES[i];
  if(!base) return Promise.reject(new Error("couldn't load the emulator from "+CORES.join(" or ")));
  return new Promise((ok, fail)=>{
    window.Module={locateFile:f=>new URL(f, base).href, onRuntimeInitialized:()=>ok(window.Module)};
    const s=document.createElement("script"); s.src=new URL("8b8.js", base).href;
    s.onerror=()=>{ s.remove(); loadCore(i+1).then(ok, fail); };
    document.head.appendChild(s);
  });
}
async function openEmulator(){
  const ctx=new (window.AudioContext||window.webkitAudioContext)();   // made in the click, so it's allowed to sound
  const M=await loadCore();
  const N=1024, call=(f,r,a,v)=>M.ccall(f,r,a,v);
  call("emu_init", null, ["number"], [ctx.sampleRate]);
  const ptr=M._malloc(N*4);
  const node=ctx.createScriptProcessor(N,1,1);   // one input: Safari never runs one with none
  node.onaudioprocess=e=>{ const out=e.outputBuffer.getChannelData(0);
    call("emu_render", null, ["number","number"], [ptr, out.length]); out.set(M.HEAPF32.subarray(ptr>>2, (ptr>>2)+out.length)); };
  node.connect(ctx.destination); ctx.resume();
  const t={
    line(s){ call("emu_send_line", null, ["string"], [s]); log("» "+s); },
    // the emulator reads its queue as it renders, a buffer at a time; a time ahead waits for it
    midi(b, at){ const go=()=>call("emu_midi_raw", null, ["number","number","number"], [b[0], b[1]||0, b[2]||0]);
      const d=at ? at-performance.now() : 0; d>2 ? setTimeout(go,d) : go(); },
    receive:null,
    close(){ clearInterval(poll); node.disconnect(); ctx.close(); audio=null; },
  };
  const poll=setInterval(()=>{ const s=call("emu_read_lines","string",[],[]); if(s) for(const l of s.split("\n")) if(l) t.receive && t.receive(l); }, 60);
  audio=ctx;
  return t;
}

async function connect8b8(kind){
  $("usb").disabled=$("emu").disabled=true;
  try{
    if(serial){ giveBack8b8(); const old=serial; serial=null; via=null; await old.close(); }
    if(kind==="usb"){
      if(!navigator.serial) throw new Error("this browser has no Web Serial: use Chrome or Edge on a computer");
      if(!mc.midi) await mc.connect();      // the 8b8's MIDI port is found the same way as the minichord's
      serial=await openSerial(); via="usb"; pickOut();
    } else { serial=await openEmulator(); via="emu"; midiOut=null; $("outRow").hidden=true; }
    given=false; eb.attach(serial, kind==="usb" ? "the board" : "the emulator");
    $("ebStatus").textContent = kind==="usb" ? "Connected over USB. Asking it for its settings…" : "The emulator is running. Asking it for its settings…";
  }catch(e){
    $("ebStatus").textContent="Couldn't connect: "+(e && e.message || e)+".";
    serial=null; via=null;
  }
  $("usb").disabled=$("emu").disabled=false;
  update8b8();
}
$("usb").onclick=()=>connect8b8("usb");
$("emu").onclick=()=>connect8b8("emu");
function lost(text){ serial=null; via=null; eb.detach(); giveBackMinichord(); $("ebStatus").textContent=text; update8b8(); }

// The 8b8's MIDI port: whichever output isn't the minichord, an Arduino's first. "Over serial"
// plays the notes as text instead: no bends, so glide and MPE tuning are lost.
function pickOut(){
  const sel=$("out"), outs=mc.midi ? [...mc.midi.outputs.values()].filter(o=>!/minichord/i.test(o.name)) : [];
  sel.innerHTML="";
  outs.forEach(o=>sel.add(new Option(o.name, o.id)));
  sel.add(new Option("Over serial (no bends)", ""));
  const guess=outs.find(o=>/leonardo|arduino|8b8|8bit|bastard|8asterd/i.test(o.name));
  sel.value = outChoice!=null && [...sel.options].some(o=>o.value===outChoice) ? outChoice : guess ? guess.id : outs.length===1 ? outs[0].id : "";
  midiOut = sel.value ? outs.find(o=>o.id===sel.value) : null;
  $("outRow").hidden=via!=="usb";
}
$("out").onchange=e=>{ releaseAll(); outChoice=e.target.value; pickOut(); follow(); update8b8(); };
mc.addEventListener("ports", ()=>{ tap(); if(via==="usb") pickOut(); });

// ---------- the minichord's own messages, as they arrive ----------
// Listened to beside the Minichord class's own handler (which reads chords, knobs and settings),
// on both its ports: the harp port carries the strings, and the chord port the chords (and, in
// single port mode, the strings too, on their own channels).
const tapped=new WeakSet();
function tap(){
  for(const i of mc.inputs){
    if(tapped.has(i) || !/minichord/i.test(i.name)) continue;
    tapped.add(i);
    const harpPort=i.name.includes("2");
    i.addEventListener("midimessage", e=>fromMinichord(e.data, harpPort));
  }
}
/** one message from the minichord, sent on to the 8b8 if it plays there */
function fromMinichord(data, harpPort){
  if(!eb.connected || data[0]>=0xF0) return;
  const ch=data[0]&15;
  const section = harpPort ? "harp" : mc._chordChannel(ch) ? "chord" : "harp";
  // under MPE each string has a channel: from 2 on its own port, from 6 when it shares the chord's
  const string = section==="harp" && mc.mpe ? (harpPort ? ch-1 : ch-5) : null;
  const msgs=router.route(section, data, string);
  for(const m of msgs) eb.midi(m);
  if(msgs.some(m=>(m[0]&0xF0)===0x90)) flash(section==="harp" ? (router.harp==="drums" ? "litDrum" : "litHarp") : "litChord");
}
window.fromMinichord=fromMinichord;
function releaseAll(){ for(const m of router.releaseAll()) eb.midi(m); }

$("test").onclick=()=>{
  const lane=router.mpe ? 1 : 0;
  [48,60,64,67].forEach((n,i)=>{ eb.midi([0x90|lane+(router.mpe?i:0), n, 100]); setTimeout(()=>eb.midi([0x80|lane+(router.mpe?i:0), n, 0]), 900); });
  flash("litChord");
};

// ---------- borrowing the minichord's settings, and giving them back ----------
// Where the firmware has push and pop, the minichord remembers itself before anything changes and
// one message puts it all back; where it hasn't, each setting borrowed is written back by hand.
const borrowed={};     // address -> the minichord's own value
let given=false;      // the Give everything back button pressed: nothing taken again until something here changes
let pushHeld=false, probing=false;
function wanted(){
  const w={238:1};                                     // the knobs, sent as they turn
  if(st.exact) w[110]=1;                               // MPE: a channel and a bend per voice
  if(st.silence){ w[97]=0; w[197]=0; }                 // the harp's and chord's output amplifiers
  // Latched chord voices want voice leading, which is what puts the minichord's four voices bottom to
  // top and keeps each on its line; on unless it already is, or the voicing below chooses otherwise.
  const vlOwn = 111 in borrowed ? borrowed[111] : mc.params[111];
  if(st.pin && !vlOwn) w[111]=1;
  for(const [a,v] of Object.entries(voicing)) w[a]=v;  // chosen here, for this visit
  return w;
}
function borrowAll(){
  if(given || !eb.connected || !mc.out || !mc.sysex || mc.params[35]===undefined || probing) return;
  if(mc.pushPop===undefined){ probing=true; mc.probePushPop().then(ok=>{ probing=false; pushHeld=ok; borrowAll(); }); return; }
  if(mc.pushPop && !pushHeld){ mc.control(5); pushHeld=true; }
  const w=wanted();
  for(const [a,v] of Object.entries(w)) if(mc.params[a]!==v){ if(!(a in borrowed)) borrowed[a]=mc.params[a]??0; mc.writeParam(+a, v); }
  // a setting no longer wanted goes back on its own
  for(const a of Object.keys(borrowed)) if(!(a in w)){ mc.writeParam(+a, borrowed[a]); delete borrowed[a]; }
  $("giveback").hidden=!Object.keys(borrowed).length && !eb.connected;
}
function giveBackMinichord(){
  if(!Object.keys(borrowed).length && !pushHeld) return;
  if(pushHeld && mc.out){ mc._asked=(mc._asked||0)+1; mc.control(6); pushHeld=false; }
  else for(const [a,v] of Object.entries(borrowed)) mc.writeParam(+a, v);
  for(const a of Object.keys(borrowed)) delete borrowed[a];
}
// the 8b8 back to its own tuning and channels; the sound loaded stays, as a sound chosen on its panel would
function giveBack8b8(){
  if(!eb.connected) return;
  releaseAll(); if(sentPins){ eb.unpin(); sentPins=""; } router.pinned=false;
  eb.tune(null); eb.mpe(false); sentTune=""; sentMpe=null;
}
function giveBackAll(){ clock.stop(); giveBack8b8(); giveBackMinichord(); given=true; $("giveback").hidden=true;
  $("status").textContent="Everything is back as it was: the minichord's settings and the 8b8's tuning. Change anything here to take them again."; }
$("giveback").onclick=giveBackAll;
addEventListener("pagehide", ()=>{ clock.stop(); giveBack8b8(); giveBackMinichord(); });
function take(){ given=false; borrowAll(); follow(); }

// ---------- following the minichord ----------
let sentTune="", sentMpe=null, lastBank=null, lastDump=null;
function follow(){
  if(!eb.connected || given) return;
  const bends=mc.mpe && (via==="emu" || !!midiOut);    // bends only reach the 8b8 by MIDI
  if(sentMpe!==mc.mpe){ releaseAll(); router.mpe=mc.mpe; eb.mpe(mc.mpe); sentMpe=mc.mpe; }
  const t=mc.temperament ?? 0, cents=tuningCents(t, mc.aHz, bends), line=cents.join(",");
  if(line!==sentTune){ eb.tune(cents); sentTune=line; }
  drawTuning(t, cents, bends);
  applyPins();
}
function drawTuning(t, cents, bends){
  const T=TEMPERAMENT_TABLE[t]||TEMPERAMENT_TABLE[0];
  $("tuneText").innerHTML=`The minichord is in <b>${T.label}</b> with A at ${mc.aHz.toFixed(1)} Hz. `+
    (bends ? "Each note brings its own bend, so the 8b8 adds only the A." : T.division===12 ? "The 8b8 tunes each note by its letter." : "");
  $("cents").innerHTML=cents.map((c,i)=>{ const h=Math.min(22, Math.abs(c)*22/40);
    return `<div><i><b style="${c>=0?`bottom:22px;height:${h}px`:`top:22px;height:${h}px`}"></b></i>${NAMES[i]}<br>${c>0?"+":""}${c}</div>`; }).join("");
  $("tuneLine").textContent="PCT:"+cents.join(",");
  const warn=$("tuneWarn");
  if(!tuningReaches(t, bends)){ warn.hidden=false; warn.textContent=`${T.label} needs exact tuning: over plain MIDI the minichord rounds its notes to the nearest of twelve.`+(mc.mpe && !bends ? " Choose the 8b8's MIDI port for its bends to arrive." : ""); }
  else if(mc.mpe && !bends){ warn.hidden=false; warn.textContent="Notes are going over serial, which carries no bends: glide is lost, and the tuning is the 8b8's best guess from each note's letter."; }
  else warn.hidden=true;
}

mc.addEventListener("device", ()=>{
  const parts=[];
  if(mc.keyName) parts.push(`Key of <b>${mc.keyName}</b>`);
  if(mc.temperament!=null) parts.push(`<b>${TEMPERAMENT_TABLE[mc.temperament]?.label||mc.temperament}</b>`);
  parts.push(mc.mpe ? "MPE on" : "MPE off");
  if(mc.params[1]!=null) parts.push(`preset ${mc.params[1]+1}`);
  $("device").innerHTML=parts.join(", ")+".";
  if(st.bpm==null && mc.params[187]){ $("bpm").value=mc.params[187]; clock.setTempo(mc.params[187]); }
  // a preset loaded on the instrument puts back what the page had borrowed, and may have a sound
  // (each dump once: a setting the page writes says "device" again with the last dump's news)
  const bank=mc.params[1], fresh=mc.changed!==lastDump; lastDump=mc.changed;
  if(bank!==lastBank || (fresh && mc.presetLoaded)){
    const changed=lastBank!==null; lastBank=bank;
    if(changed && !given) borrowAll();
    if(st.banks[bank] && eb.known) loadSound(st.banks[bank].values, st.banks[bank].name);
    drawBanks();
  }
  if(!given) borrowAll();
  follow();
});
mc.addEventListener("ports", ()=>{
  const sel=$("input"), ins=mc.inputs; sel.innerHTML=""; sel.disabled=false;
  sel.add(new Option("Minichord chord port (auto)","auto")); sel.add(new Option("All MIDI inputs","all"));
  ins.forEach(i=>sel.add(new Option(i.name,i.id)));
  sel.value=[...sel.options].some(o=>o.value===mc.inputChoice)?mc.inputChoice:"auto";
});
mc.addEventListener("status", e=>{ $("status").textContent=e.detail; });
$("input").onchange=e=>mc.selectInput(e.target.value);
$("connect").onclick=async e=>{ e.target.disabled=true; if(await mc.connect()) e.target.textContent="Connected"; else e.target.disabled=false; };

// ---------- the 8b8's side ----------
eb.addEventListener("preset", update8b8);
function update8b8(){
  const on=eb.connected;
  $("test").disabled=!on; $("keep").disabled=!on || !eb.known || mc.params[1]==null;
  $("sound").disabled=!on || !eb.known;
  $("giveback").hidden=!on && !Object.keys(borrowed).length;
  if(on && eb.params){
    $("ebStatus").textContent=`Connected to ${eb.name}`+(midiOut ? `, notes to ${midiOut.name}` : via==="usb" ? ", notes over serial" : "")+"."+
      (eb.known ? "" : ` It reports settings layout ${eb.layout||"?"}, and this page knows ${LAYOUT_8B8}: knobs, sounds and the arpeggio are off until the page is updated for it.`);
    if(sentMpe===null){ borrowAll(); follow(); }
  }
  drawKnobs();
}

// ---------- knobs ----------
const knobSent=[null,null,null];
function drawKnobs(){
  const box=$("knobs");
  if(!box.childElementCount){
    KNOB_NAMES.forEach((name,k)=>{
      const lab=document.createElement("label"), sel=document.createElement("select"), out=document.createElement("output");
      lab.append(name, sel, out); box.appendChild(lab);
      sel.add(new Option("Nothing",""));
      let group=null;
      PARAMS_8B8.forEach((p,i)=>{ if(!group || group.label!==p.group){ group=document.createElement("optgroup"); group.label=p.group; sel.appendChild(group); }
        group.appendChild(new Option(`${p.group} · ${p.label}`, String(i))); });
      sel.value=st.knobs[k]||""; sel.id="knob"+k;
      sel.onchange=()=>{ st.knobs[k]=sel.value; knobSent[k]=null; save(); };
    });
  }
  KNOB_NAMES.forEach((_,k)=>{ $("knob"+k).disabled=!eb.known; });
}
mc.addEventListener("knob", e=>{
  const {knob:k, value}=e.detail, idx=st.knobs[k];
  if(idx==="" || idx==null || !eb.known) return;
  const v=knobValue(+idx, value); if(v===knobSent[k]) return;
  knobSent[k]=v; eb.set(+idx, v);
  const p=PARAMS_8B8[+idx], out=$("knobs").children[k].querySelector("output");
  out.textContent = p.options ? p.options[v] : v;
});

// ---------- the arpeggio, following the chord ----------
mc.addEventListener("chord", e=>{
  if(!st.arp || !eb.known) return;
  const shape=arpFor(e.detail.map(v=>v.pitch));
  if(eb.params && eb.params[PARAM.arp_mode]===shape) return;
  eb.set(PARAM.arp_mode, shape);
});

// ---------- sounds, and the preset each is kept with ----------
Object.keys(SOUNDS_8B8).forEach(n=>$("sound").add(new Option(n,n)));
function loadSound(values, name){ eb.load(values); if(name) $("sound").value=[...$("sound").options].some(o=>o.value===name) ? name : ""; }
$("sound").onchange=e=>{ const v=SOUNDS_8B8[e.target.value]; if(v && eb.known) loadSound(v, e.target.value); };
$("keep").onclick=()=>{
  const bank=mc.params[1]; if(bank==null || !eb.params) return;
  st.banks[bank]={name:$("sound").value || "Your own", values:eb.params.slice()}; save(); drawBanks();
};
function drawBanks(){
  const tb=$("banks"); tb.innerHTML="";
  const cur=mc.params[1];
  $("keep").textContent = cur!=null ? `Keep this sound with preset ${cur+1}` : "Keep this sound with the preset";
  Object.keys(st.banks).map(Number).sort((a,b)=>a-b).forEach(b=>{
    const tr=document.createElement("tr"); if(b===cur) tr.className="cur";
    const forget=document.createElement("button"); forget.textContent="Forget";
    forget.onclick=()=>{ delete st.banks[b]; save(); drawBanks(); };
    tr.innerHTML=`<td>Preset ${b+1}</td><td>${st.banks[b].name}</td><td></td>`; tr.lastChild.appendChild(forget);
    tb.appendChild(tr);
  });
  update8b8();
}

// ---------- clock and drums ----------
const cells=[];
const clock=new Clock({
  tick:(kind, at)=>{
    if(!st.clockMini || !mc.out) return;
    const b = kind==="start" ? 0xFA : kind==="stop" ? 0xFC : 0xF8;
    try{ mc.out.send([b], at); }catch(e){}
  },
  step:(i, at)=>{
    st.pattern.forEach((row,r)=>{ if(!row[i]) return; const n=DRUM_ROWS[r][0];
      eb.midi([0x90|DRUM_CH, n, 110], at); eb.midi([0x80|DRUM_CH, n, 0], at+60); });
    setTimeout(()=>{ cells.forEach((row)=>row.forEach((c,j)=>c.classList.toggle("now", j===i))); if(st.pattern.some(r=>r[i])) flash("litDrum"); }, Math.max(0, at-performance.now()));
  },
});
window.clock=clock;
if(st.bpm) { $("bpm").value=st.bpm; clock.setTempo(st.bpm); }
$("bpm").onchange=e=>{ clock.setTempo(+e.target.value); st.bpm=clock.bpm; e.target.value=clock.bpm; save(); };
$("play").onclick=()=>{
  if(clock.running){ clock.stop(); $("play").textContent="Play"; cells.forEach(r=>r.forEach(c=>c.classList.remove("now"))); }
  else { if(given) take(); clock.start(); $("play").textContent="Stop"; }
};
$("clockMini").checked=st.clockMini;
$("clockMini").onchange=e=>{ st.clockMini=e.target.checked; save(); };
$("clear").onclick=()=>{ st.pattern=st.pattern.map(r=>r.map(()=>false)); save(); drawGrid(); };
function drawGrid(){
  const g=$("grid"); g.innerHTML=""; cells.length=0;
  DRUM_ROWS.forEach(([,name],r)=>{
    const lab=document.createElement("span"); lab.className="name"; lab.textContent=name; g.appendChild(lab);
    cells[r]=[];
    for(let i=0;i<16;i++){
      const b=document.createElement("button"); if(i%4===0) b.classList.add("beat");
      b.setAttribute("aria-label",`${name}, step ${i+1}`); b.setAttribute("aria-pressed", String(!!st.pattern[r][i]));
      b.onclick=()=>{ st.pattern[r][i]=!st.pattern[r][i]; b.setAttribute("aria-pressed", String(st.pattern[r][i])); save(); };
      g.appendChild(b); cells[r].push(b);
    }
  });
}

// ---------- the options ----------
function options(){
  router.chord=st.chord; router.harp=st.harp;
  $("drumNote").hidden=st.harp!=="drums";
}
for(const [id,key] of [["chordOn","chord"],["exact","exact"],["silence","silence"],["arpFollow","arp"]]){
  $(id).checked=!!st[key];
  $(id).onchange=e=>{ st[key]=e.target.checked; save(); if(key==="chord" && !st.chord) releaseAll(); options(); if(given) take(); else { borrowAll(); follow(); } };
}
$("harpMode").value=st.harp;
$("harpMode").onchange=e=>{ releaseAll(); st.harp=e.target.value; save(); options(); };

// ---------- chord voices, latched ----------
// The minichord's four MPE chord voices come on its channels 2 to 5, each keeping its channel as it
// moves: with voice leading on they are bass, tenor, alto and soprano, bottom to top. The router puts
// them on the 8b8's channels 1 to 4, and PIN gives each of those one of the nine voices for itself.
const voicing={};          // minichord settings chosen in the voicing row, for this visit only
let sentPins="";
const vcolour=i=>getComputedStyle(document.documentElement).getPropertyValue("--v"+i).trim()||"#888";
const noteName=n=>NAMES[((n%12)+12)%12]+(Math.floor(n/12)-1);
const voiceNames=()=> (mc.params[111]??0)>0 ? ["Bass","Tenor","Alto","Soprano"] : ["Voice 1","Voice 2","Voice 3","Voice 4"];
function applyPins(){
  const can = eb.connected && !given && st.pin && router.mpe && eb.canPin!==false;
  const want = can ? st.voices.map((v,i)=>`${1+i}:${v.voice}:${v.env??255}:${v.legato?1:0}`).join(" ") : "";
  router.slots.forEach((s,i)=>{ s.on=st.voices[i].on; s.oct=st.voices[i].oct; });
  if(want!==sentPins){
    releaseAll();                         // a lane about to change hands lets go of what it holds
    router.pinned=!!want;
    if(want) st.voices.forEach((v,i)=>eb.pin(1+i, v.voice, v.env, v.legato)); else if(sentPins) eb.unpin();
    sentPins=want;
    // a firmware without PIN says nothing: then the voices can't be latched
    if(want && eb.canPin==null) setTimeout(()=>{ if(eb.canPin==null){ eb.canPin=false; applyPins(); } drawPins(); }, 1500);
  }
  drawPins();
}
function drawPins(){
  const tb=$("pins").tBodies[0], names=voiceNames();
  if(!tb.rows.length){
    st.voices.forEach((v,i)=>{
      const tr=tb.insertRow();
      tr.innerHTML=`<td><i style="background:var(--v${i})"></i><span></span></td><td><input type="checkbox" aria-label="plays"></td>`+
        `<td><select aria-label="8b8 voice">${AY_VOICES.map((n,k)=>`<option value="${k}">${n}</option>`).join("")}</select></td>`+
        `<td><select aria-label="envelope"><option value="">The sound's</option>${ENVELOPES.map((n,k)=>`<option value="${k}">${n}</option>`).join("")}</select></td>`+
        `<td><input type="checkbox" aria-label="legato"></td>`+
        `<td><select aria-label="octave"><option value="-2">−2</option><option value="-1">−1</option><option value="0">0</option><option value="1">+1</option></select></td><td class="now"></td>`;
      const [on, voice, env, leg, oct]=tr.querySelectorAll("input,select");
      on.onchange=()=>{ st.voices[i].on=on.checked; changed(); };
      voice.onchange=()=>{ const k=+voice.value, other=st.voices.findIndex((x,j)=>j!==i && x.voice===k);
        if(other>=0) st.voices[other].voice=st.voices[i].voice;          // a voice belongs to one line: the two swap
        st.voices[i].voice=k; changed(); };
      env.onchange=()=>{ st.voices[i].env = env.value==="" ? null : +env.value; changed(); };
      leg.onchange=()=>{ st.voices[i].legato=leg.checked; changed(); };
      oct.onchange=()=>{ st.voices[i].oct=+oct.value; changed(); };
    });
  }
  st.voices.forEach((v,i)=>{
    const tr=tb.rows[i], [on, voice, env, leg, oct]=tr.querySelectorAll("input,select");
    tr.cells[0].lastChild.textContent=names[i];
    on.checked=v.on; voice.value=String(v.voice); env.value=v.env==null ? "" : String(v.env); leg.checked=v.legato; oct.value=String(v.oct);
  });
  $("pinOn").checked=st.pin;
  const warn=$("pinWarn"), msgs=[];
  if(st.pin && !mc.mpe) msgs.push("Latching needs exact tuning (MPE) on: it's how each chord voice arrives on a channel of its own.");
  if(st.pin && eb.canPin===false) msgs.push("This 8b8's firmware doesn't know how to latch a voice yet: flash the feature/pinned-voices branch of the 8bit8asterd firmware (or its emulator build).");
  if(st.pin && eb.connected && env8b8Custom()) msgs.push("The 8b8's sound uses its own custom envelope, which every voice shares: the envelope choices here wait until its envelope mode is back to MIDI channel presets.");
  warn.hidden=!msgs.length; warn.textContent=msgs.join(" ");
  drawChips();
}
const env8b8Custom=()=> eb.known && eb.params && eb.params[PARAM.env_mode]===1;
function changed(){ save(); if(given) take(); else { borrowAll(); follow(); } }
$("pinOn").onchange=e=>{ st.pin=e.target.checked; changed(); };

// the nine voices as the 8b8 reports them, three chips of three
function drawChips(){
  const box=$("chips");
  if(!box.childElementCount) for(let k=0;k<9;k++) box.appendChild(document.createElement("div"));
  const names=voiceNames(), map=eb.voiceMap;
  // laid out as the chips are: a column each, its three channels down
  for(let ch=0;ch<3;ch++) for(let chip=0;chip<3;chip++){
    const v=ch*3+chip, el=box.children[ch*3+chip];
    const slot = sentPins ? st.voices.findIndex(x=>x.voice===v) : -1;
    const m=map && map[v], what = !m ? "" : m.drum ? "drum" : m.note!=null ? noteName(m.note) : m.stage==="R" ? "fading" : "free";
    el.className=(slot>=0 ? "pin" : "")+(m && (m.drum || m.note!=null) ? " busy" : "");
    el.style.borderColor = slot>=0 ? vcolour(slot) : "";
    el.innerHTML=`<b>${AY_VOICES[v]}${slot>=0 ? " · "+names[slot] : ""}</b>${what || "&nbsp;"}`;
  }
}
eb.addEventListener("voicemap", drawChips);
eb.addEventListener("pins", drawPins);
eb.addEventListener("preset", ()=>drawPins());
setInterval(()=>{ if(eb.connected && !document.hidden) eb.line("DIAG"); }, 400);

// the voicing row: the minichord's own settings, shown as they are and borrowed when changed here
const VOICING={vl:111, cantus:115, slashv:113, glide:199};
for(const [id,a] of Object.entries(VOICING)) $(id).onchange=e=>{ voicing[a]=Math.max(0, +e.target.value||0); if(given) take(); else borrowAll(); };
function drawVoicing(){ for(const [id,a] of Object.entries(VOICING)) if(document.activeElement!==$(id) && mc.params[a]!=null) $(id).value=String(mc.params[a]); }
mc.addEventListener("device", ()=>{ drawVoicing(); drawPins(); });

// ---------- the four lines, over the last twelve seconds ----------
const SPAN=12000, hist=[[],[],[],[]];
let lastVoicing=null;
mc.addEventListener("voices", ()=>{
  const now=performance.now(), by=[null,null,null,null];
  for(const v of mc.voices) if(v.voice!=null && v.voice>=0 && v.voice<4) by[v.voice]=v.pitch;
  by.forEach((p,i)=>{ const h=hist[i], last=h[h.length-1]; if(!last || last[1]!==p) h.push([now,p]); while(h.length>2 && now-h[1][0]>SPAN) h.shift(); });
});
mc.addEventListener("chord", e=>{
  const now=[null,null,null,null]; for(const v of e.detail) if(v.voice!=null && v.voice>=0 && v.voice<4) now[v.voice]=v.pitch;
  if(lastVoicing){
    const names=voiceNames(), parts=[]; let total=0;
    now.forEach((p,i)=>{ if(p==null || lastVoicing[i]==null) return; const d=Math.round((p-lastVoicing[i])*10)/10; total+=Math.abs(d); parts.push(`${names[i].toLowerCase()} ${d>0?"+":d<0?"−":""}${Math.abs(d)}`); });
    if(parts.length) $("motion").textContent=`Last change: ${parts.join(", ")}: ${Math.round(total*10)/10} semitones moved in all.`;
  }
  lastVoicing=now;
  const tb=$("pins").tBodies[0];
  now.forEach((p,i)=>{ if(tb.rows[i]) tb.rows[i].cells[6].textContent = p==null ? "" : noteName(Math.round(p)); });
});
function drawLines(){
  requestAnimationFrame(drawLines);
  const cv=$("lines"); if(!cv || document.hidden) return;
  const g=cv.getContext("2d"); if(!g) return;
  const W=cv.width, H=cv.height, now=performance.now();
  g.clearRect(0,0,W,H);
  let lo=1e9, hi=-1e9;
  for(const h of hist) for(const [,p] of h) if(p!=null){ lo=Math.min(lo,p); hi=Math.max(hi,p); }
  if(lo>hi){ lo=48; hi=72; }
  lo-=3; hi+=3; if(hi-lo<18){ const m=(hi+lo)/2; lo=m-9; hi=m+9; }
  const x=t=>W-(now-t)/SPAN*W, y=p=>H-6-(p-lo)/(hi-lo)*(H-12);
  g.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--rule").trim()||"#ccc"; g.lineWidth=1;
  for(let n=Math.ceil(lo/12)*12;n<=hi;n+=12){ g.beginPath(); g.moveTo(0,y(n)); g.lineTo(W,y(n)); g.stroke(); }
  hist.forEach((h,i)=>{
    g.strokeStyle=vcolour(i); g.lineWidth=4; g.lineCap="round"; g.beginPath(); let pen=false;
    h.forEach(([t,p],k)=>{
      const tEnd = k+1<h.length ? h[k+1][0] : now;
      if(p==null || tEnd<now-SPAN){ pen=false; return; }
      const x0=Math.max(0,x(t)), x1=x(tEnd);
      if(pen) g.lineTo(x0,y(p)); else g.moveTo(x0,y(p));
      g.lineTo(x1,y(p)); pen=true;
    });
    g.stroke();
  });
}
requestAnimationFrame(drawLines);

options(); drawGrid(); drawKnobs(); drawBanks(); drawTuning(0, tuningCents(0), false); drawPins(); drawVoicing();
