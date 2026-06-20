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
    color: 0xFFC354,
    altura: 4.5,
    intensidad: 3.0,
    distancia: 25.0
};

// Registrar material para brillar en la noche
export function registrarMaterialEmisivo(material) {
    if (material && !materialesEmisivos.includes(material)) {
        materialesEmisivos.push(material);
        material.emissiveIntensity = !esDeDia ? 5.0 : 0.0;
    }
}

// Instanciar las luces en la escena
export function inicializarLighting(scene) {
    // Luz ambiental inicial
    ambientLight = new THREE.AmbientLight();
    ambientLight.color.setRGB(0.90, 0.92, 0.98);
    ambientLight.intensity = 0.35;
    scene.add(ambientLight);

    // Luz direccional inicial
    directionalLight = new THREE.DirectionalLight();
    directionalLight.color.setRGB(1.0, 0.95, 0.85);
    directionalLight.intensity = 1.2;
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;

    // Configuracion de cámara de sombras
    directionalLight.shadow.camera.left = -80;
    directionalLight.shadow.camera.right = 80;
    directionalLight.shadow.camera.top = 80;
    directionalLight.shadow.camera.bottom = -80;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 150;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;

    // Limitar resolución de sombras en móviles
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    directionalLight.shadow.mapSize.width = esMovil ? 256 : 1024;
    directionalLight.shadow.mapSize.height = esMovil ? 256 : 1024;

    scene.add(directionalLight);
    scene.add(directionalLight.target); 

    // Inicializar PointLights para farolas
    for (let i = 0; i < NUM_LUCES_POOL; i++) {
        const luz = new THREE.PointLight(0xFFC354, 0, 20, 0);
        luz.position.set(0, -100, 0);
        scene.add(luz);
        lucesPool.push(luz);
    }
}

// Función para actualizar panel de debug
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

function sanitizarColor(colorVal) {
    if (typeof colorVal === 'string') {
        let clean = colorVal.trim();
        if (clean.length === 6 && !clean.startsWith('#') && /^[0-9a-fA-F]{6}$/.test(clean)) {
            clean = '#' + clean;
        }
        return new THREE.Color(clean);
    }
    return new THREE.Color(colorVal !== undefined ? colorVal : 0xffaa00);
}

// Registrar una posición de farola con sus datos de iluminación
export function registrarPosicionFarola(posicion, datosJSON = {}) {
    posicionesFarolasGlobal.push({
        posicion: posicion.clone(),
        color: sanitizarColor(datosJSON.farolaColor),
        altura: datosJSON.farolaAltura !== undefined ? Number(datosJSON.farolaAltura) : 4.5,
        intensidad: datosJSON.farolaIntensidad !== undefined ? Number(datosJSON.farolaIntensidad) : 1.0,
        distancia: datosJSON.farolaDistancia !== undefined ? Number(datosJSON.farolaDistancia) : 25.0
    });
}

