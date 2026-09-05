// Reactive pixel field on a 2D canvas.
// One grid, two modes. 'ambient' draws a terrain as height bands with an optimizer that
// descends it. 'trail' draws only the pointer trail.

const PITCH = 9; // cell pitch in CSS px: an 8 px square plus a 1 px gap
const SQUARE = 8;
const BRUSH = 7; // brush radius in cells
const DECAY = 9.2; // energy falls to one percent in half a second
const MAX_STEPS = 64; // stamps per pointer segment

// Terrain and optimizer constants. The terrain is layered sine waves with coordinate
// warping. Height runs 0 to 1. Low is dark, so the ball sinks into ink pools.
const CUTS = [0.2, 0.32, 0.44, 0.56]; // height cuts, low to high; above the last cut is bare paper
const HILL = 0.6; // how much pointer heat raises the terrain
const STEP = 0.08; // seconds per optimizer step
const LR = 42; // in cells per unit slope
const MOMENTUM = 0.86;
const MAX_SPEED = 1.4; // cells per step
const TRAIL_LIFE = 10; // seconds a trail cell can survive
const HOLD = 3.5; // seconds to rest in a basin before a restart
const LOOP = 60; // seconds for one full cycle of the terrain

export function spawnPoint(cols, rows, side) {
	return [cols * (side > 0 ? 0.88 : 0.12), rows * (side > 0 ? 0.12 : 0.88)];
}

export function isContourDot(bands, cols, i, hash) {
	return hash[i] <= 0.38 && (bands[i] !== bands[i + 1] || bands[i] !== bands[i + cols]);
}

