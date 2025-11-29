// ----------------------------------------
// DRONE DEFENDER 3D – Shooter básico
// ----------------------------------------

// Paleta de colores centralizada
const PALETTE = {
  bg:        0x050018, // fondo escena
  fog:       0x050010,

  floor:     0x0b1024,
  floorEm:   0x141a3a,

  gridMain:  0x00e2ff,
  gridAlt:   0x0074ff,
  edge:      0x00ffc8,

  wall:      0x090b1c,
  wallEm:    0x181c3c,

  column:    0x10152b,
  columnEm:  0x3b1c70,

  cover:     0x0b1e32,
  coverEm:   0x093454,

  lowCover:  0x151634,
  lowCoverEm:0x3b0f52,

  drum:      0xffb84d,
  drumEm:    0x8a4710,

  sky:       0x04000c,

  weaponBody:   0xa8ff60,
  weaponBodyEm: 0x335819,
  weaponGrip:   0x243524,
  weaponGripEm: 0x0b160b,
  weaponBarrel: 0x92ff4a,
  weaponBarrelEm:0x325f14,
  weaponTop:    0xdfff8a,
  weaponTopEm:  0x6b7a24,

  enemyBody:   [0xff4c8c, 0xffb84d, 0x5df2ff, 0x9b7bff],
  enemyEm:     0x320020,   
  enemyEye:    0x00f3ff,
  enemyEyeEm:  0x0088aa,
  enemyEmitter:0x00ffe1

};


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

// Spawn / dificultad – puntos base de spawn (actualizado para arena más grande)
const SPAWN_POSITIONS = [
  { x: -40, z: -40 },
  { x: 0,   z: -42 },
  { x: 40,  z: -40 },
  { x: -40, z: 40 },
  { x: 0,   z: 42 },
  { x: 40,  z: 40 },
  { x: -42, z: 0 },
  { x: 42,  z: 0 },
  { x: -28, z: -28 },
  { x: 28,  z: -28 },
  { x: -28, z: 28 },
  { x: 28,  z: 28 }
];

// Límite "jugable" del mapa (dentro de la plataforma) - ARENA AMPLIADA
const ARENA_LIMIT = 45;

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
  scene.fog = new THREE.Fog(PALETTE.fog, 40, 150); // Niebla ajustada para arena más grande


  // Cámara
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 2.5, 10); // Altura inicial aumentada
  camera.rotation.order = "YXZ";

// Renderer
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- ACTIVAR VR / WEBXR (solo si VRButton está disponible) ---
if (typeof VRButton !== "undefined") {
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));
} else {
  renderer.xr.enabled = false; // modo solo PC
  console.warn("VRButton no disponible; continuando en modo solo PC.");
}

// Más físico y con mejor contraste
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setClearColor(PALETTE.bg, 1);


// 🔹 IMPORTANTE: montar el canvas en el DOM
container.appendChild(renderer.domElement);


// LUCES (solo este bloque, elimina las luces antiguas)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x88ccff, 1.0);
dirLight.position.set(20, 40, 10);
scene.add(dirLight);

// Luces, entorno, arma, linterna...
createGround();
createEnvironment();
scene.fog = new THREE.Fog(PALETTE.fog, 40, 150); // Niebla ajustada
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
  updateStaminaBar();

// Bucle VR
renderer.setAnimationLoop(animate);
}


// ----------------------------------------
// REGISTRO DE OBSTÁCULOS / COLISIÓN
// ----------------------------------------
function registerObstacle(mesh, options = {}) {
  const params = mesh.geometry.parameters || {};
  let halfX, halfZ, halfHeight;

  if (params.width && params.depth) {
    // BoxGeometry - considerar escala
    const scaleX = mesh.scale ? mesh.scale.x : 1;
    const scaleZ = mesh.scale ? mesh.scale.z : 1;
    const scaleY = mesh.scale ? mesh.scale.y : 1;
    
    const width = params.width * scaleX;
    const depth = params.depth * scaleZ;
    const height = params.height * scaleY;
    
    halfX = width / 2;
    halfZ = depth / 2;
    halfHeight = height / 2;
  } else if (params.radiusTop || params.radiusBottom) {
    // CylinderGeometry
    const scaleX = mesh.scale ? mesh.scale.x : 1;
    const scaleY = mesh.scale ? mesh.scale.y : 1;
    
    const r = Math.max(params.radiusTop || 0, params.radiusBottom || 0) * scaleX;
    const height = params.height * scaleY;
    
    halfX = r;
    halfZ = r;
    halfHeight = height / 2;
  } else {
    // Fallback
    halfX = 1;
    halfZ = 1;
    halfHeight = 1;
  }

  obstacles.push({ 
    mesh, 
    halfX, 
    halfZ,
    halfHeight,  // Guardar altura para colisiones verticales
    jumpable: options.jumpable || false  // Si es true, se puede saltar sobre él
  });
}

// Función para obtener la altura de la plataforma más alta bajo el jugador
function getPlatformHeightUnderPlayer(posX, posZ, radius) {
  let maxPlatformTop = null;
  
  for (const o of obstacles) {
    if (!o.jumpable) continue; // Solo plataformas saltables
    
    const dx = Math.abs(posX - o.mesh.position.x);
    const dz = Math.abs(posZ - o.mesh.position.z);
    
    // Verificar si está sobre la plataforma horizontalmente
    if (dx < (o.halfX + radius) && dz < (o.halfZ + radius)) {
      if (o.halfHeight !== undefined) {
        const platformTop = o.mesh.position.y + o.halfHeight;
        if (maxPlatformTop === null || platformTop > maxPlatformTop) {
          maxPlatformTop = platformTop;
        }
      }
    }
  }
  
  return maxPlatformTop;
}

