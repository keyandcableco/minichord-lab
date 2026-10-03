/* ============================================================================
 * tracker.js: the 8b8's nine tone channels and its drums, as a tracker shows
 * them: a scope per channel, and rows scrolling up as they play.
 *
 * Everything is read from the chips' registers, 16 a chip: from the emulator
 * directly, or from the board with its REGS command. A register snapshot
 * says what each channel is doing now (its tone period, its volume or that
 * it follows the envelope, whether tone and noise reach it) and what each
 * chip's noise and envelope generators are set to. The scopes are rebuilt
 * from that with the same model of the chip the emulator runs (squares at
 * clock/16/period, a 17-bit noise LFSR, the sixteen-step envelope and the
 * logarithmic DAC), so they show what the channel sounds like, not a
 * recording of it. The rows note what changed: a new note, a volume, a
 * slide, a note let go, noise and envelope settings, and the drums.
 *
 * Voice v of the 8b8 is channel v/3 of chip v%3: its voices 0, 3 and 6 are
 * chip A's channels 1 to 3, and so on.
 * ========================================================================== */

export const AY_CLOCK = 1e6;            // the 8b8 makes a 1 MHz master clock (Clock Warp moves it)
const STEP_HZ = AY_CLOCK / 8;           // the model steps at clock/8: a tone toggles every `period` steps
const DAC = [0, .0137, .0205, .0291, .0423, .0618, .0847, .1369, .1691, .2647, .3527, .4499, .5704, .6873, .8482, 1];
const LETTERS = ["C-","C#","D-","D#","E-","F-","F#","G-","G#","A-","A#","B-"];
/** the 8b8's drum names, shortened as a tracker would */
export const DRUM_ABBR = {35:"BD1",36:"BD2",37:"STK",38:"SNR",39:"CLV",40:"SN2",41:"LFT",42:"CHH",43:"HFT",44:"PHH",45:"LTM",46:"OHH",
  47:"LMT",48:"HMT",49:"CR1",50:"HTM",51:"RD1",52:"CHN",53:"BEL",54:"TMB",55:"SPL",56:"COW",57:"CR2",58:"VIB",59:"RD2"};

/** a REGS:<96 hex> line as three chips of sixteen registers, or null */
export function parseRegs(line){
  const m=/^REGS:([0-9A-Fa-f]{96})/.exec(line); if(!m) return null;
  return [0,1,2].map(c=>Array.from({length:16}, (_,i)=>parseInt(m[1].substr((c*16+i)*2,2),16)));
}

/**
 * What one snapshot says: nine channels (by 8b8 voice) and three chips.
 * A channel: {period, hz, midi (fractional), vol 0-15, env (follows the envelope), tone, noise, sounding}.
 * A chip: {noise period, env period, shape}.
 */
export function describe(regs){
  const chips=regs.map(r=>({noise:r[6]&31, envPeriod:r[11]|(r[12]<<8), shape:r[13]&15}));
  const chans=Array.from({length:9}, (_,v)=>{
    const r=regs[v%3], c=Math.floor(v/3);
    const period=(r[c*2]|((r[c*2+1]&15)<<8))||1;
    const tone=!((r[7]>>c)&1), noise=!((r[7]>>(c+3))&1);
    const env=!!(r[8+c]&16), vol=r[8+c]&15;
    const hz=AY_CLOCK/(16*period);
    // heard: something reaches the output and it isn't at zero. With tone and noise both shut, the
    // channel is a DC level: silent unless its amplitude is being moved, which is the wavetable
    const sounding=(tone||noise) && (env || vol>0);
    const wave=!tone && !noise && !env && vol>0;
    return {period, hz, midi:69+12*Math.log2(hz/440), vol, env, tone, noise, sounding, wave};
  });
  return {chans, chips};
}

/** a pitch as a tracker writes it, C#4, and how many cents it sits off that note */
export function noteText(midi){
  const n=Math.round(midi), cents=Math.round((midi-n)*100);
  if(n<0 || n>131) return {text:"???", cents:0};
  return {text:LETTERS[n%12]+(Math.floor(n/12)-1), cents};
}

/**
 * Turns snapshots into rows. feed() takes each snapshot as it comes; every rowMs a row is
 * written of what changed in that time. A row: {n, t, cells:[9 per voice], fx:[3 per chip]}, a
 * cell {note, vol, fx, kind}: kind "note", "drum", "off" or "" (nothing new).
 */
