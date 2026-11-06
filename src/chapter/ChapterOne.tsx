import { useEffect, useState } from 'react';
import type { ChapterPhase, ChapterState, SurfaceMetrics, WindowRole } from '../../shared/protocol';
import { CHAPTER_TIMING } from '../../shared/chapter';
import { BiryaniScene } from './BiryaniScene';
import { ReconstructionSheet } from './ReconstructionSheet';
import './chapter.css';

export const phaseLabels: Record<ChapterPhase, string> = {
  book: 'On the book', transferring: 'Travelling to the gallery', presented: 'Ready to explore',
  exploding: 'Separating the layers', exploded: 'Layers revealed', clearing: 'Opening the ingredients story', story: 'Ingredients story',
  complete: 'Bowl reconstructed', reassembling: 'Gathering the ingredients', returning: 'Returning to the book', paging: 'Turning the page',
};

function DoodleArrow() {
  return <svg className="doodle-arrow" viewBox="0 0 150 60" fill="none" aria-hidden="true"><path d="M4 17c40-21 40 42 87 27 16-5 26-15 47-18m-17-10 18 9-13 15" /></svg>;
}

function BowlDoodle() {
  return <svg className="bowl-doodle" viewBox="0 0 90 78" fill="none" aria-hidden="true"><path d="M9 40c3 26 13 31 36 31s35-7 37-31M9 40c0-8 72-8 73 0-1 8-71 8-73 0ZM32 25c-9-9 9-12 0-23m16 23c-9-9 9-12 0-23m16 23c-9-9 9-12 0-23" /></svg>;
}

export function BiryaniIntro() {
  return <div className="biryani-intro">
    <span className="chapter-kicker">CHAPTER ONE / A FAMILIAR FAVOURITE</span>
    <BowlDoodle />
    <h1>Biryani<span className="hand-period">.</span></h1>
    <p className="biryani-hook">The menu was long.<br /><em>The decision wasn’t.</em></p>
    <p className="biryani-caption">Before the first bite,<br />a closer look.</p>
    <div className="doodle-aside"><span>you know this one</span><DoodleArrow /></div>
    <span className="page-number">01</span>
  </div>;
}

export function ChapterOne({ chapter, role, active, surfaces }: { chapter: ChapterState; role: WindowRole; active: boolean; surfaces: SurfaceMetrics }) {
  const [turning, setTurning] = useState(false);
  useEffect(() => {
    const remaining = (chapter.phase === 'paging' ? chapter.startedAt + CHAPTER_TIMING.paging : chapter.openedAt + CHAPTER_TIMING.opening) - Date.now();
    setTurning(active && remaining > 0);
    if (active && remaining > 0) {
      const timer = setTimeout(() => setTurning(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [chapter.openedAt, chapter.phase, chapter.startedAt, active]);
  const atBook = chapter.phase === 'book';
  const stage = chapter.phase;
  return <section className={`chapter-one chapter-${role} ${active ? 'is-active' : ''}`} aria-hidden={!active} data-phase={stage}>
    {role === 'book' ? <>
      <div className="book-spread">
        <div className="book-page left-page"><BiryaniIntro /></div>
        <div className="book-page right-page"><span className="right-page-kicker">AN EVERYDAY FAVOURITE. A LONGER STORY.</span>
          <div className="bowl-ground" />
          <div className="book-interaction-copy"><span className="handwritten">{atBook ? 'a little closer?' : ['returning', 'paging'].includes(stage) ? 'back to the page.' : 'look up. keep exploring.'}</span>
            <p>{atBook ? 'Pinch and move. Lift with both hands, or swipe left to turn the page.' : stage === 'transferring' ? 'Follow it to the gallery.' : ['returning', 'paging'].includes(stage) ? 'A new page is on its way.' : 'Your bowl is on the gallery screen.'}</p>
          </div><span className="page-number">02</span>
        </div>
        <div className="book-spine" />
      </div>
      <BiryaniScene chapter={chapter} role={role} active={active} surfaces={surfaces} />
      {turning && <div className="page-turn" key={chapter.phase === 'paging' ? chapter.startedAt : chapter.openedAt} style={{ animationDuration: `${CHAPTER_TIMING.opening}ms`, animationDelay: `${-Math.max(0, Date.now() - (chapter.phase === 'paging' ? chapter.startedAt : chapter.openedAt))}ms` }}>
        <div className="leaf-front"><span className="chapter-kicker">MUGHAL TIMES</span><span className="leaf-title">One familiar<br /><em>favourite.</em></span><span className="page-number">01</span></div>
        <div className="leaf-back"><BiryaniIntro /></div>
      </div>}
    </> : <>
      <header className="gallery-heading" hidden={['story', 'reassembling', 'returning', 'paging'].includes(stage)}><span className="chapter-kicker">CHAPTER 01</span><h1>Biryani.</h1><span className="gallery-fine-rule" /></header>
      <BiryaniScene chapter={chapter} role={role} active={active} surfaces={surfaces} />
      <div className="gallery-instruction" key={stage}>
        {atBook && <><span className="lift-doodle" aria-hidden="true">↑</span><h2>Drag the biryani<br /><em>through time.</em></h2><p>Move it on the book.<br />Then lift both hands to bring it here.</p></>}
        {stage === 'transferring' && <p className="handwritten">From the page, into the story.</p>}
        {stage === 'presented' && <><h2>There’s more<br /><em>beneath the surface.</em></h2><p>One hand up, the other down ↑ ↓<br />Small sweeps reveal the layers.</p></>}
        {stage === 'exploding' && <p className="handwritten">One bowl. Many layers.</p>}
        {stage === 'exploded' && <><h2>A closer look.</h2><p>Sweep your hands sideways, away from each other ← →<br />to make room for the story.</p></>}
        {stage === 'returning' && <p className="handwritten">Back to the book.</p>}
      </div>
      {(stage === 'story' || stage === 'reassembling') && <ReconstructionSheet chapter={chapter} />}
    </>}
  </section>;
}
