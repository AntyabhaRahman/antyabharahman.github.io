# About card: design spec

Direction B, picked 2026-09-06. Canvas: https://claude.ai/code/artifact/920a4608-4154-41b5-ae5e-f149c621d445 (page "B. Index card"). Mockup sources: `design/about/Main.dc.html` (desktop light), `Dark.dc.html`, `Phone.dc.html`.

This document describes the design as drawn. Values come from the mockup files and from the site's own stylesheets. Where the mockup left a decision open, the section "Open decisions" says so.

## 1. What it is

A single card between the header and the three-sheet deck on the home page. It introduces the owner in one glance: a sketched portrait, the name, the role line and city, two lines of copy, and three links. It is made of the same material as the sheets, so it reads as a fourth object on the desk, not as a banner.

The card does not widen on hover and has no body that slides out. Its only interactive parts are the three links.

## 2. Placement

Home page only, `src/pages/index.astro`. The card sits inside `.hero-inner`, after the visually hidden `h1` and before `<Deck>`.

The hero is a column flex box and the deck is its `flex: 1 1 auto` child, so the deck takes the height that is left. The deck script copies that height into `--deck-h`, and the sheets cap themselves at it. No change to that mechanism is needed. The card pushes the deck down by its own height plus one gap.

| Measure | Desktop (1440 by 900) | Phone (390) |
| --- | --- | --- |
| Hero top padding | `clamp(2rem, 7vh, 4.5rem)`, 63 px at 900 high | 1rem |
| Card top edge | y 118 | y 100 |
| Gap card to deck | 1.7rem (27.2 px) | 1.25rem (20 px), the deck's own gap |
| Deck top edge | y 350 | below the card |

## 3. Anatomy, desktop

Layout: `(hover: hover) and (min-width: 901px)`. The card is a row flex box.

| Part | Value |
| --- | --- |
| Card width | 70 percent of the wrap: `min(70%, 50.4rem)`, 806.4 px at the 72rem wrap. Left aligned (`align-self: flex-start`) |
| Card height | Auto. 205 px with the copy as drawn |
| Padding | 1.3rem 1.6rem (20.8 px 25.6 px) |
| Gap portrait to text | 1.6rem (25.6 px) |
| Tilt | `rotate(-0.55deg)`. The sheets use -0.7, 0.45, -0.35 |
| Fill | `color-mix(in srgb, var(--paper) 78%, transparent)`, as `.panel` |
| Shadow | `var(--shadow)` |
| Border | class `rough` and `data-px-border`, as `.panel` |
| Portrait | inline SVG, `viewBox 0 0 48 48`, drawn at 5.4rem (86.4 px), `flex-shrink: 0`, `aria-hidden="true"`. Stroke `var(--ink)` 1.6, round caps and joins, hatch layer `var(--graphite)` 0.7 at opacity 0.7. Path is in `Main.dc.html` |
| Text column | column flex, gap 0.85rem (13.6 px), `min-width: 0` |
| Name block | column flex, gap 0.4rem (6.4 px): the name, then the role row |
| Role row | row flex, `align-items: center`, gap 0.8rem (12.8 px): role, a 0.9rem by 1 px rule in `var(--pencil)`, the city |
| Copy | two `p` with `margin: 0`, no gap between them |
| Links row | row flex, gap 1.4rem (22.4 px) |

## 4. Anatomy, phone and touch

Layout: `(hover: none), (max-width: 900px)`, the same query the deck uses to stack.

| Part | Value |
| --- | --- |
| Card width | Full wrap width. No tilt. Fill `var(--paper)`, solid, as the stacked sheets |
| Padding | 1.2rem 1.2rem 1.4rem (19.2 px 19.2 px 22.4 px) |
| Structure | column flex, gap 0.8rem (12.8 px): head row, copy, links row |
| Head row | row flex, `align-items: center`, gap 1rem: portrait at 4rem (64 px), then the name block |
| Name | 1.625rem (26 px). Wraps to two lines at 390 px |
| Role row | wraps (`flex-wrap: wrap`), gap 0.6rem |
| Copy | one `p`, the two sentences joined |
| Links row | wraps, gap 1.4rem. Each link gets the touch padding the site already uses: `padding-block: 0.6rem; margin-block: -0.6rem` |

## 5. Type

All faces are the site's own. Sizes are in rem as the site writes them; px is at 16 px root.

| Text | Face | Size | Case and tracking | Colour |
| --- | --- | --- | --- | --- |
| Name | Archivo 800, class `display` | 2.2rem (35.2 px) desktop, 1.625rem phone | uppercase, -0.03em, line-height 0.95 | `--ink` |
| Role and city | IBM Plex Mono, class `hand` | 0.72rem (11.52 px) | uppercase, 0.08em | `--graphite` |
| Copy | IBM Plex Sans 400 | 1.0625rem (17 px), line-height 1.6 | none | `--ink` |
| Links | IBM Plex Mono 400 | 0.78rem (12.48 px) | uppercase, 0.08em | `--ink`, class `u` underline |

