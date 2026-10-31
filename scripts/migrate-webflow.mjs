import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const SITE_ORIGIN = 'https://darlingjules.com';
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const EXTRA_ROUTES = ['/projects/beats-by-dre'];
const ASSET_HOSTS = [
  'https://cdn.prod.website-files.com/',
  'https://d3e54v103j8qbb.cloudfront.net/',
];

const CONTENT_ROOT = path.join(ROOT, 'src', 'content');
const HTML_ROOT = path.join(ROOT, 'src', 'content-html');
const ASSET_ROOT = path.join(ROOT, 'public', 'assets', 'site');
const LEGACY_CSS_PATH = path.join(ROOT, 'src', 'styles', 'legacy.css');

const migratedAt = new Date().toISOString();
const assetMap = new Map();
const aliasCopies = [];

const fetchHeaders = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 DarlingStaticMigration/1.0',
};

function isAssetUrl(value) {
  return ASSET_HOSTS.some((host) => value.startsWith(host));
}

function sha(value, length = 10) {
  return createHash('sha1').update(value).digest('hex').slice(0, length);
}

function sanitizeFilePart(value, fallback = 'asset') {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

  return cleaned || fallback;
}

function decodedPathname(url) {
  const parsed = new URL(url);
  try {
    return decodeURIComponent(parsed.pathname.replace(/%2F/gi, '/'));
  } catch {
    return parsed.pathname.replace(/%2F/gi, '/');
  }
}

function localAssetPath(rawUrl) {
  const url = rawUrl.trim().replace(/&amp;/g, '&');

  if (!isAssetUrl(url)) {
    return rawUrl;
  }

  if (assetMap.has(url)) {
    return assetMap.get(url).publicPath;
  }

  const pathname = decodedPathname(url);
  const basename = path.posix.basename(pathname) || 'asset';
  const ext = sanitizeFilePart(path.posix.extname(basename).toLowerCase().slice(0, 16), '');
  const stem = sanitizeFilePart(path.posix.basename(basename, path.posix.extname(basename)));
  const fileName = `${sha(url)}-${stem}${ext || '.bin'}`;
  const publicPath = `/assets/site/${fileName}`;
  const filePath = path.join(ASSET_ROOT, fileName);

  assetMap.set(url, { publicPath, filePath, sourceUrl: url });
  return publicPath;
}

function parseSrcsetCandidate(candidate) {
  const trimmed = candidate.trim();
  const match = trimmed.match(/^(.*)\s+(\d+(?:\.\d+)?[wx])$/);

  if (!match) {
    return { url: trimmed, descriptor: '' };
  }

  return {
    url: match[1].trim(),
    descriptor: ` ${match[2]}`,
  };
}

function rewriteSrcset(value) {
  return value
    .split(',')
    .map((candidate) => {
      const { url, descriptor } = parseSrcsetCandidate(candidate);
      return `${localAssetPath(url)}${descriptor}`;
    })
    .join(', ');
}

function rewriteUrlList(value) {
  return value
    .split(',')
    .map((url) => localAssetPath(url))
    .join(',');
}

