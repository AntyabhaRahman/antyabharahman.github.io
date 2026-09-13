// Match anchor clearance to the header after font loading, reflow, and text resizing.
const header = document.querySelector('.site-header');
const updateHeaderHeight = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
updateHeaderHeight();
new ResizeObserver(updateHeaderHeight).observe(header);

// Preserve native table semantics while containing wide article content.
for (const table of document.querySelectorAll('.prose table')) {
	const region = document.createElement('div');
	region.className = 'table-scroll';
	table.before(region);
	region.append(table);
}
for (const region of document.querySelectorAll('.table-scroll, .prose pre, .katex-display > .katex')) {
	const updateOverflow = () => {
		const scrollable = region.scrollWidth > region.clientWidth;
		if (scrollable) {
			region.tabIndex = 0;
			region.setAttribute('role', 'region');
			region.setAttribute('aria-label', region.matches('.table-scroll') ? 'Scrollable table' : region.matches('pre') ? 'Scrollable code' : 'Scrollable equation');
		} else {
			region.removeAttribute('tabindex');
			region.removeAttribute('role');
			region.removeAttribute('aria-label');
		}
	};
	updateOverflow();
	new ResizeObserver(updateOverflow).observe(region);
	document.fonts.ready.then(updateOverflow);
}

// Settle untouched deep links; any scrolling keeps the browser's current position.
if (location.hash && performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
	const hash = location.hash;
	const interaction = new AbortController();
	let interrupted = false;
	for (const event of ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown']) {
		addEventListener(event, () => { interrupted = true; }, { passive: true, signal: interaction.signal });
	}
	const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => addEventListener('load', resolve, { once: true }));
	loaded.then(() => document.fonts.ready).then(() => {
		interaction.abort();
		if (interrupted || location.hash !== hash) return;
		updateHeaderHeight();
		try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }); }
		catch { /* An invalid encoded fragment has no target. */ }
	});
}
