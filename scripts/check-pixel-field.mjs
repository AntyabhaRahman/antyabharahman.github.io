import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isContourDot, mountPixelField, spawnPoint } from '../src/scripts/pixel-field.js';

assert.deepEqual(spawnPoint(100, 50, 1), [88, 6]);
assert.deepEqual(spawnPoint(100, 50, -1), [12, 44]);

const bands = new Uint8Array([1, 1, 2, 1]);
const hash = new Float32Array([0.2, 0.2, 0.2, 0.2]);
assert.equal(isContourDot(bands, 2, 0, hash), true);
assert.equal(isContourDot(new Uint8Array([1, 1, 1, 1]), 2, 0, hash), false);

const fills = [];
const paintedColors = new Set();
let fillColor;
let signature;
const context = {
	clearRect(...args) { signature?.update(JSON.stringify(['clear', ...args])); },
	fillRect(...args) { fills.push(args); paintedColors.add(fillColor); signature?.update(JSON.stringify([fillColor, ...args])); },
	setTransform() {},
	set fillStyle(value) { fillColor = value; },
	set globalAlpha(value) {},
};
const parent = { getBoundingClientRect: () => ({ width: 900, height: 450 }) };
const canvas = {
	getContext: () => context,
	getBoundingClientRect: () => ({ left: 0, top: 0 }),
	parentElement: parent,
	style: {},
};
const pointerHandlers = new Map();
globalThis.window = { devicePixelRatio: 1, addEventListener: (name, handler) => pointerHandlers.set(name, handler), removeEventListener: (name) => pointerHandlers.delete(name) };
let selectionCollapsed = true;
const documentHandlers = new Map();
globalThis.document = { getSelection: () => ({ isCollapsed: selectionCollapsed }), addEventListener: (name, handler) => documentHandlers.set(name, handler), removeEventListener: (name) => documentHandlers.delete(name) };
globalThis.getComputedStyle = () => ({
	getPropertyValue: (name) => name === '--paper' ? '#fff' : name === '--pf-accent' ? '#000' : '#ddd, #aaa, #777, #444',
});
globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } disconnect() {} };
globalThis.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ isIntersecting: true }]); } disconnect() {} };
let nextFrame;
let clock = 0;
globalThis.performance = { now: () => clock };
globalThis.requestAnimationFrame = (callback) => { nextFrame = callback; return 1; };
let stopped = false;
globalThis.cancelAnimationFrame = () => { stopped = true; };

const field = mountPixelField(canvas, { mode: 'ambient' });
assert.ok(fills.some(([x, y, w, h]) => x === 792 && y === 54 && w === 17 && h === 17));
fills.length = 0;
nextFrame(16);
assert.equal(fills.length, 0, 'Idle ambient field skips the intermediate frame.');
nextFrame(34);
assert.ok(fills.length > 0, 'Ambient field still paints at 30 Hz.');
fills.length = 0;
pointerHandlers.get('pointermove')({ pointerType: 'mouse', clientX: 450, clientY: 220 });
nextFrame(50);
assert.ok(fills.length > 0, 'Pointer interaction bypasses the ambient frame limit.');
field.destroy();

const trail = mountPixelField(canvas, { mode: 'trail' });
pointerHandlers.get('pointermove')({ pointerType: 'mouse', buttons: 0, clientX: 450, clientY: 220 });
nextFrame(16);
selectionCollapsed = false;
assert.ok(documentHandlers.has('selectionchange'), 'Selection must control the trail.');
documentHandlers.get('selectionchange')();
stopped = false;
for (let t = 32; t <= 128; t += 16) {
	pointerHandlers.get('pointermove')({ pointerType: 'mouse', buttons: 1, clientX: 450 + t, clientY: 220 });
	nextFrame(t);
}
assert.equal(stopped, true, 'Selection clears the trail in about 100 ms despite continued dragging.');
fills.length = 0;
pointerHandlers.get('pointermove')({ pointerType: 'mouse', buttons: 0, clientX: 700, clientY: 220 });
nextFrame(144);
assert.equal(fills.length, 0, 'Normal hover stays clear while text remains selected.');
pointerHandlers.get('pointerdown')({ pointerType: 'mouse', button: 0 });
selectionCollapsed = true;
documentHandlers.get('selectionchange')();
clock = 144;
paintedColors.clear();
pointerHandlers.get('click')({ clientX: 720, clientY: 220 });
assert.equal(fills.length, 0, 'The click waits for selection clearing to paint.');
nextFrame(160);
assert.equal(fills.length, 0, 'The first frame leaves the cleared selection unobstructed.');
nextFrame(176);
assert.ok(fills.length > 0, 'The following frame paints the pulse without pointer movement.');
assert.ok(fills.every(([x, y]) => Math.abs(x - 720) <= 36 && Math.abs(y - 220) <= 36), 'Pulse stays within a smaller 36px radius.');
assert.ok(!paintedColors.has('#777'), 'The acknowledgement uses gentle ink.');
stopped = false;
for (let t = 192; t <= 400; t += 16) nextFrame(t);
assert.equal(stopped, false, 'The pulse continues through most of its 250ms fade.');
for (let t = 416; t <= 432; t += 16) nextFrame(t);
assert.equal(stopped, true, 'Stationary click pulse finishes within one frame of 250ms.');
fills.length = 0;
pointerHandlers.get('click')({ clientX: 720, clientY: 220 });
assert.equal(fills.length, 0, 'Ordinary background clicks do not retrigger the pulse.');
clock = 432;
paintedColors.clear();
pointerHandlers.get('pointermove')({ pointerType: 'mouse', clientX: 720, clientY: 220 });
nextFrame(448);
assert.ok(paintedColors.has('#777'), 'Normal hover immediately restores full-strength pointer ink.');
trail.destroy();
assert.equal(documentHandlers.has('selectionchange'), false, 'Destroy removes the selection listener.');
assert.equal(pointerHandlers.has('click'), false, 'Destroy removes click listener.');
assert.equal(pointerHandlers.has('pointerdown'), false, 'Destroy removes pointerdown listener.');

// Lock the visible terrain/optimizer output while changing its calculation strategy.
signature = createHash('sha256');
clock = 0;
const rendering = mountPixelField(canvas, { mode: 'ambient' });
for (let i = 1; i <= 150; i++) {
	clock = i * 34;
	if (i === 40) pointerHandlers.get('pointermove')({ pointerType: 'mouse', clientX: 450, clientY: 220 });
	nextFrame(clock);
}
assert.equal(signature.digest('hex'), '8bd8673699b02dadf31c986f76d0d4c376e84077351c1331efd93c6641528cda', 'Terrain, pointer and optimizer drawings must preserve the original output.');
rendering.destroy();