export function actualizarLucesFarolas(camara) {
    const factor = phongUniformsGlobales.uPointLightIntensityFactor.value;
    if (factor <= 0.0) {
        for (const luz of lucesPool) {
            luz.intensity = 0;
        }
        return;
    }

    // Se calculan distancias y se asignan las luces
    const { position: camaraPos } = camara;
    const distancias = posicionesFarolasGlobal.map((farola, idx) => ({
        idx,
        dist: camaraPos.distanceToSquared(farola.posicion)
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

    const uniformColor = [
        phongUniformsGlobales.uPointLightColor0,
        phongUniformsGlobales.uPointLightColor1,
        phongUniformsGlobales.uPointLightColor2,
        phongUniformsGlobales.uPointLightColor3,
        phongUniformsGlobales.uPointLightColor4,
        phongUniformsGlobales.uPointLightColor5
    ];

    const uniformIntensity = [
        phongUniformsGlobales.uPointLightIntensity0,
        phongUniformsGlobales.uPointLightIntensity1,
        phongUniformsGlobales.uPointLightIntensity2,
        phongUniformsGlobales.uPointLightIntensity3,
        phongUniformsGlobales.uPointLightIntensity4,
        phongUniformsGlobales.uPointLightIntensity5
    ];

    const uniformDistance = [
        phongUniformsGlobales.uPointLightDistance0,
        phongUniformsGlobales.uPointLightDistance1,
        phongUniformsGlobales.uPointLightDistance2,
        phongUniformsGlobales.uPointLightDistance3,
        phongUniformsGlobales.uPointLightDistance4,
        phongUniformsGlobales.uPointLightDistance5
    ];

    for (let i = 0; i < NUM_LUCES_POOL; i++) {
        if (i < distancias.length) {
            const farola = posicionesFarolasGlobal[distancias[i].idx];
            // Posición en espacio mundo con offset de altura
            tempVec.set(farola.posicion.x, farola.posicion.y + farola.altura, farola.posicion.z);
            tempVec.applyMatrix4(camara.matrixWorldInverse);
            uniformPos[i].value.copy(tempVec);

            uniformColor[i].value.copy(farola.color);
            uniformIntensity[i].value = farola.intensidad * factor;
            uniformDistance[i].value = farola.distancia;

            lucesPool[i].position.set(farola.posicion.x, farola.posicion.y + farola.altura, farola.posicion.z);
            lucesPool[i].color.copy(farola.color);
            lucesPool[i].intensity = farola.intensidad * factor;
            lucesPool[i].distance = farola.distancia;
        } else {
            uniformPos[i].value.set(0, -100, 0);
            uniformColor[i].value.setHex(0x000000);
            uniformIntensity[i].value = 0.0;
            uniformDistance[i].value = 0.0;

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
        r: esDeDiaTarget ? 1.0 : 0.25,
        g: esDeDiaTarget ? 0.95 : 0.30,
        b: esDeDiaTarget ? 0.85 : 0.45
    };
    const targetAmbientColor = {
        r: esDeDiaTarget ? 0.90 : 0.18,
        g: esDeDiaTarget ? 0.92 : 0.22,
        b: esDeDiaTarget ? 0.98 : 0.38
    };
    const targetSolIntensity = esDeDiaTarget ? 1.2 : 0.6;
    const targetAmbientIntensity = esDeDiaTarget ? 0.35 : 2.1;
    const targetSolPosition = { x: 10, y: 20, z: 10 };
    const targetShininess = 30.0;
    const targetSpecularIntensity = 0.0;
    const targetSkyboxOpacity = esDeDiaTarget ? 0.0 : 1.0;
    const targetEmissiveIntensity = esDeDiaTarget ? 0.0 : 1.0;

    // Animar Luz Ambiental
    gsap.to(ambientLight, {
        intensity: targetAmbientIntensity,
        duration: duracion,
        ease: ease,
        onComplete: refrescarGUI
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
    const targetPoolIntensityFactor = esDeDiaTarget ? 0.0 : 1.0;
    // Animar el uniform compartido del shader 
    gsap.killTweensOf(phongUniformsGlobales.uPointLightIntensityFactor);
    gsap.to(phongUniformsGlobales.uPointLightIntensityFactor, {
        value: targetPoolIntensityFactor,
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

export function alternarDiaNoche(skybox) {
    alternarCicloDiaNoche(skybox);
    return { ambInt: ambientLight.intensity, dirInt: directionalLight.intensity };
}

export function alternarCicloDiaNoche(skybox) {
    esDeDia = !esDeDia;
    cambiarClimaSuave(esDeDia, skybox);
}

// Conectar sliders con las luces y controlar eventos de cambio de clima
export function configurarcontrolsLighting(skybox, renderizador, scene) {
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');
    const sombrasCheckbox = document.getElementById('sombras-checkbox');

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
            cerrarMenuSuperior(); 
        });
    }

    if (sombrasCheckbox && renderizador) {
        if (window.esMovil) {
            // Ocultar opcion de sombras en moviles
            const controlGrupo = sombrasCheckbox.closest('.control-grupo');
            if (controlGrupo) controlGrupo.style.display = 'none';
        } else {
            // Inicializar el checkbox según el estado actual del renderizador
            sombrasCheckbox.checked = renderizador.shadowMap.enabled;
            
            sombrasCheckbox.addEventListener('change', (e) => {
                renderizador.shadowMap.enabled = e.target.checked;
            });
        }
    }
}

// Bus de eventos para procesar iluminación
broker.on('modeloCargado', ({ modelo, datosJSON }) => {
    // Si es farola, registrar su posición para la iluminación por proximidad
    if (datosJSON.esFarola) {
        const posFarola = modelo.position.clone();
        registrarPosicionFarola(posFarola, datosJSON);
    }

    // Buscar y registrar materiales emisivos en el modelo cargado
    modelo.traverse((child) => {
        if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
                const { emissive } = mat;
                const tieneEmisivoOMap = mat.emissiveMap ||
                    (emissive && (emissive.r > 0 || emissive.g > 0 || emissive.b > 0));
                if (tieneEmisivoOMap) {
                    registrarMaterialEmisivo(mat);
                }
            });
        }
    });
});