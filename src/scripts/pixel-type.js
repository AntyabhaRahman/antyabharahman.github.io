// Text entrance. Every element marked data-px has its words sampled into cells. One fixed
// canvas lights the cells up in a sweep across the viewport, each cell from light grey
// through graphite to the text color. Then each word crosses over: its cells fade out on
// the canvas while the real text fades in through its color alpha. Nothing is swapped at
// the end, so the last frame of the crossover is the page itself.
//
// Rough borders (data-px-border) get one small canvas each, placed exactly over the border
// pseudo element and given the same transform and sketch filter. The displacement noise is
// anchored at the filtered box's origin, so the cells wobble like the border they become.

const RAMP = 200; // ms for one cell to go from light grey to ink
const SWEEP = 320; // ms for the sweep to cross the viewport
const JITTER = 90;
const FADE = 260; // ms for a lit word to cross over from cells to glyphs

function wrapWords(el) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const nodes = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		if (n.textContent.trim() && !n.parentElement.closest('svg, canvas, .px-w')) nodes.push(n);
	}
	const words = [];
	for (const n of nodes) {
		const frag = document.createDocumentFragment();
		for (const part of n.textContent.split(/(\s+)/)) {
			if (!part) continue;
			if (/^\s+$/.test(part)) {
				frag.appendChild(document.createTextNode(part));
			} else {
				const span = document.createElement('span');
				span.className = 'px-w';
				span.textContent = part;
				frag.appendChild(span);
				words.push(span);
			}
		}
		n.parentNode.replaceChild(frag, n);
	}
	return words;
}

// The matrix that carries a point from the element's untransformed layout position to the
// viewport. Ancestor transforms are switched off for one synchronous measurement, so the
// page never paints without them.
function viewportMatrix(el) {
	const chain = [];
	for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
		const m = getComputedStyle(e).transform;
		if (m !== 'none') chain.push({ e, m: new DOMMatrix(m), transform: e.style.transform, transition: e.style.transition });
	}
	for (const c of chain) {
		c.e.style.transition = 'none';
		c.e.style.transform = 'none';
	}
	const rect = el.getBoundingClientRect();
	let total = new DOMMatrix();
	for (const c of chain) {
		const r = c.e.getBoundingClientRect();
		const [ox, oy] = getComputedStyle(c.e).transformOrigin.split(' ').map(parseFloat);
		const about = new DOMMatrix().translate(r.left + ox, r.top + oy).multiply(c.m).translate(-(r.left + ox), -(r.top + oy));
		total = about.multiply(total);
	}
	for (const c of chain) c.e.style.transform = c.transform;
	for (const c of chain) void getComputedStyle(c.e).transform; // flush before transitions return
	for (const c of chain) c.e.style.transition = c.transition;
	return { rect, total };
}

// Draws one word offscreen and returns its cells plus the placement that maps offscreen
// (u, v) to viewport (x, y).
function sample(span, dpr) {
	const cs = getComputedStyle(span);
	const { rect, total } = viewportMatrix(span);
	if (rect.width < 2 || rect.height < 2) return null;
	const size = parseFloat(cs.fontSize);
	const cell = Math.max(3, Math.round(size / 10));
	const vertical = cs.writingMode.startsWith('vertical');
	const w = Math.ceil(vertical ? rect.height : rect.width) + cell * 2;
	const h = Math.ceil(vertical ? rect.width : rect.height) + cell;
	const off = document.createElement('canvas');
	off.width = w * dpr;
	off.height = h * dpr;
	const o = off.getContext('2d');
	o.scale(dpr, dpr);
	o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	if ('letterSpacing' in o) o.letterSpacing = cs.letterSpacing;
	o.textBaseline = 'alphabetic';
	o.fillStyle = '#000';
	const text = cs.textTransform === 'uppercase' ? span.textContent.toUpperCase() : span.textContent;
	// The font box is centered in the inline box, so the baseline sits at the ascent plus half
	// of any slack. This matches where the browser draws the glyphs.
	const m = o.measureText('Hg');
	const asc = m.fontBoundingBoxAscent || size * 0.9;
	const desc = m.fontBoundingBoxDescent || size * 0.25;
	const cross = vertical ? rect.width : rect.height;
	o.fillText(text, cell, asc + (cross - asc - desc) / 2);

	// Offscreen (u, v) to untransformed layout. The text starts one cell in along the inline
	// axis, so that axis shifts back by one cell. The cross axis starts at zero. Untransformed
	// vertical-rl text reads top to bottom with glyph tops to the right.
	const layout = !vertical
		? new DOMMatrix([1, 0, 0, 1, rect.left - cell, rect.top])
		: new DOMMatrix([0, 1, -1, 0, rect.right, rect.top - cell]);
	const place = total.multiply(layout);

	// Sample in offscreen space. A cell is painted when a third of its area is ink.
	const data = o.getImageData(0, 0, w * dpr, h * dpr).data;
	const stride = w * dpr;
	const need = cell * cell * dpr * dpr * 255 * 0.34;
	const cells = [];
	for (let v = 0; v < h; v += cell) {
		for (let u = 0; u < w; u += cell) {
			let sum = 0;
			for (let dy = 0; dy < cell * dpr; dy++) {
				let i = ((v * dpr + dy) * stride + u * dpr) * 4 + 3;
				for (let dx = 0; dx < cell * dpr; dx++, i += 4) sum += data[i] || 0;
			}
			if (sum >= need) cells.push(u, v);
		}
	}
	return { span, place, cells, cell, color: cs.color };
}

