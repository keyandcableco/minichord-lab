// Runs every arcade test (or those whose names contain the words given): node arcade/run.js [filter]
const {spawnSync}=require("child_process"), fs=require("fs"), path=require("path");
const filter=process.argv.slice(2);
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js") && (!filter.length || filter.some(x=>f.includes(x)))).sort();
let failed=0; const t0=Date.now();
for(const f of files){
  process.stdout.write(`${f.replace(".test.js","")}\n`);
  const r=spawnSync(process.execPath, [path.join(__dirname,f)], {encoding:"utf8", timeout:120000});
  const out=(r.stdout||"")+(r.stderr||"");
  process.stdout.write(out.split("\n").filter(Boolean).map(l=>l.startsWith("  ")?l:"  "+l).join("\n")+"\n");
  if(r.status!==0){ failed++; if(r.signal) console.log(`  ✗ timed out`); }
}
console.log(`\n${files.length-failed} of ${files.length} passed in ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(failed?1:0);
