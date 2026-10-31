# AGENTS.md

## Purpose

This repo is Darlingjules.com, a sparse editorial portfolio for Jules Darling as a freelance Creative Director and Designer. Treat the visual system itself as the product: senior, restrained, precise, image-led, and hireable.

Use this file before making UI, copy, spacing, typography, or layout edits.

## Required Design Context

- Read `PRODUCT.md` and `DESIGN.md` before UI work.
- If available, use the `impeccable` skill for brand-register judgment.
- If available, use the frontend taste skill for spacing, responsiveness, viewport stability, and anti-slop checks.
- Preserve the existing identity: Instrument Serif display type, Instrument Sans body type, warm white surfaces, near-black text, sparse black CTAs, and large project media.
- Do not replace the site with generic SaaS, dashboard, agency-template, or card-grid language.

## Typography Rules

- Display headlines: use `line-height` between `0.92` and `1.06`. Only go below `0.92` for a verified one-line display treatment with no overlap at desktop and mobile.
- Mobile display headlines: prefer `0.96` to `1.1` unless a browser audit proves tighter leading is clean.
- Project card titles: use `line-height` between `1.03` and `1.12`.
- Body copy: use `line-height` between `1.45` and `1.65`, with line length capped around `65ch` to `75ch`.
- Captions and metadata: use `line-height` between `1.32` and `1.45`.
- CTAs and nav: use `line-height` between `1.1` and `1.25`.
- Avoid negative letter spacing. Default to `letter-spacing: 0` unless the existing component already has a deliberate treatment.
- Do not scale type directly with viewport width in new CSS. Use `clamp()` with a real minimum and maximum.
- Do not fix collisions with `overflow: hidden` unless the element is intentionally clipped media. Fix the actual spacing, line-height, grid, or text measure.

## Spacing Rules

- Use varied editorial rhythm. Tight groupings are allowed, but section transitions need enough air to feel intentional.
- Prefer `clamp()` for page and section spacing so desktop and mobile both breathe.
- Do not use `h-screen`. Use content-driven layout and `min-height` only when needed.
- Project cards need stable media dimensions. Thumbnails should keep a predictable frame, usually `aspect-ratio: 16 / 9`, with `object-fit: cover`.
- Project card title to caption gap must be at least `6px` on desktop and mobile.
- Media to title spacing should be visibly larger than title to caption spacing.
- No horizontal overflow at any viewport.
- No nested cards. Use full-width bands, grids, spacing, and typography before adding containers.

## UI Polish Loop

For spacing and line-height work, use a loop:

1. Inspect the rendered page at desktop `1440x1000` and mobile `390x844`.
2. Measure the issue instead of guessing: title/caption gaps, heading boxes, scroll height, horizontal overflow, media aspect ratios, and nearby element bounds.
3. Patch the smallest system-level selector that explains the issue.
4. Rebuild or reload the site.
5. Re-run the same measurements.
6. Repeat until the measured issue is clean.

If three patch attempts do not resolve the same visual problem, stop and re-investigate the layout structure before adding more overrides.

## Required Routes For Visual Checks

At minimum, review:

- `/`
- `/all-work`
- `/about`
- `/projects/google-maps-pegman`
- `/projects/notebook-lm-google`
- `/projects/ibm-watson`
- One writing page

For each route, confirm:

- The page scrolls when content exceeds the viewport.
- Initial load is not stretched.
- There is no horizontal overflow.
- Large headings do not collide with following copy or media.
- Project card captions do not touch titles.
- Thumbnails are cropped, not stretched.

## Commands

Run these before finishing a UI change:

```bash
npm run check
npm run build
npm run verify
```

Use `npm run visual` when comparing local output to the live site, or when a spacing change has broad visual impact.

## Copy Rules

- Keep copy concrete, senior, and useful to hiring managers.
- Do not add filler claims, generic agency language, or vague superlatives.
- No em dashes in visible copy. Use commas, colons, semicolons, periods, or parentheses.
- Use `Jules Darling` and Jules-specific contact details.

## Editing Rules

- Keep edits scoped to the requested visual or content issue.
- Use existing Astro, content HTML, and CSS patterns before inventing new abstractions.
- Use `apply_patch` for manual edits.
- Do not revert user changes or unrelated work.
