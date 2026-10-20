// Each string its own note while a game reads the harp: the harp ribbon (245) off, hammer-on (302,
// firmware 51 on) off, melodic pads (446, the drum pads' 28 places as 28 notes, firmware 105 on) off,
// and the harp fader (424, firmware 108 on, which makes the harp play no notes) off. Those on the second
// page of settings are set when that page comes in after the game has set the harp up, and again when a
// preset loaded mid-game brings them back on (that preset's values then what's given back); all given
// back after, and not set again after "Put my settings back". None written on a firmware without it,
// whatever its second page reports there; 424 is xy pad y before 108, the xy pad's own, and left alone.
const t=require("./harness");
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
// the instrument's own second page: what it holds at these addresses, put into the page it sends
const pageOf=(mc, own)=>{ const dump0=mc._dump.bind(mc);
  mc._dump=m=>{ if(m[1]===0x7D && m[2]===0x6D && m[3]===1) for(const [a,v] of Object.entries(own)){ m[4+2*(a-256)]=v&127; m[5+2*(a-256)]=v>>7; } dump0(m); }; };
(async()=>{
  { // ---- the drum pads on firmware 107: the ribbon, hammer-on and melodic pads on, xy pad y set
    const T=t.load("chord-snake"), {w, mc, sb, sleep, writes}=T;
    await sleep(150);
    const own={446:1, 302:1, 424:49}; pageOf(mc, own);
    T.connect({firmware:107, extra:{243:13, 245:1, 246:13}}); await sleep(100);
    await T.start(0); await sleep(300);
    const wrote=a=>writes.filter(([x])=>x===a).map(([,v])=>v);
    check("the harp ribbon off for the game", mc.params[245]===0 && wrote(245).includes(0), `245=${mc.params[245]}`);
    check("its span left as it is", mc.params[246]===13 && !wrote(246).length);
    check("the second page not in yet: nothing written there", !writes.some(([a])=>a>=256) && mc.params[446]===undefined, JSON.stringify(writes.filter(([a])=>a>=256)));
    mc.requestPage1(); await sleep(40);
    check("the second page in: melodic pads and hammer-on off", mc.params[446]===0 && wrote(446).includes(0) && mc.params[302]===0 && wrote(302).includes(0), `446=${mc.params[446]} 302=${mc.params[302]}`);
    check("firmware 107: 424 is xy pad y, the xy pad's own, left alone", mc.params[424]===49 && !wrote(424).length);
    // a preset loaded mid-game: page 0 reported unasked with a lot changed, then page 1 read again
    writes.length=0;
    Object.assign(mc.params, {245:1, 21:1, 111:1, 199:300});
    mc.unasked=true; mc.changed=new Set([245,21,111,199,184]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set();
    await sleep(20);
    check("a preset loaded: the ribbon off again", mc.params[245]===0 && wrote(245).includes(0));
    Object.assign(own, {446:1, 302:2}); mc.requestPage1(); await sleep(40);
    check("its page 1 in: melodic pads and hammer-on off again", mc.params[446]===0 && mc.params[302]===0 && wrote(446).includes(0) && wrote(302).includes(0), `446=${mc.params[446]} 302=${mc.params[302]}`);
    check("and the new preset's own values are what's given back", w.eval("borrowed[446]")===1 && w.eval("borrowed[302]")===2, w.eval("JSON.stringify(borrowed)"));
    sb.restoreAll(); await sleep(20);
    check("leaving gives them back", mc.params[245]===1 && mc.params[446]===1 && mc.params[302]===2, `245=${mc.params[245]} 446=${mc.params[446]} 302=${mc.params[302]}`);
  }
  { // ---- piano glide on firmware 110: the harp fader set
    const T=t.load("chord-snake"), {w, mc, sb, sleep, writes}=T;
    await sleep(150);
    pageOf(mc, {424:49, 302:1});
    T.connect({firmware:110, extra:{243:12}}); await sleep(100);
    await T.start(0); await sleep(300);
    mc.requestPage1(); await sleep(40);
    check("firmware 110: the harp fader off, so the harp plays its notes", mc.params[424]===0 && writes.some(([a,v])=>a===424 && v===0), `424=${mc.params[424]}`);
    // "Put my settings back", then page 1 again (a preset loaded, a pop): nothing set again
    w.document.getElementById("restore").click(); await sleep(20);
    check("Put my settings back: the fader and hammer-on back", mc.params[424]===49 && mc.params[302]===1);
    writes.length=0; mc.requestPage1(); await sleep(40);
    check("page 1 in after that: nothing set again", !writes.some(([a])=>a in {40:1, 213:1, 215:1, 216:1, 245:1, 302:1, 424:1, 446:1}) && mc.params[424]===49 && w.eval("!(424 in borrowed) && !(302 in borrowed)"),
      JSON.stringify(writes));
  }
  { // ---- firmware 104: no melodic pads, no harp fader, whatever its second page says there
    const T=t.load("chord-snake"), {mc, sleep, writes}=T;
    await sleep(150);
    pageOf(mc, {446:7, 424:9});
    T.connect({firmware:104, extra:{243:13}}); await sleep(100);
    await T.start(0); await sleep(300);
    mc.requestPage1(); await sleep(40);
    check("firmware 104: 446 and 424 never written", mc.page1===true && !writes.some(([a])=>a===446 || a===424) && mc.params[446]===7 && mc.params[424]===9, `446=${mc.params[446]} 424=${mc.params[424]}`);
  }
  { // ---- firmware 50: no hammer-on
    const T=t.load("chord-snake"), {mc, sleep, writes}=T;
    await sleep(150);
    pageOf(mc, {302:3});
    T.connect({firmware:50}); await sleep(100);
    await T.start(0); await sleep(300);
    mc.requestPage1(); await sleep(40);
    check("firmware 50: 302 never written", mc.page1===true && !writes.some(([a])=>a===302) && mc.params[302]===3, `302=${mc.params[302]}`);
  }
  const bad=results.filter(r=>!r).length;
  console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`);
  process.exit(bad?1:0);
})();
