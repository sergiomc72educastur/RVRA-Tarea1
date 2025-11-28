// ----------------------------------------
// DRONE DEFENDER 3D – Shooter básico
// ----------------------------------------

// Escena básica
let scene, camera, renderer;
let ground;
let weapon;
let weaponBarrel; // referencia al cañón del arma
let muzzleFlash;

// Sprint
let sprint = false;
let stamina = 5;        // segundos de sprint
let maxStamina = 5;
let staminaRegen = 1.5; // por segundo
let staminaUse = 2.5;   // gasto por segundo

// Salto y gravedad
let velocityY = 0;
let gravity = -25;   // más fuerte = salto más contundente
let jumpForce = 12;
let isGrounded = true;

// Linterna
let flashlight;
let flashlightOn = false;

const enemies = [];
const deathEffects = [];
const bullets = []; // proyectiles
const obstacles = []; // obstaculos/coberturas colisionables

// Colisión básica
const PLAYER_RADIUS = 0.7;
const ENEMY_RADIUS = 0.7;

// Estado del juego
const MAX_LIVES = 3;
let score = 0;
let lives = MAX_LIVES;
let wave = 1;
let gameState = "menu"; // "menu" | "playing" | "gameover"

// Disparo automático
let isShooting = false;
let timeSinceLastShot = 0;
const FIRE_RATE = 0.12; // segundos entre disparos (≈ 8 balas/seg)

// Tiempo
let prevTime = performance.now() / 1000;
let lastSpawnTime = 0;

// Spawn / dificultad – puntos base de spawn
const SPAWN_POSITIONS = [
  { x: -24, z: -24 },
  { x: 0,   z: -25 },
  { x: 24,  z: -24 },
  { x: -24, z: 24 },
  { x: 0,   z: 25 },
  { x: 24,  z: 24 },
  { x: -25, z: 0 },
  { x: 25,  z: 0 }
];

// Límite “jugable” del mapa (dentro de la plataforma)
const ARENA_LIMIT = 27;

// Cámara FPS (pointer lock)
let pointerLocked = false;
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const PI_2 = Math.PI / 2;

const moveSpeed = 10;
const keys = { w: false, a: false, s: false, d: false };

// Efectos temporizados
let muzzleFlashTime = 0;

// HUD / DOM
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave-number");
const healthFillEl = document.getElementById("health-fill");
const staminaFillEl = document.getElementById("stamina-fill");

const startScreenEl = document.getElementById("start-screen");
const startButtonEl = document.getElementById("start-button");
const gameOverScreenEl = document.getElementById("game-over-screen");
const finalScoreEl = document.getElementById("final-score");
const restartButtonEl = document.getElementById("restart-button");

