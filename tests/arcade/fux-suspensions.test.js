// Fux, the fourth species in Two Ships: a note held over the bar line ties; let go first and the tie
// breaks; a tied note that clashes is a suspension, resolved by plucking the string a step down (which
// commits by itself), a wrong one a crash with the suspension still waiting, one left too long a crash
// and its resolution made; LOCK-ON warns of a suspension that can't resolve; and a correct line of
// suspensions written so docks, Aloysius approving.
const t=require("./harness").load("fux");
(async()=>{
  const {w, sleep, check}=t;
  await sleep(200); t.connect({firmware:17}); await sleep(100);
  const L4=w.eval("FU_LEVELS.findIndex(L=>L.ships && L.species===4)");
  const a=await t.start(L4);
  for(let i=0;i<60 && !w.eval("!!blast.ship");i++) await sleep(100);
  const begin=async()=>{ w.eval("newRun(); blast.fuBags={ships:{left:[0]}}; shClear(); blast.lineNo=0; shStart()");   // a fresh run: nothing from the round before reaches it
    for(let i=0;i<120 && !w.eval("blast.ship && blast.ship.ready");i++) await sleep(100); };
  await begin();
  const s=()=>w.eval("blast.ship");
  check("a fourth-species round: Dorian, the counterpoint struck on the upbeat", s() && s().species===4 && s().slots[0].beat===1 && s().slots[1].tie);
  const pluck=p=>w.eval(`(()=>{ const s=blast.ship, i=shWindow(s, s.ficta).indexOf(${p}); mc.lastHarp={note:s.dev[i], ch:0}; fuxNote(i); return i; })()`);
  const letGo=()=>w.eval("(()=>{ const s=blast.ship; mc.dispatchEvent(new CustomEvent('harpoff',{detail:{note:s.dev[s.heldString], ch:0}})); })()");
  const commit=()=>w.eval("shCommit()");
  // a tie broken: struck, let go, committed
  pluck(69); letGo(); commit(); await sleep(50);
  check("let go before committing, and the tie's broken: the downbeat to choose", s().slots[s().at].tie && s().flat.length===1 && /TIE BROKEN/.test(t.heard()), t.heard());
  await begin();
  // LOCK-ON: struck over F, held into E, a note that can't step down to a consonance
  pluck(69); commit(); await sleep(50);                                 // A4 over D4, tied into F4: a third, consonant
  check("held, it ties over the bar line", s().flat.length===2 && s().flat[1]===69 && !s().susp);
  // the solver's line from here on (it begins A4, tied)
  const sol=w.eval(`CP.solve({cantus:blast.ship.cantus, mode:blast.ship.mode, species:4, above:true, pitches:blast.ship.window, seed:3})`);
  const flat=sol.flat().filter(p=>p!=null);
  check("the solver's line starts as this one did", flat[0]===69 && flat[1]===69, flat.slice(0,4).join());
  // a wrong resolution, then a right one, at the first suspension
  let wrongTried=false, lateTried=false, lives=a.lives;
  for(let guard=0; guard<60 && !s().done; guard++){
    const k=s().at, sl=s().slots[k];
    if(sl.tie){ check(`bar ${sl.bar+1}: the tie filled by holding`, false); break; }
    if(s().susp && !wrongTried){
      wrongTried=true;
      const from=w.eval("blast.ship.susp.from"), up=w.eval(`shWindow(blast.ship, blast.ship.ficta).slice().sort((a,b)=>a-b).find(x=>x>${from})`);
      if(up!=null){ pluck(up); await sleep(50);
        check("a suspension resolved the wrong way is a crash, and it still waits", a.lives===lives-1 && !!s().susp && s().at===k, `${a.lives} lives, susp ${!!s().susp}`); lives=a.lives; }
    }
    if(s().susp){ pluck(flat[k]); await sleep(40);
      // resolved, and moved on (where the resolution ties into a new suspension, that one's its own)
      check(`bar ${sl.bar+1}: a suspension resolved by plucking a step down, committed by itself`, (!s().susp || s().susp.bar!==sl.bar) && s().flat[k]===flat[k] && (s().done || s().at>k), `${s().flat[k]} vs ${flat[k]}`);
    } else { pluck(flat[k]); await sleep(20); commit(); await sleep(40); }
  }
  check("a wrong resolution was tried", wrongTried);
  await sleep(200);
  check("the line of suspensions docks, and Aloysius reviews it", s().done && !!t.d.querySelector(".fureview"), t.d.querySelector(".fureview")?.textContent);
  check("its suspensions, resolved, built the combo", s().contrary>=3, String(s().contrary));
  // a suspension left too long
  await begin();
  w.eval("blast.line && 0"); pluck(69); commit(); await sleep(30);
  pluck(flat[2]); commit(); await sleep(30);                             // the solver's next upbeat, held: a suspension coming
  if(s().susp){ const l0=a.lives, bar0=s().susp.bar; w.eval("blast.ship.susp.left=.05"); await sleep(400);
    check("a suspension left too long: a crash, and its resolution made", a.lives===l0-1 && (!s().susp || s().susp.bar!==bar0) && s().flat.length>=5, `${a.lives} lives, ${s().flat.length} written`); }
  else check("a suspension came, to leave too long", false, JSON.stringify(s().flat));
  t.done();
})();