## 6. Colour

The card uses tokens only. Nothing new is added to `:root`.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--paper` | #efede6 | #23272c | card fill (78 percent on desktop, solid when stacked) |
| `--ink` | #1a1a1a | #e8e6df | name, copy, links, portrait stroke, rough border |
| `--graphite` | #55554f | #9a9c98 | role row, hatch strokes, faint border |
| `--pencil` | #b8b5ac | #3a3f45 | the rule between role and city |
| `--shadow` | 3px 4px 0 rgba(26,26,26,0.08) | 3px 4px 0 rgba(0,0,0,0.25) | card shadow |

The theme wipe needs no change. The card recolours with the page inside the circle.

## 7. Copy

Placeholder facts stay in brackets until the owner fills them. Body copy is 22 words. Keep it under 45.

| Slot | Text as drawn | Status |
| --- | --- | --- |
| Name | Antyabha Rahman | final |
| Role | Engineer and researcher | final, same as the header |
| City | [CITY] | to fill |
| Copy line 1 | I build software and do research in machine learning. | draft |
| Copy line 2 | The blog is working notes on optimisers, attention, and the maths under them. | draft |
| Link 1 | GitHub, to https://github.com/AntyabhaRahman | final |
| Link 2 | [EMAIL] | to fill, `mailto:` |
| Link 3 | [CV] | to fill, a PDF under `public/` |

## 8. States and interaction

- The card has no hover state. It does not lift, widen, or change fill.
- Links: the site's `u` underline grows from 0 to 100 percent on hover and focus. Focus ring is the global `:focus-visible` outline, 2 px `--ink`, offset 3 px.
- Touch: every link is at least 44 px tall through the padding and negative margin pattern in `global.css`.
- The portrait is decorative: `aria-hidden="true"`, no title.
- Pointer trail: none on the home page. The field behind the card keeps its optimizer animation; the card's 78 percent fill lets it show through, as on the sheets.

## 9. Motion

- Entrance. The text column carries `data-px`, so the name, the role row, the copy, and the links light up cell by cell in the diagonal sweep with the rest of the page. The card carries `data-px-border`, so the rough border draws in like a sheet border. The portrait joins the marks that fade in over 320 ms at the end (add it to the selector list that holds `.panel-draw`).
- Theme change. Token swap inside the wipe. No card-specific animation.
- Resize. The entrance ends at the next frame after a resize, as everywhere.

## 10. Accessibility

- Heading order. The page has a visually hidden `h1` with the owner's name. Make the card's name that `h1` and remove the hidden one, so the visible name is the page heading. The sheet titles stay `h2`.
- The role row and the copy are plain text. The rule between role and city is a `span` with no text.
- Contrast. `--graphite` on `--paper` measured at least 6.8:1 in both themes in the earlier site audit. The card adds no new pairing.
- Reduce Motion is ignored by the owner's decision, as on the rest of the site.

## 11. Deck adjustments

The card takes about 232 px of the hero on desktop. Two ways to pay for it. The mockup shows the first.

| Option | What changes | Result at 1440 by 900 |
| --- | --- | --- |
| A. Keep the deck above the fold | Sheet base height 28rem to 23.6rem (`calc(23.6rem + var(--n) * 4rem)`), spine title 3.2rem to 2.4rem, the size the site already uses under `(max-height: 820px)` | Deck bottom at y 922, titles 38 px |
| B. Keep the titles | No change to the sheets | Deck bottom at y 992, about 90 px past the fold, titles 51 px |

## 12. Open decisions

1. Option A or B in section 11. The mockup shows A. My recommendation is B: the 51 px spine titles carry the page, and a 90 px scroll costs less than shrinking them.
2. The portrait. A sketch placeholder now. Replace with a real line drawing in the same stroke style, or drop the portrait and let the name start the card.
3. The name now appears twice on the home page, in the header wordmark and in the card, 90 px apart. Options: keep both, or hide the header wordmark on the home page only and keep it on every other page.

## 13. Implementation notes

- New component `src/components/About.astro`. Scoped styles, tokens from `global.css`. Rendered in `index.astro` between the hidden `h1` and `<Deck>`.
- Props: `city`, `email`, `cv` (optional href). Copy lives in the component until the owner moves it to a content file.
- The stacked breakpoint must match the deck's: `@media (hover: none), (max-width: 900px)`.
- Add `.about-draw` to the mark selectors in `global.css` next to `.panel-draw`, so the portrait fades in with the other drawings and stays hidden under `px-wait` and `px-live`.
- Checks after build: the entrance samples the card text (cells on glyphs, none stranded); `--deck-h` still lands before sampling; the card border draws in; links reach 44 px on touch; both themes; 1440, 1024, 390 widths.
