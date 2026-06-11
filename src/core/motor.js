import * as THREE from 'three';

export function inicializarMotor() {
    // Detección de Móviles (soporte táctil o userAgent móvil)
    window.esMovil = ('ontouchstart' in window) || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camara.position.set(0.8, 3.5, 25);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimización de Pixel Ratio (evitar lags por DPI alto en GPU móvil)
    renderizador.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderizador.domElement);

    // Manejo de redimensionado de ventana
    window.addEventListener('resize', () => {
        camara.aspect = window.innerWidth / window.innerHeight;
        camara.updateProjectionMatrix();
        renderizador.setSize(window.innerWidth, window.innerHeight);
        renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    return { scene, camara, renderizador };
}
