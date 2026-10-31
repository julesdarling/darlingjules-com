import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const HTML_DIRS = [
  path.join(ROOT, 'src', 'content-html', 'pages'),
  path.join(ROOT, 'src', 'content-html', 'projects'),
  path.join(ROOT, 'src', 'content-html', 'writing'),
];
const DATA_DIRS = [
  path.join(ROOT, 'src', 'content', 'pages'),
  path.join(ROOT, 'src', 'content', 'projects'),
  path.join(ROOT, 'src', 'content', 'writing'),
];

const replacements = [
  ['Get In Touch', 'Get in touch'],
  ['More Work', 'More work'],
  ['Flexibility VS Control', 'Flexibility vs control'],
  ['LEARN ABOUT MY DESIGN PROCESS', 'Learn about my design process'],
  ['It’s Not YOUR Design, It’s THE Design', 'It’s not your design, it’s the design'],
  ["It's Not YOUR Design, It's THE Design", "It's not your design, it's the design"],
  ['what NOT to do', 'what not to do'],
  ['Fujifilm Diosynth', 'FUJIFILM Diosynth'],
  ['⚑ Interface and experience design', '⚑ UI/UX'],
  ['Web design + user experience', 'Web design + UX'],
  ['startup branding kit', 'MVP branding kit'],
  ['San Francisco, CA', 'San Francisco, California'],
  ['Jules Darling LLC', 'Jules Darling'],
  ['The event experience OS', 'The event experience system'],
  ['Our POV', 'Thinking'],
  ['owner system', 'Owner OS'],
  ['technology and software asset leaders', 'IT and software asset leaders'],
  ['technology teams and users', 'IT and users'],
  ['document version', 'PDF version'],
  ['Moveworks in a connected', 'MW in a connected'],
  ['2,500 before common era', '2,500 B.C.'],
  ['Making Pegman Even More Iconic', 'Making Pegman even more iconic'],
  ['Retail Compare App', 'Retail compare app'],
  ['The AI For Business', 'AI for business'],
  ['Artificial intelligence for business', 'AI for business'],
  ['Making Hosting Easier Than Ever', 'Making hosting easier than ever'],
  ['Conduct your language models', 'Conduct your SLMs'],
  ['The Ultimate Luxury Racing Club', 'The ultimate luxury racing club'],
  ['The Do-It-All Travel Solution', 'The do-it-all travel solution'],
  ['Brand Flexibility For the Future', 'Brand flexibility for the future'],
  ['An Extraordinary Employer Brand', 'An extraordinary employer brand'],
  ['Inherently Collaborative', 'Inherently collaborative'],
  ['In-Person, Virtual, Hybrid Events', 'In-person, virtual, hybrid events'],
  ['Finally, A Bank For People', 'Finally, a bank for people'],
  ['Finally, Personalized Health Care', 'Finally, personalized healthcare'],
  ['Boost your benefits Comms', 'Boost your benefits communications'],
  ["Refill Your Phil's", "Refill your Phil's"],
  ['Brand and Motion—Simply Magic', 'Brand and motion, simply magic'],
  ['Brand and Motion - Simply Magic', 'Brand and motion, simply magic'],
  ['The First Web3 Dev Platform', 'The first web3 dev platform'],
  ['Easy Peasy', 'Easy peasy'],
  ['Deploy Faster', 'Deploy faster'],
  ['Security Without Swords and Shields', 'Security without swords and shields'],
  ['Get Clarity, get Revenue', 'Get clarity, get revenue'],
  ['Everyone Is Creative', 'Everyone is creative'],
  ['A Brand From The Year 3030', 'A brand from the year 3030'],
  ['Helping People Change Their Minds', 'Helping people change their minds'],
  ['Rebranding The Metaverse', 'Rebranding the metaverse'],
  ["Financial Planning's A Breeze", "Financial planning's a breeze"],
  ['Any Fan. Any Channel. Any Time.', 'Any fan. Any channel. Any time.'],
  ['The Price Is Right', 'The price is right'],
  ['Healing Psilocybin Journeys', 'Healing psilocybin journeys'],
  ['Start It Up', 'Start it up'],
  ['Creating A Category Leading Brand', 'Creating a category-leading brand'],
  ['Expressive Interactions In Emotions', 'Expressive interactions in emotions'],
  ['The Moment of Impact', 'The moment of impact'],
  ['The Network', 'The network'],
  ['How Darling Works', 'How Darling works'],
  ['The Belief', 'The belief'],
  ['About & Team', 'About and team'],
  ['ExtendedNetwork', 'Extended network'],
  ['A Powerful Network of Creative Specialists', 'A powerful network of creative specialists'],
  ['Positioning + Messaging', 'Positioning + messaging'],
  ['Day Rate', 'Day rate'],
  ['Album Art Designs', 'Album art designs'],
  ['Cleverness From The Collective Unconscious', 'Cleverness from the collective unconscious'],
  ['Creating From The Inside', 'Creating from the inside'],
  ['Designing and Maintaining an Emergent Brand', 'Designing and maintaining an emergent brand'],
  ['Modernist Design: One Solution', 'Modernist design: one solution'],
  ['Emergent Design: A Step Further', 'Emergent design: a step further'],
  ['Designing To Let Your Brand Learn on Its Own', 'Designing to let your brand learn on its own'],
  ['An Emergent Brand Is Self-Maintaining', 'An emergent brand is self-maintaining'],
  ['But Emergent Design Depends on the Designer', 'But emergent design depends on the designer'],
  ['How To Interview Designers for Your Emergent Brand', 'How to interview designers for your emergent brand'],
  ['Shedding Ego in The Branding Process', 'Shedding ego in the branding process'],
  ['Assume Good', 'Assume good'],
  ['Try it on for Size', 'Try it on for size'],
  ['Liven Up the Mood', 'Liven up the mood'],
  ['How it Happens in Practice', 'How it happens in practice'],
  ['5 Quick Tips:', '5 quick tips:'],
  ['Stick and Poke Tattoos', 'Stick and poke tattoos'],
  ['How to Spot a Great Logo and the Impact of Superliminal Design', 'How to spot a great logo and the impact of superliminal design'],
  ['Logo Spotting', 'Logo spotting'],
  ['What Is Superliminal Design?', 'What is superliminal design?'],
  ['From Subliminal to Superliminal', 'From subliminal to superliminal'],
  ['Ascending to the Superliminal', 'Ascending to the superliminal'],
  ['Superliminal Logo: Moveworks', 'Superliminal logo: Moveworks'],
  ['Superliminal Logo: Material', 'Superliminal logo: Material'],
  ['Superliminal Logo: Genki', 'Superliminal logo: Genki'],
  ['Does Your Brand Need a Superliminal Logo?', 'Does your brand need a superliminal logo?'],
  ['The Art Of Symbols', 'The art of symbols'],
  ['Full Experience Here', 'Full experience here'],
  ['Crows Feet', 'Crows feet'],
  ['Married Couple', 'Married couple'],
  ['Two Witnesses, One Lying', 'Two witnesses, one lying'],
  ['Phoenician Staff', 'Phoenician staff'],
  ['Universal Collapse Paintings', 'Universal collapse paintings'],
  ['Practical.Purposeful.Thoughtful.Focused.Clear.', 'Practical. Purposeful. Thoughtful. Focused. Clear.'],
  ['Beautiful.Ai', 'Beautiful.AI'],
  ['Delivery pipelines made faster, clearer, and easier to trust', 'CI/CD made faster, clearer, and easier to trust'],
];

