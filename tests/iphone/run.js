// The arcade on iPhones, in a real browser: node iphone/run.js [options] [game words]
// Every arcade game, and the lobby, on four iPhones held upright and sideways. Each game is walked
// through its cabinet as a player's thumb would do it (the title, the rules rolling, the points, the
// power-ups, the high scores, a tap for the options, CHOOSE A LEVEL, level 1, a chord and a pluck on
// the screen's minichord), and at each screen probe.js looks at what's actually shown: text too small
// to read, buttons too small to tap or partly hidden, text cut off or covered, anything under the
// notch or home indicator, the page panning sideways, pictures missing, script errors. A report with
// every screen and the problems boxed on it goes to iphone/report/index.html.
//
// What's an iPhone here (Chrome or WebKit can't be one, so the differences that matter are put in):
// its screen in CSS pixels as Safari leaves it, its pixel density, touch (pointer: coarse), its user
// agent; no full screen for an element (only a video gets that on an iPhone), no Web MIDI, no vibrate;
// the safe-area insets of its notch or Dynamic Island and home indicator (env() in the CSS as the
// phone fills it in); and Safari's vh, which is the screen with its toolbars tucked away (lvh), taller
// than what's shown while they're out. --home is the arcade added to the Home Screen: the whole
// screen, the status bar and home indicator over the page, display-mode standalone.
//
//   --engine chrome|webkit   Chrome (the default: the one installed) or WebKit, Safari's engine, run in
//                            Playwright's Docker image (it won't run on Debian 12 by itself)
//   --devices se,mini,15,max which iPhones (default all four); --portrait or --landscape for one way up
//   --home                   as a Home Screen app, not in Safari
//   --quick                  the iPhone 15 only
//   --sharp                  screenshots at the phone's density, as sharp as its screen (slower)
//   --site DIR               test another copy of the site (git archive HEAD | tar -x -C DIR)
//   -jN                      N pages at once (default 3: more, and a busy machine's slow frames skew the look)
// Exits 1 if anything's broken (an error); warnings are for a person to look over in the report.
const http=require("http"), fs=require("fs"), path=require("path"), {spawn, execFileSync}=require("child_process");
const {chromium, webkit, devices}=require("playwright-core");
// --site DIR tests another copy of the site (an export of a commit, say) in place of this checkout
const siteArg=process.argv.indexOf("--site");
const ROOT=siteArg>0 ? path.resolve(process.argv[siteArg+1]) : path.resolve(__dirname,"../.."), OUT=path.join(__dirname,"report");

// ---------- the phones ----------
// notch: the safe-area inset its notch or Dynamic Island takes (the top held upright, each side held
// sideways); Safari's viewport (toolbars out) is Playwright's, but for the SE, whose descriptor leaves
// Safari's bars out
const PHONES={
  se:  {name:"iPhone SE (3rd gen)", notch:0,  status:20, screen:{width:375, height:667}, safari:{portrait:{width:375, height:553}, landscape:{width:667, height:331}}},
  mini:{name:"iPhone 13 Mini",      notch:50, status:50},
  15:  {name:"iPhone 15",           notch:59, status:59},
  max: {name:"iPhone 16 Pro Max",   notch:62, status:62},
};
const SAFARI_BARS={portrait:80, landscape:30};    // how much taller lvh is than the viewport with Safari's toolbars out
function emulation(key, way, home){
  const p=PHONES[key], d=devices[p.name+(way==="landscape"?" landscape":"")];
  const scr=p.screen || d.screen || devices[p.name].screen, side=way==="landscape";
  const full=side ? {width:scr.height, height:scr.width} : {...scr};
  const viewport= home ? full : (p.safari ? p.safari[way] : d.viewport);
  // the insets env() gives: upright, the status bar at the top (Safari's bar covers it, so none there);
  // sideways, the notch on each side; and the home indicator at the bottom
  const n=p.notch, insets= side ? {top:0, left:n, right:n, bottom:n?21:0} : home ? {top:p.status, left:0, right:0, bottom:n?34:0} : {top:0, left:0, right:0, bottom:0};
  const lvh= home ? viewport.height : viewport.height+SAFARI_BARS[way];
  return {label:`${p.name} ${way}${home?" (Home Screen)":""}`, key, way, home, viewport, insets, lvh,
    context:{viewport, screen:full, deviceScaleFactor:d.deviceScaleFactor, isMobile:true, hasTouch:true, userAgent:d.userAgent, serviceWorkers:"block", locale:"en-US"}};
}

