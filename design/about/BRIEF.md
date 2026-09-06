# Brief for one direction artboard

You write ONE static HTML artboard for a design mockup. Read every file named here before you write.

## Files

- Shell: `design/about/Shell.dc.html`. Copy it to your output file and replace the line `<!-- ABOUT BLOCK GOES HERE -->` with your about block. Change nothing else in the shell unless your direction needs it. If your block needs room, you may lower the deck sheet heights by the same amount each (they are 640, 576, 576) so the artboard stays near 1100 px tall, or raise the root `min-height`. Say what you changed in your report.
- Current site screenshot: `design/about/current-home.png` (1440 by 900). The field image behind the hero is `design/about/field.png`, already placed by the shell.
- Site source for the visual vocabulary: `src/styles/global.css`, `src/components/Deck.astro`, `src/components/Note.astro`, `src/layouts/Base.astro`. Use the exact values from there. Do not round to a 4 or 8 px grid.

## Format rules (the mockup runtime is strict; every failure is silent)

- Keep the head line `<script src="./support.js"></script>` exactly as in the shell.
- Static artboard: no `<script>` tag of your own. No JavaScript.
- Close every element. Quote every attribute. Put styling in inline `style="..."` attributes so a viewer can restyle each element. Shared class rules go in the `<helmet><style>` block that already exists; you may add rules there.
- Lay out sibling groups with `display: flex` or `display: grid` plus `gap`. Never space siblings with whitespace or per-element margins where a gap does the job.
- Icons: inline stroke SVG only, in the same hand-drawn style as the three sheet icons in the shell (stroke 1.6, round caps, a thin hatch layer). No emoji.
- Images: only `field.png` exists. Draw a portrait placeholder as an SVG sketch if your direction needs one.
- Fonts are loaded from Google Fonts in the shell: Archivo 800, IBM Plex Mono 400 and 500, IBM Plex Sans 400. Use no other font.

## Palette and type (light mode only; the mockup is light mode)

paper #efede6, paper-2 #e6e3da, ink #1a1a1a, graphite #55554f, pencil #b8b5ac. Shadow `3px 4px 0 rgba(26,26,26,0.08)`. Display: Archivo 800 uppercase, letter-spacing -0.03em, line-height 0.95. Labels: IBM Plex Mono 11.52px uppercase, letter-spacing 0.08em, graphite (class `hand`). Body: IBM Plex Sans 17px/1.6. Links: class `u` draws a 1 px ink underline. Rough sketch border: class `rough` on a `position: relative` box. No colour accent anywhere. No rounded cards with a left border stripe. No gradients.

## Copy rules

Write copy as literal text in the markup. Known facts you may use: the name Antyabha Rahman; the role line "Engineer and researcher"; GitHub `github.com/AntyabhaRahman`; the blog covers machine learning and maths (posts: "Why Adam needs bias correction", "Attention as kernel smoothing"); projects and research entries are placeholders. Facts you do not know (city, employer, degree, current job, email, CV link) go in square brackets like `[CITY]`. Never invent a fact. No filler: every line must earn its place. Keep the about block to at most 45 words of body copy.

Writing rule for every word of copy and for your report: obey the `technical-writing` and `unslop` skills. Invoke both with the Skill tool before you write. Plain words, one thought per sentence, no em dashes, no "not just X but Y", no puffery.

## Output

1. Write the artboard file named in your task, in `design/about/`.
2. Report back in at most 8 lines: the file path, the height of your about block in px, what else you changed in the shell, one sentence on why this direction works, one sentence on its main trade-off. Do not paste the HTML in the report.
