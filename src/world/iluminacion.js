import * as THREE from 'three';
import { gsap } from 'gsap';
import { cerrarMenuSuperior } from '../ui/menu.js';

export const materialesEmisivos = [];
let ambientLight, directionalLight;
let esNoche = false;

// Registrar material para brillar en la noche
export function registrarMaterialEmisivo(material) {
    if (material && !materialesEmisivos.includes(material)) {
        materialesEmisivos.push(material);
        // Establecer el estado inicial basándose en si es de noche o no
        material.emissiveIntensity = esNoche ? 5.0 : 0.0;
    }
}

// Instanciar las luces en la escena
export function inicializarIluminacion(scene) {
    // Luz ambiental inicial (cálida / atardecer)
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
    scene.add(ambientLight);

    // Luz direccional inicial (Sol)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
}

// Función principal para animar el clima con GSAP
export function cambiarClima(esDeDia, skybox) {
    esNoche = !esDeDia;
    const duracion = 3.5;
    const ease = "power2.inOut";

    // 1. Matar cualquier animación activa para evitar conflictos por spam del usuario
    gsap.killTweensOf(ambientLight);
    gsap.killTweensOf(ambientLight.color);
    gsap.killTweensOf(directionalLight);
    gsap.killTweensOf(directionalLight.color);
    if (skybox && skybox.materialEsferaNoche) {
        gsap.killTweensOf(skybox.materialEsferaNoche.uniforms.opacity);
    }
    materialesEmisivos.forEach(mat => gsap.killTweensOf(mat));

    // Elementos de la UI para sincronización
    const luzAmbSlider = document.getElementById('luz-amb-slider');
    const luzDirSlider = document.getElementById('luz-dir-slider');
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');

    // 2. Animar la esfera nocturna (Crossfade del cielo)
    if (skybox && skybox.materialEsferaNoche) {
        gsap.to(skybox.materialEsferaNoche.uniforms.opacity, {
            value: esDeDia ? 0.0 : 1.0,
            duration: duracion,
            ease: ease
        });
    }

    // 3. Animar Luz Ambiental (Intensidad y Color)
    const targetAmbIntensity = esDeDia ? 0.6 : 0.3;
    const targetAmbColor = new THREE.Color(esDeDia ? 0xffffff : 0x223355);

    gsap.to(ambientLight, {
        intensity: targetAmbIntensity,
        duration: duracion,
        ease: ease,
        onUpdate: () => {
            if (luzAmbSlider) luzAmbSlider.value = ambientLight.intensity;
        }
    });

    gsap.to(ambientLight.color, {
        r: targetAmbColor.r,
        g: targetAmbColor.g,
        b: targetAmbColor.b,
        duration: duracion,
        ease: ease
    });

    // 4. Animar Luz Direccional/Sol (Intensidad y Color)
    const targetDirIntensity = esDeDia ? 1.0 : 0.3;
    const targetDirColor = new THREE.Color(esDeDia ? 0xffffff : 0x5577aa);

    gsap.to(directionalLight, {
        intensity: targetDirIntensity,
        duration: duracion,
        ease: ease,
        onUpdate: () => {
            if (luzDirSlider) luzDirSlider.value = directionalLight.intensity;
        }
    });

    gsap.to(directionalLight.color, {
        r: targetDirColor.r,
        g: targetDirColor.g,
        b: targetDirColor.b,
        duration: duracion,
        ease: ease
    });

    // 5. Animar materiales emisivos (Farolas/Ventanas)
    materialesEmisivos.forEach(mat => {
        gsap.to(mat, {
            emissiveIntensity: esDeDia ? 0.0 : 5.0,
            duration: duracion,
            ease: ease
        });
    });

    // Sincronizar el checkbox de la interfaz
    if (modoNocheCheckbox) {
        modoNocheCheckbox.checked = esNoche;
    }
}

// Función compatible con la UI antigua que alterna el estado
export function alternarDiaNoche(skybox) {
    esNoche = !esNoche;
    cambiarClima(!esNoche, skybox);
    return { ambInt: ambientLight.intensity, dirInt: directionalLight.intensity };
}

// Conectar sliders con las luces y controlar eventos de cambio de clima
export function configurarControlesIluminacion(skybox) {
    const luzAmbSlider = document.getElementById('luz-amb-slider');
    const luzDirSlider = document.getElementById('luz-dir-slider');
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');

    // Alternancia rápida con tecla N
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'n') {
            alternarDiaNoche(skybox);
        }
    });

    // Eventos de los Sliders del menú (manual)
    if (luzAmbSlider) {
        luzAmbSlider.addEventListener('input', (e) => {
            gsap.killTweensOf(ambientLight); // Detener animación si el usuario ajusta a mano
            ambientLight.intensity = parseFloat(e.target.value);
        });
    }
    if (luzDirSlider) {
        luzDirSlider.addEventListener('input', (e) => {
            gsap.killTweensOf(directionalLight); // Detener animación si el usuario ajusta a mano
            directionalLight.intensity = parseFloat(e.target.value);
        });
    }
    
    if (modoNocheCheckbox) {
        modoNocheCheckbox.addEventListener('change', () => {
            alternarDiaNoche(skybox);
            cerrarMenuSuperior(); // Cerrar el menú superior para ver la escena limpia
        });
    }
}
