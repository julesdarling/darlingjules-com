// Protect portfolio names and the preferred role title while sentence-casing editorial words.
// Matching a name preserves its existing spelling, including internal periods.
const properNames = [
  'Jules Darling', 'Jules', 'Darling & Friends', 'Darling', 'Design Director',
  'Google Maps', 'Google Meet', 'Google', 'Pegman', 'NotebookLM', 'Notebook LM',
  'IBM Watson', 'Watson', 'Beats by Dre', 'Apple Retail', 'Apple', 'Chase Travel',
  'Chase Bank', 'Citi Bank', 'Microsoft Windows 11', 'Microsoft Windows', 'Microsoft',
  'Rafa Racing Club', 'Original Syndicate', 'Prometheus Group', 'Beckley Retreats',
  'Driven Studios', 'Emotive Feels', 'Material Security', 'Right Capital', 'RightCapital',
  'Beautiful.AI', 'Arcee.AI', 'Fleetworks.ai', 'FUJIFILM Diosynth', 'Fender',
  'GitLab', 'Gitlab', 'Airbnb', 'Bizzabo', 'LiveRamp', 'TripActions', 'GameOn',
  'Kinemaster', 'KineMaster', 'Accolade', 'Accrue', 'Airbo', 'Bitrise', 'Divine',
  'Doppl', 'Evergrow', 'Flimp', 'Frank', 'Granica', 'Hoist', 'Hybrid', 'Joyable',
  'Lightcone', 'Material', 'Meet Elise', 'Moveworks', 'Pagoda', 'Papa',
  "Phil's", 'Phil’s', 'Snow Software', 'Snow', 'Tau', 'Vita', 'Wish',
  'Brain Drain', 'Ok Bloomer', 'Genki', 'Clarity RCM',
  'San Francisco', 'California', 'Phoenician', 'Usins', 'Tyr', 'Covid', 'Web3',
].sort((left, right) => right.length - left.length);

const escapePattern = (text: string) => text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const namePattern = new RegExp(
  '(?<![\\p{L}\\p{N}])(?:' + properNames.map(escapePattern).join('|') + ')(?![\\p{L}\\p{N}])',
  'giu',
);
// Use known initialisms rather than treating all-caps emphasis such as YOUR as a name.
const acronymPattern = /\b(?:AI|IBM|CI\/CD|UI\/UX|UI|UX|HR|MVP|OS|PDF|RCM|IT|CEO|FAQ|SLMs?|API|HTML|CSS|GPS|[23]D|I)\b/g;

export function sentenceCaseHeadline(text: string): string {
  const source = text.replace(/\.+(?=[\s\u200b-\u200d"'”’\])}]*$)/u, '');
  const protectedCharacters = new Uint8Array(source.length);
  for (const pattern of [namePattern, acronymPattern]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      protectedCharacters.fill(1, match.index, match.index + match[0].length);
    }
  }

  let sentenceStart = true;
  let result = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (/\p{L}/u.test(character)) {
      result += protectedCharacters[index]
        ? character
        : sentenceStart ? character.toUpperCase() : character.toLowerCase();
      sentenceStart = false;
    } else {
      result += character;
      // A leading number already starts the sentence: "5 quick tips", not "5 Quick tips".
      if (/\p{N}/u.test(character)) sentenceStart = false;
      const decimalPoint = character === '.' && /\d/.test(source[index - 1] ?? '') && /\d/.test(source[index + 1] ?? '');
      if (!protectedCharacters[index] && /[.!?]/.test(character) && !decimalPoint) sentenceStart = true;
    }
  }
  return result;
}
