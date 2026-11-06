import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshChapter, reduceChapter, settleChapter, sampleChapter, CHAPTER_TIMING } from '../shared/chapter';
import { initialSurfaces } from '../shared/protocol';
import { INGREDIENT_IDS } from '../shared/reconstruction';
import { GesturePipeline } from '../src/gesture/gesturePipeline';

function story() {
  let state = reduceChapter(freshChapter(1000), { type: 'lift' }, 3000);
  state = settleChapter(state, 6000);
  state = reduceChapter(state, { type: 'explode' }, 6000);
  state = settleChapter(state, 8000);
  state = reduceChapter(state, { type: 'clear' }, 8000);
  return settleChapter(state, 11000);
}

test('the ingredient display rejects all previous pickup interactions', () => {
  const state = story();
  for (const type of ['point', 'grab', 'dragIngredient', 'drop'] as const) {
    assert.equal(reduceChapter(state, { type, x: .5, y: .89 }, 15000), state);
  }
});

test('the page swipe waits for every ingredient description to reveal', () => {
  const state = story();
  assert.equal(reduceChapter(state, { type: 'advance' }, state.startedAt + CHAPTER_TIMING.storyReveal - 1), state);
  const next = reduceChapter(state, { type: 'advance' }, state.startedAt + CHAPTER_TIMING.storyReveal);
  assert.equal(next.phase, 'reassembling');
  assert.deepEqual(next.reconstruction.collected, INGREDIENT_IDS);
  assert.equal(new Set(Object.values(next.reconstruction.placements).map(p => p!.at)).size, 1);
});

test('automatic reconstruction finishes before the bowl returns and the page turns', () => {
  let state = reduceChapter(story(), { type: 'advance' }, 15000);
  assert.equal(reduceChapter(state, { type: 'advance' }, 15500), state);
  state = settleChapter(state, 15000 + CHAPTER_TIMING.reassembling);
  assert.equal(state.phase, 'returning');
  state = settleChapter(state, state.startedAt + CHAPTER_TIMING.returning);
  assert.equal(state.phase, 'paging');
  state = settleChapter(state, state.startedAt + CHAPTER_TIMING.paging);
  assert.equal(state.phase, 'book');
  assert.deepEqual(state.position, freshChapter().position);
  assert.deepEqual(state.reconstruction.collected, []);
  assert.equal(state.openedAt + CHAPTER_TIMING.opening, state.startedAt);
});

test('late timers and reloads catch up to a fresh chapter without a second page turn', () => {
  const state = reduceChapter(story(), { type: 'advance' }, 15000);
  const restored = settleChapter(JSON.parse(JSON.stringify(state)), 30000);
  assert.equal(restored.phase, 'book');
  assert.ok(restored.openedAt + CHAPTER_TIMING.opening <= 30000);
});

test('return trajectory stays continuous across both screens and lands at the original book position', () => {
  let state = reduceChapter(story(), { type: 'advance' }, 15000);
  state = settleChapter(state, 16500);
  for (const t of [0, .25, .5, .75, 1]) {
    const now = state.startedAt + CHAPTER_TIMING.returning * t;
    const book = sampleChapter(state, 'book', now, initialSurfaces);
    const vertical = sampleChapter(state, 'vertical', now, initialSurfaces);
    assert.ok(Math.abs(-book.y * initialSurfaces.book.height - (1 - vertical.y) * initialSurfaces.vertical.height) < .00001);
    assert.ok(Math.abs((book.x - .5) * initialSurfaces.book.width - (vertical.x - .5) * initialSurfaces.vertical.width) < .00001);
  }
  const home = sampleChapter(state, 'book', state.startedAt + CHAPTER_TIMING.returning, initialSurfaces);
  assert.equal(home.x, .75);
  assert.equal(home.y, .56);
});

test('the actual worker pipeline accepts a left swipe at the ending but no gestures during the transition', () => {
  const pipeline = new GesturePipeline();
  pipeline.setContext({ page: 1, phase: 'story', openedAt: 1000, notBefore: 12000 });
  const hand = (x: number) => [{ x, y: .5, pinch: 1 }];
  assert.equal(pipeline.update(hand(.8), 1000, 11000).gesture, null);
  pipeline.update(hand(.8), 13000, 13000);
  assert.equal(pipeline.update(hand(.56), 13150, 13150).gesture, 'left');
  for (const phase of ['reassembling', 'returning', 'paging'] as const) {
    pipeline.setContext({ page: 1, phase, openedAt: 1000, notBefore: 0 });
    pipeline.update(hand(.8), 15000, 15000);
    const outcome = pipeline.update(hand(.56), 15150, 15150);
    assert.equal(outcome.gesture, null);
    assert.equal(outcome.action, null);
  }
});
