// Runs every arcade test (or those whose names contain the words given): node arcade/run.js [filter]
// Each test's checks print as they happen, so a long test shows its progress rather than going quiet.
const {spawn}=require("child_process"), fs=require("fs"), path=require("path");
const filter=process.argv.slice(2);
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js") && (!filter.length || filter.some(x=>f.includes(x)))).sort();
const runOne=f=>new Promise(done=>{
  const t0=Date.now(); process.stdout.write(`${f.replace(".test.js","")}\n`);
  const child=spawn(process.execPath, [path.join(__dirname,f)]);
  let buf="";
  const out=d=>{ buf+=d; const lines=buf.split("\n"); buf=lines.pop();
    for(const l of lines) if(l.trim()) process.stdout.write((l.startsWith("  ")?l:"  "+l)+"\n"); };
  child.stdout.on("data", out); child.stderr.on("data", out);
  const timer=setTimeout(()=>{ child.kill(); process.stdout.write("  ✗ timed out\n"); }, 150000);
  child.on("close", code=>{ clearTimeout(timer); if(buf.trim()) process.stdout.write("  "+buf.trim()+"\n");
    process.stdout.write(`  (${Math.round((Date.now()-t0)/1000)}s)\n`); done(code===0); });
});
(async()=>{
  const t0=Date.now(); let failed=0;
  for(const f of files) if(!(await runOne(f))) failed++;
  console.log(`\n${files.length-failed} of ${files.length} passed in ${Math.round((Date.now()-t0)/1000)}s`);
  process.exit(failed?1:0);
})();
