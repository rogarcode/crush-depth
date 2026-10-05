const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  depth: document.getElementById('depthStat'),
  hull: document.getElementById('hullStat'),
  fuel: document.getElementById('fuelStat'),
  oxygen: document.getElementById('oxygenStat'),
  sub: document.getElementById('currentSubStat'),
  gold: document.getElementById('goldStat'),
  scrap: document.getElementById('scrapStat'),
  artifacts: document.getElementById('artifactStat'),
  inventory: document.getElementById('inventoryList'),
  weaponDisplay: document.getElementById('weaponDisplay'),
  monsterList: document.getElementById('monsterList'),
  weaponGuide: document.getElementById('weaponGuide'),
  shopList: document.getElementById('shopList'),
  gameMode: document.getElementById('gameMode'),
  toggleInteriorBtn: document.getElementById('toggleInteriorBtn'),
  surfaceBtn: document.getElementById('surfaceBtn'),
  dockBtn: document.getElementById('dockBtn')
};

const keys = {};
const world = {
  width: 2200,
  height: 1400,
  depthLevel: 0,
  baseX: 100,
  baseY: 1100,
  cameraX: 0,
  cameraY: 0,
  message: 'Welcome aboard, Captain.'
};

const game = {
  mode: 'exploring', // exploring, interior, docked, base
  time: 0,
  gold: 150,
  scrap: 20,
  artifacts: 0,
  player: {
    x: 140,
    y: 1080,
    w: 32,
    h: 18,
    vx: 0,
    vy: 0,
    speed: 2.2,
    fuel: 100,
    oxygen: 100,
    hull: 100,
    interior: false,
    facing: 1,
    activeWeapon: 0,
    attackCooldown: 0,
    weaponPower: 1,
    inventory: ['Torpedo Rack', 'Repair Kit', 'Signal Flare', 'Map Fragment'],
    currentSub: 'Scout'
  },
  base: {
    x: 120,
    y: 1100,
    radius: 140
  },
  weapons: [
    { name: 'Burst Cannon', ammo: Infinity, damage: 12, color: '#ffff00', key: '1' },
    { name: 'Harpoon', ammo: 10, damage: 28, color: '#00ffff', key: '2' },
    { name: 'Torpedo', ammo: 4, damage: 42, color: '#ff00ff', key: '3' },
    { name: 'EMP Pulse', ammo: 8, damage: 20, color: '#00ff00', key: '4' }
  ],
  enemies: [],
  loot: [],
  projectiles: [],
  stations: [],
  monsters: [
    { name: 'Rift Eel', threat: 'Low', trait: 'Fast and erratic, lurks in bright currents.', attack: 'Strikes when close, then retreats.' },
    { name: 'Bone Drake', threat: 'Medium', trait: 'Spits corrosive acid from long range.', attack: 'Rushes if the pilot drifts off course.' },
    { name: 'Void Manta', threat: 'High', trait: 'Expands wings to block escape routes.', attack: 'Targets the stern and cuts off maneuvering.' },
    { name: 'Abyss Warden', threat: 'Extreme', trait: 'Protects ruins and ancient wrecks.', attack: 'Summons pulses and blocks shielded approaches.' }
  ],
  shop: [
    { name: 'Hull Plates', cost: 80, type: 'upgrade', desc: '+10 hull integrity' },
    { name: 'Fuel Cell', cost: 60, type: 'upgrade', desc: '+15 fuel' },
    { name: 'Harpoon Pack', cost: 90, type: 'weapon', desc: 'More ammo and power' },
    { name: 'Abyss Scanner', cost: 120, type: 'upgrade', desc: 'Reveal hidden wrecks' }
  ],
  messages: []
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createEnemy(type = 'random') {
  const x = randomBetween(300, world.width - 300);
  const y = randomBetween(150, world.height - 150);

  const baseEnemy = {
    x,
    y,
    w: 24,
    h: 24,
    health: 50,
    speed: randomBetween(0.6, 1.2),
    dx: randomBetween(-1, 1),
    dy: randomBetween(-1, 1),
    type: type === 'random' ? ['Rift Eel', 'Bone Drake', 'Void Manta', 'Abyss Warden'][Math.floor(Math.random() * 4)] : type,
    damage: randomBetween(8, 20),
    color: '#ff4d4d',
    cooldown: randomBetween(0.5, 2)
  };

  if (baseEnemy.type === 'Bone Drake') {
    baseEnemy.health = 70;
    baseEnemy.damage = 18;
  }
  if (baseEnemy.type === 'Void Manta') {
    baseEnemy.health = 90;
    baseEnemy.damage = 24;
  }
  if (baseEnemy.type === 'Abyss Warden') {
    baseEnemy.health = 130;
    baseEnemy.damage = 32;
  }

  game.enemies.push(baseEnemy);
}

function createLoot(x, y, type = 'gold') {
  game.loot.push({
    x,
    y,
    w: 12,
    h: 12,
    type,
    value: type === 'gold' ? randomBetween(10, 30) : randomBetween(1, 4),
    bob: Math.random() * 1000
  });
}

function createStations() {
  const stationPositions = [
    { x: 300, y: 350, type: 'wreck', name: 'Wreck Site' },
    { x: 860, y: 770, type: 'ruin', name: 'Faded Ruin' },
    { x: 1500, y: 500, type: 'shop', name: 'Deep Shop' },
    { x: 1820, y: 950, type: 'artifact', name: 'Buried Vault' }
  ];

  game.stations = stationPositions;
}

function setupWorld() {
  createStations();
  for (let i = 0; i < 16; i++) {
    createEnemy();
  }
  for (let i = 0; i < 30; i++) {
    createLoot(randomBetween(100, world.width - 100), randomBetween(150, world.height - 150), Math.random() < 0.8 ? 'gold' : 'scrap');
  }
}

function updateUI() {
  ui.depth.textContent = `${world.depthLevel * 100}m`;
  ui.hull.textContent = `${Math.round(game.player.hull)}%`;
  ui.fuel.textContent = `${Math.round(game.player.fuel)}%`;
  ui.oxygen.textContent = `${Math.round(game.player.oxygen)}%`;
  ui.sub.textContent = game.player.currentSub;
  ui.gold.textContent = Math.floor(game.gold);
  ui.scrap.textContent = Math.floor(game.scrap);
  ui.artifacts.textContent = Math.floor(game.artifacts);

  ui.inventory.innerHTML = game.player.inventory.map(item => `<div class="inventory-item">${item}</div>`).join('');

  const currentWeapon = game.weapons[game.player.activeWeapon];
  ui.weaponDisplay.innerHTML = `
    <div class="weapon-entry">
      <strong>${currentWeapon.name}</strong><br>
      Damage: ${currentWeapon.damage}<br>
      Ammo: ${currentWeapon.ammo === Infinity ? '∞' : currentWeapon.ammo}
    </div>
  `;

  ui.monsterList.innerHTML = game.monsters.map(monster => `
    <div class="monster-entry">
      <strong>${monster.name}</strong><br>
      Threat: ${monster.threat}<br>
      Trait: ${monster.trait}<br>
      Attack: ${monster.attack}
    </div>
  `).join('');

  ui.weaponGuide.innerHTML = game.weapons.map((weapon, i) => `
    <div class="weapon-entry">
      <strong>${i + 1}. ${weapon.name}</strong><br>
      Damage: ${weapon.damage}<br>
      Ammo: ${weapon.ammo === Infinity ? '∞' : weapon.ammo}
    </div>
  `).join('');

  ui.shopList.innerHTML = game.shop.map(item => `
    <div class="shop-item">
      <strong>${item.name}</strong><br>
      Cost: ${item.cost} gold<br>
      ${item.desc}<br>
      <button data-item="${item.name}">Buy</button>
    </div>
  `).join('');

  ui.gameMode.textContent = `MODE: ${game.mode.toUpperCase()}`;

  ui.toggleInteriorBtn.disabled = false;
  if (game.mode === 'docked' || game.mode === 'base') {
    ui.toggleInteriorBtn.textContent = 'Enter Interior (E)';
  } else {
    ui.toggleInteriorBtn.textContent = game.player.interior ? 'Exit Interior (E)' : 'Enter Interior (E)';
  }
}

function updatePlayer(dt) {
  const player = game.player;
  let dx = 0;
  let dy = 0;

  if (keys['ArrowLeft'] || keys['a']) dx -= 1;
  if (keys['ArrowRight'] || keys['d']) dx += 1;
  if (keys['ArrowUp'] || keys['w']) dy -= 1;
  if (keys['ArrowDown'] || keys['s']) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    player.vx = (dx / len) * player.speed;
    player.vy = (dy / len) * player.speed;
    player.facing = dx >= 0 ? 1 : -1;
  } else {
    player.vx *= 0.8;
    player.vy *= 0.8;
  }

  player.x += player.vx * dt * 60;
  player.y += player.vy * dt * 60;

  player.x = clamp(player.x, 40, world.width - 40);
  player.y = clamp(player.y, 80, world.height - 80);

  player.fuel = clamp(player.fuel - 0.02 * dt * 60, 0, 100);
  player.oxygen = clamp(player.oxygen - 0.03 * dt * 60, 0, 100);

  if (player.fuel <= 0) {
    player.hull = clamp(player.hull - 0.16 * dt * 60, 0, 100);
  }

  if (player.oxygen <= 0) {
    player.hull = clamp(player.hull - 0.2 * dt * 60, 0, 100);
  }

  if (player.hull <= 0) {
    player.hull = 100;
    player.x = world.baseX;
    player.y = world.baseY;
    world.message = 'Hull breached! Returning to base for repairs.';
  }

  world.cameraX = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  world.cameraY = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);

  const distToBase = Math.hypot(player.x - game.base.x, player.y - game.base.y);
  if (distToBase < 130) {
    game.mode = 'base';
  } else if (game.mode === 'base') {
    game.mode = 'exploring';
  }

  if (game.mode === 'docked') {
    player.x = game.base.x + 30;
    player.y = game.base.y - 10;
  }
}

