import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import './style.css';
import { ENEMIES, REGIONS, STORIES, type CombatAction, type RegionId } from './game/data';
import {
  buyPotion,
  createBattle,
  DEFAULT_SETTINGS,
  forgeCost,
  heal,
  intent,
  newPlayer,
  performAction,
  stats,
  upgrade,
  usePotion,
  xpToNext,
  type Battle,
} from './game/model';
import { parseSave, readSave, serialize, writeSave } from './game/save';
import { findPath, makeWorld, TILE, walkable, type Entity } from './game/world';
import { drawHero, Renderer } from './game/render';
import { AudioEngine } from './game/audio';
import { icon } from './ui/icons';

const stored = readSave();
let player = stored?.player ?? newPlayer();
let settings = stored?.settings ?? {
  ...DEFAULT_SETTINGS,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
let world = makeWorld(player.region);
if (!walkable(world, player.x, player.y)) {
  player.x = 11;
  player.y = 17;
}
let battle: Battle | null = null;
let activeEnemy: Entity | null = null;
let path: { x: number; y: number }[] = [];
let target: { x: number; y: number } | null = null;
let position = { x: player.x, y: player.y };
let modalName = '';
let storyId = 'awakening';
let storyIndex = 0;
let busy = false;
let lastSave = 0;
let storageOkay = true;
let saveDirty = false;
let focusedBeforeModal: HTMLElement | null = null;
let cameraFraction = 0.5;
const keys = new Set<string>();
const audio = new AudioEngine();
const app = document.querySelector<HTMLDivElement>('#app')!;
const art = `${import.meta.env.BASE_URL}art/emberfall-cinematic.png`;
const endingArt = `${import.meta.env.BASE_URL}art/emberfall-dawn.png`;

app.innerHTML = `
  <header class="topbar">
    <a href="#" class="brand" aria-label="Emberfall adventure">${icon('spark')}<span>EMBERFALL<small>THE LAST LIGHT</small></span></a>
    <nav aria-label="Main navigation"><button class="nav active" data-action="adventure">${icon('compass')}<span>Adventure</span></button><button class="nav" data-action="character">${icon('sword')}<span>Character</span></button><button class="nav" data-action="journal">${icon('book')}<span>Journal</span><i class="nav-dot"></i></button><button class="nav" data-action="world">${icon('map')}<span>World</span></button></nav>
    <div class="header-actions"><span class="gold" id="gold"></span><span class="divider"></span><button class="icon-button" data-action="settings" aria-label="Settings">${icon('settings')}</button></div>
  </header>
  <main>
    <section class="page-heading"><div><p class="eyebrow" id="chapter"></p><h1 id="chapter-title">A spark in the dark<span>.</span></h1><p class="page-subtitle">The world has forgotten the light. Give it something to remember.</p></div><div class="journey-label"><span class="live-dot"></span> YOUR ADVENTURE, YOUR PACE <small>Explore. Grow stronger. Make your mark.</small></div></section>
    <div class="game-layout">
      <section class="adventure-panel" aria-label="Adventure">
        <div class="world-heading"><div class="location-icon">${icon('pin')}</div><div><h2 id="location-name"></h2><p id="location-subtitle"></p></div><div class="world-tags"><span class="tag" id="level-range"></span><span class="weather">☾ <span>Moonlit</span></span></div></div>
        <div class="stage" id="stage">
          <canvas id="world" width="768" height="432" tabindex="0" role="img" aria-label="Pixel-art adventure map. Use WASD or arrow keys to move, E to interact, or click a destination."></canvas>
          <div class="stage-top"><span class="area-badge"><i></i><span id="area-status">THE WILDS</span></span><div class="stage-tools"><button class="stage-button" data-action="music" id="music-toggle" aria-label="Enable music">${icon('mute')}</button><button class="stage-button" data-action="fullscreen" aria-label="Toggle fullscreen">${icon('expand')}</button></div></div>
          <div class="discovery" id="discovery"><span class="tiny-spark">✦</span> A world waiting to be discovered</div>
          <div id="battle-ui"></div>
          <button class="interact-prompt" id="interact" data-action="interact" hidden></button>
          <div class="touch-pad" aria-label="Touch movement"><button data-move="up" aria-label="Move up">↑</button><div><button data-move="left" aria-label="Move left">←</button><button data-move="down" aria-label="Move down">↓</button><button data-move="right" aria-label="Move right">→</button></div></div>
          <span class="map-coordinate" id="coordinates"></span>
        </div>
        <div class="world-toolbar"><div class="control-hints"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>E</kbd> Interact</span><span><kbd>⇧</kbd> Sprint</span><span class="click-hint">or click to explore</span></div><button class="text-button" data-action="help">Controls ${icon('chevron')}</button></div>
        <div class="quick-actions"><button data-action="camp">${icon('fire')}<span>Return to camp<small>Rest & restore</small></span>${icon('chevron')}</button><button data-action="inventory">${icon('bag')}<span>Satchel<small id="tonic-count">3 moonwell tonics</small></span><kbd>I</kbd></button><button data-action="world">${icon('map')}<span>Fast travel<small>Follow the light</small></span><kbd>M</kbd></button></div>
      </section>
      <aside class="sidebar"><section class="character-card" id="character-card"></section><section class="quest-card" id="quest-card"></section><button class="story-card" data-action="story" style="--story-art: url('${art}')"><span class="story-card-shade"></span><span class="story-tag">THE STORY SO FAR</span><span class="story-play">▷</span><strong>A promise in the ashes</strong><span class="story-bottom">Watch the prologue <span>01</span></span></button></aside>
    </div>
    <section class="below-world"><div class="tip-icon">${icon('spark')}</div><div><h3>A little stronger, every journey.</h3><p>Rest at camp to renew encounters. There’s no wrong time to grow.</p></div><span>NO ENERGY LIMITS. NO WAITING.</span></section>
    <footer><span>${icon('spark')} A small ember. An endless possibility.</span><span id="save-status" aria-live="polite"></span><button data-action="help">How to play ${icon('arrow')}</button></footer>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div id="modal-root"></div>
  <input id="import-file" type="file" accept=".json,application/json" hidden />
`;
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new Renderer(canvas, world);
const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
function applySettings() {
  audio.music = settings.music;
  audio.effects = settings.sfx;
  audio.volume = settings.volume;
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  $('#music-toggle').innerHTML = icon(settings.music ? 'volume' : 'mute');
  $('#music-toggle').setAttribute('aria-label', settings.music ? 'Mute music' : 'Enable music');
  $('#music-toggle').classList.toggle('playing', settings.music);
}
function save() {
  // Combat is checkpointed at entry and completion, so reloads cannot corrupt a turn.
  if (battle?.outcome === 'active') return;
  storageOkay = writeSave(player, settings);
  lastSave = Date.now();
  saveDirty = false;
  $('#save-status').innerHTML =
    `${icon(storageOkay ? 'check' : 'save')} ${storageOkay ? 'Progress saved on this device' : 'Storage unavailable · export your save in Settings'}`;
}
function refresh() {
  const s = stats(player);
  const region = REGIONS[player.region];
  $('#gold').innerHTML = `${icon('coin')} ${player.gold.toLocaleString()}<span>G</span>`;
  $('#chapter').textContent =
    `CHAPTER ${['I', 'II', 'III'][player.region]} · ${region.chapter.toUpperCase()}`;
  $('#chapter-title').innerHTML =
    `${player.bosses.length === 3 ? 'The dawn we make' : region.quest}<span>.</span>`;
  $('#location-name').textContent = region.name;
  $('#location-subtitle').textContent = region.subtitle;
  $('#level-range').textContent = region.range;
  $('#tonic-count').textContent = `${player.potions} moonwell tonics`;
  $('#character-card').innerHTML =
    `<div class="character-top"><div class="portrait" style="background-image:url('${art}')"><span class="level-badge">${player.level}</span></div><div><span class="eyebrow">THE EMBERBEARER</span><h2>Lyra Ashveil</h2><p>Wanderer <span>·</span> Level ${player.level}</p></div><button class="icon-button" data-action="character" aria-label="View character">${icon('chevron')}</button></div><div class="resource-label"><span>${icon('heart')} Health</span><span>${player.hp} <small>/ ${s.maxHp}</small></span></div><div class="meter health"><i style="width:${(player.hp / s.maxHp) * 100}%"></i></div><div class="resource-label"><span>${icon('spark')} Focus</span><span>${player.mp} <small>/ ${s.maxMp}</small></span></div><div class="meter focus"><i style="width:${(player.mp / s.maxMp) * 100}%"></i></div><div class="xp-row"><span>LEVEL ${player.level}</span><span>${player.level === 99 ? 'MAX LEVEL' : `${player.xp} / ${xpToNext(player.level)} XP`}</span></div><div class="meter xp"><i style="width:${player.level === 99 ? 100 : (player.xp / xpToNext(player.level)) * 100}%"></i></div><div class="stat-row"><span>${icon('sword')} <b>${s.attack}</b> ATK</span><span>${icon('shield')} <b>${Math.floor(s.defense)}</b> DEF</span><span>${icon('spark')} <b>${player.bosses.length}</b> / 3</span></div>`;
  const done = player.bosses.includes(region.boss);
  $('#quest-card').innerHTML =
    `<div class="card-eyebrow">${icon('flag')} ${player.bosses.length === 3 ? 'A NEW DAWN' : 'MAIN QUEST'} <span class="quest-diamond">◇</span></div><h3>${player.bosses.length === 3 ? 'The light returns' : region.quest}</h3><p>${player.bosses.length === 3 ? 'You carried the light home. Explore, grow, and challenge awakened wardens.' : done ? 'A warden remembers the light. Your next destination awaits.' : region.objective}</p><div class="quest-objective"><span class="objective-circle ${done ? 'complete' : ''}">${done ? '✓' : ''}</span>${done ? 'Warden awakened' : 'Reach the eastern shrine'}</div><div class="quest-reward"><span>WARDEN REWARD</span><b>${icon('coin')} ${ENEMIES[region.boss].gold} <i>+ ${ENEMIES[region.boss].xp} XP</i></b></div><button class="quest-link" data-action="${done && player.region < 2 ? 'world' : 'journal'}">${done && player.region < 2 ? 'Travel onward' : 'Open quest journal'} ${icon('arrow')}</button>`;
  $('#coordinates').textContent =
    `${Math.round(player.x)} : ${Math.round(player.y)} · ${region.name.toUpperCase()}`;
  $('#area-status').textContent = battle
    ? 'ENCOUNTER'
    : Math.hypot(player.x - 8, player.y - 17) < 5
      ? 'CAMP · SAFE HAVEN'
      : 'THE WILDS';
  $('#discovery').hidden = Boolean(battle);
  renderBattle();
}
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4300);
}
function resetWorld() {
  world = makeWorld(player.region);
  renderer.rebuild(world);
  path = [];
  target = null;
  position = { x: player.x, y: player.y };
}
function nearest(): Entity | undefined {
  return world.entities
    .filter((e) => !e.cleared && Math.hypot(e.x - player.x, e.y - player.y) <= 2.2)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y),
    )[0];
}
function interact(e = nearest()) {
  if (!e || battle || modalName) return;
  path = [];
  target = null;
  if (e.type === 'camp') openModal('camp');
  if (e.type === 'forge') openModal('forge');
  if (e.type === 'chest') {
    e.cleared = true;
    player.gold += 25 + player.region * 15;
    player.potions = Math.min(99, player.potions + 1);
    audio.sfx('heal');
    toast(
      `Found ${25 + player.region * 15} gold and a moonwell tonic. Resting renews treasure, too.`,
    );
    refresh();
    save();
  }
  if (e.type === 'enemy') startBattle(e);
  if (e.type === 'gate') {
    activeEnemy = e;
    openModal('warden');
  }
}
function startBattle(e: Entity) {
  save();
  closeModal();
  activeEnemy = e;
  battle = createBattle(e.kind!, player.region, player.bosses.includes(e.kind!));
  path = [];
  target = null;
  audio.battle = true;
  audio.sfx('hit');
  $('#stage').classList.add('in-battle');
  refresh();
}
function renderBattle() {
  const ui = $('#battle-ui');
  if (!battle) {
    ui.innerHTML = '';
    return;
  }
  const e = ENEMIES[battle.kind];
  const plan = intent(battle);
  if (battle.outcome === 'active') {
    ui.innerHTML = `<div class="enemy-hud"><div><span>${battle.empowered ? 'AWAKENED WARDEN' : e.boss ? 'WARDEN' : 'WILD ENCOUNTER'}</span><h3>${e.name}</h3></div><b>${battle.hp} / ${battle.maxHp}</b><div class="meter health"><i style="width:${(battle.hp / battle.maxHp) * 100}%"></i></div><div class="enemy-details"><span>Weak to ${e.weakness === 'fire' ? '🔥 fire' : '⚔ steel'}</span><span>Stagger ${battle.stagger}%</span></div><div class="intent ${plan.heavy ? 'heavy' : ''}">${icon(plan.heavy ? 'skull' : 'sword')} ${plan.label}</div></div><div class="battle-console"><div class="battle-vitals"><b>LYRA <small>LV ${player.level}</small></b><span class="battle-hp">${icon('heart')} ${player.hp} / ${stats(player).maxHp}</span><span>${icon('spark')} ${player.mp} / ${stats(player).maxMp} focus</span></div><div class="battle-log" role="status" aria-live="polite">${battle.log
      .slice(-2)
      .map((l) => `<p>${l}</p>`)
      .join(
        '',
      )}</div><div class="combat-actions"><button data-combat="attack" ${busy ? 'disabled' : ''} title="Strike with steel. Restore 1 focus.">${icon('sword')}<b>Strike</b><small><kbd>1</kbd> +1 focus</small></button><button data-combat="ember" ${busy || player.mp < 4 ? 'disabled' : ''} title="Deal fire damage. Costs 4 focus. Exploit fire weakness to stagger enemies.">${icon('fire')}<b>Ember Arc</b><small><kbd>2</kbd> 4 focus</small></button><button data-combat="guard" ${busy ? 'disabled' : ''} title="Reduce incoming damage by 75% and restore 4 focus.">${icon('shield')}<b>Guard</b><small><kbd>3</kbd> +4 focus</small></button><button data-combat="potion" ${busy || player.potions < 1 || player.hp === stats(player).maxHp ? 'disabled' : ''} title="Restore 65% of your maximum HP. Uses your turn.">${icon('potion')}<b>Tonic ×${player.potions}</b><small><kbd>4</kbd> Heal 65%</small></button><button class="flee-button" data-combat="flee" ${busy || e.boss ? 'disabled' : ''} title="Escape regular encounters safely">↗<b>Flee</b><small><kbd>5</kbd> Escape</small></button></div></div>`;
  } else {
    const won = battle.outcome === 'won';
    const fled = battle.outcome === 'fled';
    ui.innerHTML = `<div class="battle-result"><span class="result-symbol">${won ? '✦' : fled ? '↗' : '☾'}</span><span class="eyebrow">${won ? 'THE EMBER GROWS' : fled ? 'LIVE TO FIGHT AGAIN' : 'EVERY JOURNEY TEACHES'}</span><h2>${won ? 'Victory' : fled ? 'A safe retreat' : 'A new beginning'}</h2><p>${won ? `+${battle.xp} XP <span>·</span> +${battle.gold} gold` : fled ? 'Your next encounter can wait.' : 'Mira has brought you home. Your progress is safe.'}</p><div class="result-notes">${battle.log
      .filter((l) => /Level |bounty|Lost /.test(l))
      .map((l) => `<p>${l}</p>`)
      .join(
        '',
      )}</div><button class="primary" data-action="finish-battle">${won ? 'Onward' : 'Return to the trail'} ${icon('arrow')}</button></div>`;
  }
}
function combat(action: CombatAction) {
  if (!battle || busy || modalName) return;
  const result = performAction(player, battle, action, settings);
  if (!result.length) return;
  audio.sfx(action === 'ember' ? 'magic' : action === 'potion' ? 'heal' : 'hit');
  busy = true;
  $('#stage').classList.add('combat-flash');
  if (battle.outcome !== 'active') {
    if (battle.outcome === 'won') audio.sfx('victory');
    save();
  }
  refresh();
  setTimeout(
    () => {
      busy = false;
      $('#stage').classList.remove('combat-flash');
      renderBattle();
    },
    settings.reducedMotion ? 100 : 350,
  );
}
function finishBattle() {
  if (!battle || battle.outcome === 'active') return;
  const won = battle.outcome === 'won';
  const boss = ENEMIES[battle.kind].boss;
  const ending = battle.kind === 'eclipse';
  if (won && activeEnemy) activeEnemy.cleared = true;
  if (battle.outcome === 'lost') resetWorld();
  if (battle.outcome === 'fled') {
    player.x = Math.max(2, player.x - 1);
    if (!walkable(world, player.x, player.y)) {
      player.x = 11;
      player.y = 17;
    }
    position = { x: player.x, y: player.y };
  }
  battle = null;
  activeEnemy = null;
  audio.battle = false;
  $('#stage').classList.remove('in-battle');
  refresh();
  save();
  if (won && boss) {
    if (ending && !player.seen.includes('ending')) playStory('ending');
    else {
      toast('A light has awakened. A new destination is available.');
      openModal('world');
    }
  }
}
function modalHeader(eyebrow: string, title: string, description = '') {
  return `<div class="modal-heading"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>`;
}
function openModal(name: string) {
  if (battle && !['settings', 'help'].includes(name)) {
    toast('Finish this encounter first.');
    return;
  }
  if (!modalName) focusedBeforeModal = document.activeElement as HTMLElement;
  modalName = name;
  path = [];
  target = null;
  keys.clear();
  const s = stats(player);
  const r = REGIONS[player.region];
  let content = '';
  if (name === 'camp')
    content = `${modalHeader('A PLACE TO CALL HOME', 'The Wayfarer’s Rest', 'A warm fire. A familiar face. A moment to breathe.')}<div class="camp-illustration">${icon('fire')}<span>“One more story before you go?”<small>— Mira, keeper of the camp</small></span></div><div class="info-strip">Rest restores all health and focus, and renews enemies and treasure.</div><button class="primary full" data-action="rest">${icon('fire')} Rest by the fire <span>FREE</span></button><button class="secondary full" data-action="forge">${icon('sword')} Visit the forge</button><button class="secondary full" data-action="buy-tonic">${icon('potion')} Buy moonwell tonic <span>20 G</span></button>`;
  if (name === 'forge')
    content = `${modalHeader('BUILT TO ENDURE', 'The wayfarer’s forge', 'Permanent upgrades. No random rolls. Every coin makes you stronger.')}<div class="balance">Your gold <b>${icon('coin')} ${player.gold}</b></div>${(['weapon', 'armor'] as const).map((slot) => `<div class="upgrade-row"><div class="equipment-icon">${icon(slot === 'weapon' ? 'sword' : 'shield')}</div><div><h3>${slot === 'weapon' ? 'Embersteel blade' : 'Wayfarer’s mantle'} +${player[slot]}</h3><p>${slot === 'weapon' ? '+4 attack' : '+2 defense'} per upgrade</p></div><button class="secondary" data-upgrade="${slot}" ${player.gold < forgeCost(player[slot]) || player[slot] >= 25 ? 'disabled' : ''}>${player[slot] >= 25 ? 'MAX' : `${forgeCost(player[slot])} G`}</button></div>`).join('')}<p class="muted">Upgrades stay with you, even if you fall in battle.</p>`;
  if (name === 'character')
    content = `${modalHeader('THE EMBERBEARER', 'Lyra Ashveil', 'A wanderer with one small light and a very long road.')}<div class="character-sheet"><canvas id="hero-preview" width="160" height="180"></canvas><div><span class="big-level">${player.level}<small>LEVEL</small></span><p>${player.xp} / ${xpToNext(player.level)} XP</p></div></div><div class="sheet-stats">${[
      ['heart', 'Health', s.maxHp],
      ['spark', 'Focus', s.maxMp],
      ['sword', 'Attack', s.attack],
      ['shield', 'Defense', Math.floor(s.defense)],
    ]
      .map(([i, label, n]) => `<div>${icon(String(i))}<span>${label}</span><b>${n}</b></div>`)
      .join(
        '',
      )}</div><div class="equipment-list"><p>${icon('sword')} Embersteel blade <b>+${player.weapon}</b></p><p>${icon('shield')} Wayfarer’s mantle <b>+${player.armor}</b></p></div><p class="muted">${player.kills} encounters won · ${player.bosses.length}/3 lights awakened<br>Grow to level 99. The journey is yours.</p><button class="primary full" data-action="forge">Visit the forge ${icon('arrow')}</button>`;
  if (name === 'inventory')
    content = `${modalHeader('PACK LIGHT. WANDER FAR.', 'Your satchel', 'Everything you need for one more stretch of trail.')}<div class="inventory-item"><div class="equipment-icon">${icon('potion')}</div><div><h3>Moonwell tonic <span>×${player.potions}</span></h3><p>Restores 65% of maximum health.</p></div></div><div class="info-strip">Health: ${player.hp} / ${s.maxHp}</div><button class="primary full" data-action="drink" ${player.potions < 1 || player.hp >= s.maxHp ? 'disabled' : ''}>Drink a tonic ${icon('heart')}</button><button class="secondary full" data-action="buy-tonic" ${player.gold < 20 || player.potions >= 99 ? 'disabled' : ''}>Buy a tonic <span>20 G</span></button><p class="muted">Gold ${player.gold} · Tonics ${player.potions}/99<br>Equipment is always equipped. Quest rewards are collected automatically.</p>`;
  if (name === 'journal')
    content = `${modalHeader('EVERY SPARK HAS A STORY', 'Your journal', 'Three wardens. Three forgotten lights. One road home.')}<div class="journal-entries">${REGIONS.map((zone, index) => `<article class="journal-entry ${player.bosses.includes(zone.boss) ? 'completed' : ''}"><span class="journal-number">${player.bosses.includes(zone.boss) ? '✓' : `0${index + 1}`}</span><div><span class="eyebrow">${zone.name}</span><h3>${zone.quest}</h3><p>${zone.objective}</p><small>${player.bosses.includes(zone.boss) ? 'Completed · reward collected' : index <= player.bosses.length ? 'In progress' : 'Continue the main story to unlock'}</small></div></article>`).join('')}</div><div class="bounty"><span class="eyebrow">OPTIONAL · TRAILKEEPER</span><h3>Make the roads a little safer</h3><p>Win 5 encounters · ${Math.min(5, player.kills)}/5</p><div class="meter xp"><i style="width:${Math.min(100, (player.kills / 5) * 100)}%"></i></div><small>${player.claimedBounty ? '✓ Collected automatically: 75 gold + 2 tonics' : 'Reward: 75 gold + 2 moonwell tonics'}</small></div><button class="secondary full" data-action="story">Replay the prologue ${icon('book')}</button>`;
  if (name === 'world')
    content = `${modalHeader('FOLLOW THE LIGHT', 'Beyond the horizon', 'Travel freely between unlocked regions. Encounters renew on arrival.')}<div class="world-destinations">${REGIONS.map((zone, i) => `<button class="destination region-${i}" data-travel="${i}" ${i > player.bosses.length ? 'disabled' : ''}><span class="destination-num">0${i + 1}</span><span><span class="eyebrow">${i > player.bosses.length ? 'LOCKED · AWAKEN THE PREVIOUS WARDEN' : player.region === i ? 'YOU ARE HERE' : 'WAYPOINT DISCOVERED'}</span><strong>${zone.name}</strong><small>${zone.subtitle}</small></span><span class="destination-level">${zone.range}${icon(i > player.bosses.length ? 'shield' : 'arrow')}</span></button>`).join('')}</div>${player.bosses.length === 3 ? '<div class="info-strip">The dawn has returned. Awakened wardens are 45% stronger and grant greater rewards.</div>' : '<p class="muted">There is no level scaling in ordinary encounters. Return to earlier regions and feel how far you’ve come.</p>'}`;
  if (name === 'warden') {
    const enemy = ENEMIES[r.boss];
    content = `${modalHeader('THE EASTERN SHRINE', enemy.name, 'The air grows still. Something ancient waits beyond the arch.')}<div class="warden-warning">${icon('skull')}<span>${player.bosses.includes(r.boss) ? 'Awakened warden · +45% strength' : `Recommended: ${[4, 7, 10][player.region]}+ level and upgraded equipment`}<small>You cannot flee a warden encounter.</small></span></div><p class="muted">Read its intent. Guard against heavy strikes. Exploit its ${enemy.weakness} weakness to stagger it.</p><button class="primary full" data-action="challenge">Face the warden ${icon('sword')}</button><button class="secondary full" data-action="close">Prepare a little longer</button>`;
  }
  if (name === 'settings')
    content = `${modalHeader('MAKE YOURSELF AT HOME', 'Settings')}<div class="setting-row"><span><b>Music</b><small>Original ambient and battle score</small></span><button role="switch" aria-checked="${settings.music}" class="switch ${settings.music ? 'on' : ''}" data-setting="music" aria-label="Music"><i></i></button></div><div class="setting-row"><span><b>Sound effects</b><small>Combat, healing, and menu sounds</small></span><button role="switch" aria-checked="${settings.sfx}" class="switch ${settings.sfx ? 'on' : ''}" data-setting="sfx" aria-label="Sound effects"><i></i></button></div><label class="setting-row"><span><b>Volume</b><small>Master volume</small></span><input type="range" id="volume" min="0" max="1" step="0.05" value="${settings.volume}" aria-label="Volume" /></label><div class="setting-row"><span><b>Reduced motion</b><small>Still particles and cinematic artwork</small></span><button role="switch" aria-checked="${settings.reducedMotion}" class="switch ${settings.reducedMotion ? 'on' : ''}" data-setting="reducedMotion" aria-label="Reduced motion"><i></i></button></div><label class="setting-row"><span><b>Difficulty</b><small>Heroic enemies deal 30% more damage</small></span><select id="difficulty" ${battle ? 'disabled' : ''} aria-label="Difficulty"><option value="normal" ${settings.difficulty === 'normal' ? 'selected' : ''}>Adventurer</option><option value="heroic" ${settings.difficulty === 'heroic' ? 'selected' : ''}>Heroic</option></select></label><div class="save-actions"><button class="secondary" data-action="export" ${battle ? 'disabled' : ''}>${icon('save')} Export save</button><button class="secondary" data-action="import" ${battle ? 'disabled' : ''}>${icon('bag')} Import save</button></div><p class="muted">Saves stay in this browser on this device. Export a backup to take your adventure with you.</p><button class="danger-link" data-action="reset-confirm" ${battle ? 'disabled' : ''}>Start a new journey</button>`;
  if (name === 'reset-confirm')
    content = `${modalHeader('ONE JOURNEY ENDS, ANOTHER BEGINS', 'Start again?', 'This replaces the save on this device. Export a backup first if you want to keep your progress.')}<button class="secondary full" data-action="export">Export current save</button><button class="primary full" data-action="reset">Start a new journey</button><button class="secondary full" data-action="close">Keep exploring</button>`;
  if (name === 'help')
    content = `${modalHeader('YOUR FIRST STEPS', 'A field guide', 'A tactical adventure. A world you can outgrow.')}<div class="help-grid"><div>${icon('compass')}<h3>Explore at your pace</h3><p>WASD / arrows to move. Hold Shift to sprint. Click a destination to walk there. Approach a landmark and press E, or click it to interact.</p></div><div>${icon('sword')}<h3>Read the fight</h3><p>1: Strike (+1 focus). 2: Ember Arc (4 focus). 3: Guard (+4 focus, 75% less damage). 4: Tonic. 5: Flee. Heavy strikes happen every third turn.</p></div><div>${icon('fire')}<h3>Come back stronger</h3><p>Camp is free. Rest to refill health and focus and renew encounters. Upgrade your weapon and armor at the forge. Levels refill your resources.</p></div><div>${icon('map')}<h3>Find the three lights</h3><p>Wardens wait at each eastern shrine. Beat one to unlock the next region. Press M for travel, I for your satchel, J for your journal, Esc to close menus.</p></div></div><div class="info-strip">Exploit weaknesses to build stagger. At 100%, the enemy skips an attack. Tonics use a turn; plan your healing. Defeat costs at most 30 gold and never costs XP.</div><button class="primary full" data-action="close">Let’s wander ${icon('arrow')}</button>`;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop"><section class="modal ${name === 'help' ? 'wide-modal' : ''}" role="dialog" aria-modal="true" aria-label="${name === 'warden' ? 'Warden challenge' : name}"><button class="modal-close icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button>${content}</section></div>`;
  $('main').inert = true;
  $('.topbar').inert = true;
  if (name === 'character') {
    const preview = $<HTMLCanvasElement>('#hero-preview');
    drawHero(preview.getContext('2d')!, 80, 156, 9);
  }
  setTimeout(
    () => $('#modal-root').querySelector<HTMLButtonElement>('button:not([disabled])')?.focus(),
    0,
  );
}
function closeModal() {
  modalName = '';
  $('#modal-root').innerHTML = '';
  $('main').inert = false;
  $('.topbar').inert = false;
  keys.clear();
  focusedBeforeModal?.focus();
  focusedBeforeModal = null;
}
function playStory(id: string) {
  if (battle) return;
  storyId = id;
  storyIndex = 0;
  modalName = 'story';
  keys.clear();
  path = [];
  drawStory();
}
function drawStory() {
  const story = STORIES[storyId];
  const line = story.lines[storyIndex];
  $('main').inert = true;
  $('.topbar').inert = true;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop story-backdrop"><section class="cinematic ${storyId}" role="dialog" aria-modal="true" aria-label="${story.title}"><img class="cinematic-art" src="${storyId === 'ending' ? endingArt : art}" alt="Lyra, a silver-haired adventurer, carries an ember through an ancient forest shrine."/><div class="cinema-shade"></div><div class="cinema-header"><span>${icon('spark')} EMBERFALL <small>${story.title}</small></span><button class="skip-button" data-action="skip-story">Skip scene ${icon('chevron')}</button></div><div class="dialogue"><span class="eyebrow">${line.speaker}</span><p>${line.text}</p><div class="dialogue-bottom"><span>${story.lines.map((_, i) => `<i class="${i === storyIndex ? 'current' : ''}"></i>`).join('')}</span><button class="primary" data-action="next-story">${storyIndex === story.lines.length - 1 ? 'Begin the next step' : 'Continue'} ${icon('arrow')}</button></div></div></section></div>`;
  setTimeout(
    () => $('#modal-root').querySelector<HTMLButtonElement>('[data-action="next-story"]')?.focus(),
    0,
  );
}
function endStory() {
  if (!player.seen.includes(storyId)) player.seen.push(storyId);
  closeModal();
  save();
}
async function handleAction(action: string) {
  await audio.unlock();
  audio.sfx('click');
  if (
    [
      'character',
      'journal',
      'world',
      'settings',
      'help',
      'inventory',
      'forge',
      'reset-confirm',
    ].includes(action)
  ) {
    openModal(action);
    return;
  }
  switch (action) {
    case 'adventure':
      closeModal();
      canvas.focus();
      break;
    case 'close':
      closeModal();
      break;
    case 'camp':
      if (battle) {
        toast('Finish this encounter before returning to camp.');
        break;
      }
      player.x = 11;
      player.y = 17;
      position = { x: 11, y: 17 };
      save();
      refresh();
      openModal('camp');
      break;
    case 'rest':
      heal(player);
      player.x = 11;
      player.y = 17;
      resetWorld();
      audio.sfx('heal');
      closeModal();
      refresh();
      save();
      toast('Fully restored. The forest stirs with new life.');
      break;
    case 'buy-tonic':
      if (buyPotion(player)) {
        audio.sfx('heal');
        save();
        refresh();
        openModal(modalName);
        toast('One moonwell tonic added to your satchel.');
      } else toast('You need 20 gold and room in your satchel.');
      break;
    case 'drink':
      if (usePotion(player)) {
        audio.sfx('heal');
        save();
        refresh();
        openModal('inventory');
      }
      break;
    case 'story':
      playStory('awakening');
      break;
    case 'next-story':
      if (storyIndex < STORIES[storyId].lines.length - 1) {
        storyIndex++;
        drawStory();
      } else endStory();
      break;
    case 'skip-story':
      endStory();
      break;
    case 'music':
      settings.music = !settings.music;
      applySettings();
      save();
      toast(settings.music ? 'Music on · the forest has a song for you.' : 'Music muted.');
      break;
    case 'fullscreen':
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('#stage').requestFullscreen();
      } catch {
        toast('Fullscreen is unavailable in this browser.');
      }
      break;
    case 'interact':
      interact();
      break;
    case 'challenge':
      if (activeEnemy) startBattle(activeEnemy);
      break;
    case 'finish-battle':
      finishBattle();
      break;
    case 'export': {
      if (battle) break;
      const blob = new Blob([serialize(player, settings)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emberfall-level-${player.level}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Save exported. Keep it somewhere safe.');
      break;
    }
    case 'import':
      if (!battle) $<HTMLInputElement>('#import-file').click();
      break;
    case 'reset':
      if (battle) break;
      player = newPlayer();
      resetWorld();
      closeModal();
      refresh();
      save();
      playStory('awakening');
      break;
  }
}
document.addEventListener('click', (e) => {
  const element = (e.target as Element).closest<HTMLElement>('button, a.brand');
  if (!element) return;
  if (element instanceof HTMLButtonElement && element.disabled) return;
  if (element.classList.contains('brand')) {
    e.preventDefault();
    closeModal();
    return;
  }
  if (element.dataset.action) void handleAction(element.dataset.action);
  if (element.dataset.combat) {
    void audio.unlock();
    combat(element.dataset.combat as CombatAction);
  }
  if (element.dataset.upgrade) {
    if (upgrade(player, element.dataset.upgrade as 'weapon' | 'armor')) {
      audio.sfx('heal');
      refresh();
      save();
      openModal('forge');
      toast('Equipment upgraded. You can feel the difference.');
    }
  }
  if (element.dataset.setting) {
    const key = element.dataset.setting as 'music' | 'sfx' | 'reducedMotion';
    settings[key] = !settings[key];
    void audio.unlock();
    applySettings();
    save();
    openModal('settings');
  }
  if (element.dataset.travel !== undefined) {
    const region = Number(element.dataset.travel) as RegionId;
    if (battle || region > player.bosses.length || region > 2) return;
    player.region = region;
    player.x = 11;
    player.y = 17;
    resetWorld();
    closeModal();
    refresh();
    save();
    const scene = REGIONS[region].scene;
    if (!player.seen.includes(scene)) playStory(scene);
    else toast(`Welcome to ${REGIONS[region].name}.`);
  }
});
document.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'volume') {
    settings.volume = Number(input.value);
    applySettings();
    save();
  }
});
document.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'difficulty' && !battle) {
    settings.difficulty = input.value as 'normal' | 'heroic';
    save();
    toast(`Difficulty: ${input.value === 'heroic' ? 'Heroic' : 'Adventurer'}.`);
  }
  if (input.id === 'import-file' && input.files?.[0]) {
    try {
      if (input.files[0].size > 100_000) throw new Error('Save file is too large.');
      const imported = parseSave(await input.files[0].text());
      player = imported.player;
      settings = imported.settings;
      if (!walkable(makeWorld(player.region), player.x, player.y)) {
        player.x = 11;
        player.y = 17;
      }
      resetWorld();
      applySettings();
      closeModal();
      refresh();
      save();
      toast('Your journey has been restored. Welcome back.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not import this save.');
    }
    input.value = '';
  }
});
const movements: Record<string, [number, number]> = {
  w: [0, -1],
  arrowup: [0, -1],
  s: [0, 1],
  arrowdown: [0, 1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
};
function move(dx: number, dy: number) {
  if (battle || modalName) return;
  const x = player.x + dx;
  const y = player.y + dy;
  if (walkable(world, x, y)) {
    player.x = x;
    player.y = y;
    saveDirty = true;
  }
  const e = world.entities.find(
    (entity) =>
      !entity.cleared && entity.type === 'enemy' && entity.x === player.x && entity.y === player.y,
  );
  if (e) startBattle(e);
}
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (modalName) {
    if (key === 'escape') {
      e.preventDefault();
      modalName === 'story' ? endStory() : closeModal();
    }
    if (key === 'tab') {
      const focusable = [
        ...$('#modal-root').querySelectorAll<HTMLElement>('button:not([disabled]), input, select'),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  if ((e.target as HTMLElement).matches('input, select, textarea')) return;
  if (movements[key] || key === 'shift') e.preventDefault();
  if (e.repeat && !movements[key]) return;
  keys.add(key);
  if (movements[key] || ['1', '2', '3', '4', '5'].includes(key)) void audio.unlock();
  if (movements[key]) {
    path = [];
    target = null;
  }
  if (battle) {
    const actions: Record<string, CombatAction> = {
      '1': 'attack',
      '2': 'ember',
      '3': 'guard',
      '4': 'potion',
      '5': 'flee',
    };
    if (actions[key]) combat(actions[key]);
    return;
  }
  if (key === 'e') {
    void audio.unlock();
    interact();
  }
  if (key === 'i') openModal('inventory');
  if (key === 'm') openModal('world');
  if (key === 'j') openModal('journal');
  if (key === 'escape') openModal('settings');
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    keys.clear();
    save();
  }
});
window.addEventListener('pagehide', save);
canvas.addEventListener('click', (e) => {
  if (battle || modalName) return;
  void audio.unlock();
  const bounds = canvas.getBoundingClientRect();
  const scale = (document.fullscreenElement ? Math.min : Math.max)(
    bounds.width / canvas.width,
    bounds.height / canvas.height,
  );
  const croppedX = (canvas.width * scale - bounds.width) * cameraFraction;
  const croppedY = (canvas.height * scale - bounds.height) / 2;
  const x = Math.floor((e.clientX - bounds.left + croppedX) / scale / TILE);
  const y = Math.floor((e.clientY - bounds.top + croppedY) / scale / TILE);
  const entity = world.entities.find((en) => !en.cleared && Math.hypot(en.x - x, en.y - y) < 1.8);
  if (entity && Math.hypot(entity.x - player.x, entity.y - player.y) <= 2.2) {
    interact(entity);
    return;
  }
  const goal = entity ? { x: entity.x, y: entity.y } : { x, y };
  path = findPath(world, player, goal);
  target = path.length ? goal : null;
  if (!path.length && !walkable(world, x, y))
    toast('The forest is thick there. Try the trail or a bridge.');
});
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
  const key = { up: 'w', down: 's', left: 'a', right: 'd' }[button.dataset.move!]!;
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(key);
    path = [];
    void audio.unlock();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(event, () => keys.delete(key));
});
let previous = 0;
let moveClock = 0;
let hudClock = 0;
function frame(time: number) {
  const delta = Math.min(60, time - previous);
  previous = time;
  moveClock += delta;
  hudClock += delta;
  if (!battle && !modalName && moveClock >= (keys.has('shift') ? 75 : 145)) {
    moveClock = 0;
    const direction = [...keys].find((k) => movements[k]);
    if (direction) move(...movements[direction]);
    else if (path.length) {
      const next = path.shift()!;
      move(next.x - player.x, next.y - player.y);
      if (!path.length && target && !battle) {
        const entity = world.entities.find(
          (en) => !en.cleared && en.x === target!.x && en.y === target!.y,
        );
        target = null;
        if (entity) interact(entity);
      }
    }
  }
  position.x += (player.x - position.x) * Math.min(1, delta / 65);
  position.y += (player.y - position.y) * Math.min(1, delta / 65);
  const bounds = canvas.getBoundingClientRect();
  const visibleWidth =
    bounds.width / Math.max(bounds.width / canvas.width, bounds.height / canvas.height);
  cameraFraction =
    document.fullscreenElement || battle || visibleWidth >= canvas.width
      ? 0.5
      : Math.max(
          0,
          Math.min(1, (position.x * TILE + 8 - visibleWidth / 2) / (canvas.width - visibleWidth)),
        );
  canvas.style.objectPosition = `${cameraFraction * 100}% 50%`;
  if (!document.hidden)
    renderer.draw(
      player,
      battle,
      time,
      settings.reducedMotion,
      position,
      Math.hypot(player.x - position.x, player.y - position.y) > 0.05,
      target,
    );
  if (hudClock > 250) {
    hudClock = 0;
    const near = !battle && !modalName ? nearest() : null;
    const prompt = $('#interact');
    prompt.hidden = !near;
    if (near) {
      const name =
        near.type === 'camp'
          ? 'Rest at camp'
          : near.type === 'forge'
            ? 'Visit the forge'
            : near.type === 'chest'
              ? 'Open treasure'
              : near.type === 'gate'
                ? 'Approach the warden'
                : `Challenge ${ENEMIES[near.kind!].name}`;
      prompt.innerHTML = `<kbd>E</kbd> ${name}`;
    }
    $('#coordinates').textContent =
      `${player.x} : ${player.y} · ${REGIONS[player.region].name.toUpperCase()}`;
    $('#area-status').textContent = battle
      ? 'ENCOUNTER'
      : Math.hypot(player.x - 8, player.y - 17) < 5
        ? 'CAMP · SAFE HAVEN'
        : 'THE WILDS';
  }
  if (saveDirty && Date.now() - lastSave > 5000) save();
  requestAnimationFrame(frame);
}
applySettings();
refresh();
save();
requestAnimationFrame(frame);
if (!stored)
  setTimeout(
    () =>
      toast(
        'Welcome, Emberbearer. Click the trail to explore, or watch the prologue to begin your story.',
      ),
    900,
  );