function collidesWithObstacles(pos, radius, checkHeight = true) {
  // Normalizar pos a objeto con x, y, z
  const posX = pos.x !== undefined ? pos.x : (pos.get ? pos.get('x') : 0);
  const posY = pos.y !== undefined ? pos.y : (pos.get ? pos.get('y') : 0);
  const posZ = pos.z !== undefined ? pos.z : (pos.get ? pos.get('z') : 0);
  
  // Altura del jugador/enemigo (centro del cuerpo)
  const playerHeight = checkHeight ? posY : 1.8;
  const playerRadius = radius;
  
  // El jugador/enemigo tiene una altura aproximada de 1.6 unidades
  const playerTop = playerHeight + 0.8;   // Parte superior (cabeza)
  const playerBottom = playerHeight - 0.8; // Parte inferior (pies)
  
  for (const o of obstacles) {
    // Calcular distancia horizontal desde el centro del obstáculo
    const dx = Math.abs(posX - o.mesh.position.x);
    const dz = Math.abs(posZ - o.mesh.position.z);
    
    // COLISIÓN HORIZONTAL: Siempre verificar (no se puede atravesar lateralmente)
    const collisionXZ = (dx < (o.halfX + playerRadius)) && (dz < (o.halfZ + playerRadius));
    
    if (collisionXZ) {
      if (o.halfHeight !== undefined) {
        const obstacleTop = o.mesh.position.y + o.halfHeight;
        const obstacleBottom = o.mesh.position.y - o.halfHeight;
        
        // TODOS LOS OBSTÁCULOS SON SALTABLES (excepto paredes exteriores que no tienen jumpable)
        if (o.jumpable) {
          // Si está COMPLETAMENTE ENCIMA (pies por encima del top), NO colisiona verticalmente
          // Pero SÍ colisiona horizontalmente si intenta atravesar lateralmente
          if (playerBottom > obstacleTop + 0.1) {
            // Está encima, no colisiona verticalmente, pero sigue colisionando horizontalmente
            // Esto se maneja en el movimiento horizontal, no aquí
            continue; // No colisiona verticalmente
          }
          
          // Si está dentro o debajo del obstáculo verticalmente, colisiona
          if (playerBottom <= obstacleTop && playerTop > obstacleBottom) {
            return { collides: true, isRamp: false, onTop: false };
          }
        } else {
          // OBSTÁCULOS SÓLIDOS (solo paredes exteriores): Siempre colisionan
          if (playerBottom < obstacleTop && playerTop > obstacleBottom) {
            return { collides: true, isRamp: false, onTop: false };
          }
        }
      } else {
        // Si no hay altura definida, asumir que es un obstáculo bajo (suelo)
        if (playerBottom <= o.mesh.position.y + 0.5) {
          return { collides: true, isRamp: false, onTop: false };
        }
      }
    }
  }
  
  // Verificar si está sobre una plataforma saltable
  const platformHeight = getPlatformHeightUnderPlayer(posX, posZ, playerRadius);
  // El jugador está sobre la plataforma si su parte inferior está cerca o por encima del top de la plataforma
  // Con el nuevo offset de 1.1, playerBottom debería estar alrededor de platformHeight + 0.3
  const isOnPlatform = platformHeight !== null && playerBottom >= platformHeight - 0.3 && playerBottom <= platformHeight + 0.5;
  
  return { collides: false, isRamp: false, onTop: isOnPlatform };
}

// Función para empujar al jugador fuera de un obstáculo si está atrapado
function pushPlayerOutOfObstacle(pos, radius) {
  const posX = pos.x !== undefined ? pos.x : (pos.get ? pos.get('x') : 0);
  const posY = pos.y !== undefined ? pos.y : (pos.get ? pos.get('y') : 0);
  const posZ = pos.z !== undefined ? pos.z : (pos.get ? pos.get('z') : 0);
  
  const collision = collidesWithObstacles(pos, radius, true);
  if (!collision.collides) {
    // Si no hay colisión, verificar que esté dentro de los límites
    if (insideBounds(pos)) {
      return pos.clone();
    }
  }
  
  // Si está colisionando o fuera de límites, encontrar la dirección de escape más cercana
  let bestPos = null;
  let minDist = Infinity;
  
  // Probar múltiples distancias y direcciones
  const distances = [radius + 1, radius + 2, radius + 3, radius + 5];
  const directions = [
    { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
    { x: 0.707, z: 0.707 }, { x: -0.707, z: 0.707 },
    { x: 0.707, z: -0.707 }, { x: -0.707, z: -0.707 }
  ];
  
  for (const dist of distances) {
    for (const dir of directions) {
      const testPos = new THREE.Vector3(
        posX + dir.x * dist,
        posY,
        posZ + dir.z * dist
      );
      
      // Verificar colisiones y límites
      const testCollision = collidesWithObstacles(testPos, radius, true);
      if (!testCollision.collides && insideBounds(testPos)) {
        const testDist = testPos.distanceTo(pos);
        if (testDist < minDist) {
          minDist = testDist;
          bestPos = testPos;
        }
      }
    }
    
    // Si encontramos una posición válida, usarla
    if (bestPos) break;
  }
  
  // Si no se encontró posición, usar una posición por defecto segura
  if (!bestPos) {
    // Buscar posición segura lejos del centro
    const safePositions = [
      { x: 10, y: posY, z: 10 },
      { x: -10, y: posY, z: 10 },
      { x: 10, y: posY, z: -10 },
      { x: -10, y: posY, z: -10 },
      { x: 15, y: posY, z: 0 },
      { x: -15, y: posY, z: 0 },
      { x: 0, y: posY, z: 15 },
      { x: 0, y: posY, z: -15 }
    ];
    
    for (const safePos of safePositions) {
      const testPos = new THREE.Vector3(safePos.x, safePos.y, safePos.z);
      const testCollision = collidesWithObstacles(testPos, radius, true);
      if (!testCollision.collides && insideBounds(testPos)) {
        return testPos;
      }
    }
    
    // Último recurso: posición por defecto
    return new THREE.Vector3(10, posY, 10);
  }
  
  return bestPos;
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
  // Plataforma ampliada a 100x100
  const platformGeom = new THREE.BoxGeometry(100, 1, 100);
  const platformMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.floor,
    emissive: PALETTE.floorEm,
    shininess: 70,
    specular: new THREE.Color(0x88aaff)
  });
  ground = new THREE.Mesh(platformGeom, platformMat);
  ground.position.y = -0.5;
  scene.add(ground);

  // Grid más grande
  const gridHelper = new THREE.GridHelper(
    90,
    45,
    PALETTE.gridMain,
    PALETTE.gridAlt
  );
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const edgeMat = new THREE.MeshBasicMaterial({
    color: PALETTE.edge,
    transparent: true,
    opacity: 0.65
  });
  const edgeGeomX = new THREE.BoxGeometry(90, 0.05, 0.25);
  const edgeGeomZ = new THREE.BoxGeometry(0.25, 0.05, 90);

  const edge1 = new THREE.Mesh(edgeGeomX, edgeMat);
  edge1.position.set(0, 0.05, 45);
  const edge2 = edge1.clone();
  edge2.position.set(0, 0.05, -45);

  const edge3 = new THREE.Mesh(edgeGeomZ, edgeMat);
  edge3.position.set(45, 0.05, 0);
  const edge4 = edge3.clone();
  edge4.position.set(-45, 0.05, 0);

  scene.add(edge1, edge2, edge3, edge4);
}


