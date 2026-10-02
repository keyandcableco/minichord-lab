#!/usr/bin/env node
// What each arcade game's own page (practice/?game=<slug>&solo) makes a browser download before it
// can play: the page itself, the core modules boot.js imports, and the page's scripts as its head
// chooses them for that game, each raw and gzipped (as GitHub Pages sends it). For keeping the
// arcade light enough for a phone: a game's page should stay under BUDGET, gzipped, with the samples,
// fonts and pictures counted apart (they arrive after the game can start, or from the browser's cache).
// Run from anywhere, no packages needed:  node tools/weigh.js   (--all lists every file)
"use strict";
const fs=require("fs"), path=require("path"), zlib=require("zlib"), vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const BUDGET=150*1024;                                   // gzipped, page + core + scripts

const html=fs.readFileSync(path.join(ROOT,"practice/index.html"),"utf8");
const head=html.match(/<script>\n(\/\/ A game's own page opens this page[\s\S]*?)<\/script>/)[1];
// the head's own choice of scripts, run as a browser would run it for each game's address
function scriptsFor(slug){
  const doc={documentElement:{classList:{add(){}, remove(){}}}, createElement:()=>({}), head:{appendChild(){}}};
  const box={URLSearchParams, setTimeout(){}, location:{search:`?game=${slug}&solo`}, document:doc};
  vm.runInNewContext(head+"\n;this.__out={PAGE_SCRIPTS, ARCADE_KINDS, GAME_SLUGS};", box);
  return box.__out;
}
const CORE=["practice/boot.js","core/minichord.js","core/theory.js","core/temperaments.js","core/sound.js","core/scores.js","core/theme.js"];
const sizes=new Map();
const weigh=f=>{ if(!sizes.has(f)){ const b=fs.readFileSync(path.join(ROOT,f)); sizes.set(f,{raw:b.length, gz:zlib.gzipSync(b,{level:9}).length}); } return sizes.get(f); };
const kb=n=>(n/1024).toFixed(0).padStart(5)+" KB";

const {ARCADE_KINDS, GAME_SLUGS}=scriptsFor("");
// each kind's own address: the first slug that names it
const slugOf=k=>Object.keys(GAME_SLUGS).find(s=>GAME_SLUGS[s]===k) || k;
const all=process.argv.includes("--all");
console.log(`${"game".padEnd(20)} ${"files".padStart(5)} ${"raw".padStart(8)} ${"gzip".padStart(8)}   (budget ${kb(BUDGET).trim()} gzipped)`);
let over=0;
for(const k of ARCADE_KINDS){
  const slug=slugOf(k), {PAGE_SCRIPTS}=scriptsFor(slug);
  const files=["practice/index.html", ...CORE, ...PAGE_SCRIPTS.map(s=>path.normalize(path.join("practice",s)))];
  const t=files.reduce((a,f)=>{ const s=weigh(f); return {raw:a.raw+s.raw, gz:a.gz+s.gz}; },{raw:0,gz:0});
  const flag=t.gz>BUDGET ? "  over" : ""; if(flag) over++;
  console.log(`${slug.padEnd(20)} ${String(files.length).padStart(5)} ${kb(t.raw)} ${kb(t.gz)}${flag}`);
  if(all) files.forEach(f=>{ const s=weigh(f); console.log(`    ${f.padEnd(44)} ${kb(s.raw)} ${kb(s.gz)}`); });
}
// the heaviest files any game loads, where trimming pays most
const shared=[...sizes.entries()].sort((a,b)=>b[1].gz-a[1].gz).slice(0,8);
console.log("\nheaviest files:"); shared.forEach(([f,s])=>console.log(`    ${f.padEnd(44)} ${kb(s.raw)} ${kb(s.gz)}`));
process.exitCode = over ? 1 : 0;
