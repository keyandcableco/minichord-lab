// Runs every arcade test (or those whose names contain the words given): node arcade/run.js [filter]
// A progress bar heads each test, with the time left judged from how long each took last time
// (kept in .timings.json, beside this file, out of git); each check prints as it happens.
const {spawn}=require("child_process"), fs=require("fs"), path=require("path");
const filter=process.argv.slice(2);
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js") && (!filter.length || filter.some(x=>f.includes(x)))).sort();
const TIMES=path.join(__dirname,".timings.json");
let times={}; try{ times=JSON.parse(fs.readFileSync(TIMES,"utf8")); }catch(e){}
const bar=(done,total,width=24)=>{ const n=Math.round(width*done/total); return "["+"█".repeat(n)+"░".repeat(width-n)+"]"; };
const mmss=s=>s>=60 ? `${Math.floor(s/60)}m ${String(Math.round(s%60)).padStart(2,"0")}s` : `${Math.round(s)}s`;
const runOne=(f,i)=>new Promise(done=>{
  const name=f.replace(".test.js",""), left=files.slice(i).reduce((a,x)=>a+(times[x.replace(".test.js","")]||0),0);
  process.stdout.write(`\n${bar(i,files.length)} ${i}/${files.length}${left?`  about ${mmss(left)} to go`:""}\n${name}\n`);
  const t0=Date.now(), child=spawn(process.execPath, [path.join(__dirname,f)]);
  let buf="";
  const out=d=>{ buf+=d; const lines=buf.split("\n"); buf=lines.pop();
    for(const l of lines) if(l.trim()) process.stdout.write((l.startsWith("  ")?l:"  "+l)+"\n"); };
  child.stdout.on("data", out); child.stderr.on("data", out);
  const timer=setTimeout(()=>{ child.kill(); process.stdout.write("  ✗ timed out\n"); }, 150000);
  child.on("close", code=>{ clearTimeout(timer); if(buf.trim()) process.stdout.write("  "+buf.trim()+"\n");
    const secs=(Date.now()-t0)/1000; times[name]=Math.round(secs); process.stdout.write(`  (${mmss(secs)})\n`); done(code===0); });
});
(async()=>{
  const t0=Date.now(); let failed=0;
  for(let i=0;i<files.length;i++) if(!(await runOne(files[i],i))) failed++;
  try{ fs.writeFileSync(TIMES, JSON.stringify(times,null,1)); }catch(e){}
  console.log(`\n${bar(files.length,files.length)} ${files.length}/${files.length}\n${files.length-failed} of ${files.length} passed in ${mmss((Date.now()-t0)/1000)}`);
  process.exit(failed?1:0);
})();
