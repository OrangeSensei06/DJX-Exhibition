"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAST_PAGE = void 0;
exports.navigateExperience = navigateExperience;
const chapter_1 = require("./chapter");
exports.LAST_PAGE = 1;
// Central ownership prevents the two windows from independently advancing.
function navigateExperience(state, direction, source, now) {
    if (source === 'gesture' && now - state.lastGestureAt < 900)
        return state;
    if (direction === 'reset') {
        return { page: 0, gestureCount: 0, lastGestureAt: now, lastInput: source, lastDirection: direction, chapter: (0, chapter_1.freshChapter)() };
    }
    if (state.page === 1 && now < state.chapter.openedAt + chapter_1.CHAPTER_TIMING.opening)
        return state;
    if (state.page === 1 && direction === 'next') {
        const chapter = (0, chapter_1.reduceChapter)(state.chapter, { type: 'advance' }, now);
        if (chapter === state.chapter)
            return state;
        return { ...state, chapter, gestureCount: state.gestureCount + (source === 'gesture' ? 1 : 0),
            lastGestureAt: source === 'gesture' ? now : state.lastGestureAt, lastInput: source, lastDirection: direction };
    }
    if (state.page === 1 && source === 'gesture')
        return state;
    const page = Math.max(0, Math.min(exports.LAST_PAGE, state.page + (direction === 'next' ? 1 : -1)));
    return {
        page,
        gestureCount: state.gestureCount + (source === 'gesture' ? 1 : 0),
        lastGestureAt: source === 'gesture' ? now : state.lastGestureAt,
        lastInput: source,
        lastDirection: direction,
        chapter: state.page === 0 && page === 1 ? (0, chapter_1.freshChapter)(now) : state.chapter,
    };
}
