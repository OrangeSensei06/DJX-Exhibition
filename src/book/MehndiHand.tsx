import {createContext,useContext,useEffect,useRef} from 'react';
import type {Snapshot} from '../../shared/protocol';

export const HandTransferContext=createContext<Snapshot['handoff']>({chapter:4,phase:'idle',startedAt:0});
const W=433,H=577,PAD=800,PAD_X=600,DURATION=2600;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const project=(x:number,y:number)=>-.5*x+.8660254*y;
type Dot={x:number;y:number;birth:number;seed:number};
type Art={ink:HTMLImageElement;bare:HTMLCanvasElement;dots:Dot[]};
const cache=new Map<string,Promise<Art>>();
function load(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})}
function prepare(src:string){
 if(!cache.has(src))cache.set(src,Promise.all([load(src),load('./book/chapter4-bare-hand.png')]).then(([ink,skin])=>{
  const bare=document.createElement('canvas');bare.width=W;bare.height=H;const b=bare.getContext('2d')!;
  // Register the new upright portrait to the tilted Figma image. Both layers
  // then share the original slot and alpha outline, including the lace cuff.
  b.translate(170,475);b.rotate(24*Math.PI/180);b.scale(.397,.397);b.translate(-780,-1260);b.drawImage(skin,0,0);
  b.resetTransform();b.globalCompositeOperation='destination-in';b.drawImage(ink,0,0,W,H);b.globalCompositeOperation='source-over';
  const sample=document.createElement('canvas');sample.width=W;sample.height=H;const c=sample.getContext('2d',{willReadFrequently:true})!;c.drawImage(ink,0,0,W,H);
  const pixels=c.getImageData(0,0,W,H).data,dots:Dot[]=[];
  for(let y=35;y<460;y+=4)for(let x=40;x<W-20;x+=4){const k=(y*W+x)*4;if(pixels[k+3]>220&&pixels[k]<112&&pixels[k+1]<78&&pixels[k+2]<65){const seed=((x*73+y*37)%997)/997;dots.push({x,y,birth:clamp((500-project(x,y))/720)*.68,seed})}}
  return {ink,bare,dots};
 }));return cache.get(src)!;
}
// Clip the original image against a horizontal line in book coordinates,
// compensating for the -30 degree rotation around its Figma wrapper.
function remainingPolygon(line:number){
 const input=[[0,0],[W,0],[W,H],[0,H]],out:number[][]=[];
 for(let i=0;i<4;i++){const a=input[i],b=input[(i+1)%4],da=project(a[0],a[1])-line,db=project(b[0],b[1])-line;if(da<=0)out.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}return out;
}
export function MehndiHand({src}:{src:string}){
 const canvas=useRef<HTMLCanvasElement>(null),handoff=useContext(HandTransferContext);
 useEffect(()=>{
  let dead=false,raf=0;
  void prepare(src).then(art=>{
   if(dead)return;const cv=canvas.current!,c=cv.getContext('2d')!;
   const active=handoff.chapter===4,phase=active?handoff.phase:'idle',moving=phase==='lifting'||phase==='returning';
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const draw=()=>{
    const time=clamp((Date.now()-handoff.startedAt)/DURATION),p=phase==='away'?1:phase==='lifting'?time:phase==='returning'?1-time:0;
    cv.dataset.progress=p.toFixed(3);c.clearRect(0,0,W+PAD_X*2,H+PAD);c.save();c.translate(PAD_X,PAD);
    if(p===0)c.drawImage(art.ink,0,0,W,H);
    else{
     c.drawImage(art.bare,0,0);const polygon=remainingPolygon(500-720*clamp(p/.68));
     if(polygon.length){c.save();c.beginPath();polygon.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();c.drawImage(art.ink,0,0,W,H);c.restore()}
     if(!reduced&&p<1){c.fillStyle='#211611';for(const d of art.dots){const t=(p-d.birth)/.32;if(t<=0||t>=1)continue;const flight=t*t,travel=900*flight;c.globalAlpha=Math.min(1,t*14)*(1-clamp((t-.7)/.3));const x=d.x+.5*travel+Math.sin(t*7+d.seed*6)*12*Math.sin(Math.PI*t),y=d.y-.8660254*travel;c.beginPath();c.arc(x,y,.7+d.seed*.65,0,Math.PI*2);c.fill()}c.globalAlpha=1}
    }
    c.restore();if(moving&&time<1)raf=requestAnimationFrame(draw);
   };draw();
  }).catch(()=>{if(canvas.current)canvas.current.dataset.error='image-load'});
  return()=>{dead=true;cancelAnimationFrame(raf)};
 },[src,handoff.chapter,handoff.phase,handoff.startedAt]);
 return <div className="mehndi-hand" aria-label="Mehndi hand"><canvas ref={canvas} width={W+PAD_X*2} height={H+PAD} style={{left:`${-PAD_X/W*100}%`,width:`${(W+PAD_X*2)/W*100}%`,top:`${-PAD/H*100}%`,height:`${(H+PAD)/H*100}%`}}/><img className="mehndi-fallback" src={src} alt="Ornate mehndi hand"/></div>;
}
