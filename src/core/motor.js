import * as THREE from 'three';

export function inicializarMotor() {
    // Detección de Móviles (soporte táctil o userAgent móvil)
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    window.esMovil = esMovil;

    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camara.position.set(0.8, 3.5, 25);

    // Crear Renderizador
    const renderizador = new THREE.WebGLRenderer({
        antialias: !esMovil, // Apagado en móviles para mejorar fill rate, encendido en PC (corregido)
        powerPreference: "high-performance" // Fuerza el uso de la GPU dedicada si existe
    });
    
    // Pixel Ratio Agresivo: limita resolución a 1x en móvil para evitar sobrecargar pantallas con alta densidad
    renderizador.setPixelRatio(esMovil ? 1.0 : Math.min(window.devicePixelRatio, 2.0));

    // Determinar dimensiones visuales correctas según la orientación (Fake Landscape)
    const isPortraitInicial = window.innerHeight > window.innerWidth;
    const anchoVisualInicial = isPortraitInicial ? window.innerHeight : window.innerWidth;
    const altoVisualInicial = isPortraitInicial ? window.innerWidth : window.innerHeight;

    camara.aspect = anchoVisualInicial / altoVisualInicial;
    camara.updateProjectionMatrix();

    renderizador.setSize(anchoVisualInicial, altoVisualInicial);

    // Adjuntar al contenedor del juego para que el canvas rote junto a los menús y joystick
    const contenedorJuego = document.getElementById('juego-contenedor') || document.body;
    contenedorJuego.appendChild(renderizador.domElement);

    // Manejo de redimensionado de ventana
    window.addEventListener('resize', () => {
        const isPortrait = window.innerHeight > window.innerWidth;

        // Si está en vertical, invertimos las medidas de cálculo
        const anchoVisual = isPortrait ? window.innerHeight : window.innerWidth;
        const altoVisual = isPortrait ? window.innerWidth : window.innerHeight;

        camara.aspect = anchoVisual / altoVisual;
        camara.updateProjectionMatrix();
        renderizador.setSize(anchoVisual, altoVisual);
        renderizador.setPixelRatio(esMovil ? 1.0 : Math.min(window.devicePixelRatio, 2.0));
    });

    return { scene, camara, renderizador };
}