export class Rows {
  constructor({rowMs=50, keep=256}={}){
    Object.assign(this, {rowMs, keep});
    this.rows=[]; this.n=0; this.prev=null; this.next=null; this.pend=null; this.drums=[];
    this.last=null;   // the latest description, for the scopes
  }
  /** the page sent the 8b8 a drum: the next channel to start a drum is labelled with it */
  drum(note, t){ this.drums.push({note, t}); if(this.drums.length>8) this.drums.shift(); }
  _blank(){ return {cells:Array.from({length:9}, ()=>({note:"", vol:"", fx:"", kind:""})), fx:["","",""]}; }
  feed(regs, t){
    const d=describe(regs); this.last=d;
    if(this.next==null){ this.next=t+this.rowMs; this.pend=this._blank(); }
    const p=this.prev, row=this.pend;
    d.chans.forEach((c,v)=>{
      const was=p && p.chans[v], cell=row.cells[v];
      if(c.sounding || c.wave){
        // a drum: noise, or the envelope in a one-shot shape (0-7). Buzzy Bass loops its envelope (8-15)
        const isDrum = c.noise || (c.env && d.chips[v%3].shape<8);
        const fresh = !was || !(was.sounding || was.wave) || (c.tone && Math.abs(c.midi-was.midi)>0.4 && !c.wave);
        if(fresh && !cell.kind){
          if(isDrum){
            const k=this.drums.findIndex(x=>t-x.t<250);
            const hit = k>=0 ? this.drums.splice(k,1)[0].note : null;
            Object.assign(cell, {kind:"drum", note: hit!=null ? (DRUM_ABBR[hit]||"DRM") : "DRM"});
          } else if(c.wave) Object.assign(cell, {kind:"note", note:"WAV"});
          else Object.assign(cell, {kind:"note", note:noteText(c.midi).text});
        }
        else if(was && c.tone && was.tone && Math.abs(c.midi-was.midi)>0.02 && !cell.fx) cell.fx = c.midi>was.midi ? "↗" : "↘";
        const vol = c.env ? "E" : c.vol.toString(16).toUpperCase();
        const wasVol = was ? (was.env ? "E" : was.vol.toString(16).toUpperCase()) : "";
        if(vol!==wasVol || cell.kind) cell.vol=vol;
        const mix=(c.tone?"T":"·")+(c.noise?"N":"·");
        if(!was || mix!==(was.tone?"T":"·")+(was.noise?"N":"·") || cell.kind) cell.mix=mix;
      } else if(was && (was.sounding || was.wave) && !cell.kind){ cell.kind="off"; cell.note="==="; }
    });
    d.chips.forEach((c,i)=>{
      const w=p && p.chips[i]; const parts=[];
      if(!w || c.noise!==w.noise) parts.push("N"+c.noise.toString(16).toUpperCase().padStart(2,"0"));
      if(!w || c.shape!==w.shape || c.envPeriod!==w.envPeriod) parts.push("E"+c.shape.toString(16).toUpperCase()+c.envPeriod.toString(16).toUpperCase().padStart(4,"0"));
      if(parts.length && !row.fx[i]) row.fx[i]=parts.join(" ");
    });
    this.prev=d;
    // envelope restarts, for the scopes: a shape or period changing, or a channel starting on the envelope
    this.envStart=this.envStart||[t,t,t];
    d.chips.forEach((c,i)=>{ const w=p && p.chips[i];
      if(!w || c.shape!==w.shape || c.envPeriod!==w.envPeriod) this.envStart[i]=t; });
    d.chans.forEach((c,v)=>{ const w=p && p.chans[v]; if(c.env && c.sounding && (!w || !w.sounding || !w.env)) this.envStart[v%3]=t; });
    while(t>=this.next){
      this.rows.push({n:this.n++, t:this.next, ...this.pend});
      if(this.rows.length>this.keep) this.rows.shift();
      this.pend=this._blank(); this.next+=this.rowMs;
      if(t-this.next>this.rowMs*64) this.next=t+this.rowMs;   // after a pause, don't write a page of empty rows
    }
  }
}

