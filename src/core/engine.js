import * as THREE from 'three';

export function inicializarengine() {
    // Detectar si es móvil
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    window.esMovil = esMovil;

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camara.position.set(0.8, 3.5, 20);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({
        antialias: true,
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