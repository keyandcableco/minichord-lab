// Runs every arcade test (or those whose names contain the words given): node arcade/run.js [-jN] [filter]
// Tests run side by side, half as many at once as the machine has cores (-jN for N, -j1 for one at
// a time), the longest first, judged from how long each took last time (kept in .timings.json,
// beside this file, out of git), so the slow ones aren't left till the end. Each test's checks print
// together when it finishes; with -j1 they print as they happen, a progress bar heading each test.
const {spawn}=require("child_process"), fs=require("fs"), path=require("path"), os=require("os");
const args=process.argv.slice(2), jArg=args.find(a=>/^-j\d+$/.test(a)), filter=args.filter(a=>a!==jArg);
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js") && (!filter.length || filter.some(x=>f.includes(x)))).sort();
const TIMES=path.join(__dirname,".timings.json");
let times={}; try{ times=JSON.parse(fs.readFileSync(TIMES,"utf8")); }catch(e){}
const nameOf=f=>f.replace(".test.js",""), took=f=>times[nameOf(f)]||0;
// half the logical cores by default: the checks keep real time (frames, timers), and a hyperthreaded
// core shared by two tests runs each slow enough to fail them
const jobs=Math.max(1, Math.min(files.length, jArg ? +jArg.slice(2) : Math.ceil((os.availableParallelism?.() ?? os.cpus().length)/2)));
if(jobs>1) files.sort((a,b)=>took(b)-took(a) || a.localeCompare(b));   // longest first; new tests (no time yet) last
const bar=(done,total,width=24)=>{ const n=Math.round(width*done/total); return "["+"█".repeat(n)+"░".repeat(width-n)+"]"; };
const mmss=s=>s>=60 ? `${Math.floor(s/60)}m ${String(Math.round(s%60)).padStart(2,"0")}s` : `${Math.round(s)}s`;
const indent=l=>(l.startsWith("  ")?l:"  "+l)+"\n";
const runOne=(f, stream=jobs===1)=>new Promise(done=>{
  const name=nameOf(f), t0=Date.now(), child=spawn(process.execPath, [path.join(__dirname,f)]);
  let buf="", block="";
  const say=s=>{ if(stream) process.stdout.write(s); else block+=s; };
  const out=d=>{ buf+=d; const lines=buf.split("\n"); buf=lines.pop();
    for(const l of lines) if(l.trim()) say(indent(l)); };
  child.stdout.on("data", out); child.stderr.on("data", out);
  const timer=setTimeout(()=>{ child.kill(); say("  ✗ timed out\n"); }, 240000);   // the tests that walk every game (pages, demos, title-cycle) grow with the arcade
  child.on("close", code=>{ clearTimeout(timer); if(buf.trim()) say(indent(buf.trim()));
    const secs=(Date.now()-t0)/1000; times[name]=Math.round(secs); say(`  (${mmss(secs)})\n`);
    done({name, ok:code===0, block}); });
});
(async()=>{
  const t0=Date.now(), failed=[]; let next=0, finished=0;
  if(jobs>1) console.log(`${files.length} tests, ${jobs} at a time${files.reduce((a,f)=>a+took(f),0) ? `, about ${mmss(Math.max(took(files[0]), files.reduce((a,f)=>a+took(f),0)/jobs))}` : ""}`);
  const worker=async()=>{
    while(next<files.length){
      const i=next++, f=files[i];
      if(jobs===1){ const left=files.slice(i).reduce((a,x)=>a+took(x),0);
        process.stdout.write(`\n${bar(i,files.length)} ${i}/${files.length}${left?`  about ${mmss(left)} to go`:""}\n${nameOf(f)}\n`); }
      const r=await runOne(f); finished++;
      if(!r.ok) failed.push(r.name);
      if(jobs>1) process.stdout.write(`\n${bar(finished,files.length)} ${finished}/${files.length}  ${r.ok?"✓":"✗"} ${r.name}\n${r.block}`);
    }
  };
  await Promise.all(Array.from({length:jobs}, worker));
  // A test that failed beside others runs again on its own: its checks keep real time, and a busy
  // machine can make a sound one miss. Only a failure on its own counts; one that passed only then
  // is named, so a test that's grown sensitive to load doesn't go unnoticed.
  const flaky=[];
  if(jobs>1) for(const name of failed.splice(0)){
    process.stdout.write(`\n${name}, again on its own\n`);
    if((await runOne(name+".test.js", true)).ok) flaky.push(name); else failed.push(name);
  }
  try{ fs.writeFileSync(TIMES, JSON.stringify(times,null,1)); }catch(e){}
  console.log(`\n${bar(files.length,files.length)} ${files.length}/${files.length}\n${files.length-failed.length} of ${files.length} passed in ${mmss((Date.now()-t0)/1000)}`
    + (failed.length ? `\nfailed: ${failed.sort().join(", ")}` : "")
    + (flaky.length ? `\npassed only on their own: ${flaky.sort().join(", ")}` : ""));
  process.exit(failed.length?1:0);
})();