export function mountPixelField(canvas, options) {
	const trail = options?.mode === 'trail';
	const ctx = canvas.getContext('2d');
	if (!ctx) return { destroy() {} };
	const parent = canvas.parentElement || canvas;
	const ink = ['', '', '', '', '', ''];
	let paper = '#ffffff';

	let cols = 0, rows = 0, cssW = 0, cssH = 0;
	let energy = new Float32Array(0);
	let band = new Uint8Array(0);
	let visit = new Float32Array(0); // last time the optimizer crossed a cell
	let order = new Int32Array(0); // cell indices grouped by shade, rebuilt on a full paint
	const counts = new Int32Array(6), starts = new Int32Array(6);
	let shown = new Uint8Array(0); // the band each cell was last painted with
	let dirty = new Uint8Array(0), dirtyList = new Int32Array(0); // cells to repaint this frame
	let full = true; // the next paint clears and redraws everything
	let headBox = [0, 0, 0, 0]; // cell range under the last painted head: x0, y0, x1, y1
	let hash = new Float32Array(0); // fixed per-cell value in [0, 1) that picks the contour dots
	let time = 0, last = 0, frameId = 0;
	let live = false; // true while some pointer energy is still worth drawing
	let onScreen = true;
	let prevX = 0, prevY = 0, hasPrev = false;

	// Optimizer state, in cell coordinates.
	let side = 1; // 1 starts the ball in the right margin, -1 in the left
	let q = [0, 0], v = [0, 0];
	let stepClock = 0, calm = 0, rest = 0, spawn = 0;

	function readColors() {
		const style = getComputedStyle(canvas);
		const bands = style.getPropertyValue('--pf-bands').split(',').map((c) => c.trim());
		for (let i = 0; i < 4; i++) ink[i + 1] = bands[i];
		ink[5] = style.getPropertyValue('--pf-accent').trim();
		paper = style.getPropertyValue('--paper').trim();
	}

	// Alternate between opposite corners so the descent can cross the whole field.
	function startBall() {
		q = spawnPoint(cols, rows, side);
		v = [0, 0];
		calm = 0;
		rest = 0;
		spawn = time;
	}

	function resize() {
		const box = parent.getBoundingClientRect();
		const w = Math.max(1, Math.round(box.width));
		const h = Math.max(1, Math.round(box.height));
		if (w === cssW && h === cssH) return;
		cssW = w;
		cssH = h;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		// One canvas pixel per CSS pixel, on every display. The squares sit on an integer pitch,
		// so they stay crisp; the backing store is a quarter of the size on a 2x display.
		canvas.width = w;
		canvas.height = h;
		cols = Math.ceil(w / PITCH);
		rows = Math.ceil(h / PITCH);
		const n = cols * rows;
		if (energy.length !== n) {
			energy = new Float32Array(n);
			band = new Uint8Array(n);
			visit = new Float32Array(n).fill(-1e9);
			hash = new Float32Array(n);
			order = new Int32Array(n);
			shown = new Uint8Array(n);
			dirty = new Uint8Array(n);
			dirtyList = new Int32Array(n);
			let seed = 1234567;
			for (let i = 0; i < n; i++) {
				seed = (seed * 1103515245 + 12345) & 0x7fffffff;
				hash[i] = seed / 0x7fffffff;
			}
			live = false;
		}
		hasPrev = false;
		full = true;
		if (!trail) startBall();
		redraw();
	}

	function stamp(cx, cy) {
		const y0 = Math.max(0, Math.floor(cy - BRUSH)), y1 = Math.min(rows - 1, Math.ceil(cy + BRUSH));
		const x0 = Math.max(0, Math.floor(cx - BRUSH)), x1 = Math.min(cols - 1, Math.ceil(cx + BRUSH));
		for (let y = y0; y <= y1; y++) {
			const dy = y - cy;
			const row = y * cols;
			for (let x = x0; x <= x1; x++) {
				const dx = x - cx;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d > BRUSH) continue;
				const k = 1 - d / BRUSH;
				const f = 0.9 * k * k * (3 - 2 * k);
				if (f > energy[row + x]) energy[row + x] = f;
			}
		}
		live = true;
	}

	function onPointerMove(ev) {
		if (ev.pointerType === 'touch' || cols === 0) return;
		const box = canvas.getBoundingClientRect();
		const cx = (ev.clientX - box.left) / PITCH;
		const cy = (ev.clientY - box.top) / PITCH;
		if (cx < -BRUSH || cy < -BRUSH || cx > cols + BRUSH || cy > rows + BRUSH) {
			hasPrev = false;
			return;
		}
		if (hasPrev) {
			const dist = Math.hypot(cx - prevX, cy - prevY);
			const steps = Math.min(MAX_STEPS, Math.ceil(dist));
			for (let s = 1; s < steps; s++) {
				const u = s / steps;
				stamp(prevX + (cx - prevX) * u, prevY + (cy - prevY) * u);
			}
		}
		stamp(cx, cy);
		prevX = cx;
		prevY = cy;
		hasPrev = true;
		start();
	}

	function heat(x, y) {
		const xi = Math.min(cols - 1, Math.max(0, Math.round(x)));
		const yi = Math.min(rows - 1, Math.max(0, Math.round(y)));
		return energy[yi * cols + xi];
	}
	// Terrain height in [0, 1] at a cell position, plus the pointer hill.
	function height(x, y) {
		// Every wave completes a whole number of cycles per LOOP, so the field repeats with no seam.
		const ph = ((time % LOOP) / LOOP) * Math.PI * 2;
		const wx = x + 2.6 * Math.sin(y * 0.105 + ph + 0.7);
		const wy = y + 2.6 * Math.cos(x * 0.088 - ph + 2.1);
		const s3 = Math.sin(wx * 0.074 + ph) + Math.sin(wy * 0.059 - ph + 1.3) + Math.sin((wx + wy) * 0.041 + 2 * ph + 0.4);
		// A steep rim at the canvas edges keeps the ball inside. The interior stays flat.
		const bx = (x - cols / 2) / (cols / 2), by = (y - rows / 2) / (rows / 2);
		const rim = 0.08 * (bx ** 6 + by ** 6);
		return 0.5 + s3 / 6 + rim + HILL * heat(x, y);
	}

	function markPath(x0, y0, x1, y1) {
		const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
		for (let i = 0; i <= n; i++) {
			const x = Math.round(x0 + (x1 - x0) * (i / n));
			const y = Math.round(y0 + (y1 - y0) * (i / n));
			if (x >= 0 && y >= 0 && x < cols && y < rows) visit[y * cols + x] = time;
		}
	}

	// One heavy-ball step down the numeric gradient of the terrain.
	function optimizerStep() {
		const [x, y] = q;
		const e = 0.5;
		const gx = (height(x + e, y) - height(x - e, y)) / (2 * e);
		const gy = (height(x, y + e) - height(x, y - e)) / (2 * e);
		v[0] = MOMENTUM * v[0] - LR * gx;
		v[1] = MOMENTUM * v[1] - LR * gy;
		const speed = Math.hypot(v[0], v[1]);
		if (speed > MAX_SPEED) {
			v[0] *= MAX_SPEED / speed;
			v[1] *= MAX_SPEED / speed;
		}
		q[0] = Math.min(cols - 1, Math.max(0, q[0] + v[0]));
		q[1] = Math.min(rows - 1, Math.max(0, q[1] + v[1]));
		markPath(x, y, q[0], q[1]);
		// The head is a 2 by 2 block so it reads at a glance.
		markPath(q[0] + 1, q[1], q[0] + 1, q[1] + 1);
		markPath(q[0], q[1] + 1, q[0], q[1] + 1);
		calm = Math.hypot(gx, gy) < 0.004 && speed < 0.08 ? calm + 1 : 0;
	}

	function restart() {
		side = -side;
		startBall();
	}

	function advance(dt) {
		if (rest > 0) {
			rest -= dt;
			if (rest <= 0) restart();
			return;
		}
		stepClock += dt;
		while (stepClock >= STEP) {
			stepClock -= STEP;
			optimizerStep();
			if (calm >= 20) {
				rest = HOLD;
				break;
			}
		}
	}

	function compose() {
		const n = cols * rows;
		if (trail) {
			for (let i = 0; i < n; i++) {
				const e = energy[i];
				band[i] = e > 0.85 ? 5 : e > 0.6 ? 3 : e > 0.35 ? 2 : e > 0.1 ? 1 : 0;
			}
			return;
		}
		for (let y = 0; y < rows; y++) {
			const row = y * cols;
			for (let x = 0; x < cols; x++) {
				const i = row + x;
				const h = height(x, y);
				// Low ground is dark. High ground above the last cut is bare paper.
				let b = h < CUTS[0] ? 4 : h < CUTS[1] ? 3 : h < CUTS[2] ? 2 : h < CUTS[3] ? 1 : 0;
				const e = energy[i];
				if (e > 0.15) b = Math.max(b, e > 0.5 ? 3 : 2);
				// The trail cools through the greys, newest ink first, like the pointer heat.
				const age = time - visit[i];
				if (age >= 0 && age < TRAIL_LIFE && visit[i] >= spawn + 0.8) {
					const level = age < 5 ? 5 : age < 6.5 ? 4 : age < 8 ? 3 : age < 9 ? 2 : 1;
					if (level > b) b = level;
				}
				band[i] = b;
			}
		}
	}

	function dot(i) {
		const y = (i / cols) | 0, x = i - y * cols;
		ctx.fillRect(x * PITCH + SQUARE / 2, y * PITCH + SQUARE / 2, 1.5, 1.5);
	}

	// The cell range under the head, outline included. The outline runs 2 px past the head on
	// every side, so it can touch one more cell.
	function headRange() {
		const hx = Math.round(q[0]) * PITCH, hy = Math.round(q[1]) * PITCH;
		return [
			Math.max(0, Math.floor((hx - 2) / PITCH)), Math.max(0, Math.floor((hy - 2) / PITCH)),
			Math.min(cols - 1, Math.floor((hx + 2 * PITCH + 1) / PITCH)), Math.min(rows - 1, Math.floor((hy + 2 * PITCH + 1) / PITCH)),
		];
	}

	function paintHead() {
		// The head lights up through the greys after a restart. A paper outline then
		// separates it from the darkest band.
		const age = time - spawn;
		const slot = age < 0.2 ? 1 : age < 0.4 ? 2 : age < 0.6 ? 3 : age < 0.8 ? 4 : 5;
		const hx = Math.round(q[0]) * PITCH, hy = Math.round(q[1]) * PITCH;
		if (slot === 5) {
			ctx.fillStyle = paper;
			ctx.fillRect(hx - 2, hy - 2, 2 * PITCH + 3, 2 * PITCH + 3);
		}
		ctx.fillStyle = ink[slot];
		ctx.fillRect(hx, hy, 2 * PITCH - 1, 2 * PITCH - 1);
		headBox = headRange();
	}

	function paintAll() {
		ctx.clearRect(0, 0, cssW, cssH);
		const n = cols * rows;
		// A counting sort groups the lit cells by shade, so each shade walks only its own cells
		// instead of the whole grid.
		counts.fill(0);
		for (let i = 0; i < n; i++) counts[band[i]]++;
		for (let s = 1, at = 0; s <= 5; s++) {
			starts[s] = at;
			at += counts[s];
		}
		for (let i = 0; i < n; i++) if (band[i]) order[starts[band[i]]++] = i;
		for (let s = 1, at = 0; s <= 5; s++) {
			ctx.fillStyle = ink[s];
			for (const end = at + counts[s]; at < end; at++) {
				const i = order[at];
				const y = (i / cols) | 0;
				ctx.fillRect((i - y * cols) * PITCH, y * PITCH, SQUARE, SQUARE);
			}
		}
		if (!trail) {
			ctx.fillStyle = ink[5];
			ctx.globalAlpha = 0.32;
			for (let y = 0; y < rows - 1; y++) {
				for (let x = 0; x < cols - 1; x++) {
					const i = y * cols + x;
					if (isContourDot(band, cols, i, hash)) dot(i);
				}
			}
			ctx.globalAlpha = 1;
			paintHead();
		}
		shown.set(band);
		full = false;
	}

	// Only cells whose band changed are repainted. A contour dot at a cell also reads the cells
	// to its right and below, so a change dirties the cells to its left and above as well. The
	// head is painted last, so the cells under its old and new box are repainted too.
	function paint() {
		// The stylesheet can apply after this module runs, and then the tokens read as empty.
		// Nothing is drawn until they resolve, and the first paint after that is a full one.
		if (!ink[1]) {
			readColors();
			if (!ink[1]) return;
			full = true;
		}
		if (full) return paintAll();
		const n = cols * rows;
		let count = 0;
		const mark = (i) => {
			if (dirty[i]) return;
			dirty[i] = 1;
			dirtyList[count++] = i;
		};
		for (let i = 0; i < n; i++) {
			if (band[i] === shown[i]) continue;
			mark(i);
			if (i % cols > 0) mark(i - 1);
			if (i >= cols) mark(i - cols);
		}
		if (!trail) {
			const next = headRange();
			for (const [x0, y0, x1, y1] of [headBox, next]) {
				for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mark(y * cols + x);
			}
		}
		for (let k = 0; k < count; k++) {
			const i = dirtyList[k];
			const y = (i / cols) | 0, x = i - y * cols;
			ctx.clearRect(x * PITCH, y * PITCH, PITCH, PITCH);
			if (band[i]) {
				ctx.fillStyle = ink[band[i]];
				ctx.fillRect(x * PITCH, y * PITCH, SQUARE, SQUARE);
			}
		}
		if (!trail) {
			ctx.fillStyle = ink[5];
			ctx.globalAlpha = 0.32;
			for (let k = 0; k < count; k++) {
				const i = dirtyList[k];
				const y = (i / cols) | 0, x = i - y * cols;
				if (x < cols - 1 && y < rows - 1 && isContourDot(band, cols, i, hash)) dot(i);
			}
			ctx.globalAlpha = 1;
			paintHead();
		}
		for (let k = 0; k < count; k++) {
			const i = dirtyList[k];
			dirty[i] = 0;
			shown[i] = band[i];
		}
	}

	function decay(dt) {
		if (!live) return;
		const k = Math.exp(-dt * DECAY);
		const n = cols * rows;
		let peak = 0;
		for (let i = 0; i < n; i++) {
			const e = energy[i] * k;
			energy[i] = e;
			if (e > peak) peak = e;
		}
		if (peak < 0.01) {
			energy.fill(0);
			live = false;
		}
	}

	function redraw() {
		if (cols === 0) return;
		compose();
		paint();
	}

	function frame(now) {
		frameId = requestAnimationFrame(frame);
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		time += dt;
		decay(dt);
		if (!trail) advance(dt);
		compose();
		paint();
		if (trail && !live) stop();
	}

	function start() {
		if (frameId || !onScreen || cols === 0) return;
		if (trail && !live) return;
		last = performance.now();
		frameId = requestAnimationFrame(frame);
	}

	function stop() {
		if (frameId) cancelAnimationFrame(frameId);
		frameId = 0;
	}

	function onTheme() {
		readColors();
		full = true;
		if (!frameId) redraw();
	}

	readColors();
	const sizeWatch = new ResizeObserver(resize);
	sizeWatch.observe(parent);
	const viewWatch = new IntersectionObserver((entries) => {
		onScreen = entries[entries.length - 1].isIntersecting;
		if (onScreen) start();
		else stop();
	});
	viewWatch.observe(canvas);
	window.addEventListener('pointermove', onPointerMove, { passive: true });
	document.addEventListener('themechange', onTheme);
	resize();
	start();

	return {
		destroy() {
			stop();
			sizeWatch.disconnect();
			viewWatch.disconnect();
			window.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('themechange', onTheme);
		},
	};
}
