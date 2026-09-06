import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Check emitted HTML: source-only assertions cannot catch missing or stale CSP hashes.
function check(directory) {
	let count = 0;
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) { count += check(path); continue; }
		if (!path.endsWith('.html')) continue;
		const html = readFileSync(path, 'utf8');
		const policy = html.match(/http-equiv="content-security-policy" content="([^"]+)"/)?.[1];
		assert.ok(policy, `${path}: missing CSP`);
		assert.ok(html.indexOf('http-equiv="content-security-policy"') < html.indexOf('<script'), `${path}: CSP must precede scripts`);
		const scripts = policy.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1];
		assert.ok(scripts && !scripts.includes('unsafe-inline') && !scripts.includes('unsafe-eval'), `${path}: unsafe scripts`);
		for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
			if (/\bsrc=/.test(attrs)) continue;
			const hash = createHash('sha256').update(body).digest('base64');
			assert.ok(scripts.includes(`'sha256-${hash}'`), `${path}: inline script missing hash`);
		}
		assert.ok(policy.includes("object-src 'none'") && policy.includes("base-uri 'none'"));
		count++;
	}
	return count;
}
const pages = check('dist');
assert.ok(pages > 0);
console.log(`CSP verified on ${pages} built pages.`);
