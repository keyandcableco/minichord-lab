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
  field.querySelector(".fullbtn").click(); await sleep(100);
  check("leaving puts the game back where it was", !d.querySelector(".fscab") && field.parentNode===home && !field.classList.contains("crt"));
  t.done();
})();
