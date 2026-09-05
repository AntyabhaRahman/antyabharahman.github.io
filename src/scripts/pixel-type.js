// Text entrance. Every element marked data-px has its words sampled into cells. One fixed
// canvas lights the cells up in a sweep across the viewport, each cell from light grey
// through graphite to the text color. Then each word crosses over: its cells fade out while
// the exact glyph raster fades in on the same canvas. The real text is switched on only when
// the raster is fully opaque, so the swap has nothing left to show.

const RAMP = 200; // ms for one cell to go from light grey to ink
const SWEEP = 460; // ms for the sweep to cross the viewport
const JITTER = 130;
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

// Draws one word on its own offscreen canvas and returns the cells plus the placement that
// maps offscreen (u, v) to viewport (x, y). The raster is reused for the crossover.
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
	o.fillStyle = cs.color;
	const text = cs.textTransform === 'uppercase' ? span.textContent.toUpperCase() : span.textContent;
	// The font box is centered in the inline box, so the baseline sits at the ascent plus half
	// of any slack. This matches where the browser draws the glyphs.
	const m = o.measureText('Hg');
	const asc = m.fontBoundingBoxAscent || size * 0.9;
	const desc = m.fontBoundingBoxDescent || size * 0.25;
	const cross = vertical ? rect.width : rect.height;
	o.fillText(text, cell, asc + (cross - asc - desc) / 2);

	// Offscreen (u, v) to untransformed layout. Horizontal words shift left by one cell.
	// Untransformed vertical-rl text reads top to bottom with glyph tops to the right.
	const layout = !vertical
		? new DOMMatrix([1, 0, 0, 1, rect.left - cell, rect.top])
		: new DOMMatrix([0, 1, -1, 0, rect.right - cell, rect.top - cell]);
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
	return { span, off, place, cells, cell, color: cs.color, w, h };
}

// Cells along the rough outline of a box. The outline is a pseudo element inset 2 px.
function sampleBorder(el) {
	const { rect, total } = viewportMatrix(el);
	const cell = 4, inset = 2;
	const w = Math.round(rect.width) - 2 * inset, h = Math.round(rect.height) - 2 * inset;
	if (w < cell * 2 || h < cell * 2) return null;
	const cells = [];
	for (let u = 0; u < w; u += cell) cells.push(u, 0, u, h - cell);
	for (let v = cell; v < h - cell; v += cell) cells.push(0, v, w - cell, v);
	const place = total.multiply(new DOMMatrix([1, 0, 0, 1, rect.left + inset, rect.top + inset]));
	const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
	el.classList.add('px-nb');
	return { el, place, cells, cell, color, w: 0, h: 0, border: true };
}

export function lightUp() {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const targets = [...document.querySelectorAll('[data-px]')];
	if (!targets.length) return;
	const dpr = Math.min(2, devicePixelRatio || 1);
	const words = targets.flatMap(wrapWords).map((s) => sample(s, dpr)).filter(Boolean);
	const borders = [...document.querySelectorAll('[data-px-border]')].map(sampleBorder).filter(Boolean);
	words.push(...borders);
	if (!words.length) return;
	const root = getComputedStyle(document.documentElement);
	const stages = [root.getPropertyValue('--pencil').trim(), root.getPropertyValue('--graphite').trim()];
	for (const wd of words) {
		wd.delay = new Float32Array(wd.cells.length / 2);
		wd.ready = 0;
		for (let k = 0; k < wd.delay.length; k++) {
			const pt = wd.place.transformPoint({ x: wd.cells[2 * k], y: wd.cells[2 * k + 1] });
			wd.delay[k] = (pt.x / innerWidth) * SWEEP + Math.random() * JITTER;
			wd.ready = Math.max(wd.ready, wd.delay[k] + RAMP);
		}
		if (wd.span) wd.span.style.color = 'transparent';
	}

	const make = (filter) => {
		const c = document.createElement('canvas');
		c.setAttribute('aria-hidden', 'true');
		c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none;filter:${filter}`;
		c.width = innerWidth * dpr;
		c.height = innerHeight * dpr;
		document.body.appendChild(c);
		return c;
	};
	const canvas = make('none');
	const borderCanvas = make('url(#sketch)');
	// Pointer interaction waits until every word and border is solid.
	document.documentElement.classList.add('px-live');
	const ctxText = canvas.getContext('2d');
	const ctxBorder = borderCanvas.getContext('2d');
	let ctx = ctxText;

	const t0 = performance.now();
	function frame(now) {
		const t = now - t0;
		for (const c of [ctxText, ctxBorder]) {
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			c.clearRect(0, 0, innerWidth, innerHeight);
		}
		let done = true;
		for (const wd of words) {
			if (wd.finished) continue;
			ctx = wd.border ? ctxBorder : ctxText;
			const fade = (t - wd.ready) / FADE;
			if (wd.border && fade > 0 && !wd.shown) {
				// The real border fades in through CSS while the cells fade out here.
				wd.shown = true;
				wd.el.classList.remove('px-nb');
			}
			if (fade >= 1) {
				// The raster is fully opaque, so switching the real text on shows no change.
				if (wd.span) wd.span.style.color = '';
				wd.finished = true;
				continue;
			}
			done = false;
			// Cells and raster share one transform, so both carry the sheet's tilt.
			const { a, b, c: pc, d, e, f } = wd.place;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.transform(a, b, pc, d, e, f);
			ctx.globalAlpha = fade > 0 ? 1 - fade : 1;
			const c = wd.cell;
			for (let k = 0; k < wd.delay.length; k++) {
				const p = (t - wd.delay[k]) / RAMP;
				if (p <= 0) continue;
				ctx.fillStyle = p < 1 / 3 ? stages[0] : p < 2 / 3 ? stages[1] : wd.color;
				ctx.fillRect(wd.cells[2 * k], wd.cells[2 * k + 1], c - 1, c - 1);
			}
			if (fade > 0 && wd.off) {
				ctx.globalAlpha = fade;
				ctx.drawImage(wd.off, 0, 0, wd.w, wd.h);
			}
		}
		ctxText.globalAlpha = 1;
		ctxBorder.globalAlpha = 1;
		if (!done && t < 6000) {
			requestAnimationFrame(frame);
			return;
		}
		canvas.remove();
		borderCanvas.remove();
		document.documentElement.classList.remove('px-live');
		for (const wd of words) {
			if (wd.span) wd.span.style.color = '';
			if (wd.el) wd.el.classList.remove('px-nb');
		}
	}
	requestAnimationFrame(frame);
}

document.fonts.ready.then(lightUp);
