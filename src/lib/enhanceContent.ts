import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { AnyNode, Element, Text } from 'domhandler';
import { projectDeliverables } from '../data/projectDeliverables';
import { withBasePath } from './paths';
import { noindexPaths, siteName } from './seo';

interface EnhanceContentOptions {
  title: string;
  currentPath: string;
}

const decorativeClasses = [
  'capricorn',
  'caterpillar',
  'cow',
  'image-15',
  'peacock',
  'whale',
];

const associateFaces = Array.from({ length: 9 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');

  return {
    index: index + 1,
    src: `/assets/associates/associate-${number}.jpg`,
  };
});

const homepageFeaturedProjects = [
  { href: '/projects/notebook-lm-google', title: 'NotebookLM' },
  { href: '/projects/ibm-watson', title: 'IBM Watson' },
  { href: '/projects/beats-by-dre', title: 'Beats by Dre' },
  { href: '/projects/bizzabo', title: 'Bizzabo' },
  { href: '/projects/chase-travel', title: 'Chase Travel' },
  { href: '/projects/fender', title: 'Fender' },
];

const homepageLeadProject = { href: '/projects/google-maps-pegman', title: 'Google Maps Pegman' };

const knownProjectCardHrefs = new Map([['Prometheus Group', '/projects/prometheus-group']]);
const hiddenProjectHrefs = new Set(['/projects/apple']);

let allWorkDocument: CheerioAPI | null = null;

const attentionEyesSvg = `
<svg class="attention-eyes" width="136" height="96" viewBox="0 0 136 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="attention-eye-clip-right" clipPathUnits="userSpaceOnUse">
      <path d="M103.403 0.239258C112.068 0.239258 119.943 5.5467 125.662 14.1904C131.381 22.8324 134.925 34.7854 134.925 48C134.925 61.2146 131.381 73.1676 125.662 81.8096C119.943 90.4533 112.068 95.7607 103.403 95.7607C94.7377 95.7606 86.8632 90.4531 81.1437 81.8096C75.4254 73.1676 71.881 61.2146 71.881 48C71.881 34.7854 75.4254 22.8324 81.1437 14.1904C86.8632 5.54687 94.7377 0.239442 103.403 0.239258Z"/>
    </clipPath>
    <clipPath id="attention-eye-clip-left" clipPathUnits="userSpaceOnUse">
      <path d="M31.7607 0.239258C40.4258 0.239258 48.301 5.5467 54.0205 14.1904C59.7388 22.8324 63.2832 34.7854 63.2832 48C63.2832 61.2146 59.7388 73.1676 54.0205 81.8096C48.301 90.4533 40.4258 95.7607 31.7607 95.7607C23.0959 95.7606 15.2214 90.4531 9.50195 81.8096C3.78361 73.1676 0.239258 61.2146 0.239258 48C0.239258 34.7854 3.78361 22.8324 9.50195 14.1904C15.2214 5.54687 23.0959 0.239442 31.7607 0.239258Z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#attention-eye-clip-right)">
    <ellipse class="attention-pupil attention-pupil--right" cx="126.09" cy="47.7612" rx="25.791" ry="34.8657" fill="#11100F"/>
  </g>
  <g clip-path="url(#attention-eye-clip-left)">
    <ellipse class="attention-pupil attention-pupil--left" cx="54.4478" cy="47.7612" rx="25.791" ry="34.8657" fill="#11100F"/>
  </g>
  <path d="M31.7607 1C40.0894 1 47.7557 6.10197 53.3857 14.6104C59.0107 23.1112 62.5225 34.9136 62.5225 48C62.5225 61.0864 59.0107 72.8888 53.3857 81.3896C47.7557 89.898 40.0894 95 31.7607 95C23.4323 94.9998 15.7666 89.8979 10.1367 81.3896C4.51178 72.8888 1 61.0864 1 48C1 34.9136 4.51178 23.1112 10.1367 14.6104C15.7666 6.10215 23.4323 1.00018 31.7607 1Z" stroke="#D0D0D0" stroke-width="2"/>
  <path d="M103.403 1C111.731 1 119.398 6.10197 125.028 14.6104C130.652 23.1112 134.164 34.9136 134.164 48C134.164 61.0864 130.652 72.8888 125.028 81.3896C119.398 89.898 111.731 95 103.403 95C95.0741 94.9998 87.4084 89.8979 81.7785 81.3896C76.1536 72.8888 72.6418 61.0864 72.6418 48C72.6418 34.9136 76.1536 23.1112 81.7785 14.6104C87.4084 6.10215 95.0741 1.00018 103.403 1Z" stroke="#D0D0D0" stroke-width="2"/>
</svg>`;

