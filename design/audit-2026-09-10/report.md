# UI audit — 10 September 2026

## Remediation update

The confirmed findings were fixed after the audit at the user's request. Article headings now scale from 24px and reflow without clipping; mobile navigation uses its intended 14.4px size; every route has a focusable main landmark and a working skip link; Blog has a “No posts yet.” message; article resource links share the existing touch-target padding. Reduced-motion preferences now skip the entrance, stop field motion, and disable CSS transitions. The field handles live preference changes, and non-View-Transition themes recolor immediately without a trailing canvas wave.

Validation: production build, CSP checks, expanded motion/theme tests, and diff whitespace checks pass. Browser checks across all eight routes at four widths (32 combinations) show no horizontal overflow and exactly one main target per route; see `fixed-responsive-metrics.json`. Activating Skip to content was verified to focus `main`, and the Blog empty message was verified in the rendered page. Physical-device frame-rate profiling remains outside these fixes.

The original audit below is retained as before-fix evidence.

## Verdict

The visual language is consistent, the revised About card fits small screens, and keyboard deck expansion works. The site is not yet free of UI issues: a long research heading breaks mobile reflow, mobile navigation stays smaller than its intended CSS value, and the empty Blog page gives no explanation. Motion lifecycle tests pass, but this audit does not certify frame-rate smoothness on physical phones.

This is a read-only audit of the current local build, including the existing uncommitted About changes. No application changes were made during this audit.

## Scope and evidence

All eight generated HTML routes were inspected on mobile. DOM layout checks covered all eight at actual CSS viewport widths of 320, 400, 800, and 1309px. Desktop visual checks covered the homepage, focused decks near 954px, light theme, and research article. The browser's scale means requested outer viewport sizes differ from measured CSS widths; the JSON evidence records actual `innerWidth`.

Evidence: current-run screenshots below; `responsive-metrics.json`; `desktop-metrics.json`; source review by two subagents; and a fresh successful `npm test` under Node 24.20.0. Existing build/CSP checks also passed on the audited source before this read-only run.

## Confirmed findings

1. **High — research article clips on small phones.** At 320px, the document grows to 357px while the body is 306px wide. The unbreakable uppercase heading contributes a min-content width wider than the article grid track. Screenshot 02 shows the right edge cutting off the title. Set a zero minimum for the mobile grid track and allow long heading words to break; verify at 320px and browser text zoom. Relevant source: `src/styles/global.css`, `.article header` and `.article h1`, including the 900px breakpoint.
2. **Medium — mobile navigation override loses in the cascade.** Computed navigation size is 12.48px at 320px and 400px. The early 640px rule requests 14.4px, but the later base `.nav` resets it. Move the mobile override after the base rule and recheck the active-page bullet plus theme control at 320px. Source: `src/styles/global.css:106` and `:166`.
3. **Medium — homepage has no main landmark.** DOM checks return zero `main` elements on `/`, versus one on every other route. Change the homepage hero section to `main`. There is also no skip-to-content link in the shared layout; one would improve repeated keyboard navigation.
4. **Low — Blog looks unfinished rather than intentionally empty.** The collection currently has zero entries and the page displays just its title and lede. Add a brief empty-state message such as “No posts yet.” Screenshot 04; `src/pages/blog/index.astro`.
5. **Low — article resource links have smaller hit areas than nearby controls.** OpenReview and arXiv measure about 25px high in the tested browser. Their selector is absent from the shared touch-target rule. Extend the existing padding treatment to `.article .links a`; test on touch hardware. This is a consistency/comfort recommendation, not a claim that a 25px target automatically fails WCAG.

## Motion and transition audit

| Effect | Evidence and result | Remaining limit |
|---|---|---|
| Pixel text entrance | Current routes reached readable settled states; tests verify gentle monotone crossover, interaction lock restoration on completion/resize, and cleanup. Fonts settle before rasterization; a 3-second bootstrap fallback reveals text if setup fails. | No frame-by-frame recording or slow-device profiling. |
| Ambient/pointer field | Background is present and updates during interaction captures. Tests cover cadence, selection/deselection behavior, terrain, and cleanup. Source caps raster scale, limits ambient redraws to about 30Hz, caps long deltas, and pauses offscreen fields. | The deliberately stepped pixel effect is not a claim of 60fps animation. Physical touch/pointer latency was not measured. |
| Deck expand/collapse | Keyboard focus revealed Projects and Research content at about 954px. Projects body fit within the expanded panel; focus remained visibly outlined. Expansion uses 496ms easing, body fade 288ms with 128ms delay. | Mouse-hover timing was reviewed in shared CSS; no separate high-speed pointer recording. Desktop clips suggested by code were not reproduced in the tested focused state. |
| Theme wipe and icon | Dark/light endpoints were captured; sequential/repeated toggles settled; no error/warning logs were returned for the tested tab. CSS wipe and field wave both use 416ms, with icon transitions of 200–400ms. Storage/label tests pass. | Very rapid overlapping View Transitions and browsers without View Transition support were not exhaustively profiled. Fallback swaps page colors immediately while the field can still animate, so cross-browser parity needs a separate check. |
| Link and decoration fades | Underlines and focus styling are visible; source uses 160–256ms link transitions and a staged 256ms decoration fade. | Screenshots establish endpoints, not continuous frame pacing. |
| Reduced motion | Source explicitly ignores the preference under an earlier documented owner decision. There is no reduced-motion alternative for the entrance, field, deck, or wipe. | This is an accessibility limitation. Revisit the decision before changing it; the audit did not override it. |

