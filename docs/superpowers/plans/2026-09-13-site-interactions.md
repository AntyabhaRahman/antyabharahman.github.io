# Site interaction refinements implementation plan

**Goal:** Implement all thirteen design decisions approved in this conversation, then obtain an independent Fable 5.1 audit.
**Architecture:** Keep Astro templates, shared CSS and existing pixel runtime. Use native overflow containers and one small layout observer script. No new dependencies.
**Spec:** User-approved designs in the current task: top-only entrance; keyboard priority; compact sticky header; narrow nav smaller and wrappable; contained rich-content overflow; full-width header; compact skip indicator; one venue year; scrollable desktop panels; static reduced motion; local project title links; clear Blog empty state; measured anchors and semantic navigation.

- [x] Motion worker: top-only entrance, static reduced motion and immediate theme toggle; extend the existing lifecycle checks.
- [x] Panel worker: focus wins over hover, scroll body with persistent footer, mobile natural height, Blog empty labels.
- [x] Content worker: local title links, shared venue formatting, Résumé (PDF), metadata check.
- [x] Parent: full-width header, compact responsive CSS, measured anchor clearance, compact focus mark, semantic active nav, contained rich article content with keyboard access.
- [x] Parent: regression checks and build; fresh browser screenshots and interactions at desktop, tablet, narrow and short viewports.
- [x] Independent review: subagent spec/code review and Fable 5.1 CLI source/screenshot audit; address confirmed defects and record remaining limits.

Ruling: Continue in the existing checkout so the approved earlier uncommitted changes and local preview remain together. User subsequently approved removal of preview fixtures, final refinements, commit and push to the existing remote branch. Worker ownership is disjoint. Retain user text enlargement rather than forcing smaller text at zoom. Screenshot/device-emulation limits must be stated.
