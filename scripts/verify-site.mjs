import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const DIST_ROOT = path.join(ROOT, 'dist');
const CONTENT_ROOT = path.join(ROOT, 'src', 'content');
const NOINDEX_PATHS = new Set(['/pricing', '/pricing-old-copy']);
const BASE_PATH = (process.env.PUBLIC_SITE_BASE ?? '').replace(/\/$/, '');

const blockedStrings = [
  'cdn.prod.website-files.com',
  'd3e54v103j8qbb.cloudfront.net',
  'ajax.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'webflow.js',
  'www.haggard.design',
  'https://www.haggard.design',
  'hello@haggard.design',
  'juleshaggard.com',
  'Jules Haggard',
  'Haggard & Associates',
  'Haggard &amp; Associates',
  'Haggard and Associates',
  'Jonathan Haggard',
  'G-8YHNXLP7D5',
  '246345318',
  'hs-scripts',
  'What Haggard delivered',
  "Haggard's methodology",
  'Our point of view.',
];

async function readJsonFiles(dir) {
  const names = await readdir(dir);
  return names
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), 'utf-8')));
}

async function migratedPages() {
  const collections = ['pages', 'projects', 'writing'];
  const pages = [];

  for (const collection of collections) {
    pages.push(...(await readJsonFiles(path.join(CONTENT_ROOT, collection))));
  }

  return pages;
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(filePath)));
    } else {
      files.push(filePath);
    }
  }

  return files;
}

function outputFileForRoute(routePath) {
  if (routePath === '/') {
    return path.join(DIST_ROOT, 'index.html');
  }

  return path.join(DIST_ROOT, routePath.replace(/^\//, ''), 'index.html');
}

function localFileForUrl(url) {
  const rawUrl = stripBasePath(url.split('#')[0].split('?')[0]);
  const cleanUrl = decodeUrlPath(rawUrl);

  if (cleanUrl === '/' || cleanUrl === '') {
    return outputFileForRoute('/');
  }

  if (cleanUrl.startsWith('/assets/') || cleanUrl.startsWith('/_astro/')) {
    return path.join(DIST_ROOT, cleanUrl.replace(/^\//, ''));
  }

  if (path.extname(cleanUrl)) {
    return path.join(DIST_ROOT, cleanUrl.replace(/^\//, ''));
  }

  return outputFileForRoute(cleanUrl);
}

function decodeUrlPath(url) {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

function stripBasePath(url) {
  if (!BASE_PATH) return url;
  if (url === BASE_PATH) return '/';
  if (url.startsWith(`${BASE_PATH}/`)) return url.slice(BASE_PATH.length);

  return url;
}

function isInternalUrl(href) {
  return (
    href &&
    href.startsWith('/') &&
    !href.startsWith('//') &&
    !href.startsWith('/mailto:')
  );
}

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//.test(value ?? '');
}

async function main() {
  const pages = (await migratedPages()).filter((page) => !page.hidden);
  const errors = [];
  const builtHtml = [];

  for (const page of pages) {
    const file = outputFileForRoute(page.path);

    if (!existsSync(file)) {
      errors.push(`Missing built route for ${page.path}: ${file}`);
      continue;
    }

    const html = readFileSync(file, 'utf-8');
    builtHtml.push({ page, file, html });

    for (const blocked of blockedStrings) {
      if (html.includes(blocked)) {
        errors.push(`${page.path} still contains blocked dependency string: ${blocked}`);
      }
    }

    const $ = cheerio.load(html);
    const isNoindex = NOINDEX_PATHS.has(page.path);
    const title = cleanText($('title').first().text());
    const description = $('meta[name="description"]').attr('content') ?? '';
    const robots = $('meta[name="robots"]').attr('content') ?? '';
    const canonical = $('link[rel="canonical"]').attr('href') ?? '';
    const ogImage = $('meta[property="og:image"]').attr('content') ?? '';
    const twitterImage = $('meta[name="twitter:image"]').attr('content') ?? '';

    if ($('html[lang="en"]').length !== 1) {
      errors.push(`${page.path} is missing an English html lang attribute.`);
    }

    if ($('.skip-link[href="#main-content"]').length !== 1) {
      errors.push(`${page.path} is missing a skip link to main content.`);
    }

    if ($('nav[aria-label="Primary"]').length !== 1) {
      errors.push(`${page.path} is missing a primary navigation landmark.`);
    }

    if ($('main#main-content').length !== 1) {
      errors.push(`${page.path} is missing a single main content landmark.`);
    }

    if (title.length < 10 || title.length > 75) {
      errors.push(`${page.path} has an unusual title length (${title.length}): ${title}`);
    }

    if (description.length < 45 || description.length > 170) {
      errors.push(`${page.path} has an unusual meta description length (${description.length}).`);
    }

    if (!canonical || !isAbsoluteHttpUrl(canonical)) {
      errors.push(`${page.path} is missing an absolute canonical URL.`);
    }

    if (!isAbsoluteHttpUrl(ogImage) || !isAbsoluteHttpUrl(twitterImage)) {
      errors.push(`${page.path} is missing absolute social image URLs.`);
    }

    if (isNoindex && !robots.includes('noindex')) {
      errors.push(`${page.path} should be noindexed.`);
    }

    if (!isNoindex && robots.includes('noindex')) {
      errors.push(`${page.path} should be indexable.`);
    }

    const h1Count = $('h1').length;
    if (!isNoindex && h1Count !== 1) {
      errors.push(`${page.path} should have one h1, found ${h1Count}.`);
    }

    $('img').each((_, element) => {
      if (typeof $(element).attr('alt') === 'undefined') {
        errors.push(`${page.path} has an image without alt text: ${$(element).attr('src')}`);
      }
    });

    $('a[target="_blank"]').each((_, element) => {
      const rel = $(element).attr('rel') ?? '';
      if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
        errors.push(`${page.path} has an external link without safe rel attributes: ${$(element).attr('href')}`);
      }
    });

    $('[href], [src], source[src], img[srcset]').each((_, element) => {
      const href = $(element).attr('href');
      const src = $(element).attr('src');
      const srcset = $(element).attr('srcset');
      const urls = [];

      if (isInternalUrl(href)) urls.push(href);
      if (isInternalUrl(src)) urls.push(src);
      if (srcset) {
        for (const candidate of srcset.split(',')) {
          const match = candidate.trim().match(/^(.*?)(?:\s+\d+(?:\.\d+)?[wx])?$/);
          const url = match?.[1]?.trim();
          if (isInternalUrl(url)) urls.push(url);
        }
      }

      for (const url of urls) {
        if (!existsSync(localFileForUrl(url))) {
          errors.push(`${page.path} references missing local URL: ${url}`);
        }
      }
    });
  }

  for (const endpoint of ['favicon.ico', 'robots.txt', 'sitemap.xml']) {
    const file = path.join(DIST_ROOT, endpoint);
    if (!existsSync(file)) {
      errors.push(`Missing built ${endpoint}.`);
    }
  }

  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
  for (const file of await walkFiles(DIST_ROOT)) {
    if (!textExtensions.has(path.extname(file))) continue;
    const content = readFileSync(file, 'utf-8');

    for (const blocked of blockedStrings) {
      if (content.includes(blocked)) {
        errors.push(`${path.relative(ROOT, file)} still contains blocked dependency string: ${blocked}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Verification failed with ${errors.length} issue(s):`);
    for (const error of errors.slice(0, 50)) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${pages.length} routes, local links, SEO metadata, accessibility basics, and blocked dependency strings.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
