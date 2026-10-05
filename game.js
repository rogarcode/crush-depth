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
  sub: document.getElementById('subStat'),
  gold: document.getElementById('goldStat'),
  scrap: document.getElementById('scrapStat'),
  artifacts: document.getElementById('artifactStat'),
  zone: document.getElementById('zoneLabel'),
  upgradeList: document.getElementById('upgradeList'),
  weaponCard: document.getElementById('weaponCard'),
  monsterList: document.getElementById('monsterList')
};

const world = {
  width: 2600,
  height: 1800,
  baseX: 180,
  baseY: 1550,
  cameraX: 0,
  cameraY: 0,
  caveRects: [],
  loot: [],
  monsters: [],
  projectiles: [],
  depth: 0,
  message: 'Sub launch successful.'
};

const state = {
  gold: 180,
  scrap: 25,
  artifacts: 0,
  mode: 'exploring',
  lightOn: true,
  player: {
    x: 180,
    y: 1550,
    r: 13,
    speed: 2.5,
    fuel: 100,
    oxygen: 100,
    hull: 100,
    light: 100,
    facing: 1,
    cooldown: 0,
    inside: false,
    radarRange: 220,
    lightRadius: 160
  },
  upgrades: {
    hull: 0,
    fuel: 0,
    radar: 0,
    light: 0,
    engine: 0,
    weapon: 0
  },
  weapons: [
    { name: 'Burst Cannon', damage: 16, ammo: Infinity, cooldown: 0.28, color: '#ffd66b' },
    { name: 'Harpoon', damage: 28, ammo: 15, cooldown: 0.5, color: '#66d9ff' },
    { name: 'Torpedo', damage: 52, ammo: 6, cooldown: 0.9, color: '#f66dff' },
    { name: 'EMP Pulse', damage: 22, ammo: 11, cooldown: 0.42, color: '#76ffb5' }
  ],
  activeWeapon: 0,
  monstersMeta: [
    { name: 'Rift Eel', threat: 'Low', hp: 30, damage: 8, color: '#7de2ff' },
    { name: 'Bone Drake', threat: 'Medium', hp: 52, damage: 16, color: '#ffc76b' },
    { name: 'Glass Manta', threat: 'Medium', hp: 44, damage: 15, color: '#9affe6' },
    { name: 'Abyss Stalker', threat: 'High', hp: 70, damage: 22, color: '#ff7e7e' },
    { name: 'Warden Serpent', threat: 'Extreme', hp: 90, damage: 26, color: '#ff9d80' }
  ],
  depthZones: [
    { min: 0, max: 120, name: 'Surface Shelf' },
    { min: 120, max: 300, name: 'Blue Drift' },
    { min: 300, max: 520, name: 'Dark Current' },
    { min: 520, max: 760, name: 'Glass Ruins' },
    { min: 760, max: 1000, name: 'Abyss Cave' },
    { min: 1000, max: 1400, name: 'Null Bell' },
    { min: 1400, max: 2000, name: 'Crush Depth' }
  ]
};

const keys = {};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getDepthZoneName(depth) {
  const zone = state.depthZones.find(z => depth >= z.min && depth < z.max);
  return zone ? zone.name : 'Crush Depth';
}

function initWorld() {
  world.caveRects = [];
  const cols = 18;
  const rows = 14;
  const cellW = world.width / cols;
  const cellH = world.height / rows;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < 32; i++) {
    const x = Math.floor(rand(1, cols - 4));
    const y = Math.floor(rand(1, rows - 4));
    const w = Math.floor(rand(2, 5));
    const h = Math.floor(rand(2, 5));
    for (let yy = y; yy < Math.min(rows, y + h); yy++) {
      for (let xx = x; xx < Math.min(cols, x + w); xx++) {
        grid[yy][xx] = 1;
      }
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        world.caveRects.push({
          x: x * cellW,
          y: y * cellH,
          w: cellW,
          h: cellH
        });
      }
    }
  }

  world.loot = [];
  for (let i = 0; i < 28; i++) {
    const itemType = Math.random() < 0.7 ? 'gold' : 'scrap';
    world.loot.push({
      x: rand(80, world.width - 80),
      y: rand(80, world.height - 80),
      type: itemType,
      value: itemType === 'gold' ? rand(8, 24) : rand(4, 10),
      r: 8,
      bob: Math.random() * 1000
    });
  }

  world.monsters = [];
  for (let i = 0; i < 18; i++) {
    const meta = state.monstersMeta[Math.floor(Math.random() * state.monstersMeta.length)];
    world.monsters.push({
      x: rand(200, world.width - 200),
      y: rand(180, world.height - 200),
      r: 16,
      hp: meta.hp,
      maxHp: meta.hp,
      color: meta.color,
      damage: meta.damage,
      threat: meta.threat,
      name: meta.name,
      speed: rand(0.7, 1.6),
      dx: rand(-1, 1),
      dy: rand(-1, 1)
    });
  }
}

