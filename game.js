const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const radarCanvas = document.getElementById('radarCanvas');
const radarCtx = radarCanvas.getContext('2d');

const ui = {
  depth: document.getElementById('depthStat'),
  hull: document.getElementById('hullStat'),
  fuel: document.getElementById('fuelStat'),
  oxygen: document.getElementById('oxygenStat'),
  light: document.getElementById('lightStat'),
  cave: document.getElementById('caveLevelStat'),
  sub: document.getElementById('currentSubStat'),
  gold: document.getElementById('goldStat'),
  scrap: document.getElementById('scrapStat'),
  artifacts: document.getElementById('artifactStat'),
  currentWeapon: document.getElementById('weaponDisplay'),
  monsterList: document.getElementById('monsterList'),
  weaponGuide: document.getElementById('weaponGuide'),
  lightList: document.getElementById('lightUpgradeList'),
  weaponUpgradeList: document.getElementById('weaponUpgradeList'),
  gameMode: document.getElementById('gameMode'),
  toggleInteriorBtn: document.getElementById('toggleInteriorBtn'),
  surfaceBtn: document.getElementById('surfaceBtn'),
  dockBtn: document.getElementById('dockBtn'),
  toggleLightBtn: document.getElementById('toggleLightBtn')
};

const keys = {};
const TAU = Math.PI * 2;

const world = {
  width: 3600,
  height: 2600,
  baseX: 450,
  baseY: 2200,
  cameraX: 0,
  cameraY: 0,
  message: 'Sub launch successful. Depth scanners online.',
  depthLevel: 0,
  caveWalls: [],
  cavePaths: []
};

const game = {
  mode: 'exploring',
  gold: 260,
  scrap: 50,
  artifacts: 0,
  lightOn: true,
  flashPower: 0,
  messageTimer: 0,
  player: {
    x: world.baseX,
    y: world.baseY,
    w: 30,
    h: 18,
    speed: 2.7,
    fuel: 100,
    oxygen: 100,
    hull: 100,
    light: 100,
    interactionRange: 80,
    facing: 1,
    activeWeapon: 0,
    weaponCooldown: 0,
    inventory: ['Repair Kit', 'Cave Map', 'Signal Flare', 'Torpedo Key'],
    currentSub: 'Scout-class',
    inside: false,
    radarRange: 260,
    lightRadius: 180
  },
  upgrades: {
    hull: 0,
    fuel: 0,
    light: 0,
    radar: 0,
    weapon: 0,
    engine: 0
  },
  weapons: [
    { name: 'Burst Cannon', damage: 18, ammo: Infinity, fireRate: 0.28, color: '#ffff00', key: '1' },
    { name: 'Harpoon', damage: 34, ammo: 14, fireRate: 0.52, color: '#00d9ff', key: '2' },
    { name: 'Torpedo', damage: 60, ammo: 6, fireRate: 0.8, color: '#ff66ff', key: '3' },
    { name: 'EMP Pulse', damage: 24, ammo: 12, fireRate: 0.46, color: '#00ff88', key: '4' }
  ],
  enemies: [],
  loot: [],
  projectiles: [],
  monsterTypes: [
    { name: 'Rift Eel', threat: 'Low', color: '#7de2ff', speed: 1.0, health: 28, damage: 8 },
    { name: 'Bone Drake', threat: 'Medium', color: '#ffa500', speed: 1.25, health: 48, damage: 14 },
    { name: 'Glass Manta', threat: 'Medium', color: '#9df9ef', speed: 1.4, health: 42, damage: 13 },
    { name: 'Abyss Stalker', threat: 'High', color: '#ff5a5a', speed: 1.55, health: 52, damage: 18 },
    { name: 'Lurker Crab', threat: 'Medium', color: '#b6ff70', speed: 0.9, health: 60, damage: 16 },
    { name: 'Warden Serpent', threat: 'Extreme', color: '#ff7b7b', speed: 1.8, health: 82, damage: 24 }
  ],
  upgradeDefs: [
    { id: 'light', name: 'Flashlight Boost', cost: 120, desc: '+20 light range', type: 'light' },
    { id: 'radar', name: 'Radar Array', cost: 140, desc: '+25 radar range', type: 'radar' },
    { id: 'hull', name: 'Hull Plates', cost: 150, desc: '+15 hull max', type: 'hull' },
    { id: 'fuel', name: 'Fuel Cells', cost: 110, desc: '+18 fuel reserve', type: 'fuel' },
    { id: 'weapon', name: 'Weapon Core', cost: 180, desc: '+12% weapon damage', type: 'weapon' },
    { id: 'engine', name: 'Engine Tuned', cost: 160, desc: '+10% speed', type: 'engine' }
  ],
  depthZones: [
    { min: 0, max: 150, name: 'Surface Shelf' },
    { min: 150, max: 350, name: 'Blue Drift' },
    { min: 350, max: 650, name: 'Dark Current' },
    { min: 650, max: 1000, name: 'Glass Ruins' },
    { min: 1000, max: 1500, name: 'Abyss Cave' },
    { min: 1500, max: 2200, name: 'Null Bell' },
    { min: 2200, max: 3000, name: 'Crush Depth' }
  ]
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDepthZoneName(depth) {
  const zone = game.depthZones.find(z => depth >= z.min && depth < z.max);
  return zone ? zone.name : 'Crush Depth';
}

function rectHitCircle(rect, circle) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return (dx * dx + dy * dy) < (circle.r * circle.r);
}

