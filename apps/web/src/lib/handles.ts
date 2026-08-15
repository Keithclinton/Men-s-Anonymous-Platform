const ADJECTIVES = [
  'quiet',
  'steady',
  'calm',
  'still',
  'solid',
  'even',
  'low',
  'open',
  'clear',
  'slow',
  'sure',
  'kind',
];

const NOUNS = [
  'oak',
  'cedar',
  'pine',
  'stone',
  'ridge',
  'harbor',
  'brook',
  'field',
  'grove',
  'ember',
  'anchor',
  'hearth',
];

export function suggestHandle(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${adjective}${noun}${n}`;
}
