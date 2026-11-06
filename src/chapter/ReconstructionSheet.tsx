import { useEffect, useState } from 'react';
import type { ChapterState } from '../../shared/protocol';
import { CHAPTER_TIMING } from '../../shared/chapter';
import { biryaniStory } from '../content/biryani';
import { reconstructionRow } from '../../shared/reconstruction';

export function ReconstructionSheet({ chapter }: { chapter: ChapterState }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const remaining = chapter.startedAt + CHAPTER_TIMING.storyReveal - Date.now();
    setReady(chapter.phase === 'story' && remaining <= 0);
    if (chapter.phase !== 'story' || remaining <= 0) return;
    const timer = setTimeout(() => setReady(true), remaining);
    return () => clearTimeout(timer);
  }, [chapter.phase, chapter.startedAt]);
  return <article className={`reconstruction-sheet ${chapter.phase === 'story' ? 'revealing' : 'is-leaving'}`} aria-label="Biryani ingredients">
    {ready && <div className="next-chapter-prompt" role="status"><span aria-hidden="true">←</span> Swipe left to turn the page</div>}
    <header className="reconstruction-heading"><span className="chapter-kicker">BIRYANI / THROUGH TIME</span><h2>{biryaniStory.heading}</h2></header>
    <ul className="ingredient-notes">
      {biryaniStory.ingredients.map((ingredient, index) => <li key={ingredient.id} data-ingredient={ingredient.id}
        className={`ingredient-note story-line ${index % 2 ? 'note-right' : 'note-left'}`}
        style={{ top: `${reconstructionRow(index) * 100}%`, animationDelay: `${index * 120}ms` }}>
        <span className="ingredient-bullet" aria-hidden="true">•</span>
        <div><h3>{ingredient.title}</h3><p>{ingredient.description}</p>{ingredient.id === 'ghee' && <small>Included with the rice</small>}</div>
      </li>)}
    </ul>
  </article>;
}
