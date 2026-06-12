import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import { broker } from './EventBroker.js';
import { registrarAnimaciones, registrarTexturaAgua } from './animaciones.js';
import { mallasSuelo, registrarBoxColision } from './colisiones.js';
import vertexShader from '../shaders/phong.vert?raw';
import fragmentShader from '../shaders/phong.frag?raw';

export const aguasInstanciadas = [];

// Cargar la textura de normales del agua
const textureLoader = new THREE.TextureLoader();
const waterNormals = textureLoader.load('assets/texturas/waternormals3.webp', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

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
    const {
        map: texturaOriginal = null,
        color,
        opacity: opacidadOriginal = 1.0,
        transparent,
        alphaTest,
        depthWrite,
        blending
    } = originalMaterial;

    const colorOriginal = color
        ? color.clone()
        : new THREE.Color(0xffffff);

    // Si la opacidad es < 1 o el material original ya era transparente
    const esTransparente = transparent || opacidadOriginal < 1.0;

    // Si el original tiene alphaTest configurado, o usamos un fallback minúsculo si es transparente
    const alphaTestOriginal = alphaTest !== undefined && alphaTest > 0
        ? alphaTest
        : (esTransparente ? 0.05 : 0.0);

    const depthWriteOriginal = depthWrite !== undefined
        ? depthWrite
        : true;

    const blendingOriginal = blending !== undefined
        ? blending
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
 *   - Modelo 'muñeca' → conserva material GLTF original para transparencias alpha
 */

function aplicarMaterialPhong(model) {
    // ── EXCLUIR modelo completo si es la muñeca ──
    // Conserva su MeshStandardMaterial original para que las texturas
    // con canal alpha (pelo, ropa, accesorios) se rendericen correctamente.
    const nombreModelo = (model.name || '').toLowerCase();
    const esModeloExcluido = nombreModelo.includes('muñeca') || nombreModelo.includes('muneca');

    if (esModeloExcluido) {
        // Asegurar que el material original tenga transparencia configurada
        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.transparent = true;
                mat.alphaTest = mat.alphaTest > 0 ? mat.alphaTest : 0.5;
                mat.side = THREE.DoubleSide;
            });
        });
        return;
    }

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

        // ── EXCLUIR mallas de muñeca por nombre de malla individual ──
        if (nombreLower.includes('muñeca') || nombreLower.includes('muneca')) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.transparent = true;
                mat.alphaTest = mat.alphaTest > 0 ? mat.alphaTest : 0.5;
                mat.side = THREE.DoubleSide;
            });
            return;
        }

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

const BATCH_SIZE = 5;

const esperarSiguienteTick = () => {
    if (typeof requestIdleCallback === 'function') {
        return new Promise((resolve) => requestIdleCallback(() => resolve()));
    } else {
        return new Promise((resolve) => setTimeout(resolve, 0));
    }
};

