"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mix = exports.smooth = exports.clamp = exports.CHAPTER_TIMING = void 0;
exports.canAdvanceChapter = canAdvanceChapter;
exports.freshChapter = freshChapter;
exports.chapterDeadline = chapterDeadline;
exports.settleChapter = settleChapter;
exports.reduceChapter = reduceChapter;
exports.sampleChapter = sampleChapter;
const reconstruction_1 = require("./reconstruction");
exports.CHAPTER_TIMING = { opening: 1450, transferring: 2400, exploding: 1600, clearing: 1900, storyReveal: 2100, reassembling: 1500, returning: 2400, paging: 1450 };
function canAdvanceChapter(state, now) {
    return state.phase === 'book' && now >= state.openedAt + exports.CHAPTER_TIMING.opening
        || state.phase === 'story' && now >= state.startedAt + exports.CHAPTER_TIMING.storyReveal;
}
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
exports.clamp = clamp;
const smooth = (value) => { const t = (0, exports.clamp)(value); return t * t * (3 - 2 * t); };
exports.smooth = smooth;
const mix = (from, to, amount) => from + (to - from) * amount;
exports.mix = mix;
function freshChapter(now = 0) {
    return {
        phase: 'book', startedAt: now, openedAt: now,
        position: { x: 0.75, y: 0.56 }, transferOrigin: { x: 0.75, y: 0.56 },
        actions: 0, lastAction: null, reconstruction: (0, reconstruction_1.emptyReconstruction)(),
    };
}
function chapterDeadline(state) {
    if (state.phase === 'transferring' || state.phase === 'exploding' || state.phase === 'clearing' || state.phase === 'reassembling' || state.phase === 'returning' || state.phase === 'paging') {
        return state.startedAt + exports.CHAPTER_TIMING[state.phase];
    }
    return null;
}
function settleChapter(state, now) {
    // Catch up from one shared clock, including after a renderer reload or delayed timer.
    let result = state;
    for (let i = 0; i < 4; i++) {
        const deadline = chapterDeadline(result);
        if (deadline === null || now < deadline)
            break;
        if (result.phase === 'paging') {
            result = { ...freshChapter(result.startedAt), startedAt: deadline };
            break;
        }
        const next = { transferring: 'presented', exploding: 'exploded', clearing: 'story', reassembling: 'returning', returning: 'paging' };
        result = { ...result, phase: next[result.phase], startedAt: deadline };
    }
    return result;
}
function reduceChapter(current, action, now) {
    if (action.type === 'restart')
        return freshChapter(now);
    const state = settleChapter(current, now);
    if (action.type === 'advance' || action.type === 'return') {
        if (!canAdvanceChapter(state, now))
            return state;
        // A bowl still on the book needs no gallery round trip.
        if (state.phase === 'book')
            return { ...state, phase: 'paging', startedAt: now,
                actions: state.actions + 1, lastAction: 'advance' };
        return { ...state, phase: 'reassembling', startedAt: now, actions: state.actions + 1, lastAction: 'advance',
            reconstruction: { collected: [...reconstruction_1.INGREDIENT_IDS], held: null, cursor: null,
                placements: Object.fromEntries(reconstruction_1.INGREDIENT_IDS.map(id => [id, { ...(0, reconstruction_1.ingredientHome)(id), at: now }])) } };
    }
    // The ingredient display is now read-only, including for old input packets.
    if (['point', 'grab', 'dragIngredient', 'drop', 'cancelGrab'].includes(action.type))
        return state;
    if (now < state.openedAt + exports.CHAPTER_TIMING.opening)
        return state;
    if (action.type === 'move') {
        if (state.phase !== 'book' || !Number.isFinite(action.dx) || !Number.isFinite(action.dy))
            return state;
        return { ...state, position: {
                x: (0, exports.clamp)(state.position.x + (0, exports.clamp)(action.dx, -0.15, 0.15), 0.59, 0.9),
                y: (0, exports.clamp)(state.position.y + (0, exports.clamp)(action.dy, -0.15, 0.15), 0.35, 0.76),
            } };
    }
    const next = { book: 'lift', presented: 'explode', exploded: 'clear' };
    if (next[state.phase] !== action.type)
        return state;
    const phases = { lift: 'transferring', explode: 'exploding', clear: 'clearing' };
    return {
        ...state, phase: phases[action.type], startedAt: now,
        reconstruction: action.type === 'clear' ? (0, reconstruction_1.emptyReconstruction)() : state.reconstruction,
        transferOrigin: action.type === 'lift' ? { ...state.position } : state.transferOrigin,
        actions: state.actions + 1, lastAction: action.type,
    };
}
// The two views sample one trajectory and one wall clock. The seam is book y=0 /
// gallery y=1: no delayed second animation or window-to-window timeout is involved.
function sampleChapter(state, role, now, surfaces) {
    const elapsed = now - state.startedAt;
    if (state.phase === 'returning' || state.phase === 'paging') {
        const progress = state.phase === 'paging' ? 1 : (0, exports.smooth)(elapsed / exports.CHAPTER_TIMING.returning);
        const home = freshChapter().position;
        const virtualY = (0, exports.mix)((1 - reconstruction_1.BOWL_HOME.y) * surfaces.vertical.height, -home.y * surfaces.book.height, progress);
        const virtualX = (0, exports.mix)(0, (home.x - 0.5) * surfaces.book.width, progress);
        return { x: 0.5 + virtualX / surfaces[role].width,
            y: role === 'book' ? -virtualY / surfaces.book.height : 1 - virtualY / surfaces.vertical.height,
            visible: state.phase !== 'paging' || role === 'book', transfer: 1 - progress, explosion: 0, clearing: 0 };
    }
    const transfer = state.phase === 'book' ? 0 : state.phase === 'transferring' ? (0, exports.smooth)(elapsed / exports.CHAPTER_TIMING.transferring) : 1;
    const explosion = ['exploded', 'clearing', 'story'].includes(state.phase) ? 1
        : state.phase === 'exploding' ? (0, exports.smooth)(elapsed / exports.CHAPTER_TIMING.exploding) : 0;
    const clearing = state.phase === 'story' || state.phase === 'complete' ? 1 : state.phase === 'clearing' ? (0, exports.smooth)(elapsed / exports.CHAPTER_TIMING.clearing) : 0;
    const origin = state.phase === 'book' ? state.position : state.transferOrigin;
    const virtualY = (0, exports.mix)(-origin.y * surfaces.book.height, 0.48 * surfaces.vertical.height, transfer);
    const virtualX = (0, exports.mix)((origin.x - 0.5) * surfaces.book.width, 0, transfer);
    return {
        x: 0.5 + virtualX / surfaces[role].width,
        y: role === 'book' ? -virtualY / surfaces.book.height : (0, exports.mix)(1 - virtualY / surfaces.vertical.height, reconstruction_1.BOWL_HOME.y, clearing),
        visible: role === 'book' ? state.phase === 'book' || state.phase === 'transferring' : state.phase !== 'book',
        transfer, explosion, clearing,
    };
}