function collidesWithWall(x, y, r) {
  for (const rect of world.caveRects) {
    const nearestX = clamp(x, rect.x, rect.x + rect.w);
    const nearestY = clamp(y, rect.y, rect.y + rect.h);
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function updateUI() {
  const p = state.player;
  const weapon = state.weapons[state.activeWeapon];
  const zone = getDepthZoneName(world.depth);

  ui.depth.textContent = `${world.depth}m`;
  ui.hull.textContent = `${Math.round(p.hull)}%`;
  ui.fuel.textContent = `${Math.round(p.fuel)}%`;
  ui.oxygen.textContent = `${Math.round(p.oxygen)}%`;
  ui.light.textContent = `${Math.round(p.light)}%`;
  ui.sub.textContent = 'Scout';
  ui.gold.textContent = String(Math.floor(state.gold));
  ui.scrap.textContent = String(Math.floor(state.scrap));
  ui.artifacts.textContent = String(Math.floor(state.artifacts));
  ui.zone.textContent = zone;

  ui.weaponCard.innerHTML = `
    <div class="card">
      <strong>${weapon.name}</strong><br>
      Damage: ${weapon.damage}<br>
      Ammo: ${weapon.ammo === Infinity ? '∞' : weapon.ammo}<br>
      Fire Rate: ${(1 / weapon.cooldown).toFixed(1)}/s
    </div>
  `;

  const upgradeDefinitions = [
    { id: 'light', label: 'Flashlight Boost', desc: '+18 light radius' },
    { id: 'radar', label: 'Radar Array', desc: '+30 radar range' },
    { id: 'hull', label: 'Hull Plates', desc: '+15 hull max' },
    { id: 'fuel', label: 'Fuel Cells', desc: '+20 fuel reserve' },
    { id: 'engine', label: 'Engines', desc: '+10% speed' },
    { id: 'weapon', label: 'Weapon Core', desc: '+12% weapon damage' }
  ];

  ui.upgradeList.innerHTML = upgradeDefinitions.map(item => `
    <div class="card">
      <strong>${item.label}</strong><br>
      ${item.desc}<br>
      <button data-upgrade="${item.id}" type="button">Upgrade</button>
    </div>
  `).join('');

  ui.monsterList.innerHTML = state.monstersMeta.map(m => `
    <div class="card">
      <strong>${m.name}</strong><br>
      Threat: ${m.threat}<br>
      HP: ${m.hp}<br>
      Damage: ${m.damage}
    </div>
  `).join('');
}

function buyUpgrade(kind) {
  const costs = {
    light: 120,
    radar: 140,
    hull: 150,
    fuel: 110,
    engine: 160,
    weapon: 180
  };

  const cost = costs[kind];
  if (!cost) return;
  if (state.gold < cost) {
    world.message = 'Not enough gold.';
    return;
  }

  state.gold -= cost;
  state.upgrades[kind] += 1;

  if (kind === 'light') state.player.lightRadius += 22;
  if (kind === 'radar') state.player.radarRange += 30;
  if (kind === 'hull') state.player.hull = clamp(state.player.hull + 12, 0, 100 + state.upgrades.hull * 15);
  if (kind === 'fuel') state.player.fuel = clamp(state.player.fuel + 18, 0, 100 + state.upgrades.fuel * 16);
  if (kind === 'engine') state.player.speed += 0.18;
  if (kind === 'weapon') {
    for (const weapon of state.weapons) {
      weapon.damage *= 1.12;
    }
  }

  world.message = `${kind.toUpperCase()} upgraded.`;
}

function movePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft || keys.a) dx -= 1;
  if (keys.ArrowRight || keys.d) dx += 1;
  if (keys.ArrowUp || keys.w) dy -= 1;
  if (keys.ArrowDown || keys.s) dy += 1;

  if (dx || dy) {
    const mag = Math.hypot(dx, dy) || 1;
    const stepX = (dx / mag) * p.speed * dt * 60;
    const stepY = (dy / mag) * p.speed * dt * 60;

    const nextX = p.x + stepX;
    const nextY = p.y + stepY;

    if (!collidesWithWall(nextX, p.y, p.r)) p.x = nextX;
    if (!collidesWithWall(p.x, nextY, p.r)) p.y = nextY;

    p.facing = dx >= 0 ? 1 : -1;
  }

  p.x = clamp(p.x, 20, world.width - 20);
  p.y = clamp(p.y, 20, world.height - 20);

  p.fuel = clamp(p.fuel - 0.012 * dt * 60, 0, 100);
  p.oxygen = clamp(p.oxygen - 0.015 * dt * 60, 0, 100);
  p.light = clamp(p.light - 0.02 * dt * 60, 0, 100);

  if (p.fuel <= 0) p.hull = clamp(p.hull - 0.12 * dt * 60, 0, 100);
  if (p.oxygen <= 0) p.hull = clamp(p.hull - 0.2 * dt * 60, 0, 100);

  if (p.hull <= 0) {
    p.hull = 100;
    p.fuel = 100;
    p.oxygen = 100;
    p.x = world.baseX;
    p.y = world.baseY;
    world.message = 'Hull failure. Returning to base.';
  }

  world.depth = Math.max(0, Math.floor((world.height - p.y) / 8));
  world.cameraX = clamp(p.x - canvas.width / 2, 0, world.width - canvas.width);
  world.cameraY = clamp(p.y - canvas.height / 2, 0, world.height - canvas.height);
}

