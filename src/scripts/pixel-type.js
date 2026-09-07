// Text entrance. Every element marked data-px has its words sampled into cells. One fixed
// canvas lights the cells up in a sweep across the viewport, each cell from light grey
// through graphite to the text color. Then each word crosses over: its cells fade out on
// the canvas while the real text fades in through its color alpha. Nothing is swapped at
// the end, so the last frame of the crossover is the page itself.
//
// Card borders (data-px-border) use a small canvas aligned with the solid outline.

const RAMP = 160; // ms for one cell to go from light grey to ink
const SWEEP = 256; // ms for the sweep to cross the viewport
const JITTER = 72;
const FADE = 200; // ms for a lit word to cross over from cells to glyphs

function wrapWords(el) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const nodes = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		// KaTeX keeps a hidden MathML copy of each formula for screen readers. Its glyphs are
		// never painted, so they get no cells.
		if (n.textContent.trim() && !n.parentElement.closest('svg, canvas, .px-w, .katex-mathml')) nodes.push(n);
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

// Measure all words with ancestor transforms disabled in one synchronous pass. Restore
// transforms before paint, then reuse the matrices instead of relaying out each word.
function viewportMatrices(elements) {
	const transforms = new Map();
	const seen = new Set();
	const tops = new Map(elements.map((el) => [el, el.getBoundingClientRect().top]));
	for (const el of elements) {
		for (let e = el; e && e !== document.documentElement && !seen.has(e); e = e.parentElement) {
			seen.add(e);
			const m = getComputedStyle(e).transform;
			if (m !== 'none') transforms.set(e, { m: new DOMMatrix(m), transform: e.style.transform, transition: e.style.transition });
		}
	}
	try {
		for (const [e] of transforms) {
			e.style.transition = 'none';
			e.style.transform = 'none';
		}
		for (const [e, c] of transforms) {
			const r = e.getBoundingClientRect();
			const [ox, oy] = getComputedStyle(e).transformOrigin.split(' ').map(parseFloat);
			c.about = new DOMMatrix().translate(r.left + ox, r.top + oy).multiply(c.m).translate(-(r.left + ox), -(r.top + oy));
		}
		return new Map(elements.map((el) => {
			let total = new DOMMatrix();
			for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
				const c = transforms.get(e);
				if (c) total = c.about.multiply(total);
			}
			return [el, { rect: el.getBoundingClientRect(), total, top: tops.get(el) }];
		}));
	} finally {
		for (const [e, c] of transforms) e.style.transform = c.transform;
		for (const [e] of transforms) void getComputedStyle(e).transform;
		for (const [e, c] of transforms) e.style.transition = c.transition;
	}
}

// One offscreen sheet serves every word. The words are packed onto it and read back once. A
// readback per word cost more than the whole entrance in WebKit.
const off = document.createElement('canvas');
const offCtx = off.getContext('2d', { willReadFrequently: true });
const SHEET_W = 2048; // CSS px
const SHEET_MAX = 8192; // device px, a safe canvas height everywhere

// Measures one word: its cell size, its box on the sheet, and the placement that maps sheet
// (u, v) to viewport (x, y). Words far below the fold cannot scroll into view before the
// light-up ends. They stay plain text, which keeps the pass short on long articles.
function measure(span, matrices) {
	const { rect, total, top } = matrices.get(span);
	if (top > innerHeight * 2) return null;
	const cs = getComputedStyle(span);
	if (rect.width < 2 || rect.height < 2) return null;
	const size = parseFloat(cs.fontSize);
	const cell = Math.max(3, Math.round(size / 10));
	const vertical = cs.writingMode.startsWith('vertical');
	const w = Math.ceil(vertical ? rect.height : rect.width) + cell * 2;
	const h = Math.ceil(vertical ? rect.width : rect.height) + cell;
	// Sheet (u, v) to untransformed layout. The text starts one cell in along the inline axis,
	// so that axis shifts back by one cell. The cross axis starts at zero. Untransformed
	// vertical-rl text reads top to bottom with glyph tops to the right.
	const layout = !vertical
		? new DOMMatrix([1, 0, 0, 1, rect.left - cell, rect.top])
		: new DOMMatrix([0, 1, -1, 0, rect.right, rect.top - cell]);
	return {
		span, size, cell, w, h,
		cross: vertical ? rect.width : rect.height,
		place: total.multiply(layout),
		color: cs.color,
		font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
		letterSpacing: cs.letterSpacing,
		text: cs.textTransform === 'uppercase' ? span.textContent.toUpperCase() : span.textContent,
	};
}