// ----------------------------------------
// INIT
// ----------------------------------------
function init() {
  const container = document.getElementById("game-container");

  // Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120419);

  // Cámara
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 2, 10);
  camera.rotation.order = "YXZ";

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x08020f, 1);
  container.appendChild(renderer.domElement);

  // Luces, entorno, arma, linterna...
  createGround();
  createEnvironment();
  scene.fog = new THREE.Fog(0x080311, 30, 100);
  createWeaponLowPoly();
  createMuzzleFlash();
  createFlashlight();
  scene.add(camera);

  // Eventos
  window.addEventListener("resize", onWindowResize);

  const canvas = renderer.domElement;
  canvas.addEventListener("click", () => {
    if (gameState === "playing") {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousedown", onMouseDownShoot);
  document.addEventListener("mouseup", onMouseUpShoot);

  // Botones
  startButtonEl.addEventListener("click", startGame);
  restartButtonEl.addEventListener("click", () => window.location.reload());

  // Estado inicial HUD
  updateScore();
  updateLives();
  updateWave();
  updateHealthBar();
  updateStaminaBar();   // 👈 aquí la llamamos

  // Bucle
  animate();
}


// ----------------------------------------
// REGISTRO DE OBSTÁCULOS / COLISIÓN
// ----------------------------------------
function registerObstacle(mesh) {
  const params = mesh.geometry.parameters || {};
  let halfX, halfZ;

  if (params.width && params.depth) {
    // BoxGeometry
    halfX = params.width / 2;
    halfZ = params.depth / 2;
  } else if (params.radiusTop || params.radiusBottom) {
    // CylinderGeometry
    const r = Math.max(params.radiusTop || 0, params.radiusBottom || 0);
    halfX = r;
    halfZ = r;
  } else {
    // Fallback
    halfX = 1;
    halfZ = 1;
  }

  obstacles.push({ mesh, halfX, halfZ });
}

function collidesWithObstacles(pos, radius) {
  for (const o of obstacles) {
    const dx = Math.abs(pos.x - o.mesh.position.x);
    const dz = Math.abs(pos.z - o.mesh.position.z);
    if (dx < (o.halfX + radius) && dz < (o.halfZ + radius)) {
      return true;
    }
  }
  return false;
}

function insideBounds(pos) {
  return (
    pos.x > -ARENA_LIMIT &&
    pos.x < ARENA_LIMIT &&
    pos.z > -ARENA_LIMIT &&
    pos.z < ARENA_LIMIT
  );
}

// ----------------------------------------
// ESCENARIO / ENTORNO
// ----------------------------------------
function createGround() {
  const platformGeom = new THREE.BoxGeometry(60, 1, 60);
  const platformMat = new THREE.MeshPhongMaterial({
    color: 0x1a1024,
    shininess: 60,
    emissive: 0x18031f
  });
  ground = new THREE.Mesh(platformGeom, platformMat);
  ground.position.y = -0.5;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(56, 28, 0x00f7ff, 0x005a79);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xff00aa,
    transparent: true,
    opacity: 0.55
  });
  const edgeGeomX = new THREE.BoxGeometry(56, 0.05, 0.25);
  const edgeGeomZ = new THREE.BoxGeometry(0.25, 0.05, 56);

  const edge1 = new THREE.Mesh(edgeGeomX, edgeMat);
  edge1.position.set(0, 0.05, 28);
  const edge2 = edge1.clone();
  edge2.position.set(0, 0.05, -28);

  const edge3 = new THREE.Mesh(edgeGeomZ, edgeMat);
  edge3.position.set(28, 0.05, 0);
  const edge4 = edge3.clone();
  edge4.position.set(-28, 0.05, 0);

  scene.add(edge1, edge2, edge3, edge4);
}

