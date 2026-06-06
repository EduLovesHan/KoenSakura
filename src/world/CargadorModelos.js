import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { procesarColisiones } from './colisiones.js';
import { registrarObjetoInteractivo } from '../player/interacciones.js';
import { registrarAnimaciones, registrarTexturaAgua } from './animaciones.js';
import { registrarMaterialEmisivo, registrarPosicionFarola } from './iluminacion.js';
import vertexShader from '../shaders/phong.vert?raw';
import fragmentShader from '../shaders/phong.frag?raw';

export const phongUniformsGlobales = {
    uAmbientColor: { value: new THREE.Color().setRGB((0xd8 + 0.001) / 255, (0xe2 + 0.001) / 255, (0xf0 + 0.001) / 255) },
    uAmbientIntensity: { value: 0.6 },
    uLightColor: { value: new THREE.Color().setRGB(1.0, (0xf5 + 0.001) / 255, (0xe6 + 0.001) / 255) },
    uLightIntensity: { value: 1.5 },
    uLightPosition: { value: new THREE.Vector3(10, 20, 10) },
    uSpecularColor: { value: new THREE.Color(0xffffff) },
    uSpecularIntensity: { value: 0.0 },
    uShininess: { value: 30.0 },
    uCameraPosition: { value: new THREE.Vector3() },
    // Point Lights del Pool (farolas) — compartidos por todos los materiales
    uPointLightPos0: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos1: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos2: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos3: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos4: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos5: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightColor: { value: new THREE.Color(0xffaa00) },
    uPointLightIntensity: { value: 0.0 },
    uPointLightDistance: { value: 20.0 }
};

function crearMaterialPhong(mesh) {
    const originalMaterial = mesh.material;
    const map = originalMaterial.map || null;
    const baseColor = originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xffffff);

    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uAmbientColor: phongUniformsGlobales.uAmbientColor,
            uAmbientIntensity: phongUniformsGlobales.uAmbientIntensity,
            uLightColor: phongUniformsGlobales.uLightColor,
            uLightIntensity: phongUniformsGlobales.uLightIntensity,
            uLightPosition: phongUniformsGlobales.uLightPosition,
            uSpecularColor: phongUniformsGlobales.uSpecularColor,
            uSpecularIntensity: phongUniformsGlobales.uSpecularIntensity,
            uShininess: phongUniformsGlobales.uShininess,
            uCameraPosition: phongUniformsGlobales.uCameraPosition,
            uPointLightPos0: phongUniformsGlobales.uPointLightPos0,
            uPointLightPos1: phongUniformsGlobales.uPointLightPos1,
            uPointLightPos2: phongUniformsGlobales.uPointLightPos2,
            uPointLightPos3: phongUniformsGlobales.uPointLightPos3,
            uPointLightPos4: phongUniformsGlobales.uPointLightPos4,
            uPointLightPos5: phongUniformsGlobales.uPointLightPos5,
            uPointLightColor: phongUniformsGlobales.uPointLightColor,
            uPointLightIntensity: phongUniformsGlobales.uPointLightIntensity,
            uPointLightDistance: phongUniformsGlobales.uPointLightDistance,
            uMap: { value: map },
            uHasTexture: { value: map ? 1.0 : 0.0 },
            uBaseColor: { value: baseColor }
        }
    });
}

function aplicarMaterialPhong(model) {
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            if (child.name.toLowerCase().includes('caja_colision')) return;
            
            // Omitir mallas con materiales emisivos (luz propia, ej. farolas)
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            const tieneEmisivo = mats.some(mat => mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0));
            if (tieneEmisivo) return;

            child.material = crearMaterialPhong(child);
        }
    });
}

export async function cargarEscenario(scene, objetosColision) {
    const loader = new GLTFLoader();

    try {
        const respuesta = await fetch('assets/mapaObjetos.json');
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el archivo de configuración. Status: ${respuesta.status}`);
        }
        const configuracion = await respuesta.json();

        for (const item of configuracion) {
            try {
                // Cargar el modelo base usando loadAsync
                const gltf = await loader.loadAsync(item.archivo);
                const modeloBase = gltf.scene;

                // Buscar y registrar materiales emisivos en el modelo base antes de clonar
                modeloBase.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            if (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
                                registrarMaterialEmisivo(mat);
                            }
                        });
                    }
                });

                // Aplicar el material Phong personalizado al modelo base
                aplicarMaterialPhong(modeloBase);

                // Iterar cada instancia del modelo
                for (const instancia of item.instancias) {
                    const clon = modeloBase.clone();

                    // Posición
                    if (instancia.posicion) {
                        clon.position.set(instancia.posicion[0], instancia.posicion[1], instancia.posicion[2]);
                    }

                    // Rotación
                    if (instancia.rotacion) {
                        clon.rotation.set(instancia.rotacion[0], instancia.rotacion[1], instancia.rotacion[2]);
                    } else if (instancia.rotacionY !== undefined) {
                        clon.rotation.y = instancia.rotacionY;
                    }

                    // Escala
                    if (instancia.escala) {
                        if (Array.isArray(instancia.escala)) {
                            clon.scale.set(instancia.escala[0], instancia.escala[1], instancia.escala[2]);
                        } else {
                            clon.scale.setScalar(instancia.escala);
                        }
                    }

                    // Añadir clon a la escena
                    scene.add(clon);

                    // Colisiones (caja exacta)
                    procesarColisiones(clon, scene, objetosColision);

                    // Si es farola, registrar su posición para el pool de iluminación por proximidad
                    if (item.esFarola) {
                        const posFarola = clon.position.clone();
                        registrarPosicionFarola(posFarola);
                    }

                    // Si tiene agua, detectar y registrar texturas
                    if (item.tieneAgua) {
                        clon.traverse((hijo) => {
                            const nombre = hijo.name.toLowerCase();
                            if (hijo.isMesh && nombre.includes('agua1')) {
                                hijo.material.transparent = true;
                                hijo.material.opacity = 0.6;

                                const textura = hijo.material.normalMap || hijo.material.map;
                                if (textura) {
                                    registrarTexturaAgua(textura);
                                }
                            }
                        });
                    }

                    // Si tiene animaciones, arrancar el AnimationMixer
                    if (item.tieneAnimaciones && gltf.animations && gltf.animations.length > 0) {
                        registrarAnimaciones(clon, gltf.animations);
                    }

                    // Si es interactivo
                    if (instancia.interactivo) {
                        registrarObjetoInteractivo(
                            clon,
                            instancia.interactivo.distancia || 8,
                            instancia.interactivo.titulo || "Interactuable",
                            instancia.interactivo.texto || ""
                        );
                    }
                }

                console.log(`Modelo ${item.archivo} cargado y configurado con éxito (${item.instancias.length} instancias)`);
            } catch (err) {
                console.error(`Error al procesar el modelo ${item.archivo}:`, err);
            }
        }
    } catch (error) {
        console.error("Error al cargar el mapa de objetos desde el JSON:", error);
    }
}
