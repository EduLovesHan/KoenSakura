import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import { broker } from './EventBroker.js';
import { registraranimations, registrarTexturaAgua } from './animations.js';
import { mallasSuelo, registrarBoxColision } from './collisions.js';
import vertexShader from '../shaders/phong.vert?raw';
import fragmentShader from '../shaders/phong.frag?raw';

export const aguasInstanciadas = [];

// Cargar la textura de normales del agua
const textureLoader = new THREE.TextureLoader();
const waterNormals = textureLoader.load('assets/textures/others/waternormals3.webp', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

// Uniforms globales para el shader Phong que se aplica solo a mallas estaticas
// Mallas con esqueletos y mallas de agua conservan el material estandar y se iluminan con luces nativas de treejs

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
    // Point Lights de las farolas, compartidos por todos los materiales
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
    // Extraer textura y color originales del material GLTF
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

    // Si el original tiene alphaTest configurado
    const alphaTestOriginal = alphaTest !== undefined && alphaTest > 0
        ? alphaTest
        : (esTransparente ? 0.05 : 0.0);

    const depthWriteOriginal = depthWrite !== undefined
        ? depthWrite
        : true;

    const blendingOriginal = blending !== undefined
        ? blending
        : THREE.NormalBlending;

    // Crear una instancia nueva de ShaderMaterial
    const nuevoMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: esTransparente,
        alphaTest: alphaTestOriginal,
        depthWrite: depthWriteOriginal,
        blending: blendingOriginal,
        uniforms: {
            // Globales compartidos por referencia
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
            // Cada malla tiene su propia textura y color
            uMap: { value: texturaOriginal },
            uHasTexture: { value: texturaOriginal ? 1.0 : 0.0 },
            uBaseColor: { value: colorOriginal },
            uOpacity: { value: opacidadOriginal },
            uAlphaTest: { value: alphaTestOriginal }
        }
    });

    return nuevoMaterial;
}

function aplicarMaterialPhong(model) {
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
        if (child.isSkinnedMesh) return;
        const nombreLower = child.name.toLowerCase();
        if (nombreLower.includes('agua')) return;
        if (nombreLower.includes('caja_colision')) return;

        if (nombreLower.includes('muñeca') || nombreLower.includes('muneca')) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.transparent = true;
                mat.alphaTest = mat.alphaTest > 0 ? mat.alphaTest : 0.5;
                mat.side = THREE.DoubleSide;
            });
            return;
        }

        // Omitir mallas con materiales emisivos
        const materialesOriginales = Array.isArray(child.material)
            ? child.material
            : [child.material];

        const tieneEmisivo = materialesOriginales.some(
            mat => mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)
        );
        if (tieneEmisivo) return;

        // Crear material Phong individual para cada material original ──
        if (Array.isArray(child.material)) {
            // Multi-material: crear un ShaderMaterial por cada sub-material
            child.material = child.material.map(mat => crearMaterialPhong(mat));
        } else {
            // Material único: crear un ShaderMaterial nuevo con su textura preservada
            child.material = crearMaterialPhong(child.material);
        }
    });
}


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
        const respuesta = await fetch('assets/objectMap.json');
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el archivo de configuración. Status: ${respuesta.status}`);
        }
        const configuracion = await respuesta.json();

        // Contar el total de instancias de todos los models
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

                // Iterar cada instancia del modelo
                for (const instancia of item.instancias) {
                    //  se usa SkeletonUtils.clone() para models con bones
                    const clon = usarSkeletonUtils
                        ? SkeletonUtils.clone(modeloBase)
                        : modeloBase.clone();

                    // Aplicar culling y sombras de manera óptima
                    clon.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) {
                                child.geometry.computeBoundingBox();
                                child.geometry.computeBoundingSphere();
                            }
                            child.frustumCulled = true;

                            // Optimización de Back-Face Culling 
                            const nombreHijo = child.name.toLowerCase();
                            const esPlanoSinGrosor = nombreHijo.includes('sakura') || 
                                                     nombreHijo.includes('hoja') || 
                                                     nombreHijo.includes('leaf') || 
                                                     nombreHijo.includes('leaves') || 
                                                     nombreHijo.includes('follaje') || 
                                                     nombreHijo.includes('muñeca') || 
                                                     nombreHijo.includes('muneca') ||
                                                     nombreHijo.includes('flor') ||
                                                     nombreHijo.includes('petalo') ||
                                                     nombreHijo.includes('agua');

                            if (child.material) {
                                const subMateriales = Array.isArray(child.material) ? child.material : [child.material];
                                subMateriales.forEach(mat => {
                                    if (mat) {
                                        mat.side = esPlanoSinGrosor ? THREE.DoubleSide : THREE.FrontSide;
                                    }
                                });
                            }

                            // Configurar sombras óptimas
                            const esCriticoParaSombras = nombreHijo.includes('jugador') || 
                                                         nombreHijo.includes('player') || 
                                                         nombreHijo.includes('estatua') || 
                                                         nombreHijo.includes('torii') || 
                                                         nombreHijo.includes('puente');
                                                         
                            child.castShadow = esCriticoParaSombras;
                            child.receiveShadow = !esCriticoParaSombras; // Suelo, farolas lejanas y paredes solo reciben o no proyectan
                        }
                    });

                    // Detectar si se procesa el modelo de colisiones
                    const esModeloCollisions = item.archivo.toLowerCase().includes('collisions') || item.archivo.toLowerCase().includes('colisiones');

                    if (esModeloCollisions) {
                        // Lógica para models de collisions
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

                            // Instanciar THREE.Water con la geometría original y target de reflejos optimizado
                            const water = new Water(
                                hijo.geometry,
                                {
                                    textureWidth: window.esMovil ? 64 : 128,
                                    textureHeight: window.esMovil ? 64 : 128,
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

                    //  Aplicar shader Phong solo a mallas estáticas
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
                    if (item.tieneanimations && gltf.animations && gltf.animations.length > 0) {
                        registraranimations(clon, gltf.animations);
                    }

                    // Incrementar el contador e informar al LoadingManager de la tarea completada
                    contadorInstancias++;
                    if (loadingManager) {
                        loadingManager.itemEnd(`instancia_${contadorInstancias}`);
                    }

                    // Ceder control al navegador de forma diferida (Lotes)
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