// ---------- the pages ----------
const GAMES=fs.readdirSync(ROOT).filter(d=>{ try{ return /practice\/\?game=/.test(fs.readFileSync(path.join(ROOT,d,"index.html"),"utf8")); }catch(e){ return false; } }).sort();

// ---------- what the phone changes in the CSS ----------
// env(safe-area-inset-*) as this phone fills it in, and plain vh as Safari's (the large viewport);
// dvh and svh are left to the browser, whose viewport is Safari's with its toolbars out
const rewriteCss=(text, em)=>text
  .replace(/env\(\s*safe-area-inset-(top|right|bottom|left)\s*(?:,(?:[^()]|\([^()]*\))*)?\)/g, (_,s)=>em.insets[s]+"px")
  .replace(/(?<![\w.-])(\d*\.?\d+)vh\b/g, (_,n)=> em.home ? n+"vh" : (parseFloat(n)*em.lvh/100).toFixed(2)+"px");
// an iPhone's Safari, in what it hasn't got
const iosInit=({home})=>{
  for(const k of ["requestFullscreen","webkitRequestFullscreen"]) try{ delete Element.prototype[k]; }catch(e){}
  try{ Object.defineProperty(Document.prototype, "fullscreenEnabled", {get:()=>false}); Object.defineProperty(Document.prototype, "webkitFullscreenEnabled", {get:()=>false}); }catch(e){}
  for(const k of ["requestMIDIAccess","vibrate"]) try{ delete Navigator.prototype[k]; }catch(e){}
  if(home){
    try{ Object.defineProperty(Navigator.prototype, "standalone", {get:()=>true}); }catch(e){}
    const mm=window.matchMedia.bind(window);
    window.matchMedia=q=>/display-mode:\s*(standalone|fullscreen)/.test(q) ? {matches:true, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}} : mm(q);
  }
};

