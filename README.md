# Personal website

Astro static site for projects, blog posts, and research papers. Blog and research pages render LaTeX math with KaTeX.

## Run it

Astro needs Node 22.12 or later. `.nvmrc` pins Node 24.

```bash
nvm use
npm install
npm run dev
```

The dev server runs at http://localhost:4321. `npm run build` writes the site to `dist/`.

## Add content

Each section is one folder under `src/content/`. One Markdown file is one page, and the file name is the URL slug. A new file shows up on its section page and on the home panel with no other change.

| Folder | Required keys | Optional keys |
| --- | --- | --- |
| `blog/` | `title`, `description`, `date` | `tags`, `note`, `draft` |
| `research/` | `title`, `authors`, `venue`, `date`, `description` | `openreview`, `pdf`, `arxiv`, `code`, `site` |
| `projects/` | `title`, `description`, `date` | `tags`, `status` (`active` or `done`), `repo`, `url` |

The schema for each folder is in `src/content.config.ts`. If a file misses a required key, the build fails and names the file.

Write titles in sentence case and capitalize the first word after a colon: "MASK-OFF: Evaluating LLMs for omission of material fact". The headline style does not change case, so the title shows as written.

Each section lists its entries by `date`, newest first.

If a research paper sets `site`, its title on the Research page and the home panel opens that URL instead of the paper's page. The paper's page still builds.

### Add a blog post

1. Create `src/content/blog/<slug>.md`. The post's URL is `/blog/<slug>/`.
2. Add the frontmatter and the body:

	```markdown
	---
	title: "Why probes beat ablations: A short note"
	description: One line shown under the title in the blog list.
	date: 2026-10-14
	tags: [interpretability, rl]
	note: One margin note shown beside the post.
	---

	The post body is plain Markdown.
	```

3. Run `npm run dev` and open the post to check it.
4. Commit and push to `master`.

Put images in `public/blog/` and link them as `![Alt text](/blog/figure.png)`. The content security policy in `astro.config.mjs` allows images only from the site itself, so an image hotlinked from another domain does not load.

To keep a post unpublished, add `draft: true` to its frontmatter. `npm run dev` still shows the post, and the built site leaves it out of the post pages, the blog list, and the home panel. If you add `draft` to an existing post while the dev server runs, restart the server. `src/content/blog/new-post.md` is a draft skeleton to copy.

### Write math

Write inline math as `$x$`. Write display math as `$$` on its own line, the equation, then `$$` on its own line. A `$$...$$` pair on a single line renders inline.

## Deploy

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `master`. In the repository settings, set Pages to deploy from GitHub Actions. The site URL is set in `astro.config.mjs`.

## Where things live

- `src/styles/global.css` holds the color tokens for both themes, the fonts, and the rough-line filter class.
- `public/fonts/` holds the self-hosted fonts. Headlines (the `.display` class) use Space Grotesk 700. Body text uses IBM Plex Sans, and labels use IBM Plex Mono.
- `src/components/Deck.astro` is the home page panel row.
- `src/components/ThemeToggle.astro` swaps the theme with a View Transition circle wipe and stores the choice in `localStorage`.
- `src/scripts/pixel-field.js` draws the canvas field. `ambient` mode runs on the home page. `trail` mode runs behind article text.
- `PIXEL_ANIMATION_STYLE_GUIDE.md` is the motion spec the canvas follows.