function fireWeapon() {
  const p = state.player;
  const weapon = state.weapons[state.activeWeapon];
  if (p.cooldown > 0) return;
  if (weapon.ammo !== Infinity && weapon.ammo <= 0) {
    world.message = `${weapon.name} is empty.`;
    return;
  }

  const dir = p.facing >= 0 ? 1 : -1;
  world.projectiles.push({
    x: p.x + dir * 20,
    y: p.y,
    vx: dir * 6.5,
    vy: 0,
    damage: weapon.damage * (1 + state.upgrades.weapon * 0.12),
    radius: weapon.name === 'Torpedo' ? 6 : 4,
    color: weapon.color,
    life: weapon.name === 'Torpedo' ? 1.7 : 1.2
  });

  p.cooldown = weapon.cooldown;
  if (weapon.ammo !== Infinity) weapon.ammo -= 1;
  world.message = `${weapon.name} fired.`;
}

function updateProjectiles(dt) {
  for (const proj of world.projectiles) {
    proj.x += proj.vx * dt * 60;
    proj.y += proj.vy * dt * 60;
    proj.life -= dt;

    for (const monster of world.monsters) {
      const dx = proj.x - monster.x;
      const dy = proj.y - monster.y;
      if (Math.abs(dx) < monster.r + proj.radius && Math.abs(dy) < monster.r + proj.radius) {
        monster.hp -= proj.damage;
        proj.life = 0;
        if (monster.hp <= 0) {
          state.gold += 20;
          state.scrap += 5;
          world.message = `${monster.name} neutralized.`;
          world.loot.push({ x: monster.x, y: monster.y, type: 'gold', value: 16, r: 7, bob: 0 });
          monster.dead = true;
        }
      }
    }
  }

  world.projectiles = world.projectiles.filter(p => p.life > 0 && p.x > 0 && p.x < world.width && p.y > 0 && p.y < world.height);
  world.monsters = world.monsters.filter(m => !m.dead);
  state.player.cooldown = Math.max(0, state.player.cooldown - dt);
}

