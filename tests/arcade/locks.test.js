// The locks (the fork's firmware 76): a locked setting borrowed by a game is written down, locked
// again as it's given back, and put back on the next visit if a page died before giving it back.
const t=require("./harness").load("key-fleet");
(async()=>{
  const {sleep, check, mc, w, writes, d}=t;
  await sleep(150);
  t.connect({firmware:76, key:0, pushPop:true, locks:[244,384,109,241,242,243,35]});
  await sleep(100);
  mc.requestLocks(); await sleep(30);
  check("a firmware 76 minichord's locks are read", mc.locked(35) && mc.locked(109) && !mc.locked(30), [...(mc.locks||[])].join(","));
  // a game borrows the locked key signature
  writes.length=0;
  w.borrow(35, 3); await sleep(20);
  const note=JSON.parse(w.localStorage.getItem("lab-locked-borrows")||"{}");
  check("borrowing a locked setting writes it down with the value it had", note["35"]===0, JSON.stringify(note));
  check("the strip says it is locked and comes back after", d.getElementById("myInfo").textContent.includes("key signature (locked"), d.getElementById("myInfo").textContent);
  w.restoreAll(); await sleep(40);
  check("giving it back locks it again at once", writes.some(([a,v])=>a===385 && v===35), JSON.stringify(writes.filter(([a])=>a===385)));
  check("and clears the note", !w.localStorage.getItem("lab-locked-borrows"));
  // a page that died: a note left behind, and the lock holding the game's value
  w.localStorage.setItem("lab-locked-borrows", JSON.stringify({35:0, 109:4400}));
  mc.params[35]=3; mc.params[109]=4400; writes.length=0;
  mc.dispatchEvent(new w.Event("locks")); await sleep(20);
  check("a leftover note puts the setting back and locks it again", writes.some(([a,v])=>a===35 && v===0) && writes.some(([a,v])=>a===385 && v===35), JSON.stringify(writes));
  check("one the lock already holds as noted is left alone", !writes.some(([a])=>a===109));
  check("and the room says so", d.getElementById("status").textContent.includes("earlier game"), d.getElementById("status").textContent);
  check("the note is gone", !w.localStorage.getItem("lab-locked-borrows"));
  // older firmware: nothing is locked, nothing is noted
  t.connect({firmware:17, key:0, pushPop:true});
  await sleep(50); mc.locks=null;
  w.borrow(35, 2); await sleep(20);
  check("on older firmware nothing is written down", !w.localStorage.getItem("lab-locked-borrows"));
  w.restoreAll(); await sleep(20);
  t.done();
})();
