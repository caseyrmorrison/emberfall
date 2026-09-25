# Emberfall · The Last Light

A complete, compact pixel-art browser RPG about carrying a small light through a forgotten world. Explore three regions, master telegraphed turn-based battles, and bring back the dawn.

**[Play Emberfall](https://caseyrmorrison.github.io/emberfall/)**

## Play

- **Explore:** WASD / arrow keys, or click a destination. Hold Shift to sprint. Touch controls appear on mobile.
- **Interact:** E near enemies, camp, treasure, the forge, and wardens; or click the landmark.
- **Battle:** 1 Strike, 2 Ember Arc, 3 Guard, 4 Tonic, 5 Flee.
- **Menus:** I for inventory, J for journal, M for travel, Esc to close menus / open settings.
- **Music:** use the speaker button. Browsers require an interaction before audio can start.

Strike restores focus. Fire and steel weaknesses build stagger, which interrupts an enemy action. Every third enemy turn is a telegraphed heavy attack; guard reduces incoming damage by 75%. Tonics restore 65% of maximum health and use a turn. Warden battles cannot be fled.

## A world you can outgrow

- Three regions, six enemy types, three wardens, four illustrated story sequences, and an ending.
- Repeatable battles and treasure, a level-99 cap, permanent weapon and armor upgrades, and tougher awakened boss rematches.
- Fixed encounter difficulty: earlier enemies become easier as you grow. Heroic mode raises enemy damage by 30%.
- Free camp healing, unlimited sprinting, click-to-move pathfinding, fast travel, automatic bounty rewards, and immediate resource recovery on level-up.
- Defeat preserves experience and equipment, returns you to camp, and costs at most 30 gold.
- Local autosave with validated JSON import/export. Reduced-motion settings, volume controls, keyboard-accessible menus, and mobile controls.
- Original synthesized ambient music, combat music, and sound effects; locally bundled fonts and artwork.

The anime sequences are illustrated cinematics with animated camera movement and dialogue, not full-motion animation or voice acting. This is a small single-player game, with three handcrafted encounters areas sharing a world layout and distinct palettes, encounters, and progression.

## Develop

Requires Node.js 22.12+ (CI uses Node.js 24).

```sh
npm ci
npm run dev
```

Open `http://localhost:5177`. For a production build:

```sh
npm run build
npm run preview
```

## Verify

```sh
npm test
npx playwright install --with-deps chrome
npm run test:e2e
npm run format:check
```

`npm run check` runs the production build, unit tests, and desktop/mobile browser tests. The logic suite checks tactical balance, a three-boss campaign, grinding, rewards, upgrades, path reachability, and save sanitization. Browser tests cover real keyboard combat, menus, cinematics, file import/export, persistence, responsive layout, and the ending.

## Architecture

- `src/game/model.ts`: pure combat, stats, purchases, progression; randomness is injected for reproducible tests.
- `src/game/data.ts`: region, enemy, and story content.
- `src/game/world.ts`: deterministic maps, collisions, and breadth-first pathfinding.
- `src/game/render.ts`: cached pixel terrain, sprites, animation, particles, and battle rendering.
- `src/game/save.ts`: versioned, size-limited, allowlisted save validation and storage.
- `src/game/audio.ts`: Web Audio synthesis with bounded oscillator lifetimes.
- `src/main.ts`: application orchestration, input, focus-managed dialogs, and DOM interface.
- `src/style.css`: responsive interface, touch layout, and reduced-motion treatment.

No runtime framework, server, account, telemetry, paid API, or game-engine CDN is required. TypeScript strict mode, a committed npm lockfile, formatting checks, and CI tests protect changes.

## Save behavior

Progress saves after rewards, purchases, resting, travel, story scenes, and periodically during movement. Battles are checkpointed at entry and completion. Reloading during a battle restores its entry checkpoint. World enemies and treasure renew on rest, travel, or reload. Saves are local to the browser and origin; export before changing browsers/devices. Import is unavailable during combat, and corrupt saves are rejected.

## Deploy

GitHub Pages publishes the `dist` artifact after the main branch passes formatting, compilation, unit tests, and browser tests. Set the repository's Pages source to **GitHub Actions**. Asset URLs use a relative Vite base so the game works under a repository subpath.

The workflow uses official Actions pinned to commit hashes, read-only build permissions, and a separate deployment job with Pages and identity permissions.

## Art and licenses

See [artwork provenance and generation prompts](docs/ARTWORK.md). Pixel sprites, terrain, story, game code, and synthesized audio are original to this project. Anime illustrations were generated for this game with ImageGen. Fonts are included under the SIL Open Font License; license files are in `public/licenses/`.

Project code is MIT licensed. No copyrighted franchise characters, third-party game sprites, or sampled music are included.
