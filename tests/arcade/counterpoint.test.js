// core/counterpoint.js, on its own (no page): Choir's parallels, kept as they were when they moved
// there; intervals counted by degree within the mode; how two voices move; the species rules, each
// caught where it happens and nowhere else; and the solver, whose counterpoints break no rule.
const path=require("path"), {pathToFileURL}=require("url");
(async()=>{
  const C=await import(pathToFileURL(path.resolve(__dirname,"../../core/counterpoint.js")).href);
  const results=[];
  const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
  const m=C.midiOf, D=C.MODES.dorian;

  // ---------- Choir's parallels ----------
  const map=o=>new Map(Object.entries(o).map(([k,v])=>[k,v]));
  const kinds=(a,b)=>C.findParallels(map(a),map(b)).map(f=>`${f.a}${f.b}${f.kind}`).join(" ");
  check("parallel fifths", kinds({b:48,s:55},{b:50,s:57})==="bsP5");
  check("parallel octaves, an octave apart and two", kinds({b:48,s:60},{b:50,s:74})==="bsP8");
  check("contrary motion into a fifth is no parallel", kinds({b:48,s:57},{b:50,s:55})==="");
  check("a voice holding is no parallel", kinds({b:48,s:55},{b:48,s:57})==="");
  check("outer voices into a fifth, the top leaping: direct", kinds({b:48,t:55,s:64},{b:50,t:53,s:69})==="bsH5", kinds({b:48,t:55,s:64},{b:50,t:53,s:69}));
  check("the top stepping into it: not direct", kinds({b:48,s:56},{b:50,s:57})==="");
  check("an inner pair isn't held to the direct rule", kinds({b:40,t:48,a:59,s:72},{b:41,t:50,a:62,s:76})==="", kinds({b:40,t:48,a:59,s:72},{b:41,t:50,a:62,s:76}));

  // ---------- intervals ----------
  const name=(a,b)=>C.interval(D,m(a),m(b)).name, cls=(a,b)=>C.interval(D,m(a),m(b)).class;
  check("D–A a perfect fifth", name("D4","A4")==="P5" && cls("D4","A4")==="perfect");
  check("B–F a diminished fifth, F–B an augmented fourth", name("B3","F4")==="d5" && name("F4","B4")==="A4");
  check("C♯–G (ficta) a diminished fifth", name("C#4","G4")==="d5");
  check("F–C♯ an augmented fifth, though it sounds a minor sixth", name("F4","C#5")==="A5" && cls("F4","C#5")==="dissonant");
  check("the fourth is a dissonance", cls("D4","G4")==="dissonant");
  check("sixths and thirds imperfect, compounds too", cls("E4","C5")==="imperfect" && name("D4","F5")==="m10" && cls("D4","F5")==="imperfect");
  check("the twelfth perfect", name("D3","A4")==="P12" && cls("D3","A4")==="perfect");
  check("either order", name("A4","D4")==="P5");
  check("motion", C.motion(60,62,67,65)==="contrary" && C.motion(60,62,67,67)==="oblique" && C.motion(60,62,67,69)==="parallel" && C.motion(60,62,67,71)==="similar");
  check("the harp's strings, in the mode", C.modeWindow(D,m("D4")).join()==="62,64,65,67,69,71,72,74,76,77,79,81");

  // ---------- the first species ----------
  const cantus=C.CANTUS[0].cantus;                                      // D F E D G F A G F E D
  const rules=(cp, o={})=>C.check({cantus, cp, mode:D, ...o}).filter(f=>f.severity!=="praise");
  const at=(fs,rule)=>fs.filter(f=>f.rule===rule).map(f=>f.bar).join();
  const good=[74,72,67,71,76,74,72,71,69,73,74];                          // the solver's, checked by hand
  check("a clean line has nothing forbidden", !rules(good).some(C.forbidden), rules(good).map(f=>f.rule).join());
  check("contrary motion is praised", C.check({cantus, cp:good, mode:D}).some(f=>f.rule==="contrary"));
  { const cp=good.slice(); cp[3]=69; cp[4]=74;                           // D4/A4 to G4/D5: fifth to fifth
    check("parallel fifths, at the bar they arrive", at(rules(cp),"parallel5")==="4", rules(cp).map(f=>f.rule+f.bar).join()); }
  { const cp=good.slice(); cp[9]=72;                                     // C♮ under the cadence: a minor sixth
    check("no ficta, no cadence", at(rules(cp),"cadence")==="9"); }
  check("the raised seventh only at the cadence", at(rules([74,72,67,71,76,74,72,71,69,73,74].map((p,i)=>i===2?66:p)),"chromatic")==="2");
  check("ending off the octave", at(rules(good.slice(0,10).concat([77])),"end")==="10");
  check("below, a fifth won't do to begin", at(rules([55].concat([57,55,53,52,53,60,59,57,61,62]),{above:false}),"start")==="0");
  { const cp=good.slice(); cp[4]=74;                                     // D4/B4 to G4/D5: up together into a fifth
    check("similar motion into a fifth is direct", at(rules(cp),"direct")==="4", rules(cp).map(f=>f.rule+f.bar).join()); }
  { const cp=good.slice(); cp[5]=81; cp[6]=81;                          // a leap up a fifth, then held
    check("a leap not turned back from", at(rules(cp),"unrecovered").includes("5"), rules(cp).map(f=>f.rule+f.bar).join()); }
  { const cp=good.slice(); cp[2]=62;                                     // below the cantus's E
    check("crossing", at(rules(cp),"crossing")==="2"); }
  { const cp=good.slice(); cp[1]=71;                                     // F4 under B4: an augmented fourth, and a sixth leap
    check("a dissonance", at(rules(cp),"dissonance")==="1"); }
  { const cp=good.slice(); cp[2]=76;                                     // the line's top note, E5, twice
    check("two highest notes", rules(cp).some(f=>f.rule==="climax")); }
  check("a line part-written is judged as far as it goes", !C.check({cantus, cp:good.slice(0,5), mode:D}).some(f=>f.rule==="end" || f.rule==="cadence" || f.rule==="climax"));

  // ---------- the second species ----------
  const two=[[62,65],[69,71],[72,67],[71,74],[76,79],[81,77],[76,77],[79,76],[74,69],[71,73],[74]];
  const rules2=cp=>C.check({cantus, cp, mode:D, species:2}).filter(f=>f.severity!=="praise");
  check("a clean second-species line", !rules2(two).some(C.forbidden), rules2(two).map(f=>f.rule+f.bar).join());
  { const cp=two.map(b=>b.slice()); cp[4]=[76,77]; cp[5]=[79,77];       // F5 over G4, a seventh, between E5 and G5
    check("a passing dissonance on the upbeat is allowed", !rules2(cp).some(f=>f.rule==="passing" && f.bar===4), rules2(cp).map(f=>f.rule+f.bar).join()); }
  { const cp=two.map(b=>b.slice()); cp[2]=[72,74];                       // D5 over E4, left by leap
    check("an upbeat dissonance that leaps away doesn't pass", at(rules2(cp),"passing")==="2", rules2(cp).map(f=>f.rule+f.bar).join()); }
  { const cp=two.map(b=>b.slice()); cp[1]=[67,71];                       // G4 over F4 on the downbeat
    check("a downbeat dissonance", at(rules2(cp),"dissonance")==="1"); }
  check("an open half rest", !C.check({cantus, cp:[[null,69]].concat(two.slice(1)), mode:D, species:2}).some(f=>f.rule==="start"));
  { const cp=two.map(b=>b.slice()); cp[0]=[62,62];
    check("a repeated note is a fault here", rules2(cp).some(f=>f.rule==="repeat" && f.severity==="fault")); }

  // ---------- the fourth species: suspensions ----------
  const rules4=(cp, above=true)=>C.check({cantus, cp, mode:D, species:4, above}).filter(f=>f.severity!=="praise");
  const four=[[null,69],[69,74],[74,72],[72,71],[71,74],[74,81],[81,77],[77,76],[76,74],[74,73],[74]];   // 7–6s, checked by hand
  check("a line of tied suspensions has nothing forbidden, and its ties aren't repeats", !rules4(four).some(C.forbidden) && !rules4(four).some(f=>f.rule==="repeat"), rules4(four).map(f=>f.rule+f.bar).join());
  check("each 7–6 resolved is praised", C.check({cantus, cp:four, mode:D, species:4}).filter(f=>f.rule==="suspended").length>=4);
  check("a suspension stepping up doesn't resolve", at(rules4([[null,69],[69,74],[74,76]]),"resolution")==="2");
  check("nor one waiting for its resolution, yet", !rules4([[null,69],[69,74],[74]]).some(f=>f.rule==="resolution"));
  check("2–1 above the cantus isn't allowed", at(rules4([[null,69],[69,65],[65,64]]),"suspension")==="2");
  check("nor 7–8 below it", at(rules4([[null,50],[50,53],[53,55]],false),"suspension")==="2");
  check("fifths on successive upbeats", at(rules4([[null,69],[69,72],[72,74]]),"upbeats")==="1");
  check("a tie broken is noted, no more", rules4([[null,69],[69,74],[72,71]]).map(f=>f.rule+f.bar).join()==="untied2", rules4([[null,69],[69,74],[72,71]]).map(f=>f.rule+f.bar).join());

  // ---------- the solver ----------
  const clean=(c,o)=>{ const cp=C.solve({cantus:c.cantus, mode:C.MODES[c.mode], ...o, pitches:C.harpWindow(C.MODES[c.mode],c.cantus,o.above)});
    return cp && !C.check({cantus:c.cantus, cp, mode:C.MODES[c.mode], ...o}).some(C.forbidden) && cp.flat().every(p=>C.harpWindow(C.MODES[c.mode],c.cantus,o.above).includes(p) || C.degree(C.MODES[c.mode],p).alt); };
  for(const c of C.CANTUS) check(`first species in ${c.mode}, above and below`, clean(c,{species:1, above:true}) && clean(c,{species:1, above:false}));
  check("fourth species in every mode, above and below (the window moved down where it must)", C.CANTUS.every(c=>[true,false].every(above=>{ const mode=C.MODES[c.mode];
    for(let sh=0;sh<=2;sh++){ const cp=C.solve({cantus:c.cantus, mode, species:4, above, pitches:C.harpWindow(mode,c.cantus,above,sh)}); if(cp) return !C.check({cantus:c.cantus, cp, mode, species:4, above}).some(C.forbidden) && cp[0][0]===null; }
    return false; })));
  check("second species, Dorian above and Ionian below", clean(C.CANTUS[0],{species:2, above:true}) && clean(C.CANTUS[5],{species:2, above:false}));
  check("the penultimate bar whole when two notes won't go (Aeolian above)", (()=>{ const c=C.CANTUS[4], cp=C.solve({cantus:c.cantus, mode:C.MODES.aeolian, species:2, above:true, pitches:C.harpWindow(C.MODES.aeolian,c.cantus,true)}); return cp && cp[cp.length-2].length===1; })());
  { const o={cantus, mode:D, pitches:C.harpWindow(D,cantus,true)};
    check("the same seed, the same line; another, another", JSON.stringify(C.solve({...o,seed:3}))===JSON.stringify(C.solve({...o,seed:3})) && JSON.stringify(C.solve({...o,seed:3}))!==JSON.stringify(C.solve({...o,seed:4}))); }

  const bad=results.filter(x=>!x).length;
  console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`);
  process.exit(bad?1:0);
})();
