export type RegionId = 0 | 1 | 2;
export type EnemyKind = 'slime' | 'wolf' | 'wisp' | 'guardian' | 'sentinel' | 'eclipse';
export type CombatAction = 'attack' | 'ember' | 'guard' | 'potion' | 'flee';
export interface EnemySpec {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xp: number;
  gold: number;
  weakness: 'fire' | 'steel';
  color: string;
  boss?: boolean;
}
export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  slime: {
    name: 'Mossling',
    hp: 48,
    attack: 13,
    defense: 1,
    xp: 32,
    gold: 18,
    weakness: 'fire',
    color: '#8cc89b',
  },
  wolf: {
    name: 'Duskfang',
    hp: 72,
    attack: 18,
    defense: 2,
    xp: 47,
    gold: 25,
    weakness: 'fire',
    color: '#b0bac5',
  },
  wisp: {
    name: 'Hollow Wisp',
    hp: 57,
    attack: 16,
    defense: 1,
    xp: 40,
    gold: 22,
    weakness: 'steel',
    color: '#86d9d1',
  },
  guardian: {
    name: 'The Rootbound',
    hp: 260,
    attack: 29,
    defense: 4,
    xp: 180,
    gold: 110,
    weakness: 'fire',
    color: '#80a67c',
    boss: true,
  },
  sentinel: {
    name: 'Tide Sentinel',
    hp: 510,
    attack: 43,
    defense: 7,
    xp: 310,
    gold: 190,
    weakness: 'steel',
    color: '#72c6d4',
    boss: true,
  },
  eclipse: {
    name: 'The Hollow King',
    hp: 850,
    attack: 58,
    defense: 10,
    xp: 650,
    gold: 350,
    weakness: 'fire',
    color: '#c6a1df',
    boss: true,
  },
};
export const REGIONS = [
  {
    name: 'Whispering Woods',
    subtitle: 'Where the old world still breathes',
    range: 'Lv. 1–5',
    boss: 'guardian' as EnemyKind,
    grass: '#29493d',
    dark: '#163c32',
    light: '#3c6048',
    path: '#7d7350',
    water: '#254e55',
    accent: '#a7cc92',
    chapter: 'The last light',
    quest: 'A spark in the dark',
    objective: 'Defeat the Rootbound at the eastern shrine.',
    scene: 'awakening',
  },
  {
    name: 'The Drowned Ruins',
    subtitle: 'Some memories refuse to sink',
    range: 'Lv. 5–9',
    boss: 'sentinel' as EnemyKind,
    grass: '#2b424d',
    dark: '#19343c',
    light: '#42616a',
    path: '#707a72',
    water: '#1d5369',
    accent: '#7acbd0',
    chapter: 'Beneath the surface',
    quest: 'What the water remembers',
    objective: 'Release the Tide Sentinel from its vigil.',
    scene: 'tide',
  },
  {
    name: 'Moonless Summit',
    subtitle: 'At the edge of an endless night',
    range: 'Lv. 9–14',
    boss: 'eclipse' as EnemyKind,
    grass: '#413c50',
    dark: '#2d293f',
    light: '#625971',
    path: '#817477',
    water: '#3d3a66',
    accent: '#c4a6df',
    chapter: 'The dawn we make',
    quest: 'A light worth keeping',
    objective: 'Challenge the Hollow King. Bring back the dawn.',
    scene: 'summit',
  },
] as const;
export interface StoryLine {
  speaker: string;
  text: string;
}
export const STORIES: Record<string, { title: string; lines: StoryLine[] }> = {
  awakening: {
    title: 'A promise in the ashes',
    lines: [
      {
        speaker: 'The last light',
        text: 'Three nights ago, the moon broke. By morning, every hearth in the valley had gone cold. Every hearth but one.',
      },
      {
        speaker: 'Lyra',
        text: 'My brother called it a curse. My mother called it a gift. All I know is that this ember is still warm.',
      },
      {
        speaker: 'Mira · Keeper of the camp',
        text: 'The forest has forgotten us, Lyra. Find the three wardens. Wake the lights they guard. And if you fall… come home. I’ll keep the fire.',
      },
      { speaker: 'Lyra', text: 'Then I’ll start with one small spark.' },
    ],
  },
  tide: {
    title: 'What the water remembers',
    lines: [
      {
        speaker: 'Lyra',
        text: 'The roots loosened their grip. Beneath them, an old road. It leads to a city that should not still be here.',
      },
      {
        speaker: 'A voice beneath the water',
        text: 'We waited for the dawn until we forgot its name. Will you wait with us?',
      },
      { speaker: 'Lyra', text: 'No. But I’ll remember you when it comes.' },
    ],
  },
  summit: {
    title: 'The weight of a little light',
    lines: [
      {
        speaker: 'Mira',
        text: 'The final warden was the first to carry an ember. He tried to hold back the night alone.',
      },
      { speaker: 'Lyra', text: 'And the light consumed him?' },
      { speaker: 'Mira', text: 'No, little spark. The loneliness did. Remember your way home.' },
    ],
  },
  ending: {
    title: 'All the lights we leave behind',
    lines: [
      {
        speaker: 'The Hollow King',
        text: 'I held the dark for a thousand years. I was so afraid… that if I let go, there would be nothing.',
      },
      {
        speaker: 'Lyra',
        text: 'There’s a camp in the woods. A friend keeping a fire. You don’t have to carry it anymore.',
      },
      {
        speaker: 'Dawn',
        text: 'And so the last ember became the first sunrise. Not because it burned the brightest. Because someone carried it home.',
      },
      {
        speaker: 'Your journey continues',
        text: 'The story is complete. The world is yours to explore. Face the awakened wardens again, master the forge, and grow as strong as you wish.',
      },
    ],
  },
};
