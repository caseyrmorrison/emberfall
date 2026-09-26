const paths: Record<string, string> = {
  spark: '<path d="m13 2-8 12h6l-1 8 9-13h-7l1-7Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  sword: '<path d="m14 4 6-1-1 6-9 9-4-4 8-10Z M4 14l6 6 M7 17l-4 4"/>',
  book: '<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Z M12 5v15"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16"/>',
  bag: '<path d="M5 8h14l2 13H3L5 8Z M8 8V6a4 4 0 0 1 8 0v2 M8 12h8"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="m12 7 3 5-3 5-3-5 3-5Z"/>',
  music:
    '<path d="M9 18V5l11-2v13 M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5V4Z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5V4Z M16 9l6 6 M22 9l-6 6"/>',
  expand: '<path d="M8 3H3v5 M16 3h5v5 M21 16v5h-5 M3 16v5h5"/>',
  fire: '<path d="M13 2c2 6-3 6-1 10 3-1 4-4 4-4 7 8 3 14-4 14C3 22 1 13 8 7c-1 6 2 6 2 6-1-6 4-7 3-11Z"/>',
  pin: '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  heart: '<path d="M20 4c-4-3-8 2-8 2S8 1 4 4c-7 6 8 16 8 16S27 10 20 4Z"/>',
  shield: '<path d="m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6l8-4Z"/>',
  potion: '<path d="M9 2h6v3h-1v4l5 8c2 5-16 5-14 0l5-8V5H9V2Z M7 14h10"/>',
  close: '<path d="m6 6 12 12 M18 6 6 18"/>',
  flag: '<path d="M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  arrow: '<path d="M3 12h18 M15 6l6 6-6 6"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1Z M7 3v6h10V3 M7 21v-8h10v8"/>',
  skull:
    '<path d="M7 17H5c-5-12 2-15 7-15s12 3 7 15h-2v5H7v-5Z M10 22v-4 M14 22v-4"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/>',
};
export const icon = (name: string, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`;
