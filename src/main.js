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
const { scene, camara, renderizador } = inicializarengine();
const configuracionRendimiento = window.configuracionRendimiento || {
    precompilarShaders: false,
    usarAguaAvanzada: true,
    cargarAudioEnArranque: true,
    fpsMaximos: 0,
};
const overlayDiagnostico = document.getElementById('overlay-diagnostico');
const diagnosticoTexto = document.getElementById('diagnostico-texto');
const btnCerrarDiagnostico = document.getElementById('btn-cerrar-diagnostico');

if (btnCerrarDiagnostico && overlayDiagnostico) {
    btnCerrarDiagnostico.addEventListener('click', () => {
        overlayDiagnostico.classList.add('oculto');
    });
}

function registrarDiagnostico(mensaje, error = null, opciones = {}) {
    const { mostrarOverlay = false } = opciones;
    const detalle = error instanceof Error
        ? `${error.name}: ${error.message}`
        : (typeof error === 'string' ? error : '');
    const linea = `[${new Date().toLocaleTimeString()}] ${mensaje}${detalle ? ` | ${detalle}` : ''}`;
    console.log('[DiagnosticoMovil]', linea, error || '');
    if (!window.esMovil || !overlayDiagnostico || !diagnosticoTexto) return;
    if (mostrarOverlay) {
        overlayDiagnostico.classList.remove('oculto');
    }
    diagnosticoTexto.textContent = `${linea}\n${diagnosticoTexto.textContent}`.trim();
}

let porcentajeMaximo = 0;
let timeoutCierre;
let timeoutRespaldoCarga;
let cargaPrincipalFinalizada = false;
let escenarioPrincipalListo = false;

function finalizarPantallaCarga(origen = 'desconocido') {
    if (cargaPrincipalFinalizada) return;
    cargaPrincipalFinalizada = true;
    clearTimeout(timeoutCierre);
    clearTimeout(timeoutRespaldoCarga);
    registrarDiagnostico(`Carga principal lista (${origen})`);

    barraRelleno.style.width = '100%';
    textoPorcentaje.textContent = '¡Listo! 100%';
    timeoutCierre = setTimeout(() => {
        if (spinnerCarga) spinnerCarga.style.display = 'none';
        const barraContenedor = document.querySelector('.carga-barra-contenedor');
        if (barraContenedor) barraContenedor.style.display = 'none';
        if (textoPorcentaje) textoPorcentaje.style.display = 'none';
        if (btnEntrar) btnEntrar.style.display = 'inline-block';
    }, 400);
}

loadingManager.onStart = () => {
    if (!cargaPrincipalFinalizada) clearTimeout(timeoutCierre);
    registrarDiagnostico('Inicio de carga principal');
};

loadingManager.onProgress = (_url, cargados, total) => {
    if (cargaPrincipalFinalizada) return;
    const porcentajeActual = Math.round((cargados / total) * 100);
    porcentajeMaximo = Math.max(porcentajeMaximo, porcentajeActual);
    barraRelleno.style.width = `${porcentajeMaximo}%`;
    const prefijo = diccionario[idiomaActual].carga_progreso;
    textoPorcentaje.textContent = `${prefijo} ${porcentajeMaximo}%`;
    if (porcentajeMaximo >= 100) {
        clearTimeout(timeoutRespaldoCarga);
        timeoutRespaldoCarga = setTimeout(() => finalizarPantallaCarga('respaldo 100%'), 5000);
    }
};

loadingManager.onLoad = () => {
    textoPorcentaje.textContent = 'Finalizando carga...';
    if (escenarioPrincipalListo) finalizarPantallaCarga('LoadingManager');
};

loadingManager.onError = (url) => {
    console.error('[LoadingManager] Error cargando:', url);
    registrarDiagnostico(`Error cargando recurso: ${url}`, null, { mostrarOverlay: true });
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

        window.juegoIniciado = true;

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

    broker.on('zonaError', ({ zona, archivo }) => {
        if (textoCargaBg) textoCargaBg.textContent = `Reintentando ${zona}...`;
        registrarDiagnostico(`Fallo temporal cargando ${archivo}`);
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
const objetosColision = [];
const timer = new THREE.Timer();
const canvas = renderizador.domElement;

window.addEventListener('error', (event) => {
    registrarDiagnostico(
        `window.onerror en ${event.filename || 'desconocido'}:${event.lineno || 0}`,
        event.error || event.message,
        { mostrarOverlay: true }
    );
});

window.addEventListener('unhandledrejection', (event) => {
    registrarDiagnostico('Promesa rechazada sin manejar', event.reason, { mostrarOverlay: true });
});

window.addEventListener('orientationchange', () => {
    registrarDiagnostico(`Cambio de orientacion: ${window.orientation ?? 'sin dato'}`);
});

document.addEventListener('visibilitychange', () => {
    registrarDiagnostico(`Visibilidad: ${document.visibilityState}`);
});

canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    registrarDiagnostico('Se perdiÃ³ el contexto WebGL', null, { mostrarOverlay: true });
});

canvas.addEventListener('webglcontextrestored', () => {
    registrarDiagnostico('Se restaurÃ³ el contexto WebGL', null, { mostrarOverlay: true });
});

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
inicializarAudio(camara, { cargarMusicaAlInicio: configuracionRendimiento.cargarAudioEnArranque });
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
cargarEscenario(scene, objetosColision, loadingManager, renderizador, camara)
    .then(() => {
        escenarioPrincipalListo = true;
        finalizarPantallaCarga('escenario principal');
    })
    .catch((error) => {
        registrarDiagnostico('No se pudo completar la carga principal', error, { mostrarOverlay: true });
        finalizarPantallaCarga('recuperacion por error');
    });
registrarDiagnostico(`Inicializacion completa | movil=${window.esMovil ? 'si' : 'no'}`);

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
let ultimoFrameRenderizado = 0;
let ultimoLogRendimiento = 0;

function animar(timestamp) {
    requestAnimationFrame(animar);

    if (configuracionRendimiento.fpsMaximos > 0) {
        const intervaloMinimo = 1000 / configuracionRendimiento.fpsMaximos;
        if (timestamp - ultimoFrameRenderizado < intervaloMinimo) return;
        ultimoFrameRenderizado = timestamp;
    }

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

    if (timestamp - ultimoLogRendimiento >= 10000) {
        ultimoLogRendimiento = timestamp;
        const info = renderizador.info;
        const heapMB = performance.memory
            ? Math.round(performance.memory.usedJSHeapSize / 1048576)
            : 'n/d';
        console.info(
            `[RenderStats] calls=${info.render.calls} | triangulos=${info.render.triangles} | ` +
            `geometrias=${info.memory.geometries} | texturas=${info.memory.textures} | heapMB=${heapMB}`
        );
    }
    stats.update();
}
// Iniciar el bucle
animar();