function updateEnemies(dt) {
  for (const enemy of game.enemies) {
    if (!enemy) continue;

    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 180) {
      enemy.x += (dx / dist) * enemy.speed * dt * 60;
      enemy.y += (dy / dist) * enemy.speed * dt * 60;
    } else {
      enemy.x += enemy.dx * enemy.speed * dt * 60;
      enemy.y += enemy.dy * enemy.speed * dt * 60;
      if (enemy.x < 40 || enemy.x > world.width - 40) enemy.dx *= -1;
      if (enemy.y < 60 || enemy.y > world.height - 60) enemy.dy *= -1;
    }

    if (dist < 28) {
      game.player.hull = clamp(game.player.hull - enemy.damage * dt * 0.4, 0, 100);
      if (Math.random() < 0.02) {
        world.message = `${enemy.type} struck your hull!`;
      }
    }
  }
}

function updateLoot(dt) {
  for (const item of game.loot) {
    item.bob += dt * 60;
    const dist = Math.hypot(game.player.x - item.x, game.player.y - item.y);
    if (dist < 18) {
      if (item.type === 'gold') {
        game.gold += item.value;
        world.message = `Recovered ${Math.round(item.value)} gold.`;
      } else if (item.type === 'scrap') {
        game.scrap += Math.ceil(item.value);
        world.message = `Recovered scrap metal.`;
      }
      item.collected = true;
    }
  }
  game.loot = game.loot.filter(item => !item.collected);
}

