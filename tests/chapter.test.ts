import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_TIMING, freshChapter, reduceChapter, sampleChapter, settleChapter } from '../shared/chapter';
import { initialSurfaces } from '../shared/protocol';
import { ChapterGestureDetector } from '../src/gesture/chapterGestures';
import type { TrackedHand } from '../src/gesture/chapterGestures';

const hand = (x: number, y: number, pinch = 1): TrackedHand => ({ x, y, pinch });
function pairMotion(detector: ChapterGestureDetector, ax: number, ay: number, bx: number, by: number, start = 3000) {
  const actions: string[] = [];
  for (let step = 0; step <= 5; step++) {
    const t = step / 5;
    const result = detector.update([hand(0.38 + ax * t, 0.5 + ay * t), hand(0.62 + bx * t, 0.5 + by * t)], start + step * 100);
    if (result) actions.push(result.type);
  }
  return actions;
}

test('lift, explosion and clearance are only accepted in that order', () => {
  let chapter = freshChapter(1000);
  assert.equal(reduceChapter(chapter, { type: 'explode' }, 3000), chapter);
  chapter = reduceChapter(chapter, { type: 'lift' }, 3000);
  assert.equal(chapter.phase, 'transferring');
  assert.equal(reduceChapter(chapter, { type: 'explode' }, 3200), chapter);
  chapter = settleChapter(chapter, 3000 + CHAPTER_TIMING.transferring);
  assert.equal(chapter.phase, 'presented');
  assert.equal(reduceChapter(chapter, { type: 'clear' }, 6000), chapter);
  chapter = reduceChapter(chapter, { type: 'explode' }, 6000);
  chapter = settleChapter(chapter, 6000 + CHAPTER_TIMING.exploding);
  assert.equal(chapter.phase, 'exploded');
  chapter = reduceChapter(chapter, { type: 'clear' }, 8000);
  chapter = settleChapter(chapter, 8000 + CHAPTER_TIMING.clearing);
  assert.equal(chapter.phase, 'story');
  assert.equal(chapter.actions, 3);
});
test('opening animation owns the interaction until its page has settled', () => {
  const chapter = freshChapter(1000);
  assert.equal(reduceChapter(chapter, { type: 'lift' }, 1200), chapter);
});
test('bowl movement is clamped and cannot move a bowl already in the gallery', () => {
  let chapter = reduceChapter(freshChapter(1000), { type: 'move', dx: 9, dy: -9 }, 3000);
  assert.ok(chapter.position.x <= 0.9 && chapter.position.y >= 0.35);
  chapter = reduceChapter(chapter, { type: 'lift' }, 3100);
  assert.equal(reduceChapter(chapter, { type: 'move', dx: -0.1, dy: 0 }, 3200), chapter);
});
test('handoff poses share exactly the same virtual position across differently sized canvases', () => {
  const chapter = reduceChapter(freshChapter(1000), { type: 'lift' }, 3000);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const now = 3000 + CHAPTER_TIMING.transferring * t;
    const book = sampleChapter(chapter, 'book', now, initialSurfaces);
    const gallery = sampleChapter(chapter, 'vertical', now, initialSurfaces);
    assert.ok(Math.abs(-book.y * initialSurfaces.book.height - (1 - gallery.y) * initialSurfaces.vertical.height) < 0.00001);
    assert.ok(Math.abs((book.x - 0.5) * initialSurfaces.book.width - (gallery.x - 0.5) * initialSurfaces.vertical.width) < 0.00001);
  }
});
test('reloading during an animation samples its current progress rather than starting again', () => {
  const chapter = reduceChapter(freshChapter(1000), { type: 'lift' }, 3000);
  const before = sampleChapter(chapter, 'vertical', 4200, initialSurfaces);
  const restored = sampleChapter(JSON.parse(JSON.stringify(chapter)), 'vertical', 4200, initialSurfaces);
  assert.deepEqual(restored, before);
  assert.ok(before.transfer > 0 && before.transfer < 1);
});
test('restarting the chapter clears all staged interaction progress', () => {
  const lifted = reduceChapter(freshChapter(1000), { type: 'lift' }, 3000);
  assert.deepEqual(reduceChapter(lifted, { type: 'restart' }, 4000), freshChapter(4000));
});
test('coherent upward motion of two hands lifts the bowl', () => {
  assert.deepEqual(pairMotion(new ChapterGestureDetector(), -0.02, -0.23, 0.02, -0.23), ['lift']);
});
test('one moving hand cannot trigger a two-hand lift', () => {
  assert.deepEqual(pairMotion(new ChapterGestureDetector(), 0, -0.25, 0, 0), []);
});
test('opposite vertical sweeps allow diagonal movement', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  assert.deepEqual(pairMotion(detector, -0.08, -0.14, -0.08, 0.14), ['explode']);
});
test('both hands moving up cannot trigger the opposite-vertical gesture', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  assert.deepEqual(pairMotion(detector, -0.14, -0.13, 0.14, -0.13), []);
});
test('a vertical outward spread can reveal the layers', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  assert.deepEqual(pairMotion(detector, 0, -0.23, 0, 0.23), ['explode']);
});
test('moving hands inward is not an outward spread', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  assert.deepEqual(pairMotion(detector, 0.11, 0, -0.11, 0), []);
});
test('the clearing spread tolerates 31 degrees of tilt from horizontal', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('exploded');
  assert.deepEqual(pairMotion(detector, -0.16, 0.095, 0.16, -0.095), ['clear']);
});
test('a vertical spread cannot clear the layers in the third interaction', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('exploded');
  assert.deepEqual(pairMotion(detector, 0, -0.23, 0, 0.23), []);
});
test('horizontal angle tolerance accounts for a widescreen camera image', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('exploded'); detector.setAspectRatio(16 / 9);
  // In pixel space this is about 29 degrees; normalized coordinates alone suggest 45.
  assert.deepEqual(pairMotion(detector, -0.16, 0.16, 0.16, -0.16), ['clear']);
});
test('a continued first spread cannot immediately clear the next stage', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  assert.deepEqual(pairMotion(detector, 0, -0.15, 0, 0.15), ['explode']);
  detector.setPhase('exploded');
  const results = [];
  for (let step = 0; step < 6; step++) {
    const result = detector.update([hand(0.38, 0.35 - step * 0.02), hand(0.62, 0.65 + step * 0.02)], 3600 + step * 100);
    if (result) results.push(result.type);
  }
  assert.deepEqual(results, []);
});
test('losing either hand cancels an incomplete pair gesture', () => {
  const detector = new ChapterGestureDetector();
  detector.update([hand(0.4, 0.6), hand(0.6, 0.6)], 1000);
  detector.update([hand(0.4, 0.5)], 1100);
  assert.equal(detector.update([hand(0.4, 0.2), hand(0.6, 0.2)], 1200), null);
});
test('pinch ownership enables movement and is released on tracking loss', () => {
  const detector = new ChapterGestureDetector();
  assert.equal(detector.update([hand(0.7, 0.5, 0.25)], 1000), null);
  assert.equal(detector.update([hand(0.75, 0.5, 0.25)], 1100)?.type, 'move');
  detector.update([], 1200);
  assert.equal(detector.update([hand(0.9, 0.5, 0.25)], 1300), null);
});