function createEnvironment() {
  const wallGeom = new THREE.BoxGeometry(62, 4, 0.8);
  const wallMat = new THREE.MeshPhongMaterial({
    color: 0x120812,
    emissive: 0x2b0328,
    shininess: 15
  });

  const wallFront = new THREE.Mesh(wallGeom, wallMat);
  wallFront.position.set(0, 1.5, -30.4);
  scene.add(wallFront);
  registerObstacle(wallFront);

  const wallBack = wallFront.clone();
  wallBack.position.set(0, 1.5, 30.4);
  scene.add(wallBack);
  registerObstacle(wallBack);

  const wallSideGeom = new THREE.BoxGeometry(0.8, 4, 62);
  const wallLeft = new THREE.Mesh(wallSideGeom, wallMat);
  wallLeft.position.set(-30.4, 1.5, 0);
  scene.add(wallLeft);
  registerObstacle(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.set(30.4, 1.5, 0);
  scene.add(wallRight);
  registerObstacle(wallRight);

  const columnGeom = new THREE.CylinderGeometry(0.7, 0.7, 8, 16);
  const columnMat = new THREE.MeshPhongMaterial({
    color: 0x25152f,
    emissive: 0x3e0b57,
    shininess: 40
  });

  const cornerPositions = [
    [-26, 4, -26],
    [26, 4, -26],
    [-26, 4, 26],
    [26, 4, 26]
  ];

  cornerPositions.forEach(([x, y, z]) => {
    const col = new THREE.Mesh(columnGeom, columnMat);
    col.position.set(x, y, z);
    scene.add(col);
    registerObstacle(col);

    const stripGeom = new THREE.BoxGeometry(0.2, 6.5, 0.12);
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0xff5ee1,
      transparent: true,
      opacity: 0.8
    });
    const strip = new THREE.Mesh(stripGeom, stripMat);
    strip.position.set(x, y, z + 0.4);
    scene.add(strip);
  });

  const coverMat = new THREE.MeshPhongMaterial({
    color: 0x1a2238,
    shininess: 25,
    emissive: 0x051529
  });

  const centerWallGeom = new THREE.BoxGeometry(14, 2.4, 1.2);
  const centerWall = new THREE.Mesh(centerWallGeom, coverMat);
  centerWall.position.set(0, 1.2, 0);
  scene.add(centerWall);
  registerObstacle(centerWall);

  const blockGeom = new THREE.BoxGeometry(4.5, 2.4, 3);
  const block1 = new THREE.Mesh(blockGeom, coverMat);
  block1.position.set(-12, 1.2, -8);
  scene.add(block1);
  registerObstacle(block1);

  const block2 = block1.clone();
  block2.position.set(-18, 1.2, 4);
  scene.add(block2);
  registerObstacle(block2);

  const block3 = block1.clone();
  block3.position.set(12, 1.2, 8);
  scene.add(block3);
  registerObstacle(block3);

  const block4 = block1.clone();
  block4.position.set(18, 1.2, -4);
  scene.add(block4);
  registerObstacle(block4);

  const lowCoverGeom = new THREE.BoxGeometry(3.5, 1.4, 1);
  const lowCoverMat = new THREE.MeshPhongMaterial({
    color: 0x291b35,
    emissive: 0x460d50
  });

  const lc1 = new THREE.Mesh(lowCoverGeom, lowCoverMat);
  lc1.position.set(-4, 0.7, -10);
  scene.add(lc1);
  registerObstacle(lc1);

  const lc2 = lc1.clone();
  lc2.position.set(4, 0.7, -10);
  scene.add(lc2);
  registerObstacle(lc2);

  const lc3 = lc1.clone();
  lc3.position.set(0, 0.7, -14);
  scene.add(lc3);
  registerObstacle(lc3);

  const drumGeom = new THREE.CylinderGeometry(1.2, 1.2, 2.6, 16);
  const drumMat = new THREE.MeshPhongMaterial({
    color: 0xff7b29,
    emissive: 0x7a2d08,
    shininess: 35
  });

  const drumsPositions = [
    [-10, 0, 14],
    [10, 0, 16],
    [16, 0, -16],
    [-16, 0, -14]
  ];

  drumsPositions.forEach(([x, y, z]) => {
    const drum = new THREE.Mesh(drumGeom, drumMat);
    drum.position.set(x, y + 1.3, z);
    scene.add(drum);
    registerObstacle(drum);
  });

  const skyGeom = new THREE.SphereGeometry(140, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x140017,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeom, skyMat);
  scene.add(sky);
}

// ----------------------------------------
// ARMA LOW-POLY (tono amarillo-verde)
// ----------------------------------------
function createWeaponLowPoly() {
  const group = new THREE.Group();

  const bodyGeom = new THREE.BoxGeometry(0.2, 0.2, 1.0);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0xd4ff3f,
    emissive: 0x3a4f0a,
    shininess: 60
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(0, -0.05, -0.3);
  group.add(body);

  const gripGeom = new THREE.BoxGeometry(0.12, 0.25, 0.18);
  const gripMat = new THREE.MeshPhongMaterial({
    color: 0x224422,
    emissive: 0x0a1a0a
  });
  const grip = new THREE.Mesh(gripGeom, gripMat);
  grip.position.set(0, -0.2, 0.1);
  grip.rotation.x = -0.4;
  group.add(grip);

  const barrelGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const barrelMat = new THREE.MeshPhongMaterial({
    color: 0xb2ff00,
    emissive: 0x355f00
  });
  const barrel = new THREE.Mesh(barrelGeom, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.8);
  group.add(barrel);

  weaponBarrel = barrel;

  const topGeom = new THREE.BoxGeometry(0.08, 0.06, 0.4);
  const topMat = new THREE.MeshPhongMaterial({
    color: 0xe8ff72,
    emissive: 0x6b7a17
  });
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.set(0, 0.08, -0.1);
  group.add(top);

  weapon = group;
  camera.add(weapon);
  weapon.position.set(0.6, -0.7, -1.5);
}