function createEnvironment() {
  // ============================================
  // DISEÑO COMPLETAMENTE NUEVO - LABERINTO TÁCTICO
  // Todos los obstáculos son SÓLIDOS e INTRANSITABLES
  // ============================================

  // Material base para obstáculos
  const wallMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.wall,
    emissive: PALETTE.wallEm,
    shininess: 35,
    specular: new THREE.Color(0x6677aa)
  });

  const coverMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.cover,
    emissive: PALETTE.coverEm,
    shininess: 40,
    specular: new THREE.Color(0x77d1ff)
  });

  const columnMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.column,
    emissive: PALETTE.columnEm,
    shininess: 60,
    specular: new THREE.Color(0x8899ff)
  });

  const drumMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.drum,
    emissive: PALETTE.drumEm,
    shininess: 55,
    specular: new THREE.Color(0xfff3aa)
  });

  // 1. PAREDES EXTERIORES (sólidas)
  const wallGeom = new THREE.BoxGeometry(102, 4, 0.8);
  const wallFront = new THREE.Mesh(wallGeom, wallMat);
  wallFront.position.set(0, 1.5, -50.4);
  scene.add(wallFront);
  registerObstacle(wallFront);

  const wallBack = wallFront.clone();
  wallBack.position.set(0, 1.5, 50.4);
  scene.add(wallBack);
  registerObstacle(wallBack);

  const wallSideGeom = new THREE.BoxGeometry(0.8, 4, 102);
  const wallLeft = new THREE.Mesh(wallSideGeom, wallMat);
  wallLeft.position.set(-50.4, 1.5, 0);
  scene.add(wallLeft);
  registerObstacle(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.set(50.4, 1.5, 0);
  scene.add(wallRight);
  registerObstacle(wallRight);

  // 2. ESTRUCTURA EN FORMA DE CRUZ CENTRAL (diseño nuevo) - SALTABLES
  // Brazo horizontal (altura aumentada)
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(35, 3.5, 2.5), coverMat);
  crossH.position.set(0, 1.75, 0);
  scene.add(crossH);
  registerObstacle(crossH, { jumpable: true }); // Se puede saltar sobre ella

  // Brazo vertical (altura aumentada)
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 35), coverMat);
  crossV.position.set(0, 1.75, 0);
  scene.add(crossV);
  registerObstacle(crossV, { jumpable: true }); // Se puede saltar sobre ella

  // 3. CUATRO PLATAFORMAS ELEVADAS EN LAS ESQUINAS (SALTABLES) - Altura aumentada
  const platformGeom = new THREE.BoxGeometry(12, 2.2, 12);
  const platformPositions = [
    [-30, 1.1, -30],
    [30, 1.1, -30],
    [-30, 1.1, 30],
    [30, 1.1, 30]
  ];

  platformPositions.forEach(([x, y, z]) => {
    const platform = new THREE.Mesh(platformGeom, coverMat);
    platform.position.set(x, y, z);
    scene.add(platform);
    registerObstacle(platform, { jumpable: true }); // Se puede saltar sobre ellas
  });
  
  // 3b. PLATAFORMAS BAJAS SALTABLES (adicionales) - Altura aumentada
  const lowPlatformGeom = new THREE.BoxGeometry(6, 1.2, 6);
  const lowPlatformPositions = [
    [-20, 0.6, -20], [20, 0.6, -20],
    [-20, 0.6, 20], [20, 0.6, 20],
    [0, 0.6, -25], [0, 0.6, 25],
    [-25, 0.6, 0], [25, 0.6, 0]
  ];
  
  lowPlatformPositions.forEach(([x, y, z]) => {
    const lowPlatform = new THREE.Mesh(lowPlatformGeom, coverMat);
    lowPlatform.position.set(x, y, z);
    scene.add(lowPlatform);
    registerObstacle(lowPlatform, { jumpable: true }); // Se puede saltar sobre ellas
  });

  // 4. MURALLAS TÁCTICAS (formando pasillos) - SALTABLES - Altura aumentada
  const barrierGeom = new THREE.BoxGeometry(8, 3.2, 1.5);
  const barrierPositions = [
    // Norte
    [-15, 1.6, -20], [15, 1.6, -20],
    [-15, 1.6, -25], [15, 1.6, -25],
    // Sur
    [-15, 1.6, 20], [15, 1.6, 20],
    [-15, 1.6, 25], [15, 1.6, 25],
    // Este
    [20, 1.6, -15], [20, 1.6, 15],
    [25, 1.6, -15], [25, 1.6, 15],
    // Oeste
    [-20, 1.6, -15], [-20, 1.6, 15],
    [-25, 1.6, -15], [-25, 1.6, 15]
  ];

  barrierPositions.forEach(([x, y, z]) => {
    const barrier = new THREE.Mesh(barrierGeom, coverMat);
    barrier.position.set(x, y, z);
    scene.add(barrier);
    registerObstacle(barrier, { jumpable: true }); // Se puede saltar sobre ellas
  });

  // 5. COLUMNAS ESTRATÉGICAS (distribuidas uniformemente) - Altura aumentada
  const columnGeom = new THREE.CylinderGeometry(1.2, 1.2, 5.0, 16);
  const columnPositions = [
    // Anillo exterior (más espaciado)
    [-38, 2.5, -20], [-38, 2.5, 20],
    [38, 2.5, -20], [38, 2.5, 20],
    [-20, 2.5, -38], [20, 2.5, -38],
    [-20, 2.5, 38], [20, 2.5, 38],
    // Anillo medio (mejor distribuido)
    [-25, 2.5, -25], [25, 2.5, -25],
    [-25, 2.5, 25], [25, 2.5, 25],
    [-25, 2.5, 0], [25, 2.5, 0],
    [0, 2.5, -25], [0, 2.5, 25],
    // Zona central (más espaciadas)
    [-15, 2.5, -15], [15, 2.5, -15],
    [-15, 2.5, 15], [15, 2.5, 15],
    // Zonas intermedias
    [-30, 2.5, -10], [30, 2.5, -10],
    [-30, 2.5, 10], [30, 2.5, 10],
    [-10, 2.5, -30], [10, 2.5, -30],
    [-10, 2.5, 30], [10, 2.5, 30]
  ];

  columnPositions.forEach(([x, y, z]) => {
    const col = new THREE.Mesh(columnGeom, columnMat);
    col.position.set(x, y, z);
    scene.add(col);
    registerObstacle(col, { jumpable: true }); // Se puede saltar sobre ellas

    // Efecto luminoso en columnas (ajustado a nueva altura)
    const stripGeom = new THREE.BoxGeometry(0.15, 5.2, 0.1);
    const stripMat = new THREE.MeshBasicMaterial({
      color: PALETTE.gridMain,
      transparent: true,
      opacity: 0.8
    });
    const strip = new THREE.Mesh(stripGeom, stripMat);
    strip.position.set(x, y, z + 0.6);
    scene.add(strip);
  });

  // 6. BLOQUES DE COBERTURA (distribuidos estratégicamente) - Altura aumentada
  const blockGeom = new THREE.BoxGeometry(5, 3.0, 3);
  const blockPositions = [
    // Zona norte
    [-25, 1.5, -15], [25, 1.5, -15],
    [-8, 1.5, -18], [8, 1.5, -18],
    // Zona sur
    [-25, 1.5, 15], [25, 1.5, 15],
    [-8, 1.5, 18], [8, 1.5, 18],
    // Zona este
    [15, 1.5, -25], [15, 1.5, 25],
    [18, 1.5, -8], [18, 1.5, 8],
    // Zona oeste
    [-15, 1.5, -25], [-15, 1.5, 25],
    [-18, 1.5, -8], [-18, 1.5, 8]
  ];

  blockPositions.forEach(([x, y, z]) => {
    const block = new THREE.Mesh(blockGeom, coverMat);
    block.position.set(x, y, z);
    scene.add(block);
    registerObstacle(block, { jumpable: true }); // Se puede saltar sobre ellas
  });

  // 7. TAMBORES/BARRILES (obstáculos circulares) - Altura aumentada
  const drumGeom = new THREE.CylinderGeometry(1.5, 1.5, 4.0, 16);
  const drumPositions = [
    // Patrones en grupos
    [-22, 2.0, -22], [-18, 2.0, -22], [-22, 2.0, -18],
    [22, 2.0, 22], [18, 2.0, 22], [22, 2.0, 18],
    [-22, 2.0, 22], [-18, 2.0, 22], [-22, 2.0, 18],
    [22, 2.0, -22], [18, 2.0, -22], [22, 2.0, -18],
    // Líneas centrales
    [-12, 2.0, 0], [12, 2.0, 0],
    [0, 2.0, -12], [0, 2.0, 12]
  ];

  drumPositions.forEach(([x, y, z]) => {
    const drum = new THREE.Mesh(drumGeom, drumMat);
    drum.position.set(x, y, z);
    scene.add(drum);
    registerObstacle(drum, { jumpable: true }); // Se puede saltar sobre ellas
  });

  // 8. MUROS EN L (formando esquinas de cobertura) - Altura aumentada
  const lWallGeom = new THREE.BoxGeometry(6, 3.3, 1.5);
  const lWallPositions = [
    // Esquinas interiores
    [-12, 1.65, -12], [12, 1.65, -12],
    [-12, 1.65, 12], [12, 1.65, 12]
  ];

  lWallPositions.forEach(([x, y, z]) => {
    // Muro horizontal
    const wallH = new THREE.Mesh(lWallGeom, coverMat);
    wallH.position.set(x, y, z);
    scene.add(wallH);
    registerObstacle(wallH, { jumpable: true }); // Se puede saltar sobre ellas

    // Muro vertical
    const wallV = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 6), coverMat);
    wallV.position.set(x, y, z);
    scene.add(wallV);
    registerObstacle(wallV, { jumpable: true }); // Se puede saltar sobre ellas
  });

  // 9. CÚPULA / CIELO
  const skyGeom = new THREE.SphereGeometry(180, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    color: PALETTE.sky,
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
    color:    PALETTE.weaponBody,
    emissive: PALETTE.weaponBodyEm,
    shininess: 80,
    specular: new THREE.Color(0xccffbb)
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.set(0, -0.05, -0.3);
  group.add(body);

  const gripGeom = new THREE.BoxGeometry(0.12, 0.25, 0.18);
  const gripMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.weaponGrip,
    emissive: PALETTE.weaponGripEm,
    shininess: 40,
    specular: new THREE.Color(0x99cc99)
  });
  const grip = new THREE.Mesh(gripGeom, gripMat);
  grip.position.set(0, -0.2, 0.1);
  grip.rotation.x = -0.4;
  group.add(grip);

  const barrelGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const barrelMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.weaponBarrel,
    emissive: PALETTE.weaponBarrelEm,
    shininess: 90,
    specular: new THREE.Color(0xd9ffb3)
  });
  const barrel = new THREE.Mesh(barrelGeom, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.8);
  group.add(barrel);
  weaponBarrel = barrel;

  const topGeom = new THREE.BoxGeometry(0.08, 0.06, 0.4);
  const topMat = new THREE.MeshPhongMaterial({
    color:    PALETTE.weaponTop,
    emissive: PALETTE.weaponTopEm,
    shininess: 75,
    specular: new THREE.Color(0xf7ffcc)
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
// SPAWNER DE ENEMIGOS (OLEADAS + DRONES)
function spawnEnemy() {
  const drone = new THREE.Group();

  // --- Colores coherentes con la paleta neon ---
  const bodyPalette = PALETTE.enemyBody; // p.ej. [0x00f7ff, 0x4af2c5, 0xffe15b, 0xff6fb1]
  const colorHex = bodyPalette[(wave - 1) % bodyPalette.length];

  const bodyColor = new THREE.Color(colorHex);
  const bodyEmissive = bodyColor.clone().multiplyScalar(0.35);

  // --- Cuerpo principal (más “redondo” y con relieve) ---
  const bodyGeom = new THREE.SphereGeometry(0.5, 24, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    emissive: bodyEmissive,
    metalness: 0.25,
    roughness: 0.35
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  drone.add(body);

  // --- Brazo central ---
  const armGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 12);
  const armMat = new THREE.MeshStandardMaterial({
    color: 0x060814,
    metalness: 0.15,
    roughness: 0.7
  });
  const arm = new THREE.Mesh(armGeom, armMat);
  arm.rotation.z = Math.PI / 2;
  drone.add(arm);

  // --- Rotores laterales ---
  const rotorGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20);
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x151822,
    emissive: 0x04101a,
    metalness: 0.6,
    roughness: 0.3
  });

  const rotorLeft = new THREE.Mesh(rotorGeom, rotorMat);
  rotorLeft.position.set(-0.7, 0.25, 0);
  drone.add(rotorLeft);

  const rotorRight = new THREE.Mesh(rotorGeom, rotorMat);
  rotorRight.position.set(0.7, 0.25, 0);
  drone.add(rotorRight);

  // --- “Ojo” / cámara frontal ---
  const camGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
  const camMat = new THREE.MeshStandardMaterial({
    color: PALETTE.enemyEye,       // p.ej. 0x7cf4ff
    emissive: 0x00bcd4,
    metalness: 0.1,
    roughness: 0.25
  });
  const cam = new THREE.Mesh(camGeom, camMat);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0, -0.25, 0.25);
  drone.add(cam);

  // --- Propulsores luminosos abajo ---
  const lightGeom = new THREE.SphereGeometry(0.08, 12, 12);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: PALETTE.enemyEmitter,   // p.ej. 0xff6fb1
    emissive: PALETTE.enemyEmitter,
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0.9
  });
  const thr1 = new THREE.Mesh(lightGeom, thrusterMat);
  thr1.position.set(-0.3, -0.45, -0.1);
  const thr2 = thr1.clone();
  thr2.position.set(0.3, -0.45, -0.1);
  drone.add(thr1, thr2);

  // --- POSICIONAMIENTO Y LÓGICA (mejorado para nueva arena) ---
  const basePos =
    SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
  
  let spawnX, spawnZ;
  let attempts = 0;
  const maxAttempts = 30;
  let validSpawn = false;

  // Buscar una posición válida sin colisiones
  while (!validSpawn && attempts < maxAttempts) {
    const jitterX = (Math.random() - 0.5) * 8;
    const jitterZ = (Math.random() - 0.5) * 8;
    
    spawnX = basePos.x + jitterX;
    spawnZ = basePos.z + jitterZ;

    const margin = 2.0;
    const limit = ARENA_LIMIT - margin;
    if (spawnX >  limit) spawnX =  limit;
    if (spawnX < -limit) spawnX = -limit;
    if (spawnZ >  limit) spawnZ =  limit;
    if (spawnZ < -limit) spawnZ = -limit;

    // Verificar que no spawnee dentro de un obstáculo
    const spawnTest = { x: spawnX, y: 2.5, z: spawnZ };
    const collision = collidesWithObstacles(spawnTest, ENEMY_RADIUS + 1.0, true);
    
    if (!collision.collides && insideBounds(spawnTest)) {
      validSpawn = true;
    } else {
      attempts++;
      // Si falla, probar otra posición base
      if (attempts % 5 === 0) {
        const newBasePos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
        spawnX = newBasePos.x;
        spawnZ = newBasePos.z;
      }
    }
  }

  // Si después de todos los intentos no hay posición válida, usar la posición base
  if (!validSpawn) {
    spawnX = basePos.x;
    spawnZ = basePos.z;
    // Intentar empujar fuera de obstáculos
    const spawnPos = new THREE.Vector3(spawnX, 2.5, spawnZ);
    const safePos = pushPlayerOutOfObstacle(spawnPos, ENEMY_RADIUS + 1.0);
    spawnX = safePos.x;
    spawnZ = safePos.z;
  }

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

