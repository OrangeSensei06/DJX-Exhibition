import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChapterGestureDetector } from '../src/gesture/chapterGestures';
import { GesturePipeline } from '../src/gesture/gesturePipeline';
import { freshChapter, reduceChapter, settleChapter } from '../shared/chapter';
import { ingredientAt, emptyReconstruction, ingredientHome, inBowl } from '../shared/reconstruction';

const pair = (y1: number, y2: number, x1 = 0.35, x2 = 0.65) => [
  { x: x1, y: y1, pinch: 1, id: 'Left' }, { x: x2, y: y2, pinch: 1, id: 'Right' },
];
test('a small upward sweep needs only two low-rate camera samples', () => {
  const detector = new ChapterGestureDetector();
  assert.equal(detector.update(pair(0.6, 0.6), 1000), null);
  assert.equal(detector.update(pair(0.535, 0.54), 1250)?.type, 'lift');
});
test('a broad fast upward sweep is accepted too', () => {
  const detector = new ChapterGestureDetector();
  detector.update(pair(0.85, 0.85), 1000);
  assert.equal(detector.update(pair(0.18, 0.18), 1200)?.type, 'lift');
});
test('slow starts accumulate rather than repeatedly erasing the anchor', () => {
  const detector = new ChapterGestureDetector();
  const found = [];
  for (let i = 0; i < 12; i++) {
    const action = detector.update(pair(0.6 - i * 0.009, 0.6 - i * 0.01), 1000 + i * 100);
    if (action) found.push(action.type);
  }
  assert.deepEqual(found, ['lift']);
});
test('short opposite Y sweeps work even when hand separation barely increases', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  detector.update(pair(0.5, 0.5, 0.15, 0.85), 1000);
  assert.equal(detector.update(pair(0.45, 0.55, 0.15, 0.85), 1200)?.type, 'explode');
});
test('either hand may go up while the other goes down', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  detector.update(pair(0.5, 0.5), 1000);
  assert.equal(detector.update(pair(0.55, 0.45), 1200)?.type, 'explode');
});
test('sideways spreading cannot substitute for the vertical stage', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  detector.update(pair(0.5, 0.5), 1000);
  assert.equal(detector.update(pair(0.5, 0.5, 0.2, 0.8), 1200), null);
});
test('new stages arm without a hold-still ritual', () => {
  const detector = new ChapterGestureDetector();
  detector.update(pair(0.6, 0.6), 1000);
  assert.equal(detector.update(pair(0.53, 0.53), 1200)?.type, 'lift');
  detector.setPhase('transferring'); detector.update(pair(0.53, 0.53), 1300);
  detector.setPhase('presented'); detector.update(pair(0.53, 0.53), 1400);
  assert.equal(detector.update(pair(0.47, 0.59), 1600)?.type, 'explode');
  detector.setPhase('exploded'); detector.update(pair(0.47, 0.59), 1700);
  assert.equal(detector.update(pair(0.47, 0.59, 0.29, 0.71), 1900)?.type, 'clear');
});
test('the sideways sweep tolerates relaxed diagonal movement', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('exploded');
  detector.update(pair(0.5, 0.5), 1000);
  assert.equal(detector.update(pair(0.555, 0.445, 0.3, 0.7), 1200)?.type, 'clear');
});
test('small stationary jitter does not move through chapter stages', () => {
  for (const phase of ['book', 'presented', 'exploded'] as const) {
    const detector = new ChapterGestureDetector(); detector.setPhase(phase);
    for (let i = 0; i < 40; i++) assert.equal(detector.update(pair(0.5 + Math.sin(i) * 0.01, 0.5 + Math.cos(i) * 0.01), 1000 + i * 80), null);
  }
});
test('hand result order changes do not reverse identity', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  detector.update(pair(0.5, 0.5), 1000);
  assert.equal(detector.update(pair(0.445, 0.555).reverse(), 1200)?.type, 'explode');
});
test('flipped handedness labels do not block a valid sweep', () => {
  const detector = new ChapterGestureDetector(); detector.setPhase('presented');
  detector.update(pair(0.5, 0.5), 1000);
  const next = pair(0.445, 0.555);
  next[0].id = 'Right'; next[1].id = 'Left';
  assert.equal(detector.update(next, 1200)?.type, 'explode');
});
test('the worker pipeline advances all three stages from actual hand motion', () => {
  const pipeline = new GesturePipeline();
  let chapter = freshChapter(1000);
  let now = 3000;
  const motions = [
    [pair(0.6, 0.6), pair(0.535, 0.54)],
    [pair(0.5, 0.5, 0.1, 0.9), pair(0.445, 0.555, 0.1, 0.9)],
    [pair(0.5, 0.5), pair(0.5, 0.5, 0.295, 0.705)],
  ];
  const actions = [];
  for (const motion of motions) {
    pipeline.setContext({ page: 1, phase: chapter.phase, openedAt: 1000, notBefore: 2450 });
    assert.equal(pipeline.update(motion[0], now, now).action, null);
    const action = pipeline.update(motion[1], now + 200, now + 200).action;
    assert.ok(action);
    actions.push(action.type);
    chapter = reduceChapter(chapter, action, now + 200);
    pipeline.setContext({ page: 1, phase: chapter.phase, openedAt: 1000, notBefore: 2450 });
    now += 3000;
    chapter = settleChapter(chapter, now);
  }
  assert.deepEqual(actions, ['lift', 'explode', 'clear']);
  assert.equal(chapter.phase, 'story');
});
test('a relaxed pinch moves the bowl and ingredient targets have exhibition-sized hit areas', () => {
  const detector = new ChapterGestureDetector();
  detector.update([{ x: 0.7, y: 0.5, pinch: 0.6 }], 1000);
  assert.equal(detector.update([{ x: 0.74, y: 0.5, pinch: 0.6 }], 1100)?.type, 'move');
  const rice = ingredientHome('rice');
  assert.equal(ingredientAt(emptyReconstruction(), rice.x - 0.14, rice.y), 'rice');
  assert.equal(inBowl(0.22, 0.77), true);
});