// Muzzle flash
function createMuzzleFlash() {
  const geom = new THREE.SphereGeometry(0.08, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff1a1,
    transparent: true,
    opacity: 0.0
  });
  muzzleFlash = new THREE.Mesh(geom, mat);
  muzzleFlash.position.set(0, 0.02, -0.95);
  weapon.add(muzzleFlash);
}

// ----------------------------------------
// LINTERNA (SpotLight)
// ----------------------------------------
function createFlashlight() {
  flashlight = new THREE.SpotLight(0xfff2ce, 0, 30, Math.PI / 8, 0.4, 1.0);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, -1);

  camera.add(flashlight);
  camera.add(flashlight.target);
}

function toggleFlashlight() {
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 2.8 : 0.0;
}

// ----------------------------------------
// SPAWNER DE ENEMIGOS (OLEADAS + DRONES)
// ----------------------------------------
function spawnEnemy() {
  const drone = new THREE.Group();

  const palette = [
    0xff4c4c,
    0xff9f1c,
    0xff3fd1,
    0x3ffcff
  ];
  const colorHex = palette[(wave - 1) % palette.length];

  const bodyGeom = new THREE.SphereGeometry(0.5, 16, 16);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: colorHex,
    emissive: 0x220009,
    shininess: 90
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  drone.add(body);

  const armGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
  const armMat = new THREE.MeshPhongMaterial({ color: 0x1b1b24 });
  const arm = new THREE.Mesh(armGeom, armMat);
  arm.rotation.z = Math.PI / 2;
  drone.add(arm);

  const rotorGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
  const rotorMat = new THREE.MeshPhongMaterial({
    color: 0x151515,
    emissive: 0x052025
  });

  const rotorLeft = new THREE.Mesh(rotorGeom, rotorMat);
  rotorLeft.position.set(-0.7, 0.25, 0);
  drone.add(rotorLeft);

  const rotorRight = new THREE.Mesh(rotorGeom, rotorMat);
  rotorRight.position.set(0.7, 0.25, 0);
  drone.add(rotorRight);

  const camGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12);
  const camMat = new THREE.MeshPhongMaterial({
    color: 0x00f3ff,
    emissive: 0x007888
  });
  const cam = new THREE.Mesh(camGeom, camMat);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0, -0.25, 0.25);
  drone.add(cam);

  const lightGeom = new THREE.SphereGeometry(0.08, 10, 10);
  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0xff5ee1,
    transparent: true,
    opacity: 0.95
  });
  const thr1 = new THREE.Mesh(lightGeom, thrusterMat);
  thr1.position.set(-0.3, -0.45, -0.1);
  const thr2 = thr1.clone();
  thr2.position.set(0.3, -0.45, -0.1);
  drone.add(thr1, thr2);

  const basePos =
    SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
  const jitterX = (Math.random() - 0.5) * 4;
  const jitterZ = (Math.random() - 0.5) * 4;

  let spawnX = basePos.x + jitterX;
  let spawnZ = basePos.z + jitterZ;

  const margin = 1.5;
  const limit = ARENA_LIMIT - margin;
  if (spawnX >  limit) spawnX =  limit;
  if (spawnX < -limit) spawnX = -limit;
  if (spawnZ >  limit) spawnZ =  limit;
  if (spawnZ < -limit) spawnZ = -limit;

  drone.position.set(spawnX, 1.8, spawnZ);

  const speedBase = 4;
  const speed = speedBase + (wave - 1) * 0.9 + Math.random() * 0.5;
  drone.userData.speed = speed;

  drone.userData.time = 0;
  const waveFactor = 1 + 0.08 * (wave - 1);
  drone.userData.bobAmplitude = (0.4 + Math.random() * 0.4) * waveFactor;
  drone.userData.bobSpeed = (1.5 + Math.random() * 1.0) * waveFactor;

  drone.userData.hitRadius = ENEMY_RADIUS;
  drone.userData.rotors = [rotorLeft, rotorRight];

  enemies.push(drone);
  scene.add(drone);
}

