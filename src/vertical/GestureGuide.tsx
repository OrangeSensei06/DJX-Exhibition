import {AnimatedGestureHint} from '../gesture/hints/AnimatedGestureHint';
import type {HintName} from '../gesture/hints/AnimatedGestureHint';
import type {Snapshot} from '../../shared/protocol';
import {activeChapter,reversalReady} from '../../shared/gestureRouting';
export function GestureGuide({snapshot:s,now}:{snapshot:Snapshot;now:number}){
 const chapter=activeChapter(s),reverse=reversalReady(s,now);
 let icon:HintName='vertical',text='MOVE ONE HAND UP & THE OTHER DOWN';
 if(reverse){icon='page';text='SWIPE TO TURN THE PAGE'}
 else if(chapter===1){if(s.biryaniVideo.phase==='STACKED'){icon='horizontal';text='SPREAD HANDS HORIZONTALLY'}else if(s.biryaniVideo.phase!=='IDLE')return null}
 else if(chapter===2){icon='snap';text='SNAP TO CHANGE'}
 else if(chapter===3){icon='push';text='PUSH WITH BOTH HANDS'}
 else if(chapter===4&&s.motifs.phase!=='SCROLL_READY')return null;
 else if(chapter===5){icon='finger';text='POINT INDEX FINGER · MOVE LEFT / RIGHT'}
 return <aside key={`${chapter}-${icon}-${text}`} className={`figma-gesture-guide guide-${chapter}`} data-biryani-stage={chapter===1?s.biryaniVideo.phase:undefined} data-gesture-icon={icon} aria-live="polite"><img className="guide-rule" src="./gestures/rule.svg" alt=""/><span className={`guide-icon icon-${icon}`}><AnimatedGestureHint name={icon}/></span><strong>{text}</strong><img className="guide-rule" src="./gestures/rule.svg" alt=""/></aside>
}