function updateProjectiles(dt) {
  for (const projectile of game.projectiles) {
    projectile.x += projectile.vx * dt * 60;
    projectile.y += projectile.vy * dt * 60;
    projectile.life -= dt;

    for (const enemy of game.enemies) {
      if (!enemy) continue;
      const hit = Math.abs(projectile.x - enemy.x) < 18 && Math.abs(projectile.y - enemy.y) < 18;
      if (hit) {
        enemy.health -= projectile.damage;
        projectile.life = 0;
        if (enemy.health <= 0) {
          game.gold += 25;
          world.message = `${enemy.type} destroyed!`;
          enemy.dead = true;
          if (Math.random() < 0.35) {
            createLoot(enemy.x, enemy.y, 'gold');
          }
          if (Math.random() < 0.2) {
            createLoot(enemy.x + 12, enemy.y + 12, 'scrap');
          }
        }
      }
    }
  }

  game.projectiles = game.projectiles.filter(projectile => projectile.life > 0 && projectile.x > 0 && projectile.x < world.width && projectile.y > 0 && projectile.y < world.height);
  game.enemies = game.enemies.filter(enemy => !enemy.dead);
}

function fireWeapon() {
  const weapon = game.weapons[game.player.activeWeapon];
  if (weapon.ammo !== Infinity && weapon.ammo <= 0) {
    world.message = `${weapon.name} is empty.`;
    return;
  }

  const angle = game.player.facing >= 0 ? 0 : Math.PI;
  const projectile = {
    x: game.player.x + (game.player.facing >= 0 ? 18 : -18),
    y: game.player.y,
    vx: Math.cos(angle) * (weapon.name === 'Burst Cannon' ? 7 : 6.5),
    vy: Math.sin(angle) * (weapon.name === 'Burst Cannon' ? 7 : 6.5),
    damage: weapon.damage,
    life: 1.8,
    color: weapon.color
  };

  if (weapon.name === 'EMP Pulse') {
    projectile.life = 0.9;
    projectile.vx *= 1.35;
    projectile.vy *= 1.35;
  }

  if (weapon.ammo !== Infinity) {
    weapon.ammo -= 1;
  }

  game.projectiles.push(projectile);
  world.message = `${weapon.name} fired.`;
}