// ---------- the scopes: a channel rebuilt from its registers ----------
function envLevel(shape, step){
  const cont=shape&8, att=shape&4, alt=shape&2, hold=shape&1, pos=step&15, cycle=(step>>4)&1;
  if(!cont) return step>=16 ? 0 : att ? pos : 15-pos;
  if(hold){ if(step>=16) return (att ? !alt : alt) ? 15 : 0; return att ? pos : 15-pos; }
  let rising=!!att; if(alt && cycle) rising=!rising;
  return rising ? pos : 15-pos;
}
/**
 * n samples (0 to 1) of channel v over ms milliseconds, from description d. noise holds each
 * chip's LFSR between calls, so the noise keeps moving; envAt is how long ago (ms) the chip's
 * envelope started.
 */
export function scope(d, v, n, ms, noise, envAt=0){
  const c=d.chans[v], chip=d.chips[v%3], out=new Float32Array(n);
  if(!(c.sounding || c.wave)) return out;
  if(c.wave){ out.fill(DAC[c.vol]); return out; }
  const steps=Math.max(1, Math.round(ms/1000*STEP_HZ)), per=Math.max(1,c.period);
  const nper=Math.max(1, chip.noise)*2, eper=Math.max(1, chip.envPeriod)*2;
  let lfsr=noise[v%3]||1, nst=lfsr&1, ncount=0;
  let estep=Math.floor(envAt/1000*STEP_HZ/eper), ecount=0;
  for(let s=0; s<steps; s++){
    if(++ncount>=nper){ ncount=0; const bit=(lfsr^(lfsr>>3))&1; lfsr=(lfsr>>1)|(bit<<16); nst=lfsr&1; }
    if(++ecount>=eper){ ecount=0; estep++; }
    const tone=Math.floor(s/per)&1;
    let level=1; if(c.tone && !tone) level=0; if(c.noise && !nst) level=0;
    const vol = c.env ? envLevel(chip.shape, Math.min(estep, 1e6)) : c.vol;
    out[Math.min(n-1, Math.floor(s*n/steps))]=level ? DAC[vol] : 0;
  }
  noise[v%3]=lfsr;           // the chip's noise carries on from here next time
  return out;
}

// ---------- drawing ----------
const PAL={bg:"#171412", panel:"#201D1A", rule:"#3D3730", ink:"#F1E8D2", muted:"#8F846F", dim:"#5A5246", brass:"#D4A017", felt:"#E0605A",
  voice:["#9DB8D9","#A9C98F","#EF8A80","#CDB3DE"]};

/**
 * Draws a Rows on a canvas: three chips side by side, each with its three channels' scopes over
 * its rows, and its noise and envelope column. names[v] labels a latched voice, colour[v] its colour.
 */