// Notes use existing SVG paths, sampled on the same sheet as text. Their non-scaling
// strokes are transformed before stroking so the canvas keeps the browser's stroke width.
function measureArrow(svg, matrices) {
	if (svg.closest('.panel-body') && getComputedStyle(svg.closest('.panel-body')).opacity === '0') return null;
	const { rect, total, top } = matrices.get(svg);
	if (top > innerHeight * 2) return null;
	if (!rect.width || !rect.height) return null;
	const cell = 3;
	const paths = [...svg.querySelectorAll('path')].map((el) => {
		const path = new Path2D();
		path.addPath(new Path2D(el.getAttribute('d')), el.getCTM());
		return { path, width: parseFloat(getComputedStyle(el).strokeWidth) };
	});
	return {
		graphic: svg, paths, cell, w: Math.ceil(rect.width) + cell * 2, h: Math.ceil(rect.height) + cell * 2,
		place: total.multiply(new DOMMatrix([1, 0, 0, 1, rect.left - cell, rect.top - cell])),
		color: getComputedStyle(svg).color,
	};
}

// Spread the handoff through the interval and fill glyphs before retiring their cells.
// Both layers start and finish at zero velocity; overlapping ink stays above 85% opacity.
function crossover(progress) {
	const p = Math.max(0, Math.min(1, progress));
	const eased = p * p * (3 - 2 * p);
	return { up: eased * (2 - eased), down: 1 - eased };
}

// Packs the measured words onto the sheet in shelves, draws them, reads the sheet back once,
// and samples each word's cells. A slot starts on a multiple of the word's cell, and each word
// is clipped to its own box, so a word gets the same cells it had on a canvas of its own.
function rasterize(items, dpr) {
	const out = [];
	let batch = [], x = 0, y = 0, shelf = 0, sheetW = 0;
	const flush = () => {
		if (!batch.length) return;
		off.width = sheetW * dpr;
		off.height = (y + shelf) * dpr;
		const o = offCtx;
		o.setTransform(dpr, 0, 0, dpr, 0, 0);
		o.textBaseline = 'alphabetic';
		o.fillStyle = '#000';
		for (const it of batch) {
			if (it.graphic) {
				o.save();
				o.translate(it.x + it.cell, it.y + it.cell);
				o.strokeStyle = '#000';
				o.lineCap = o.lineJoin = 'round';
				for (const { path, width } of it.paths) {
					o.lineWidth = width;
					o.stroke(path);
				}
				o.restore();
				continue;
			}
			o.font = it.font;
			// The context keeps the last word's spacing, and 'normal' is not a canvas value, so it
			// must be written as zero.
			if ('letterSpacing' in o) o.letterSpacing = it.letterSpacing === 'normal' ? '0px' : it.letterSpacing;
			// The font box is centered in the inline box, so the baseline sits at the ascent plus
			// half of any slack. This matches where the browser draws the glyphs.
			const m = o.measureText('Hg');
			const asc = m.fontBoundingBoxAscent || it.size * 0.9;
			const desc = m.fontBoundingBoxDescent || it.size * 0.25;
			o.save();
			o.beginPath();
			o.rect(it.x, it.y, it.w, it.h);
			o.clip();
			o.fillText(it.text, it.x + it.cell, it.y + asc + (it.cross - asc - desc) / 2);
			o.restore();
		}
		const stride = off.width;
		const data = o.getImageData(0, 0, off.width, off.height).data;
		for (const it of batch) {
			const { cell, w, h } = it;
			// A cell is painted when a third of its area is ink.
			const need = cell * cell * dpr * dpr * 255 * 0.34;
			const cells = [];
			let best = 0, bu = 0, bv = 0;
			for (let v = 0; v < h; v += cell) {
				for (let u = 0; u < w; u += cell) {
					let sum = 0;
					for (let dy = 0; dy < cell * dpr; dy++) {
						let i = (((it.y + v) * dpr + dy) * stride + (it.x + u) * dpr) * 4 + 3;
						for (let dx = 0; dx < cell * dpr; dx++, i += 4) sum += data[i] || 0;
					}
					if (sum >= need) cells.push(u, v);
					if (sum > best) (best = sum), (bu = u), (bv = v);
				}
			}
			// A thin glyph such as = or [ may fill no cell to a third. It still gets its darkest
			// cell, so it lights up with its neighbours instead of appearing at once.
			if (!cells.length && best > 0) cells.push(bu, bv);
			out.push({ graphic: it.graphic, span: it.span, place: it.place, cells, cell, color: it.color });
		}
		batch = [];
		x = y = shelf = sheetW = 0;
	};
	for (const it of items) {
		// The slot covers whole cells, so a cell at the edge never reads a neighbour's ink.
		const slotW = Math.ceil(it.w / it.cell) * it.cell, slotH = Math.ceil(it.h / it.cell) * it.cell;
		let ax = Math.ceil(x / it.cell) * it.cell;
		if (ax + slotW > SHEET_W && x > 0) {
			y += shelf;
			shelf = 0;
			x = 0;
			ax = 0;
		}
		let ay = Math.ceil(y / it.cell) * it.cell;
		if ((ay + slotH) * dpr > SHEET_MAX && batch.length) {
			flush();
			ax = ay = 0;
		}
		it.x = ax;
		it.y = ay;
		x = ax + slotW;
		shelf = Math.max(shelf, ay + slotH - y);
		sheetW = Math.max(sheetW, x);
		batch.push(it);
	}
	flush();
	// Sampling is complete; the animation only needs cell coordinates.
	off.width = off.height = 0;
	return out;
}

