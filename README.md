# Personal website

Astro static site for projects, blog posts, and research papers. Blog and research pages render LaTeX math with KaTeX.

## Run it

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:4321. `npm run build` writes the site to `dist/`.

## Add content

Each section is one folder under `src/content/`. One markdown file is one page. The file name is the URL slug.

| Folder | Frontmatter keys |
| --- | --- |
| `blog/` | `title`, `description`, `date`, `tags` |
| `research/` | `title`, `authors`, `venue`, `date`, `description`, `tags`, optional `pdf`, `arxiv`, `code` |
| `projects/` | `title`, `description`, `date`, `tags`, `status` (`active` or `done`), optional `repo`, `url` |

The schema for each folder is in `src/content.config.ts`. The build fails if a file misses a key.

Write inline math as `$x$`. Write display math as `$$` on its own line, the equation, then `$$` on its own line. A `$$...$$` pair on a single line renders inline.

The current files are placeholders. Replace them and keep the keys.

## Deploy

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`. In the repository settings, set Pages to deploy from GitHub Actions. The site URL is set in `astro.config.mjs`.

## Where things live

- `src/styles/global.css` holds the color tokens for both themes, the fonts, and the rough-line filter class.
- `src/components/Deck.astro` is the home page panel row.
- `src/components/ThemeToggle.astro` swaps the theme with a View Transition circle wipe and stores the choice in `localStorage`.
- `src/scripts/pixel-field.js` draws the canvas field. `ambient` mode runs on the home page. `trail` mode runs behind article text.
- `PIXEL_ANIMATION_STYLE_GUIDE.md` is the motion spec the canvas follows.
