# Jules Darling Website

Static Astro portfolio for Jules Darling at `darlingjules.com`.

## Commands

- `npm run dev` starts the local site.
- `npm run build` builds the static site into `dist/`.
- `npm run check` runs Astro/TypeScript validation.
- `npm run verify` checks built routes, local links, local assets, SEO metadata, accessibility basics, and removed CDN/runtime dependencies.
- `npm run visual` captures live-vs-local comparison screenshots into `artifacts/visual/`.
- `npm run migrate` re-snapshots the live Webflow site, then reapplies the executive case-study rewrite and sentence-case cleanup.
- `npm run migrate:raw` re-snapshots the live Webflow site without rewriting case-study text or case cleanup.
- `npm run rewrite:cases` reapplies the case-study positioning/headline rewrite and sentence-case cleanup.
- `npm run sentence-case` reapplies sentence case while preserving acronyms.

## Deployment

GitHub Pages is deployed through `.github/workflows/deploy.yml`.

- Pushes to `main` run `check`, `build`, and `verify`, then publish `dist/`.
- The Astro site is configured for `https://darlingjules.com` and root-relative paths.
- The custom domain is `darlingjules.com`; configure it in the new GitHub Pages repository and point the domain's web DNS to GitHub Pages before publishing.
- Keep the previous domain on its own GitHub Pages redirect site so existing HTTPS links continue to work.

## Editing Content

This site uses repo content as the CMS:

- Page metadata lives in `src/content/pages`, `src/content/projects`, and `src/content/writing`.
- Rendered page fragments live in `src/content-html/pages`, `src/content-html/projects`, and `src/content-html/writing`.
- Shared Astro structure lives in `src/layouts`, `src/components`, and `src/pages`.
- Self-hosted media lives in `public/assets/site`.
- Render-time HTML cleanup lives in `src/lib/enhanceContent.ts`; it normalizes headings, media attributes, image alt text, external-link rel attributes, and decorative media.
- Shared SEO settings live in `src/lib/seo.ts`, with generated `robots.txt` and `sitemap.xml` routes in `src/pages`.
- Outlined Instrument Serif branding sources live in `Logo.svg` and `public/assets/brand`; social and app-icon PNG exports use those vector assets.
- The current case-study rewrite lives in `scripts/rewrite-case-studies.mjs`, but this fork now carries Jules-focused page and case-study copy directly in the migrated content files.
- The sentence-case cleanup lives in `scripts/enforce-sentence-case.mjs`; acronyms and initialisms stay capitalized.

The current migration includes all sitemap routes plus `/projects/beats-by-dre`, which is linked publicly but password-protected on the live Webflow site.