function createCaveSystem() {
  world.caveWalls = [];
  const matrix = [];
  for (let y = 0; y < 18; y++) {
    const row = [];
    for (let x = 0; x < 22; x++) row.push(0);
    matrix.push(row);
  }

  for (let i = 0; i < 28; i++) {
    const x = Math.floor(Math.random() * 20) + 1;
    const y = Math.floor(Math.random() * 16) + 1;
    const w = Math.floor(Math.random() * 4) + 2;
    const h = Math.floor(Math.random() * 4) + 2;
    for (let yy = y; yy < Math.min(18, y + h); yy++) {
      for (let xx = x; xx < Math.min(22, x + w); xx++) {
        matrix[yy][xx] = 1;
      }
    }
  }

  const cellW = world.width / 22;
  const cellH = world.height / 18;
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 22; x++) {
      if (matrix[y][x] === 1) {
        world.caveWalls.push({
          x: x * cellW,
          y: y * cellH,
          w: cellW,
          h: cellH
        });
      }
    }
  }

  const pathCount = 6;
  for (let i = 0; i < pathCount; i++) {
    world.cavePaths.push({
      x: randomBetween(500, world.width - 500),
      y: randomBetween(300, world.height - 300),
      w: randomBetween(70, 180),
      h: randomBetween(70, 180)
    });
  }
}

function spawnEnemy(typeName) {
  const types = game.monsterTypes;
  const base = typeName ? types.find(t => t.name === typeName) || types[0] : types[Math.floor(Math.random() * types.length)];
  const x = randomBetween(200, world.width - 200);
  const y = randomBetween(220, world.height - 200);
  game.enemies.push({
    name: base.name,
    color: base.color,
    threat: base.threat,
    speed: base.speed,
    health: base.health,
    maxHealth: base.health,
    damage: base.damage,
    x,
    y,
    w: 26,
    h: 26,
    cooldown: 0,
    dx: randomBetween(-1, 1),
    dy: randomBetween(-1, 1)
  });
}

function createLoot(x, y, type = 'gold') {
  game.loot.push({
    x,
    y,
    w: 10,
    h: 10,
    type,
    value: type === 'gold' ? randomBetween(8, 24) : randomBetween(3, 9),
    bob: Math.random() * 1000
  });
}

function populateWorld() {
  game.enemies = [];
  game.loot = [];
  createCaveSystem();

  for (let i = 0; i < 22; i++) spawnEnemy();
  for (let i = 0; i < 40; i++) {
    createLoot(randomBetween(140, world.width - 140), randomBetween(180, world.height - 180), Math.random() < 0.75 ? 'gold' : 'scrap');
  }
}

