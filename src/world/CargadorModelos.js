import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { procesarColisiones } from './colisiones.js';
import { registrarObjetoInteractivo } from '../player/interacciones.js';
import { registrarAnimaciones, registrarTexturaAgua } from './animaciones.js';
import { registrarMaterialEmisivo, registrarPosicionFarola } from './iluminacion.js';
import vertexShader from '../shaders/phong.vert?raw';
import fragmentShader from '../shaders/phong.frag?raw';

// ══════════════════════════════════════════════════════════════════
// Uniforms globales para el shader Phong custom.
// Se aplica SOLO a mallas estáticas (Mesh).
// SkinnedMesh (peces) y mallas de agua conservan su MeshStandardMaterial
// original del GLB y se iluminan con las luces nativas de Three.js.
// ══════════════════════════════════════════════════════════════════

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

function crearMaterialPhong(originalMaterial) {
    // ── Extraer textura y color originales del material GLTF ──
    const texturaOriginal = originalMaterial.map || null;
    const colorOriginal = originalMaterial.color
        ? originalMaterial.color.clone()
        : new THREE.Color(0xffffff);
    const opacidadOriginal = originalMaterial.opacity !== undefined
        ? originalMaterial.opacity
        : 1.0;

    // Si la opacidad es < 1 o el material original ya era transparente
    const esTransparente = originalMaterial.transparent || opacidadOriginal < 1.0;

    // Si el original tiene alphaTest configurado, o usamos un fallback minúsculo si es transparente
    const alphaTestOriginal = originalMaterial.alphaTest !== undefined && originalMaterial.alphaTest > 0
        ? originalMaterial.alphaTest
        : (esTransparente ? 0.05 : 0.0);

    const depthWriteOriginal = originalMaterial.depthWrite !== undefined
        ? originalMaterial.depthWrite
        : true;

    const blendingOriginal = originalMaterial.blending !== undefined
        ? originalMaterial.blending
        : THREE.NormalBlending;

    // ── Crear una instancia NUEVA de ShaderMaterial (nunca compartida) ──
    const nuevoMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: esTransparente,
        alphaTest: alphaTestOriginal,
        depthWrite: depthWriteOriginal,
        blending: blendingOriginal,
        uniforms: {
            // Globales compartidos por referencia (modificar uno los modifica todos — intencional)
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
            // Per-mesh: cada malla tiene su propia textura y color
            uMap: { value: texturaOriginal },
            uHasTexture: { value: texturaOriginal ? 1.0 : 0.0 },
            uBaseColor: { value: colorOriginal },
            uOpacity: { value: opacidadOriginal },
            uAlphaTest: { value: alphaTestOriginal }
        }
    });

    return nuevoMaterial;
}

/**
 * Aplica el shader Phong SOLO a mallas estáticas (Mesh).
 * Excluye:
 *   - SkinnedMesh → conservan material para animación
 *   - Mallas cuyo nombre contiene 'agua' → conservan material para transparencia/UV
 *   - Mallas con materiales emisivos → tienen luz propia
 *   - Cajas de colisión
 */
function aplicarMaterialPhong(model) {
    model.traverse((child) => {
        if (!child.isMesh || !child.material) return;

        // ── EXCLUIR SkinnedMesh (peces con bones) ──
        // Conservan su MeshStandardMaterial original para que las animaciones
        // de bones funcionen correctamente. Se iluminan con las luces nativas
        // de Three.js (AmbientLight, DirectionalLight, PointLight).
        if (child.isSkinnedMesh) return;

        // ── EXCLUIR mallas de agua ──
        // Conservan su material original para la transparencia y animación UV.
        const nombreLower = child.name.toLowerCase();
        if (nombreLower.includes('agua')) return;

        // No tocar las cajas de colisión
        if (nombreLower.includes('caja_colision')) return;

        // Omitir mallas con materiales emisivos (luz propia, ej. farolas)
        const materialesOriginales = Array.isArray(child.material)
            ? child.material
            : [child.material];

        const tieneEmisivo = materialesOriginales.some(
            mat => mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)
        );
        if (tieneEmisivo) return;

        // ── Crear material Phong individual para cada material original ──
        if (Array.isArray(child.material)) {
            // Multi-material: crear un ShaderMaterial por cada sub-material
            child.material = child.material.map(mat => crearMaterialPhong(mat));
        } else {
            // Material único: crear un ShaderMaterial nuevo con su textura/color preservados
            child.material = crearMaterialPhong(child.material);
        }
    });
}