// Sample cells along the solid outline, matching the pseudo element inset of 2 px.
function sampleBorder(el, dpr, matrices) {
	const { rect, total } = matrices.get(el);
	const cell = 2.5, inset = 2;
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
	canvas.style.cssText = `position:absolute;left:${L + scrollX}px;top:${T + scrollY}px;width:${w}px;height:${h}px;transform-origin:0 0;transform:${local};z-index:60;pointer-events:none`;
	canvas.width = w * dpr;
	canvas.height = h * dpr;
	const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
	el.style.setProperty('--pxb', '0');
	return { el, canvas, ctx: canvas.getContext('2d'), place, cells, cell, color, border: true };
}

function lightUp() {
	const html = document.documentElement;
	// Slow fonts may finish after the fallback has already revealed the page.
	if (!html.classList.contains('px-wait')) return;
	// px-wait stays on through the sampling pass. Layout and canvas drawing do not need the text
	// to be visible, and the marks that fade in at the end must never see a frame without a class.
	// The site runs its motion regardless of the Reduce Motion setting. The owner chose this on
	// 2026-09-05 so every browser shows the same page.
	// A hidden host, such as a deck body at rest on desktop, gets no cells. Its text would
	// otherwise light up over an empty sheet.
	const targets = [...document.querySelectorAll('[data-px]')].filter((t) => getComputedStyle(t).opacity !== '0');
	if (!targets.length) return html.classList.remove('px-wait');
	// Sheet sampling indexes bytes, so its scale must be integral even at browser zoom.
	const dpr = Math.min(2, Math.max(1, Math.ceil(devicePixelRatio || 1)));
	const spans = targets.flatMap(wrapWords);
	const arrows = [...document.querySelectorAll('.note svg')];
	const borderElements = [...document.querySelectorAll('[data-px-border]')];
	const matrices = viewportMatrices([...spans, ...arrows, ...borderElements]);
	const items = spans.map((span) => measure(span, matrices)).filter(Boolean);
	items.push(...arrows.map((svg) => measureArrow(svg, matrices)).filter(Boolean));
	const words = rasterize(items, dpr);
	const borders = borderElements.map((el) => sampleBorder(el, dpr, matrices)).filter(Boolean);
	words.push(...borders);
	if (!words.length) return html.classList.remove('px-wait');
	const root = getComputedStyle(document.documentElement);
	const stages = [root.getPropertyValue('--pencil').trim(), root.getPropertyValue('--graphite').trim()];
	for (const wd of words) {
		wd.delay = new Float32Array(wd.cells.length / 2);
		wd.ready = 0;
		for (let k = 0; k < wd.delay.length; k++) {
			// Treat an outline as one mark, so its far edge does not delay the handoff.
			const pt = wd.place.transformPoint(wd.border ? { x: 0, y: 0 } : { x: wd.cells[2 * k], y: wd.cells[2 * k + 1] });
			// The front runs from the top left corner to the bottom right, so no column lights as one line.
			wd.delay[k] = ((pt.x / innerWidth) * 0.65 + (pt.y / innerHeight) * 0.35) * SWEEP + Math.random() * JITTER;
			wd.ready = Math.max(wd.ready, wd.delay[k] + RAMP);
		}
		if (wd.span) wd.span.style.color = 'transparent';
		if (wd.graphic) wd.graphic.style.opacity = '0';
	}

	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	// The box is sized in px, not percent. A classic scrollbar makes 100% narrower than
	// innerWidth, which would scale the cells off their glyphs.
	canvas.style.cssText = `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;z-index:60;pointer-events:none`;
	canvas.width = innerWidth * dpr;
	canvas.height = innerHeight * dpr;
	document.body.appendChild(canvas);
	for (const b of borders) document.body.appendChild(b.canvas);
	const ctxText = canvas.getContext('2d');
	// Both pointer and keyboard interaction wait for solid text. Include hidden deck bodies
	// so focus cannot expand a panel during the entrance; preserve existing inert states.
	const locked = [...document.querySelectorAll('[data-px], .deck, .theme-toggle')].filter((el) => !el.inert);
	for (const el of locked) el.inert = true;
	html.classList.add('px-live');
	html.classList.remove('px-wait');

	// Words were measured in viewport coordinates at this scroll offset. A scroll during the
	// light-up shifts the text canvas by the difference so the cells stay on their words.
	const sx0 = scrollX, sy0 = scrollY;
	// A resize moves every word, but the cells were sampled once. The entrance ends at the
	// next frame and the text shows in place.
	const w0 = innerWidth, h0 = innerHeight;
	let resized = false;
	const onResize = () => { if (innerWidth !== w0 || innerHeight !== h0) resized = true; };
	addEventListener('resize', onResize);
	const t0 = performance.now();
	function frame(now) {
		const t = now - t0;
		ctxText.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctxText.clearRect(0, 0, innerWidth, innerHeight);
		// Read layout before writing word colors, avoiding a style flush for every word.
		const dx = (sx0 - scrollX) * dpr, dy = (sy0 - scrollY) * dpr;
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
				ctx.setTransform(dpr, 0, 0, dpr, dx, dy);
				ctx.transform(a, b, c, d, e, f);
			}
			// Ease both layers through the handoff without an abrupt first glyph or last pixel.
			const { up, down } = crossover(fade);
			if (fade > 0) {
				if (wd.span) wd.span.style.color = `color-mix(in srgb, ${wd.color} ${up * 100}%, transparent)`;
				else if (wd.graphic) wd.graphic.style.opacity = String(up);
				else wd.el.style.setProperty('--pxb', String(up));
			}
			if (fade >= 1) {
				if (wd.span) wd.span.style.color = '';
				else if (wd.graphic) wd.graphic.style.opacity = '';
				else wd.el.style.removeProperty('--pxb');
				wd.finished = true;
				continue;
			}
			done = false;
			ctx.globalAlpha = down;
			const c = wd.cell;
			for (let k = 0; k < wd.delay.length; k++) {
				const p = (t - wd.delay[k]) / RAMP;
				if (p <= 0) continue;
				ctx.fillStyle = p < 1 / 3 ? stages[0] : p < 2 / 3 ? stages[1] : wd.color;
				ctx.fillRect(wd.cells[2 * k], wd.cells[2 * k + 1], c - 1, c - 1);
			}
			ctx.globalAlpha = 1;
		}
		if (!done && t < 6000 && !resized) {
			requestAnimationFrame(frame);
			return;
		}
		removeEventListener('resize', onResize);
		canvas.remove();
		for (const wd of words) {
			if (wd.span) wd.span.style.color = '';
			if (wd.graphic) wd.graphic.style.opacity = '';
			if (wd.el) {
				wd.el.style.removeProperty('--pxb');
				wd.canvas.remove();
			}
		}
		document.documentElement.classList.remove('px-live');
		for (const el of locked) el.inert = false;
	}
	requestAnimationFrame(frame);
}

// Text waits under px-wait until the entrance starts, so no plain text flashes first. The
// timeout is a safety net: if the entrance never runs, the text shows anyway.
const html = document.documentElement;

// A back or forward navigation restores a page the reader has already seen. It comes back
// as it was, with no entrance. Otherwise the entrance waits for the load event, so every
// stylesheet has applied and every font has at least started to load, and then for the
// fonts. fonts.ready alone can resolve before the font stylesheet has arrived, and the page
// then reflows after the cells were sampled.
const nav = performance.getEntriesByType('navigation')[0];
const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
if (nav?.type === 'back_forward') html.classList.remove('px-wait');
else loaded.then(() => document.fonts.ready).then(lightUp);
