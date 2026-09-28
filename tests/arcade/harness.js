// The harness for the arcade's headless tests. It loads the Practice Room page (practice/index.html,
// where the games live) into jsdom, as a game's own page would open it (?game=<slug>&solo), with the
// core modules inlined, a stand-in for the browser's audio, and a stand-in minichord that answers
// setting writes and dump requests. Each test file drives one game through it and reports checks.
const fs=require("fs"), path=require("path");
const {JSDOM}=require("jsdom");
const ROOT=path.resolve(__dirname,"../..");

function load(slug, {storage}={}){
  const html=fs.readFileSync(path.join(ROOT,"practice/index.html"),"utf8");
  const page=html.slice(html.indexOf('<script type="module">')+22, html.lastIndexOf("</script>")).replace(/^import .*$/mg,"");
  const body=html.slice(html.indexOf("<body>")+6, html.indexOf('<script type="module">'));
  const dom=new JSDOM(`<!doctype html><html><body>${body}</body></html>`,
    {runScripts:"outside-only", pretendToBeVisual:true, url:`http://localhost/practice/?game=${slug}&solo`});
  const w=dom.window;
  if(storage) w.localStorage.setItem("lab-spellbound", JSON.stringify(storage));
  w.SCORES_HOST="";                                   // no shared board: the local one
  w.matchMedia=()=>({matches:false, addEventListener(){}});
  w.fetch=()=>Promise.reject(new Error("offline"));
  w.HTMLDialogElement.prototype.showModal=function(){ this.setAttribute("open",""); };
  w.HTMLDialogElement.prototype.close=function(){ this.removeAttribute("open"); };
  const param=()=>({value:0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(){}});
  w.AudioContext=class{ constructor(){ this.state="running"; this.currentTime=0; this.destination={}; this.sampleRate=44100; }
    resume(){ return Promise.resolve(); }
    createGain(){ return {gain:param(), connect(x){ return x; }}; }
    createOscillator(){ return {type:"", frequency:param(), detune:param(), setPeriodicWave(){}, connect(x){ return x; }, start(){}, stop(){}}; }
    createPeriodicWave(){ return {}; }
    createBiquadFilter(){ return {type:"", frequency:param(), Q:param(), connect(x){ return x; }}; }
    createBuffer(c,n){ return {getChannelData(){ return new Float32Array(n); }}; }
    createDynamicsCompressor(){ return {threshold:param(), ratio:param(), connect(x){ return x; }}; }
    decodeAudioData(){ return Promise.reject(); }
    createBufferSource(){ return {connect(x){ return x; }, start(){}, stop(){}, buffer:null, playbackRate:param()}; } };
  // a canvas that takes every drawing call and draws nothing (jsdom has no canvas of its own)
  const ctx=()=>new Proxy({}, {get:(o,k)=> k in o ? o[k] : (k==="canvas" ? undefined : ()=>({data:[]})), set:(o,k,v)=>{ o[k]=v; return true; }});
  w.HTMLCanvasElement.prototype.getContext=function(){ return this._ctx || (this._ctx=ctx()); };
  // the core modules, each as a script putting its exports on window
  const wrap=f=>{ const raw=fs.readFileSync(path.join(ROOT,"core",f),"utf8").replace(/import\.meta\.url/g,'"http://localhost/core/x.js"');
    const names=[...raw.matchAll(/^export (?:async )?(?:class|function|const|let) ([A-Za-z_$][\w$]*)/mg)].map(m=>m[1]);
    return "(function(){"+raw.replace(/^import .*$/mg,"").replace(/^export (default )?/mg,"")+"\n"+names.map(n=>`window.${n}=${n};`).join("")+"})();"; };
  // the field has a size (jsdom lays nothing out)
  Object.defineProperty(w.HTMLElement.prototype,"clientWidth",{get(){ return this.classList && this.classList.contains("field") ? 900 : 0; }});
  Object.defineProperty(w.HTMLElement.prototype,"clientHeight",{get(){ return this.classList && this.classList.contains("field") ? 420 : 0; }});
  w.eval(["theory.js","temperaments.js","sound.js","minichord.js"].map(wrap).join("\n")+"\n(function(){"+page+"\n})();");

  const d=w.document, mc=w.mc, sb=w.__sb;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const writes=[];
  // a minichord on the other end: remembers what's written, answers a request for its settings
  function connect({firmware=17, key=0, extra={}}={}){
    mc.sysex=true; mc.out={id:"test", send(){}};
    mc.writeParam=(a,v)=>{ writes.push([a,v]); mc.params[a]=v; };
    mc.requestDump=()=>{ mc._asked=(mc._asked||0)+1; setTimeout(()=>{ mc._asked--; mc.dispatchEvent(new w.Event("device")); },5); };
    for(let a=0;a<256;a++) mc.params[a]=0;
    Object.assign(mc.params, {7:firmware, 35:key, 97:150, 238:0}, extra);
    mc.dispatchEvent(new w.Event("device"));
  }
  const IV={"":[0,4,7], m:[0,3,7], "7":[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], "°":[0,3,6], "+":[0,4,8]};
  const PC={C:0,"C♯":1,"D♭":1,D:2,"D♯":3,"E♭":3,E:4,F:5,"F♯":6,"G♭":6,G:7,"G♯":8,"A♭":8,A:9,"A♯":10,"B♭":10,B:11};
  const chord=(root, q="")=>sb.answerChord(IV[q].map((x,i)=>({pitch:48+(typeof root==="number"?root:PC[root])+x, voice:i})));
  const note=pc=>sb.answerNote(pc);
  const knob=(v,cc=22)=>mc.handle([0xBF,cc,v]);
  const key=code=>d.dispatchEvent(new w.KeyboardEvent("keydown",{code, bubbles:true}));
  const overlay=()=>d.querySelector(".field .overlay");
  const heard=()=>{ const h=d.querySelector(".field .heard"); return h ? h.textContent : ""; };
  // wake the title screen and start a level (0-based), optionally at a speed
  async function start(level=0, {speed}={}){
    key("KeyJ"); await sleep(30);
    const ov=overlay();
    if(speed!=null){ const sp=[...ov.querySelectorAll(".cab-options .optrow")].find(r=>/SPEED/.test(r.textContent)); sp && sp.querySelectorAll("button")[speed].click(); }
    [...ov.querySelectorAll(".cab-options .levels")].pop().querySelectorAll("button")[level].click();
    await sleep(150);
    return sb.arcade;
  }
  // checks: each prints, and the run ends with a count and an exit code
  const results=[];
  function check(name, ok, detail=""){ results.push({name, ok:!!ok}); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); }
  function done(){ const bad=results.filter(r=>!r.ok).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0); }
  process.on("unhandledRejection", e=>{ console.log("  ✗ error:", e && e.message); process.exit(1); });
  return {w, d, mc, sb, sleep, connect, writes, chord, note, knob, key, overlay, heard, start, check, done, IV, PC};
}
module.exports={load};