function updateMonsters(dt) {
  const p = state.player;
  for (const monster of world.monsters) {
    const dx = p.x - monster.x;
    const dy = p.y - monster.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 180) {
      monster.x += (dx / dist) * monster.speed * dt * 60;
      monster.y += (dy / dist) * monster.speed * dt * 60;
    } else {
      monster.x += monster.dx * monster.speed * dt * 60;
      monster.y += monster.dy * monster.speed * dt * 60;
    }

    if (monster.x < 30 || monster.x > world.width - 30) monster.dx *= -1;
    if (monster.y < 30 || monster.y > world.height - 30) monster.dy *= -1;

    const close = Math.hypot(p.x - monster.x, p.y - monster.y) < p.r + monster.r + 4;
    if (close) {
      p.hull = clamp(p.hull - monster.damage * dt * 0.18, 0, 100);
      world.message = `${monster.name} hit your hull.`;
    }
  }
}

function collectLoot() {
  for (const item of world.loot) {
    const dist = Math.hypot(state.player.x - item.x, state.player.y - item.y);
    if (dist < state.player.r + item.r + 4) {
      if (item.type === 'gold') {
        state.gold += item.value;
        world.message = `Recovered ${Math.round(item.value)} gold.`;
      } else {
        state.scrap += item.value;
        world.message = `Recovered ${Math.round(item.value)} scrap.`;
      }
      item.collected = true;
    }
  }
  world.loot = world.loot.filter(item => !item.collected);
}

function surfaceRepair() {
  const dist = Math.hypot(state.player.x - world.baseX, state.player.y - world.baseY);
  if (dist > 140) {
    world.message = 'Need to be near the base.';
    return;
  }

  state.player.fuel = clamp(state.player.fuel + 30, 0, 100 + state.upgrades.fuel * 16);
  state.player.oxygen = clamp(state.player.oxygen + 30, 0, 100);
  state.player.hull = clamp(state.player.hull + 22, 0, 100 + state.upgrades.hull * 15);
  state.player.light = clamp(state.player.light + 20, 0, 100);
  state.mode = 'base';
  state.player.x = world.baseX;
  state.player.y = world.baseY;
  world.message = 'Surfaced and repaired.';
}

function dock() {
  if (Math.hypot(state.player.x - world.baseX, state.player.y - world.baseY) < 120) {
    state.mode = 'docked';
    world.message = 'Docked at station.';
  }
}

function toggleInterior() {
  if (state.mode === 'docked' || state.mode === 'base') {
    state.player.inside = !state.player.inside;
    state.mode = state.player.inside ? 'interior' : 'exploring';
    world.message = state.player.inside ? 'Inside the sub.' : 'Back outside.';
  }
}

function toggleLight() {
  state.lightOn = !state.lightOn;
  world.message = state.lightOn ? 'Lights on.' : 'Lights off.';
}

