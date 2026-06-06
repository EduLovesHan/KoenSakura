import * as THREE from 'three';
import { gsap } from 'gsap';
import { cerrarMenuSuperior } from '../ui/menu.js';
import { obtenerDebugGUI } from '../core/debug.js';
import { phongUniformsGlobales } from './CargadorModelos.js';

export const materialesEmisivos = [];
export let ambientLight, directionalLight;
let esDeDia = true;

// Registrar material para brillar en la noche
export function registrarMaterialEmisivo(material) {
    if (material && !materialesEmisivos.includes(material)) {
        materialesEmisivos.push(material);
        // Establecer el estado inicial basándose en si es de noche o no
        material.emissiveIntensity = !esDeDia ? 5.0 : 0.0;
    }
}

// Instanciar las luces en la escena
export function inicializarIluminacion(scene) {
    // Luz ambiental inicial (Día) con componentes RGB exactos para sRGB (con offset para evitar redondeo)
    ambientLight = new THREE.AmbientLight(); 
    ambientLight.color.setRGB((0xd8 + 0.001) / 255, (0xe2 + 0.001) / 255, (0xf0 + 0.001) / 255);
    ambientLight.intensity = 0.6;
    scene.add(ambientLight);

    // Luz direccional inicial (Sol de Día) con componentes RGB exactos para sRGB (con offset para evitar redondeo)
    directionalLight = new THREE.DirectionalLight();
    directionalLight.color.setRGB(1.0, (0xf5 + 0.001) / 255, (0xe6 + 0.001) / 255);
    directionalLight.intensity = 1.5;
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
}

// Función auxiliar para refrescar el panel lil-gui de manera recursiva
function refrescarGUI() {
    const gui = obtenerDebugGUI();
    if (gui) {
        const actualizarControladores = (guiInstance) => {
            if (guiInstance.controllers) {
                guiInstance.controllers.forEach(c => {
                    if (typeof c.updateDisplay === 'function') {
                        c.updateDisplay();
                    }
                });
            }
            if (guiInstance.folders) {
                const folders = Array.isArray(guiInstance.folders) 
                    ? guiInstance.folders 
                    : Object.values(guiInstance.folders);
                folders.forEach(folder => {
                    actualizarControladores(folder);
                });
            }
        };
        actualizarControladores(gui);
    }
}

// Función principal para animar el clima suavemente con GSAP
export function cambiarClimaSuave(esDeDiaTarget, skybox, duracion = 3.5) {
    const ease = "power2.inOut";

    // 1. Matar cualquier animación activa en las luces, colores, posiciones, skybox, materiales y uniforms
    gsap.killTweensOf(ambientLight);
    gsap.killTweensOf(ambientLight.color);
    gsap.killTweensOf(directionalLight);
    gsap.killTweensOf(directionalLight.color);
    gsap.killTweensOf(directionalLight.position);
    if (skybox && skybox.materialEsferaNoche) {
        gsap.killTweensOf(skybox.materialEsferaNoche.uniforms.opacity);
    }
    materialesEmisivos.forEach(mat => gsap.killTweensOf(mat));
    if (phongUniformsGlobales) {
        gsap.killTweensOf(phongUniformsGlobales.uShininess);
        gsap.killTweensOf(phongUniformsGlobales.uSpecularIntensity);
    }

    // Configuración exacta para los dos modos (Día / Noche) - usando componentes sRGB directos (con offset para evitar redondeo descendente)
    const targetSolColor = {
        r: esDeDiaTarget ? 1.0 : (0x1e + 0.001) / 255,
        g: esDeDiaTarget ? (0xf5 + 0.001) / 255 : (0x23 + 0.001) / 255,
        b: esDeDiaTarget ? (0xe6 + 0.001) / 255 : (0x33 + 0.001) / 255
    };
    const targetAmbientColor = {
        r: esDeDiaTarget ? (0xd8 + 0.001) / 255 : (0x1e + 0.001) / 255,
        g: esDeDiaTarget ? (0xe2 + 0.001) / 255 : (0x23 + 0.001) / 255,
        b: esDeDiaTarget ? (0xf0 + 0.001) / 255 : (0x33 + 0.001) / 255
    };
    const targetSolIntensity = esDeDiaTarget ? 1.5 : 2.0;
    const targetAmbientIntensity = esDeDiaTarget ? 0.6 : 2.0;
    const targetSolPosition = { x: 10, y: 20, z: 10 }; // se mantiene igual para ambos por especificación
    const targetShininess = 30.0;
    const targetSpecularIntensity = 0.0;
    const targetSkyboxOpacity = esDeDiaTarget ? 0.0 : 1.0;
    const targetEmissiveIntensity = esDeDiaTarget ? 0.0 : 5.0;

    // 2. Animar Luz Ambiental (Intensidad y Color)
    gsap.to(ambientLight, {
        intensity: targetAmbientIntensity,
        duration: duracion,
        ease: ease,
        onUpdate: refrescarGUI
    });

    gsap.to(ambientLight.color, {
        r: targetAmbientColor.r,
        g: targetAmbientColor.g,
        b: targetAmbientColor.b,
        duration: duracion,
        ease: ease
    });

    // 3. Animar Luz Direccional (Intensidad, Color y Posición)
    gsap.to(directionalLight, {
        intensity: targetSolIntensity,
        duration: duracion,
        ease: ease
    });

    gsap.to(directionalLight.color, {
        r: targetSolColor.r,
        g: targetSolColor.g,
        b: targetSolColor.b,
        duration: duracion,
        ease: ease
    });

    gsap.to(directionalLight.position, {
        x: targetSolPosition.x,
        y: targetSolPosition.y,
        z: targetSolPosition.z,
        duration: duracion,
        ease: ease
    });

    // 4. Animar Uniforms de Phong específicos
    if (phongUniformsGlobales) {
        gsap.to(phongUniformsGlobales.uShininess, {
            value: targetShininess,
            duration: duracion,
            ease: ease
        });
        gsap.to(phongUniformsGlobales.uSpecularIntensity, {
            value: targetSpecularIntensity,
            duration: duracion,
            ease: ease
        });
    }

    // 5. Animar la esfera nocturna (Crossfade del cielo)
    if (skybox && skybox.materialEsferaNoche) {
        gsap.to(skybox.materialEsferaNoche.uniforms.opacity, {
            value: targetSkyboxOpacity,
            duration: duracion,
            ease: ease
        });
    }

    // 6. Animar materiales emisivos (Farolas/Ventanas)
    materialesEmisivos.forEach(mat => {
        gsap.to(mat, {
            emissiveIntensity: targetEmissiveIntensity,
            duration: duracion,
            ease: ease
        });
    });

    // 8. Sincronizar el checkbox de la interfaz
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');
    if (modoNocheCheckbox) {
        modoNocheCheckbox.checked = !esDeDiaTarget;
    }
}

