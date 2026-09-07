# Performance audit — 7 September 2026

Audited the production build at commit `ef3a8c7`, then retested the local fixes. The accepted UI, animation durations, hover effects and panel sizing are unchanged. Code fixes remain local; the scoped Cloudflare cache rule is deployed.

## Fixed

1. **Repeated style recalculation during the entrance.** The animation read `scrollX`/`scrollY` for each word after changing the preceding word's color. Those reads can flush pending style changes. Scroll offsets now resolve once per frame, before any word styles change. In paired 4× CPU profiles, homepage style recalculation counts fell from 879 to 166 on desktop and 1,605 to 149 on mobile. These are individual profiling runs: total CPU time did not improve consistently enough to claim a percentage speedup. Scroll compensation itself is unchanged.
2. **Retained temporary canvas memory.** The raster sheet remained allocated after its pixels had been converted into cell coordinates. Its backing store now releases immediately after sampling. Observed retained sheet size fell from 2,608,704 bytes on desktop and 3,285,216 bytes on mobile to zero. This measures that specific buffer, not total browser memory.
3. **Entrance replay after the loading fallback.** With font requests delayed four seconds, the page became visible at about three seconds, then entered `px-live` again at about four seconds. The entrance now exits if the fallback has already revealed the page. The same browser reproduction now shows one reveal at about three seconds and no subsequent entrance. This prevents a second disappearance/flicker and avoids unnecessary sampling on that slow-load path.

Regression checks live in `scripts/check-pixel-entrance.mjs`. The scroll-read and replay checks were observed failing before their fixes. The raster-release assertion and browser backing-store measurements verify cleanup.

## Coverage and results

Used installed Chromium against freshly built static files, without the development server/HMR. No browser packages were installed. Initial baseline: seven routes at three viewport/CPU configurations. Final verification: all eight emitted pages at those same configurations (24 cases).

Routes: home, projects index, both project articles, empty blog index, research index, research article, and 404. Configurations: 1440×900 desktop, 390×900 mobile emulation, and 390×900 with 4× CPU slowdown; device scale factor 2.

Each route was checked for request/page errors, initial layout shift, overflow, entrance completion and removal of interaction locks. Actions included theme switching, pointer movement and scrolling; desktop homepage checks also expanded all three panels. Existing unit checks exercise selection suppression, the deselection pulse, resize cleanup and theme storage failures.

| Final local result | Desktop | Mobile | Mobile, 4× CPU |
|---|---:|---:|---:|
| Entrance complete, range across routes | 0.77–0.86 s | 0.70–0.88 s | 0.77–1.03 s |
| Initial layout shift | 0 | 0 | 0 |
| Longest main-thread task | None over 50 ms | None over 50 ms | 132 ms |
| Page/request errors | 0 | 0 | 0 |
| Horizontal overflow / stuck inert states | 0 | 0 | 0 |

The expanding desktop panels intentionally move surrounding content on hover. Browser layout-shift entries include that movement; it is excluded from the initial-load result above, not mistaken for accidental loading instability.

### Cold load with CPU and network throttling

Three fresh-context homepage runs per viewport: 4× CPU, 1.6 Mbps download, 150 ms latency, local production server. The local server does not gzip responses, so this is a reproducible lab scenario rather than a simulation of every detail of Cloudflare delivery.

| Median | Desktop | Mobile |
|---|---:|---:|
| First contentful paint | 0.87 s | 0.87 s |
| Largest contentful paint | 1.10 s | 1.09 s |
| Entrance fully finished | 1.80 s | 1.85 s |
| Initial layout shift | 0 | 0 |

LCP does not mean the pixel crossover has finished; entrance completion is measured separately. Final desktop/mobile screenshots were visually inspected.

### Live delivery