// Intervalo de aparición según oleada (cada vez más rápido)
function getSpawnInterval() {
  const base = 2.2;
  const min = 0.4;
  const factor = Math.pow(0.88, wave - 1);
  return Math.max(min, base * factor);
}

// Wave según puntuación (cada 10 kills sube)
function updateWaveFromScore() {
  const newWave = Math.floor(score / 10) + 1;
  if (newWave !== wave) {
    wave = newWave;
    updateWave();

    const extra = Math.min(3 + wave, 8);
    for (let i = 0; i < extra; i++) {
      spawnEnemy();
    }
  }
}

// ----------------------------------------
// CONTROLES
// ----------------------------------------
function onMouseMove(event) {
  if (!pointerLocked || gameState !== "playing") return;

  const sensitivity = 0.002;

  euler.setFromQuaternion(camera.quaternion);

  euler.y -= event.movementX * sensitivity;
  euler.x -= event.movementY * sensitivity;

  const max = PI_2 - 0.1;
  if (euler.x > max) euler.x = max;
  if (euler.x < -max) euler.x = -max;

  camera.quaternion.setFromEuler(euler);
}

function onKeyDown(event) {
  const toBlock = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  if (toBlock.includes(event.code)) event.preventDefault();

  if (event.code === "KeyW" || event.code === "ArrowUp") keys.w = true;
  if (event.code === "KeyS" || event.code === "ArrowDown") keys.s = true;
  if (event.code === "KeyA" || event.code === "ArrowLeft") keys.a = true;
  if (event.code === "KeyD" || event.code === "ArrowRight") keys.d = true;
  if (event.code === "ShiftLeft") sprint = true;

  // Salto
  if (event.code === "Space" && isGrounded) {
    velocityY = jumpForce;
    isGrounded = false;
  }

  if (event.code === "KeyF" && gameState === "playing") {
    toggleFlashlight();
  }
}

function onKeyUp(event) {
  if (event.code === "KeyW" || event.code === "ArrowUp") keys.w = false;
  if (event.code === "KeyS" || event.code === "ArrowDown") keys.s = false;
  if (event.code === "KeyA" || event.code === "ArrowLeft") keys.a = false;
  if (event.code === "KeyD" || event.code === "ArrowRight") keys.d = false;
  if (event.code === "ShiftLeft") sprint = false;
}

function onMouseDownShoot(event) {
  if (event.button !== 0) return;
  if (!pointerLocked || gameState !== "playing") return;

  isShooting = true;
  shootFromCamera();
  timeSinceLastShot = 0;
}

function onMouseUpShoot(event) {
  if (event.button !== 0) return;
  isShooting = false;
}

// ----------------------------------------
// DISPARO + PROYECTILES
// ----------------------------------------
function shootFromCamera() {
  const direction = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .normalize();

  const origin = new THREE.Vector3();
  if (weaponBarrel) {
    weaponBarrel.getWorldPosition(origin);
  } else {
    origin.copy(camera.position);
  }

  spawnBullet(origin, direction);
  triggerMuzzleFlash();
}

function spawnBullet(origin, direction) {
  const geom = new THREE.SphereGeometry(0.08, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0x5ff6ff });
  const bullet = new THREE.Mesh(geom, mat);

  bullet.position.copy(origin);
  bullet.userData.direction = direction.clone();
  bullet.userData.speed = 60;
  bullet.userData.life = 0;

  bullets.push(bullet);
  scene.add(bullet);
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.position.addScaledVector(
      bullet.userData.direction,
      bullet.userData.speed * delta
    );
    bullet.userData.life += delta;

    if (bullet.userData.life > 2.0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dist = bullet.position.distanceTo(enemy.position);
      const enemyRadius = enemy.userData.hitRadius ?? ENEMY_RADIUS;
      const hitRadius = enemyRadius + 0.12;

      if (dist < hitRadius) {
        destroyEnemy(enemy);
        addScore(1);
        hit = true;
        break;
      }
    }

    if (hit) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
}

