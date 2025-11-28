// ----------------------------------------
// DRONE DEFENDER 3D – Shooter básico
// ----------------------------------------

// Escena básica
let scene, camera, renderer;
let ground;
let weapon;
let weaponBarrel; // referencia al cañón del arma
let muzzleFlash;

const enemies = [];
const deathEffects = [];
const bullets = []; // proyectiles

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
  { x: -20, z: -20 },
  { x: 0, z: -25 },
  { x: 20, z: -20 },
  { x: -20, z: 20 },
  { x: 0, z: 25 },
  { x: 20, z: 20 }
];

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
  container.appendChild(renderer.domElement);

  // Luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Suelo + grid
  createGround();

  // Niebla
  scene.fog = new THREE.Fog(0x020314, 20, 80);

  // Arma
  createWeaponLowPoly();
  createMuzzleFlash();

  // Añadir cámara a la escena
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

  // Bucle
  animate();
}

// ----------------------------------------
// ESCENARIO
// ----------------------------------------
function createGround() {
  const geometry = new THREE.PlaneGeometry(40, 40);
  const material = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 10
  });
  ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(40, 20, 0x00ffff, 0x00aaaa);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

// ----------------------------------------
// ARMA LOW-POLY
// ----------------------------------------
function createWeaponLowPoly() {
  const group = new THREE.Group();

  // Cuerpo principal
  const bodyGeom = new THREE.BoxGeometry(0.2, 0.2, 1.0);
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0099ff });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(0, -0.05, -0.3);
  group.add(body);

  // Empuñadura
  const gripGeom = new THREE.BoxGeometry(0.12, 0.25, 0.18);
  const gripMat = new THREE.MeshPhongMaterial({ color: 0x004477 });
  const grip = new THREE.Mesh(gripGeom, gripMat);
  grip.position.set(0, -0.2, 0.1);
  grip.rotation.x = -0.4;
  group.add(grip);

  // Cañón
  const barrelGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const barrelMat = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const barrel = new THREE.Mesh(barrelGeom, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.8);
  group.add(barrel);

  // Guardamos referencia al cañón para balas
  weaponBarrel = barrel;

  // Detalle superior (mira / rail)
  const topGeom = new THREE.BoxGeometry(0.08, 0.06, 0.4);
  const topMat = new THREE.MeshPhongMaterial({ color: 0x00ffe0 });
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
    color: 0xffffaa,
    transparent: true,
    opacity: 0.0
  });
  muzzleFlash = new THREE.Mesh(geom, mat);
  muzzleFlash.position.set(0, 0.02, -0.95); // en el cañón del arma
  weapon.add(muzzleFlash);
}

// ----------------------------------------
// SPAWNER DE ENEMIGOS (OLEADAS + DRONES)
// ----------------------------------------
function spawnEnemy() {
  // --- Modelo de DRON low-poly como grupo ---
  const drone = new THREE.Group();

  // Cuerpo central
  const bodyGeom = new THREE.SphereGeometry(0.5, 16, 16);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0xff5555,
    shininess: 40
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  drone.add(body);

  // Barra central (brazo)
  const armGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
  const armMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const arm = new THREE.Mesh(armGeom, armMat);
  arm.rotation.z = Math.PI / 2;
  drone.add(arm);

  // Rotores (discos) izquierda / derecha
  const rotorGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
  const rotorMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

  const rotorLeft = new THREE.Mesh(rotorGeom, rotorMat);
  rotorLeft.position.set(-0.7, 0.15, 0);
  drone.add(rotorLeft);

  const rotorRight = new THREE.Mesh(rotorGeom, rotorMat);
  rotorRight.position.set(0.7, 0.15, 0);
  drone.add(rotorRight);

  // Luz frontal / cámara
  const camGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
  const camMat = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  const cam = new THREE.Mesh(camGeom, camMat);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0, -0.25, 0.25);
  drone.add(cam);

  // Posición inicial
  const basePos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
  const jitterX = (Math.random() - 0.5) * 4;
  const jitterZ = (Math.random() - 0.5) * 4;
  drone.position.set(basePos.x + jitterX, 1.5, basePos.z + jitterZ);

  // Dificultad por oleada
  const speedBase = 4;
  const speed = speedBase + (wave - 1) * 0.9 + Math.random() * 0.5; // + rápido
  drone.userData.speed = speed;

  drone.userData.time = 0;
  const waveFactor = 1 + 0.08 * (wave - 1); // más nervioso en waves altas
  drone.userData.bobAmplitude = (0.4 + Math.random() * 0.4) * waveFactor;
  drone.userData.bobSpeed = (1.5 + Math.random() * 1.0) * waveFactor;

  // Radio de colisión aproximado
  drone.userData.hitRadius = 0.9;

  enemies.push(drone);
  scene.add(drone);
}