A live request to `https://antyabharahman.com/` confirmed gzip compression: 3,757 bytes of HTML transferred. One request took roughly 61 ms to first byte; that single local-network result is not a global latency estimate. Live font headers showed a four-hour cache lifetime. Fonts are self-hosted and the four core Latin font files total 74,788 bytes. The built external JavaScript totals about 16 KB before compression, approximately 6.7 KB with local gzip. There is no large client UI framework bundle.

## Opportunities identified in the initial audit

- **Brief startup blocking on slower CPUs:** 4× mobile runs still recorded startup tasks up to 132 ms. Text wrapping, font measurement, raster sampling and initial rendering remain synchronous. Splitting that work into batches would need careful checks for fonts, scrolling, transforms and the existing entrance lock. It is the next candidate if real-phone loading feels sluggish; this audit does not establish a severe interaction stall after startup.
- **Continuous homepage background:** baseline idle task time was roughly 60–80 ms per second in the tested conditions, including browser/harness overhead. Other pages were much quieter. The ambient canvas already limits idle updates to 30 Hz and pauses when offscreen; the article trail stops when its energy expires. Reducing terrain density or update cadence further would change the accepted effect, so neither was changed.
- **Unused research maths CSS — addressed locally:** the initial build loaded 28,865 bytes of KaTeX CSS (about 7.8 KB with local gzip) on a paper without equations. Conditional loading now removes that request; see implementation follow-up below.
- **Repeat-visit caching — deployed:** versioned Astro assets now receive one-year browser caching through a scoped Cloudflare rule. Stable font filenames retain their existing lifetime; see live-header verification below.

## Validation and limits

`npm test`, `npm run build` and `git diff --check` passed. The build's CSP checks passed on all eight pages. Existing generic Shiki/CSP and empty-blog build warnings remain.

These are laboratory measurements, not real-user Core Web Vitals or an INP certification. This pass did not test physical phones, Safari, Firefox, sustained thermal/battery impact, or GPU frame pacing on low-end hardware. Browser console checks cannot prove the absence of every possible bug. No animation timing or reduced-motion policy was changed.

## Implementation follow-up

Implemented the approved remaining optimizations without changing animation timing or appearance:

- Batch transformed-element measurements during entrance preparation. A final desktop 4× CPU profile recorded 9 layouts and 60 style recalculations, versus 80 layouts and 166 recalculations after the first fixes. Mobile remained essentially unchanged at 7 layouts and 148 recalculations. These are individual lab runs, not a promised load-time percentage. Old/new geometry matched exactly for all sampled words, arrows and borders at 390, 900 and 1440 pixels.
- Reuse the terrain phase and per-row/per-column warps. A 150-frame drawing-command comparison, including pointer activity, matched the original output exactly; this assertion is retained in the pixel-field check.
- Load KaTeX CSS only for articles containing rendered equations. The current research article avoids approximately 28.9 KB uncompressed / 7.8 KB gzip of unused CSS. A temporary equation article verified stylesheet and font delivery, then was removed before the final eight-page build.
- Deployed Cloudflare rule “Cache versioned Astro assets”: eligible for cache, one-year browser TTL, restricted to the two site hostnames and `/_astro/`. Public headers confirmed `max-age=31536000` for hashed CSS, while HTML stayed at 600 seconds and stable fonts at 14,400 seconds. No blanket HTML or stable-filename caching change was made.

Final repeat: all 24 route/configuration cases passed, with zero initial layout shift, errors, horizontal overflow or stuck interaction locks. Entrance ranges were 0.77–0.87 seconds desktop, 0.71–0.88 seconds mobile, and 0.79–1.03 seconds at 4× mobile CPU. A 130 ms startup task remains on the throttled research article; synchronous font/raster preparation is still a limitation. The cold-network table above predates this follow-up and is not a new measurement of these optimizations.

`npm test`, the final eight-page production build and `git diff --check` passed. Temporary test content was removed. Cloudflare agent setup also installed 14 official skills and enabled five MCP servers; the four authenticated endpoints completed OAuth, and the documentation endpoint requires no login. Restart Codex to load the new capabilities.
