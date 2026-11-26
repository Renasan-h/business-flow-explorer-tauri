import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEditorScenario } from '../src/editor/validateEditorScenario.ts';

const actors = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
const step = { id: 's', actions: [{ from: 'a', to: 'b', durationMs: 100 }] };
const points = count => Array.from({ length: count }, (_, i) => ({ x: -i, y: i }));
const validate = (steps = [step], nodes = actors, groups = []) => validateEditorScenario(nodes, steps, groups);

test('WIN-23: valid scenario', () => assert.equal(validate(), null));
test('WIN-23: duplicate actor ID', () => assert.match(validate([step], [actors[0], actors[0]]), /ノードID/));
test('WIN-23: duplicate step ID', () => assert.match(validate([step, step]), /通信のID/));
test('WIN-23: missing actor reference', () => assert.match(validate([{ ...step, actions: [{ ...step.actions[0], to: 'missing' }] }]), /参照先/));
test('WIN-23: missing reverse actor', () => assert.match(validate([{ ...step, bidirectional: true, reverseFrom: 'b', reverseTo: 'missing' }]), /参照先/));
for (const key of ['waypoints', 'reverseWaypoints']) {
  test(`WIN-23: ${key} accepts 100`, () => assert.equal(validate([{ ...step, [key]: points(100) }]), null));
  test(`WIN-23: ${key} rejects 101`, () => assert.match(validate([{ ...step, [key]: points(101) }]), /経由点/));
  for (const value of [Infinity, -Infinity, NaN]) {
    for (const axis of ['x', 'y']) {
      test(`WIN-23: ${key} rejects ${axis}=${value}`, () => assert.match(validate([{ ...step, [key]: [{ x: 0, y: 0, [axis]: value }] }]), /経由点/));
    }
  }
}
for (const durationMs of [Infinity, -Infinity, NaN, 0, -1]) {
  test(`WIN-23: rejects duration ${durationMs}`, () => assert.match(validate([{ ...step, actions: [{ ...step.actions[0], durationMs }] }]), /所要時間/));
}
