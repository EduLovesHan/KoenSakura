import * as THREE from 'three';

export function inicializarengine() {
    // Detectar si es móvil
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    window.esMovil = esMovil;
    window.juegoIniciado = false;
    window.configuracionRendimiento = {
        esMovil,
        usarModelosReducidos: esMovil || (navigator.deviceMemory && navigator.deviceMemory <= 4),
        // La compilacion global provoca pausas largas en escenas grandes.
        precompilarShaders: false,
        usarAguaAvanzada: !esMovil,
        cargarAudioEnArranque: !esMovil,
        concurrenciaPrincipal: esMovil ? 1 : 2,
        concurrenciaSecundaria: 1,
        distanciaCargaZona: esMovil ? 45 : 55,
        distanciaDescargaZona: esMovil ? 75 : 100,
        fpsMaximos: esMovil ? 30 : 0,
    };

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const farCamera = esMovil ? 180 : 700;
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, farCamera);
    camara.position.set(0.8, 3.5, 20);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({
        antialias: !esMovil,
        powerPreference: "high-performance"
    });
    renderizador.shadowMap.enabled = !esMovil;
    renderizador.shadowMap.type = THREE.PCFShadowMap;

    // Tone mapping y corrección de espacio de color para colores naturales
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    renderizador.toneMappingExposure = 1.0;
    renderizador.outputColorSpace = THREE.SRGBColorSpace;

    // Limita a un máximo de 1.5 pixel ratio en PC y 1.0 en móvil para compensar el antialias
    renderizador.setPixelRatio(esMovil ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();

    renderizador.setSize(window.innerWidth, window.innerHeight);

    // Adjuntar al contenedor del juego
    const contenedorJuego = document.getElementById('juego-contenedor') || document.body;
    contenedorJuego.appendChild(renderizador.domElement);

    // Manejo de redimensionado de ventana
    window.addEventListener('resize', () => {
        camara.aspect = window.innerWidth / window.innerHeight;
        camara.updateProjectionMatrix();
        renderizador.setSize(window.innerWidth, window.innerHeight);
        renderizador.setPixelRatio(esMovil ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    });

    return { scene, camara, renderizador };
}
