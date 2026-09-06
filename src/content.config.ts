import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const md = (name: string) => glob({ pattern: '**/*.md', base: `./src/content/${name}` });

export const collections = {
	blog: defineCollection({
		loader: md('blog'),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			note: z.string().optional(), // one margin note shown beside the post
		}),
	}),
	research: defineCollection({
		loader: md('research'),
		schema: z.object({
			title: z.string(),
			authors: z.array(z.string()),
			venue: z.string(),
			date: z.coerce.date(),
			description: z.string(),
			pdf: z.string().url().optional(),
			arxiv: z.string().url().optional(),
			code: z.string().url().optional(),
		}),
	}),
	projects: defineCollection({
		loader: md('projects'),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			repo: z.string().url().optional(),
			url: z.string().url().optional(),
			status: z.enum(['active', 'done']).default('done'),
		}),
	}),
};
