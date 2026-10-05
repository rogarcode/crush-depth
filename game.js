const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const radarCanvas = document.getElementById('radarCanvas');
const radarCtx = radarCanvas.getContext('2d');

const ui = {
  depth: document.getElementById('depthStat'),
  hull: document.getElementById('hullStat'),
  fuel: document.getElementById('fuelStat'),
  oxygen: document.getElementById('oxygenStat'),
  power: document.getElementById('powerStat'),
  stationScreen: document.getElementById('stationScreen'),
  stationButtons: document.getElementById('stationButtons'),
  logBox: document.getElementById('logBox')
};

const keys = {};
const TAU = Math.PI * 2;

const game = {
  width: 1500,
  height: 900,
  cameraX: 0,
  cameraY: 0,
  log: 'Launch sequence complete.',
  sub: {
    x: 160,
    y: 160,
    w: 24,
    h: 24,
    speed: 2.8,
    depth: 0,
    hull: 100,
    fuel: 100,
    oxygen: 100,
    power: 100,
    lights: true,
    facing: 1
  },
  rooms: [
    { id: 'helm', name: 'Helm Seat', x: 110, y: 120, w: 220, h: 150, color: '#645c4d' },
    { id: 'radar', name: 'Radar Room', x: 390, y: 120, w: 230, h: 150, color: '#2c4765' },
    { id: 'weapons', name: 'Weapons Bay', x: 670, y: 120, w: 240, h: 180, color: '#4d4653' },
    { id: 'engine', name: 'Engine Core', x: 960, y: 120, w: 250, h: 180, color: '#3d4d53' },
    { id: 'lab', name: 'Research Lab', x: 170, y: 360, w: 260, h: 170, color: '#446154' },
    { id: 'storage', name: 'Storage', x: 500, y: 390, w: 230, h: 160, color: '#4a4f56' },
    { id: 'airlock', name: 'Airlock', x: 820, y: 390, w: 210, h: 170, color: '#6a7b7d' },
    { id: 'medbay', name: 'Medbay', x: 1090, y: 390, w: 220, h: 170, color: '#5d5346' }
  ],
  halls: [
    { x: 330, y: 160, w: 60, h: 500 },
    { x: 620, y: 160, w: 50, h: 500 },
    { x: 910, y: 160, w: 50, h: 500 },
    { x: 1210, y: 160, w: 50, h: 500 },
    { x: 230, y: 300, w: 1040, h: 60 },
    { x: 710, y: 620, w: 200, h: 50 }
  ],
  stations: [
    { id: 'helm', label: 'Helm Seat', x: 150, y: 175, w: 110, h: 52, type: 'helm', desc: 'Pilot the sub and steer the vessel.' },
    { id: 'radar', label: 'Radar Console', x: 445, y: 170, w: 120, h: 58, type: 'radar', desc: 'Scan the cavern and track threats.' },
    { id: 'weapons', label: 'Weapons Console', x: 725, y: 180, w: 120, h: 58, type: 'weapons', desc: 'Arm weapon systems and fire control.' },
    { id: 'engine', label: 'Engine Console', x: 1015, y: 180, w: 130, h: 58, type: 'engine', desc: 'Adjust thrust and depth control.' },
    { id: 'airlock', label: 'Airlock Door', x: 875, y: 448, w: 110, h: 60, type: 'airlock', desc: 'Open the lock and move outside.' }
  ],
  activeStation: 'helm',
  seated: true,
  console: 'helm',
  radar: {
    range: 310,
    ping: 0,
    contacts: [
      { x: 270, y: 200, type: 'threat', name: 'Rift Eel' },
      { x: 730, y: 520, type: 'loot', name: 'Scrap Cache' },
      { x: 1180, y: 320, type: 'threat', name: 'Bone Drake' }
    ]
  },
  weapons: {
    current: 0,
    list: [
      { name: 'Burst Cannon', damage: 18, ammo: '∞', color: '#ffd666' },
      { name: 'Harpoon', damage: 34, ammo: 14, color: '#69d9ff' },
      { name: 'Torpedo', damage: 58, ammo: 6, color: '#ff7af9' },
      { name: 'EMP Pulse', damage: 22, ammo: 11, color: '#77ffc2' }
    ]
  }
};

function logMessage(message) {
  game.log = message;
  ui.logBox.textContent = message;
}

function getStationById(id) {
  return game.stations.find(s => s.id === id) || null;
}

