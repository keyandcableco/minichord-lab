// Light or dark: the page follows the system until you choose, then remembers your choice
// for every page of the Lab. Loaded in each page's <head>, so a saved choice applies before
// anything is drawn; the button goes in the top bar (or the front page's header).
// The choice is a cookie for all of keyandcable.com, shared with the shop's site and minicontrol:
// pick dark on any of them and the others open dark too.
(()=>{
  const KEY="minichord-lab-theme", root=document.documentElement, media=matchMedia("(prefers-color-scheme: dark)");
  const shared=()=>{ const m=document.cookie.match(/(?:^|;\s*)kc-theme=(dark|light)(?:;|$)/); return m?m[1]:null; };
  const save=t=>{
    const domain=/(^|\.)keyandcable\.com$/.test(location.hostname) ? "; domain=keyandcable.com" : "";   // elsewhere (a local copy) the cookie stays on that host
    document.cookie="kc-theme="+t+"; path=/; max-age=31536000; samesite=lax"+domain+(location.protocol==="https:"?"; secure":"");
    try{ localStorage.setItem(KEY,t); }catch(e){}
  };
  let saved=shared();
  if(!saved){   // a choice made in the Lab before the cookie: keep it, and share it from now on
    try{ saved=localStorage.getItem(KEY); }catch(e){}
    if(saved==="dark" || saved==="light") save(saved); else saved=null;
  }
  if(saved) root.dataset.theme=saved;
  const isDark=()=> root.dataset.theme ? root.dataset.theme==="dark" : media.matches;
  function makeButton(){
    const b=document.createElement("button"); b.type="button"; b.className="themetoggle";
    const label=()=>{ const d=isDark(); b.textContent = d ? "☀ Light" : "☾ Dark"; b.title = d ? "Switch to light mode" : "Switch to dark mode"; b.setAttribute("aria-label", b.title); };
    b.onclick=()=>{
      const next = isDark() ? "light" : "dark"; root.dataset.theme=next;
      save(next);
      label(); window.dispatchEvent(new CustomEvent("themechange",{detail:next}));   // for pages that paint with the colours
    };
    media.addEventListener("change", label); label();
    return b;
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    // the top bar, the front page's header, or a page's own marked spot (the choir keeps its own header)
    const host=document.querySelector(".labbar .connect") || document.querySelector(".fallboard") || document.querySelector("[data-theme-host]");
    if(!host) return;
    const b=makeButton();
    if(host.classList.contains("fallboard")){ b.classList.add("onboard"); host.appendChild(b); } else host.prepend(b);
  });
})();
