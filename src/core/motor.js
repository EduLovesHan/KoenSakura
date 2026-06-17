import * as THREE from 'three';

export function inicializarMotor() {
    // Crear Escena
    const scene = new THREE.Scene();

    // Crear Cámara
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camara.position.set(0.8, 3.5, 25);

    // Crear Renderizador 
    const renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderizador.domElement);

    // Manejo de redimensionado de ventana 
    window.addEventListener('resize', () => {
        camara.aspect = window.innerWidth / window.innerHeight;
        camara.updateProjectionMatrix();
        renderizador.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camara, renderizador };
}