const bookingCtaIconSvg = `
<svg class="cta-calendar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="3" y="4" width="18" height="18" rx="2"></rect>
  <path d="M8 2v4"></path>
  <path d="M16 2v4"></path>
  <path d="M3 10h18"></path>
  <path d="M12 13.5v5.5"></path>
  <path d="M9.25 16.25h5.5"></path>
</svg>`;

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\u200d/g, '').trim();
}

function getAllWorkDocument() {
  if (!allWorkDocument) {
    const source = readFileSync(join(process.cwd(), 'src/content-html/pages/all-work.html'), 'utf8');
    allWorkDocument = cheerio.load(source, {}, false);
    fixKnownProjectCardHrefs(allWorkDocument);
  }

  return allWorkDocument;
}

function isDecorative($: CheerioAPI, element: Element) {
  const className = $(element).attr('class') ?? '';
  return decorativeClasses.some((name) => className.split(/\s+/).includes(name));
}

function renameElement(element: Element, tagName: string) {
  element.tagName = tagName;
  element.name = tagName;
}

function closestProjectTitle($: CheerioAPI, element: Element) {
  const card = $(element).closest('a.projectblocklink, a.smallproject, a.writingblocks');
  if (card.length === 0) return '';

  return cleanText(card.find('.projecttitle, .projecttitleworkpage, .text-block, h1, h2, h3').first().text());
}

function writingContext($: CheerioAPI, element: Element, fallbackTitle: string) {
  const previousHeading = cleanText($(element).prevAll('.posttext').first().find('h1, h2, h3').last().text());
  return previousHeading || fallbackTitle;
}

function altForImage($: CheerioAPI, element: Element, options: EnhanceContentOptions, index: number) {
  if (isDecorative($, element)) return '';

  const cardTitle = closestProjectTitle($, element);
  if (cardTitle) return `${cardTitle} project preview`;

  const className = $(element).attr('class') ?? '';
  if (className.includes('postimg')) {
    return `${writingContext($, element, options.title)} visual example`;
  }

  if (className.includes('projectimg')) {
    return `${options.title} case study visual ${index}`;
  }

  if (className.includes('clientlogo')) return 'Client logo';
  if (className.includes('image-8')) return 'Jules Darling portrait';
  if (className.includes('image-18')) return 'Jules Darling collaborator portrait collage';

  return `${options.title} visual`;
}

function enhanceImages($: CheerioAPI, options: EnhanceContentOptions) {
  let contentImageIndex = 0;

  $('img').each((_, element) => {
    const image = $(element);
    const existingAlt = image.attr('alt');

    if (isDecorative($, element)) {
      image.attr('alt', '');
      image.attr('aria-hidden', 'true');
    } else if (!existingAlt || cleanText(existingAlt).length === 0) {
      contentImageIndex += 1;
      image.attr('alt', altForImage($, element, options, contentImageIndex));
    }

    image.attr('decoding', 'async');

    if (!image.attr('loading')) {
      image.attr('loading', contentImageIndex <= 1 ? 'eager' : 'lazy');
    }

    if (contentImageIndex === 1 && image.attr('loading') === 'eager') {
      image.attr('fetchpriority', 'high');
    }
  });
}

