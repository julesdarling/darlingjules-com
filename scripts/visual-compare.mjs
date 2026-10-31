import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCAL_ORIGIN = process.env.LOCAL_ORIGIN ?? 'http://127.0.0.1:4321';
const LIVE_ORIGIN = process.env.LIVE_ORIGIN ?? 'https://darlingjules.com';
const OUT_DIR = path.join(ROOT, 'artifacts', 'visual');

const routes = [
  '/',
  '/pricing',
  '/about',
  '/all-work',
  '/projects/lightcone',
  '/projects/moveworks',
  '/writing/superliminal-design',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

function routeName(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replaceAll('/', '__');
}

async function stabilize(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });

  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const video of document.querySelectorAll('video')) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        // Some remote media may reject seeking before metadata is available.
      }
    }
  });

  await page.waitForTimeout(800);
}

function comparePngs(localBuffer, liveBuffer) {
  const local = PNG.sync.read(localBuffer);
  const live = PNG.sync.read(liveBuffer);
  const width = Math.min(local.width, live.width);
  const height = Math.min(local.height, live.height);
  const localCrop = new PNG({ width, height });
  const liveCrop = new PNG({ width, height });
  PNG.bitblt(local, localCrop, 0, 0, width, height, 0, 0);
  PNG.bitblt(live, liveCrop, 0, 0, width, height, 0, 0);

  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(localCrop.data, liveCrop.data, diff.data, width, height, {
    threshold: 0.18,
    includeAA: false,
  });

  return {
    mismatch,
    ratio: mismatch / (width * height),
    diffBuffer: PNG.sync.write(diff),
  };
}

async function screenshot(page, origin, route, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(new URL(route, origin).toString(), { waitUntil: 'networkidle', timeout: 45000 });
  await stabilize(page);
  return page.screenshot({ fullPage: false, type: 'png' });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  });

  const report = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const livePage = await context.newPage();
      const localPage = await context.newPage();

      for (const route of routes) {
        const base = `${routeName(route)}.${viewport.name}`;
        const live = await screenshot(livePage, LIVE_ORIGIN, route, viewport);
        const local = await screenshot(localPage, LOCAL_ORIGIN, route, viewport);
        const { ratio, diffBuffer } = comparePngs(local, live);

        const livePath = path.join(OUT_DIR, `${base}.live.png`);
        const localPath = path.join(OUT_DIR, `${base}.local.png`);
        const diffPath = path.join(OUT_DIR, `${base}.diff.png`);

        await writeFile(livePath, live);
        await writeFile(localPath, local);
        await writeFile(diffPath, diffBuffer);

        report.push({
          route,
          viewport: viewport.name,
          mismatchRatio: Number(ratio.toFixed(4)),
          local: path.relative(ROOT, localPath),
          live: path.relative(ROOT, livePath),
          diff: path.relative(ROOT, diffPath),
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(OUT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  for (const item of report) {
    console.log(
      `${item.viewport.padEnd(7)} ${item.route.padEnd(38)} mismatch ${(item.mismatchRatio * 100).toFixed(2)}%`,
    );
  }

  const highMismatch = report.filter((item) => item.mismatchRatio > 0.45);
  if (highMismatch.length > 0) {
    console.warn(`High visual mismatch on ${highMismatch.length} screenshot(s); see artifacts/visual/report.json.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
