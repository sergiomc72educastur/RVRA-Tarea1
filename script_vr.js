// IMPORTS (Three + VRButton)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

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

// Controles FPS (modo no-VR)
let pointerLocked = false;
const moveSpeed = 10;
const keys = { w: false, a: false, s: false, d: false };

let prevTime = performance.now() / 1000;
let lastSpawnTime = 0;

// Controlador VR para disparar
let vrController;

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

  // Renderizador con WebXR activado
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true; // WebXR activado
  container.appendChild(renderer.domElement);

  // Botón VR
  document.body.appendChild(VRButton.createButton(renderer));

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

  // Arma 3D pegada a la cámara (visible en plano y VR)
  createWeapon();

  scene.add(camera);

  // Controlador VR para disparar
  setupVRController();

  // Eventos de ventana
  window.addEventListener("resize", onWindowResize);

  // --- CONTROLES MODO NO-VR (FPS con ratón/teclado) ---
  const canvas = renderer.domElement;

  canvas.addEventListener("click", () => {
    // Solo pedimos pointer lock si NO estamos en VR
    if (!renderer.xr.isPresenting) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousedown", onMouseShoot);

  // Bucle de animación adaptado a WebXR
  renderer.setAnimationLoop(animate);
}

// -----------------------------
// SUELO
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
// ARMA
// -----------------------------
function createWeapon() {
  const geom = new THREE.BoxGeometry(0.5, 0.5, 1.5);
  const mat = new THREE.MeshPhongMaterial({ color: 0x00ffff });
  weapon = new THREE.Mesh(geom, mat);

  camera.add(weapon);
  weapon.position.set(0.6, -0.7, -1.5);
}

// -----------------------------
// VR CONTROLLER
// -----------------------------
function setupVRController() {
  vrController = renderer.xr.getController(0);
  if (!vrController) return;

  vrController.addEventListener("selectstart", onVRShoot);
  scene.add(vrController);

  // Pequeño gizmo para ver el mando (opcional)
  const geom = new THREE.SphereGeometry(0.05, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const ball = new THREE.Mesh(geom, mat);
  vrController.add(ball);
}

// -----------------------------
// ENEMIGOS
// -----------------------------
function spawnEnemy() {
  const geom = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff5555 });
  const enemy = new THREE.Mesh(geom, mat);

  const x = (Math.random() - 0.5) * 20;
  const z = -40;
  enemy.position.set(x, 1.5, z);

  enemy.userData.speed = 6;
  enemies.push(enemy);
  scene.add(enemy);
}

// -----------------------------
// CONTROLES NO-VR
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
  const toBlock = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  if (toBlock.includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyW" || event.code === "ArrowUp") keys.w = true;
  if (event.code === "KeyA" || event.code === "ArrowLeft") keys.a = true;
  if (event.code === "KeyS" || event.code === "ArrowDown") keys.s = true;
  if (event.code === "KeyD" || event.code === "ArrowRight") keys.d = true;
}

function onKeyUp(event) {
  if (event.code === "KeyW" || event.code === "ArrowUp") keys.w = false;
  if (event.code === "KeyA" || event.code === "ArrowLeft") keys.a = false;
  if (event.code === "KeyS" || event.code === "ArrowDown") keys.s = false;
  if (event.code === "KeyD" || event.code === "ArrowRight") keys.d = false;
}

// Disparo plano (click ratón) cuando NO estamos en VR
function onMouseShoot() {
  if (!pointerLocked || renderer.xr.isPresenting) return;
  shootFromCamera();
}

// -----------------------------
// DISPARO (COMPARTIDO)
// -----------------------------
function shootFromCamera() {
  shootDirection.set(0, 0, -1);
  shootDirection.applyQuaternion(camera.quaternion);

  raycaster.set(camera.position.clone(), shootDirection);
  hitEnemies();
}

function onVRShoot() {
  // Disparo desde el mando VR
  if (!vrController) return;

  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);

  origin.setFromMatrixPosition(vrController.matrixWorld);
  direction.applyQuaternion(vrController.quaternion);

  raycaster.set(origin, direction);
  hitEnemies();
}

function hitEnemies() {
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

  if (lives <= 0) gameOver();
}

function gameOver() {
  alert("GAME OVER\nPuntuación: " + score);
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
// BUCLE PRINCIPAL (WebXR)
// -----------------------------
function animate() {
  const currentTime = performance.now() / 1000;
  const delta = currentTime - prevTime;
  prevTime = currentTime;

  // Spawner de enemigos cada 2s
  if (currentTime - lastSpawnTime > 2) {
    spawnEnemy();
    lastSpawnTime = currentTime;
  }

  // Movimiento FPS solo si NO estamos en VR
  if (!renderer.xr.isPresenting && pointerLocked) {
    movePlayer(delta);
  }

  // Mover enemigos hacia el jugador/cámara
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

    const targetPos = new THREE.Vector3();
    // Posición de la cabeza del jugador (tanto en plano como en VR)
    targetPos.setFromMatrixPosition(camera.matrixWorld);
    targetPos.y = 1.5;

    const dir = new THREE.Vector3().subVectors(targetPos, enemy.position);
    const dist = dir.length();
    dir.normalize();

    enemy.position.addScaledVector(dir, enemy.userData.speed * delta);

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
