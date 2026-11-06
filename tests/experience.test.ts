import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigateExperience } from '../shared/experience';
import { initialExperience } from '../shared/protocol';

test('keyboard testing advances without claiming a detected gesture', () => {
  const state = navigateExperience(initialExperience, 'next', 'keyboard', 1000);
  assert.equal(state.page, 1);
  assert.equal(state.gestureCount, 0);
  assert.equal(state.lastInput, 'keyboard');
});
test('duplicate gesture commands within the cooldown advance only once', () => {
  const first = navigateExperience(initialExperience, 'next', 'gesture', 1000);
  const duplicate = navigateExperience(first, 'next', 'gesture', 1050);
  assert.equal(duplicate.page, 1);
  assert.equal(duplicate.gestureCount, 1);
});
test('navigation stays within the available pages', () => {
  let state = initialExperience;
  for (let time = 1000; time < 6000; time += 1000) state = navigateExperience(state, 'next', 'gesture', time);
  assert.equal(state.page, 1);
  for (let time = 6000; time < 11000; time += 1000) state = navigateExperience(state, 'previous', 'operator', time);
  assert.equal(state.page, 0);
});
test('chapter gestures cannot accidentally navigate back to the invitation', () => {
  const chapter = navigateExperience(initialExperience, 'next', 'gesture', 1000);
  assert.equal(navigateExperience(chapter, 'previous', 'gesture', 4000).page, 1);
});
test('operator reset returns to the invitation and clears gesture counts', () => {
  const open = navigateExperience(initialExperience, 'next', 'gesture', 1000);
  const reset = navigateExperience(open, 'reset', 'operator', 1200);
  assert.equal(reset.page, 0);
  assert.equal(reset.gestureCount, 0);
});
