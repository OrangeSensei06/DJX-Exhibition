import {useEffect,useRef} from 'react';
import lottie from 'lottie-web';
import snap from './snap.json';
import vertical from './vertical.json';
import push from './push.json';
import horizontal from './horizontal.json';
import page from './page.json';
import up from './up.json';
import finger from './finger.json';
const animations={snap,vertical,push,horizontal,page,up,finger};
export type HintName=keyof typeof animations;
export function AnimatedGestureHint({name}:{name:HintName}){
 const host=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  if(!host.current)return;
  const animation=lottie.loadAnimation({container:host.current,renderer:'svg',loop:true,autoplay:true,animationData:structuredClone(animations[name]),rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
  return()=>animation.destroy();
 },[name]);
 return <span ref={host} className={`animated-gesture animated-${name}`} data-lottie-hint={name} aria-hidden="true"/>;
}