function updateUI() {
  const player = game.player;
  const weapon = game.weapons[player.activeWeapon];
  const zone = getDepthZoneName(world.depthLevel);

  ui.depth.textContent = `${Math.floor(world.depthLevel)}m`;
  ui.hull.textContent = `${Math.round(player.hull)}%`;
  ui.fuel.textContent = `${Math.round(player.fuel)}%`;
  ui.oxygen.textContent = `${Math.round(player.oxygen)}%`;
  ui.light.textContent = `${Math.round(player.light)}%`;
  ui.cave.textContent = zone;
  ui.sub.textContent = player.currentSub;
  ui.gold.textContent = Math.floor(game.gold);
  ui.scrap.textContent = Math.floor(game.scrap);
  ui.artifacts.textContent = Math.floor(game.artifacts);
  ui.gameMode.textContent = `MODE: ${game.mode.toUpperCase()}`;

  ui.currentWeapon.innerHTML = `
    <div class="weapon-entry">
      <strong>${weapon.name}</strong><br>
      Damage: ${weapon.damage}<br>
      Ammo: ${weapon.ammo === Infinity ? '∞' : weapon.ammo}<br>
      Fire Rate: ${(1 / weapon.fireRate).toFixed(1)}/s
    </div>
  `;

  ui.weaponGuide.innerHTML = game.weapons.map((w, index) => `
    <div class="weapon-entry">
      <strong>${index + 1}. ${w.name}</strong><br>
      Damage: ${w.damage}<br>
      Ammo: ${w.ammo === Infinity ? '∞' : w.ammo}
    </div>
  `).join('');

  ui.monsterList.innerHTML = game.monsterTypes.map(monster => `
    <div class="monster-entry">
      <strong>${monster.name}</strong><br>
      Threat: ${monster.threat}<br>
      Health: ${monster.health}<br>
      Damage: ${monster.damage}
    </div>
  `).join('');

  ui.lightList.innerHTML = [
    { id: 'light', name: 'Flashlight Boost', desc: '+20 light radius' },
    { id: 'radar', name: 'Radar Array', desc: '+25 radar range' }
  ].map(item => `
    <div class="upgrade-item">
      <strong>${item.name}</strong><br>
      ${item.desc}<br>
      <button data-upgrade="${item.id}">Upgrade</button>
    </div>
  `).join('');

  ui.weaponUpgradeList.innerHTML = [
    { id: 'weapon', name: 'Weapon Core', desc: '+12% damage' },
    { id: 'engine', name: 'Engine Tuned', desc: '+10% speed' },
    { id: 'hull', name: 'Hull Plates', desc: '+15 hull max' },
    { id: 'fuel', name: 'Fuel Cells', desc: '+18 fuel reserve' }
  ].map(item => `
    <div class="upgrade-item">
      <strong>${item.name}</strong><br>
      ${item.desc}<br>
      <button data-upgrade="${item.id}">Upgrade</button>
    </div>
  `).join('');

  ui.toggleLightBtn.textContent = game.lightOn ? 'Toggle Light (L) ON' : 'Toggle Light (L) OFF';
}

function applyUpgrade(type) {
  const cost = {
    light: 120,
    radar: 140,
    hull: 150,
    fuel: 110,
    weapon: 180,
    engine: 160
  }[type] || 80;

  if (game.gold < cost) {
    world.message = 'Not enough gold for that upgrade.';
    return;
  }

  game.gold -= cost;

  if (type === 'light') game.upgrades.light++;
  if (type === 'radar') game.upgrades.radar++;
  if (type === 'hull') game.upgrades.hull++;
  if (type === 'fuel') game.upgrades.fuel++;
  if (type === 'weapon') game.upgrades.weapon++;
  if (type === 'engine') game.upgrades.engine++;

  if (type === 'light') game.player.lightRadius = 170 + game.upgrades.light * 26;
  if (type === 'radar') game.player.radarRange = 260 + game.upgrades.radar * 35;
  if (type === 'hull') game.player.hull = clamp(game.player.hull + 12, 0, 100 + game.upgrades.hull * 15);
  if (type === 'fuel') game.player.fuel = clamp(game.player.fuel + 18, 0, 100 + game.upgrades.fuel * 12);
  if (type === 'energy') game.player.light = clamp(game.player.light + 10, 0, 100);

  world.message = `${type.toUpperCase()} upgraded.`;
}

