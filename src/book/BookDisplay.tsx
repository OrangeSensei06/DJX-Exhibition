import HTMLFlipBook from 'react-pageflip';
interface PageFlip {getState():string;getCurrentPageIndex():number;turnToPage(page:number):void;flip(page:number,corner:'top'|'bottom'):void}
import {forwardRef,useEffect,useRef,useState} from 'react';
import type {Snapshot} from '../../shared/protocol';
import Spread1 from './design/Spread1';
import Spread2 from './design/Spread2';
import Spread3 from './design/Spread3';
import Spread4 from './design/Spread4';
import Spread5 from './design/Spread5';
import {StartScreen} from '../start/StartScreen';
import {bookAssets} from './design/assets';
import {HandTransferContext} from './MehndiHand';
import './design/spreads.css';
import './book.css';
import './text-colours.css';
const spreads=[Spread1,Spread2,Spread3,Spread4,Spread5];
const names=['The Art of Biryani','Threads of Tradition','Beyond the Arches','Patterns of Paradise','Jewels of the Empire'];
export const bookChapter=(s:Snapshot)=>s.jewels.active?5:s.motifs.active?4:s.architecture.active?3:s.fashion.nextChapter?1:2;
function Art({chapter}:{chapter:number}){if(chapter===0)return <StartScreen vertical={false}/>;const Spread=spreads[chapter-1];return <Spread/>}
const Page=forwardRef<HTMLDivElement,{chapter:number;side:'left'|'right'}>(({chapter,side},ref)=><div ref={ref} className="curl-page" data-density="soft"><div className={`bound-half bound-${side}`} data-cover-half={chapter===0}><div className="half-art"><Art chapter={chapter}/></div></div></div>);
const pages=Array.from({length:12},(_,i)=><Page key={i} chapter={Math.floor(i/2)} side={i%2?'right':'left'}/>);
export function BookDisplay({snapshot}:{snapshot:Snapshot}){
 const desired=snapshot.welcome?0:bookChapter(snapshot),target=useRef(desired),host=useRef<HTMLElement>(null),book=useRef<{pageFlip:()=>PageFlip}|null>(null);
 const [current,setCurrent]=useState(desired),[turn,setTurn]=useState(false),[size,setSize]=useState({x:0,y:0});
 const [prepared,setPrepared]=useState(false);
 useEffect(()=>{target.current=desired},[desired]);
 useEffect(()=>{let cancelled=false;Promise.all(bookAssets.map(src=>{const img=new Image();img.src=src;return img.decode()})).then(()=>{if(!cancelled)setPrepared(true)}).catch(()=>{if(!cancelled)setPrepared(true)});return()=>{cancelled=true}},[]);
 useEffect(()=>{const o=new ResizeObserver(([e])=>{const margin=snapshot.fullscreen.book?0:38,x=(e.contentRect.width-margin)/1920,y=(e.contentRect.height-margin)/1200;setSize(snapshot.fullscreen.book?{x,y}:{x:Math.min(x,y),y:Math.min(x,y)})});o.observe(host.current!);return()=>o.disconnect()},[snapshot.fullscreen.book]);
 useEffect(()=>{if(!prepared)return;const t=setInterval(()=>{const api=book.current?.pageFlip();if(!api||api.getState()!=='read')return;const actual=Math.floor(api.getCurrentPageIndex()/2);if(actual!==target.current){if(matchMedia('(prefers-reduced-motion: reduce)').matches){api.turnToPage(target.current*2);setCurrent(target.current)}else api.flip(target.current*2,'bottom')}},100);return()=>clearInterval(t)},[prepared]);
 return <section ref={host} className="book-display" aria-label={current===0?'Mughal Times · beginning':`Chapter ${current}: ${names[current-1]}`} data-book-chapter={current} data-book-turning={turn}>
 <HandTransferContext.Provider value={snapshot.handoff}><div className="bound-book" data-cover-spread={current===0&&!turn} data-travel-chapter={snapshot.handoff.chapter} data-travel-phase={snapshot.handoff.phase} style={{transform:`translate(-50%,-50%) scale(${Math.max(0,size.x)},${Math.max(0,size.y)})`}}>
 <div className="book-cover"/><div className="page-block"/>
 {prepared&&<HTMLFlipBook ref={book} width={960} height={1200} size="fixed" minWidth={960} maxWidth={960} minHeight={1200} maxHeight={1200} startPage={current*2} flippingTime={1400} drawShadow maxShadowOpacity={.28} usePortrait={false} startZIndex={1} autoSize={false} showCover={false} mobileScrollSupport={false} clickEventForward={false} useMouseEvents={false} swipeDistance={30} showPageCorners={false} disableFlipByClick renderOnlyPageLengthChange className="fluid-book" style={{width:1920,height:1200}} onFlip={e=>setCurrent(Math.floor(e.data/2))} onChangeState={e=>{setTurn(e.data!=='read');const channel=new BroadcastChannel('mughal-page-turn');channel.postMessage({state:e.data,chapter:target.current});channel.close()}}>{pages}</HTMLFlipBook>}
 <div className="book-gutter"/>
 </div></HandTransferContext.Provider></section>;
}
export function BookControls({snapshot}:{snapshot:Snapshot}){const chapter=bookChapter(snapshot);return <section className="setup-section"><h3>Book · Chapter spreads</h3><div className="fashion-controls"><button className="control-button" onClick={()=>void window.exhibition?.navigate('reset','operator')}>Return to starting screens</button><button className="control-button" disabled={chapter===1} onClick={()=>void window.exhibition?.navigate('previous','operator')}>← Previous spread</button><button className="control-button" onClick={()=>void window.exhibition?.navigate('next','operator')}>{chapter===5?'Close the jewellery display':'Next chapter →'}</button>{names.map((name,i)=><button className="control-button" key={name} disabled={chapter===i+1} onClick={()=>void window.exhibition?.bookOpen(i+1)}>{String(i+1).padStart(2,'0')} · {name}</button>)}</div><p className="setup-note">Next finishes the gallery exit before turning the book. Use the chapter buttons to open a spread directly.</p></section>}
