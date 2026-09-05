# Reactive Pixel Field — Style Guide

Reference: [Craft, engineered — Wild](https://craft.wild.as/). Inspected 5 September 2026.

This is a practical design and motion specification inspired by the reference, not an official Wild brand manual. **Reference observations** describe the appearance and inline animation code inspected on the live page. **Recommended settings** are proposed starting points for a new implementation; they are not measurements of the reference.

## 1. Creative direction

**A living digital surface: organic motion expressed through crisp square cells.**

The field should feel responsive, tactile, and slightly unpredictable. Broad colour clouds drift through a disciplined grid. Moving the pointer introduces local energy; the resulting trail appears, spreads visually through neighbouring cells, and fades back into the ambient field.

The visual character combines the precision of a digital instrument with the behaviour of a soft material. Think of a weather map, a thermal image, and an interactive mosaic. These are visual analogies, not claims that the effect represents physical measurements.

Use these terms in briefs:

- Cursor-reactive pixel field.
- Generative pixel cloud.
- Banded thermal colour field.
- Fluid-like motion on a fixed grid.
- Interactive pixel brush with fading trails.

The priorities, in order, are readable content, clear interaction, recognisable pixel structure, and expressive motion.

## 2. Pixel geometry

### Reference observations

The hero code starts with a **9 CSS-pixel cell size**. It draws individual squares on a regular grid. Fine gaps separate the squares, allowing the white surface beneath to remain visible. Other effects use their own pixel sizes, so 9px should be understood as the main visual rhythm rather than a universal value throughout the site.

### Recommended rules

| Property | Starting specification |
|---|---|
| Base cell pitch | 9 CSS px |
| Painted square | 8 × 8 CSS px |
| Gap | 1 CSS px |
| Shape | Square, sharp corners |
| Alignment | One shared grid origin per animation surface |
| Edge treatment | Hard edges; no blur or rounded cells |
| Primary scale | Keep cell size stable while shapes evolve |
| Larger accents | Use deliberate multiples of the base pitch |

Cell pitch includes the painted square and the gap. Calculate positions from row and column indices so the grid remains coherent.

The large shapes may curve and flow, but their silhouettes should resolve into stair-stepped edges. Avoid random pixel sizes or loose confetti in the main field: its identity comes from many cells acting together.

For a full-width field, keep the grid anchored to the viewport or its container. For a card or diagram, use a local grid anchored to that component. Avoid changing the grid origin every frame or during ordinary scrolling.

## 3. Colour system

These colour values were verified in the reference's inline animation code.

| Colour | Hex | Suggested visual role |
|---|---|---|
| Deep navy | `#1C2541` | Low-intensity regions and dark boundaries |
| Cobalt blue | `#3B5BD9` | Cool intermediate regions |
| Golden yellow | `#F5C518` | Warm, prominent regions |
| Orange-red | `#E0492A` | Higher-intensity accents |
| Electric lime | `#D8FF00` | Bright energy accents and interaction highlights |
| White | `#FFFFFF` | Background, cell gaps, breathing room |

The field should use **distinct colour bands**, with each cell receiving a flat fill. The overall image can change smoothly as cells switch bands, but it should retain visible colour regions.

Recommended application:

- Let navy and blue establish structure; use yellow and orange-red to create focal regions.
- Use lime purposefully so it remains a strong accent. It may occupy larger regions in the hero, but should be restrained around reading content.
- Preserve meaningful white space between clusters and around text.
- Keep ordinary text near-black on white. Yellow and lime should not carry small text on white.
- Do not make colour the only signal for a selected state, an error, or a required action.

Treat the palette as expressive. If the same visual language is used for real data, provide an explicit legend and a separate, appropriate mapping of values to colours.

## 4. Shape and texture

Build the composition at two scales:

1. **Large structure:** broad clouds, curling bands, islands, and open channels of white.
2. **Small texture:** irregular cell boundaries, small holes, and occasional detached cells near the edges.

Most pixels should belong to a larger form. Fine variation should roughen the silhouettes without obscuring them.

Recommended balance:

| Element | Desired treatment | Avoid |
|---|---|---|
| Main forms | Broad, connected colour masses | Uniform random noise |
| Boundaries | Stepped, irregular, gently evolving | Smooth vector outlines |
| Interior | Legible regions with some variation | Constant high-frequency flicker |
| Empty space | Intentional channels and breathing room | Equal density everywhere |
| Pixel texture | Consistent geometry and spacing | Rounded dots or glossy particles |

The field should still have a clear composition when frozen. Motion should enrich a strong image rather than compensate for a weak one.

## 5. Ambient motion

### Reference observations

The main field is drawn using 2D Canvas. Its base pattern combines animated mathematical waves and coordinate warping to produce drifting, cloud-like forms. This creates fluid-like movement without requiring a physical fluid simulation.

### Recommended behaviour

Keep the field alive while the visitor is idle. Let broad shapes evolve slowly; avoid moving the whole composition uniformly in one direction. Different regions should appear to swell, recede, and change shape at slightly different rates.

Use continuous internal values for animation, then map the result onto discrete cells. The distinction matters: square geometry does not require choppy timing.

| Motion property | Recommended starting range |
|---|---|
| Broad ambient evolution | Approximately 8–20 seconds for a substantial visible change |
| Local interaction onset | Within the next rendered frame where practical |
| Interaction easing | Approximately 80–180 ms |
| Visible trail decay | Approximately 250–700 ms |
| Return from local deformation | Approximately 400–900 ms |

These ranges are tuning suggestions. Evaluate them together at the actual display size rather than treating each as an independent requirement.

Avoid visible loop resets, constant jitter, rapid full-screen colour changes, and abrupt switching between unrelated patterns.

## 6. Pointer interaction

### Reference observations

Pointer movement updates the cursor location. The code deposits heat along the pointer path and fades that heat over time. Interpolated stamps keep fast movements from producing disconnected marks. Desktop presses can create bursts; longer holds produce stronger effects.

### Recommended interaction model

Think of the pointer as a soft brush acting on the field. It has an area of influence, not just a single active pixel.

| State | Expected response |
|---|---|
| Idle | Ambient field continues to evolve |
| Pointer enters | Local influence appears smoothly |
| Slow movement | Compact, readable trail follows the path |
| Fast movement | Continuous stroke connects sampled positions |
| Pointer stops | Residual energy fades naturally |
| Pointer leaves | Interaction decays; ambient motion continues |
| Press and release | Optional expanding pulse centred on the press |
| Longer hold | Optional stronger pulse, with a capped maximum |

Recommended starting values:

- Brush radius: roughly 5–10 cell pitches; define radius explicitly so it is not confused with diameter.
- Falloff: strongest in the centre, tapering smoothly to zero near the edge.
- Accumulation: clamp energy so repeated strokes do not permanently saturate the field.
- Trail: transient; ordinary pointer movement should not leave permanent paint.
- Response: cells change colour or occupancy while the grid itself remains stable.

The reference uses both global pixel effects and specialised local interactions. When adapting the system, keep the hero's energy brush distinct from diagrams where particles are displaced around the pointer.

Do not trigger decorative bursts when a visitor activates navigation, buttons, inputs, or other controls. Keep text selection and ordinary scrolling intact.

## 7. Pulses and bursts

Bursts are a secondary expressive layer. The core experience should work with ambient motion and the pointer brush alone.

A recommended pulse sequence is:

1. Local energy gathers at the activation point.
2. A ring or broad disturbance expands through the field.
3. Nearby cells briefly change intensity or colour.
4. The disturbance loses strength and disappears.

Use a soft amplitude envelope rather than an abrupt on/off flash. If hold-to-charge is included, show the charge locally and cap the duration and strength. Avoid page-wide camera shake in a content-focused adaptation; the field itself can communicate the response.

Never make an essential action depend on discovering a long press or double click.

## 8. Composition and typography

The reference pairs expressive pixel fields with a restrained editorial layout: white space, large black sans-serif headlines, smaller supporting copy, and fine structural divisions.

For a new site:

- Use an existing clean sans-serif typeface with clear forms and regular or medium weights.
- Keep body copy as normal selectable HTML text.
- Use large headlines to provide a stable visual anchor.
- Reserve uppercase for short labels when it suits the brand; keep long paragraphs easy to read.
- Keep decorative pixels away from text through clear regions, masks, or solid content surfaces.
- Allow the hero to be visually dense, then reduce density around long reading sections.

Do not render essential copy into the animation canvas. If a headline has a pixel reveal, retain a real text equivalent and ensure the final state is immediately readable when motion is disabled.

A good composition should remain understandable with the animation hidden.

## 9. Extending the style across a page

Use a shared pixel vocabulary, with a small number of distinct behaviours.

| Surface | Suggested treatment |
|---|---|
| Hero | Broad ambient cloud field with energy brush |
| Section transition | Sparse fading clusters or a short pixel reveal |
| Project card | Restrained pixel accents at the media edge |
| Process diagram | Pixel strands that part around the pointer and return |
| Button | Brief local pixel accent that preserves the label |
| Footer | Small ambient cluster or an optional playful element |

Use the strongest animation in one primary area. Supporting effects should make the system feel consistent without competing for attention.

Hover effects should reinforce elements that are actually interactive. Keep keyboard focus styles clear and conventional even when hover is expressive.

## 10. Mobile and responsive behaviour

These are recommendations for an adaptation, not a statement that the reference implements every rule below.

- Keep approximately the same apparent pixel size across devices. Show fewer cells on a smaller screen rather than shrinking them until the texture disappears.
- Reduce field coverage or density before sacrificing readable text.
- Maintain a composed ambient state when no hover pointer exists.
- If touch interaction is included, a brief tap may trigger a restrained local pulse. Distinguish taps from scrolling gestures.
- Let vertical swipes scroll the page naturally. Do not capture all touch movement for decorative drawing.
- Recalculate dimensions when the actual layout width changes. Avoid unnecessary resets during mobile browser chrome changes.
- Avoid exposing controls for every animation parameter; keep tuning values in the implementation unless experimentation is part of the product.

## 11. Accessibility and comfort

Accessibility behaviour belongs in the initial design specification.

- Honour reduced-motion preferences with a composed static field or a substantially reduced-motion version. Disable decorative bursts, displacement, and trails in that mode.
- Provide a persistent pause control for continuous decorative animation. Pausing should produce a stable, intentional frame.
- Avoid rapid flashes, strobing colour changes, and large high-contrast pulses.
- Keep animated decoration outside the keyboard tab order and hidden from assistive technology when it conveys no information.
- Retain visible keyboard focus and sufficient text contrast in every animation state.
- Ensure the animation cannot block links, form controls, selection, or scrolling.
- Preserve all content and navigation if scripting or canvas rendering fails.

If a pixel effect conveys meaningful state, provide that same information in ordinary text or an accessible control state.

## 12. Implementation handoff

The inspected hero demonstrates that this appearance can be achieved with **2D Canvas, an animated procedural field, and a per-cell interaction buffer**. A larger graphics stack is not inherently required.

Recommended conceptual pipeline:

```text
Elapsed time + cell position → ambient field value
Pointer path                → local interaction energy
Ambient + interaction       → combined intensity
Intensity                   → discrete palette band
Grid position + band        → crisp painted square
Elapsed time                → interaction decay
```

Keep these responsibilities separable enough to tune, without introducing a framework just for this effect.

- Render the decorative field in one canvas where possible; keep content in HTML.
- Calculate drawing positions from a consistent CSS-pixel grid.
- Scale the backing canvas for device pixel ratio, with a practical cap. The reference caps its main canvas ratio at 2.
- Use elapsed-time-based motion and decay so behaviour stays consistent across refresh rates.
- Interpolate pointer samples to preserve continuous trails.
- Reuse numeric buffers; avoid allocating an object for every cell on every frame.
- Stop work when the page is hidden and suspend local effects when they are off screen.
- On constrained devices, reduce cell count, simulation detail, or active area before adding more rendering machinery.

Performance acceptance should be measured on representative devices. Aim for smooth frame pacing and immediate input response; do not promise a frame rate based only on a development machine.

## 13. Acceptance checklist

- [ ] A still frame reads as connected, organic colour clouds on a disciplined square grid.
- [ ] The palette retains distinct bands and useful white space.
- [ ] The main shapes evolve smoothly without moving the grid itself.
- [ ] Fast pointer strokes remain continuous.
- [ ] Local interaction fades back to the ambient state without permanent saturation.
- [ ] Optional pulses stay local, bounded, and comfortable.
- [ ] Text remains readable in dense and bright animation states.
- [ ] Links, controls, selection, and scrolling behave normally.
- [ ] Touch input does not interfere with page scrolling.
- [ ] Reduced motion and pause produce an intentional static composition.
- [ ] Keyboard and assistive-technology access do not depend on the canvas.
- [ ] Behaviour remains consistent at different refresh rates and viewport sizes.
- [ ] Hidden or off-screen animation does not consume unnecessary rendering work.

## 14. Reusable creative brief

> Create a generative, cursor-reactive pixel field with organic cloud-like motion. Use a regular square grid with crisp edges and fine white gaps. Render broad, evolving regions in deep navy, cobalt blue, golden yellow, orange-red, and electric lime. The pointer should act as a soft energy brush, producing continuous local blooms and short fading trails. Optional clicks may create restrained expanding pulses. Keep the internal motion smooth while expressing every visible shape through discrete cells. Pair the field with white space, large clean sans-serif typography, and protected reading areas. Support natural touch scrolling, reduced motion, pausing, and a static fallback.