function movePlayer(dt) {
  const player = game.player;
  let dx = 0;
  let dy = 0;

  if (keys['ArrowLeft'] || keys['a']) dx -= 1;
  if (keys['ArrowRight'] || keys['d']) dx += 1;
  if (keys['ArrowUp'] || keys['w']) dy -= 1;
  if (keys['ArrowDown'] || keys['s']) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    const speedBoost = 1 + game.upgrades.engine * 0.08;
    const moveX = (dx / len) * player.speed * speedBoost * dt * 60;
    const moveY = (dy / len) * player.speed * speedBoost * dt * 60;

    const nextX = player.x + moveX;
    const nextY = player.y + moveY;

    if (!collidesWithWall(nextX, player.y, player.w, player.h)) player.x = nextX;
    if (!collidesWithWall(player.x, nextY, player.w, player.h)) player.y = nextY;

    player.facing = dx >= 0 ? 1 : -1;
  }

  player.x = clamp(player.x, 30, world.width - 30);
  player.y = clamp(player.y, 30, world.height - 30);

  const distToBase = Math.hypot(player.x - world.baseX, player.y - world.baseY);
  if (distToBase < 120) {
    if (game.mode !== 'docked') game.mode = 'base';
  }

  if (game.mode === 'docked') {
    player.x = world.baseX + 35;
    player.y = world.baseY + 18;
  }

  world.depthLevel = Math.max(0, Math.floor((world.height - player.y) / 8));
  player.light = clamp(player.light - 0.04 * dt * 60, 0, 100);
  player.fuel = clamp(player.fuel - 0.015 * dt * 60, 0, 100);
  player.oxygen = clamp(player.oxygen - 0.018 * dt * 60, 0, 100);

  if (player.fuel <= 0) {
    player.hull = clamp(player.hull - 0.18 * dt * 60, 0, 100);
  }
  if (player.oxygen <= 0) {
    player.hull = clamp(player.hull - 0.25 * dt * 60, 0, 100);
  }

  if (player.hull <= 0) {
    player.hull = 100;
    player.x = world.baseX;
    player.y = world.baseY;
    world.message = 'Hull failure. Returning to base.';
  }

  world.cameraX = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  world.cameraY = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function collidesWithWall(x, y, w, h) {
  for (const wall of world.caveWalls) {
    const overlap = !(x + w < wall.x || x > wall.x + wall.w || y + h < wall.y || y > wall.y + wall.h);
    if (overlap) return true;
  }
  return false;
}

function updateEnemyAI(dt) {
  for (const enemy of game.enemies) {
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 180) {
      enemy.x += (dx / dist) * enemy.speed * dt * 60;
      enemy.y += (dy / dist) * enemy.speed * dt * 60;
    } else {
      enemy.x += enemy.dx * enemy.speed * dt * 60;
      enemy.y += enemy.dy * enemy.speed * dt * 60;
    }

    if (enemy.x < 40 || enemy.x > world.width - 40) enemy.dx *= -1;
    if (enemy.y < 40 || enemy.y > world.height - 40) enemy.dy *= -1;

    if (!collidesWithWall(enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h)) {
      enemy.x = clamp(enemy.x, 0, world.width);
      enemy.y = clamp(enemy.y, 0, world.height);
    } else {
      enemy.x -= enemy.dx * 2;
      enemy.y -= enemy.dy * 2;
    }

    if (dist < 28) {
      game.player.hull = clamp(game.player.hull - enemy.damage * dt * 0.15, 0, 100);
      world.message = `${enemy.name} hit your hull.`;
    }
  }
}

function fireWeapon() {
  const player = game.player;
  const weapon = game.weapons[player.activeWeapon];

  if (player.weaponCooldown > 0) return;
  if (weapon.ammo !== Infinity && weapon.ammo <= 0) {
    world.message = `${weapon.name} is empty.`;
    return;
  }

  const damageBonus = 1 + game.upgrades.weapon * 0.12;
  const dir = player.facing >= 0 ? 1 : -1;
  const projectile = {
    x: player.x + dir * 20,
    y: player.y,
    vx: dir * (weapon.name === 'Burst Cannon' ? 8 : 6.5),
    vy: 0,
    damage: weapon.damage * damageBonus,
    color: weapon.color,
    life: weapon.name === 'Torpedo' ? 1.7 : 1.2,
    radius: weapon.name === 'Torpedo' ? 7 : 4
  };

  game.projectiles.push(projectile);
  player.weaponCooldown = weapon.fireRate;

  if (weapon.ammo !== Infinity) weapon.ammo -= 1;
  world.message = `${weapon.name} fired.`;
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.x += projectile.vx * dt * 60;
    projectile.y += projectile.vy * dt * 60;
    projectile.life -= dt;

    for (const enemy of game.enemies) {
      if (Math.abs(projectile.x - enemy.x) < 18 && Math.abs(projectile.y - enemy.y) < 18) {
        enemy.health -= projectile.damage;
        projectile.life = 0;
        if (enemy.health <= 0) {
          game.gold += 28;
          game.scrap += 6;
          world.message = `${enemy.name} neutralized.`;
          enemy.dead = true;
          if (Math.random() < 0.75) createLoot(enemy.x, enemy.y, 'gold');
          if (Math.random() < 0.4) createLoot(enemy.x + 10, enemy.y + 10, 'scrap');
        }
      }
    }
  }

  game.player.weaponCooldown = clamp(game.player.weaponCooldown - dt, 0, 1.2);
  game.projectiles = game.projectiles.filter(p => p.life > 0 && p.x > 0 && p.x < world.width && p.y > 0 && p.y < world.height);
  game.enemies = game.enemies.filter(enemy => !enemy.dead);
}