function enhanceVideos($: CheerioAPI) {
  $('.w-background-video').each((_, element) => {
    const wrapper = $(element);
    wrapper.attr('aria-hidden', 'true');

    const poster = wrapper.attr('data-poster-url');
    wrapper.removeAttr('data-poster-url data-video-urls data-autoplay data-loop');

    wrapper.find('video').each((__, videoElement) => {
      const video = $(videoElement);
      video.attr('muted', '');
      video.attr('playsinline', '');
      video.attr('preload', 'metadata');
      video.attr('tabindex', '-1');
      video.attr('aria-hidden', 'true');
      video.attr('disablepictureinpicture', '');
      video.removeAttr('data-object-fit');

      if (poster) video.attr('poster', poster);

      const inlineStyle = video.attr('style');
      if (inlineStyle?.includes('background-image')) video.removeAttr('style');
    });
  });
}

function enhanceLinks($: CheerioAPI) {
  $('a').each((_, element) => {
    const link = $(element);
    const href = link.attr('href') ?? '';
    const text = cleanText(link.text());

    if (link.attr('target') === '_blank') {
      const rel = new Set((link.attr('rel') ?? '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.attr('rel', Array.from(rel).join(' '));
    }

    if (href.startsWith('mailto:') && !link.attr('aria-label')) {
      link.attr('aria-label', `Email ${siteName}`);
    }

    if (text.length === 0 && !link.attr('aria-label')) {
      const cardTitle = closestProjectTitle($, element);
      if (cardTitle) link.attr('aria-label', `View ${cardTitle}`);
    }
  });
}

function decorateBookingCtas($: CheerioAPI) {
  $('a.ctalink').each((_, element) => {
    const link = $(element);
    const text = cleanText(link.text()).toLowerCase();
    const isBookingCta = text === 'book a 15 min call' || text === 'book a 15 minute call';

    if (!isBookingCta || link.find('.cta-calendar-icon').length > 0) return;

    link.prepend(bookingCtaIconSvg);
  });
}

function rewriteSrcset(srcset: string) {
  return srcset
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      const [url, ...descriptor] = trimmed.split(/\s+/);
      const rewrittenUrl = withBasePath(url);

      return [rewrittenUrl, ...descriptor].join(' ');
    })
    .join(', ');
}

