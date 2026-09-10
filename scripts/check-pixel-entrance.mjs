import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Run the real entrance lifecycle with drawing stubbed out; no browser dependency.
const source = readFileSync(new URL('../src/scripts/pixel-type.js', import.meta.url), 'utf8');
for (const finish of ['complete', 'resize', 'reduced']) {
	const motion = { matches: false };
	const elements = [{ inert: false }, { inert: false }, { inert: true }];
	const classes = new Set(['px-wait']);
	const handlers = new Map();
	const span = { style: {} };
	const graphic = { style: {} };
	let frame;
	let scrollReads = 0;
	const drawing = { setTransform() {}, clearRect() {}, transform() {}, fillRect() {} };
	const context = vm.createContext({
		matchMedia: () => motion,
		document: {
			documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) } },
			readyState: 'complete',
			body: { appendChild() {} },
			createElement: () => ({ getContext: () => drawing, style: {}, setAttribute() {}, remove() {} }),
			querySelectorAll: (selector) => selector === '[data-px-border]' || selector === '.note svg' ? [] : elements,
		},
		getComputedStyle: () => ({ opacity: '1', getPropertyValue: () => '#000' }),
		performance: { getEntriesByType: () => [{ type: 'back_forward' }], now: () => 0 },
		devicePixelRatio: 1.1, innerWidth: 1000, innerHeight: 800, scrollX: 0, scrollY: 0,
		addEventListener: (name, handler) => handlers.set(name, handler),
		removeEventListener: (name) => handlers.delete(name),
		requestAnimationFrame: (callback) => { frame = callback; },
		span, graphic,
	});
	Object.defineProperty(context, 'scrollX', { get() { scrollReads++; return 0; } });
	vm.runInContext(source, context);
	classes.add('px-wait');
	vm.runInContext(`
		wrapWords = () => [span];
		viewportMatrices = () => new Map();
		measure = (value) => value;
		rasterize = (items, scale) => { sampledScale = scale; return [{
			span, cell: 3, cells: [0, 0], color: '#000',
			place: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, transformPoint: () => ({ x: 0, y: 0 }) }
		}, { graphic, cell: 3, cells: [0, 0], color: '#000', place: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, transformPoint: () => ({ x: 0, y: 0 }) } }]; };
		lightUp();
	`, context);
	assert.equal(context.sampledScale, 2, 'fractional display scale must use integer raster indexes');
	assert.ok(classes.has('px-live'));
	scrollReads = 0;
	frame(200);
	assert.ok(scrollReads <= 1, 'Read scroll position once per frame, before text style writes.');
	assert.deepEqual(elements.map((e) => e.inert), [true, true, true]);
	if (finish === 'resize') {
		context.innerWidth = 500;
		handlers.get('resize')();
	}
	if (finish === 'reduced') motion.matches = true;
	frame(finish === 'complete' ? 7000 : 210);
	assert.equal(classes.has('px-live'), false);
	assert.deepEqual(elements.map((e) => e.inert), [false, false, true]);
	assert.equal(span.style.color, '');
	assert.equal(graphic.style.opacity, '');
	assert.equal(handlers.has('resize'), false);
	vm.runInContext('lightUp()', context);
	assert.equal(classes.has('px-live'), false, 'Never restart the entrance after text is already revealed.');
}
console.log('Entrance locks and restores interaction on completion and resize.');

// The crossover reaches both endpoints gently and keeps a monotone, overlapping handoff.
const ctx = vm.createContext({document:{createElement:()=>({getContext:()=>({})}),documentElement:{classList:{remove(){}}},readyState:'complete'},performance:{getEntriesByType:()=>[{type:'back_forward'}]}});
vm.runInContext(source, ctx);
const curve = p => vm.runInContext(`crossover(${p})`, ctx);
assert.equal(curve(0).up, 0);
assert.equal(curve(1).down, 0);
assert.ok(Number.isFinite(curve(0.99999999).down));
assert.ok(curve(0.01).up < 0.004);
assert.ok(curve(0.99).down < 0.004);
for (let p=0.01; p<=1; p+=0.01) {
 assert.ok(curve(p).up >= curve(p-0.01).up);
 assert.ok(curve(p).down <= curve(p-0.01).down);
 // Alpha layers composite rather than add. This guards their shared stroke area,
 // not the perceived brightness of the different pixel and glyph shapes.
 const { up, down } = curve(p);
 assert.ok(up + down - up * down >= 0.85, 'Overlapping ink must not dip into a pale midpoint.');
}
console.log('Crossover starts and ends gently, with monotone opacity.');

vm.runInContext('off.width = 100; off.height = 100; rasterize([], 1);', ctx);
assert.equal(vm.runInContext('off.width * off.height', ctx), 0, 'Release the temporary raster backing store after sampling.');

// A long outline must finish its ramp with nearby text, rather than wait for its far edge.
const delays = source.slice(source.indexOf('\tfor (const wd of words) {'), source.indexOf('\n\tconst canvas = document.createElement', source.indexOf('\tfor (const wd of words) {')));
const border = { border: true, cells: [0, 0, 1000, 800], place: { transformPoint: p => p } };
const timing = vm.createContext({ words: [border], innerWidth: 1000, innerHeight: 800, Float32Array, Math: Object.assign(Object.create(Math), { random: () => 0 }) });
vm.runInContext(`const SWEEP = 256, JITTER = 72, RAMP = 160; ${delays}`, timing);
assert.equal(border.delay[0], border.delay[1], 'Border extent must not delay its crossover.');
assert.equal(border.ready, 160);

const reduced = vm.createContext({document:{createElement:()=>({getContext:()=>({})}),documentElement:{classList:{contains:()=>true,remove(){}}},readyState:'complete'},performance:{getEntriesByType:()=>[{type:'back_forward'}]},matchMedia:()=>({matches:true})});
vm.runInContext(source, reduced);
vm.runInContext('lightUp()', reduced); // No rasterization or animation APIs needed with reduced motion.