function applySentenceCase(text) {
  let next = text;
  for (const [from, to] of replacements) {
    next = next.replaceAll(from, to);
  }

  return next;
}

async function updateHtmlFile(filePath) {
  const html = await readFile(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });
  let changed = false;

  $('body *')
    .not('script, style, source, video, img')
    .contents()
    .each((_, node) => {
      if (node.type !== 'text') return;
      const next = applySentenceCase(node.data);
      if (next !== node.data) {
        node.data = next;
        changed = true;
      }
    });

  if (!changed) return false;
  await writeFile(filePath, `${$('body').html() ?? $.root().html()}\n`);
  return true;
}

function updateJsonValue(value) {
  if (typeof value === 'string') return applySentenceCase(value);
  if (Array.isArray(value)) return value.map(updateJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, updateJsonValue(item)]));
  }
  return value;
}

async function updateJsonFile(filePath) {
  const source = await readFile(filePath, 'utf-8');
  const data = JSON.parse(source);
  const next = JSON.stringify(updateJsonValue(data), null, 2) + '\n';
  if (next === source) return false;
  await writeFile(filePath, next);
  return true;
}

let changed = 0;

for (const dir of HTML_DIRS) {
  for (const file of await readdir(dir)) {
    if (file.endsWith('.html') && (await updateHtmlFile(path.join(dir, file)))) changed += 1;
  }
}

for (const dir of DATA_DIRS) {
  for (const file of await readdir(dir)) {
    if (file.endsWith('.json') && (await updateJsonFile(path.join(dir, file)))) changed += 1;
  }
}

console.log(`Enforced sentence case in ${changed} content file(s).`);