export function drawTracker(cv, rows, {names=[], colours=[], noise=[1,1,1], now=performance.now(), scopeMs=20, paused=false}={}){
  const g=cv.getContext && cv.getContext("2d"); if(!g) return;
  const dpr=Math.min(2, (typeof devicePixelRatio!=="undefined" && devicePixelRatio)||1);
  const W=cv.clientWidth||cv.width, H=cv.clientHeight||cv.height;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=PAL.bg; g.fillRect(0,0,W,H);
  const d=rows.last;
  // columns: a row number, then per chip three channels and its effects column
  const chars=4+3*(3*9+8), font=Math.max(8, Math.min(15, W/(chars*0.62)));
  const cw=font*0.62, numW=4*cw, chipW=(W-numW)/3, chanW=(chipW-8*cw)/3;
  const xChan=(chip,ch)=>numW+chip*chipW+ch*chanW, xFx=chip=>numW+chip*chipW+3*chanW;
  const mono=`${font}px ui-monospace,Menlo,Consolas,monospace`;
  // the scopes
  const scopeH=Math.min(90, H*0.2), top=font*1.4;
  g.font=mono; g.textBaseline="top";
  for(let chip=0;chip<3;chip++){
    g.fillStyle=PAL.muted; g.fillText(`CHIP ${"ABC"[chip]}`, xChan(chip,0)+4, 2);
    for(let ch=0;ch<3;ch++){
      const v=ch*3+chip, x0=xChan(chip,ch)+3, w=chanW-6, y0=top+font*1.3, col=colours[v]||PAL.ink;
      // the channel's name over its scope, cut to fit
      g.save(); g.beginPath(); g.rect(x0, top, w, font*1.3); g.clip();
      g.fillStyle=colours[v]||PAL.muted;
      g.fillText(`${"ABC"[chip]}${ch+1}${names[v] ? " "+names[v] : ""}`, x0+1, top);
      g.restore();
      g.fillStyle=PAL.panel; g.fillRect(x0,y0,w,scopeH);
      if(!d) continue;
      const c=d.chans[v];
      if(c.sounding || c.wave){
        const env=rows.envStart ? now-rows.envStart[chip] : 0;
        const s=scope(d, v, Math.max(8,Math.floor(w)), scopeMs, noise, env);
        g.strokeStyle=col; g.lineWidth=1.5; g.beginPath();
        for(let i=0;i<s.length;i++){ const x=x0+i*w/s.length, y=y0+scopeH-4-s[i]*(scopeH-font*1.4-8); i ? g.lineTo(x,y) : g.moveTo(x,y); }
        g.stroke();
        // what it is playing, in the scope's corner
        const drum=c.noise || (c.env && d.chips[chip].shape<8), nt=noteText(c.midi);
        g.fillStyle=drum ? PAL.brass : PAL.ink;
        g.fillText(c.wave ? "wave" : drum ? "drum" : `${nt.text}${nt.cents ? (nt.cents>0?"+":"")+nt.cents : ""}`, x0+3, y0+2);
      }
    }
    if(d){ const c=d.chips[chip], y=top+font*1.3; g.fillStyle=PAL.muted;
      g.fillText("chip", xFx(chip)+4, top);
      g.fillText(`N${c.noise.toString(16).toUpperCase().padStart(2,"0")}`, xFx(chip)+4, y+2);
      g.fillText(`E${c.shape.toString(16).toUpperCase()}`, xFx(chip)+4, y+2+font*1.2);
      g.fillText(c.envPeriod.toString(16).toUpperCase().padStart(4,"0"), xFx(chip)+4, y+2+font*2.4); }
  }
  // the rows, newest at a fixed line two thirds down, older above
  const rh=font*1.25, y1=top+font*1.3+scopeH+font*0.6, area=H-y1, cur=y1+area*0.66;
  g.fillStyle=PAL.panel; g.fillRect(0,cur-1,W,rh+1);
  g.strokeStyle=PAL.rule; g.lineWidth=1;
  for(let chip=0;chip<3;chip++){ g.beginPath(); g.moveTo(xChan(chip,0)-1,y1); g.lineTo(xChan(chip,0)-1,H); g.stroke(); }
  const list=rows.rows, last=list.length-1;
  for(let i=last, y=cur; i>=0 && y>y1-rh; i--, y-=rh){
    const r=list[i];
    g.fillStyle = r.n%16===0 ? PAL.brass : r.n%4===0 ? PAL.muted : PAL.dim;
    g.fillText((r.n&255).toString(16).toUpperCase().padStart(2,"0"), 4, y);
    for(let chip=0;chip<3;chip++){
      for(let ch=0;ch<3;ch++){
        const v=ch*3+chip, cell=r.cells[v], x=xChan(chip,ch)+4;
        const note = cell.note || "...";
        g.fillStyle = cell.kind==="drum" ? PAL.brass : cell.kind==="note" ? (colours[v]||PAL.ink) : cell.kind==="off" ? PAL.muted : PAL.dim;
        g.fillText(note.padEnd(3), x, y);
        g.fillStyle = cell.vol ? PAL.ink : PAL.dim; g.fillText(cell.vol || ".", x+4*cw, y);
        g.fillStyle = cell.mix ? PAL.muted : PAL.dim; g.fillText(cell.mix || "..", x+6*cw, y);
        if(cell.fx){ g.fillStyle=PAL.felt; g.fillText(cell.fx, x+8.5*cw, y); }
      }
      g.fillStyle = r.fx[chip] ? PAL.muted : PAL.dim; g.fillText(r.fx[chip] || "........", xFx(chip)+4, y);
    }
  }
  if(paused){ g.fillStyle=PAL.brass; g.textAlign="right"; g.fillText("PAUSED", W-6, 2); g.textAlign="left"; }
  if(!d){ g.fillStyle=PAL.muted; g.fillText("Waiting for the 8b8's registers…", numW+6, y1+8); }
}