function setStation(id) {
  const station = getStationById(id);
  if (!station) return;
  game.activeStation = id;
  game.console = id;
  ui.stationScreen.innerHTML = `<strong>${station.label}</strong><br />${station.desc}`;

  const actions = {
    helm: [
      { label: 'Steady Course', fn: () => logMessage('Course stabilized. Sub remains on the current heading.') },
      { label: 'Dive 50m', fn: () => logMessage('Descending to a lower depth. Sensors calibrated.') },
      { label: 'Surface Check', fn: () => logMessage('Surface scan complete. Route clear.') }
    ],
    radar: [
      { label: 'Scan Cavern', fn: () => logMessage('Radar sweep complete. Three contacts identified.') },
      { label: 'Ping Sonar', fn: () => logMessage('Sonar pulse sent. Returning contact pings.') },
      { label: 'Zoom Map', fn: () => logMessage('Radar zoom increased. Distances are more precise.') }
    ],
    weapons: [
      { label: 'Fire Burst', fn: () => logMessage('Burst cannon fired. Target lock confirmed.') },
      { label: 'Load Harpoon', fn: () => logMessage('Harpoon chamber loaded. Weapons ready.') },
      { label: 'Cycle Torpedo', fn: () => logMessage('Torpedo tube cycled. Danger threshold updated.') }
    ],
    engine: [
      { label: 'Increase Throttle', fn: () => logMessage('Primary engines increased to 82%.') },
      { label: 'Reduce Drift', fn: () => logMessage('Stabilizers engaged. Drift reduced.') },
      { label: 'Emergency Reserve', fn: () => logMessage('Reserve power routed to the drive manifolds.') }
    ],
    airlock: [
      { label: 'Open Hatch', fn: () => logMessage('Airlock cycle complete. Exterior access open.') },
      { label: 'Seal Hatch', fn: () => logMessage('Exterior door sealed. Pressure nominal.') },
      { label: 'Scan Outside', fn: () => logMessage('Outer hull check complete. No immediate threats.') }
    ]
  };

  ui.stationButtons.innerHTML = '';
  (actions[id] || []).forEach(action => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = action.label;
    btn.addEventListener('click', action.fn);
    ui.stationButtons.appendChild(btn);
  });
}