function collectLoot() {
  for (const item of game.loot) {
    const dist = Math.hypot(game.player.x - item.x, game.player.y - item.y);
    if (dist < 22) {
      if (item.type === 'gold') {
        game.gold += item.value;
        world.message = `Recovered ${Math.round(item.value)} gold.`;
      } else {
        game.scrap += Math.ceil(item.value);
        world.message = `Recovered ${Math.ceil(item.value)} scrap.`;
      }
      item.collected = true;
    }
  }
  game.loot = game.loot.filter(item => !item.collected);
}

function surfaceAndRepair() {
  const dist = Math.hypot(game.player.x - world.baseX, game.player.y - world.baseY);
  if (dist > 140) {
    world.message = 'You need to be near the base to surface.';
    return;
  }

  game.mode = 'base';
  game.player.x = world.baseX;
  game.player.y = world.baseY;
  game.player.fuel = clamp(game.player.fuel + 30, 0, 100 + game.upgrades.fuel * 12);
  game.player.oxygen = clamp(game.player.oxygen + 30, 0, 100);
  game.player.hull = clamp(game.player.hull + 20, 0, 100 + game.upgrades.hull * 15);
  world.message = 'Surfacing. Systems have been repaired.';
}

function dockAtBase() {
  const dist = Math.hypot(game.player.x - world.baseX, game.player.y - world.baseY);
  if (dist > 120) {
    world.message = 'Base is out of docking range.';
    return;
  }
  game.mode = 'docked';
  world.message = 'Docked at station. Interior systems available.';
}

function toggleInterior() {
  if (game.mode === 'docked' || game.mode === 'base') {
    game.player.inside = !game.player.inside;
    game.mode = game.player.inside ? 'interior' : 'exploring';
    world.message = game.player.inside ? 'Inside the submarine. Controls are live.' : 'Back on the exterior deck.';
  } else {
    world.message = 'You need to be docked or at base to enter the interior.';
  }
}

function toggleLight() {
  game.lightOn = !game.lightOn;
  world.message = game.lightOn ? 'Floodlights engaged.' : 'Floodlights dimmed.';
}

function handleKeyDown(event) {
  const key = event.key;
  keys[key] = true;

  if (key === ' ') {
    event.preventDefault();
    fireWeapon();
  }

  if (key === 'e' || key === 'E') toggleInterior();
  if (key === 's' || key === 'S') surfaceAndRepair();
  if (key === 'd' || key === 'D') dockAtBase();
  if (key === 'l' || key === 'L') toggleLight();

  if (key === '1') game.player.activeWeapon = 0;
  if (key === '2') game.player.activeWeapon = 1;
  if (key === '3') game.player.activeWeapon = 2;
  if (key === '4') game.player.activeWeapon = 3;
}

function handleKeyUp(event) {
  keys[event.key] = false;
}

