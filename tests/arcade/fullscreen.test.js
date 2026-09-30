// Full screen is a cabinet: the game's field moves into a frame with the marquee, the bezel and its
// nameplate, in CRT; where the browser can't go full screen, the cabinet fills the window instead;
// and leaving puts the field back where it was, the CRT as the player had it.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {d, w, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const field=d.querySelector(".field.arcade"), home=field.parentNode;
  const btn=d.querySelector("#fullBtn");
  check("SCREEN is a console button beside SOUND and RESET", !!btn && btn.closest(".nesbtn") && /SCREEN/.test(btn.closest(".nesbtn").textContent) && !field.querySelector(".fullbtn"));
  btn.click(); await sleep(100);
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
  check("the bezel has SCREEN too", !!d.querySelector(".fscab .fsfull"));
  d.querySelector(".fscab .fsfull").click(); await sleep(100);
  check("leaving by the bezel's SCREEN puts the game back where the page keeps it", !d.querySelector(".fscab") && nf.parentNode===home && !nf.classList.contains("crt"));
  // F2 always works; F only when the keyboard isn't the instrument, where F is its D minor button
  w.eval("keyboardMinichord(false)"); await sleep(40); w.eval("fullLabels()");
  const how=()=>d.querySelector("#fullBtn").title;
  check("with a minichord, full screen is on F or F2", /F or F2/.test(how()), how());
  w.eval("keyboardMinichord(true)"); await sleep(60);
  check("with the keyboard as the instrument, only F2, since F is a chord button", /\(F2\)/.test(how()) && !/F or/.test(how()), how());
  const before=w.eval("(window.__kbHeardF=0, mc.addEventListener('chord',()=>window.__kbHeardF++), 0)");
  t.key("KeyF"); await sleep(80);
  check("and F plays that chord", w.eval("window.__kbHeardF")>0);
  w.eval("keyboardMinichord(false)"); await sleep(40);
  t.done();
})();