function rewriteStyleUrls(style: string) {
  return style.replace(/url\((['"]?)(\/(?!\/)[^'")]+)\1\)/g, (_, quote: string, url: string) => {
    return `url(${quote}${withBasePath(url)}${quote})`;
  });
}

function rewriteRootRelativeUrls($: CheerioAPI) {
  const urlAttributes = ['href', 'src', 'poster', 'data-poster-url'];

  $('*').each((_, element) => {
    const node = $(element);

    urlAttributes.forEach((attribute) => {
      const value = node.attr(attribute);
      if (value) node.attr(attribute, withBasePath(value));
    });

    const srcset = node.attr('srcset');
    if (srcset) node.attr('srcset', rewriteSrcset(srcset));

    const style = node.attr('style');
    if (style) node.attr('style', rewriteStyleUrls(style));
  });
}

function enhanceHeadings($: CheerioAPI) {
  $('a.projectblocklink h1.projecttitle, a.smallproject h1.projecttitle, a.projectblocklink h1.projecttitleworkpage, a.smallproject h1.projecttitleworkpage').each(
    (_, element) => {
      renameElement(element, 'h2');
    },
  );

  const headings = $('h1')
    .toArray()
    .filter((element) => cleanText($(element).text()).length > 0);

  headings.slice(1).forEach((element) => {
    renameElement(element, 'h2');
  });
}

function isBreakNode(node?: AnyNode): node is Element {
  return node?.type === 'tag' && node.name === 'br';
}

function isBlankTextNode(node?: AnyNode): node is Text {
  return node?.type === 'text' && cleanText(node.data).length === 0;
}

function trimBodyCopySegment(segment: AnyNode[]) {
  const trimmed = [...segment];

  while (trimmed.length > 0 && (isBreakNode(trimmed[0]) || isBlankTextNode(trimmed[0]))) {
    trimmed.shift();
  }

  while (
    trimmed.length > 0 &&
    (isBreakNode(trimmed[trimmed.length - 1]) || isBlankTextNode(trimmed[trimmed.length - 1]))
  ) {
    trimmed.pop();
  }

  return trimmed;
}

function hasReadableBodyCopy(segment: AnyNode[]) {
  return segment.some((node) => !isBreakNode(node) && !isBlankTextNode(node));
}

function normalizeBodyCopyParagraphs($: CheerioAPI) {
  const bodyCopySelector = [
    'p.paragraph-3:not(.serviceslist)',
    'p.paragraph-4',
    'p.paragraph-5',
    '.posttext p',
  ].join(', ');

  $(bodyCopySelector).each((_, element) => {
    const paragraph = $(element);
    const contents = paragraph.contents().toArray();
    const segments: typeof contents[] = [];
    let current: typeof contents = [];

    contents.forEach((node, index) => {
      if (isBreakNode(node)) {
        let nextIndex = index + 1;

        while (nextIndex < contents.length && isBlankTextNode(contents[nextIndex])) {
          nextIndex += 1;
        }

        if (isBreakNode(contents[nextIndex])) {
          const trimmed = trimBodyCopySegment(current);
          if (hasReadableBodyCopy(trimmed)) segments.push(trimmed);
          current = [];
          return;
        }
      }

      current.push(node);
    });

    const lastSegment = trimBodyCopySegment(current);
    if (hasReadableBodyCopy(lastSegment)) segments.push(lastSegment);
    if (segments.length < 2) return;

    const replacements = $('<div></div>');
    const attributes = paragraph.attr() ?? {};

    segments.forEach((segment) => {
      const replacement = $('<p></p>').attr(attributes);
      segment.forEach((node) => replacement.append(node));
      replacements.append(replacement);
    });

    paragraph.replaceWith(replacements.contents());
  });
}

function stripEmptyNoise($: CheerioAPI) {
  $('[aria-current="page"]').each((_, element) => {
    if ($(element).attr('href')?.startsWith('mailto:')) {
      $(element).removeAttr('aria-current');
    }
  });

  $('br').each((_, element) => {
    const next = element.next;
    if (next?.type === 'tag' && next.name === 'br') {
      $(next).remove();
    }
  });
}

function formatServiceItem(value: string) {
  return cleanText(value).replace(/^(?:⚑|•|-)+\s*/, '').trim();
}

function serviceItemsFromParagraph($: CheerioAPI, element: Element, title: string) {
  const items: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const item = formatServiceItem(current);
    current = '';

    if (item.length > 0 && item.toLowerCase() !== title.toLowerCase()) {
      items.push(item);
    }
  };

  $(element)
    .contents()
    .each((_, node) => {
      if (node.type === 'tag' && node.name === 'br') {
        pushCurrent();
        return;
      }

      if (node.type === 'tag' && $(node).hasClass('boldtextpara')) {
        return;
      }

      if (node.type === 'text') {
        current += node.data;
        return;
      }

      current += $(node).text();
    });

  pushCurrent();

  return items;
}

function formatServicePills($: CheerioAPI) {
  $('p.serviceslist').each((_, element) => {
    const paragraph = $(element);
    const sourceText = paragraph.text();

    if (!sourceText.includes('⚑')) return;

    const title = cleanText(paragraph.find('.boldtextpara').first().text());
    if (!title) return;

    const items = serviceItemsFromParagraph($, element, title);
    if (items.length === 0) return;

    const serviceId = `service-pill-${title.toLowerCase()}`;
    const group = $('<section></section>').addClass('service-pill-group').attr('aria-labelledby', serviceId);

    group.append($('<h3></h3>').addClass('service-pill-group__title').attr('id', serviceId).text(title));

    const list = $('<ul></ul>').addClass('service-pill-list');
    items.forEach((item) => {
      list.append($('<li></li>').append($('<span></span>').addClass('service-pill').text(item)));
    });
    group.append(list);

    paragraph.closest('.div-block-27').addClass('services-pill-grid');
    paragraph.closest('.div-block-11').addClass('service-pill-column');
    paragraph.replaceWith(group);
  });
}

function replaceAssociateCollage($: CheerioAPI) {
  $('#aboutmesection .image-18').each((_, element) => {
    const cloud = $('<div></div>')
      .addClass('associate-portrait-cloud')
      .attr('aria-label', 'Jules Darling collaborator portraits')
      .attr('role', 'img');

    associateFaces.forEach((face) => {
      const item = $('<span></span>')
        .addClass(`associate-face associate-face--${face.index}`)
        .attr('data-associate-index', String(face.index));

      item.append(
        $('<img>')
          .attr('src', face.src)
          .attr('alt', '')
          .attr('aria-hidden', 'true')
          .attr('loading', 'lazy')
          .attr('decoding', 'async'),
      );

      cloud.append(item);
    });

    $(element).replaceWith(cloud);
  });
}

function projectCardTitle($: CheerioAPI, element: Element) {
  return cleanText($(element).find('.projecttitle, .projecttitleworkpage').first().text());
}

function fixKnownProjectCardHrefs($: CheerioAPI) {
  $('a.projectblocklink').each((_, element) => {
    const fixedHref = knownProjectCardHrefs.get(projectCardTitle($, element));
    if (fixedHref) $(element).attr('href', fixedHref);
  });
}

function removeHiddenProjectCards($: CheerioAPI) {
  hiddenProjectHrefs.forEach((href) => {
    $(`a.projectblocklink[href="${href}"], a.smallproject[href="${href}"]`).remove();
  });
}

function allWorkProjectCardHtml(href: string, title: string) {
  const allWork = getAllWorkDocument();
  let card = allWork(`a.projectblocklink[href="${href}"]`).first();

  if (card.length === 0) {
    card = allWork('a.projectblocklink')
      .filter((_, element) => projectCardTitle(allWork, element) === title)
      .first();
  }

  if (card.length === 0) return '';

  card.attr('href', href);
  card.removeClass('xl').addClass('quarter');

  return allWork.html(card) ?? '';
}

function placeHomepageSmallProjects($: CheerioAPI, options: EnhanceContentOptions) {
  if (options.currentPath !== '/') return;
  if ($('.homecontainer.personal-home-compact').length > 0) return;

  const projectGrid = $('.homecontainer > .homepageprojects').first();
  const marketAttention = $('.aboutintro.hp.herohp.lowerdown').not('.testimonials').first();
  const testimonials = $('.aboutintro.hp.herohp.lowerdown.testimonials').first();
  const allowedHrefs = new Set([homepageLeadProject.href, ...homepageFeaturedProjects.map((project) => project.href)]);

  if (marketAttention.length > 0 && marketAttention.find('.attention-eyes').length === 0) {
    marketAttention.prepend(attentionEyesSvg);
  }

  if (projectGrid.length === 0) return;

  projectGrid.children('a.projectblocklink[href^="/projects/"]').each((_, element) => {
    const card = $(element);
    if (!allowedHrefs.has(card.attr('href') ?? '')) card.remove();
  });

  homepageFeaturedProjects.forEach((project) => {
    if (projectGrid.children(`a.projectblocklink[href="${project.href}"]`).length > 0) return;

    const cardHtml = allWorkProjectCardHtml(project.href, project.title);
    if (cardHtml) projectGrid.append(cardHtml);
  });

  const leadCard = projectGrid.children(`a.projectblocklink[href="${homepageLeadProject.href}"]`).first();
  if (leadCard.length > 0) {
    leadCard.removeClass('quarter').addClass('xl');
    const leadHtml = $.html(leadCard);
    leadCard.remove();
    projectGrid.prepend(leadHtml);
  }

  const smallCardHtml = (project: (typeof homepageFeaturedProjects)[number]) => {
    const card = projectGrid.children(`a.projectblocklink[href="${project.href}"]`).first();
    if (card.length === 0) return '';

    card.removeClass('xl').addClass('quarter');
    const html = $.html(card);
    card.remove();

    return html;
  };

  const firstRowHtml = homepageFeaturedProjects.slice(0, 3).map(smallCardHtml).join('');
  const secondRowHtml = homepageFeaturedProjects.slice(3).map(smallCardHtml).join('');

  if (marketAttention.length > 0) {
    marketAttention.after(firstRowHtml);
  } else if (firstRowHtml) {
    projectGrid.append(firstRowHtml);
  }

  if (testimonials.length > 0) {
    testimonials.before(secondRowHtml);
  } else if (secondRowHtml) {
    projectGrid.append(secondRowHtml);
  }
}

function formatHomepageMarketAttentionCopy($: CheerioAPI, options: EnhanceContentOptions) {
  if (options.currentPath !== '/') return;

  const marketAttention = $('.aboutintro.hp.herohp.lowerdown').not('.testimonials').first();
  const target = marketAttention
    .find('p.brand-attention-copy')
    .filter((_, element) => cleanText($(element).text()).startsWith('That is usually where Jules helps:'))
    .first();

  if (target.length === 0) return;

  const wrapper = $('<div></div>').addClass('brand-attention-points');
  wrapper.append(
    $('<p></p>')
      .addClass('splitpara jhppara brand-attention-copy brand-attention-lede')
      .text('That is where Jules helps.'),
  );

  const list = $('<ul></ul>').addClass('brand-attention-list');
  [
    'Turning scattered value into a clear position.',
    'A sharper identity.',
    'An AI-ready brand system the whole company can easily use without watering it down.',
  ].forEach((item) => {
    list.append($('<li></li>').text(item));
  });

  wrapper.append(list);
  target.replaceWith(wrapper);
}

function markAboutHero($: CheerioAPI, options: EnhanceContentOptions) {
  if (options.currentPath !== '/about') return;

  $('.homecontainer > .aboutintro').first().addClass('about-hero');
}

function projectSlugFromPath(path: string) {
  const match = path.match(/^\/projects\/([^/]+)\/?$/);
  return match?.[1] ?? '';
}

function injectProjectDeliverables($: CheerioAPI, options: EnhanceContentOptions) {
  const slug = projectSlugFromPath(options.currentPath);
  const recap = projectDeliverables[slug];

  if (!recap) return;
  if ($('.deliverables-recap').length > 0) return;

  const sectionId = `deliverables-${slug}`;
  const section = $('<section></section>')
    .addClass('deliverables-recap')
    .attr('aria-labelledby', sectionId);
  const body = $('<div></div>').addClass('deliverables-recap__body');

  body.append($('<p></p>').addClass('deliverables-recap__label').text('Deliverables'));
  body.append($('<h2></h2>').addClass('deliverables-recap__title').attr('id', sectionId).text('What Jules delivered'));
  body.append($('<p></p>').addClass('deliverables-recap__summary').text(recap.summary));

  const list = $('<ul></ul>').addClass('deliverables-recap__list');
  recap.items.forEach((item) => {
    list.append($('<li></li>').text(item));
  });
  body.append(list);
  section.append(body);

  const moreWorkHeading = $('.rightcol.workcol > .mainline.myname.morework').first();
  if (moreWorkHeading.length > 0) {
    moreWorkHeading.before(section);
    return;
  }

  const rightColumn = $('.rightcol.workcol').first();
  if (rightColumn.length > 0) {
    rightColumn.append(section);
  }
}

export function enhanceContentHtml(html: string, options: EnhanceContentOptions) {
  const $ = cheerio.load(html, {}, false);

  fixKnownProjectCardHrefs($);
  removeHiddenProjectCards($);
  placeHomepageSmallProjects($, options);
  enhanceHeadings($);
  enhanceImages($, options);
  enhanceVideos($);
  enhanceLinks($);
  decorateBookingCtas($);
  normalizeBodyCopyParagraphs($);
  stripEmptyNoise($);
  formatServicePills($);
  replaceAssociateCollage($);
  formatHomepageMarketAttentionCopy($, options);
  markAboutHero($, options);
  injectProjectDeliverables($, options);
  rewriteRootRelativeUrls($);

  if (noindexPaths.has(options.currentPath)) {
    $('[aria-current="page"]').removeAttr('aria-current');
  }

  return $.root().html() ?? html;
}
