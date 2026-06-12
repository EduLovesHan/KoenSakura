import * as THREE from 'three';

export function inicializarMotor() {
    // Detección de Móviles (soporte táctil o userAgent móvil)
    window.esMovil = ('ontouchstart' in window) || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const { innerWidth, innerHeight, devicePixelRatio } = window;

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 5000);
    camara.position.set(0.8, 3.5, 25);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setPixelRatio(Math.min(devicePixelRatio, 2)); // Optimización de Pixel Ratio (evitar lags por DPI alto en GPU móvil)
    renderizador.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderizador.domElement);

    // Manejo de redimensionado de ventana
    window.addEventListener('resize', () => {
        const { innerWidth: wWidth, innerHeight: wHeight, devicePixelRatio: wRatio } = window;
        camara.aspect = wWidth / wHeight;
        camara.updateProjectionMatrix();
        renderizador.setSize(wWidth, wHeight);
        renderizador.setPixelRatio(Math.min(wRatio, 2));
    });

    return { scene, camara, renderizador };
}