/**
 * Detecta si un modelo contiene SkinnedMesh (mallas con esqueleto/bones).
 * Se usa para decidir si clonar con SkeletonUtils.clone() o con clone() normal.
 */
function tieneSkinnedMesh(model) {
    let encontrado = false;
    model.traverse((child) => {
        if (child.isSkinnedMesh) encontrado = true;
    });
    return encontrado;
}

export async function cargarEscenario(scene, objetosColision, loadingManager = null) {
    const loader = loadingManager ? new GLTFLoader(loadingManager) : new GLTFLoader();

    try {
        const respuesta = await fetch('assets/mapaObjetos.json');
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el archivo de configuración. Status: ${respuesta.status}`);
        }
        const configuracion = await respuesta.json();

        for (const item of configuracion) {
            try {
                // Cargar el modelo base
                const gltf = await loader.loadAsync(item.archivo);
                const modeloBase = gltf.scene;
                modeloBase.name = item.archivo;

                // Detectar si el modelo tiene SkinnedMesh
                const usarSkeletonUtils = tieneSkinnedMesh(modeloBase);
                if (usarSkeletonUtils) {
                    console.log(`[SkeletonUtils] Modelo ${item.archivo} contiene SkinnedMesh — se usará SkeletonUtils.clone()`);
                }

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

                // Iterar cada instancia del modelo
                for (const instancia of item.instancias) {
                    //  Clonación: SkeletonUtils.clone() para modelos con bones
                    // Object3D.clone() NO clona correctamente SkinnedMesh: el clon
                    // mantiene referencia al esqueleto original, rompiendo la animación.
                    // SkeletonUtils.clone() clona esqueleto, bones y bindings correctamente.
                    const clon = usarSkeletonUtils
                        ? SkeletonUtils.clone(modeloBase)
                        : modeloBase.clone();

                    //  Registrar texturas de agua ANTES de aplicar el shader
                    // aplicarMaterialPhong reemplaza materiales GLTF → las texturas
                    // (normalMap/map) se perderían si se leen después.
                    if (item.tieneAgua) {
                        clon.traverse((hijo) => {
                            const nombre = hijo.name.toLowerCase();
                            if (hijo.isMesh && nombre.includes('agua')) {
                                const textura = hijo.material.normalMap || hijo.material.map;
                                if (textura) {
                                    registrarTexturaAgua(textura);
                                    console.log('[Agua] Textura registrada desde:', hijo.name);
                                }
                                // Configurar transparencia del agua sobre el material GLTF original
                                hijo.material.transparent = true;
                                hijo.material.opacity = 0.6;
                                hijo.material.depthWrite = false;
                            }
                        });
                    }

                    //  Aplicar shader Phong SOLO a mallas estáticas
                    // SkinnedMesh (peces) y agua se excluyen automáticamente
                    // dentro de aplicarMaterialPhong().
                    aplicarMaterialPhong(clon);

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

                    // Etiquetar para generación automática de hitbox, excepto el entorno base (plazaPrincipal)
                    if (!item.archivo.toLowerCase().includes('plazaprincipal')) {
                        clon.userData.generarHitboxAutomata = true;
                    }

                    // Colisiones (caja exacta, con soporte de hitboxManual y shrinkFactor del JSON)
                    procesarColisiones(clon, scene, objetosColision, item);

                    // Si es farola, registrar su posición para el pool de iluminación por proximidad
                    if (item.esFarola) {
                        const posFarola = clon.position.clone();
                        registrarPosicionFarola(posFarola);
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
