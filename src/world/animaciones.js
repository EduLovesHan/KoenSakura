import * as THREE from 'three';

// ── Estado interno del módulo ──
let mixer = null;

// Texturas de agua registradas para animación UV
const texturasAgua1 = [];

// Velocidad de desplazamiento UV para agua 
const velAgua1 = { u: 0.0002, v: 0.000 };

//Registrar el AnimationMixer y arrancar todos los clips del modelo
export function registrarAnimaciones(modelo, clips) {
    if (!clips || clips.length === 0) return;

    mixer = new THREE.AnimationMixer(modelo);
    clips.forEach((clip) => mixer.clipAction(clip).play());
}

//Registrar una textura de agua para animación UV
export function registrarTexturaAgua(textura) {
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    texturasAgua1.push(textura);
}

//Llamar por frame desde main.js con el delta del reloj 
export function actualizarAnimaciones(delta) {
    // Actualizar AnimationMixer (peces y cualquier clip del GLB)
    if (mixer) mixer.update(delta);

    // Desplazar UV de las texturas de agua
    texturasAgua1.forEach((tex) => {
        tex.offset.x += velAgua1.u;
        tex.offset.y += velAgua1.v;
    });
}
