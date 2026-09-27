// Light or dark: the page follows the system until you choose, then remembers your choice
// for every page of the Lab. Loaded in each page's <head>, so a saved choice applies before
// anything is drawn; the button goes in the top bar (or the front page's header).
(()=>{
  const KEY="minichord-lab-theme", root=document.documentElement, media=matchMedia("(prefers-color-scheme: dark)");
  let saved=null; try{ saved=localStorage.getItem(KEY); }catch(e){}
  if(saved==="dark" || saved==="light") root.dataset.theme=saved;
  const isDark=()=> root.dataset.theme ? root.dataset.theme==="dark" : media.matches;
  function makeButton(){
    const b=document.createElement("button"); b.type="button"; b.className="themetoggle";
    const label=()=>{ const d=isDark(); b.textContent = d ? "☀ Light" : "☾ Dark"; b.title = d ? "Switch to light mode" : "Switch to dark mode"; b.setAttribute("aria-label", b.title); };
    b.onclick=()=>{
      const next = isDark() ? "light" : "dark"; root.dataset.theme=next;
      try{ localStorage.setItem(KEY,next); }catch(e){}
      label(); window.dispatchEvent(new CustomEvent("themechange",{detail:next}));   // for pages that paint with the colours
    };
    media.addEventListener("change", label); label();
    return b;
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    const host=document.querySelector(".labbar .connect") || document.querySelector(".fallboard");
    if(!host) return;
    const b=makeButton();
    if(host.classList.contains("fallboard")){ b.classList.add("onboard"); host.appendChild(b); } else host.prepend(b);
  });
})();
