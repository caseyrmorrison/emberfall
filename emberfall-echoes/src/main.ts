import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import './style.css';
import { REGIONS, STORIES, type RegionId } from './game/content';
import {
  act,
  beginEncounter,
  buyTonic,
  claimOutcome,
  createArena,
  discover,
  distance,
  forgeCost,
  INITIAL_SETTINGS,
  newPlayer,
  rest,
  stats,
  step,
  upgrade,
  useTonic,
  xpNeeded,
  type Action,
  type Point,
} from './game/model';
import { load, parseSave, persist, serialize } from './game/save';
import { loadImage, Renderer } from './game/renderer';
import { AudioEngine } from './game/audio';
import { icon } from './ui/icons';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
const asset = (file: string) =>
  new URL(`${import.meta.env.BASE_URL}art/${file}`, document.baseURI).href;
const art = {
  moon: asset('moonlit.png'),
  dawn: asset('dawn.png'),
  clearing: asset('clearing.png'),
  hero: asset('lyra.png'),
  warden: asset('warden.png'),
};
const saved = load();
let player = saved?.player ?? newPlayer();
let settings = saved?.settings ?? {
  ...INITIAL_SETTINGS,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
let arena = createArena();
let view: 'sanctuary' | 'explore' = 'sanctuary';
let renderer: Renderer | null = null;
let modal = '';
let previousFocus: HTMLElement | null = null;
let storyId = 'prologue';
let storyIndex = 0;
let rewardLines: string[] = [];
let newWarden = false;
let pendingLandmark = '';
let storyThenTravel = false;
let saveOkay = true;
let lastSave = 0;
let paused = false;
let audioUnlocked = false;
const keys = new Set<string>();
const activePointers = new Map<number, { direction?: string; ability?: Action }>();
const audio = new AudioEngine();
const landmarks = [
  {
    id: 'memory',
    x: 470,
    y: 370,
    label: 'A forgotten memory',
    sub: 'Listen to the stones',
    icon: 'spark',
  },
  { id: 'treasure', x: 570, y: 495, label: 'Moonwell cache', sub: 'Gather supplies', icon: 'bag' },
  {
    id: 'echo',
    x: 815,
    y: 440,
    label: 'A wandering echo',
    sub: 'Repeatable encounter',
    icon: 'sword',
  },
];

$('#app').innerHTML = `
  <div class="shell">
    <header class="topbar">
      <button class="brand" data-action="sanctuary" aria-label="Return to sanctuary"><span class="brand-emblem">${icon('spark')}</span><span>EMBERFALL<small>ECHOES OF THE MOON</small></span></button>
      <nav aria-label="Main navigation"><button class="nav current" data-action="explore">${icon('compass')}<span>Adventure</span></button><button class="nav" data-action="character">${icon('sword')}<span>Character</span></button><button class="nav" data-action="journal">${icon('book')}<span>Journal</span><i></i></button><button class="nav" data-action="atlas">${icon('map')}<span>World</span></button></nav>
      <div class="top-actions"><span class="currency" id="currency"></span><span class="top-divider"></span><button class="icon-button" id="music-button" data-action="music" aria-label="Enable music">${icon('mute')}</button><button class="icon-button" data-action="settings" aria-label="Settings">${icon('settings')}</button></div>
    </header>
    <main>
      <section class="game-frame sanctuary" id="game-frame" aria-label="Emberfall adventure">
        <div class="scene-image" id="scene-image" style="background-image:url('${art.moon}')"></div><div class="scene-shade"></div>
        <div class="ambient" aria-hidden="true">${Array.from({ length: 25 }, (_, i) => `<i style="--x:${(i * 37.1) % 100}%;--y:${(i * 29.7) % 100}%;--delay:${-i * 0.7}s;--duration:${12 + (i % 9)}s"></i>`).join('')}</div>
        <div class="scene-topline"><div class="location"><span class="location-symbol">${icon('pin')}</span><div><span class="eyebrow">THE VERDANT REACH</span><h2 id="location-name"></h2></div><span class="location-weather">☾ <small>Moonlit</small></span></div><div class="journey-progress" id="journey-progress"></div></div>
        <div class="sanctuary-copy" id="sanctuary-copy"><span class="chapter-label" id="chapter-label"></span><h1 id="scene-title"></h1><p id="scene-description"></p><div class="hero-actions"><button class="primary" data-action="explore">Enter the clearing ${icon('arrow')}</button><button class="story-link" data-action="prologue"><span class="play-circle">▷</span> Watch the prologue</button></div><span class="journey-footnote">Every journey begins with a single ember.</span></div>
        <button class="gate-hotspot" data-action="warden" aria-label="Inspect the Moonlit Gate"><span class="hotspot-ring"><span>◇</span></span><span class="hotspot-label"><small>ANCIENT WAYPOINT</small>The Moonlit Gate ${icon('chevron')}</span></button>
        <div class="chapter-note"><span>01 — 03</span><i></i><span>A WORLD WAITING TO REMEMBER</span></div>
        <canvas id="arena" tabindex="0" aria-label="Illustrated action RPG arena. Move with WASD or click the ground. J strikes, Q casts, Space dodges, R heals."></canvas>
        <div id="landmarks" class="landmarks"></div>
        <div class="explore-toolbar"><button class="subtle-button" data-action="sanctuary">${icon('chevron')} Sanctuary</button><span class="explore-hint" id="explore-hint">Click the ground to move · Approach a marker to interact</span><button class="subtle-button" data-action="warden">Challenge warden ${icon('sword')}</button></div>
        <div id="enemy-hud" class="enemy-hud" hidden></div>
        <div class="battle-tools" hidden><button class="subtle-button" data-action="pause" id="pause-button">Ⅱ Pause</button><button class="subtle-button" data-action="retreat">Retreat ↗</button></div>
        <div class="touch-movement" aria-label="Touch movement"><button data-direction="w" aria-label="Move up">↑</button><div><button data-direction="a" aria-label="Move left">←</button><button data-direction="s" aria-label="Move down">↓</button><button data-direction="d" aria-label="Move right">→</button></div></div>
        <div class="pause-screen" id="pause-screen" hidden><span class="eyebrow">TAKE A BREATH</span><h2>The world can wait.</h2><button class="primary" data-action="pause">Resume adventure ${icon('arrow')}</button></div>
        <div class="outcome" id="outcome" hidden></div>
        <div class="bottom-hud">
          <button class="hero-identity" data-action="character"><span class="hero-portrait" style="background-image:url('${art.moon}')"><b id="level-badge">1</b></span><span><span class="eyebrow">EMBERBEARER</span><strong>Lyra Ashveil</strong><small id="hero-level"></small></span></button>
          <div class="vitals" id="vitals"></div>
          <div class="hub-actions"><button data-action="rest">${icon('fire')}<span>Rest</span><small>FREE</small></button><button data-action="forge">${icon('sword')}<span>Forge</span></button><button data-action="satchel">${icon('bag')}<span>Satchel</span></button><button data-action="atlas">${icon('map')}<span>Travel</span></button></div>
          <div class="combat-actions" id="combat-actions">${[
            ['strike', 'sword', 'Emberblade', 'J'],
            ['flare', 'fire', 'Solar flare', 'Q'],
            ['dash', 'compass', 'Phase step', 'SPACE'],
            ['tonic', 'potion', 'Moonwell tonic', 'R'],
          ]
            .map(
              ([action, glyph, title, key]) =>
                `<button data-ability="${action}" title="${title}"><i class="cooldown-fill"></i>${icon(glyph)}<span><b>${title}</b><small class="ability-info" data-info="${action}"></small></span><kbd>${key}</kbd></button>`,
            )
            .join('')}</div>
          <button class="hunt-button" data-action="hunt">Hunt an echo ${icon('arrow')}</button>
        </div>
      </section>
      <footer><span class="save-status" id="save-status">${icon('check')} Progress saved</span><span class="control-legend"><kbd>W A S D</kbd> Move <i>·</i> <kbd>J</kbd> Strike <i>·</i> <kbd>Q</kbd> Cast <i>·</i> <kbd>SPACE</kbd> Dodge</span><button data-action="guide">A wanderer’s guide ${icon('arrow')}</button></footer>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div><div id="modal-root"></div><input id="save-file" type="file" accept="application/json,.json" hidden />
  </div>`;

const canvas = $<HTMLCanvasElement>('#arena');
async function unlockAudio() {
  if (!audioUnlocked) {
    await audio.unlock();
    audioUnlocked = true;
  }
}
function syncSettings() {
  audio.music = settings.music;
  audio.effects = settings.effects;
  audio.volume = settings.volume;
  document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  $('#music-button').innerHTML = icon(settings.music ? 'volume' : 'mute');
  $('#music-button').setAttribute('aria-label', settings.music ? 'Mute music' : 'Enable music');
}
function save() {
  if (arena.outcome === 'active') return;
  saveOkay = persist(player, settings);
  lastSave = Date.now();
  $('#save-status').innerHTML =
    `${icon(saveOkay ? 'check' : 'save')} ${saveOkay ? 'Progress saved on this device' : 'Export a save · browser storage unavailable'}`;
}
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
}
function refresh() {
  const region = REGIONS[player.region];
  $('#currency').innerHTML =
    `${icon('coin')} <b>${player.gold.toLocaleString()}</b><small>G</small>`;
  $('#location-name').textContent = region.name;
  $('#chapter-label').textContent =
    `CHAPTER ${['I', 'II', 'III'][player.region]} · ${region.chapter.toUpperCase()}`;
  $('#scene-title').innerHTML = (player.wardens === 3 ? 'The dawn\nremembers you.' : region.title)
    .split('\n')
    .join('<br>');
  $('#scene-description').textContent =
    player.wardens === 3
      ? 'The night has lifted. The world breathes again. But every road still holds a story, and your ember has more light to give.'
      : region.description;
  $('#journey-progress').innerHTML =
    `<span>${player.wardens === 3 ? 'THE LIGHT RETURNS' : 'AWAKEN THE THREE LIGHTS'}</span><div>${[0, 1, 2].map((i) => `<i class="${i < player.wardens ? 'lit' : ''}">✧</i>`).join('')}<small>${player.wardens} / 3</small></div>`;
  $('#scene-image').style.backgroundImage = `url('${player.wardens === 3 ? art.dawn : art.moon}')`;
  $('#game-frame').dataset.region = String(player.region);
  $('#level-badge').textContent = String(player.level);
  $('#hero-level').textContent =
    `Level ${player.level} · ${player.xp} / ${xpNeeded(player.level)} XP`;
  renderLandmarks();
  updateVitals();
}
function updateVitals() {
  const maxHp = stats(player).hp;
  $('#vitals').innerHTML =
    `<div><span>${icon('heart')} Health</span><b>${Math.ceil(player.hp)} <small>/ ${maxHp}</small></b></div><div class="meter hp"><i style="width:${(player.hp / maxHp) * 100}%"></i></div><div><span>${icon('spark')} Focus</span><b>${Math.floor(player.focus)} <small>/ 100</small></b></div><div class="meter focus"><i style="width:${player.focus}%"></i></div>`;
  for (const action of ['strike', 'flare', 'dash', 'tonic'] as Action[]) {
    const button = $<HTMLButtonElement>(`[data-ability="${action}"]`);
    const cd = arena.cooldowns[action];
    button.disabled =
      arena.outcome !== 'active' ||
      paused ||
      Boolean(modal) ||
      cd > 0 ||
      (action === 'flare' && player.focus < 25) ||
      (action === 'tonic' && (!player.tonics || player.hp >= maxHp));
    button.querySelector<HTMLElement>('.cooldown-fill')!.style.transform =
      `scaleY(${cd / { strike: 0.62, flare: 2.5, dash: 1.8, tonic: 4 }[action]})`;
    $(`[data-info="${action}"]`).textContent =
      cd > 0
        ? `${cd.toFixed(1)}s`
        : action === 'strike'
          ? 'Hold to attack'
          : action === 'flare'
            ? '25 focus'
            : action === 'dash'
              ? 'Brief invulnerability'
              : `${player.tonics} remaining`;
  }
  if (arena.enemy && arena.outcome === 'active') {
    const enemy = arena.enemy;
    $('#enemy-hud').innerHTML =
      `<div class="enemy-name"><span>${enemy.boss ? 'ANCIENT WARDEN' : 'WILD ECHO'}<i>◇</i></span><h2>${enemy.name}</h2><small>${Math.ceil(enemy.hp)} / ${enemy.maxHp}</small></div><div class="meter enemy-health"><i style="width:${(enemy.hp / enemy.maxHp) * 100}%"></i></div><div class="enemy-meta"><span>${arena.warnings.length ? '⚠ Move out of the marked ground' : 'Dodge projectiles · strike from any distance'}</span><span>STAGGER ${enemy.stagger}%</span></div>`;
  }
}
function renderLandmarks() {
  $('#landmarks').innerHTML = landmarks
    .map((l) => {
      const done =
        l.id === 'memory'
          ? player.memories.includes(player.region)
          : l.id === 'treasure' && player.treasures.includes(player.region);
      return `<button class="world-marker ${done ? 'discovered' : ''}" style="left:${l.x / 10}%;top:${l.y / 6}%" data-landmark="${l.id}"><span>${icon(done ? 'check' : l.icon)}</span><b>${l.label}</b><small>${done ? 'Discovered' : l.sub}</small></button>`;
    })
    .join('');
}
function setView(next: 'sanctuary' | 'explore') {
  if (next === 'explore' && !renderer) {
    toast('The illustrated world is still loading. Please try again in a moment.');
    return;
  }
  paused = false;
  $('#pause-screen').hidden = true;
  $('#pause-button').textContent = 'Ⅱ Pause';
  view = next;
  $('#game-frame').classList.toggle('sanctuary', view === 'sanctuary');
  $('#game-frame').classList.toggle('exploring', view === 'explore');
  if (next === 'explore') canvas.focus({ preventScroll: true });
  keys.clear();
  arena.target = null;
  pendingLandmark = '';
  refresh();
}
function startEncounter(boss: boolean) {
  if (!renderer) {
    toast('The artwork is still loading.');
    return;
  }
  if (arena.outcome === 'active') return;
  closeModal();
  save();
  newWarden = boss && player.wardens === player.region;
  arena = beginEncounter(player, boss);
  setView('explore');
  audio.battle = true;
  $('#game-frame').classList.add('in-battle');
  $('#enemy-hud').hidden = false;
  $('.battle-tools').hidden = false;
  $('#outcome').hidden = true;
  audio.sfx('magic');
  updateVitals();
}
function endEncounter() {
  const wasWon = arena.outcome === 'won';
  const wasBoss = arena.enemy?.boss;
  const story = REGIONS[player.region].story;
  arena = createArena();
  keys.clear();
  activePointers.clear();
  audio.battle = false;
  $('#game-frame').classList.remove('in-battle');
  $('#enemy-hud').hidden = true;
  $('.battle-tools').hidden = true;
  $('#outcome').hidden = true;
  paused = false;
  refresh();
  save();
  if (wasWon && wasBoss && newWarden) {
    storyThenTravel = player.wardens < 3;
    playStory(story);
  } else if (!wasWon) {
    setView('sanctuary');
    toast('The sanctuary welcomes you home.');
  }
}
function outcome() {
  rewardLines = claimOutcome(player, arena);
  keys.clear();
  activePointers.clear();
  save();
  refresh();
  const won = arena.outcome === 'won';
  if (won) audio.sfx('victory');
  $('#outcome').innerHTML =
    `<div class="outcome-card"><span class="outcome-glyph">${won ? '✦' : '☾'}</span><span class="eyebrow">${won ? 'THE EMBER GROWS' : 'YOUR LIGHT STILL BURNS'}</span><h2>${won ? (arena.enemy?.boss ? 'A light awakened.' : 'Echo released.') : 'Rise again.'}</h2><p>${rewardLines.join('<br>')}</p><button class="primary" data-action="onward">${won ? 'Continue your journey' : 'Return to sanctuary'} ${icon('arrow')}</button></div>`;
  $('#outcome').hidden = false;
}
function interactLandmark(id: string) {
  pendingLandmark = '';
  arena.target = null;
  if (id === 'echo') {
    startEncounter(false);
    return;
  }
  if (id === 'treasure') {
    if (discover(player, 'treasure')) {
      audio.sfx('heal');
      toast(`Found ${45 + player.region * 30} gold and a moonwell tonic.`);
    } else toast('You already gathered these supplies. Hunt echoes for more gold.');
    refresh();
    save();
    return;
  }
  if (id === 'memory') {
    const first = discover(player, 'memory');
    openModal('memory');
    if (first) audio.sfx('magic');
    refresh();
    save();
  }
}
function heading(label: string, title: string, description = '') {
  return `<div class="modal-heading"><span class="eyebrow">${label}</span><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>`;
}
function openModal(name: string) {
  if (arena.outcome === 'active' && !['settings', 'guide', 'retreat'].includes(name)) {
    toast('Finish or leave the encounter first.');
    return;
  }
  if (!modal) previousFocus = document.activeElement as HTMLElement;
  modal = name;
  keys.clear();
  activePointers.clear();
  arena.target = null;
  pendingLandmark = '';
  const s = stats(player);
  const region = REGIONS[player.region];
  let body = '';
  if (name === 'character')
    body = `${heading('THE LAST EMBERBEARER', 'Lyra Ashveil', 'A light is only lost when no one carries it.')}<div class="character-showcase"><img src="${art.hero}" alt="Lyra in dark armor, carrying her sword and orange scarf"/><div><b>${player.level}</b><span>LEVEL</span><small>${player.xp} / ${xpNeeded(player.level)} XP</small></div></div><div class="character-stats">${[
      ['heart', 'Maximum health', s.hp],
      ['sword', 'Attack power', s.power],
      ['shield', 'Defense', Math.floor(s.defense)],
      ['flag', 'Echoes released', player.wins],
    ]
      .map(
        ([glyph, label, value]) =>
          `<div>${icon(String(glyph))}<span>${label}</span><b>${value}</b></div>`,
      )
      .join(
        '',
      )}</div><div class="equipment"><p>${icon('sword')} Embersteel blade <b>+${player.weapon}</b></p><p>${icon('shield')} Ashveil mantle <b>+${player.armor}</b></p></div><button class="primary full" data-action="forge">Strengthen your equipment ${icon('arrow')}</button>`;
  if (name === 'forge')
    body = `${heading('STRENGTH THAT STAYS WITH YOU', 'The ember forge', 'No chance rolls. No lost upgrades. Every journey leaves you stronger.')}<div class="balance"><span>Your gold</span><b>${icon('coin')} ${player.gold}</b></div>${(['weapon', 'armor'] as const).map((slot) => `<div class="upgrade-row"><div class="equipment-icon">${icon(slot === 'weapon' ? 'sword' : 'shield')}</div><div><h3>${slot === 'weapon' ? 'Embersteel blade' : 'Ashveil mantle'} +${player[slot]}</h3><p>${slot === 'weapon' ? '+5 attack power' : '+2 damage reduction'} per upgrade</p></div><button class="secondary" data-upgrade="${slot}" ${player[slot] >= 25 || player.gold < forgeCost(player[slot]) ? 'disabled' : ''}>${player[slot] >= 25 ? 'MAX' : `${forgeCost(player[slot])} G`}</button></div>`).join('')}<p class="muted">Hunt wandering echoes as often as you like. Earlier regions keep their original difficulty.</p>`;
  if (name === 'satchel')
    body = `${heading('FOR THE ROAD AHEAD', 'Your satchel', 'A little preparation goes a long way.')}<div class="inventory-row"><div class="equipment-icon">${icon('potion')}</div><div><h3>Moonwell tonic <b>×${player.tonics}</b></h3><p>Restores 65% of your maximum health.</p></div></div><div class="info-box">Health ${Math.ceil(player.hp)} / ${s.hp} · Gold ${player.gold}</div><button class="primary full" data-action="drink" ${player.hp >= s.hp || player.tonics < 1 ? 'disabled' : ''}>Drink a tonic ${icon('heart')}</button><button class="secondary full" data-action="buy-tonic" ${player.gold < 20 || player.tonics >= 99 ? 'disabled' : ''}>Buy a tonic <span>20 G</span></button><p class="muted">Equipment is always equipped. Rest at the sanctuary to restore health and focus for free.</p>`;
  if (name === 'journal')
    body = `${heading('A WORLD WAITING TO REMEMBER', 'The ember chronicle', 'Three sleeping wardens. Three fragments of a forgotten dawn.')}<div class="journal-list">${REGIONS.map((r, i) => `<article><span class="chapter-number">${player.wardens > i ? '✓' : `0${i + 1}`}</span><div><span class="eyebrow">${r.short}</span><h3>${r.chapter}</h3><p>Awaken ${r.boss}.</p><small>${player.wardens > i ? 'Complete · light restored' : player.wardens === i ? 'Current quest · recommended level ' + r.level : 'Awaiting the previous light'}</small></div></article>`).join('')}</div><div class="info-box">${player.memories.length} / 3 memories recovered · ${player.wins} echoes released</div><button class="secondary full" data-action="prologue">Replay the prologue ${icon('book')}</button>`;
  if (name === 'atlas')
    body = `${heading('FOLLOW THE OLD ROADS', 'A world beyond the veil', 'Fast travel is free. Your strength travels with you.')}<div class="destinations">${REGIONS.map((r, i) => `<button class="destination zone-${i}" data-travel="${i}" ${i > player.wardens ? 'disabled' : ''}><span>0${i + 1}</span><div><small>${i > player.wardens ? 'AWAKEN THE PREVIOUS WARDEN' : player.region === i ? 'YOU ARE HERE' : 'WAYPOINT AWAKENED'}</small><h3>${r.name}</h3><p>${r.chapter}</p></div>${icon(i > player.wardens ? 'shield' : 'arrow')}</button>`).join('')}</div><p class="muted">Awakened wardens return with 35% more health. Normal echoes stay at fixed strength, so grinding always matters.</p>`;
  if (name === 'memory')
    body = `${heading('A FRAGMENT OF THE OLD WORLD', 'The stones remember.')}<div class="memory-glyph">✧</div><blockquote>${region.lore}</blockquote><p class="muted">Memory recorded in your journal. First discovery grants ${40 + player.region * 30} experience.</p><button class="primary full" data-action="close">Carry it with you ${icon('arrow')}</button>`;
  if (name === 'warden')
    body = `${heading('BEYOND THE MOONLIT GATE', region.boss, 'An ancient presence stirs. The air becomes very still.')}<div class="warden-preview"><img src="${art.warden}" alt="A moonlit stag warden with immense flowering antlers"/></div><div class="info-box">Recommended: level ${region.level}+ and upgraded equipment.<br>Read the marked ground. Dodge through danger. Solar Flare builds stagger.</div><button class="primary full" data-action="challenge">Step beyond the veil ${icon('sword')}</button><button class="secondary full" data-action="close">Prepare a little longer</button>`;
  if (name === 'settings')
    body = `${heading('YOUR ADVENTURE, YOUR PACE', 'Make yourself at home.')} ${(['music', 'effects', 'reducedMotion'] as const).map((key, i) => `<div class="setting-row"><span><b>${['Music', 'Sound effects', 'Reduced motion'][i]}</b><small>${['Ambient and battle score', 'Spells, swords, and moments of discovery', 'Still artwork and gentler effects'][i]}</small></span><button class="toggle ${settings[key] ? 'on' : ''}" role="switch" aria-checked="${settings[key]}" aria-label="${['Music', 'Sound effects', 'Reduced motion'][i]}" data-setting="${key}"><i></i></button></div>`).join('')}<label class="setting-row"><span><b>Volume</b><small>Music and effects</small></span><input type="range" id="volume" min="0" max="1" step="0.05" value="${settings.volume}" aria-label="Volume"/></label><label class="setting-row"><span><b>Difficulty</b><small>Heroic enemies deal 30% more damage</small></span><select id="difficulty" aria-label="Difficulty" ${arena.outcome === 'active' ? 'disabled' : ''}><option value="adventurer" ${settings.difficulty === 'adventurer' ? 'selected' : ''}>Adventurer</option><option value="heroic" ${settings.difficulty === 'heroic' ? 'selected' : ''}>Heroic</option></select></label><div class="save-actions"><button class="secondary" data-action="export" ${arena.outcome === 'active' ? 'disabled' : ''}>${icon('save')} Export save</button><button class="secondary" data-action="import" ${arena.outcome === 'active' ? 'disabled' : ''}>${icon('bag')} Import save</button></div><p class="muted">Echoes of the Moon has its own save. Your original Emberfall adventure is separate.</p><button class="danger-link" data-action="new-game" ${arena.outcome === 'active' ? 'disabled' : ''}>Begin a new journey</button>`;
  if (name === 'new-game')
    body = `${heading('A NEW BEGINNING', 'Leave this journey behind?', 'This replaces only your Echoes of the Moon save. Export a backup if you want to return.')}<button class="secondary full" data-action="export">Export current save ${icon('save')}</button><button class="primary full" data-action="reset">Begin a new journey ${icon('arrow')}</button><button class="secondary full" data-action="close">Keep my adventure</button>`;
  if (name === 'retreat')
    body = `${heading('LIVE TO CARRY THE LIGHT', 'Return to the sanctuary?', arena.enemy?.boss ? 'Leaving a warden costs up to 10 gold. Your experience and equipment are safe.' : 'You can leave this encounter freely. Your health remains as it is.')}<button class="primary full" data-action="withdraw">Return to sanctuary ${icon('arrow')}</button><button class="secondary full" data-action="close">Continue the encounter</button>`;
  if (name === 'guide')
    body = `${heading('A WANDERER’S FIELD GUIDE', 'Learn the rhythm.', 'Every enemy tells you what comes next. Watch, move, and make your moment.')}<div class="guide-grid"><div>${icon('compass')}<h3>Find your own way</h3><p>Move with WASD or the arrow keys, or click the ground. Click a marker to walk over and interact. E interacts with nearby discoveries.</p></div><div>${icon('sword')}<h3>Strike & cast</h3><p>Hold J or the Emberblade button for repeated attacks. Your blade aims at the enemy. Q casts Solar Flare for 25 focus. Focus regenerates naturally.</p></div><div>${icon('spark')}<h3>Step through danger</h3><p>Space dodges in your movement direction, with brief invulnerability. Leave glowing circles before they burst. Avoid the marked line of a charge.</p></div><div>${icon('fire')}<h3>Grow at your pace</h3><p>R uses a tonic. Rest freely at the sanctuary. Hunt echoes for gold and experience, then upgrade at the forge. Escape pauses the game; menus pause combat.</p></div></div><div class="info-box">Defeat costs at most 30 gold. Your levels and equipment are permanent. Raise Lyra to level 99, and revisit earlier enemies to feel your strength.</div><button class="primary full" data-action="close">Carry the light ${icon('arrow')}</button>`;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop"><section class="modal ${name === 'guide' ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${name}"><button class="modal-close icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button>${body}</section></div>`;
  $('main').inert = true;
  $('.topbar').inert = true;
  setTimeout(
    () => $('#modal-root').querySelector<HTMLButtonElement>('button:not([disabled])')?.focus(),
    0,
  );
}
function closeModal() {
  modal = '';
  $('#modal-root').innerHTML = '';
  $('main').inert = false;
  $('.topbar').inert = false;
  keys.clear();
  activePointers.clear();
  previousFocus?.focus();
  previousFocus = null;
}
function playStory(id: string) {
  if (arena.outcome === 'active') return;
  closeModal();
  storyId = id;
  storyIndex = 0;
  modal = 'story';
  drawStory();
}
function drawStory() {
  const story = STORIES[storyId];
  $('main').inert = true;
  $('.topbar').inert = true;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop cinematic-backdrop"><section class="cinematic" role="dialog" aria-modal="true" aria-label="${story.title}"><img class="cinematic-art" src="${storyId === 'crown' ? art.dawn : art.moon}" alt="Lyra carries a warm ember through a luminous illustrated fantasy world"/><div class="cinematic-shade"></div><div class="cinematic-heading"><span>${icon('spark')} ECHOES OF THE MOON</span><button class="subtle-button" data-action="skip-story">Skip scene ${icon('chevron')}</button></div><div class="dialogue"><span class="eyebrow">${storyIndex === 0 ? story.title : story.speaker}</span><p>${story.lines[storyIndex]}</p><div class="dialogue-footer"><span>${story.lines.map((_, i) => `<i class="${i === storyIndex ? 'current' : ''}"></i>`).join('')}</span><button class="primary" data-action="next-story">${storyIndex === story.lines.length - 1 ? 'Carry the light' : 'Continue'} ${icon('arrow')}</button></div></div></section></div>`;
  setTimeout(() => $('[data-action="next-story"]').focus(), 0);
}
function endStory() {
  if (!player.seen.includes(storyId)) player.seen.push(storyId);
  closeModal();
  save();
  if (storyId === 'crown') setView('sanctuary');
  else if (storyThenTravel) {
    storyThenTravel = false;
    openModal('atlas');
  }
}
function doAbility(action: Action) {
  if (modal || paused) return;
  if (act(player, arena, action)) {
    audio.sfx(
      action === 'flare'
        ? 'magic'
        : action === 'tonic'
          ? 'heal'
          : action === 'strike'
            ? 'hit'
            : 'step',
    );
    updateVitals();
  }
}
async function handle(action: string) {
  void unlockAudio();
  audio.sfx('click');
  if (
    [
      'character',
      'forge',
      'satchel',
      'journal',
      'atlas',
      'settings',
      'guide',
      'memory',
      'warden',
      'new-game',
      'retreat',
    ].includes(action)
  ) {
    openModal(action);
    return;
  }
  switch (action) {
    case 'close':
      closeModal();
      break;
    case 'explore':
      if (arena.outcome !== 'active') setView('explore');
      else canvas.focus({ preventScroll: true });
      break;
    case 'sanctuary':
      if (arena.outcome === 'active') openModal('retreat');
      else {
        arena = createArena();
        setView('sanctuary');
        save();
      }
      break;
    case 'rest':
      if (arena.outcome === 'active') {
        toast('Leave the encounter before resting.');
        break;
      }
      rest(player);
      arena = createArena();
      setView('sanctuary');
      closeModal();
      save();
      refresh();
      audio.sfx('heal');
      toast('Health and focus restored. The fire will always be here.');
      break;
    case 'hunt':
      startEncounter(false);
      break;
    case 'challenge':
      startEncounter(true);
      break;
    case 'onward':
      endEncounter();
      break;
    case 'prologue':
      playStory('prologue');
      break;
    case 'next-story':
      if (++storyIndex < STORIES[storyId].lines.length) drawStory();
      else endStory();
      break;
    case 'skip-story':
      endStory();
      break;
    case 'music':
      settings.music = !settings.music;
      syncSettings();
      save();
      break;
    case 'pause':
      paused = !paused;
      keys.clear();
      activePointers.clear();
      $('#pause-screen').hidden = !paused;
      $('#pause-button').textContent = paused ? '▷ Resume' : 'Ⅱ Pause';
      break;
    case 'drink':
      if (arena.outcome === 'active') break;
      if (useTonic(player)) {
        save();
        refresh();
        openModal('satchel');
        audio.sfx('heal');
      }
      break;
    case 'buy-tonic':
      if (arena.outcome === 'active') break;
      if (buyTonic(player)) {
        save();
        refresh();
        openModal('satchel');
        toast('A moonwell tonic is tucked into your satchel.');
      }
      break;
    case 'withdraw':
      if (arena.outcome === 'active') {
        if (arena.enemy?.boss) player.gold = Math.max(0, player.gold - 10);
        arena.outcome = 'exploring';
        closeModal();
        endEncounter();
      }
      break;
    case 'export': {
      if (arena.outcome === 'active') break;
      const url = URL.createObjectURL(
        new Blob([serialize(player, settings)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `emberfall-echoes-level-${player.level}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Your journey is safely exported.');
      break;
    }
    case 'import':
      if (arena.outcome !== 'active') $<HTMLInputElement>('#save-file').click();
      break;
    case 'reset':
      if (arena.outcome === 'active') break;
      player = newPlayer();
      arena = createArena();
      closeModal();
      setView('sanctuary');
      save();
      playStory('prologue');
      break;
  }
}
document.addEventListener('click', (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.action) void handle(button.dataset.action);
  if (button.dataset.ability) {
    void unlockAudio();
    doAbility(button.dataset.ability as Action);
    canvas.focus({ preventScroll: true });
  }
  if (button.dataset.landmark && arena.outcome === 'exploring') {
    const landmark = landmarks.find((l) => l.id === button.dataset.landmark)!;
    if (distance(arena.hero, landmark) < 85) interactLandmark(landmark.id);
    else {
      arena.target = landmark;
      pendingLandmark = landmark.id;
      toast('Following the old stones…');
    }
  }
  if (button.dataset.upgrade && arena.outcome !== 'active') {
    if (upgrade(player, button.dataset.upgrade as 'weapon' | 'armor')) {
      save();
      refresh();
      openModal('forge');
      audio.sfx('heal');
    }
  }
  if (button.dataset.setting) {
    const field = button.dataset.setting as 'music' | 'effects' | 'reducedMotion';
    settings[field] = !settings[field];
    void unlockAudio();
    syncSettings();
    save();
    openModal('settings');
  }
  if (button.dataset.travel !== undefined && arena.outcome !== 'active') {
    const next = Number(button.dataset.travel) as RegionId;
    if (next > player.wardens || next > 2) return;
    player.region = next;
    arena = createArena();
    closeModal();
    setView('sanctuary');
    save();
    toast(`Arrived at ${REGIONS[next].name}.`);
  }
});
document.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'volume') {
    settings.volume = Number(input.value);
    syncSettings();
    save();
  }
});
document.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'difficulty' && arena.outcome !== 'active') {
    settings.difficulty = input.value as 'adventurer' | 'heroic';
    save();
  }
  if (input.id === 'save-file' && input.files?.[0] && arena.outcome !== 'active') {
    try {
      if (input.files[0].size > 100_000) throw new Error('The save file is too large.');
      const result = parseSave(await input.files[0].text());
      player = result.player;
      settings = result.settings;
      arena = createArena();
      closeModal();
      syncSettings();
      setView('sanctuary');
      save();
      toast('Your journey is restored. Welcome back.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not read this save.');
    }
    input.value = '';
  }
});
const directions: Record<string, Point> = {
  w: { x: 0, y: -1 },
  arrowup: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  arrowdown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  arrowleft: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  arrowright: { x: 1, y: 0 },
};
const actionKeys: Record<string, Action> = { j: 'strike', q: 'flare', ' ': 'dash', r: 'tonic' };
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (modal) {
    if (key === 'escape') {
      e.preventDefault();
      modal === 'story' ? endStory() : closeModal();
    }
    if (key === 'tab') {
      const elements = [
        ...$('#modal-root').querySelectorAll<HTMLElement>('button:not([disabled]),input,select'),
      ];
      if (e.shiftKey && document.activeElement === elements[0]) {
        e.preventDefault();
        elements.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === elements.at(-1)) {
        e.preventDefault();
        elements[0]?.focus();
      }
    }
    return;
  }
  if ((e.target as HTMLElement).matches('input,select,textarea')) return;
  if (key === 'escape' && !e.repeat) {
    if (view === 'explore') void handle('pause');
    else openModal('settings');
    return;
  }
  if (paused) return;
  if (directions[key] || (actionKeys[key] && view === 'explore')) {
    if (key === ' ' && (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    void unlockAudio();
    keys.add(key);
  }
  if (!e.repeat && key === 'e' && view === 'explore' && arena.outcome === 'exploring') {
    const nearby = landmarks.find((l) => distance(arena.hero, l) < 100);
    if (nearby) interactLandmark(nearby.id);
    else toast('Move closer to a glowing marker.');
  }
  if (!e.repeat && key === 'i') openModal('satchel');
  if (!e.repeat && key === 'm') openModal('atlas');
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
document.addEventListener('pointerdown', (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>(
    '[data-direction],[data-ability]',
  );
  if (!button || button.disabled || modal || paused) return;
  e.preventDefault();
  const direction = button.dataset.direction;
  const ability = button.dataset.ability as Action | undefined;
  activePointers.set(e.pointerId, { direction, ability });
  if (e.isTrusted) button.setPointerCapture(e.pointerId);
  if (direction) pendingLandmark = '';
  if (ability) doAbility(ability);
  void unlockAudio();
});
// Releasing one finger must not cancel another finger's movement or attack.
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
  document.addEventListener(event, (e) => activePointers.delete(e.pointerId));
function clearInput() {
  keys.clear();
  activePointers.clear();
  if (arena.outcome === 'active') {
    paused = true;
    $('#pause-screen').hidden = false;
    $('#pause-button').textContent = '▷ Resume';
  }
  save();
}
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});
window.addEventListener('pagehide', save);
canvas.addEventListener('pointerdown', (e) => {
  if (modal || paused || ['won', 'lost'].includes(arena.outcome)) return;
  void unlockAudio();
  canvas.focus({ preventScroll: true });
  const bounds = canvas.getBoundingClientRect();
  arena.target = {
    x: Math.max(95, Math.min(905, ((e.clientX - bounds.left) / bounds.width) * 1000)),
    y: Math.max(335, Math.min(525, ((e.clientY - bounds.top) / bounds.height) * 600)),
  };
  pendingLandmark = '';
});
let previousTime = 0;
let hudTime = 0;
function loop(time: number) {
  const dt = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
  previousTime = time;
  hudTime += dt;
  if (view === 'explore' && renderer && !document.hidden) {
    if (!modal && !paused) {
      let movement = { x: 0, y: 0 };
      for (const key of keys)
        if (directions[key]) {
          movement.x += directions[key].x;
          movement.y += directions[key].y;
          pendingLandmark = '';
        }
      for (const key of keys) if (actionKeys[key]) doAbility(actionKeys[key]);
      for (const input of activePointers.values()) {
        if (input.direction && directions[input.direction]) {
          movement.x += directions[input.direction].x;
          movement.y += directions[input.direction].y;
          pendingLandmark = '';
        }
        if (input.ability) doAbility(input.ability);
      }
      step(player, arena, dt, movement, settings);
      if ((arena.outcome === 'won' || arena.outcome === 'lost') && !arena.rewardClaimed) outcome();
      if (pendingLandmark && arena.outcome === 'exploring') {
        const landmark = landmarks.find((l) => l.id === pendingLandmark)!;
        if (distance(arena.hero, landmark) < 65) interactLandmark(landmark.id);
      }
    }
    renderer.draw(player, arena, settings, time);
  }
  if (hudTime > 0.12) {
    hudTime = 0;
    updateVitals();
  }
  if (Date.now() - lastSave > 15000 && arena.outcome !== 'active') save();
  requestAnimationFrame(loop);
}
syncSettings();
refresh();
save();
requestAnimationFrame(loop);
Promise.all([loadImage(art.clearing), loadImage(art.hero), loadImage(art.warden)])
  .then(([clearing, hero, warden]) => {
    renderer = new Renderer(canvas, { clearing, hero, warden });
    document.documentElement.dataset.artReady = 'true';
  })
  .catch(() => toast('Some artwork could not load. Refresh the page to try again.'));
