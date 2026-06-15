import * as THREE from 'three';

export function inicializarengine() {
    // Detectar si es móvil
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    window.esMovil = esMovil;

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camara.position.set(0.8, 3.5, 25);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({
        antialias: true, // Activado para suavizar los dientes de sierra
        powerPreference: "high-performance" // Fuerza el uso de la GPU dedicada si existe
    });

    // Limita a un máximo de 1.2 pixel ratio en móvil para compensar el antialias
    renderizador.setPixelRatio(esMovil ? Math.min(window.devicePixelRatio, 1.2) : Math.min(window.devicePixelRatio, 2.0));

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
        renderizador.setPixelRatio(esMovil ? Math.min(window.devicePixelRatio, 1.2) : Math.min(window.devicePixelRatio, 2.0));
    });

    return { scene, camara, renderizador };
}