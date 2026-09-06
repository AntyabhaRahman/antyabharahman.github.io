import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
	site: 'https://antyabharahman.github.io',
	security: {
		csp: {
			directives: ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "img-src 'self' data:", "font-src 'self' data:"],
			// KaTeX and the pixel transition need inline style attributes, never inline event handlers.
			styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
		},
	},
	markdown: {
		shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
		processor: unified({
			remarkPlugins: [remarkMath],
			rehypePlugins: [rehypeKatex],
		}),
	},
});
