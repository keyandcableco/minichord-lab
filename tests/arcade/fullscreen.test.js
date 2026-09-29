// Full screen is a cabinet: the game's field moves into a frame with the marquee, the bezel and its
// nameplate, in CRT; where the browser can't go full screen, the cabinet fills the window instead;
// and leaving puts the field back where it was, the CRT as the player had it.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {d, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const field=d.querySelector(".field.arcade"), home=field.parentNode;
  field.querySelector(".fullbtn").click(); await sleep(100);
  const cab=d.querySelector(".fscab");
  check("full screen builds a cabinet round the game", cab && cab.querySelector(".fsscreen > .field")===field && /CHORD SNAKE/.test(cab.querySelector(".fsmarquee").textContent) && cab.querySelector(".fsplate"));
  check("in CRT", field.classList.contains("crt"));
  check("where the browser can't go full screen, it fills the window", cab && cab.classList.contains("pseudo"));
  check("the bezel says the minichord's connected", /MINICHORD CONNECTED/.test(cab.querySelector(".fsconn").textContent));
  const was=t.w.eval("settings.sounds"); cab.querySelector(".fsmute").click(); await sleep(30);
  check("the bezel's SOUND switches the sound", t.w.eval("settings.sounds")===!was); cab.querySelector(".fsmute").click();
  cab.querySelector(".fsreset").click(); await sleep(5800);
  const nf=t.d.querySelector(".fscab .fsscreen > .field.arcade");
  check("the bezel's RESET starts afresh, still in the cabinet", nf && nf!==field && t.w.eval("blast.field")===nf);
  nf.querySelector(".fullbtn").click(); await sleep(100);
  check("leaving puts the game back where the page keeps it", !d.querySelector(".fscab") && nf.parentNode===home && !nf.classList.contains("crt"));
  t.done(); return;
  field.querySelector(".fullbtn").click(); await sleep(100);
  check("leaving puts the game back where it was", !d.querySelector(".fscab") && field.parentNode===home && !field.classList.contains("crt"));
  t.done();
})();
