import * as THREE from 'three';

//controla las animaciones de multiples modelos
const mixers = [];

// texturas de agua para animación UV
const texturesAgua1 = [];

// velocidad de desplazamiento UV para agua
const velAgua1 = { u: 0.0002, v: 0.000 };


export function registraranimations(modelo, animaciones, animacionIndex = 0) {
    if (!animaciones || animaciones.length === 0) return;

    const mixer = new THREE.AnimationMixer(modelo);
    modelo.userData.mixer = mixer;
    mixers.push(mixer);

    const clip = animaciones[animacionIndex] || animaciones[0];

    if (modelo.userData.accionActual) {
        modelo.userData.accionActual.stop();
    }

    const accion = mixer.clipAction(clip);
    accion.play();

    modelo.userData.accionActual = accion;
}


//Registrar una textura de agua para animación UV
export function registrarTexturaAgua(textura) {
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    texturesAgua1.push(textura);
}

//Llamar por frame desde main.js con reloj 
export function actualizaranimations(delta) {
    // Actualizar todos los AnimationMixers registrados (peces, others clips GLB)
    for (const mixer of mixers) {
        mixer.update(delta);
    }

    // Desplazar UV de las textures de agua
    texturesAgua1.forEach((tex) => {
        tex.offset.x += velAgua1.u;
        tex.offset.y += velAgua1.v;
    });
}