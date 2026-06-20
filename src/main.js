import './style.css';
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { inicializarengine } from './core/engine.js';
import { controlsPrimeraPersona } from './player/controls.js';
import { inicializarinteractions, actualizarinteractions } from './player/interactions.js';
import { Skybox } from './world/skybox.js';
import { cargarEscenario, actualizarCargaPorProximidad, phongUniformsGlobales, aguasInstanciadas } from './world/ModelLoader.js';
import { inicializarDebugCollisions, actualizarPlayerBox } from './world/collisions.js';
import { inicializarLighting, configurarcontrolsLighting, actualizarLucesFarolas, directionalLight } from './world/lighting.js';
import { actualizaranimations } from './world/animations.js';
import { inicializarAudio, reproducirClick, configurarcontrolsAudio } from './audio/AudioManager.js';
import { inicializarUI } from './ui/menu.js';
import { idiomaActual, diccionario } from './core/i18n.js';
import { broker } from './world/EventBroker.js';


// Pantalla de carga
const pantallaCarga = document.getElementById('pantalla-carga');
const barraRelleno = document.getElementById('carga-barra');
const textoPorcentaje = document.getElementById('carga-porcentaje');
const spinnerCarga = document.querySelector('.carga-spinner');
const btnEntrar = document.getElementById('btn-entrar');

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
    const prefijo = diccionario[idiomaActual].carga_progreso;
    textoPorcentaje.textContent = `${prefijo} ${porcentajeMaximo}%`;
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

        // Mostrar el botón de entrar al finalizar la carga
        setTimeout(() => {
            if (spinnerCarga) spinnerCarga.style.display = 'none';
            const barraContenedor = document.querySelector('.carga-barra-contenedor');
            if (barraContenedor) barraContenedor.style.display = 'none';
            if (textoPorcentaje) textoPorcentaje.style.display = 'none';

            if (btnEntrar) {
                btnEntrar.style.display = 'inline-block';
            }
        }, 800);
    }, 600);
};

loadingManager.onError = (url) => {
    console.error('[LoadingManager] Error cargando:', url);
};

// Event listener botón de entrada
if (btnEntrar) {
    btnEntrar.addEventListener('click', async () => {
        const elemento = document.documentElement;
        try {

            //Entra con el paseo en pantalla completa
            if (elemento.requestFullscreen) {
                await elemento.requestFullscreen();
            } else if (elemento.webkitRequestFullscreen) {
                await elemento.webkitRequestFullscreen();
            }

            //Bloquear rotación en ciertos navegadores
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(e => {
                    console.log("Bloqueo de rotación no soportado:", e);
                });
            }
        } catch (err) {
            console.log("Error Fullscreen:", err);
        }

        // Pasar directo al paseo
        if (pantallaCarga) {
            pantallaCarga.classList.add('fadeout');
            pantallaCarga.addEventListener('transitionend', () => {
                pantallaCarga.remove();
            }, { once: true });
        }
    });
}

// Elementos del indicador de carga en background
const indicadorCargaBg = document.getElementById('indicador-carga-bg');
const textoCargaBg = document.getElementById('texto-carga-bg');
const barraProgresoMini = document.getElementById('carga-bg-progreso-mini');