function bindInput() {
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys[key] = true;

    if (key === ' ') {
      event.preventDefault();
      fireWeapon();
    }

    if (key === 'l') toggleLight();
    if (key === 's') surfaceRepair();
    if (key === 'd') dock();
    if (key === 'e') toggleInterior();

    if (key === '1') state.activeWeapon = 0;
    if (key === '2') state.activeWeapon = 1;
    if (key === '3') state.activeWeapon = 2;
    if (key === '4') state.activeWeapon = 3;
  });

  document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-upgrade]');
    if (btn) {
      buyUpgrade(btn.dataset.upgrade);
    }
  });
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#081a2d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-world.cameraX, -world.cameraY);

  ctx.fillStyle = '#09233a';
  ctx.fillRect(0, 0, world.width, world.height);

  for (const rect of world.caveRects) {
    ctx.fillStyle = '#294968';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  ctx.fillStyle = '#3c7f72';
  ctx.fillRect(world.baseX - 60, world.baseY - 30, 120, 60);
  ctx.fillStyle = '#8b6e3d';
  ctx.fillRect(world.baseX - 24, world.baseY - 80, 48, 40);

  for (const item of world.loot) {
    ctx.fillStyle = item.type === 'gold' ? '#ffd86b' : '#c9d5e0';
    ctx.fillRect(item.x - item.r, item.y - item.r + Math.sin(item.bob * 0.01) * 2, item.r * 2, item.r * 2);
  }

  for (const monster of world.monsters) {
    ctx.fillStyle = monster.color;
    ctx.fillRect(monster.x - monster.r, monster.y - monster.r, monster.r * 2, monster.r * 2);
    ctx.fillStyle = '#0d1f1d';
    ctx.fillRect(monster.x - 18, monster.y - 20, 36, 5);
    ctx.fillStyle = '#7dff93';
    ctx.fillRect(monster.x - 18, monster.y - 20, 36 * (monster.hp / monster.maxHp), 5);
  }

  for (const projectile of world.projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.fillRect(projectile.x - projectile.radius, projectile.y - projectile.radius, projectile.radius * 2, projectile.radius * 2);
  }

  const p = state.player;
  ctx.fillStyle = '#9fe7ff';
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.fillStyle = '#dff6ff';
  ctx.fillRect(p.x - 8, p.y - 10, 16, 8);
  ctx.fillStyle = '#9efc8c';
  ctx.fillRect(p.x + (p.facing > 0 ? 8 : -16), p.y - 3, 10, 6);

  ctx.restore();

  if (state.lightOn) {
    const px = p.x - world.cameraX;
    const py = p.y - world.cameraY;
    const radius = p.lightRadius + state.upgrades.light * 18;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(px, py, 16, px, py, radius);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(2, 8, 16, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawRadar() {
  radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
  radarCtx.fillStyle = '#081823';
  radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

  const cx = radarCanvas.width / 2;
  const cy = radarCanvas.height / 2;
  const scale = 0.08 + state.upgrades.radar * 0.015;

  radarCtx.strokeStyle = '#7fffc6';
  radarCtx.lineWidth = 1;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 60, 0, Math.PI * 2);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 35, 0, Math.PI * 2);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.moveTo(cx, 0);
  radarCtx.lineTo(cx, radarCanvas.height);
  radarCtx.moveTo(0, cy);
  radarCtx.lineTo(radarCanvas.width, cy);
  radarCtx.stroke();

  const baseX = (world.baseX - state.player.x) * scale + cx;
  const baseY = (world.baseY - state.player.y) * scale + cy;
  radarCtx.fillStyle = '#ffd86b';
  radarCtx.fillRect(baseX - 3, baseY - 3, 6, 6);

  for (const monster of world.monsters) {
    const x = (monster.x - state.player.x) * scale + cx;
    const y = (monster.y - state.player.y) * scale + cy;
    if (Math.abs(x - cx) < 110 && Math.abs(y - cy) < 110) {
      radarCtx.fillStyle = '#ff5d5d';
      radarCtx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  for (const item of world.loot) {
    const x = (item.x - state.player.x) * scale + cx;
    const y = (item.y - state.player.y) * scale + cy;
    if (Math.abs(x - cx) < 110 && Math.abs(y - cy) < 110) {
      radarCtx.fillStyle = item.type === 'gold' ? '#ffd86b' : '#d4dfe9';
      radarCtx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  radarCtx.fillStyle = '#6fe7ff';
  radarCtx.fillRect(cx - 3, cy - 3, 6, 6);
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(12, 12, 360, 120);
  ctx.fillStyle = '#ebfff6';
  ctx.font = '12px Courier New';
  ctx.fillText(`Depth: ${world.depth}m`, 20, 34);
  ctx.fillText(`Hull: ${Math.round(state.player.hull)}%`, 20, 54);
  ctx.fillText(`Fuel: ${Math.round(state.player.fuel)}%`, 20, 74);
  ctx.fillText(`Status: ${world.message}`, 20, 94);
}

function update(dt) {
  movePlayer(dt);
  updateProjectiles(dt);
  updateMonsters(dt);
  collectLoot();

  state.player.x = clamp(state.player.x, 20, world.width - 20);
  state.player.y = clamp(state.player.y, 20, world.height - 20);

  const dist = Math.hypot(state.player.x - world.baseX, state.player.y - world.baseY);
  if (dist < 90) {
    state.mode = 'base';
  }

  if (state.mode === 'docked') {
    state.player.x = world.baseX + 30;
    state.player.y = world.baseY + 14;
  }

  updateUI();
}

function render() {
  drawWorld();
  drawHud();
  drawRadar();
}

function loop(time) {
  const dt = Math.min((time - (loop.lastTime || time)) / 1000, 0.033);
  loop.lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function boot() {
  initWorld();
  bindInput();
  updateUI();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', boot);
