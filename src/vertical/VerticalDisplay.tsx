import {AnimatedGestureHint} from '../gesture/hints/AnimatedGestureHint';
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import type {Snapshot} from '../../shared/protocol';
import {GestureGuide} from './GestureGuide';
import {bookChapter} from '../book/BookDisplay';
import {gestureHint, reversalReady} from '../../shared/gestureRouting';
import './vertical.css';
const titles=['The Art of Biryani','Threads of Tradition','Beyond the Arches','Patterns of Paradise','Jewels of the Empire'];
const colors=['#521018','#242f3c','#392f19','#354b1c','#30080e'];
export function VerticalDisplay({snapshot:s,children}:{snapshot:Snapshot;children:ReactNode}){
 const chapter=bookChapter(s),host=useRef<HTMLElement>(null),last=useRef(chapter);
 const entry=chapter===2?s.fashion.startedAt:chapter===3?s.architecture.generation:chapter===4?s.motifs.generation:chapter===5?s.jewels.generation:0;
 const entryKey=chapter+':'+entry,previousEntry=useRef(entryKey);
 const [scale,setScale]=useState(0),[wipe,setWipe]=useState<{from:number;to:number;id:number}|null>(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{const o=new ResizeObserver(([e])=>setScale(Math.min(e.contentRect.width/1080,e.contentRect.height/1920)));o.observe(host.current!);return()=>o.disconnect()},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(previousEntry.current===entryKey)return;previousEntry.current=entryKey;setWipe({from:last.current,to:chapter,id:Date.now()});last.current=chapter;const t=setTimeout(()=>setWipe(null),1800);return()=>clearTimeout(t)},[chapter,entryKey]);
 useEffect(()=>{const channel=new BroadcastChannel('mughal-page-turn');let timer:ReturnType<typeof setTimeout>;channel.onmessage=e=>{if(!Number.isInteger(e.data?.chapter)||e.data.chapter<1||e.data.chapter>5)return;clearTimeout(timer);if(e.data.state==='flipping')setWipe(w=>({from:w?.from??last.current,to:e.data.chapter,id:Date.now()}));else if(e.data.state==='read')timer=setTimeout(()=>setWipe(null),180)};return()=>{clearTimeout(timer);channel.close()}},[]);
 const phase=chapter===1?s.biryaniVideo.phase:chapter===2?(!s.fashion.startedAt?'idle':now-s.fashion.startedAt<4700?'intro':s.fashion.exitingAt?'exit':'ready'):chapter===3?s.architecture.phase:chapter===4?s.motifs.phase:s.jewels.phase;
 const idle=chapter===1&&phase==='book'||chapter===2&&phase==='idle'||['load','LOAD','WAIT','COMPLETE','complete','DONE'].includes(phase);
 const [returned,setReturned]=useState(false);
 const previousScene=useRef({chapter,entryKey,exiting:false});
 const exiting=['RETURN','DONE','complete','COMPLETE','returning','restoring','folding','EXIT_CENTER','EXIT_PAUSE','EXIT_CLEAR','GATHER','LOWER'].includes(phase)||chapter===2&&!!s.fashion.exitingAt;
 useEffect(()=>{
  const previous=previousScene.current;
  if(previous.chapter!==chapter)setReturned(previous.exiting);
  else if(previous.entryKey!==entryKey||!idle)setReturned(false);
  previousScene.current={chapter,entryKey,exiting};
 },[chapter,entryKey,exiting,idle]);
 const finished=s.handoff.phase==='idle'&&(phase==='COMPLETE'||returned&&idle);
 return <section ref={host} className="vertical-display" data-vertical-chapter={chapter} style={{background:colors[chapter-1]}}>
  <div className="vertical-content">{children}</div>
  <div className="vertical-overlay" style={{transform:`translate(-50%,-50%) scale(${scale})`}}>
   {idle&&<article className="pre-interaction" style={{backgroundColor:colors[chapter-1]}}><div className="checkpoint-emblem"><img src="./start/checkpoint-emblem.png" alt="Mughal Times emblem"/></div><h1 className="checkpoint-title">MUGHAL TIMES</h1><img className="checkpoint-divider" src="./start/checkpoint-divider.svg" alt=""/><div className="pre-gesture"><i/><AnimatedGestureHint name="up"/><strong>DO A SWIPE UP GESTURE</strong><i/></div><p>BRING THINGS TO MUGHAL TIMES</p></article>}
   {wipe&&<div key={wipe.id} className="chapter-colour-wipe" style={{'--old-colour':colors[wipe.from-1],'--new-colour':colors[wipe.to-1]} as CSSProperties}><div className="colour-rise"/><div className="spark-front">{Array.from({length:38},(_,i)=><i key={i} style={{left:`${i*100/37}%`,animationDelay:`${-(i%7)*.09}s`}}/>)}</div></div>}
   {!wipe&&s.handoff.phase==='away'&&<GestureGuide snapshot={s} now={now}/>}
   <div className="universal-corners" aria-hidden="true">{['tl','tr','bl','br'].map(c=><img key={c} className={c} src="./motifs/corner-updated.png" alt=""/>)}</div>
  </div>
 </section>;
}