// ---------- the site, served from here ----------
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2",".woff":"font/woff",".webmanifest":"application/manifest+json",".mp3":"audio/mpeg",".ogg":"audio/ogg",".wav":"audio/wav",".txt":"text/plain"};
function serve(){
  const srv=http.createServer((req,res)=>{
    let p=decodeURIComponent(new URL(req.url,"http://x").pathname); if(p.endsWith("/")) p+="index.html";
    const f=path.join(ROOT,p); if(!f.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
    fs.readFile(f,(e,b)=>{ if(e){ res.writeHead(404); return res.end(); } res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(b); });
  });
  return new Promise(r=>srv.listen(0,"127.0.0.1",()=>r(srv)));
}

// ---------- WebKit, in Playwright's own image ----------
const PW_VERSION=require("playwright-core/package.json").version, WS_PORT=3123;
async function webkitServer(){
  const name="minichord-iphone-webkit";
  try{ execFileSync("docker",["rm","-f",name],{stdio:"ignore"}); }catch(e){}
  const img=`mcr.microsoft.com/playwright:v${PW_VERSION}-noble`;
  console.log(`starting WebKit in ${img} (the first time, Docker fetches the image)`);
  const child=spawn("docker",["run","--rm","--name",name,"--network","host","--init",img,"/bin/sh","-c",`cd /tmp && npx -y playwright-core@${PW_VERSION} run-server --port ${WS_PORT} --host 127.0.0.1`],{stdio:["ignore","pipe","inherit"]});
  await new Promise((ok,fail)=>{ child.stdout.on("data",d=>{ if(/Listening/.test(d)) ok(); }); child.on("exit",c=>fail(new Error("docker exited "+c))); });
  return {ws:`ws://127.0.0.1:${WS_PORT}/`, stop:()=>{ try{ execFileSync("docker",["rm","-f",name],{stdio:"ignore"}); }catch(e){} }};
}

// ---------- one page on one phone ----------
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SHARP=process.argv.includes("--sharp");     // screenshots at the phone's own density (three times slower)
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function runJob(browser, base, em, page_){
  const id=`${slugify(em.label)}--${page_}`, job={id, phone:em.label, page:page_, states:[], checks:[], errors:[], notes:[]};
  const ctx=await browser.newContext(em.context);
  await ctx.addInitScript(iosInit, {home:em.home});
  await ctx.addInitScript({path:path.join(__dirname,"probe.js")});
  // the site's own CSS and pages with the phone's insets and vh; nothing from anywhere else (the
  // shared score board, fonts or links out), so the shared board isn't touched and the run is the same each time
  await ctx.route("**/*", async route=>{ try{
    const u=new URL(route.request().url());
    if(u.origin!==base) return await route.abort();
    if(!/(\.css|\.html|\/)$/.test(u.pathname)) return await route.continue();
    const res=await route.fetch(); const type=res.headers()["content-type"]||"";
    if(!/css|html/.test(type)) return await route.fulfill({response:res});
    await route.fulfill({response:res, body:rewriteCss(await res.text(), em)});
  }catch(e){ await route.continue().catch(()=>{}); } });   // a hitch (or a page left while its request was on the way): let it through as it is
  const page=await ctx.newPage();
  page.on("pageerror", e=>job.errors.push("script error: "+e.message));
  page.on("console", m=>{ if(m.type()==="error" && !/ERR_FAILED|ERR_BLOCKED|Failed to load resource|ERR_CONNECTION/.test(m.text())) job.errors.push("console: "+m.text().slice(0,300)); });
  const check=(name, ok, detail="")=>job.checks.push({name, ok:!!ok, detail});
  const ev=(fn, arg)=>page.evaluate(fn, arg);
  // a screen as it stands: looked at twice, a moment apart, and only what's the same both times kept,
  // so a falling chord caught crossing the field's edge isn't taken for something cut off
  async function snap(name, opts={}){
    const probe=o=>page.evaluate(o=>window.__iphoneProbe(o), {insets:em.insets, skipClip:opts.skipClip||[], passing:[".tdtip"]});
    const a=await probe();
    const file=`${id}--${slugify(name)}.png`;
    await page.screenshot({path:path.join(OUT,"shots",file), fullPage:!!opts.fullPage, scale:SHARP ? "device" : "css"});
    await sleep(opts.gap ?? 700);
    const b=await probe(), keyOf=f=>f.kind+"|"+f.sel+"|"+(f.text||"");
    const still=new Set(b.map(keyOf));
    const findings=a.filter(f=>still.has(keyOf(f)) || f.kind==="h-scroll" || f.kind==="broken-image");
    const seen=new Set(); job.states.push({name, file, findings:findings.filter(f=>{ const k=keyOf(f)+f.box; if(seen.has(k)) return false; seen.add(k); return true; })});
  }
  // A finger on the middle of something; false if it isn't there to be tapped. Out of sight (below
  // the fold of a screen that scrolls, or under the minichord) it's scrolled to, as a thumb would, and
  // that's noted: an iPhone shows no scroll bar, so nothing says it's there.
  async function tap(sel, what=sel){
    const where=()=>ev(s=>{ const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); if(!b.width || !b.height) return null;
      const x=b.left+b.width/2, y=b.top+b.height/2, top=document.elementFromPoint(x,y);
      let nested=false; for(let p=e.parentElement; p && p!==document.body; p=p.parentElement){ const o=getComputedStyle(p).overflowY; if(/auto|scroll/.test(o) && p.scrollHeight>p.clientHeight+1){ nested=true; break; } }
      return {x, y, nested, hit:!!top && (top===e || e.contains(top))}; }, sel);
    let r=await where(); if(!r) return false;
    if(!r.hit){
      const nested=r.nested;
      await ev(s=>document.querySelector(s).scrollIntoView({block:"center"}), sel); await sleep(300); r=await where();
      // the page itself scrolling is plain to anyone; a box inside the screen that scrolls isn't
      if(!r || !r.hit) job.notes.push(`${what} can't be reached by a finger`);
      else if(nested) job.notes.push(`${what} starts out of sight: the screen has to be scrolled to find it`);
      if(!r || !r.hit) return false;
    }
    await page.touchscreen.tap(r.x, r.y); return true;
  }
  try{
    if(page_==="lobby") await lobby(); else await game(page_);
  }catch(e){ check("the walk-through ran to the end", false, e.message.split("\n")[0]); }
  await ctx.close();
  return job;

  async function lobby(){
    await page.goto(base+"/arcade/", {timeout:90000}); await sleep(1500);
    // the whole page, a screenful at a time
    const h=await ev(()=>document.documentElement.scrollHeight), step=Math.round(em.viewport.height*0.9);
    for(let y=0, i=0; y<h && i<8; y+=step, i++){ await ev(y=>scrollTo(0,y), y); await sleep(300); await snap(`scrolled ${i}`, {gap:400}); }
    await ev(()=>scrollTo(0,0)); await sleep(200);
    const n=await ev(()=>document.querySelectorAll("a.cab").length);
    check("the lobby shows every game's cabinet", n===GAMES.length, `${n} of ${GAMES.length}`);
    await tap("a.cab");
    const games=new RegExp(`/(${GAMES.join("|")})/|practice/\\?game=`);
    await page.waitForURL(games, {timeout:30000, waitUntil:"commit"}).catch(()=>{});
    check("tapping a cabinet opens its game", games.test(page.url()), page.url());
  }

  async function game(slug){
    await page.goto(`${base}/${slug}/`, {timeout:90000});
    await page.waitForFunction(()=>window.__sb && __sb.arcade && __sb.arcade.overlay, null, {timeout:60000});
    await sleep(1400);
    // the screen's minichord, counted as it's played
    await ev(()=>{ window.__vm={press:0, pluck:0};
      for(const [k,f] of [["press","vmPress"],["pluck","vmPluck"]]){ const o=window[f]; if(typeof o==="function") window[f]=function(...a){ window.__vm[k]++; return o.apply(this,a); }; } });
    const lay=await ev(()=>{ const r=s=>{ const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return {l:b.left, t:b.top, r:b.right, b:b.bottom, w:b.width, h:b.height}; };
      const parts=[...document.querySelectorAll("#tdeck>.tdmod,#tdeck>.tdtop,#tdeck>.tdgrid")].map(e=>{ const b=e.getBoundingClientRect(); return {l:b.left, t:b.top, r:b.right, b:b.bottom}; });
      return {coarse:matchMedia("(pointer: coarse)").matches, cab:!!document.querySelector(".fscab.phone.pseudo"), screen:r(".fsscreen"), deck:r("#tdeck"), parts, side:typeof tdSide==="function" && tdSide(), vw:innerWidth, vh:innerHeight}; });
    check("the browser says it's a touch screen (pointer: coarse)", lay.coarse);
    check("the game goes into the phone's cabinet by itself, filling the window", lay.cab);
    check("the screen's minichord is out", !!lay.deck);
    if(lay.screen){
      const s=lay.screen, within=s.l>=-1 && s.t>=-1 && s.r<=lay.vw+1 && s.b<=lay.vh+1;
      check("the game's screen is all on the phone's screen", within, `screen ${Math.round(s.l)},${Math.round(s.t)} to ${Math.round(s.r)},${Math.round(s.b)} in ${lay.vw}×${lay.vh}`);
      check("the game's screen is big enough to play (220px or more each way)", Math.min(s.w, s.h)>=220, `${Math.round(s.w)}×${Math.round(s.h)}`);
      const hit=lay.parts.find(p=>Math.min(p.r,s.r)-Math.max(p.l,s.l)>1 && Math.min(p.b,s.b)-Math.max(p.t,s.t)>1);
      check(`the minichord doesn't lie over the game's screen${lay.side?" (sideways, either side of it)":""}`, !hit, hit ? `overlap at ${Math.round(Math.max(hit.l,s.l))},${Math.round(Math.max(hit.t,s.t))}` : "");
    }
    if(lay.deck){ const d=lay.deck; check("the screen's minichord is all on the screen", d.l>=-1 && d.t>=-1 && d.r<=lay.vw+1 && d.b<=lay.vh+1, `${Math.round(d.l)},${Math.round(d.t)} to ${Math.round(d.r)},${Math.round(d.b)}`); }
    // the title loop's screens, put up in turn
    // Each is held while it's looked at: the loop's own timers would move it on (into the demo, on a
    // busy machine) before the look was done.
    const hold=()=>ev(()=>{ const b=__sb.arcade; clearTimeout(b.cabT); clearTimeout(b.attract); });
    const stage=async(s, wait)=>{ await ev(s=>{ const b=__sb.arcade; if(b.phase==="demo") b.overlay.closest(".field")?.querySelector(".demoskip")?.click(); cabStage(b.overlay, s); }, s); await hold(); await sleep(wait); await hold(); };
    const css=await ev(()=>[...document.querySelectorAll('link[rel="stylesheet"]')].filter(l=>!l.sheet).map(l=>l.getAttribute("href")));
    check("every stylesheet loaded", !css.length, css.join(", "));
    await stage("title", 500); await snap("title");
    await stage("rules", 3500); await snap("rules", {skipClip:[".cab-rules"]});
    await stage("points", 1200); await snap("points");
    if(await ev(()=>powersFor(cabKind()).length>0)){ await stage("powers", 1500); await snap("power-ups"); }
    await stage("scores", 1200); await snap("high scores");
    // a tap on the screen wakes it
    let woke=false, taps=0;
    while(!woke && taps<3){ await stage("title", 400); taps++;
      await tap(".fsscreen") || await tap(".field.arcade"); await sleep(500);
      woke=await ev(()=>__sb.arcade.overlay.dataset.stage==="options"); }
    await hold();
    check("a tap on the screen brings up the options", woke, taps>1 ? `after ${taps} taps` : "");
    await snap("options");
    // CHOOSE A LEVEL, by a finger
    const go=await tap(".cab-optpage .go", "CHOOSE A LEVEL"); await sleep(400);
    check("CHOOSE A LEVEL can be tapped", go && await ev(()=>__sb.arcade.overlay.dataset.optpage==="levels"));
    await snap("levels");
    const lv=await tap(".cab-levelpage .levels button:not(:disabled)", "Level 1"); await sleep(2500);
    check("level 1 can be tapped, and the game starts", lv && await ev(()=>__sb.arcade.phase==="play"), await ev(()=>__sb.arcade.phase));
    await snap("playing");
    // the screen's minichord, played: a chord, and the harp if this game has one
    const before=await ev(()=>({...window.__vm}));
    if(await ev(()=>!!document.querySelector("#tdeck .tdcell"))){
      await tap('#tdeck .tdcell[data-r="1"][data-c="1"]'); await sleep(150);
      check("a chord button on the screen plays its chord", await ev(n=>window.__vm.press>n, before.press));
    }
    if(await ev(()=>!!document.querySelector("#tdeck .tdharp"))){
      await tap("#tdeck .tdharp"); await sleep(150);
      check("a harp string on the screen plucks", await ev(n=>window.__vm.pluck>n, before.pluck));
    }
  }
}

