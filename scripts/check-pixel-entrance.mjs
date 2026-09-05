import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the real entrance lifecycle with drawing stubbed out; no browser dependency.
const source = readFileSync(new URL('../src/scripts/pixel-type.js', import.meta.url), 'utf8');
for (const resized of [false, true]) {
	const elements = [{ inert: false }, { inert: false }, { inert: true }];
	const classes = new Set(['px-wait']);
	const handlers = new Map();
	const span = { style: {} };
	let frame;
	const drawing = { setTransform() {}, clearRect() {}, transform() {}, fillRect() {} };
	const context = vm.createContext({
		document: {
			documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
			readyState: 'complete',
			body: { appendChild() {} },
			createElement: () => ({ getContext: () => drawing, style: {}, setAttribute() {}, remove() {} }),
			querySelectorAll: (selector) => selector === '[data-px-border]' ? [] : elements,
		},
		getComputedStyle: () => ({ opacity: '1', getPropertyValue: () => '#000' }),
		performance: { getEntriesByType: () => [{ type: 'back_forward' }], now: () => 0 },
		devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800, scrollX: 0, scrollY: 0,
		addEventListener: (name, handler) => handlers.set(name, handler),
		removeEventListener: (name) => handlers.delete(name),
		requestAnimationFrame: (callback) => { frame = callback; },
		span,
	});
	vm.runInContext(source, context);
	vm.runInContext(`
		wrapWords = () => [span];
		measure = (value) => value;
		rasterize = () => [{
			span, cell: 3, cells: [0, 0], color: '#000',
			place: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, transformPoint: () => ({ x: 0, y: 0 }) }
		}];
		lightUp();
	`, context);
	assert.ok(classes.has('px-live'));
	assert.deepEqual(elements.map((e) => e.inert), [true, true, true]);
	if (resized) {
		context.innerWidth = 500;
		handlers.get('resize')();
	}
	frame(resized ? 10 : 7000);
	assert.equal(classes.has('px-live'), false);
	assert.deepEqual(elements.map((e) => e.inert), [false, false, true]);
	assert.equal(span.style.color, '');
	assert.equal(handlers.has('resize'), false);
}
console.log('Entrance locks and restores interaction on completion and resize.');
