# Audit fixes and remaining hosting steps

## Implemented locally

- Astro 7.3.1, with its Unified Markdown processor to preserve remark-math, KaTeX and Shiki. The installed dependency audit reports zero vulnerabilities.
- Node 24 selected in `.nvmrc` and deployment; package metadata requires Node 22.12 or newer.
- Duplicate IBM Plex Sans face URLs consolidated, saving 40,240 bytes on the tested cold loads.
- Storage failures no longer interrupt initial theme selection, accessible labels or canvas theme notifications.
- Ambient terrain updates at 30 Hz while idle. Pointer heat, theme wipes and entrance text retain their existing rates.
- Build-generated CSP hashes authorize inline scripts; arbitrary inline script execution and eval remain disallowed. Style attributes are allowed for KaTeX, syntax colors and animation. Embedded font/image data remains allowed.
- Referrer policy in HTML; publishing permissions limited to the deploy job; top-level Actions pinned to commits; local environment files ignored.
- Corrected the minimum-temperature subscript in the research example so KaTeX emits valid MathML.
- Regression checks cover storage failure, ambient scheduling and CSP hashes in every emitted HTML page. Pinning the composite Astro action does not pin every nested action that it invokes.

## Measured result

Three cold-load runs per page/condition, Chromium production preview. Idle desktop home task time over three seconds fell from 604 ms to 270 ms (55%). With 4× CPU throttling, 1.6 Mbps download and 150 ms latency, entrance completion fell from 2.05 s to 1.87 s on home and 2.64 s to 2.45 s on the Adam article. All measured runs had zero layout shift. These are laboratory results, not real-user Core Web Vitals.

Final verification: 24 Firefox and 24 WebKit route/viewport cases passed with no site console errors. WebKit checks omit screenshot capture because its automation-injected stylesheet conflicts with CSP. Chromium, Firefox and WebKit separately passed policy/blocked-script tests on home and the article. The production build generated and checked all 12 pages; unit regression checks passed.

## Use the upgraded project locally

Your current shell was using Node 20.15.0. Select Node 24 before installing or running Astro. With your existing nvm installation:

```sh
nvm install 24
nvm use 24
npm ci
npm test
npm run build
npm run dev
```

The initial theme script is inlined from a local source file and hashed during the build; it runs before visible body content, after the generated policy.

The build includes a check that every emitted page has its policy before scripts and that every inline script has a matching hash. Astro emits general warnings about Shiki/CSP and scoped style rules; the policy deliberately allows style attributes, and actual browser violations are checked separately.

These changes are local until committed and pushed. The existing GitHub Pages workflow deploys pushes to main/master and already selects Node 24. Check the deployment run after pushing; local tests cannot verify GitHub environment or repository permissions.

## Optional: response headers and longer asset caching

GitHub Pages has no repository setting for arbitrary response headers. A `_headers` file alone will not apply these settings there. The current meta CSP and referrer policy work without moving hosts; anti-framing headers and long-lived asset caching remain optional hardening.

If you want those controls, deploy the static build to Cloudflare Pages:

1. In Cloudflare, create a Pages project and connect this GitHub repository. Choose the production branch.
2. Set build command to `npm run build`, output directory to `dist`, and build environment variable `NODE_VERSION` to `24`. No server adapter is needed for this static site.
3. Before deploying, create `public/_headers` with the content below. Astro copies it into `dist`.
4. Verify the generated `pages.dev` preview: navigation, equations, theme changes and mobile layout. Update `site` in `astro.config.mjs` to the final public URL when switching the canonical destination.
5. Add a custom domain in the Pages project if desired. Follow its DNS instructions; changing the current github.io address itself is not possible.
6. Check response headers on the new host before retiring the existing deployment.

```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: frame-ancestors 'none'

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

The header's `frame-ancestors` rule supplements the generated meta policy; it does not replace the script/style hashes. Do not copy build-specific hashes into a permanent header file. Long caching is limited to content-hashed `_astro` assets; fonts currently have stable filenames and should not receive immutable caching without filename versioning.

References: [Cloudflare headers](https://developers.cloudflare.com/pages/configuration/headers/), [Astro migration](https://docs.astro.build/en/guides/upgrade-to/v7/).
