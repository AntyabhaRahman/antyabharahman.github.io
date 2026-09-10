# Follow-up UI audit — 10 September 2026

## Verdict

No new blocking visual defects were found in this pass. The previous confirmed layout, empty-state, navigation-size, and landmark findings are resolved. This audit checked the latest local build at commit `810535b` (Preserve ambient effects under reduced motion), with a clean application worktree at the start. Only this report and its evidence files were created.

## Coverage

- All eight generated HTML routes, inspected with fresh mobile captures.
- 32 fresh route/viewport combinations: 320, 400, 800 and 1309 CSS pixels. All had no page overflow, exactly one main#main, and no overlapping navigation element boxes in the connected browser. Details are in `responsive-metrics.json`.
- Desktop homepage, both populated deck focus states, light/dark endpoints, not-found recovery, and keyboard skip navigation.
- Read-only reviews by two subagents covering layout/accessibility and animation/lifecycle code.
- Fresh production build, CSP verification and `npm test` all passed under Node 24.20.0. No browser errors or warnings were returned for the tested interaction session.

## Typography and spacing

The current hierarchy is balanced: desktop contact actions and email are 14px; mobile actions are 17px and email 16px; the bio is 18px. The name scales with its available column on small screens. Role and city use natural wrapping. Article headings use a 24px minimum and emergency wrapping, fixing the original research-title overflow. Listings and article body text remain within their measures.

The narrow navigation was tested with the connected browser's mouse/hover capability. The actual touch configuration uses a larger theme button, so a physical 320px touch-device check remains useful; the browser only exposes viewport overrides, not touch/media emulation. No overlap was observed in the configuration tested.

## Motion and transitions

| Effect | Current result | Evidence limit |
|---|---|---|
| Reduced background | Source advances simulation at 0.1 of normal speed; tests and captures show continuing movement. Pointer input remains suppressed. | The current regression test proves continued drawing, but not the exact 0.1 ratio. |
| Reduced theme | Computed CSS reports a 120ms opacity dissolve; no radial wave is requested. Both theme endpoints and labels work. | No frame-by-frame compositor recording. A canvas recolor can wait until the next scheduled field update; no visible defect was established. |
| Reduced deck reveal | Computed opacity transition is 120ms; geometric transitions are disabled. Keyboard expansion reveals readable content with focus retained. | This deliberately changes width immediately; it is not intended to glide in reduced mode. |
| Normal pixel entrance | Existing tests pass for crossover, completion, resize cleanup, and restoring interaction. | Current OS/browser preference is reduced motion, so normal-mode visual timing was reviewed in source/tests rather than overridden in the user's settings. |
| Normal field and pointer | Existing terrain signature, pointer, selection, pulse and cleanup tests pass. | Physical pointer latency and low-end device FPS were not measured. |
| Preference changes | Tests pass for reduced/normal mode changes, field restart, pointer reset, entrance cleanup, and listener removal. | Not exercised through the operating-system settings UI. |
| Fallback themes | Tests confirm fallback recolors without a separate radial canvas wave. | Cross-browser compositor behavior was not tested. |

The slow continuous background is the explicitly requested design. It is less movement, not a fully static accessibility mode; an optional pause remains a possible future accommodation, not an unrequested change made during this audit.

## Remaining small follow-ups

1. **Low — protect the exact speed in a test.** `scripts/check-pixel-field.mjs:125–147` checks that reduced ambient motion continues but would not fail if the speed multiplier accidentally returned to 1. Add a deterministic comparison of simulation progress between normal and reduced modes. The implementation is currently correct at `src/scripts/pixel-field.js:498`.
2. **Low — update one comment.** `src/components/ThemeToggle.astro:36` calls reduced theme changes “immediate”. The canvas recolor is immediate/next-frame, while the overall page now uses a 120ms dissolve. Clarify the comment.
3. **Verification — physical touch and motion profiling.** Check the narrowest active-page navigation with a true touch pointer and watch the first frames of theme transitions on iOS/Android. These are unverified cases, not confirmed regressions.

## Limits

This is not a WCAG certification, full screen-reader audit, physical-device benchmark, or proof of 60fps behavior. The current browser does not expose touch emulation or frame-cadence instrumentation through its supported controls. Screenshots show visual states and changing background patterns, not continuous frame pacing. External websites and resume document contents were outside this site's UI scope. Some initial captures were taken before the browser had finished painting navigation; those were rejected and replaced with settled captures.

## Captured steps

### 1. Mobile homepage — Pass

The name fits its available column, the role and city wrap naturally, and contact typography is distinct from the bio.

![Mobile homepage](01-home-mobile.png)

### 2. Projects listing — Pass

Card titles, descriptions and metadata wrap within their borders.

![Projects listing](02-projects-mobile.png)

### 3. Blog empty state — Pass

The settled page clearly says “No posts yet.” Navigation remains visible.

![Blog empty state](03-blog-mobile.png)

### 4. Research listing — Pass

The long title and author list fit without horizontal scrolling.

![Research listing](04-research-mobile.png)

### 5. Research article — Pass

The formerly clipped heading now fits the phone width and leaves the abstract accessible below it.

![Research article](05-research-article-mobile.png)

### 6. MNIST article — Pass

Heading and summary remain within the page measure.

![MNIST article](06-mnist-mobile.png)

### 7. PySpark article — Pass

Title and paragraph wrapping are stable.

![PySpark article](07-pyspark-mobile.png)

### 8. Not-found recovery — Pass

Recovery links are visible; activating “the front page” was verified to navigate home.

![Not-found recovery](08-not-found-mobile.png)

### 9. Desktop homepage — Pass

The 14px contact actions are appropriately secondary to the name and 18px bio; background movement remains visible.

![Desktop homepage](09-home-desktop.png)

### 10. Projects deck keyboard interaction — Pass

Focused content is visible, unclipped, and clearly outlined. Reduced-mode opacity transition computes to 120ms.

![Projects deck keyboard interaction](10-projects-focus.png)

### 11. Research deck keyboard interaction — Pass

The long article link fits in the expanded deck and retains focus.

![Research deck keyboard interaction](11-research-focus.png)

### 12. Light theme — Pass

The theme reaches a coherent light endpoint. The reduced-mode root animation computes to a 120ms dissolve.

![Light theme](12-home-light.png)

### 13. Skip-to-content keyboard navigation — Pass

The skip link becomes visibly outlined, and Enter moves focus to main#main.

![Skip-to-content keyboard navigation](13-skip-link.png)