function triggerMuzzleFlash() {
  muzzleFlashTime = 0.08;
  muzzleFlash.material.opacity = 1.0;
  muzzleFlash.scale.set(1, 1, 1);
}

// ----------------------------------------
// DESTRUIR ENEMIGO / EFECTOS
// ----------------------------------------
function destroyEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
  createDeathEffect(enemy.position.clone());
  scene.remove(enemy);
}

function createDeathEffect(position) {
  const geom = new THREE.SphereGeometry(0.4, 10, 10);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.9
  });
  const effect = new THREE.Mesh(geom, mat);
  effect.position.copy(position);

  deathEffects.push({ mesh: effect, time: 0 });
  scene.add(effect);
}

// ----------------------------------------
// GAMEPLAY: VIDA / HUD
// ----------------------------------------
function addScore(amount) {
  score += amount;
  updateScore();
  updateWaveFromScore();
}

function damagePlayer(amount) {
  lives -= amount;
  if (lives < 0) lives = 0;
  updateLives();
  updateHealthBar();

  if (lives <= 0) gameOver();
}

function updateScore() {
  scoreEl.textContent = score;
}

function updateLives() {
  livesEl.textContent = lives;
}

function updateWave() {
  waveEl.textContent = wave;
}

function updateHealthBar() {
  const ratio = lives / MAX_LIVES;
  healthFillEl.style.width = `${Math.max(0, ratio) * 100}%`;
}

function startGame() {
  if (gameState !== "menu") return;
  gameState = "playing";
  startScreenEl.classList.add("hidden");
  prevTime = performance.now() / 1000;
  lastSpawnTime = prevTime - getSpawnInterval();
}

function gameOver() {
  if (gameState === "gameover") return;
  gameState = "gameover";
  finalScoreEl.textContent = score;
  gameOverScreenEl.classList.remove("hidden");
  document.exitPointerLock?.();
}

// ----------------------------------------
// LOOP
// ----------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000;
  const delta = currentTime - prevTime;
  prevTime = currentTime;

  if (gameState === "playing") {
    if (currentTime - lastSpawnTime > getSpawnInterval()) {
      spawnEnemy();
      lastSpawnTime = currentTime;
    }

    if (pointerLocked) {
      movePlayer(delta);
    }

    timeSinceLastShot += delta;
    if (pointerLocked && isShooting && timeSinceLastShot >= FIRE_RATE) {
      shootFromCamera();
      timeSinceLastShot = 0;
    }

    updateEnemies(delta, currentTime);
    updateBullets(delta);
    updateMuzzleFlash(delta);
    updateDeathEffects(delta);
  }

  renderer.render(scene, camera);
}

// ----------------------------------------
// MOVIMIENTO JUGADOR CON COLISIÓN
// ----------------------------------------
function movePlayer(delta) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3();

  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.a) move.sub(right);
  if (keys.d) move.add(right);

  let speed = moveSpeed;

  // Sprint solo si hay stamina disponible
  if (sprint && stamina > 0) {
    speed *= 1.8;
    stamina -= staminaUse * delta;
  } else {
    sprint = false;
  }

  // Regeneración de stamina
  if (!sprint && stamina < maxStamina) {
    stamina += staminaRegen * delta;
  }

  stamina = Math.max(0, Math.min(maxStamina, stamina));
  updateStaminaBar();


  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
  } else {
    move.set(0, 0, 0);
  }

  const currentPos = camera.position.clone();
  let newPos = currentPos.clone();

  // Eje X
  const tryX = new THREE.Vector3(
    currentPos.x + move.x,
    currentPos.y,
    currentPos.z
  );
  if (!collidesWithObstacles(tryX, PLAYER_RADIUS) && insideBounds(tryX)) {
    newPos.x = tryX.x;
  }

  // Eje Z
  const tryZ = new THREE.Vector3(
    newPos.x,
    currentPos.y,
    currentPos.z + move.z
  );
  if (!collidesWithObstacles(tryZ, PLAYER_RADIUS) && insideBounds(tryZ)) {
    newPos.z = tryZ.z;
  }

  // SALTO / GRAVEDAD
  velocityY += gravity * delta;
  let nextY = camera.position.y + velocityY * delta;

  const groundLevel = 1.8;

  if (nextY <= groundLevel) {
    nextY = groundLevel;
    velocityY = 0;
    isGrounded = true;
  } else {
    isGrounded = false;
  }

  camera.position.set(newPos.x, nextY, newPos.z);
}

