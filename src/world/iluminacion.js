import * as THREE from 'three';
import { gsap } from 'gsap';
import { broker } from './EventBroker.js';
import { cerrarMenuSuperior } from '../ui/menu.js';
import { obtenerDebugGUI } from '../core/debug.js';
import { phongUniformsGlobales } from './CargadorModelos.js';

export const materialesEmisivos = [];
export let ambientLight, directionalLight;
let esDeDia = true;

// ── Pool de PointLights para farolas (Object Pooling + Distance Culling) ──
const NUM_LUCES_POOL = 6;
export const lucesPool = [];
export const posicionesFarolasGlobal = [];
const ALTURA_LUZ_FAROLA = 4.0; // Offset Y desde la base del modelo hasta la bombilla

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

    // Limitar resolución de sombras en móviles de forma defensiva
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    directionalLight.shadow.mapSize.width = esMovil ? 512 : 1024;
    directionalLight.shadow.mapSize.height = esMovil ? 512 : 1024;

    scene.add(directionalLight);

    // Inicializar pool de 3 PointLights para farolas (apagadas por defecto)
    for (let i = 0; i < NUM_LUCES_POOL; i++) {
        const luz = new THREE.PointLight(0xffaa00, 0, 20); // color cálido, intensidad 0, distancia 20
        luz.position.set(0, -100, 0); // fuera de vista hasta asignación
        scene.add(luz);
        lucesPool.push(luz);
    }
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

// Registrar una posición de farola para el sistema de Object Pooling
export function registrarPosicionFarola(posicion) {
    posicionesFarolasGlobal.push(posicion.clone());
}

// Lógica de proximidad: reasignar las 3 Point Lights (uniforms) a las farolas más cercanas
// Recibe la cámara completa para transformar posiciones a espacio de cámara (view space)
export function actualizarLucesFarolas(camara) {
    if (esDeDia) {
        // De día: apagar las luces del pool (uniforms)
        phongUniformsGlobales.uPointLightIntensity.value = 0.0;
        for (const luz of lucesPool) {
            luz.intensity = 0;
        }
        return;
    }

    // De noche: calcular distancias y asignar las 3 más cercanas
    const { position: camaraPos } = camara;
    const distancias = posicionesFarolasGlobal.map((pos, idx) => ({
        idx,
        dist: camaraPos.distanceToSquared(pos) // squared para evitar sqrt innecesario
    }));

    distancias.sort((a, b) => a.dist - b.dist);

    // Vector temporal para transformar posiciones a espacio de cámara
    const tempVec = new THREE.Vector3();

    const uniformPos = [
        phongUniformsGlobales.uPointLightPos0,
        phongUniformsGlobales.uPointLightPos1,
        phongUniformsGlobales.uPointLightPos2,
        phongUniformsGlobales.uPointLightPos3,
        phongUniformsGlobales.uPointLightPos4,
        phongUniformsGlobales.uPointLightPos5
    ];

    for (let i = 0; i < NUM_LUCES_POOL; i++) {
        if (i < distancias.length) {
            const posFarola = posicionesFarolasGlobal[distancias[i].idx];
            // Posición en espacio mundo con offset de altura
            tempVec.set(posFarola.x, posFarola.y + ALTURA_LUZ_FAROLA, posFarola.z);
            // Transformar a espacio de cámara (view space) para el shader
            tempVec.applyMatrix4(camara.matrixWorldInverse);
            uniformPos[i].value.copy(tempVec);

            // También mover la PointLight real (por si se usa para otros efectos)
            lucesPool[i].position.set(posFarola.x, posFarola.y + ALTURA_LUZ_FAROLA, posFarola.z);
            lucesPool[i].intensity = 2.0;
        } else {
            uniformPos[i].value.set(0, -100, 0);
            lucesPool[i].intensity = 0;
        }
    }

    phongUniformsGlobales.uPointLightIntensity.value = 2.0;
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

    // 7. Animar luces del pool de farolas (Object Pooling) — uniforms + PointLights
    const targetPoolIntensity = esDeDiaTarget ? 0.0 : 2.0;
    // Animar el uniform compartido del shader
    gsap.killTweensOf(phongUniformsGlobales.uPointLightIntensity);
    gsap.to(phongUniformsGlobales.uPointLightIntensity, {
        value: targetPoolIntensity,
        duration: duracion,
        ease: ease
    });
    // Animar las PointLights reales (por coherencia)
    lucesPool.forEach(luz => {
        gsap.killTweensOf(luz);
        gsap.to(luz, {
            intensity: targetPoolIntensity,
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

// Suscribirse al bus de eventos para procesar iluminación autónomamente
broker.on('modeloCargado', ({ modelo, datosJSON }) => {
    // Si es farola, registrar su posición para el pool de iluminación por proximidad
    if (datosJSON.esFarola) {
        const posFarola = modelo.position.clone();
        registrarPosicionFarola(posFarola);
    }

    // Buscar y registrar materiales emisivos en el modelo cargado
    modelo.traverse((child) => {
        if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
                const { emissive } = mat;
                if (emissive && (emissive.r > 0 || emissive.g > 0 || emissive.b > 0)) {
                    registrarMaterialEmisivo(mat);
                }
            });
        }
    });
});