// Función para verificar si una bala colisiona con un obstáculo
function bulletCollidesWithObstacle(bulletPos) {
  const bulletRadius = 0.08; // Radio de la bala
  const posX = bulletPos.x;
  const posY = bulletPos.y;
  const posZ = bulletPos.z;

  for (const o of obstacles) {
    const dx = Math.abs(posX - o.mesh.position.x);
    const dz = Math.abs(posZ - o.mesh.position.z);

    // Verificar colisión horizontal
    if (dx < (o.halfX + bulletRadius) && dz < (o.halfZ + bulletRadius)) {
      if (o.halfHeight !== undefined) {
        const obstacleTop = o.mesh.position.y + o.halfHeight;
        const obstacleBottom = o.mesh.position.y - o.halfHeight;

        // Verificar colisión vertical
        if (posY >= obstacleBottom && posY <= obstacleTop) {
          return true; // La bala colisiona con el obstáculo
        }
      } else {
        // Si no hay altura definida, verificar si está cerca del centro
        if (Math.abs(posY - o.mesh.position.y) < 0.5) {
          return true;
        }
      }
    }
  }

  return false; // No hay colisión
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

    // Verificar colisión con obstáculos primero
    if (bulletCollidesWithObstacle(bullet.position)) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue; // La bala fue destruida por un obstáculo
    }

    // Verificar colisión con enemigos
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

