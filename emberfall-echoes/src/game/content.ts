export type RegionId = 0 | 1 | 2;
export const REGIONS = [
  {
    name: 'The Mossbound Sanctuary',
    short: 'Mossbound',
    chapter: 'Where the old light sleeps',
    title: 'The forest\nremembers.',
    description:
      'Beneath a fractured moon, an ancient gate still glows. Something on the other side remembers your name.',
    boss: 'Aelthorn, the Rootkeeper',
    level: 4,
    hp: 850,
    attack: 25,
    color: '#9bdfc3',
    lore: 'The roots carry memories older than the kingdom. One glows brighter when you reach for it.',
    story: 'roots',
  },
  {
    name: 'The Glasswater Ruins',
    short: 'Glasswater',
    chapter: 'What the water keeps',
    title: 'Some echoes\nnever fade.',
    description:
      'Beyond the gate, silver water covers the old roads. The second warden keeps watch over everything the world forgot.',
    boss: 'Veyra, the Tidemourner',
    level: 7,
    hp: 1500,
    attack: 36,
    color: '#9edbf2',
    lore: 'You see a reflection that is not your own. A thousand lanterns. A city, waiting for morning.',
    story: 'water',
  },
  {
    name: 'The Moonveil Summit',
    short: 'Moonveil',
    chapter: 'The dawn we make',
    title: 'Carry the light\na little further.',
    description:
      'The final road climbs above the clouds. At its end waits the first emberbearer, and a night that has lasted too long.',
    boss: 'Eryndor, the Hollow Crown',
    level: 10,
    hp: 2300,
    attack: 48,
    color: '#dcc6ff',
    lore: 'A name is carved into the stone. Not a king’s name. A brother’s. Even the oldest darkness was once afraid.',
    story: 'crown',
  },
] as const;
export const STORIES: Record<string, { title: string; speaker: string; lines: string[] }> = {
  prologue: {
    title: 'A promise in the ashes',
    speaker: 'Lyra Ashveil',
    lines: [
      'The moon broke three nights ago. By morning, every hearth in the valley had gone cold. Every hearth but ours.',
      'Mother left me her sword, this scarf, and a little ember that refuses to go out. “A light is only lost,” she said, “when no one carries it.”',
      'Now the forest is calling. Three wardens. Three forgotten lights. And somewhere beyond them… a way to bring back the dawn.',
    ],
  },
  roots: {
    title: 'The roots remember',
    speaker: 'Aelthorn',
    lines: [
      'I remember you, little flame. Not your face. Your courage. Someone like you passed this way, before the sky fell.',
      'I held her promise in my roots. Take it now. Follow the water. And when the road grows dark, remember: you were never the first to hope.',
    ],
  },
  water: {
    title: 'The names beneath the water',
    speaker: 'Veyra',
    lines: [
      'We waited so long for the sunrise that we began to forget our names. I feared that letting go would mean forgetting them forever.',
      'But you carry them differently. Not as a weight. As a reason to keep walking. Go, emberbearer. The final light is waiting above the clouds.',
    ],
  },
  crown: {
    title: 'An ember, shared',
    speaker: 'Eryndor',
    lines: [
      'A thousand years. I held the night for a thousand years. I was so afraid that if I let go, there would be nothing.',
      'Lyra offers her hand. “There is a fire in the valley. A friend keeping watch. You don’t have to carry it alone anymore.”',
      'And the last ember became the first sunrise. Not because it burned the brightest. Because someone carried it home.',
      'The story is complete. Your journey continues. Revisit the clearings, strengthen your equipment, and challenge the awakened wardens.',
    ],
  },
};
