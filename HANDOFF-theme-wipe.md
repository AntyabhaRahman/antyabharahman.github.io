# Handoff: the theme wipe starts at the top centre, not at the button

Written 2026-09-06. Repo `AntyabhaRahman/antyabharahman.github.io`, branch `master`.

## State of the repo

- HEAD is `38716df`, pushed and deployed. The live site runs it.
- Three files carry uncommitted changes for this issue. They are listed under "The fix".
- `dist/` was built from the uncommitted tree. `npx astro preview --port 4322` may still be running. Stop it with `pkill -f 'astro preview --port 4322'`.
- `PIXEL_ANIMATION_STYLE_GUIDE.md` is untracked on purpose. Do not commit it.

## The report

When you click the theme toggle, the page swaps light and dark inside a growing circle. The circle should start at the toggle button. The owner reported that it starts at the top centre of the window.

## What the measurements show

The circle is drawn by a CSS view transition. `src/styles/global.css:71-78` animates `clip-path: circle(0 at var(--vt-x) var(--vt-y))` to `circle(150% ...)` on `::view-transition-new(root)`. `src/components/ThemeToggle.astro` sets `--vt-x` and `--vt-y` from the button's bounding box before it calls `startViewTransition`.

Three earlier checks read the computed style and passed. In Chromium and in WebKit at 1440 by 900, the computed clip-path is `circle(... at 1278.4px 35.19px)`. That point is the button centre.

A screenshot 70 ms after the click shows something else. The dark circle sits at about x 640, y 20. That is half of each px value. Every view transition pseudo-element reports a 1440 by 900 box, an identity transform, and zoom 1, so the halving has no visible cause in the computed values. Chromium renders px lengths in the clip-path of the root pseudo at half scale here. The cause inside Chromium was not found.

Percentages render in the right place. A test that overrode the two variables with `88.78%` and `3.91%` right after the click put the circle on the button. Screenshot: `.playwright-mcp/wipe-pct.png`. The bad frame is `.playwright-mcp/wipe-a.png`.

The field's colour ring on the canvas (commit `dcce54d`, `src/scripts/pixel-field.js`) was never wrong. A pixel classification at 100 ms after the click puts the boundary between the old and the new palette at 1199.2 px from the button on both sides. The ring uses canvas coordinates, not the view transition.

## The fix

Uncommitted, in the working tree:

1. `src/components/ThemeToggle.astro`. The click handler writes `--vt-x` and `--vt-y` as percentages of `innerWidth` and `innerHeight` instead of px. This is the fix for the reported issue.
2. `src/styles/global.css:73`. The wipe's timing function changed from `cubic-bezier(0.2, 0.8, 0.2, 1)` to `cubic-bezier(0.45, 0, 0.55, 1)`. The owner did not ask for this. The old ease-out gave the circle a radius of about 680 px by the third frame, so the eye could not read where it started. The ease-in-out keeps the radius near 110 px at 100 ms and 540 px at 200 ms. Revert this one line if the owner prefers the fast start.
3. `src/scripts/pixel-field.js:24-34`. `wipeEase` mirrors the CSS curve so the canvas ring and the page wipe move together. Its constants and comment changed to match item 2. `npm test` passes.

## What was verified

- Chromium, 1440 by 900, percentages: the circle renders on the button. Evidence is the override test above, which is equivalent to the committed code path. No screenshot was taken of the rebuilt page in Chromium.
- Chromium, field ring with the new curve: radius 124 px at 100 ms, 539 px at 200 ms, 1148 px at 300 ms. The old and new palettes separate within 3 px at each time.
- WebKit: the computed clip-path reads `circle(0% at 88.778% 3.9097%)` at 70 ms. The screenshot at 70 ms shows no circle at all, so the rendered position is not confirmed. WebKit may start the animation later than Chromium. Capture at 150 to 250 ms to see it.

## What was not verified

- WebKit rendered position, as above.
- Firefox. Not tested at any point.
- The live site. The fix is not deployed.

## Remaining steps

1. Read the diff: `git diff`.
2. Commit and push. Use `git add -A -- . ':!PIXEL_ANIMATION_STYLE_GUIDE.md'`.
3. After the deploy, reload with the cache bypassed. GitHub Pages sends `cache-control: max-age=600` on every file, so a plain reload can serve the old script for up to 10 minutes.
4. Click the toggle. Expect a small circle at the button that grows to cover the page in 520 ms.

## How to reproduce the measurement

Build and serve:

```bash
npx astro build && npx astro preview --port 4322
```

In Playwright, open `http://localhost:4322/` at 1440 by 900, wait 2.2 s for the entrance, click the centre of `.theme-toggle`, wait 70 ms, then read and screenshot:

```js
getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath
```

Compare the circle in the screenshot with the coordinates in the string. The scratchpad scripts `wk-wipe.mjs` and `wk-fixes.mjs` did this in WebKit. They live in the session scratchpad and may be gone.