export async function cargarEscenario(scene, objetosColision, loadingManager = null) {
    const loader = loadingManager ? new GLTFLoader(loadingManager) : new GLTFLoader();

    loader.setMeshoptDecoder(MeshoptDecoder);

    // Resetear aguas instanciadas
    aguasInstanciadas.length = 0;

    try {
        const respuesta = await fetch('assets/mapaObjetos.json');
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el archivo de configuración. Status: ${respuesta.status}`);
        }
        const configuracion = await respuesta.json();

        // Contar el total de instancias de todos los modelos
        let totalInstancias = 0;
        for (const item of configuracion) {
            totalInstancias += item.instancias.length;
        }

        // Registrar anticipadamente todas las instancias en el LoadingManager
        if (loadingManager) {
            for (let i = 1; i <= totalInstancias; i++) {
                loadingManager.itemStart(`instancia_${i}`);
            }
        }

        let contadorInstancias = 0;

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

                // (La búsqueda de materiales emisivos se ha delegado a la suscripción del módulo de iluminación)

                // Iterar cada instancia del modelo
                for (const instancia of item.instancias) {
                    //  Clonación: SkeletonUtils.clone() para modelos con bones
                    const clon = usarSkeletonUtils
                        ? SkeletonUtils.clone(modeloBase)
                        : modeloBase.clone();

                    // Detectar si se procesa el modelo de colisiones
                    const esModeloColisiones = item.archivo.toLowerCase().includes('colisiones');

                    if (esModeloColisiones) {
                        // Lógica para modelos de colisiones
                        const { posicion, rotacion, rotacionY, escala } = instancia;

                        if (posicion) clon.position.set(posicion[0], posicion[1], posicion[2]);
                        if (rotacion) clon.rotation.set(rotacion[0], rotacion[1], rotacion[2]);
                        else if (rotacionY !== undefined) clon.rotation.y = rotacionY;

                        if (escala) {
                            if (Array.isArray(escala)) clon.scale.set(escala[0], escala[1], escala[2]);
                            else clon.scale.setScalar(escala);
                        }

                        scene.add(clon);

                        // Actualizar matrices del mundo para calcular el Box3 correctamente
                        clon.updateMatrixWorld(true);

                        clon.traverse((hijo) => {
                            if (hijo.isMesh) {
                                const nombreLower = hijo.name.toLowerCase();
                                if (nombreLower.includes('colision')) {
                                    if (hijo.material) {
                                        hijo.material.visible = false;
                                    }

                                    objetosColision.push(hijo);

                                    if (nombreLower.includes('suelo') || nombreLower.includes('rampa') || nombreLower.includes('escalera') || nombreLower.includes('piso')) {
                                        mallasSuelo.push(hijo);
                                    } else {
                                        const box = new THREE.Box3().setFromObject(hijo);
                                        registrarBoxColision(box);
                                    }
                                }
                            }
                        });
                        contadorInstancias++;
                        if (loadingManager) {
                            loadingManager.itemEnd(`instancia_${contadorInstancias}`);
                        }
                        if (contadorInstancias % BATCH_SIZE === 0) {
                            await esperarSiguienteTick();
                        }
                        continue;
                    }

                    //  Registrar texturas de agua ANTES de aplicar el shader
                    //  Registrar y reemplazar mallas de agua por THREE.Water
                    if (item.tieneAgua) {
                        const mallasAguaParaReemplazar = [];
                        clon.traverse((hijo) => {
                            const nombre = hijo.name.toLowerCase();
                            if (hijo.isMesh && nombre.includes('agua')) {
                                mallasAguaParaReemplazar.push(hijo);
                            }
                        });

                        mallasAguaParaReemplazar.forEach((hijo) => {
                            const textura = hijo.material.normalMap || hijo.material.map;
                            if (textura) {
                                registrarTexturaAgua(textura);
                                console.log('[Agua] Textura registrada desde:', hijo.name);
                            }

                            // Instanciar THREE.Water con la geometría original
                            const water = new Water(
                                hijo.geometry,
                                {
                                    textureWidth: 256,
                                    textureHeight: 256,
                                    //clipBias: 0.003,
                                    waterNormals: waterNormals,
                                    sunDirection: new THREE.Vector3(10, 20, 10).normalize(),
                                    sunColor: 0xffffff,
                                    waterColor: 0x001e0f,
                                    distortionScale: 3.7,
                                    fog: scene.fog !== undefined
                                }
                            );

                            // Copiar transformaciones locales
                            water.position.copy(hijo.position);
                            water.rotation.copy(hijo.rotation);
                            water.scale.copy(hijo.scale);
                            water.name = hijo.name;

                            // Reemplazar la malla original en la jerarquía del clon
                            const parent = hijo.parent;
                            if (parent) {
                                parent.remove(hijo);
                                parent.add(water);
                            }

                            // Guardar en array global para animar
                            aguasInstanciadas.push(water);
                        });
                    }

                    //  Aplicar shader Phong SOLO a mallas estáticas
                    aplicarMaterialPhong(clon);

                    const { posicion, rotacion, rotacionY, escala } = instancia;

                    // Posición
                    if (posicion) {
                        clon.position.set(posicion[0], posicion[1], posicion[2]);
                    }

                    // Rotación
                    if (rotacion) {
                        clon.rotation.set(rotacion[0], rotacion[1], rotacion[2]);
                    } else if (rotacionY !== undefined) {
                        clon.rotation.y = rotacionY;
                    }

                    // Escala
                    if (escala) {
                        if (Array.isArray(escala)) {
                            clon.scale.set(escala[0], escala[1], escala[2]);
                        } else {
                            clon.scale.setScalar(escala);
                        }
                    }

                    // Añadir clon a la escena
                    scene.add(clon);

                    // Etiquetar para generación automática de hitbox, excepto el entorno base (plazaPrincipal)
                    if (!item.archivo.toLowerCase().includes('plazaprincipal')) {
                        clon.userData.generarHitboxAutomata = true;
                    }

                    // Emitir evento para desacoplar colisiones, iluminación por farolas e interacciones
                    const datosJSON = { ...item, ...instancia };
                    delete datosJSON.instancias;

                    broker.emit('modeloCargado', {
                        modelo: clon,
                        datosJSON,
                        scene,
                        objetosColision
                    });

                    // Si tiene animaciones, arrancar el AnimationMixer
                    if (item.tieneAnimaciones && gltf.animations && gltf.animations.length > 0) {
                        registrarAnimaciones(clon, gltf.animations);
                    }

                    // Incrementar el contador e informar al LoadingManager de la tarea completada
                    contadorInstancias++;
                    if (loadingManager) {
                        loadingManager.itemEnd(`instancia_${contadorInstancias}`);
                    }

                    // Ceder control al navegador de forma diferida (Lotes/Batching)
                    if (contadorInstancias % BATCH_SIZE === 0) {
                        await esperarSiguienteTick();
                    }
                }

                console.log(`Modelo ${item.archivo} cargado y configurado con éxito (${item.instancias.length} instancias)`);
            } catch (err) {
                console.error(`Error al procesar el modelo ${item.archivo}:`, err);
                // En caso de error, liberar las tareas del LoadingManager para este lote de instancias pendientes
                if (loadingManager) {
                    for (let i = 0; i < item.instancias.length; i++) {
                        contadorInstancias++;
                        loadingManager.itemEnd(`instancia_${contadorInstancias}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error al cargar el mapa de objetos desde el JSON:", error);
    }
}
