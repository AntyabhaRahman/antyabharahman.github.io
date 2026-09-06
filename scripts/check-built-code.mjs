import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/blog/why-adam-needs-bias-correction/index.html', 'utf8');
const code = html.match(/<pre\b[^>]*class="astro-code[^]*?<\/pre>/)?.[0];
assert.ok(code, 'Adam article must contain its code example');
assert.ok(code.includes('github-light') && code.includes('--shiki-dark:'),
	'Code must emit light colors and dark overrides, not pale dark-only text on light paper');
console.log('Code highlighting includes both themes.');