function toggleInterior() {
  game.player.interior = !game.player.interior;
  game.mode = game.player.interior ? 'interior' : 'exploring';
  world.message = game.player.interior ? 'Inside the submarine. Systems online.' : 'Back on the deck and ready to dive.';
}

function surface() {
  game.player.x = world.baseX;
  game.player.y = world.baseY;
  game.mode = 'base';
  world.message = 'Surfacing to base and recharging systems.';
  game.player.fuel = clamp(game.player.fuel + 25, 0, 100);
  game.player.oxygen = clamp(game.player.oxygen + 25, 0, 100);
}

function dock() {
  if (game.mode === 'exploring') {
    game.mode = 'docked';
    world.message = 'Docking with base station.';
  } else {
    world.message = 'Already docked or not in range.';
  }
}

function buyItem(itemName) {
  const item = game.shop.find(shopItem => shopItem.name === itemName);
  if (!item) return;
  if (game.gold < item.cost) {
    world.message = 'Not enough gold.';
    return;
  }

  game.gold -= item.cost;
  if (item.type === 'upgrade') {
    if (item.name === 'Hull Plates') game.player.hull = clamp(game.player.hull + 10, 0, 100);
    if (item.name === 'Fuel Cell') game.player.fuel = clamp(game.player.fuel + 15, 0, 100);
    if (item.name === 'Abyss Scanner') world.message = 'Scanner online: hidden wrecks are visible.';
  }
  if (item.type === 'weapon') {
    if (item.name === 'Harpoon Pack') {
      const harpoon = game.weapons[1];
      harpoon.ammo += 6;
      harpoon.damage += 4;
      world.message = 'Harpoon pack upgraded.';
    }
  }

  world.message = `${item.name} purchased.`;
}