function updateStaminaBar() {
  const ratio = stamina / maxStamina;
  const clamped = Math.max(0, Math.min(1, ratio));
  staminaFillEl.style.width = `${clamped * 100}%`;
}

function startGame() {
  if (gameState !== "menu") return;
  gameState = "playing";
  startScreenEl.classList.add("hidden");
  prevTime = performance.now() / 1000;
  lastSpawnTime = prevTime - getSpawnInterval();
  
  // Buscar una posición inicial segura (no dentro de obstáculos)
  // Intentar varias posiciones alrededor del centro
      const safePositions = [
        { x: 0, y: 2.5, z: 5 },   // Norte del centro
        { x: 0, y: 2.5, z: -5 },  // Sur del centro
        { x: 5, y: 2.5, z: 0 },   // Este del centro
        { x: -5, y: 2.5, z: 0 },  // Oeste del centro
        { x: 8, y: 2.5, z: 8 },   // Diagonal
        { x: -8, y: 2.5, z: 8 },  // Diagonal
        { x: 8, y: 2.5, z: -8 },  // Diagonal
        { x: -8, y: 2.5, z: -8 }  // Diagonal
      ];
  
  let foundSafePos = false;
  for (const pos of safePositions) {
    const testPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const collision = collidesWithObstacles(testPos, PLAYER_RADIUS, true);
    if (!collision.collides && insideBounds(testPos)) {
      camera.position.set(pos.x, pos.y, pos.z);
      foundSafePos = true;
      break;
    }
  }
  
  // Si no se encontró posición segura, usar pushPlayerOutOfObstacle
  if (!foundSafePos) {
    const playerStartPos = new THREE.Vector3(0, 2.5, 5);
    const safePos = pushPlayerOutOfObstacle(playerStartPos, PLAYER_RADIUS);
    camera.position.set(safePos.x, safePos.y, safePos.z);
  }
  
  // Resetear estado del jugador
  velocityY = 0;
  isGrounded = true;
  stamina = maxStamina;
}

function gameOver() {
  if (gameState === "gameover") return;
  gameState = "gameover";
  finalScoreEl.textContent = score;
  gameOverScreenEl.classList.remove("hidden");
  document.exitPointerLock?.();
}

// ----------------------------------------
// PARA VR
// ----------------------------------------

function isXRActive() {
  return renderer && renderer.xr && renderer.xr.isPresenting;
}