function updateStats() {
  const p = game.sub;
  ui.depth.textContent = `${Math.floor(p.depth)}m`;
  ui.hull.textContent = `${Math.round(p.hull)}%`;
  ui.fuel.textContent = `${Math.round(p.fuel)}%`;
  ui.oxygen.textContent = `${Math.round(p.oxygen)}%`;
  ui.power.textContent = `${Math.round(p.power)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectContains(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function playerCanMove() {
  return !game.seated;
}

function movePlayer(dt) {
  const p = game.sub;
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft || keys.a) dx -= 1;
  if (keys.ArrowRight || keys.d) dx += 1;
  if (keys.ArrowUp || keys.w) dy -= 1;
  if (keys.ArrowDown || keys.s) dy += 1;

  if (playerCanMove() && (dx || dy)) {
    const mag = Math.hypot(dx, dy) || 1;
    p.x += (dx / mag) * p.speed * dt * 60;
    p.y += (dy / mag) * p.speed * dt * 60;
  }

  p.x = clamp(p.x, 80, game.width - 80);
  p.y = clamp(p.y, 70, game.height - 70);

  if (p.fuel > 0) p.fuel -= 0.015 * dt * 60;
  if (p.oxygen > 0) p.oxygen -= 0.013 * dt * 60;
  if (p.power > 0) p.power -= 0.01 * dt * 60;

  p.hull = clamp(p.hull - (p.fuel <= 0 ? 0.08 : 0) * dt * 60, 0, 100);
  p.depth = Math.max(0, 300 - (p.y - 80) * 0.3);

  if (p.hull <= 0) {
    p.hull = 100;
    p.x = 160;
    p.y = 160;
    logMessage('Hull breach emergency. Returning to the helm.');
  }

  game.cameraX = clamp(p.x - canvas.width / 2, 0, game.width - canvas.width);
  game.cameraY = clamp(p.y - canvas.height / 2, 0, game.height - canvas.height);
}

function interactWithNearestStation() {
  const p = game.sub;
  let nearest = null;
  for (const station of game.stations) {
    const center = { x: station.x + station.w / 2, y: station.y + station.h / 2 };
    const dist = distance(p, center);
    if (dist < 70) {
      if (!nearest || dist < distance(p, { x: nearest.x + nearest.w / 2, y: nearest.y + nearest.h / 2 })) nearest = station;
    }
  }

  if (!nearest) {
    logMessage('No station in range. Move closer to the console.');
    return;
  }

  if (game.seated && game.activeStation === nearest.id) {
    game.seated = false;
    logMessage('Standing up from the station.');
    return;
  }

  game.seated = true;
  game.activeStation = nearest.id;
  p.x = nearest.x + nearest.w / 2;
  p.y = nearest.y + nearest.h / 2;
  setStation(nearest.id);
  logMessage(`${nearest.label} engaged.`);
}

function fireWeapon() {
  const weapon = game.weapons.list[game.weapons.current];
  if (game.seated && game.activeStation === 'weapons') {
    logMessage(`${weapon.name} fired. Target report updated.`);
    return;
  }
  logMessage('Weapons station must be active to fire.');
}

function switchStation(index) {
  const order = ['helm', 'radar', 'weapons', 'engine', 'airlock'];
  const id = order[index] || order[0];
  if (game.seated) {
    setStation(id);
    game.activeStation = id;
    logMessage(`${getStationById(id).label} selected.`);
    return;
  }
  logMessage('You need to sit at a station first.');
}

function toggleLights() {
  game.sub.lights = !game.sub.lights;
  logMessage(game.sub.lights ? 'Interior lights activated.' : 'Interior lights dimmed.');
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') interactWithNearestStation();
  if (key === 'q') {
    game.seated = false;
    logMessage('You stand up and walk the deck.');
  }
  if (key === 'l') toggleLights();
  if (key === ' ') {
    event.preventDefault();
    fireWeapon();
  }

  if (key === '1') switchStation(0);
  if (key === '2') switchStation(1);
  if (key === '3') switchStation(2);
  if (key === '4') switchStation(3);
}

function handleKeyUp(event) {
  keys[event.key.toLowerCase()] = false;
}

function drawInterior() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#081922';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-game.cameraX, -game.cameraY);

  const hullColor = '#122f44';
  ctx.fillStyle = hullColor;
  ctx.fillRect(0, 0, game.width, game.height);

  const wallColor = '#182d3f';
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, game.width, 80);
  ctx.fillRect(0, 0, 80, game.height);
  ctx.fillRect(0, game.height - 80, game.width, 80);
  ctx.fillRect(game.width - 80, 0, 80, game.height);

  for (const room of game.rooms) {
    ctx.fillStyle = room.color;
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.strokeRect(room.x, room.y, room.w, room.h);
    ctx.fillStyle = '#dff9ff';
    ctx.font = '12px Courier New';
    ctx.fillText(room.name, room.x + 10, room.y + 22);
  }

  for (const hall of game.halls) {
    ctx.fillStyle = '#1a2d3f';
    ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  }

  for (const station of game.stations) {
    ctx.fillStyle = game.activeStation === station.id ? '#f9df8b' : '#d5d0be';
    ctx.fillRect(station.x, station.y, station.w, station.h);
    ctx.fillStyle = '#052033';
    ctx.font = '11px Courier New';
    ctx.fillText(station.label, station.x + 8, station.y + 22);
  }

  const p = game.sub;
  ctx.fillStyle = '#f0f7ff';
  ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
  ctx.fillStyle = '#9fe9ff';
  ctx.fillRect(p.x - 9, p.y - 10, 18, 8);

  ctx.restore();

  if (game.sub.lights) {
    const lx = p.x - game.cameraX;
    const ly = p.y - game.cameraY;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(lx, ly, 30, lx, ly, 190);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, 190, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(2, 4, 12, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawRadar() {
  radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
  radarCtx.fillStyle = '#091b2a';
  radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);

  const cx = radarCanvas.width / 2;
  const cy = radarCanvas.height / 2;
  radarCtx.strokeStyle = '#7ef0ff';
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 56, 0, TAU);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 32, 0, TAU);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.moveTo(cx, 0);
  radarCtx.lineTo(cx, radarCanvas.height);
  radarCtx.moveTo(0, cy);
  radarCtx.lineTo(radarCanvas.width, cy);
  radarCtx.stroke();

  for (const contact of game.radar.contacts) {
    const x = (contact.x - game.sub.x) * 0.07 + cx;
    const y = (contact.y - game.sub.y) * 0.07 + cy;
    if (Math.abs(x - cx) < 110 && Math.abs(y - cy) < 110) {
      radarCtx.fillStyle = contact.type === 'threat' ? '#ff6d76' : '#7df6b8';
      radarCtx.fillRect(x - 3, y - 3, 6, 6);
    }
  }

  radarCtx.fillStyle = '#dff9ff';
  radarCtx.fillRect(cx - 4, cy - 4, 8, 8);
}

function render() {
  drawInterior();
  drawRadar();
}

function update(dt) {
  movePlayer(dt);
  updateStats();
}

function gameLoop(time) {
  const dt = Math.min((time - (gameLoop.last || time)) / 1000, 0.033);
  gameLoop.last = time;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function boot() {
  setStation('helm');
  updateStats();
  logMessage('Launch sequence complete. Helm is active.');
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('DOMContentLoaded', boot);
































































































































































































































































































































































































































































































