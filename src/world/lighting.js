import * as THREE from 'three';
import { gsap } from 'gsap';
import { broker } from './EventBroker.js';
import { cerrarMenuSuperior } from '../ui/menu.js';
import { obtenerDebugGUI } from '../core/debug.js';
import { phongUniformsGlobales } from './ModelLoader.js';

export const materialesEmisivos = [];
export let ambientLight, directionalLight;
let esDeDia = true;

// PointLights para farolas (Asignar las luces respecto a la distancia que se encuentren)
const NUM_LUCES_POOL = 6;
export const lucesPool = [];
export const posicionesFarolasGlobal = [];
export const configuracionFarolas = {
    color: 0xffaa00,
    altura: 4.0,
    intensidad: 2.0,
    distancia: 20.0
};

// Registrar material para brillar en la noche
export function registrarMaterialEmisivo(material) {
    if (material && !materialesEmisivos.includes(material)) {
        materialesEmisivos.push(material);
        // Establecer el estado inicial basándose en si es de noche o no
        material.emissiveIntensity = !esDeDia ? 5.0 : 0.0;
    }
}

// Instanciar las luces en la escena
export function inicializarLighting(scene) {
    // Luz ambiental inicial 
    ambientLight = new THREE.AmbientLight();
    ambientLight.color.setRGB((0xd8 + 0.001) / 255, (0xe2 + 0.001) / 255, (0xf0 + 0.001) / 255);
    ambientLight.intensity = 0.6;
    scene.add(ambientLight);

    // Luz direccional inicial
    directionalLight = new THREE.DirectionalLight();
    directionalLight.color.setRGB(1.0, (0xf5 + 0.001) / 255, (0xe6 + 0.001) / 255);
    directionalLight.intensity = 1.5;
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;

    // Configurar cámara de sombras optimizada
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 150;
    directionalLight.shadow.bias = -0.0005;

    // Limitar resolución de sombras en móviles
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    directionalLight.shadow.mapSize.width = esMovil ? 256 : 1024;
    directionalLight.shadow.mapSize.height = esMovil ? 256 : 1024;

    scene.add(directionalLight);

    // Inicializar PointLights para farolas (apagadas por defecto)
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

// Registrar una posición de farola
export function registrarPosicionFarola(posicion) {
    posicionesFarolasGlobal.push(posicion.clone());
}

export function actualizarLucesFarolas(camara) {
    const intensidadActual = phongUniformsGlobales.uPointLightIntensity.value;
    if (intensidadActual <= 0.0) {
        for (const luz of lucesPool) {
            luz.intensity = 0;
        }
        return;
    }

    // Se calculan distancias y se asignan las luces
    const { position: camaraPos } = camara;
    const distancias = posicionesFarolasGlobal.map((pos, idx) => ({
        idx,
        dist: camaraPos.distanceToSquared(pos)
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
            tempVec.set(posFarola.x, posFarola.y + configuracionFarolas.altura, posFarola.z);
            tempVec.applyMatrix4(camara.matrixWorldInverse);
            uniformPos[i].value.copy(tempVec);

            lucesPool[i].position.set(posFarola.x, posFarola.y + configuracionFarolas.altura, posFarola.z);
            lucesPool[i].intensity = intensidadActual;
        } else {
            uniformPos[i].value.set(0, -100, 0);
            lucesPool[i].intensity = 0;
        }
    }
}

// Función para animar el clima con GSAP
export function cambiarClimaSuave(esDeDiaTarget, skybox, duracion = 3.5) {
    const ease = "power2.inOut";

    // elimina cualquier animación activa en el ambiente
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

    // Configuración exacta para los modos dia-noche
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
    const targetSolPosition = { x: 10, y: 20, z: 10 }; // se mantiene igual para ambos 
    const targetShininess = 30.0;
    const targetSpecularIntensity = 0.0;
    const targetSkyboxOpacity = esDeDiaTarget ? 0.0 : 1.0;
    const targetEmissiveIntensity = esDeDiaTarget ? 0.0 : 5.0;

    // Animar Luz Ambiental
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

    // Animar Luz Direccional
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

    // Animar Uniforms de Phong específicos
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

    // Animar el skydome
    if (skybox && skybox.materialEsferaNoche) {
        gsap.to(skybox.materialEsferaNoche.uniforms.opacity, {
            value: targetSkyboxOpacity,
            duration: duracion,
            ease: ease
        });
    }

    // Animar materiales emisivos 
    materialesEmisivos.forEach(mat => {
        gsap.to(mat, {
            emissiveIntensity: targetEmissiveIntensity,
            duration: duracion,
            ease: ease
        });
    });

    // Animar luces de farolas
    const targetPoolIntensity = esDeDiaTarget ? 0.0 : configuracionFarolas.intensidad;
    // Animar el uniform compartido del shader (las luces físicas del pool se sincronizan automáticamente en el frame loop)
    gsap.killTweensOf(phongUniformsGlobales.uPointLightIntensity);
    gsap.to(phongUniformsGlobales.uPointLightIntensity, {
        value: targetPoolIntensity,
        duration: esDeDiaTarget ? duracion * 0.7 : duracion * 0.7,
        delay: esDeDiaTarget ? 0.0 : duracion * 0.3,
        ease: ease
    });

    // Sincronizar el checkbox del menu
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

// Conectar sliders con las luces y controlar eventos de cambio de clima
export function configurarcontrolsLighting(skybox) {
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');

    // Alternancia con tecla N
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'n') {
            alternarDiaNoche(skybox);
        }
    });

    const debugGui = obtenerDebugGUI();
    const carpetaLighting = debugGui.addFolder('Iluminación');
    if (ambientLight) {
        carpetaLighting.add(ambientLight, 'intensity', 0, 3, 0.01)
            .name('Intensidad Ambiental')
            .listen();
        carpetaLighting.addColor(ambientLight, 'color')
            .name('Color Ambiental')
            .listen();
    }
    if (directionalLight) {
        carpetaLighting.add(directionalLight, 'intensity', 0, 3, 0.01)
            .name('Intensidad Sol')
            .listen();
        carpetaLighting.addColor(directionalLight, 'color')
            .name('Color Sol')
            .listen();
        carpetaLighting.add(directionalLight.position, 'x', -100, 100, 0.5)
            .name('Posición Sol X')
            .listen();
        carpetaLighting.add(directionalLight.position, 'y', 0, 100, 0.5)
            .name('Posición Sol Y')
            .listen();
        carpetaLighting.add(directionalLight.position, 'z', -100, 100, 0.5)
            .name('Posición Sol Z')
            .listen();
    }

    if (phongUniformsGlobales) {
        carpetaLighting.add(phongUniformsGlobales.uShininess, 'value', 1, 200, 1)
            .name('Brillo Especular (uShininess)')
            .listen();
        carpetaLighting.add(phongUniformsGlobales.uSpecularIntensity, 'value', 0.0, 1.0, 0.01)
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

// Bus de eventos para procesar iluminación
broker.on('modeloCargado', ({ modelo, datosJSON }) => {
    // Si es farola, registrar su posición para la iluminación por proximidad
    if (datosJSON.esFarola) {
        // Actualizar la configuración global si viene especificada en el JSON
        if (datosJSON.farolaColor !== undefined) {
            configuracionFarolas.color = new THREE.Color(datosJSON.farolaColor).getHex();
            phongUniformsGlobales.uPointLightColor.value.setHex(configuracionFarolas.color);
            lucesPool.forEach(luz => luz.color.setHex(configuracionFarolas.color));
        }
        if (datosJSON.farolaAltura !== undefined) {
            configuracionFarolas.altura = Number(datosJSON.farolaAltura);
        }
        if (datosJSON.farolaIntensidad !== undefined) {
            configuracionFarolas.intensidad = Number(datosJSON.farolaIntensidad);
        }
        if (datosJSON.farolaDistancia !== undefined) {
            configuracionFarolas.distancia = Number(datosJSON.farolaDistancia);
            phongUniformsGlobales.uPointLightDistance.value = configuracionFarolas.distancia;
            lucesPool.forEach(luz => luz.distance = configuracionFarolas.distancia);
        }

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