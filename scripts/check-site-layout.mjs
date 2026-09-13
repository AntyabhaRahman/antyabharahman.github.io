import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const observers = new Map(), properties = new Map();
let height = 72, wrapped;
const header = { getBoundingClientRect: () => ({ height }) };
const region = {
	scrollWidth: 900, clientWidth: 300, attributes: new Map(),
	append(table) { this.table = table; },
	matches: selector => selector === '.table-scroll',
	setAttribute(name, value) { this.attributes.set(name, value); },
	removeAttribute(name) { this.attributes.delete(name); if (name === 'tabindex') delete this.tabIndex; },
};
const table = { before(element) { wrapped = element; } };
vm.runInNewContext(readFileSync(new URL('../src/scripts/site-layout.js', import.meta.url), 'utf8'), {
	location: { hash: '' },
	document: {
		querySelector: () => header,
		querySelectorAll: selector => selector === '.prose table' ? [table] : [region],
		createElement: () => region,
		documentElement: { style: { setProperty: (name, value) => properties.set(name, value) } },
		fonts: { ready: Promise.resolve() },
	},
	ResizeObserver: class { constructor(fn) { this.fn = fn; } observe(element) { observers.set(element, this.fn); } },
});
assert.equal(properties.get('--header-height'), '72px');
height = 108; observers.get(header)();
assert.equal(properties.get('--header-height'), '108px', 'Anchor clearance follows a wrapped header.');
assert.equal(wrapped.table, table, 'Wrap the original table without changing native semantics.');
assert.equal(region.tabIndex, 0);
assert.equal(region.attributes.get('aria-label'), 'Scrollable table');
region.clientWidth = 1000; observers.get(region)();
assert.equal(region.tabIndex, undefined, 'A region that no longer overflows leaves the tab order.');
assert.equal(region.attributes.has('role'), false);
console.log('Header clearance and keyboard overflow regions follow layout changes.');

for (const [navigationType, interruption] of [['navigate', null], ['navigate', 'wheel'], ['navigate', 'scroll'], ['back_forward', null], ['reload', null]]) {
	let aligned = 0, signal;
	const listeners = new Map();
	vm.runInNewContext(readFileSync(new URL('../src/scripts/site-layout.js', import.meta.url), 'utf8'), {
		location: { hash: '#section' }, AbortController,
		performance: { getEntriesByType: () => [{ type: navigationType }] },
		addEventListener: (event, fn, options) => { listeners.set(event, fn); signal = options.signal; },
		document: {
			readyState: 'complete', fonts: { ready: Promise.resolve() },
			querySelector: () => header, querySelectorAll: () => [],
			documentElement: { style: { setProperty() {} } },
			getElementById: id => { assert.equal(id, 'section'); return { scrollIntoView() { aligned++; } }; },
		},
		ResizeObserver: class { observe() {} },
	});
	if (interruption) listeners.get(interruption)?.();
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(aligned, !interruption && navigationType === 'navigate' ? 1 : 0, 'Initial anchors settle without interrupting the reader.');
	assert.equal(signal?.aborted ?? navigationType !== 'navigate', true, 'Temporary interaction listeners are cleaned up.');
}
