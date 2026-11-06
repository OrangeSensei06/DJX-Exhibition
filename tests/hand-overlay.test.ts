import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewPoint } from '../src/gesture/handOverlay';

test('landmarks mirror horizontally with the camera preview', () => {
  assert.deepEqual(previewPoint({ x: 0.2, y: 0.25 }, 320, 240, 640, 480), { x: 256, y: 60 });
});

test('wide camera landmarks account for the preview crop', () => {
  assert.deepEqual(previewPoint({ x: 0.25, y: 0.5 }, 300, 225, 1600, 900), { x: 250, y: 112.5 });
  assert.deepEqual(previewPoint({ x: 0.5, y: 0.5 }, 300, 225, 1600, 900), { x: 150, y: 112.5 });
});

test('portrait camera landmarks account for the vertical preview crop', () => {
  const point = previewPoint({ x: 0.5, y: 0.25 }, 320, 240, 480, 640);
  assert.equal(point.x, 160);
  assert.ok(Math.abs(point.y - 40 / 3) < 0.000001);
});
