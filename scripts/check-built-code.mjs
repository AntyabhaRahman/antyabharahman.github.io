import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let count = 0;
for (const file of readdirSync('dist', { recursive: true })) {
	if (!file.endsWith('.html')) continue;
	const html = readFileSync(join('dist', file), 'utf8');
	for (const [code] of html.matchAll(/<pre\b[^>]*class="astro-code[^]*?<\/pre>/g)) {
		assert.ok(code.includes('github-light') && code.includes('--shiki-dark:'),
			`${file}: code must emit light colors and dark overrides`);
		count++;
	}
}
console.log(`Verified both highlighting themes on ${count} code blocks.`);