// ----------------------------------------
// ENEMIGOS CON COLISIÓN
// ----------------------------------------
function updateEnemies(delta, currentTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    // Anti-atasco: si lleva mucho tiempo sin moverse, darle un empujón lateral
    if (!enemy.userData.lastPos) enemy.userData.lastPos = enemy.position.clone();
    if (!enemy.userData.stuckTime) enemy.userData.stuckTime = 0;

    const movedDist = enemy.position.distanceTo(enemy.userData.lastPos);

    if (movedDist < 0.05) {
      enemy.userData.stuckTime += delta;
    } else {
      enemy.userData.stuckTime = 0;
      enemy.userData.lastPos.copy(enemy.position);
    }

    if (enemy.userData.stuckTime > 0.3) {
      const nudge = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(2);

      enemy.position.add(nudge);
      enemy.userData.stuckTime = 0;
    }

    enemy.userData.time += delta;

    const playerPos = camera.position.clone();
    playerPos.y = 1.8;

    const dir = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const dist = dir.length();
    dir.normalize();

    const side = new THREE.Vector3()
      .crossVectors(dir, new THREE.Vector3(0, 1, 0))
      .normalize();
    const sway =
      Math.sin(enemy.userData.time * enemy.userData.bobSpeed) *
      enemy.userData.bobAmplitude;

    let newPos = enemy.position.clone();
    newPos.addScaledVector(dir, enemy.userData.speed * delta);
    newPos.addScaledVector(side, sway * delta * 4.0);
    newPos.y = 1.8 + Math.sin(enemy.userData.time * 1.5) * 0.3;

    if (!collidesWithObstacles(newPos, ENEMY_RADIUS) && insideBounds(newPos)) {
      enemy.position.copy(newPos);
    } else {
      let altPos = enemy.position.clone();
      altPos.addScaledVector(dir, enemy.userData.speed * delta);
      altPos.y = newPos.y;
      if (
        !collidesWithObstacles(altPos, ENEMY_RADIUS) &&
        insideBounds(altPos)
      ) {
        enemy.position.copy(altPos);
      }
    }

    if (enemy.userData.rotors) {
      const spin = 12 * delta * (1 + 0.08 * (wave - 1));
      enemy.userData.rotors.forEach((r) => {
        r.rotation.y += spin;
      });
    }

    enemy.lookAt(playerPos);

    const finalDist = enemy.position.distanceTo(playerPos);
    if (finalDist < 1.5) {
      destroyEnemy(enemy);
      damagePlayer(1);
    }
  }
}

// ----------------------------------------
// EFECTOS TEMPORALES
// ----------------------------------------
function updateMuzzleFlash(delta) {
  if (muzzleFlashTime > 0) {
    muzzleFlashTime -= delta;
    if (muzzleFlashTime <= 0) {
      muzzleFlash.material.opacity = 0.0;
    } else {
      const t = muzzleFlashTime / 0.08;
      muzzleFlash.material.opacity = t;
      const s = 1 + (1 - t) * 0.8;
      muzzleFlash.scale.set(s, s, s);
    }
  }
}

function updateDeathEffects(delta) {
  for (let i = deathEffects.length - 1; i >= 0; i--) {
    const eff = deathEffects[i];
    eff.time += delta;

    const life = 0.4;
    const t = eff.time / life;

    if (t >= 1) {
      scene.remove(eff.mesh);
      deathEffects.splice(i, 1);
      continue;
    }

    const s = 1 + t * 2;
    eff.mesh.scale.set(s, s, s);
    eff.mesh.material.opacity = 0.8 * (1 - t);
  }
}

// ----------------------------------------
// REDIMENSIÓN
// ----------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------------------------
// INICIO
// ----------------------------------------
init();