// Intervalo de aparición según oleada (cada vez más rápido)
function getSpawnInterval() {
  const base = 2.2; // segundos
  const min = 0.4;
  const factor = Math.pow(0.88, wave - 1); // baja un 12% por oleada
  return Math.max(min, base * factor);
}

// Wave según puntuación (cada 10 kills sube)
function updateWaveFromScore() {
  const newWave = Math.floor(score / 10) + 1;
  if (newWave !== wave) {
    wave = newWave;
    updateWave();

    // Pequeño "burst" de bienvenida a la nueva oleada
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

  euler.y -= event.movementX * sensitivity; // yaw
  euler.x -= event.movementY * sensitivity; // pitch

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
}

function onKeyUp(event) {
  if (event.code === "KeyW" || event.code === "ArrowUp") keys.w = false;
  if (event.code === "KeyS" || event.code === "ArrowDown") keys.s = false;
  if (event.code === "KeyA" || event.code === "ArrowLeft") keys.a = false;
  if (event.code === "KeyD" || event.code === "ArrowRight") keys.d = false;
}

function onMouseDownShoot(event) {
  if (event.button !== 0) return; // solo botón izquierdo
  if (!pointerLocked || gameState !== "playing") return;

  isShooting = true;
  // Opcional: disparo inmediato al empezar a pulsar
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
  // Dirección hacia delante
  const direction = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .normalize();

  // Origen en la punta del cañón
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
  const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const bullet = new THREE.Mesh(geom, mat);

  bullet.position.copy(origin);
  bullet.userData.direction = direction.clone();
  bullet.userData.speed = 60; // velocidad de la bala
  bullet.userData.life = 0; // tiempo de vida

  bullets.push(bullet);
  scene.add(bullet);
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    // Avanzar
    bullet.position.addScaledVector(
      bullet.userData.direction,
      bullet.userData.speed * delta
    );
    bullet.userData.life += delta;

    // Si lleva mucho tiempo, se destruye
    if (bullet.userData.life > 2.0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    // Colisión con enemigos
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const dist = bullet.position.distanceTo(enemy.position);
      const enemyRadius = enemy.userData.hitRadius ?? 0.7;
      const hitRadius = enemyRadius + 0.12; // radio enemigo + bullet

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

function destroyEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
  createDeathEffect(enemy.position.clone());
  scene.remove(enemy);
}

function createDeathEffect(position) {
  const geom = new THREE.SphereGeometry(0.4, 10, 10);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.8
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
  lastSpawnTime = prevTime;
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
  // Spawn enemigos
  if (currentTime - lastSpawnTime > getSpawnInterval()) {
    spawnEnemy();
    lastSpawnTime = currentTime;
  }

  // Movimiento jugador
  if (pointerLocked) {
    movePlayer(delta);
  }

  // 🔥 FUEGO AUTOMÁTICO
  timeSinceLastShot += delta;
  if (pointerLocked && isShooting && timeSinceLastShot >= FIRE_RATE) {
    shootFromCamera();
    timeSinceLastShot = 0;
  }

  // Enemigos
  updateEnemies(delta, currentTime);

  // Balas
  updateBullets(delta);

  // Efectos
  updateMuzzleFlash(delta);
  updateDeathEffects(delta);
}


  renderer.render(scene, camera);
}

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

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(moveSpeed * delta);
    camera.position.add(move);
  }
}

function updateEnemies(delta, currentTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.userData.time += delta;

    const playerPos = camera.position.clone();
    playerPos.y = 1.5;

    const dir = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const dist = dir.length();
    dir.normalize();

    // Avance hacia el jugador
    enemy.position.addScaledVector(dir, enemy.userData.speed * delta);

    // Zig-zag lateral
    const side = new THREE.Vector3()
      .crossVectors(dir, new THREE.Vector3(0, 1, 0))
      .normalize();
    const sway =
      Math.sin(enemy.userData.time * enemy.userData.bobSpeed) *
      enemy.userData.bobAmplitude;
    enemy.position.addScaledVector(side, sway * delta * 4.0);

    // Flotación vertical ligera
    enemy.position.y = 1.5 + Math.sin(enemy.userData.time * 1.5) * 0.3;

    // Colisión con jugador
    if (dist < 1.5) {
      destroyEnemy(enemy);
      damagePlayer(1);
    }
  }
}

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
