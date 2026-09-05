---
title: Placeholder project three
description: A static site that renders paper notes with KaTeX math and full text search over the notes.
date: 2026-08-12
tags: [web]
repo: https://github.com/AntyabhaRahman/placeholder
url: https://example.com
status: active
---

<!-- Placeholder. Replace this file with your own content. Keep the frontmatter keys. -->

A placeholder project entry.

The site turns a folder of markdown notes into browsable pages. Math is rendered at build time with KaTeX, so no script runs in the reader's browser for equations. A search index is built from the note bodies and shipped as one JSON file of about 300KB for 200 notes, which the client loads on first keystroke.

It is built with Astro and a remark plugin for the math pass. Builds take 6 seconds for 200 notes. Notes carry tags in frontmatter, and the tag pages are generated from that. There is no database and no server, so hosting is a static bucket.