// ----------------------------------------
// LOOP
// ----------------------------------------
function animate() {

  const currentTime = performance.now() / 1000;
  const delta = currentTime - prevTime;
  prevTime = currentTime;

  const xrActive = isXRActive(); // 👈 NUEVO

  if (gameState === "playing") {
    if (currentTime - lastSpawnTime > getSpawnInterval()) {
      spawnEnemy();
      lastSpawnTime = currentTime;
    }

    // 👇 Ahora funciona en desktop y en VR
    if (pointerLocked || xrActive) {
      movePlayer(delta);
    }

    timeSinceLastShot += delta;

    // 👇 Igual para el disparo automático
    if ((pointerLocked || xrActive) && isShooting && timeSinceLastShot >= FIRE_RATE) {
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

  // MOVIMIENTO HORIZONTAL - PERMITIR CAMINAR SOBRE PLATAFORMAS
  // Verificar si está sobre alguna plataforma para permitir movimiento libre horizontal
  
  // Detectar plataformas bajo el jugador
  const currentPlatformHeight = getPlatformHeightUnderPlayer(currentPos.x, currentPos.z, PLAYER_RADIUS);
  const isOnPlatform = currentPlatformHeight !== null && (currentPos.y - 0.8) >= (currentPlatformHeight - 0.2);
  
  // Intentar movimiento en X primero
  if (Math.abs(move.x) > 0.001) {
    const tryX = new THREE.Vector3(
      currentPos.x + move.x,
      currentPos.y,
      currentPos.z
    );
    
    // Verificar colisión horizontal
    let canMoveX = true;
    for (const o of obstacles) {
      const dx = Math.abs(tryX.x - o.mesh.position.x);
      const dz = Math.abs(tryX.z - o.mesh.position.z);
      
      // Colisión horizontal: está dentro del área del obstáculo
      if (dx < (o.halfX + PLAYER_RADIUS) && dz < (o.halfZ + PLAYER_RADIUS)) {
        if (o.halfHeight !== undefined) {
          const obstacleTop = o.mesh.position.y + o.halfHeight;
          const playerBottom = currentPos.y - 0.8;
          const playerTop = currentPos.y + 0.8;
          
          // Si está sobre la plataforma (pies encima del top), puede moverse libremente
          if (o.jumpable && playerBottom > obstacleTop + 0.05) {
            // Está completamente encima, puede caminar sobre ella
            continue;
          } else if (o.jumpable && isOnPlatform && playerBottom >= obstacleTop - 0.2) {
            // Está sobre una plataforma (puede estar ligeramente dentro por ajustes), permitir movimiento
            continue;
          } else {
            // Está dentro o debajo, no puede atravesar lateralmente
            // PERO si está sobre otra plataforma y esta es más baja, permitir
            if (isOnPlatform && currentPlatformHeight > obstacleTop) {
              // Está sobre una plataforma más alta, puede pasar sobre esta más baja
              continue;
            }
            canMoveX = false;
            break;
          }
        } else {
          // Sin altura definida, bloquear movimiento
          canMoveX = false;
          break;
        }
      }
    }
    
    if (canMoveX && insideBounds(tryX)) {
      newPos.x = tryX.x;
    }
  }

  // Intentar movimiento en Z (usando la nueva posición X si se movió)
  if (Math.abs(move.z) > 0.001) {
    const tryZ = new THREE.Vector3(
      newPos.x,
      currentPos.y,
      currentPos.z + move.z
    );
    
    // Verificar colisión horizontal
    let canMoveZ = true;
    for (const o of obstacles) {
      const dx = Math.abs(tryZ.x - o.mesh.position.x);
      const dz = Math.abs(tryZ.z - o.mesh.position.z);
      
      if (dx < (o.halfX + PLAYER_RADIUS) && dz < (o.halfZ + PLAYER_RADIUS)) {
        if (o.halfHeight !== undefined) {
          const obstacleTop = o.mesh.position.y + o.halfHeight;
          const playerBottom = currentPos.y - 0.8;
          const playerTop = currentPos.y + 0.8;
          
          // Si está sobre la plataforma (pies encima del top), puede moverse libremente
          if (o.jumpable && playerBottom > obstacleTop + 0.05) {
            // Está completamente encima, puede caminar sobre ella
            continue;
          } else if (o.jumpable && isOnPlatform && playerBottom >= obstacleTop - 0.2) {
            // Está sobre una plataforma, permitir movimiento
            continue;
          } else {
            // Está dentro o debajo, no puede atravesar lateralmente
            // PERO si está sobre otra plataforma y esta es más baja, permitir
            if (isOnPlatform && currentPlatformHeight > obstacleTop) {
              // Está sobre una plataforma más alta, puede pasar sobre esta más baja
              continue;
            }
            canMoveZ = false;
            break;
          }
        } else {
          canMoveZ = false;
          break;
        }
      }
    }
    
    if (canMoveZ && insideBounds(tryZ)) {
      newPos.z = tryZ.z;
    }
  }

  // SALTO / GRAVEDAD MEJORADO - MÁS FLUIDO
  velocityY += gravity * delta;
  let nextY = camera.position.y + velocityY * delta;

  const groundLevel = 2.5; // Altura aumentada del suelo
  
  // Detectar la plataforma más alta bajo el jugador
  const platformHeight = getPlatformHeightUnderPlayer(newPos.x, newPos.z, PLAYER_RADIUS);
  
  // Calcular altura objetivo (suelo o plataforma)
  let targetHeight = groundLevel;
  if (platformHeight !== null) {
    targetHeight = platformHeight + 1.1; // Centro del jugador sobre la plataforma (aumentado para mejor visibilidad)
  }
  
  // Verificar colisiones verticales con TODOS los obstáculos
  const testPosVertical = new THREE.Vector3(newPos.x, nextY, newPos.z);
  let maxObstacleTop = targetHeight;
  let shouldLandOnPlatform = false;
  
  for (const o of obstacles) {
    const dx = Math.abs(newPos.x - o.mesh.position.x);
    const dz = Math.abs(newPos.z - o.mesh.position.z);
    
    // Verificar colisión horizontal
    if (dx < (o.halfX + PLAYER_RADIUS) && dz < (o.halfZ + PLAYER_RADIUS)) {
      if (o.halfHeight !== undefined) {
        const obstacleTop = o.mesh.position.y + o.halfHeight;
        const obstacleBottom = o.mesh.position.y - o.halfHeight;
        const playerBottom = nextY - 0.8;
        const playerTop = nextY + 0.8;
        
        // Verificar solapamiento vertical
        if (playerBottom < obstacleTop && playerTop > obstacleBottom) {
          if (o.jumpable) {
            // OBSTÁCULO SALTABLE: Solo colisiona si está dentro o debajo
            // Si está cayendo y está cerca de la parte superior, aterrizar encima
            if (velocityY <= 0 && playerBottom <= obstacleTop + 0.15 && playerBottom >= obstacleTop - 0.3) {
              // Aterrizar sobre la plataforma
              maxObstacleTop = Math.max(maxObstacleTop, obstacleTop + 1.1);
              shouldLandOnPlatform = true;
            } else if (playerBottom < obstacleTop - 0.1) {
              // Está dentro del obstáculo, empujar hacia arriba
              maxObstacleTop = Math.max(maxObstacleTop, obstacleTop + 1.1);
              velocityY = Math.max(0, velocityY);
            }
            // Si está completamente encima (playerBottom > obstacleTop), no hacer nada
          } else {
            // OBSTÁCULO SÓLIDO (solo paredes): Siempre colisiona
            if (playerBottom < obstacleTop && playerTop > obstacleBottom) {
              if (nextY < obstacleTop) {
                // Estamos debajo, mantener en suelo/plataforma
                maxObstacleTop = Math.max(maxObstacleTop, targetHeight);
              } else {
                // Estamos dentro o encima, empujar hacia arriba
                maxObstacleTop = Math.max(maxObstacleTop, obstacleTop + 1.1);
                velocityY = Math.max(0, velocityY);
              }
            }
          }
        }
      }
    }
  }
  
  // Aplicar altura calculada de forma FLUIDA (sin cortes bruscos)
  const landingThreshold = 0.15; // Umbral para aterrizaje suave
  
  // Si está saltando activamente, no forzar aterrizaje
  const isActivelyJumping = velocityY > 0.5;
  
  if (shouldLandOnPlatform && !isActivelyJumping) {
    // Aterrizar sobre plataforma de forma suave (solo si no está saltando)
    if (Math.abs(nextY - maxObstacleTop) < landingThreshold && velocityY <= 0) {
      nextY = maxObstacleTop;
      velocityY = 0;
      isGrounded = true;
    } else if (velocityY <= 0) {
      // Está cayendo hacia la plataforma
      const diff = maxObstacleTop - nextY;
      if (diff > 0 && diff < landingThreshold * 2) {
        // Acelerar hacia la plataforma suavemente
        velocityY = Math.min(velocityY, diff * 5);
      }
      isGrounded = false;
    } else {
      // Está saltando, permitir movimiento libre
      isGrounded = false;
    }
  } else if (platformHeight !== null && velocityY <= 0 && nextY <= targetHeight + landingThreshold && !isActivelyJumping) {
    // Está cerca de una plataforma y cayendo (no saltando)
    if (Math.abs(nextY - targetHeight) < landingThreshold) {
      nextY = targetHeight;
      velocityY = 0;
      isGrounded = true;
    } else {
      // Aún no ha llegado, continuar cayendo
      isGrounded = false;
    }
  } else if (nextY <= groundLevel && velocityY <= 0) {
    // Aterrizar en suelo (solo si está cayendo)
    nextY = groundLevel;
    velocityY = 0;
    isGrounded = true;
  } else if (nextY < maxObstacleTop - 0.1 && !isActivelyJumping) {
    // Está por debajo de un obstáculo, empujar hacia arriba suavemente (solo si no está saltando)
    const diff = maxObstacleTop - nextY;
    if (diff < 0.3) {
      // Muy cerca, ajustar suavemente
      nextY = maxObstacleTop;
      velocityY = Math.max(0, velocityY * 0.5);
    } else {
      // Más lejos, aplicar fuerza hacia arriba
      velocityY = Math.max(0, velocityY) + diff * 2;
    }
    isGrounded = false;
  } else {
    // En el aire o saltando
    // Verificar si está sobre una plataforma para establecer isGrounded
    if (platformHeight !== null && velocityY <= 0.1) {
      const playerBottom = nextY - 0.8;
      // Con el nuevo offset de 1.1, playerBottom debería estar alrededor de platformHeight + 0.3
      if (playerBottom >= platformHeight - 0.3 && playerBottom <= platformHeight + 0.5) {
        // Está sobre la plataforma, ajustar altura si es necesario
        const expectedHeight = platformHeight + 1.1;
        if (Math.abs(nextY - expectedHeight) < 0.2) {
          nextY = expectedHeight; // Ajustar a la altura correcta
        }
        isGrounded = true;
      } else {
        isGrounded = false;
      }
    } else {
      isGrounded = false;
    }
  }

  // Verificar colisiones finales - FLUIDO Y PERMITIR SALTO
  const finalPos = new THREE.Vector3(newPos.x, nextY, newPos.z);
  const finalCollision = collidesWithObstacles(finalPos, PLAYER_RADIUS, true);
  
  // Si está saltando (velocityY > 0), no forzar altura - permitir movimiento libre
  const isJumping = velocityY > 0.1;
  
  // Si está sobre una plataforma, mantenerlo ahí y permitir caminar horizontalmente
  if (finalCollision.onTop && !isJumping) {
    // Está sobre una plataforma saltable y NO está saltando
    const finalPlatformHeight = getPlatformHeightUnderPlayer(newPos.x, newPos.z, PLAYER_RADIUS);
    if (finalPlatformHeight !== null) {
      const platformTop = finalPlatformHeight + 1.1; // Altura aumentada sobre plataformas
      const playerBottom = nextY - 0.8;
      
      // Si está sobre la plataforma (dentro de un rango razonable), mantener altura constante
      // Con el offset de 1.1, playerBottom debería estar alrededor de finalPlatformHeight + 0.3
      if (playerBottom >= finalPlatformHeight - 0.3 && playerBottom <= finalPlatformHeight + 0.5) {
        // Está sobre la plataforma, mantener altura constante mientras camina
        // Esto permite caminar horizontalmente sobre la plataforma
        camera.position.set(newPos.x, platformTop, newPos.z);
        velocityY = 0; // Detener velocidad vertical
        isGrounded = true; // Asegurar que isGrounded esté activo para permitir saltar
      } else if (playerBottom < finalPlatformHeight - 0.3) {
        // Está cayendo hacia la plataforma o dentro, ajustar a la altura correcta
        if (velocityY <= 0) {
          camera.position.set(newPos.x, platformTop, newPos.z);
          velocityY = 0;
          isGrounded = true;
        } else {
          // Está saltando, permitir movimiento libre
          camera.position.set(newPos.x, nextY, newPos.z);
        }
      } else {
        // Está por encima del rango, permitir movimiento libre (puede estar saltando)
        camera.position.set(newPos.x, nextY, newPos.z);
      }
    } else {
      camera.position.set(newPos.x, nextY, newPos.z);
    }
  } else if (finalCollision.onTop && isJumping) {
    // Está saltando desde una plataforma, permitir movimiento libre
    camera.position.set(newPos.x, nextY, newPos.z);
  } else if (finalCollision.collides) {
    // Hay colisión - verificar si es un obstáculo sólido (solo paredes)
    let isSolidObstacle = false;
    for (const o of obstacles) {
      if (o.jumpable) continue; // Ignorar saltables
      
      const dx = Math.abs(newPos.x - o.mesh.position.x);
      const dz = Math.abs(newPos.z - o.mesh.position.z);
      if (dx < (o.halfX + PLAYER_RADIUS) && dz < (o.halfZ + PLAYER_RADIUS)) {
        const playerBottom = nextY - 0.8;
        const obstacleTop = o.mesh.position.y + (o.halfHeight || 2);
        if (playerBottom < obstacleTop && nextY + 0.8 > (o.mesh.position.y - (o.halfHeight || 2))) {
          isSolidObstacle = true;
          break;
        }
      }
    }
    
    if (isSolidObstacle) {
      // Es un obstáculo sólido (pared), intentar empujarlo fuera
      const safePos = pushPlayerOutOfObstacle(finalPos, PLAYER_RADIUS);
      const safeCollision = collidesWithObstacles(safePos, PLAYER_RADIUS, true);
      if (!safeCollision.collides && insideBounds(safePos)) {
        camera.position.set(safePos.x, safePos.y, safePos.z);
      } else {
        // Mantener posición actual si es válida
        const currentCollision = collidesWithObstacles(currentPos, PLAYER_RADIUS, true);
        if (!currentCollision.collides || currentCollision.onTop) {
          camera.position.set(currentPos.x, currentPos.y, currentPos.z);
        } else {
          camera.position.set(safePos.x, safePos.y, safePos.z);
        }
      }
    } else {
      // No es sólido, probablemente está sobre una plataforma, mantener posición
      camera.position.set(newPos.x, nextY, newPos.z);
    }
  } else {
    // No hay colisión, mover normalmente
    camera.position.set(newPos.x, nextY, newPos.z);
  }
}

// ----------------------------------------
// ENEMIGOS CON COLISIÓN MEJORADA
// ----------------------------------------
function updateEnemies(delta, currentTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    // Inicializar datos de tracking
    if (!enemy.userData.lastPos) enemy.userData.lastPos = enemy.position.clone();
    if (!enemy.userData.stuckTime) enemy.userData.stuckTime = 0;
    if (!enemy.userData.pathHistory) enemy.userData.pathHistory = [];
    if (!enemy.userData.avoidanceDir) enemy.userData.avoidanceDir = new THREE.Vector3();

    enemy.userData.time += delta;

    const playerPos = camera.position.clone();
    playerPos.y = 1.8;

    const dir = new THREE.Vector3().subVectors(playerPos, enemy.position);
    const dist = dir.length();
    dir.normalize();

    // MEJORADO: Sistema anti-atasco más robusto
    const movedDist = enemy.position.distanceTo(enemy.userData.lastPos);
    if (movedDist < 0.03) {
      enemy.userData.stuckTime += delta;
    } else {
      enemy.userData.stuckTime = Math.max(0, enemy.userData.stuckTime - delta * 2);
      enemy.userData.lastPos.copy(enemy.position);
    }

    // MEJORADO: Detección de obstáculos cercanos para evasión
    let avoidance = new THREE.Vector3();
    const avoidanceRadius = 3.5;
    let obstacleCount = 0;

    for (const o of obstacles) {
      // TODOS LOS OBSTÁCULOS SON SÓLIDOS - todos deben evitarse
      const toObstacle = new THREE.Vector3(
        o.mesh.position.x - enemy.position.x,
        0,
        o.mesh.position.z - enemy.position.z
      );
      const obstacleDist = toObstacle.length();
      
      if (obstacleDist < avoidanceRadius && obstacleDist > 0.1) {
        const pushStrength = 1.0 - (obstacleDist / avoidanceRadius);
        toObstacle.normalize().multiplyScalar(-pushStrength);
        avoidance.add(toObstacle);
        obstacleCount++;
      }
    }

    if (obstacleCount > 0) {
      avoidance.divideScalar(obstacleCount);
      avoidance.normalize();
    }

    // MEJORADO: Flanqueo más inteligente
    const side = new THREE.Vector3()
      .crossVectors(dir, new THREE.Vector3(0, 1, 0))
      .normalize();
    
    // Alternar dirección de flanqueo basado en tiempo
    const swayDir = Math.sin(enemy.userData.time * enemy.userData.bobSpeed) > 0 ? 1 : -1;
    const sway = swayDir * enemy.userData.bobAmplitude;

    // MEJORADO: Combinar dirección hacia jugador con evasión
    let moveDir = dir.clone();
    if (avoidance.length() > 0.1) {
      moveDir.lerp(avoidance, 0.3); // 30% evasión, 70% persecución
    }
    moveDir.normalize();

    // Aplicar movimiento con flanqueo
    let newPos = enemy.position.clone();
    const baseMove = moveDir.clone().multiplyScalar(enemy.userData.speed * delta);
    const sideMove = side.clone().multiplyScalar(sway * delta * 3.0);
    
    newPos.add(baseMove);
    newPos.add(sideMove);
    newPos.y = 1.8 + Math.sin(enemy.userData.time * 1.5) * 0.3;

    // MEJORADO: Sistema de pathfinding mejorado
    const collision = collidesWithObstacles(newPos, ENEMY_RADIUS, true);
    
    if (!collision.collides && insideBounds(newPos)) {
      enemy.position.copy(newPos);
      enemy.userData.stuckTime = Math.max(0, enemy.userData.stuckTime - delta);
    } else {
      // Si hay colisión, intentar alternativas
      const alternatives = [
        // Intentar solo movimiento directo sin flanqueo
        enemy.position.clone().addScaledVector(moveDir, enemy.userData.speed * delta),
        // Intentar movimiento lateral
        enemy.position.clone().addScaledVector(side, enemy.userData.speed * delta * 0.7),
        // Intentar movimiento en ángulo
        enemy.position.clone().addScaledVector(
          moveDir.clone().add(side.clone().multiplyScalar(0.5)).normalize(),
          enemy.userData.speed * delta * 0.8
        )
      ];

      let moved = false;
      for (const altPos of alternatives) {
        altPos.y = newPos.y;
        const altCollision = collidesWithObstacles(altPos, ENEMY_RADIUS, true);
        if (!altCollision.collides && insideBounds(altPos)) {
          enemy.position.copy(altPos);
          moved = true;
          break;
        }
      }

      // Si sigue atascado, usar sistema de escape mejorado
      if (!moved && enemy.userData.stuckTime > 0.2) {
        // Calcular dirección de escape basada en obstáculos cercanos
        let escapeDir = new THREE.Vector3();
        for (const o of obstacles) {
          // TODOS LOS OBSTÁCULOS SON SÓLIDOS
          const toEnemy = new THREE.Vector3().subVectors(enemy.position, o.mesh.position);
          toEnemy.y = 0;
          if (toEnemy.length() < 5) {
            toEnemy.normalize();
            escapeDir.add(toEnemy);
          }
        }
        
        if (escapeDir.length() > 0.1) {
          escapeDir.normalize();
          const escapePos = enemy.position.clone().addScaledVector(escapeDir, enemy.userData.speed * delta * 1.5);
          escapePos.y = newPos.y;
          const escapeCollision = collidesWithObstacles(escapePos, ENEMY_RADIUS, true);
          if (!escapeCollision.collides && insideBounds(escapePos)) {
            enemy.position.copy(escapePos);
            enemy.userData.stuckTime = 0;
            moved = true;
          }
        }

        // Último recurso: teleportación lateral pequeña
        if (!moved && enemy.userData.stuckTime > 0.5) {
          const randomNudge = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          );
          const nudgePos = enemy.position.clone().add(randomNudge);
          nudgePos.y = newPos.y;
          const nudgeCollision = collidesWithObstacles(nudgePos, ENEMY_RADIUS, true);
          if (!nudgeCollision.collides && insideBounds(nudgePos)) {
            enemy.position.copy(nudgePos);
            enemy.userData.stuckTime = 0;
          }
        }
      }
    }

    // Rotación de rotores
    if (enemy.userData.rotors) {
      const spin = 12 * delta * (1 + 0.08 * (wave - 1));
      enemy.userData.rotors.forEach((r) => {
        r.rotation.y += spin;
      });
    }

    // Mirar al jugador
    enemy.lookAt(playerPos);

    // Daño al contacto
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
// ----------------------------------------
// INICIO
// ----------------------------------------
window.addEventListener("DOMContentLoaded", init);
