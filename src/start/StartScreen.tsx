import {AnimatedGestureHint} from '../gesture/hints/AnimatedGestureHint';
import {useEffect,useRef,useState} from 'react';
import './start.css';
export function StartScreen({vertical}:{vertical:boolean}){
 const host=useRef<HTMLElement>(null),[scale,setScale]=useState({x:0,y:0}),w=vertical?1080:2385,h=vertical?1920:1343;
 useEffect(()=>{const o=new ResizeObserver(([e])=>setScale({x:e.contentRect.width/w,y:e.contentRect.height/h}));o.observe(host.current!);return()=>o.disconnect()},[w,h]);
 return <section ref={host} className="start-screen" aria-label="Mughal Times · beginning"><div className={`start-art ${vertical?'portrait':'landscape'}`} style={{width:w,height:h,transform:`translate(-50%,-50%) scale(${scale.x},${scale.y})`}}>
 <img className="start-background" src={vertical?'./start/156-4668-imgImage57.png':'./start/145-3689-imgImage52.png'} alt=""/><div className="start-tint"/>
 <div className="start-emblem"><img src="./start/145-3691-imgImage48.png" alt="Golden peacocks and floral arch"/></div>
 <img className="start-shamsa" src="./start/156-4668-imgShamsa.svg" alt=""/>
 <div className="start-title"><img src="./start/153-4514-imgGroup26.svg" alt=""/><h1>MUGHAL<br/>TIMES</h1><div className="start-flourish"><img src="./start/153-4514-imgVector.svg" alt=""/><img src="./start/153-4514-imgVector1.svg" alt=""/></div></div>
 <div className="start-gesture"><i/><AnimatedGestureHint name="page"/><strong>SWIPE TO TURN THE PAGE</strong><i/></div>
 </div></section>;
}
