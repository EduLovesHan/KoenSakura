import * as THREE from 'three';

//controla las animaciones de multiples modelos
const mixers = [];

// texturas de agua para animación UV
const texturesAgua1 = [];

// velocidad de desplazamiento UV para agua
const velAgua1 = { u: 0.0002, v: 0.000 };

//Registrar el AnimationMixer y arrancar todos los clips del modelo
export function registraranimations(modelo, clips) {
    if (!clips || clips.length === 0) return;
    const mixer = new THREE.AnimationMixer(modelo);
    clips.forEach((clip) => mixer.clipAction(clip).play());
    // Guardar en el array para que todos se actualicen cada frame
    mixers.push(mixer);
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