The browser's read-only evaluator did not expose `requestAnimationFrame`, so an attempted frame-cadence sample could not run. No FPS, dropped-frame, or “perfectly smooth” claim is made.

## Typography, spacing, and accessibility observations

- The current About hierarchy is clearer: 19px bio, 17px medium monospace actions, and 16px proportional email. Name sizing follows its available column and does not overflow in the responsive checks.
- Role and city wrap naturally, with the comma staying attached to the role. At 320px, Sydney occupies the next line without a stray separator.
- Project and research listing cards have consistent padding, usable wrapping, and readable separation. The very long research title is the notable exception in the article layout.
- Desktop research title occupies substantial vertical space. It fits at desktop width but is visually dominant; consider a smaller article-only display scale after fixing mobile reflow.
- Focus styling and current-page navigation indicators exist and were observed. External resource URLs and resume document contents were not audited as separate products.
- The IBM Plex Sans file was confirmed to contain variable-font tables (`fvar`, `gvar`, `HVAR`, `avar`). Multiple weight declarations pointing to a filename containing “400” are therefore not sufficient evidence of a weight bug; that suspected finding was rejected.
- Color appearance was inspected in both themes. No formal screen-reader pass, contrast certification, physical iOS/Android pass, browser zoom matrix, or full WCAG conformance claim is included.

## Recommended order

Fix the article reflow first, then mobile navigation sizing and the homepage landmark. Add the Blog empty message and consistent article link targets next. Keep the current animation design until physical-device profiling shows a concrete timing problem; revisit reduced-motion support as an explicit design/accessibility decision.

## Captured flow — numbered steps

### Step 1: Homepage on a small phone — Mostly healthy

Name and contact hierarchy fit. Role/location wrap naturally. Shared small navigation and absent main landmark remain.

![Homepage on a small phone](01-home-mobile.png)

### Step 2: Research article on mobile — Needs correction

The long uppercase heading clips at the right edge and introduces horizontal scrolling; resource links have small hit areas.

![Research article on mobile](02-research-article-mobile.png)

### Step 3: Projects listing — Healthy layout

Two project cards wrap naturally with consistent spacing. Navigation is smaller than the intended mobile rule.

![Projects listing](03-projects-mobile.png)

### Step 4: Blog listing with no entries — Needs explanation

No empty-state message appears beneath the lede.

![Blog listing with no entries](04-blog-mobile.png)

### Step 5: Research listing — Healthy layout

The long title and author list wrap within the card. Metadata remains visually secondary.

![Research listing](05-research-mobile.png)

### Step 6: MNIST project article — Healthy layout

Heading and summary fit; repository target could be larger on touch.

![MNIST project article](06-project-mnist-mobile.png)

### Step 7: PySpark project article — Healthy layout

Title wraps without horizontal overflow and body measure fits.

![PySpark project article](07-project-pyspark-mobile.png)

### Step 8: Not-found page — Healthy recovery

Recovery destinations are visible and underlined.

![Not-found page](08-not-found-mobile.png)

### Step 9: Desktop homepage near deck breakpoint — Mostly healthy

Panels align consistently and About typography remains distinct.

![Desktop homepage near deck breakpoint](09-home-desktop.png)

### Step 10: Projects deck keyboard expansion — Healthy in tested state

Content stays within the expanded panel and the focused link has a visible outline.

![Projects deck keyboard expansion](10-deck-focus.png)

### Step 11: Research deck keyboard expansion — Healthy in tested state

The long research entry is revealed and focus is retained.

![Research deck keyboard expansion](11-research-deck-focus.png)

### Step 12: Light theme transition endpoint — Healthy endpoint

The paper/ink palette and card hierarchy remain coherent after toggling.

![Light theme transition endpoint](12-home-light.png)

### Step 13: Desktop research article — Fits; strong title emphasis

Article rail and prose are aligned, with a large multi-line display heading.

![Desktop research article](13-research-article-desktop.png)

