import { useEffect, useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { FashionState, WindowRole } from '../../shared/protocol';
import './fashion.css';
import { DressPanel } from './DressPanel';
function useClock() { const [now,setNow]=useState(Date.now()); useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),50);return()=>clearInterval(t);},[]);return now; }
const base='./fashion/';
export function FashionChapter({role,state}:{role:WindowRole;state:FashionState}) {
 const now=useClock(); const elapsed=state.startedAt?now-state.startedAt:0; const entered=!!state.startedAt;
 const initialElapsed=useMemo(()=>state.startedAt?Date.now()-state.startedAt:0,[state.startedAt]);
 const exitDelay=useMemo(()=>state.exitingAt?Date.now()-state.exitingAt:0,[state.exitingAt]);
 const style={'--elapsed':`${1100-initialElapsed}ms`, '--exit-delay':`${-exitDelay}ms`} as CSSProperties;
 if(role==='book') return <section className={`fashion-book ${entered?'figures-leaving':''} ${state.exitingAt?'fashion-exiting':''}`} style={{'--lift-delay':`${-initialElapsed}ms`, '--exit-delay':`${-exitDelay}ms`} as CSSProperties}>
  <div className="fashion-page fashion-left"><img className="magazine-background" src={base+'page-left.png'} alt="Chikankari — the Mughal Edit magazine page"/><img className="magazine-model white-model" src={base+'model-white.png'} alt="Modern white chikankari outfit"/></div>
  <div className="fashion-page fashion-right"><img className="magazine-background" src={base+'page-right.png'} alt="Anarkali — the Mughal Edit magazine page"/><img className="magazine-model red-model" src={base+'model-red.png'} alt="Modern Anarkali outfit"/></div>
  <div className="fashion-spine"/><div className="fashion-book-hint">{entered?'The story continues in the gallery.':'↑  Lift the looks to explore their story'}</div>
 </section>;
 return <section key={state.startedAt} style={style} className={`fashion-gallery fashion-gallery-mapped ${entered?'scene-entered':''} ${state.exitingAt?'fashion-exiting':''} look-${state.look}`} data-fashion-phase={!entered?'waiting':elapsed<4700?'revealing':'ready'}>
  {!entered&&<div className="fashion-wait"><span>THE MUGHAL EDIT / CHAPTER 02</span><h1>A change<br/><em>of dress.</em></h1><p>Two looks. A closer look at craft.</p><small>Begin the reveal from Setup.</small></div>}
  {entered&&<DressPanel look={state.look} />}

 </section>;
}
export function FashionControls({state}:{state:FashionState}) {
 const now=useClock();
 const entered=!!state.startedAt;
 const ready=entered&&now-state.startedAt>=4700;
 const switching=now-state.switchedAt<900;
 const canSwitch=ready&&!state.exitingAt&&!state.nextChapter&&!switching;
 const canNext=!state.exitingAt&&!state.nextChapter&&!switching&&(!entered||ready);
 const send=(action:'lift'|'switch'|'reset'|'next')=>void window.exhibition?.fashionAction(action);
 return <section className="setup-section">
  <h3>Chapter 02 · Dresses</h3>
  <div className="fashion-controls">
   <p className="setup-label">Intro animation</p>
   <button className="control-button" disabled={entered&&!state.exitingAt&&!state.nextChapter} onClick={()=>{send('reset');setTimeout(()=>send('lift'),120);}}>
    ▶ Play intro — temple + cloth → model → text
   </button>
   <button className="control-button" disabled={entered&&!state.exitingAt} onClick={()=>send('lift')}>
    Reveal scene only (no auto-reset)
   </button>

   <p className="setup-label" style={{marginTop:12}}>
    Switch look&nbsp;
    <span style={{opacity:.6,fontWeight:'normal'}}>
     {state.look==='red'?'(Anarkali → Chikankari)':'(Chikankari → Anarkali)'}
    </span>
   </p>
   <button className="control-button" disabled={!canSwitch} onClick={()=>send('switch')}>
    Switch to {state.look==='red'?'Chikankari (white)':'Anarkali (red)'} — right-corner mask
   </button>

   <p className="setup-label" style={{marginTop:12}}>Exit</p>
   <button className="control-button" disabled={!canNext} onClick={()=>send('next')}>
    Reverse scene &amp; open next chapter →
   </button>
   <button className="control-button" style={{marginTop:4}} onClick={()=>send('reset')}>
    ↺ Reset to book
   </button>
  </div>
  <p className="setup-note">
   <strong>Intro:</strong> temple + cloth texture slide in → model rises up with fade → text appears.<br/>
   <strong>Switch:</strong> triggered from right corner — mask sweeps across canvas; text slides out then in from outside (both directions).<br/>
   <strong>Layout:</strong> Chikankari model &amp; textile sizes now match Anarkali exactly.
  </p>
 </section>;
}