// Cells along the rough outline of a box. The outline is a pseudo element inset 2 px. Its
// own canvas sits on that exact box so the sketch filter displaces both the same way.
function sampleBorder(el, dpr) {
	const { rect, total } = viewportMatrix(el);
	const cell = 4, inset = 2;
	const w = Math.round(rect.width) - 2 * inset, h = Math.round(rect.height) - 2 * inset;
	if (w < cell * 2 || h < cell * 2) return null;
	const cells = [];
	for (let u = 0; u < w; u += cell) cells.push(u, 0, u, h - cell);
	for (let v = cell; v < h - cell; v += cell) cells.push(0, v, w - cell, v);
	const L = rect.left + inset, T = rect.top + inset;
	const place = total.multiply(new DOMMatrix([1, 0, 0, 1, L, T]));
	// The canvas is positioned at (L, T), so the page transform is re-expressed about its own
	// top left corner.
	const local = new DOMMatrix().translate(-L, -T).multiply(total).translate(L, T);
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.cssText = `position:absolute;left:${L + scrollX}px;top:${T + scrollY}px;width:${w}px;height:${h}px;transform-origin:0 0;transform:${local};z-index:60;pointer-events:none;filter:url(#sketch)`;
	canvas.width = w * dpr;
	canvas.height = h * dpr;
	const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
	el.style.setProperty('--pxb', '0');
	return { el, canvas, ctx: canvas.getContext('2d'), place, cells, cell, color, border: true };
}

export function lightUp() {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const targets = [...document.querySelectorAll('[data-px]')];
	if (!targets.length) return;
	const dpr = Math.min(2, devicePixelRatio || 1);
	const words = targets.flatMap(wrapWords).map((s) => sample(s, dpr)).filter(Boolean);
	const borders = [...document.querySelectorAll('[data-px-border]')].map((el) => sampleBorder(el, dpr)).filter(Boolean);
	words.push(...borders);
	if (!words.length) return;
	const root = getComputedStyle(document.documentElement);
	const stages = [root.getPropertyValue('--pencil').trim(), root.getPropertyValue('--graphite').trim()];
	for (const wd of words) {
		wd.delay = new Float32Array(wd.cells.length / 2);
		wd.ready = 0;
		for (let k = 0; k < wd.delay.length; k++) {
			const pt = wd.place.transformPoint({ x: wd.cells[2 * k], y: wd.cells[2 * k + 1] });
			// The front runs from the top left corner to the bottom right, so no column lights as one line.
			wd.delay[k] = ((pt.x / innerWidth) * 0.65 + (pt.y / innerHeight) * 0.35) * SWEEP + Math.random() * JITTER;
			wd.ready = Math.max(wd.ready, wd.delay[k] + RAMP);
		}
		if (wd.span) wd.span.style.color = 'transparent';
	}

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none';
	canvas.width = innerWidth * dpr;
	canvas.height = innerHeight * dpr;
	document.body.appendChild(canvas);
	for (const b of borders) document.body.appendChild(b.canvas);
	const ctxText = canvas.getContext('2d');
	// Pointer interaction waits until every word and border is solid.
	document.documentElement.classList.add('px-live');

	// Words were measured in viewport coordinates at this scroll offset. A scroll during the
	// light-up shifts the text canvas by the difference so the cells stay on their words.
	const sx0 = scrollX, sy0 = scrollY;
	const t0 = performance.now();
	function frame(now) {
		const t = now - t0;
		ctxText.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctxText.clearRect(0, 0, innerWidth, innerHeight);
		let done = true;
		for (const wd of words) {
			if (wd.finished) continue;
			const fade = Math.min(1, (t - wd.ready) / FADE);
			const ctx = wd.border ? wd.ctx : ctxText;
			if (wd.border) {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, wd.canvas.width, wd.canvas.height);
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			} else {
				const { a, b, c, d, e, f } = wd.place;
				ctx.setTransform(dpr, 0, 0, dpr, (sx0 - scrollX) * dpr, (sy0 - scrollY) * dpr);
				ctx.transform(a, b, c, d, e, f);
			}
			if (fade > 0) {
				// The real thing fades in by the same fraction the cells fade out.
				if (wd.span) wd.span.style.color = `color-mix(in srgb, ${wd.color} ${fade * 100}%, transparent)`;
				else wd.el.style.setProperty('--pxb', String(fade));
			}
			if (fade >= 1) {
				if (wd.span) wd.span.style.color = '';
				else wd.el.style.removeProperty('--pxb');
				wd.finished = true;
				continue;
			}
			done = false;
			ctx.globalAlpha = fade > 0 ? 1 - fade : 1;
			const c = wd.cell;
			for (let k = 0; k < wd.delay.length; k++) {
				const p = (t - wd.delay[k]) / RAMP;
				if (p <= 0) continue;
				ctx.fillStyle = p < 1 / 3 ? stages[0] : p < 2 / 3 ? stages[1] : wd.color;
				ctx.fillRect(wd.cells[2 * k], wd.cells[2 * k + 1], c - 1, c - 1);
			}
			ctx.globalAlpha = 1;
		}
		if (!done && t < 6000) {
			requestAnimationFrame(frame);
			return;
		}
		canvas.remove();
		for (const wd of words) {
			if (wd.span) wd.span.style.color = '';
			if (wd.el) {
				wd.el.style.removeProperty('--pxb');
				wd.canvas.remove();
			}
		}
		document.documentElement.classList.remove('px-live');
	}
	requestAnimationFrame(frame);
}

// A back or forward navigation restores a page the reader has already seen. It comes back
// as it was, with no entrance.
const nav = performance.getEntriesByType('navigation')[0];
if (nav?.type !== 'back_forward') document.fonts.ready.then(lightUp);