function handleKeydown(event) {
  keys[event.key] = true;

  if (event.key === 'e' || event.key === 'E') toggleInterior();
  if (event.key === 's' || event.key === 'S') surface();
  if (event.key === 'd' || event.key === 'D') dock();
  if (event.key === ' ') {
    event.preventDefault();
    fireWeapon();
  }

  if (event.key === '1') game.player.activeWeapon = 0;
  if (event.key === '2') game.player.activeWeapon = 1;
  if (event.key === '3') game.player.activeWeapon = 2;
  if (event.key === '4') game.player.activeWeapon = 3;
}

function handleKeyup(event) {
  keys[event.key] = false;
}

function drawBackground() {
  ctx.fillStyle = '#061a31';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i++) {
    const x = ((i * 97) - world.cameraX * 0.2) % (canvas.width + 50);
    const y = ((i * 53) + (world.depthLevel * 4)) % (canvas.height + 50);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#0d2a4e';
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
}

function drawStations() {
  const drawStation = (station) => {
    const sx = station.x - world.cameraX;
    const sy = station.y - world.cameraY;
    ctx.fillStyle = station.type === 'shop' ? '#00d9ff' : station.type === 'artifact' ? '#ffd166' : '#8a6d3b';
    ctx.fillRect(sx - 18, sy - 10, 36, 20);

    ctx.fillStyle = '#000';
    ctx.fillRect(sx - 12, sy - 18, 24, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.fillText(station.name, sx - 32, sy - 28);
  };

  for (const station of game.stations) {
    drawStation(station);
  }
}

function drawWorld() {
  const player = game.player;

  ctx.save();
  ctx.translate(-world.cameraX, -world.cameraY);

  ctx.fillStyle = '#1e2b3d';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#6c9dff';
  ctx.fillRect(game.base.x - 40, game.base.y - 20, 80, 40);
  ctx.fillStyle = '#2f8f53';
  ctx.fillRect(game.base.x - 12, game.base.y - 70, 24, 30);

  for (const item of game.loot) {
    ctx.fillStyle = item.type === 'gold' ? '#ffd700' : '#b0b0b0';
    ctx.fillRect(item.x - item.w / 2, item.y - item.h / 2 + Math.sin(item.bob * 0.1) * 3, item.w, item.h);
  }

  for (const enemy of game.enemies) {
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(enemy.x - 14, enemy.y - 18, (enemy.health / 130) * 28, 4);
  }

  for (const projectile of game.projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.fillRect(projectile.x - 3, projectile.y - 3, 6, 6);
  }

  ctx.fillStyle = '#8be9fd';
  ctx.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);

  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(player.x - 12, player.y - 8, 8, 8);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(player.x + 2, player.y - 2, 8, 4);

  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(10, 10, 300, 90);

  ctx.fillStyle = '#fff';
  ctx.font = '12px Courier New';
  ctx.fillText(`Depth: ${world.depthLevel * 100}m`, 20, 30);
  ctx.fillText(`Hull: ${Math.round(game.player.hull)}%`, 20, 48);
  ctx.fillText(`Gold: ${Math.round(game.gold)}`, 20, 66);
  ctx.fillText(`Status: ${world.message}`, 20, 84);

  ctx.fillStyle = '#00ff00';
  ctx.fillRect(620, 520, 150, 12);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(620, 520, 150 * (game.player.hull / 100), 12);
}

function draw() {
  drawBackground();
  drawWorld();
  drawStations();
  drawHud();
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  world.depthLevel = Math.max(0, Math.floor((game.player.y / 100) / 10));

  updatePlayer(dt);
  updateEnemies(dt);
  updateLoot(dt);
  updateProjectiles(dt);

  draw();
  updateUI();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);
window.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-item]');
  if (button) {
    buyItem(button.dataset.item);
  }
});

setupWorld();
updateUI();
requestAnimationFrame(gameLoop);
