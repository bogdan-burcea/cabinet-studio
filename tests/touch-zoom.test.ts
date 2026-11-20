import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchZoom} from '../src/viewport/touch-zoom.ts';

const finger = (pointerId: number, clientX: number, clientY = 0) => ({pointerId, clientX, clientY});

test('a two-finger pinch zooms by the change in distance and suppresses taps until release', () => {
  const touch = new TouchZoom();
  assert.equal(touch.start(finger(1, 0)), false);
  assert.equal(touch.move(finger(1, 10)), undefined);
  assert.equal(touch.start(finger(2, 50)), true);
  assert.equal(touch.blocksSinglePointer, true);
  assert.equal(touch.move(finger(2, 90)), 0.5);
  assert.equal(touch.move(finger(2, 50)), 2);
  assert.equal(touch.end(1), false);
  assert.equal(touch.blocksSinglePointer, true);
  assert.equal(touch.move(finger(2, 70)), undefined);
  assert.equal(touch.end(2), true);
  assert.equal(touch.start(finger(3, 30)), false);
  assert.equal(touch.blocksSinglePointer, false);
});

test('replacing or adding fingers resumes from a fresh pinch distance', () => {
  const touch = new TouchZoom();
  touch.start(finger(1, 0));
  touch.start(finger(2, 60));
  touch.start(finger(3, 200));
  assert.equal(touch.move(finger(2, 40)), undefined);
  assert.equal(touch.end(3), false);
  assert.equal(touch.move(finger(2, 80)), 0.5);
  assert.equal(touch.end(1), false);
  assert.equal(touch.start(finger(4, 0, 60)), false);
  assert.equal(touch.move(finger(4, 80, 50)), 2);
});