if (indicadorCargaBg) {
    broker.on('zonaCargando', ({ zona, progreso, total }) => {
        indicadorCargaBg.classList.remove('oculto');
        
        // Obtener el nombre traducido de la zona
        const keyZona = `zona_${zona}`;
        const nombreZona = diccionario[idiomaActual][keyZona] || zona;
        
        // Carga bg zona string
        let str = diccionario[idiomaActual].carga_bg_zona || "Cargando {zona}...";
        str = str.replace('{zona}', nombreZona)
                 .replace('{progreso}', progreso)
                 .replace('{total}', total);
                 
        textoCargaBg.textContent = str;
        
        // Progreso barra mini
        const pct = Math.round((progreso / total) * 100);
        if (barraProgresoMini) barraProgresoMini.style.width = `${pct}%`;
    });

    broker.on('zonaCompleta', ({ zona, progreso, total }) => {
        const pct = Math.round((progreso / total) * 100);
        if (barraProgresoMini) barraProgresoMini.style.width = `${pct}%`;
    });

    broker.on('todasZonasCargadas', () => {
        if (textoCargaBg) {
            textoCargaBg.textContent = diccionario[idiomaActual].carga_bg_completa || "Áreas cargadas ✓";
        }
        if (barraProgresoMini) {
            barraProgresoMini.style.width = '100%';
        }
        
        // Desvanecer el indicador lentamente
        setTimeout(() => {
            indicadorCargaBg.style.transition = 'opacity 1s ease';
            indicadorCargaBg.style.opacity = '0';
            setTimeout(() => {
                indicadorCargaBg.classList.add('oculto');
                // Restaurar estilos para futuras cargas si es necesario
                indicadorCargaBg.style.transition = '';
                indicadorCargaBg.style.opacity = '';
            }, 1000);
        }, 3000);
    });
}

// Configuración del motor, escena, cámara y renderizador
const { scene, camara, renderizador } = inicializarengine();
const objetosColision = [];
const timer = new THREE.Timer();

// Inicializar el panel de FPS
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.zIndex = '10000';
stats.dom.style.display = 'none';
stats.dom.style.position = 'absolute';
stats.dom.style.right = '0px';
stats.dom.style.left = 'auto';
document.body.appendChild(stats.dom);

// Configuración del audio y controles de movimiento
inicializarAudio(camara);
const controls = new controlsPrimeraPersona(camara, document.body, objetosColision);
configurarcontrolsAudio();

// Bloquear clicks excepto para el botón de entrar
document.addEventListener('click', (e) => {
    if (document.getElementById('pantalla-carga')) {
        if (e.target && e.target.id === 'btn-entrar') {
            return; // Permitir el clic en el botón para entrar
        }
        e.stopImmediatePropagation();
    }
}, true);

// Configuración de la iluminación y el skybox
const skybox = new Skybox(scene, loadingManager);
inicializarLighting(scene);
configurarcontrolsLighting(skybox, renderizador, scene);

// Inicializar depuración de colisiones y hitbox del jugador
inicializarDebugCollisions(scene, camara, controls);
actualizarPlayerBox(camara.position);

// Carga de los models
cargarEscenario(scene, objetosColision, loadingManager, renderizador, camara);

// Configuración de la UI y las interacciones
inicializarinteractions();
inicializarUI(reproducirClick);

// Listener para el checkbox de FPS
const fpsCheckbox = document.getElementById('fps-checkbox');
if (fpsCheckbox) {
    fpsCheckbox.addEventListener('change', () => {
        stats.dom.style.display = fpsCheckbox.checked ? 'block' : 'none';
    });
}

// Bucle de renderizado
function animar(timestamp) {
    requestAnimationFrame(animar);
    timer.update(timestamp);
    const delta = timer.getDelta();

    // Actualizar lógica
    actualizaranimations(delta);
    actualizarPlayerBox(camara.position);
    actualizarCargaPorProximidad(camara.position);

    // Actualizar shader del agua implementado con THREE.Water
    if (aguasInstanciadas) {
        aguasInstanciadas.forEach(agua => {
            agua.material.uniforms['time'].value += delta * 0.3; // velocidad del efecto de oleaje
        });
    }
    actualizarinteractions(camara, controls.isLocked);
    controls.actualizar();

    // Asignar las 6 PointLights a las farolas más cercanas
    actualizarLucesFarolas(camara);

    // La luz direccional sigue a la cámara
    if (directionalLight) {
        directionalLight.position.set(camara.position.x + 30, camara.position.y + 45, camara.position.z + 30);
        directionalLight.target.position.copy(camara.position);
        directionalLight.target.updateMatrixWorld();
    }

    // Mantener la esfera de noche centrada en la cámara
    if (skybox && typeof skybox.actualizar === 'function') {
        skybox.actualizar(camara);
    }
    renderizador.render(scene, camara);
    stats.update();
}
// Iniciar el bucle
animar();