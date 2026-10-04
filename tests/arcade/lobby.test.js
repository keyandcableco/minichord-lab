// The arcade lobby: a cabinet for every game, each best score on its cabinet and in the ticker.
const fs=require("fs"), path=require("path"), {JSDOM}=require("jsdom");
const html=fs.readFileSync(path.resolve(__dirname,"../../arcade/index.html"),"utf8");
const dom=new JSDOM(html.replace(/<script type="module">[\s\S]*<\/script>/,""),{url:"http://localhost/arcade/", pretendToBeVisual:true, runScripts:"outside-only"});
const w=dom.window, d=w.document;
w.matchMedia=()=>({matches:false}); w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){}, set fillStyle(v){}});
w.fetch=async u=>({ok:true, json:async()=>({scores: u.includes("chord-snake") ? [{initials:"GKY",score:12345,level:3},{initials:"ABC",score:900,level:1}] : []})});
const src=html.slice(html.indexOf('<script type="module">')+22, html.lastIndexOf("</script>")).replace('import {SCORES_API} from "../core/scores.js";','const SCORES_API="https://scores.test";')
  .replace('import {Minichord} from "../core/minichord.js";','class Minichord extends EventTarget{ get out(){ return null; } }');   // the sign's minichord: none plugged in
w.eval("(async()=>{"+src+"})()");
setTimeout(()=>{
  const results=[]; const check=(n,ok,det="")=>{ results.push(ok); console.log(`${ok?"  ✓":"  ✗"} ${n}${det?`  (${det})`:""}`); };
  const cabs=[...d.querySelectorAll(".cab h3")].map(x=>x.textContent);
  check("a cabinet for every game", cabs.length===15, cabs.join(", "));
  check("a best score on its cabinet", d.getElementById("hi-chord-snake").textContent==="HI 12,345 GKY");
  check("an empty board invites a first score", /BE THE FIRST/.test(d.getElementById("hi-invaders").textContent));
  check("the ticker carries the leaders", /CHORD SNAKE.*GKY 12,345/.test(d.getElementById("ticker").textContent));
  const bad=results.filter(x=>!x).length; console.log(bad?`FAILED ${bad} of ${results.length}`:`ok ${results.length}`); process.exit(bad?1:0);
}, 500);
