import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BiryaniVideoState, WindowRole } from '../../shared/protocol';
import { biryaniStory } from '../content/biryani';
import './biryani-video.css';
const base='./biryani-video/';
function useClock(){const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),80);return()=>clearInterval(t)},[]);return now;}
export function BiryaniVideoChapter({state,role}:{state:BiryaniVideoState;role:WindowRole}) {
 const story=useRef<HTMLVideoElement>(null),idle=useRef<HTMLVideoElement>(null),reverse=useRef<HTMLVideoElement>(null);
 const [error,setError]=useState('');const now=useClock();
 const phase=state.phase; const age=useMemo(()=>Math.max(0,Date.now()-state.startedAt),[state.startedAt]);
 useEffect(()=>{
  if(role!=='vertical')return;
  let cancelled=false,raf=0,timer:ReturnType<typeof setTimeout>|undefined;
  [story.current,idle.current,reverse.current].forEach(v=>v?.pause());
  const v=phase==='ingredients'?idle.current:['returning','restoring'].includes(phase)?reverse.current:story.current;
  if(!v)return;
  const start=()=>{
   if(cancelled)return;
   v.playbackRate=phase==='ingredients'?0.3:1;
   if(phase==='restoring') {
    v.currentTime=Math.max(0,v.duration-0.001);
    timer=setTimeout(()=>void window.exhibition?.biryaniVideoAction('returned'),1900);
    return;
   }
   if(phase==='book'){v.currentTime=0;return;}
   // Preserve the main clip at the pause boundary rather than restarting it.
   if(phase==='waiting'){if(Math.abs(v.currentTime-5)>.06)v.currentTime=5;return;}
   if(phase==='arrival'&&Math.abs(v.currentTime-Math.min(5,age/1000))>.15)v.currentTime=Math.min(5,age/1000);
   if(phase==='separating'&&(v.currentTime<4.95||v.currentTime>7.5))v.currentTime=5;
   if(phase==='returning'){
    if(state.reverseFrom===0){void window.exhibition?.biryaniVideoAction('rewound');return;}
    v.currentTime=Math.max(0,7.5-state.reverseFrom);
   }
   void v.play().catch(e=>setError(String(e)));
   const tick=()=>{
    if(cancelled)return;
    const limit=phase==='arrival'?5:phase==='separating'?7.5:Infinity;
    if(v.currentTime>=limit){v.pause();v.currentTime=limit;void window.exhibition?.biryaniVideoAction(phase==='arrival'?'arrived':'revealed');return;}
    raf=requestAnimationFrame(tick);
   };raf=requestAnimationFrame(tick);
  };
  if(v.readyState>=1)start();else v.addEventListener('loadedmetadata',start,{once:true});
  return()=>{cancelled=true;cancelAnimationFrame(raf);clearTimeout(timer);v.removeEventListener('loadedmetadata',start);v.pause();};
 },[phase,state.startedAt,state.reverseFrom,role,age]);
 const bookStyle={'--bowl-delay':`${-age}ms`,'--return-delay':`${-age}ms`,'--page-delay':`${1200-age}ms`} as CSSProperties;
 if(role==='book')return <section className={`video-book phase-${phase}`} style={bookStyle}>
  <img className="biryani-spread-image" src={base+'book.jpg'} alt="The Art of Biryani — Craving Biryani? A royal dish, with a rich history."/>
  <img className="biryani-bowl-sprite" src={base+'bowl.jpg'} alt="Bowl of chicken biryani"/>
  <div className="video-book-spine"/>
  <p className="video-book-cue">{phase==='book'?'↑ Lift the bowl to begin':phase==='returning'?'Back to the page.':'Explore the layers on the gallery screen.'}</p>
 </section>;
 return <section className={`biryani-video-gallery phase-${phase}`} data-video-phase={phase}>
  <div className="portrait-video-stage">
   <video ref={story} src={base+'story.mp4'} muted playsInline preload="auto" className={['ingredients','returning','restoring'].includes(phase)?'is-hidden':''} onError={()=>setError('The story video could not be loaded.')}/>
   <video ref={idle} src={base+'idle.mp4'} muted playsInline preload="auto" loop className={phase==='ingredients'?'':'is-hidden'} onError={()=>setError('The idle video could not be loaded.')}/>
   <video ref={reverse} src={base+'reverse.mp4'} muted playsInline preload="auto" className={['returning','restoring'].includes(phase)?'':'is-hidden'} onEnded={()=>{if(phase==='returning')void window.exhibition?.biryaniVideoAction('rewound')}}/>
   {phase==='ingredients'&&<div className="ingredient-bubbles">{biryaniStory.ingredients.map((item,i)=><article key={item.id} className={`ingredient-bubble bubble-${i%2?'right':'left'}`} style={{top:`${26+Math.floor(i/2)*15}%`,animationDelay:`${i*420}ms`}}><div style={{animationDelay:`${i*240}ms`}}><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>}
   {phase==='ingredients'&&now-state.startedAt>=4200&&<div className="video-page-prompt">← Swipe left to turn the page</div>}
   {phase==='waiting'&&<div className="video-phase-cue">One hand up, the other down ↑ ↓<br/>Separate the layers to explore.</div>}
   {phase==='book'&&<div className="video-phase-cue">Lift the biryani from the book ↑ ↑</div>}
  </div>{error&&<p className="video-error" role="alert">{error}</p>}
 </section>;
}
export function BiryaniVideoControls({state,active}:{state:BiryaniVideoState;active:boolean}){
 const now=useClock();const send=(action:'lift'|'separate'|'next'|'reset')=>void window.exhibition?.biryaniVideoAction(action);
 return <section className="setup-section"><h3>Chapter 01 · Biryani video</h3><div className="video-controls"><button className="control-button" disabled={!active||state.phase!=='book'} onClick={()=>send('lift')}>1. Simulate lift ↑ ↑ · Play to 5 seconds</button><button className="control-button" disabled={!active||state.phase!=='waiting'} onClick={()=>send('separate')}>2. Simulate opposite vertical sweep ↑ ↓</button><button className="control-button" disabled={!active||!(state.phase==='book'||state.phase==='ingredients'&&now-state.startedAt>=4200)} onClick={()=>send('next')}>3. Reverse video & turn page →</button><button className="control-button" onClick={()=>send('reset')}>Open / replay Biryani</button></div><p className="setup-note">Stage: {state.phase}. Video pauses at 5 seconds, then resumes to 7.5. The 7.2–7.5-second range loops forward and backward at 0.3× while all eight ingredient notes appear. Setup simulates gestures; legacy 3D interactions are disabled.</p></section>;
}
