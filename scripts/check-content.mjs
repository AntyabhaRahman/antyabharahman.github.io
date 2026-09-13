import assert from 'node:assert/strict';
import { venueWithYear } from '../src/utils.ts';

const date = new Date('2026-01-01T12:00:00Z');
assert.equal(venueWithYear('AAAI 2026 Workshop on XAI4Science', date), 'AAAI 2026 Workshop on XAI4Science');
assert.equal(venueWithYear('Nature', date), 'Nature, 2026');
assert.equal(venueWithYear('Workshop 2025', date), 'Workshop 2025, 2026');
assert.equal(venueWithYear('Dataset 120260', date), 'Dataset 120260, 2026');
console.log('Content metadata checks passed.');
