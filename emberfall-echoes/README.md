# Emberfall · Echoes of the Moon

A separate illustrated action RPG, built around the original Emberfall anime artwork. Carry Lyra's last ember through three chapters, explore moonlit clearings, and awaken the ancient wardens.

**[Play Echoes of the Moon](https://caseyrmorrison.github.io/emberfall/echoes/)**

This project lives entirely in `emberfall-echoes/`. It has its own dependencies, build, tests, and save data. The original pixel RPG remains at the repository root.

## Play

| Action         | Controls                                                     |
| -------------- | ------------------------------------------------------------ |
| Move           | WASD, arrow keys, click/tap the ground, or touch arrows      |
| Interact       | Click/tap a marker to approach it; E when nearby             |
| Emberblade     | Hold J or the attack button; automatically aims at the enemy |
| Solar Flare    | Q; costs 25 focus and builds stagger                         |
| Phase Step     | Space; dash with brief invulnerability                       |
| Moonwell Tonic | R; restores 65% of maximum health                            |
| Pause          | Escape or the pause button during encounters                 |
| Menus          | I for satchel, M for world travel                            |

Fight repeatable echoes to earn experience and gold. Spend gold on permanent equipment upgrades, return to the sanctuary for free healing, and challenge each region's warden when ready. The level cap is 99, upgrades reach +25, and earlier enemies retain their original strength. Defeat preserves experience and equipment and costs at most 30 gold. Heroic difficulty increases incoming damage by 30%.

Read the glowing ground warnings, move out of danger, and time dodges through projectiles. Solar Flare builds stagger, which interrupts enemy attacks. Focus regenerates over time. Awakened warden rematches have 35% more health and 20% more attack power.

## Included

- Smooth, high-resolution illustrated environments, transparent character and guardian art, spell effects, and animated lighting.
- Three chapters, three warden encounters, discoveries, repeatable combat, permanent progression, and an illustrated ending.
- Synthesized ambient and battle music, spell and interface sounds, independent music/effect toggles, and volume control. Enable music with the speaker button; browser audio starts after an interaction.
- Free fast travel, free sanctuary recovery, local autosave, validated save import/export, reduced motion, focus-managed menus, manual pause, and automatic pause when leaving the tab.
- Keyboard, mouse, and simultaneous touch movement/attacks.

This is a compact single-player game. The three regions share a painted arena with different color treatments and encounter tuning. Characters use illustrated cutout animation, and story scenes use camera motion and dialogue; there is no full-motion anime or voice acting.

## Develop

Requires Node.js 22.12 or later; CI uses Node.js 24.

```sh
cd emberfall-echoes
npm ci
npm run dev
```

Open `http://localhost:5180`. Run `npm run build` for production output in `dist/` and `npm run preview` to serve it locally. There is no backend or runtime game-engine CDN.

```sh
npm test
npx playwright install --with-deps chrome
npm run test:e2e
npm run format:check
```

`npm run check` runs the build, logic tests, and browser tests. Tests cover combat balance, all three wardens, dodging, stagger, upgrade economics, reward accounting, invalid saves, real keyboard combat, touch entry, simultaneous pointer input, stories, persistence, import/export, and production assets under the GitHub Pages subpath.

## Architecture

- `src/game/model.ts`: pure simulation and progression, with a bounded timestep.
- `src/game/content.ts`: region and story definitions.
- `src/game/renderer.ts`: smooth Canvas 2D rendering; resolution adapts to the display.
- `src/game/save.ts`: versioned, size-limited, allowlisted save validation.
- `src/game/audio.ts`: procedural Web Audio music and effects.
- `src/main.ts`: application flow, input, dialogs, and HUD.
- `src/style.css`: responsive layout and reduced-motion treatment.

Canvas 2D suits this layered illustrated world without a 3D engine. Strict TypeScript, a committed lockfile, formatting checks, logic tests, browser tests, and CI protect changes.

## Saves and deployment

Saves use `emberfall.echoes.v1`, separately from the original game. Progress saves after purchases, discoveries, travel, recovery, stories, and encounters. Encounters save their entry checkpoint and completion; reloading mid-fight restores the entry checkpoint. Export before moving to another browser or device. Import/export and difficulty changes are unavailable during combat.

The repository's GitHub Actions workflow builds and tests both games, copies this game's production output to `dist/echoes/`, and publishes the combined artifact to GitHub Pages. Relative asset URLs also allow this folder's build to be deployed independently.

## Art and licenses

Original anime illustrations were generated with ImageGen, using the original moonlit scene as the visual reference. See [artwork provenance and prompts](docs/ARTWORK.md). Cormorant Garamond and DM Sans are bundled locally under the SIL Open Font License; license copies are in `public/licenses/`. Code and synthesized audio are original to the project. Code is MIT licensed.