function drawPlayerShadow() {
  const px = game.player.x - world.cameraX;
  const py = game.player.y - world.cameraY;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(px, py + 10, 18, 9, 0, 0, TAU);
  ctx.fill();
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#081a2d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-world.cameraX, -world.cameraY);

  ctx.fillStyle = '#0d2340';
  ctx.fillRect(0, 0, world.width, world.height);

  for (const wall of world.caveWalls) {
    ctx.fillStyle = '#2b4059';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  for (const path of world.cavePaths) {
    ctx.fillStyle = '#1b3b52';
    ctx.fillRect(path.x, path.y, path.w, path.h);
  }

  ctx.fillStyle = '#3b6f69';
  ctx.fillRect(world.baseX - 60, world.baseY - 30, 120, 60);
  ctx.fillStyle = '#85724d';
  ctx.fillRect(world.baseX - 25, world.baseY - 80, 50, 40);

  for (const item of game.loot) {
    ctx.fillStyle = item.type === 'gold' ? '#ffd430' : '#c0c0c0';
    ctx.fillRect(item.x - 5, item.y - 5 + Math.sin(item.bob * 0.01) * 2, 10, 10);
  }

  for (const enemy of game.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(enemy.x - 14, enemy.y - 18, (enemy.health / enemy.maxHealth) * 28, 4);
  }

  for (const projectile of game.projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.fillRect(projectile.x - projectile.radius, projectile.y - projectile.radius, projectile.radius * 2, projectile.radius * 2);
  }

  const p = game.player;
  ctx.fillStyle = '#8fe9ff';
  ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
  ctx.fillStyle = '#dfefff';
  ctx.fillRect(p.x - 9, p.y - 10, 18, 8);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(p.x + (p.facing > 0 ? 8 : -10), p.y - 2, 8, 4);

  ctx.restore();

  drawPlayerShadow();

  if (game.lightOn) {
    const px = p.x - world.cameraX;
    const py = p.y - world.cameraY;
    const radius = p.lightRadius + (game.upgrades.light * 18);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(px, py, 20, px, py, radius);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(2, 3, 10, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawRadar() {
  radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
  radarCtx.fillStyle = '#061722';
  radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

  const scale = 0.08 + game.upgrades.radar * 0.01;
  const cx = radarCanvas.width / 2;
  const cy = radarCanvas.height / 2;

  radarCtx.strokeStyle = '#00ff00';
  radarCtx.lineWidth = 1.2;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 58, 0, TAU);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 38, 0, TAU);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.moveTo(cx, 0);
  radarCtx.lineTo(cx, radarCanvas.height);
  radarCtx.moveTo(0, cy);
  radarCtx.lineTo(radarCanvas.width, cy);
  radarCtx.stroke();

  const baseX = (world.baseX - game.player.x) * scale + cx;
  const baseY = (world.baseY - game.player.y) * scale + cy;
  radarCtx.fillStyle = '#ffdd57';
  radarCtx.fillRect(baseX - 3, baseY - 3, 6, 6);

  for (const enemy of game.enemies) {
    const ex = (enemy.x - game.player.x) * scale + cx;
    const ey = (enemy.y - game.player.y) * scale + cy;
    if (Math.abs(ex - cx) < 100 && Math.abs(ey - cy) < 100) {
      radarCtx.fillStyle = '#ff3b3b';
      radarCtx.fillRect(ex - 2, ey - 2, 4, 4);
    }
  }

  for (const item of game.loot) {
    const ix = (item.x - game.player.x) * scale + cx;
    const iy = (item.y - game.player.y) * scale + cy;
    if (Math.abs(ix - cx) < 110 && Math.abs(iy - cy) < 110) {
      radarCtx.fillStyle = item.type === 'gold' ? '#ffd430' : '#b7c1d1';
      radarCtx.fillRect(ix - 2, iy - 2, 4, 4);
    }
  }

  radarCtx.fillStyle = '#00d9ff';
  radarCtx.fillRect(cx - 3, cy - 3, 6, 6);
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(10, 10, 320, 120);
  ctx.fillStyle = '#dfefff';
  ctx.font = '12px Courier New';
  ctx.fillText(`Depth: ${Math.floor(world.depthLevel)}m`, 20, 32);
  ctx.fillText(`Hull: ${Math.round(game.player.hull)}%`, 20, 52);
  ctx.fillText(`Fuel: ${Math.round(game.player.fuel)}%`, 20, 72);
  ctx.fillText(`Light: ${Math.round(game.player.light)}%`, 20, 92);
  ctx.fillText(`Status: ${world.message}`, 20, 112);
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  movePlayer(dt);
  updateEnemyAI(dt);
  updateProjectiles(dt);
  collectLoot();

  if (game.player.weaponCooldown > 0) game.player.weaponCooldown -= dt;

  drawWorld();
  drawRadar();
  drawHUD();
  updateUI();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('click', (event) => {
  const upgradeBtn = event.target.closest('[data-upgrade]');
  if (upgradeBtn) {
    applyUpgrade(upgradeBtn.dataset.upgrade);
  }
});

populateWorld();
updateUI();
requestAnimationFrame(gameLoop);