// ---------- the report ----------
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
function report(jobs, meta){
  const count=(j,sev)=>j.states.reduce((a,s)=>a+s.findings.filter(f=>f.sev===sev).length,0) + (sev==="error" ? j.checks.filter(c=>!c.ok).length+j.errors.length : j.notes.length);
  const phones=[...new Set(jobs.map(j=>j.phone))], pages=[...new Set(jobs.map(j=>j.page))];
  const cell=j=>{ if(!j) return "<td></td>"; const e=count(j,"error"), w=count(j,"warn");
    return `<td class="${e?"bad":w?"meh":"ok"}"><a href="#${j.id}">${e?`${e} ✗`:""} ${w?`${w} !`:""}${!e&&!w?"✓":""}</a></td>`; };
  const shot=(j,s)=>{
    const boxes=s.findings.filter(f=>f.box).map(f=>`<rect class="${f.sev}" x="${f.box[0]}" y="${f.box[1]}" width="${Math.max(2,f.box[2])}" height="${Math.max(2,f.box[3])}"><title>${esc(f.msg)}${f.text?" — "+esc(f.text):""}</title></rect>`).join("");
    return `<figure><div class="shot"><img src="shots/${s.file}" data-dpr="${j.dpr}" loading="lazy" alt=""><svg data-file="${s.file}">${boxes}</svg></div><figcaption>${esc(s.name)}</figcaption></figure>`;
  };
  const list=s=>{
    if(!s.findings.length) return "";
    const groups=new Map(); for(const f of s.findings){ const k=f.sev+f.kind+f.msg.replace(/[\d.]+/g,"#"); if(!groups.has(k)) groups.set(k,{...f, n:0, texts:new Set()}); const g=groups.get(k); g.n++; if(f.text) g.texts.add(f.text); }
    return `<h4>${esc(s.name)}</h4><ul>`+[...groups.values()].sort((a,b)=>(a.sev==="error"?0:1)-(b.sev==="error"?0:1)).map(g=>`<li class="${g.sev}"><b>${g.sev==="error"?"✗":"!"} ${esc(g.kind)}</b> ${esc(g.msg)}${g.n>1?` <i>×${g.n}</i>`:""}<br><code>${esc(g.sel)}</code>${g.texts.size?` <q>${[...g.texts].slice(0,3).map(esc).join("</q> <q>")}</q>`:""}${g.culprits?`<br>${g.culprits.map(esc).join("<br>")}`:""}</li>`).join("")+"</ul>";
  };
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arcade on iPhones</title><style>
:root{--bg:#fff;--ink:#1d1b22;--mute:#666;--line:#ddd;--err:#c62828;--warn:#d98b00;--ok:#2e7d32}
@media (prefers-color-scheme:dark){:root{--bg:#141218;--ink:#ece8f2;--mute:#9a95a5;--line:#333;--err:#ff6b6b;--warn:#ffb74d;--ok:#81c784}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif}
table{border-collapse:collapse;margin:12px 0;font-size:12px}td,th{border:1px solid var(--line);padding:4px 8px;text-align:center}th{font-weight:600}td a{color:inherit;text-decoration:none;display:block}
td.bad{background:color-mix(in srgb,var(--err) 22%,transparent)}td.meh{background:color-mix(in srgb,var(--warn) 18%,transparent)}td.ok{color:var(--ok)}
section{border-top:2px solid var(--line);margin-top:28px;padding-top:8px}.shots{display:flex;flex-wrap:wrap;gap:12px}
figure{margin:0}figcaption{font-size:12px;color:var(--mute);text-align:center}.shot{position:relative;border:1px solid var(--line);line-height:0}
.shot img{width:${meta.thumb}px;height:auto}.shot svg{position:absolute;inset:0;width:100%;height:100%}
rect{fill:none;stroke-width:2;vector-effect:non-scaling-stroke}rect.error{stroke:var(--err);fill:color-mix(in srgb,var(--err) 15%,transparent)}rect.warn{stroke:var(--warn)}
body.errors-only rect.warn,body.errors-only li.warn{display:none}
li.error b{color:var(--err)}li.warn b{color:var(--warn)}code{font-size:11px;color:var(--mute)}q{font-size:12px}.checks li.fail{color:var(--err)}.checks li.pass{color:var(--ok)}
</style></head><body><h1>The arcade on iPhones</h1>
<p>${esc(meta.engine)} · ${new Date(meta.when).toLocaleString()} · ${jobs.length} pages · ✗ errors (broken), ! warnings (to look over). Boxes on the screens mark what was found; hover one for what. <label><input type="checkbox" onchange="document.body.classList.toggle('errors-only',this.checked)"> errors only</label></p>
<table><tr><th></th>${phones.map(p=>`<th>${esc(p)}</th>`).join("")}</tr>${pages.map(pg=>`<tr><th>${esc(pg)}</th>${phones.map(ph=>cell(jobs.find(j=>j.phone===ph&&j.page===pg))).join("")}</tr>`).join("")}</table>
${jobs.map(j=>`<section id="${j.id}"><h2>${esc(j.page)} · ${esc(j.phone)}</h2>
${j.checks.length?`<ul class="checks">${j.checks.map(c=>`<li class="${c.ok?"pass":"fail"}">${c.ok?"✓":"✗"} ${esc(c.name)}${c.detail?` <code>${esc(c.detail)}</code>`:""}</li>`).join("")}</ul>`:""}
${j.notes.length?`<ul>${j.notes.map(n=>`<li class="warn"><b>! reach</b> ${esc(n)}</li>`).join("")}</ul>`:""}
${j.errors.length?`<ul>${j.errors.map(e=>`<li class="error"><b>✗ script</b> ${esc(e)}</li>`).join("")}</ul>`:""}
<div class="shots">${j.states.map(s=>shot(j,s)).join("")}</div>${j.states.map(list).join("")}</section>`).join("")}
<script>
// the boxes are in the page's CSS pixels; each screenshot is drawn smaller, so the box layer takes the page's size
document.querySelectorAll(".shot img").forEach(img=>{ const set=()=>{ const svg=img.nextElementSibling; svg.setAttribute("viewBox","0 0 "+img.naturalWidth/img.dataset.dpr+" "+img.naturalHeight/img.dataset.dpr); }; img.complete?set():img.addEventListener("load",set); });
</script></body></html>`;
  fs.writeFileSync(path.join(OUT,"index.html"), html);
}

// ---------- the run ----------
(async()=>{
  const args=process.argv.slice(2), flag=f=>args.includes(f), opt=k=>{ const i=args.indexOf(k); return i>=0 ? args[i+1] : null; };
  const jobsN=+((args.find(a=>/^-j\d+$/.test(a))||"-j3").slice(2));
  const engine=opt("--engine")||"chrome";
  const used=new Set([opt("--engine"), opt("--devices"), opt("--site")].filter(Boolean));
  const words=args.filter(a=>!a.startsWith("-") && !used.has(a));
  const keys= flag("--quick") ? ["15"] : (opt("--devices")||"se,mini,15,max").split(",");
  for(const k of keys) if(!PHONES[k]){ console.error(`no phone "${k}": ${Object.keys(PHONES).join(", ")}`); process.exit(2); }
  const ways= flag("--portrait") ? ["portrait"] : flag("--landscape") ? ["landscape"] : ["portrait","landscape"];
  const pages=["lobby", ...GAMES].filter(p=>!words.length || words.some(w=>p.includes(w)));
  fs.rmSync(OUT,{recursive:true, force:true}); fs.mkdirSync(path.join(OUT,"shots"),{recursive:true});

  const srv=await serve(), base=`http://127.0.0.1:${srv.address().port}`;
  let browser, wk;
  if(engine==="webkit"){ wk=await webkitServer(); browser=await webkit.connect(wk.ws); }
  else browser=await chromium.launch({channel:"chrome"});
  const meta={engine:`${engine==="webkit"?"WebKit":"Chrome"} ${browser.version()}`, when:Date.now(), thumb:220};

  const todo=[]; for(const k of keys) for(const w of ways) for(const p of pages) todo.push({em:emulation(k, w, flag("--home")), page:p});
  console.log(`${todo.length} pages (${pages.length} on ${keys.length} phone${keys.length>1?"s":""}, ${ways.join(" and ")}), ${jobsN} at a time, in ${meta.engine}`);
  const done=[]; let next=0; const t0=Date.now();
  await Promise.all(Array.from({length:Math.min(jobsN,todo.length)}, async()=>{
    while(next<todo.length){ const {em, page}=todo[next++];
      const j=await runJob(browser, base, em, page); j.dpr=SHARP ? em.context.deviceScaleFactor : 1; done.push(j);
      const e=j.states.reduce((a,s)=>a+s.findings.filter(f=>f.sev==="error").length,0)+j.checks.filter(c=>!c.ok).length+j.errors.length;
      const w=j.states.reduce((a,s)=>a+s.findings.filter(f=>f.sev==="warn").length,0);
      console.log(`${e?"✗":"✓"} ${j.page.padEnd(18)} ${j.phone.padEnd(32)} ${e} error${e===1?"":"s"}, ${w} warning${w===1?"":"s"}`);
      j.checks.filter(c=>!c.ok).forEach(c=>console.log(`    ✗ ${c.name}${c.detail?`  (${c.detail})`:""}`));
      j.errors.slice(0,3).forEach(x=>console.log(`    ✗ ${x}`));
      j.notes.forEach(x=>console.log(`    ! ${x}`)); } }));
  // the report keeps the order asked for, page by page
  const order=new Map(todo.map((t,i)=>[`${slugify(t.em.label)}--${t.page}`, i])); done.sort((a,b)=>order.get(a.id)-order.get(b.id));
  report(done, meta);
  // the problems most often met, across every page and phone
  const tally=new Map(); for(const j of done) for(const s of j.states) for(const f of s.findings){ const k=`${f.sev==="error"?"✗":"!"} ${f.kind}: ${f.sel}`; const t=tally.get(k)||{screens:new Set(), pages:new Set(), phones:new Set(), ex:f.msg}; t.screens.add(j.id+s.name); t.pages.add(j.page); t.phones.add(j.phone); tally.set(k,t); }
  const top=[...tally.entries()].sort((a,b)=>(a[0][0]==="✗"?-1e6:0)+(b[0][0]==="✗"?1e6:0)+b[1].screens.size-a[1].screens.size).slice(0,20);
  if(top.length) console.log("\nmet most often:\n"+top.map(([k,t])=>`  ${k}\n      on ${t.screens.size} screen${t.screens.size>1?"s":""}, ${t.pages.size} page${t.pages.size>1?"s":""}, ${t.phones.size} phone${t.phones.size>1?"s":""} way${t.phones.size>1?"s":""} up: ${t.ex}`).join("\n"));
  fs.writeFileSync(path.join(OUT,"findings.json"), JSON.stringify({meta, pages:done}, null, 1));
  const bad=done.filter(j=>j.checks.some(c=>!c.ok) || j.errors.length || j.states.some(s=>s.findings.some(f=>f.sev==="error"))).length;
  console.log(`\n${done.length-bad} of ${done.length} pages without errors in ${Math.round((Date.now()-t0)/1000)}s\nreport: ${path.relative(process.cwd(), path.join(OUT,"index.html"))}`);
  await browser.close(); srv.close(); wk && wk.stop();
  process.exit(bad?1:0);
})();
