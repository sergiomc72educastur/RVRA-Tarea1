// -----------------------------
// VARIABLES GLOBALES
// -----------------------------
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const PI_2 = Math.PI / 2;


let scene, camera, renderer;
let ground;
let weapon;
const enemies = [];

let score = 0;
let lives = 3;

const raycaster = new THREE.Raycaster();
const shootDirection = new THREE.Vector3();

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

// Control tipo FPS
let pointerLocked = false;
const moveSpeed = 10;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

let prevTime = performance.now() / 1000;
let lastSpawnTime = 0;

// -----------------------------
// INICIALIZACIÓN
// -----------------------------
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
  camera.rotation.order = "YXZ";
  camera.position.set(0, 2, 10);

  // Renderizador
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

  // Cielo / niebla
  scene.fog = new THREE.Fog(0x020314, 20, 80);

  // Arma 3D pegada a la cámara
  createWeapon();

  // Añadir la cámara a la escena
  scene.add(camera);

  // Eventos de ventana
  window.addEventListener("resize", onWindowResize);

  // Pointer lock (click sobre el canvas)
  const canvas = renderer.domElement;
  canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  // Ratón para mirar
  document.addEventListener("mousemove", onMouseMove);

  // Teclado para moverse
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Disparo con click
  document.addEventListener("mousedown", onShoot);

  // Empezar bucle
  animate();
}

// -----------------------------
// CREAR SUELO
// -----------------------------
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

// -----------------------------
// ARMA (1ª PERSONA)
// -----------------------------
function createWeapon() {
  const geom = new THREE.BoxGeometry(0.5, 0.5, 1.5);
  const mat = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  weapon = new THREE.Mesh(geom, mat);

  camera.add(weapon);
  weapon.position.set(0.6, -0.7, -1.5);
}

// -----------------------------
// ENEMIGOS (DRONES)
// -----------------------------
function spawnEnemy() {
  const geom = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff5555 });
  const enemy = new THREE.Mesh(geom, mat);

  const x = (Math.random() - 0.5) * 20; // dispersión horizontal
  const z = -40; // lejos delante
  enemy.position.set(x, 1.5, z);

  enemy.userData.speed = 6;
  enemies.push(enemy);
  scene.add(enemy);
}

// -----------------------------
// CONTROLES
// -----------------------------
function onMouseMove(event) {
  if (!pointerLocked) return;

  const sensitivity = 0.002;

  // Tomamos la rotación actual de la cámara
  euler.setFromQuaternion(camera.quaternion);

  // Yaw: izquierda/derecha (eje Y)
  euler.y -= event.movementX * sensitivity;

  // Pitch: arriba/abajo (eje X)
  // Aquí usamos el mismo signo que PointerLockControls
  euler.x -= event.movementY * sensitivity;

  // Limitar pitch para no romper el cuello (evitar volteretas)
  const max = PI_2 - 0.1; // un pelín menos de 90º
  if (euler.x > max) euler.x = max;
  if (euler.x < -max) euler.x = -max;

  // Aplicar de vuelta a la cámara
  camera.quaternion.setFromEuler(euler);
}


function onKeyDown(event) {
  // Evitar que las flechas y la barra espaciadora hagan scroll en la página
  const toBlock = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  if (toBlock.includes(event.code)) {
    event.preventDefault();
  }

  // WASD
  if (event.code === "KeyW") keys.w = true;
  if (event.code === "KeyA") keys.a = true;
  if (event.code === "KeyS") keys.s = true;
  if (event.code === "KeyD") keys.d = true;

  // Opcional: usar también flechas para moverse
  if (event.code === "ArrowUp") keys.w = true;
  if (event.code === "ArrowDown") keys.s = true;
  if (event.code === "ArrowLeft") keys.a = true;
  if (event.code === "ArrowRight") keys.d = true;
}

function onKeyUp(event) {
  if (event.code === "KeyW") keys.w = false;
  if (event.code === "KeyA") keys.a = false;
  if (event.code === "KeyS") keys.s = false;
  if (event.code === "KeyD") keys.d = false;

  // Soltar flechas también suelta el movimiento
  if (event.code === "ArrowUp") keys.w = false;
  if (event.code === "ArrowDown") keys.s = false;
  if (event.code === "ArrowLeft") keys.a = false;
  if (event.code === "ArrowRight") keys.d = false;
}

// -----------------------------
// DISPARO
// -----------------------------
function onShoot(event) {
  if (!pointerLocked) return; // si aún no tenemos el ratón bloqueado, no disparamos

  shootDirection.set(0, 0, -1);
  shootDirection.applyQuaternion(camera.quaternion);

  raycaster.set(camera.position.clone(), shootDirection);

  const intersects = raycaster.intersectObjects(enemies, false);
  if (intersects.length > 0) {
    const hit = intersects[0].object;
    destroyEnemy(hit);
    addScore(1);
  }
}

function destroyEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) enemies.splice(index, 1);
  scene.remove(enemy);
}

function addScore(amount) {
  score += amount;
  scoreEl.textContent = score;
}

function damagePlayer(amount) {
  lives -= amount;
  if (lives < 0) lives = 0;
  livesEl.textContent = lives;

  if (lives <= 0) {
    gameOver();
  }
}

function gameOver() {
  alert("GAME OVER\nPuntuación: " + score);
  // Reinicio rápido
  window.location.reload();
}

// -----------------------------
// REDIMENSIÓN
// -----------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------------
// BUCLE PRINCIPAL
// -----------------------------
function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000;
  const delta = currentTime - prevTime;
  prevTime = currentTime;

  // Spawner de enemigos cada 2 segundos aprox.
  if (currentTime - lastSpawnTime > 2) {
    spawnEnemy();
    lastSpawnTime = currentTime;
  }

  // Movimiento FPS si tenemos el ratón bloqueado
  if (pointerLocked) {
    movePlayer(delta);
  }

  // Mover enemigos hacia el jugador
  updateEnemies(delta);

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

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    const dir = new THREE.Vector3().subVectors(
      camera.position.clone().setY(1.5),
      enemy.position
    );
    const dist = dir.length();

    dir.normalize();
    enemy.position.addScaledVector(dir, enemy.userData.speed * delta);

    // Si llega demasiado cerca del jugador, daño
    if (dist < 1.5) {
      destroyEnemy(enemy);
      damagePlayer(1);
    }
  }
}

// -----------------------------
// INICIO
// -----------------------------
init();