function rewriteStyleUrls(value) {
  return value.replace(/url\((["']?)(.*?)\1\)/g, (_match, quote, url) => {
    const local = localAssetPath(url);
    return `url(${quote}${local}${quote})`;
  });
}

function rewriteCssUrls(css) {
  return css.replace(/url\((["']?)(.*?)\1\)/g, (match, quote, url) => {
    if (!isAssetUrl(url)) {
      return match;
    }

    const local = localAssetPath(url);
    return `url(${quote}${local}${quote})`;
  });
}

function pageLocation(sourceUrl) {
  const pathname = new URL(sourceUrl).pathname || '/';

  if (pathname === '/') {
    return {
      collection: 'pages',
      id: 'home',
      path: '/',
      htmlFile: 'pages/home.html',
    };
  }

  if (pathname.startsWith('/projects/')) {
    const id = sanitizeFilePart(pathname.replace('/projects/', ''));
    return {
      collection: 'projects',
      id,
      path: pathname,
      htmlFile: `projects/${id}.html`,
    };
  }

  if (pathname.startsWith('/writing/')) {
    const id = sanitizeFilePart(pathname.replace('/writing/', ''));
    return {
      collection: 'writing',
      id,
      path: pathname,
      htmlFile: `writing/${id}.html`,
    };
  }

  const id = sanitizeFilePart(pathname.replace(/^\//, '').replace(/\//g, '-'));
  return {
    collection: 'pages',
    id,
    path: pathname,
    htmlFile: `pages/${id}.html`,
  };
}

async function fetchText(url, { allowHttpError = false } = {}) {
  const response = await fetch(url, { headers: fetchHeaders });

  if (!response.ok && !allowHttpError) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchBinary(url) {
  const response = await fetch(url, { headers: fetchHeaders });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function downloadWithRetry(asset, attempt = 1) {
  try {
    await stat(asset.filePath);
    return { ok: true, skipped: true, sourceUrl: asset.sourceUrl };
  } catch {
    // Continue to download.
  }

  try {
    const body = await fetchBinary(asset.sourceUrl);
    await writeFile(asset.filePath, body);
    return { ok: true, skipped: false, sourceUrl: asset.sourceUrl };
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return downloadWithRetry(asset, attempt + 1);
    }

    return { ok: false, sourceUrl: asset.sourceUrl, error };
  }
}

async function runPool(items, limit, worker) {
  const results = [];
  let nextIndex = 0;

  async function runOne() {
    while (nextIndex < items.length) {
      const current = items[nextIndex];
      nextIndex += 1;
      results.push(await worker(current));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runOne));
  return results;
}

function extractSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]).sort((a, b) => {
    if (a === SITE_ORIGIN) return -1;
    if (b === SITE_ORIGIN) return 1;
    return a.localeCompare(b);
  });
}

function cleanHtml($) {
  $('script, noscript').remove();
  $('.nav').remove();

  $('[data-w-id], [data-wf-ignore]').each((_, element) => {
    $(element).removeAttr('data-w-id');
    $(element).removeAttr('data-wf-ignore');
  });
}

function rewriteElementAssets($) {
  $('body *').each((_, element) => {
    const attributes = element.attribs ?? {};

    for (const [name, value] of Object.entries(attributes)) {
      if (!value) continue;

      if (['src', 'href', 'poster', 'data-poster-url'].includes(name)) {
        if (isAssetUrl(value.trim())) {
          $(element).attr(name, localAssetPath(value));
        }
      } else if (name === 'srcset') {
        $(element).attr(name, rewriteSrcset(value));
      } else if (name === 'data-video-urls') {
        $(element).attr(name, rewriteUrlList(value));
      } else if (name === 'style' && value.includes('url(')) {
        $(element).attr(name, rewriteStyleUrls(value));
      }
    }
  });
}

function pageMetadata($) {
  const title = $('title').first().text().trim() || 'Jules Darling';
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    undefined;
  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    undefined;
  const favicon = $('link[rel="shortcut icon"], link[rel="icon"]').first().attr('href');
  const appleTouchIcon = $('link[rel="apple-touch-icon"]').first().attr('href');

  return {
    title,
    description,
    ogImage: image && isAssetUrl(image) ? localAssetPath(image) : image,
    favicon: favicon && isAssetUrl(favicon) ? localAssetPath(favicon) : favicon,
    appleTouchIcon: appleTouchIcon && isAssetUrl(appleTouchIcon) ? localAssetPath(appleTouchIcon) : appleTouchIcon,
  };
}

async function processPage(sourceUrl) {
  const html = await fetchText(sourceUrl, { allowHttpError: true });
  const $ = cheerio.load(html, { decodeEntities: false });
  const location = pageLocation(sourceUrl);
  const metadata = pageMetadata($);
  const bodyClass = $('body').attr('class') || '';

  cleanHtml($);
  rewriteElementAssets($);

  const bodyHtml = $('body').html()?.trim() ?? '';
  const htmlFilePath = path.join(HTML_ROOT, location.htmlFile);
  const contentFilePath = path.join(CONTENT_ROOT, location.collection, `${location.id}.json`);

  await mkdir(path.dirname(htmlFilePath), { recursive: true });
  await mkdir(path.dirname(contentFilePath), { recursive: true });

  await writeFile(htmlFilePath, `${bodyHtml}\n`);
  await writeFile(
    contentFilePath,
    `${JSON.stringify(
      {
        path: location.path,
        sourceUrl,
        title: metadata.title,
        description: metadata.description,
        bodyClass,
        ogImage: metadata.ogImage,
        htmlFile: location.htmlFile,
        lastMigrated: migratedAt,
      },
      null,
      2,
    )}\n`,
  );

  if (sourceUrl === SITE_ORIGIN) {
    if (metadata.favicon?.startsWith('/assets/site/')) {
      aliasCopies.push({ from: metadata.favicon, to: 'favicon.png' });
    }

    if (metadata.appleTouchIcon?.startsWith('/assets/site/')) {
      aliasCopies.push({ from: metadata.appleTouchIcon, to: 'apple-touch-icon.png' });
    }

    if (metadata.ogImage?.startsWith('/assets/site/')) {
      aliasCopies.push({ from: metadata.ogImage, to: 'og-image.png' });
    }
  }

  return location.path;
}

async function writeLegacyCss(firstPageHtml) {
  const $ = cheerio.load(firstPageHtml, { decodeEntities: false });
  const cssUrl = $('link[rel="stylesheet"][href*="/css/"]').first().attr('href');

  if (!cssUrl) {
    throw new Error('Could not find the live stylesheet URL.');
  }

  const css = await fetchText(cssUrl);
  const rewrittenCss = rewriteCssUrls(css)
    .replace(/\/\*[^*]*Last Published:[\s\S]*?\*\//g, '')
    .replace(/webflow/gi, 'legacy');

  await writeFile(LEGACY_CSS_PATH, `/* Generated legacy stylesheet on ${migratedAt}. */\n${rewrittenCss}\n`);
}

async function prepareOutputDirs() {
  await rm(path.join(CONTENT_ROOT, 'pages'), { recursive: true, force: true });
  await rm(path.join(CONTENT_ROOT, 'projects'), { recursive: true, force: true });
  await rm(path.join(CONTENT_ROOT, 'writing'), { recursive: true, force: true });
  await rm(HTML_ROOT, { recursive: true, force: true });

  await mkdir(path.join(CONTENT_ROOT, 'pages'), { recursive: true });
  await mkdir(path.join(CONTENT_ROOT, 'projects'), { recursive: true });
  await mkdir(path.join(CONTENT_ROOT, 'writing'), { recursive: true });
  await mkdir(path.join(HTML_ROOT, 'pages'), { recursive: true });
  await mkdir(path.join(HTML_ROOT, 'projects'), { recursive: true });
  await mkdir(path.join(HTML_ROOT, 'writing'), { recursive: true });
  await mkdir(ASSET_ROOT, { recursive: true });
}

async function createAliases() {
  for (const alias of aliasCopies) {
    const sourceFile = path.join(ROOT, 'public', alias.from);
    const targetFile = path.join(ASSET_ROOT, alias.to);

    try {
      await copyFile(sourceFile, targetFile);
    } catch {
      // Alias icons are convenience paths; page metadata still points at the hashed assets.
    }
  }
}

async function main() {
  console.log('Preparing migration directories...');
  await prepareOutputDirs();

  console.log('Reading sitemap...');
  const sitemap = await fetchText(SITEMAP_URL);
  const urls = Array.from(
    new Set([...extractSitemapUrls(sitemap), ...EXTRA_ROUTES.map((route) => new URL(route, SITE_ORIGIN).toString())]),
  );
  const firstPageHtml = await fetchText(SITE_ORIGIN);

  console.log(`Found ${urls.length} public URLs.`);
  console.log('Migrating stylesheet...');
  await writeLegacyCss(firstPageHtml);

  console.log('Capturing pages and rewriting asset references...');
  const migratedPaths = [];
  for (const url of urls) {
    migratedPaths.push(await processPage(url));
  }

  const assets = Array.from(assetMap.values());
  console.log(`Downloading ${assets.length} local assets...`);
  const results = await runPool(assets, 10, downloadWithRetry);
  const failures = results.filter((result) => !result.ok);

  await createAliases();

  await writeFile(
    path.join(ASSET_ROOT, '_migration-manifest.json'),
    `${JSON.stringify(
      {
        migratedAt,
        source: SITE_ORIGIN,
        pages: migratedPaths,
        assetCount: assets.length,
        failedAssets: failures.map((failure) => ({
          sourceUrl: failure.sourceUrl,
          error: String(failure.error),
        })),
      },
      null,
      2,
    )}\n`,
  );

  if (failures.length > 0) {
    console.warn(`Migration completed with ${failures.length} asset download failures.`);
    for (const failure of failures.slice(0, 10)) {
      console.warn(`- ${failure.sourceUrl}: ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Migration complete: ${migratedPaths.length} pages, ${assets.length} assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
