import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual bootstrap and toggle when browser storage is unavailable.
const bootstrap = readFileSync(new URL('../src/scripts/theme-init.js', import.meta.url), 'utf8');
const toggle = readFileSync(new URL('../src/components/ThemeToggle.astro', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
	.replace('querySelector<HTMLButtonElement>', 'querySelector').replace("('.theme-toggle')!", "('.theme-toggle')").replace('(document as any)', 'document');
for (const blocked of [false, true]) {
	let label, clicked, events = 0;
	const root = { dataset: {}, classList: { add() {}, remove() {} }, style: { setProperty() {} } };
	const btn = { setAttribute: (_, value) => label = value, addEventListener: (_, fn) => clicked = fn, getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 40, height: 40 }) };
	const context = vm.createContext({
		document: { documentElement: root, querySelector: () => btn, dispatchEvent: () => events++ },
		localStorage: { getItem() { if (blocked) throw Error('Storage blocked'); return 'dark'; }, setItem() { if (blocked) throw Error('Storage blocked'); } },
		matchMedia: () => ({ matches: true }), setTimeout() {}, CustomEvent: class {}, innerWidth: 1000, innerHeight: 800,
	});
	vm.runInContext(bootstrap, context);
	vm.runInContext(toggle, context);
	assert.equal(root.dataset.theme, 'dark');
	clicked();
	assert.equal(root.dataset.theme, 'light');
	assert.equal(label, 'Switch to dark mode');
	assert.equal(events, 1);
	clicked();
	assert.equal(label, 'Switch to light mode');
	assert.equal(events, 2);
}
console.log('Theme and labels stay synchronized with working or blocked storage.');
