# 🎮 Drone Defender 3D

Un juego de disparos en primera persona (FPS) desarrollado con Three.js, donde debes defenderte de oleadas de drones en una plataforma orbital futurista.

## 📋 Descripción

**Drone Defender 3D** es un shooter básico ambientado en el Sector Neon-09, una plataforma orbital donde deberás sobrevivir el mayor número de oleadas posible. Los drones enemigos intentarán alcanzarte y dañarte al contacto, mientras tú debes eliminarlos con tu arma antes de que te alcancen.

## 🚀 Cómo Ejecutar el Proyecto

Este proyecto es una aplicación web estática que **no requiere instalación de dependencias ni servidor**. Simplemente sigue estos pasos:

### Opción 1: Abrir directamente en el navegador

1. Navega hasta la carpeta del proyecto
2. Haz doble clic en el archivo `index.html`
3. El juego se abrirá automáticamente en tu navegador predeterminado

### Opción 2: Usar un servidor local (recomendado)

Si prefieres usar un servidor local (útil para evitar problemas de CORS), puedes usar cualquiera de estas opciones:

#### Con Python 3:
```bash
# Python 3
python -m http.server 8000
```

#### Con Python 2:
```bash
# Python 2
python -m SimpleHTTPServer 8000
```

#### Con Node.js (http-server):
```bash
# Instalar http-server globalmente (solo la primera vez)
npm install -g http-server

# Ejecutar el servidor
http-server -p 8000
```

#### Con PHP:
```bash
php -S localhost:8000
```

Luego abre tu navegador y visita: `http://localhost:8000`

## 🎯 Requisitos del Sistema

- **Navegador moderno** con soporte para WebGL:
  - Chrome/Edge (recomendado)
  - Firefox
  - Safari
  - Opera
- **JavaScript habilitado** (activado por defecto en la mayoría de navegadores)
- **Ratón y teclado** para los controles
- **Conexión a Internet** (solo la primera vez, para cargar Three.js desde CDN)

## 🎮 Controles

| Tecla/Acción | Función |
|--------------|---------|
| **W / A / S / D** | Movimiento (adelante, izquierda, atrás, derecha) |
| **Ratón** | Mirar / Apuntar |
| **Click Izquierdo** | Disparar (automático mientras mantienes presionado) |
| **SHIFT Izquierdo** | Sprint (consume stamina) |
| **ESPACIO** | Saltar (solo cuando estás en el suelo) |
| **F** | Activar/Desactivar linterna táctica |

## 🎲 Mecánicas de Juego

### Sistema de Vida
- Tienes **3 vidas** al inicio
- Los drones te dañan **1 punto de vida** al contacto
- La barra **verde** en la parte inferior muestra tu vida restante
- Si pierdes todas las vidas, el juego termina

### Sistema de Stamina
- La barra **azul** muestra tu stamina de sprint
- Se **gasta** al correr (mantener SHIFT)
- Se **regenera** automáticamente al caminar o detenerte
- Si se agota, no podrás correr hasta que se recupere

### Sistema de Oleadas
- El juego comienza en la **Oleada 1**
- Cada **10 enemigos eliminados** avanzas a la siguiente oleada
- Las oleadas aumentan la dificultad:
  - Más velocidad de los drones
  - Intervalos de spawn más cortos
  - Más enemigos por oleada

### Puntuación
- Ganas **1 punto** por cada drone eliminado
- La puntuación se muestra en la esquina superior izquierda
- Intenta conseguir la mayor puntuación posible

### Entorno
- La plataforma tiene **coberturas** (paredes y bloques) que puedes usar para protegerte
- Los drones pueden quedar atascados momentáneamente tras las coberturas
- No puedes atravesar las paredes ni los obstáculos

## 🌟 Características

- ✅ Gráficos 3D con Three.js
- ✅ Sistema de física básico (gravedad, colisiones)
- ✅ Sistema de iluminación dinámica
- ✅ Efectos visuales (muzzle flash, efectos de muerte)
- ✅ HUD completo con información en tiempo real
- ✅ Soporte para VR/WebXR (opcional)
- ✅ Diseño responsive
- ✅ Estética cyberpunk/neon

## 🛠️ Tecnologías Utilizadas

- **HTML5** - Estructura del juego
- **CSS3** - Estilos y diseño de la interfaz
- **JavaScript (ES6+)** - Lógica del juego
- **Three.js v0.160.0** - Motor de renderizado 3D (cargado desde CDN)

## 📁 Estructura del Proyecto

```
DRONE DEFENDER/
│
├── index.html      # Página principal del juego
├── script.js       # Lógica del juego y Three.js
├── styles.css      # Estilos de la interfaz
└── README.md       # Este archivo
```

## 🎨 Personalización

El juego utiliza una paleta de colores centralizada definida en `script.js`. Puedes modificar los colores editando el objeto `PALETTE` al inicio del archivo.

## ⚠️ Notas Importantes

1. **Pointer Lock**: Después de iniciar el juego, haz clic en la pantalla para capturar el ratón y entrar en modo vista libre. Presiona **ESC** para liberar el ratón.

2. **Rendimiento**: El juego puede requerir una tarjeta gráfica decente para un rendimiento óptimo, especialmente con muchas oleadas.

3. **VR/WebXR**: El soporte para realidad virtual está incluido pero requiere un dispositivo compatible y un navegador con soporte WebXR.

## 🐛 Solución de Problemas

- **El juego no carga**: Verifica que tienes conexión a Internet (necesaria para cargar Three.js)
- **Controles no funcionan**: Asegúrate de hacer clic en la pantalla después de iniciar el juego para activar el pointer lock
- **Rendimiento bajo**: Cierra otras pestañas del navegador o reduce la resolución de la ventana

## 📝 Licencia

Este proyecto es de código abierto y está disponible para uso educativo y personal.

---

**¡Disfruta defendiendo la plataforma orbital!** 🚀

