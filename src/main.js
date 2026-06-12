import './style.css';
import * as THREE from 'three';
import { inicializarMotor } from './core/motor.js';
import { ControlesPrimeraPersona } from './player/controles.js';
import { inicializarInteracciones, actualizarInteracciones } from './player/interacciones.js';
import { Skybox } from './world/skybox.js';
import { cargarEscenario, phongUniformsGlobales, aguasInstanciadas } from './world/CargadorModelos.js';
import { crearHitbox, inicializarDebugColisiones, actualizarPlayerBox } from './world/colisiones.js';
import { inicializarIluminacion, configurarControlesIluminacion, ambientLight, directionalLight, actualizarLucesFarolas } from './world/iluminacion.js';
import { actualizarAnimaciones } from './world/animaciones.js';
import { inicializarAudio, reproducirClick, configurarControlesAudio } from './audio/GestorAudio.js';
import { inicializarUI } from './ui/menu.js';

// Pantalla de carga
const pantallaCarga = document.getElementById('pantalla-carga');
const barraRelleno = document.getElementById('carga-barra');
const textoPorcentaje = document.getElementById('carga-porcentaje');

const loadingManager = new THREE.LoadingManager();

let porcentajeMaximo = 0;
let timeoutCierre;

loadingManager.onStart = () => {
    clearTimeout(timeoutCierre);
};

loadingManager.onProgress = (_url, cargados, total) => {
    const porcentajeActual = Math.round((cargados / total) * 100);
    porcentajeMaximo = Math.max(porcentajeMaximo, porcentajeActual);
    barraRelleno.style.width = `${porcentajeMaximo}%`;
    textoPorcentaje.textContent = `Cargando... ${porcentajeMaximo}%`;
};

loadingManager.onLoad = async () => {
    textoPorcentaje.textContent = 'Compilando gráficos...';
    try {
        await renderizador.compileAsync(scene, camara);
    } catch (err) {
        console.warn('Error en la pre-compilación', err);
    }

    timeoutCierre = setTimeout(() => {
        barraRelleno.style.width = '100%';
        textoPorcentaje.textContent = '¡Listo! 100%';

        setTimeout(() => {
            pantallaCarga.classList.add('fadeout');
            pantallaCarga.addEventListener('transitionend', () => {
                pantallaCarga.remove();
            }, { once: true });
        }, 2500);
    }, 600);
};

loadingManager.onError = (url) => {
    console.error('[LoadingManager] Error cargando:', url);
};

// Configuración del motor, escena, cámara y renderizador
const { scene, camara, renderizador } = inicializarMotor();
const objetosColision = [];
const reloj = new THREE.Clock();

// Configuración del audio y controles de movimiento
inicializarAudio(camara);
const controles = new ControlesPrimeraPersona(camara, document.body, objetosColision);
configurarControlesAudio();

// Bloquear pointer lock hasta que la pantalla de carga desaparezca
document.addEventListener('click', (e) => {
    if (document.getElementById('pantalla-carga')) {
        e.stopImmediatePropagation();
    }
}, true);

// Configuración de la iluminación y el skybox
const skybox = new Skybox(scene, loadingManager);
inicializarIluminacion(scene);
configurarControlesIluminacion(skybox);

// Inicializar depuración de colisiones e hitbox del jugador
inicializarDebugColisiones(scene, camara, controles);
actualizarPlayerBox(camara.position);

// Carga de los modelos
cargarEscenario(scene, objetosColision, loadingManager);

// Límites del mapa
crearHitbox(-100, 1, 0, 0.5, 10, 600, scene, objetosColision); // Izquierda
crearHitbox(100, 1, 0, 0.5, 10, 600, scene, objetosColision);  // Derecha
crearHitbox(0, 1, -300, 200, 10, 0.5, scene, objetosColision); // Frontal
crearHitbox(0, 1, 300, 200, 10, 0.5, scene, objetosColision);  // Trasera
crearHitbox(0, -0.05, 0, 200, 0.1, 600, scene, objetosColision); // Suelo

// Configuración de la UI y las interacciones
inicializarInteracciones();
inicializarUI(reproducirClick);

// Bucle de renderizado
function animar() {
    requestAnimationFrame(animar);
    const delta = reloj.getDelta();

    // Actualizar lógica
    actualizarAnimaciones(delta);


    actualizarPlayerBox(camara.position);

    // Actualizar shader del agua realista (THREE.Water)
    if (aguasInstanciadas) {
        aguasInstanciadas.forEach(agua => {
            agua.material.uniforms['time'].value += delta * 0.3; // Modifica este factor (ej. 0.3) para controlar la velocidad del oleaje
        });
    }
    actualizarInteracciones(camara, controles.isLocked);
    controles.actualizar();

    // Object Pooling: reasignar las 3 PointLights a las farolas más cercanas
    actualizarLucesFarolas(camara);

    // Sincronizar y actualizar los uniforms de Phong en cada frame
    if (phongUniformsGlobales && ambientLight && directionalLight) {
        phongUniformsGlobales.uAmbientIntensity.value = ambientLight.intensity;
        phongUniformsGlobales.uAmbientColor.value.copy(ambientLight.color);
        phongUniformsGlobales.uLightIntensity.value = directionalLight.intensity;
        phongUniformsGlobales.uLightColor.value.copy(directionalLight.color);
        phongUniformsGlobales.uLightPosition.value.copy(directionalLight.position).applyMatrix4(camara.matrixWorldInverse);
        phongUniformsGlobales.uCameraPosition.value.set(0, 0, 0); // En espacio de cámara la posición de cámara es origen
    }

    // Mantener la esfera de noche centrada en la cámara
    if (skybox && typeof skybox.actualizar === 'function') {
        skybox.actualizar(camara);
    }
    renderizador.render(scene, camara);
}
// Iniciar el bucle
animar();
