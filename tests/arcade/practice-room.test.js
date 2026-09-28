// The Practice Room itself, around the arcade: it opens, and every one of its games can be chosen and
// dealt a round without a script error.
const t=require("./harness").load("");
(async()=>{
  const {d, sleep, check}=t;
  await sleep(200); t.connect(); await sleep(100);
  const errors=[]; t.w.addEventListener("error", e=>errors.push(e.message));
  const modes=[...d.querySelectorAll(".modes button[data-mode]")].map(b=>b.dataset.mode), bad=[];
  for(const m of modes){ d.querySelector(`.modes button[data-mode="${m}"]`).click(); await sleep(60);
    const n=d.getElementById("next"); if(n && !n.hidden) n.click(); await sleep(40);
    if(errors.length){ bad.push(`${m}: ${errors[0]}`); errors.length=0; } }
  check(`all ${modes.length} of its games open and deal a round`, modes.length>30 && !bad.length, bad.join("; "));
  t.done();
})();
