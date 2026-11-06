import type { ExperienceState, InputSource, Navigation } from './protocol';
import { CHAPTER_TIMING, freshChapter, reduceChapter } from './chapter';

export const LAST_PAGE = 1;

// Central ownership prevents the two windows from independently advancing.
export function navigateExperience(
  state: ExperienceState,
  direction: Navigation,
  source: InputSource,
  now: number,
): ExperienceState {
  if (source === 'gesture' && now - state.lastGestureAt < 900) return state;
  if (direction === 'reset') {
    return { page: 0, gestureCount: 0, lastGestureAt: now, lastInput: source, lastDirection: direction, chapter: freshChapter() };
  }
  if (state.page === 1 && now < state.chapter.openedAt + CHAPTER_TIMING.opening) return state;
  if (state.page === 1 && direction === 'next') {
    const chapter = reduceChapter(state.chapter, { type: 'advance' }, now);
    if (chapter === state.chapter) return state;
    return { ...state, chapter, gestureCount: state.gestureCount + (source === 'gesture' ? 1 : 0),
      lastGestureAt: source === 'gesture' ? now : state.lastGestureAt, lastInput: source, lastDirection: direction };
  }
  if (state.page === 1 && source === 'gesture') return state;
  const page = Math.max(0, Math.min(LAST_PAGE, state.page + (direction === 'next' ? 1 : -1)));
  return {
    page,
    gestureCount: state.gestureCount + (source === 'gesture' ? 1 : 0),
    lastGestureAt: source === 'gesture' ? now : state.lastGestureAt,
    lastInput: source,
    lastDirection: direction,
    chapter: state.page === 0 && page === 1 ? freshChapter(now) : state.chapter,
  };
}