// Función compatible con la UI antigua que alterna el estado
export function alternarDiaNoche(skybox) {
    alternarCicloDiaNoche(skybox);
    return { ambInt: ambientLight.intensity, dirInt: directionalLight.intensity };
}

export function alternarCicloDiaNoche(skybox) {
    esDeDia = !esDeDia;
    cambiarClimaSuave(esDeDia, skybox);
}

// Función compatible con lógica externa que requiera cambiarClima
export function cambiarClima(esDeDiaTarget, skybox) {
    esDeDia = esDeDiaTarget;
    cambiarClimaSuave(esDeDiaTarget, skybox);
}

// Conectar sliders con las luces y controlar eventos de cambio de clima
export function configurarControlesIluminacion(skybox) {
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');

    // Alternancia rápida con tecla N
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'n') {
            alternarDiaNoche(skybox);
        }
    });

    const debugGui = obtenerDebugGUI();
    const carpetaIluminacion = debugGui.addFolder('Iluminación');
    if (ambientLight) {
        carpetaIluminacion.add(ambientLight, 'intensity', 0, 3, 0.01)
            .name('Intensidad Ambiental')
            .listen();
        carpetaIluminacion.addColor(ambientLight, 'color')
            .name('Color Ambiental')
            .listen();
    }
    if (directionalLight) {
        carpetaIluminacion.add(directionalLight, 'intensity', 0, 3, 0.01)
            .name('Intensidad Sol')
            .listen();
        carpetaIluminacion.addColor(directionalLight, 'color')
            .name('Color Sol')
            .listen();
        carpetaIluminacion.add(directionalLight.position, 'x', -100, 100, 0.5)
            .name('Posición Sol X')
            .listen();
        carpetaIluminacion.add(directionalLight.position, 'y', 0, 100, 0.5)
            .name('Posición Sol Y')
            .listen();
        carpetaIluminacion.add(directionalLight.position, 'z', -100, 100, 0.5)
            .name('Posición Sol Z')
            .listen();
    }

    if (phongUniformsGlobales) {
        carpetaIluminacion.add(phongUniformsGlobales.uShininess, 'value', 1, 200, 1)
            .name('Brillo Especular (uShininess)')
            .listen();
        carpetaIluminacion.add(phongUniformsGlobales.uSpecularIntensity, 'value', 0.0, 1.0, 0.01)
            .name('Intensidad Especular')
            .listen();
    }
    
    if (modoNocheCheckbox) {
        modoNocheCheckbox.addEventListener('change', () => {
            alternarDiaNoche(skybox);
            cerrarMenuSuperior(); // Cerrar el menú superior para ver la escena limpia
        });
    }
}
