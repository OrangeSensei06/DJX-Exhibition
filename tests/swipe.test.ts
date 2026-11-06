import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SwipeDetector } from '../src/gesture/swipe';

function sweep(detector: SwipeDetector, from: number, to: number, start = 1000, duration = 500, yEnd = 0.5) {
  const results: string[] = [];
  for (let index = 0; index <= 10; index++) {
    const time = start + duration * index / 10;
    const result = detector.update({ x: from + (to - from) * index / 10, y: 0.5 + (yEnd - 0.5) * index / 10, time }, time);
    if (result) results.push(result);
  }
  return results;
}

test('a right-to-left sweep emits one forward gesture', () => {
  assert.deepEqual(sweep(new SwipeDetector(), 0.82, 0.22), ['left']);
});
test('a left-to-right sweep emits one backward gesture', () => {
  assert.deepEqual(sweep(new SwipeDetector(), 0.18, 0.78), ['right']);
});
test('small movements do not count as swipes', () => {
  assert.deepEqual(sweep(new SwipeDetector(), 0.78, 0.65), []);
});
test('predominantly vertical movement does not navigate', () => {
  assert.deepEqual(sweep(new SwipeDetector(), 0.8, 0.5, 1000, 500, 0.95), []);
});
test('a slow drift is not a swipe', () => {
  assert.deepEqual(sweep(new SwipeDetector(), 0.82, 0.22, 1000, 2200), []);
});
test('tracking loss never joins two distant positions into a sweep', () => {
  const detector = new SwipeDetector();
  detector.update({ x: 0.8, y: 0.5, time: 1000 }, 1000);
  detector.update(null, 1050);
  assert.equal(detector.update({ x: 0.2, y: 0.5, time: 1100 }, 1100), null);
});
test('a large tracking jump is rejected', () => {
  const detector = new SwipeDetector();
  detector.update({ x: 0.8, y: 0.5, time: 1000 }, 1000);
  assert.equal(detector.update({ x: 0.2, y: 0.5, time: 1050 }, 1050), null);
});
test('a deliberate sweep still works when processing runs at five frames per second', () => {
  const detector = new SwipeDetector();
  const results: string[] = [];
  for (const [index, x] of [0.82, 0.63, 0.43, 0.22].entries()) {
    const time = 1000 + index * 200;
    const result = detector.update({ x, y: 0.5, time }, time);
    if (result) results.push(result);
  }
  assert.deepEqual(results, ['left']);
});
test('a clear sweep can be recognized from two lower-rate camera samples', () => {
  const detector = new SwipeDetector();
  detector.update({ x: 0.8, y: 0.5, time: 1000 }, 1000);
  assert.equal(detector.update({ x: 0.45, y: 0.5, time: 1150 }, 1150), 'left');
});
test('holding a hand at the starting side does not expire the next sweep', () => {
  const detector = new SwipeDetector();
  for (let time = 1000; time <= 3000; time += 50) detector.update({ x: 0.82, y: 0.5, time }, time);
  assert.deepEqual(sweep(detector, 0.82, 0.22, 3050), ['left']);
});
test('the immediate returning hand does not turn a second page', () => {
  const detector = new SwipeDetector();
  assert.deepEqual(sweep(detector, 0.82, 0.22), ['left']);
  assert.deepEqual(sweep(detector, 0.22, 0.82, 1550), []);
});
test('settling after cooldown permits the next deliberate sweep', () => {
  const detector = new SwipeDetector();
  sweep(detector, 0.82, 0.22);
  sweep(detector, 0.22, 0.82, 1550);
  for (let time = 2100; time <= 3000; time += 50) detector.update({ x: 0.82, y: 0.5, time }, time);
  assert.deepEqual(sweep(detector, 0.82, 0.22, 3050), ['left']);
});
