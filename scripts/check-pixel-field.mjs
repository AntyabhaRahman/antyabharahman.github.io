import assert from 'node:assert/strict';
import { isContourDot, mountPixelField, spawnPoint } from '../src/scripts/pixel-field.js';

assert.deepEqual(spawnPoint(100, 50, 1), [88, 6]);
assert.deepEqual(spawnPoint(100, 50, -1), [12, 44]);

const bands = new Uint8Array([1, 1, 2, 1]);
const hash = new Float32Array([0.2, 0.2, 0.2, 0.2]);
assert.equal(isContourDot(bands, 2, 0, hash), true);
assert.equal(isContourDot(new Uint8Array([1, 1, 1, 1]), 2, 0, hash), false);

const fills = [];
const context = {
	clearRect() {},
	fillRect(...args) { fills.push(args); },
	setTransform() {},
	set fillStyle(value) {},
	set globalAlpha(value) {},
};
const parent = { getBoundingClientRect: () => ({ width: 900, height: 450 }) };
const canvas = {
	getContext: () => context,
	getBoundingClientRect: () => ({ left: 0, top: 0 }),
	parentElement: parent,
	style: {},
};
const motion = { matches: false, addEventListener() {}, removeEventListener() {} };
globalThis.window = {
	devicePixelRatio: 1,
	matchMedia: () => motion,
	addEventListener() {},
	removeEventListener() {},
};
globalThis.document = {
	hidden: false,
	getSelection: () => ({ isCollapsed: true }),
	addEventListener() {},
	removeEventListener() {},
};
globalThis.getComputedStyle = () => ({
	getPropertyValue: (name) => name === '--paper' ? '#fff' : name === '--pf-accent' ? '#000' : '#ddd, #aaa, #777, #444',
});
globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } disconnect() {} };
globalThis.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ isIntersecting: true }]); } disconnect() {} };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

const field = mountPixelField(canvas, { mode: 'ambient' });
assert.ok(fills.some(([x, y, w, h]) => x === 792 && y === 54 && w === 17 && h === 17));
field.destroy();
