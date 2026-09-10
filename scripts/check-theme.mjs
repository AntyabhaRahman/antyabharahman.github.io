import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual bootstrap and toggle when browser storage is unavailable.
const bootstrap = readFileSync(new URL('../src/scripts/theme-init.js', import.meta.url), 'utf8');
const toggle = readFileSync(new URL('../src/components/ThemeToggle.astro', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
	.replace('querySelector<HTMLButtonElement>', 'querySelector').replace("('.theme-toggle')!", "('.theme-toggle')").replace('(document as any)', 'document').replace(': { x: number; y: number } | null', '');
for (const blocked of [false, true]) for (const reduced of [false, true]) for (const transitions of [false, true]) {
	let label, clicked, detail, transitionCount = 0, events = 0;
	const classes = new Set();
	const root = { dataset: {}, classList: { add: c => classes.add(c), remove: c => classes.delete(c) }, style: { setProperty() {} } };
	const btn = { setAttribute: (_, value) => label = value, addEventListener: (_, fn) => clicked = fn, getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 40, height: 40 }) };
	const context = vm.createContext({
		document: { documentElement: root, querySelector: () => btn, dispatchEvent: ev => { detail = ev.detail; events++; }, ...(transitions ? { startViewTransition: apply => { transitionCount++; apply(); } } : {}) },
		localStorage: { getItem() { if (blocked) throw Error('Storage blocked'); return 'dark'; }, setItem() { if (blocked) throw Error('Storage blocked'); } },
		matchMedia: query => ({ matches: query.includes('reduced-motion') ? reduced : true }), setTimeout() {}, CustomEvent: class { constructor(_, options) { this.detail = options.detail; } }, innerWidth: 1000, innerHeight: 800,
	});
	vm.runInContext(bootstrap, context);
	vm.runInContext(toggle, context);
	assert.equal(root.dataset.theme, 'dark');
	assert.equal(classes.has('px-wait'), !reduced, 'Reduced motion shows text without entrance hiding.');
	clicked();
	assert.equal(root.dataset.theme, 'light');
	assert.equal(label, 'Switch to dark mode');
	assert.equal(events, 1);
	assert.equal(transitionCount, transitions && !reduced ? 1 : 0);
	assert.equal(detail !== null, transitions && !reduced, 'Canvas wave runs only alongside an enabled view transition.');
	clicked();
	assert.equal(label, 'Switch to light mode');
	assert.equal(events, 2);
}
console.log('Theme and labels stay synchronized with working or blocked storage.');
