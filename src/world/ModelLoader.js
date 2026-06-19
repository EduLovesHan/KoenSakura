import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import { broker } from './EventBroker.js';
import { registraranimations, registrarTexturaAgua } from './animations.js';
import { mallasSuelo, registrarBoxColision } from './collisions.js';

export const aguasInstanciadas = [];

// Cargar la textura de normales del agua
const textureLoader = new THREE.TextureLoader();
const waterNormals = textureLoader.load('assets/textures/others/waternormals3.webp', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

export const phongUniformsGlobales = {
    // Point Lights de las farolas, compartidos por todos los materiales
    uPointLightPos0: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos1: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos2: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos3: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos4: { value: new THREE.Vector3(0, -100, 0) },
    uPointLightPos5: { value: new THREE.Vector3(0, -100, 0) },

    uPointLightColor0: { value: new THREE.Color(0xffaa00) },
    uPointLightColor1: { value: new THREE.Color(0xffaa00) },
    uPointLightColor2: { value: new THREE.Color(0xffaa00) },
    uPointLightColor3: { value: new THREE.Color(0xffaa00) },
    uPointLightColor4: { value: new THREE.Color(0xffaa00) },
    uPointLightColor5: { value: new THREE.Color(0xffaa00) },

    uPointLightIntensity0: { value: 0.0 },
    uPointLightIntensity1: { value: 0.0 },
    uPointLightIntensity2: { value: 0.0 },
    uPointLightIntensity3: { value: 0.0 },
    uPointLightIntensity4: { value: 0.0 },
    uPointLightIntensity5: { value: 0.0 },

    uPointLightDistance0: { value: 20.0 },
    uPointLightDistance1: { value: 20.0 },
    uPointLightDistance2: { value: 20.0 },
    uPointLightDistance3: { value: 20.0 },
    uPointLightDistance4: { value: 20.0 },
    uPointLightDistance5: { value: 20.0 },

    uPointLightIntensityFactor: { value: 0.0 },

    uShininess: { value: 30.0 },
    uSpecularIntensity: { value: 0.0 }
};

const FAROLAS_GLSL_DECLARATIONS = /* glsl */`
// Farolas
uniform vec3 uPointLightPos0;
uniform vec3 uPointLightPos1;
uniform vec3 uPointLightPos2;
uniform vec3 uPointLightPos3;
uniform vec3 uPointLightPos4;
uniform vec3 uPointLightPos5;

uniform vec3 uPointLightColor0;
uniform vec3 uPointLightColor1;
uniform vec3 uPointLightColor2;
uniform vec3 uPointLightColor3;
uniform vec3 uPointLightColor4;
uniform vec3 uPointLightColor5;

uniform float uPointLightIntensity0;
uniform float uPointLightIntensity1;
uniform float uPointLightIntensity2;
uniform float uPointLightIntensity3;
uniform float uPointLightIntensity4;
uniform float uPointLightIntensity5;

uniform float uPointLightDistance0;
uniform float uPointLightDistance1;
uniform float uPointLightDistance2;
uniform float uPointLightDistance3;
uniform float uPointLightDistance4;
uniform float uPointLightDistance5;

vec3 calcFarolaDiffuse(vec3 lightPosView, vec3 N, vec3 color, float intensity, float maxDist) {
    // vViewPosition en Three.js MeshPhong = -mvPosition.xyz (direcci\u00f3n al origen/c\u00e1mara)
    // Por tanto la posici\u00f3n real del fragmento en view-space = -vViewPosition
    // toLight = lightPos - fragPos = lightPos - (-vViewPosition) = lightPos + vViewPosition
    vec3 toLight = lightPosView + vViewPosition;
    float dist = length(toLight);
    if (dist > maxDist || maxDist <= 0.0) return vec3(0.0);
    vec3 L = toLight / dist;
    float diff = max(dot(N, L), 0.0);
    float atten = clamp(1.0 - dist / maxDist, 0.0, 1.0);
    atten *= atten;
    return color * intensity * diff * atten;
}
`;

const FAROLAS_GLSL_CONTRIBUTION = /* glsl */`
    {
        vec3 N_farolas = normalize( vNormal );
        vec3 farolasContrib = vec3(0.0);
        farolasContrib += calcFarolaDiffuse(uPointLightPos0, N_farolas, uPointLightColor0, uPointLightIntensity0, uPointLightDistance0);
        farolasContrib += calcFarolaDiffuse(uPointLightPos1, N_farolas, uPointLightColor1, uPointLightIntensity1, uPointLightDistance1);
        farolasContrib += calcFarolaDiffuse(uPointLightPos2, N_farolas, uPointLightColor2, uPointLightIntensity2, uPointLightDistance2);
        farolasContrib += calcFarolaDiffuse(uPointLightPos3, N_farolas, uPointLightColor3, uPointLightIntensity3, uPointLightDistance3);
        farolasContrib += calcFarolaDiffuse(uPointLightPos4, N_farolas, uPointLightColor4, uPointLightIntensity4, uPointLightDistance4);
        farolasContrib += calcFarolaDiffuse(uPointLightPos5, N_farolas, uPointLightColor5, uPointLightIntensity5, uPointLightDistance5);
        outgoingLight += farolasContrib * diffuseColor.rgb;
    }
`;

function construirUniformsFarolas() {
    return {
        uPointLightPos0: phongUniformsGlobales.uPointLightPos0,
        uPointLightPos1: phongUniformsGlobales.uPointLightPos1,
        uPointLightPos2: phongUniformsGlobales.uPointLightPos2,
        uPointLightPos3: phongUniformsGlobales.uPointLightPos3,
        uPointLightPos4: phongUniformsGlobales.uPointLightPos4,
        uPointLightPos5: phongUniformsGlobales.uPointLightPos5,

        uPointLightColor0: phongUniformsGlobales.uPointLightColor0,
        uPointLightColor1: phongUniformsGlobales.uPointLightColor1,
        uPointLightColor2: phongUniformsGlobales.uPointLightColor2,
        uPointLightColor3: phongUniformsGlobales.uPointLightColor3,
        uPointLightColor4: phongUniformsGlobales.uPointLightColor4,
        uPointLightColor5: phongUniformsGlobales.uPointLightColor5,

        uPointLightIntensity0: phongUniformsGlobales.uPointLightIntensity0,
        uPointLightIntensity1: phongUniformsGlobales.uPointLightIntensity1,
        uPointLightIntensity2: phongUniformsGlobales.uPointLightIntensity2,
        uPointLightIntensity3: phongUniformsGlobales.uPointLightIntensity3,
        uPointLightIntensity4: phongUniformsGlobales.uPointLightIntensity4,
        uPointLightIntensity5: phongUniformsGlobales.uPointLightIntensity5,

        uPointLightDistance0: phongUniformsGlobales.uPointLightDistance0,
        uPointLightDistance1: phongUniformsGlobales.uPointLightDistance1,
        uPointLightDistance2: phongUniformsGlobales.uPointLightDistance2,
        uPointLightDistance3: phongUniformsGlobales.uPointLightDistance3,
        uPointLightDistance4: phongUniformsGlobales.uPointLightDistance4,
        uPointLightDistance5: phongUniformsGlobales.uPointLightDistance5,
    };
}

function crearMaterialPhong(originalMaterial, nombreMalla = '', nombreModelo = '') {
    // Extraer propiedades del material GLTF
    const {
        map: texturaOriginal = null,
        color,
        opacity: opacidadOriginal = 1.0,
        transparent,
        alphaTest,
        depthWrite,
        blending,
        side,
    } = originalMaterial;

    const colorOriginal = color
        ? color.clone()
        : new THREE.Color(0xffffff);

    // Normalizar nombres para el filtro de contexto
    const nombreMallaLower = nombreMalla.toLowerCase();
    const nombreMatLower = (originalMaterial.name || '').toLowerCase();
    const nombreModeloLower = nombreModelo.toLowerCase();
    const contextoCompleto = nombreMallaLower + '_' + nombreMatLower + '_' + nombreModeloLower;

    // Detectar arquitectura sólida
    const esArquitecturaSolida = contextoCompleto.includes('casa') ||
        contextoCompleto.includes('casita') ||
        contextoCompleto.includes('tradicional') ||
        contextoCompleto.includes('pared') ||
        contextoCompleto.includes('wall') ||
        contextoCompleto.includes('techo') ||
        contextoCompleto.includes('roof') ||
        contextoCompleto.includes('ceiling') ||
        contextoCompleto.includes('columna') ||
        contextoCompleto.includes('column') ||
        contextoCompleto.includes('puerta') ||
        contextoCompleto.includes('door') ||
        contextoCompleto.includes('piso') ||
        contextoCompleto.includes('floor') ||
        contextoCompleto.includes('suelo') ||
        contextoCompleto.includes('museo') ||
        contextoCompleto.includes('plaza') ||
        contextoCompleto.includes('estructura') ||
        contextoCompleto.includes('building');

    // Detectar vidrio/transparencias
    const esVidrio = contextoCompleto.includes('cristal') ||
        contextoCompleto.includes('glass') ||
        contextoCompleto.includes('vidrio') ||
        contextoCompleto.includes('ventana') ||
        contextoCompleto.includes('window');

    // Detectar vegetación
    const esFolaje = contextoCompleto.includes('bamboo') ||
        contextoCompleto.includes('bambu') ||
        contextoCompleto.includes('bamb') ||
        contextoCompleto.includes('hoja') ||
        contextoCompleto.includes('leaf') ||
        contextoCompleto.includes('leaves') ||
        contextoCompleto.includes('follaje') ||
        contextoCompleto.includes('foliage') ||
        contextoCompleto.includes('arbusto') ||
        contextoCompleto.includes('bush') ||
        contextoCompleto.includes('copa') ||
        contextoCompleto.includes('crown') ||
        contextoCompleto.includes('grass') ||
        contextoCompleto.includes('hierba');

    const esPiso = contextoCompleto.includes('piso') ||
        contextoCompleto.includes('floor') ||
        contextoCompleto.includes('suelo') ||
        contextoCompleto.includes('ground') ||
        contextoCompleto.includes('plaza') ||
        contextoCompleto.includes('pavimento') ||
        contextoCompleto.includes('pavement') ||
        contextoCompleto.includes('tatami') ||
        contextoCompleto.includes('path') ||
        contextoCompleto.includes('camino');

    // Estados finales de renderizado
    let esTransparente = transparent || opacidadOriginal < 1.0;
    let depthWriteFinal = depthWrite !== undefined ? depthWrite : true;
    let sideFinal = side !== undefined ? side : THREE.FrontSide;
    let opacidadFinal = opacidadOriginal;

    // Forzar sólido en arquitectura
    if (esArquitecturaSolida && !esVidrio) {
        esTransparente = false;
        depthWriteFinal = true;
        sideFinal = THREE.DoubleSide;
        opacidadFinal = 1.0;
    }

    let alphaTestFinal = alphaTest !== undefined && alphaTest > 0
        ? alphaTest
        : (esTransparente ? 0.05 : 0.0);

    if (esFolaje && !esVidrio) {
        esTransparente = false;
        depthWriteFinal = true;
        sideFinal = THREE.DoubleSide;
        if (alphaTestFinal < 0.15) alphaTestFinal = 0.15;
    }

    const blendingFinal = blending !== undefined
        ? blending
        : THREE.NormalBlending;

    // MeshPhongMaterial
    const nuevoMaterial = new THREE.MeshPhongMaterial({
        color: colorOriginal,
        map: texturaOriginal,
        shininess: esPiso ? 2 : 30,
        specular: esPiso ? new THREE.Color(0x000000) : new THREE.Color(0x111111),
        transparent: esTransparente,
        alphaTest: alphaTestFinal,
        depthWrite: depthWriteFinal,
        depthTest: true,
        blending: blendingFinal,
        side: sideFinal,
        opacity: opacidadFinal,
    });

    // Farolas
    nuevoMaterial.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, construirUniformsFarolas());

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <lights_phong_pars_fragment>',
            '#include <lights_phong_pars_fragment>\n' + FAROLAS_GLSL_DECLARATIONS
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            FAROLAS_GLSL_CONTRIBUTION + '\n    #include <output_fragment>'
        );
    };

    // Distinguir variantes de compilación
    nuevoMaterial.customProgramCacheKey = () => {
        const t = nuevoMaterial.transparent ? 't' : 'o';
        const a = nuevoMaterial.alphaTest > 0 ? `a${nuevoMaterial.alphaTest.toFixed(2)}` : 'na';
        const s = nuevoMaterial.side;
        const m = nuevoMaterial.map ? 'map' : 'nomap';
        return `farolas_v1_${t}_${a}_${s}_${m}`;
    };

    return nuevoMaterial;
}

function aplicarMaterialPhong(model) {
    const nombreModelo = (model.name || '').toLowerCase();

    if (nombreModelo.includes('pezkoi') || nombreModelo.includes('koi') || nombreModelo.includes('pez')) {
        return;
    }

    const esModeloExcluido = nombreModelo.includes('muñeca') || nombreModelo.includes('muneca');

    if (esModeloExcluido) {
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

        // Omitir materiales emisivos
        const materialesOriginales = Array.isArray(child.material)
            ? child.material
            : [child.material];

        const tieneEmisivo = materialesOriginales.some(
            mat => mat.emissiveMap ||
                (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0))
        );
        if (tieneEmisivo) return;

        // MeshPhongMaterial con farolas
        if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => crearMaterialPhong(mat, child.name, model.name));
        } else {
            child.material = crearMaterialPhong(child.material, child.name, model.name);
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

                            // Culling
                            const nombreHijo = child.name.toLowerCase();
                            const nombreArchivo = item.archivo.toLowerCase();
                            const esPlanoSinGrosor = nombreHijo.includes('sakura') ||
                                /*nombreHijo.includes('hoja') ||
                                nombreHijo.includes('leaf') ||
                                nombreHijo.includes('leaves') ||*/
                                nombreHijo.includes('follaje') ||
                                nombreHijo.includes('muñeca') ||
                                nombreHijo.includes('muneca') ||
                                nombreHijo.includes('flor') ||
                                nombreHijo.includes('petalo') ||
                                nombreHijo.includes('agua') ||
                                nombreHijo.includes('museo') ||
                                nombreHijo.includes('pared') ||
                                nombreHijo.includes('wall') ||
                                nombreHijo.includes('techo') ||
                                nombreHijo.includes('roof') ||
                                nombreHijo.includes('ceiling') ||
                                nombreHijo.includes('columna') ||
                                nombreHijo.includes('column') ||
                                nombreHijo.includes('puerta') ||
                                nombreHijo.includes('door') ||
                                nombreHijo.includes('cristal') ||
                                nombreHijo.includes('glass') ||
                                nombreHijo.includes('vidrio') ||
                                nombreHijo.includes('marco') ||
                                nombreHijo.includes('ventana') ||
                                nombreHijo.includes('window') ||
                                nombreArchivo.includes('museo') ||
                                nombreHijo.includes('casa') ||
                                nombreHijo.includes('casita') ||
                                nombreHijo.includes('tradicional');

                            if (child.material) {
                                const subMateriales = Array.isArray(child.material) ? child.material : [child.material];
                                subMateriales.forEach(mat => {
                                    if (mat) {
                                        mat.side = esPlanoSinGrosor ? THREE.DoubleSide : THREE.FrontSide;

                                        // Identificar componentes sólidos de las casas/zonas tradicionales
                                        const esCasitaOPared = nombreHijo.includes('casa') ||
                                            nombreHijo.includes('casita') ||
                                            nombreHijo.includes('tradicional') ||
                                            nombreHijo.includes('pared') ||
                                            nombreHijo.includes('wall') ||
                                            nombreHijo.includes('techo') ||
                                            nombreHijo.includes('roof') ||
                                            nombreHijo.includes('ceiling') ||
                                            nombreHijo.includes('columna') ||
                                            nombreHijo.includes('column') ||
                                            nombreHijo.includes('puerta') ||
                                            nombreHijo.includes('door') ||
                                            nombreHijo.includes('piso') ||
                                            nombreHijo.includes('floor') ||
                                            nombreHijo.includes('suelo') ||
                                            nombreArchivo.includes('museo');

                                        // Mantener transparencias de ventanas/vidrios si existen
                                        const esVidrio = nombreHijo.includes('cristal') ||
                                            nombreHijo.includes('glass') ||
                                            nombreHijo.includes('vidrio') ||
                                            nombreHijo.includes('ventana') ||
                                            nombreHijo.includes('window');

                                        if (esCasitaOPared && !esVidrio) {
                                            mat.transparent = false;
                                            mat.depthWrite = true;
                                            mat.depthTest = true;
                                            mat.needsUpdate = true;
                                        }
                                    }
                                });
                            }

                            // Configurar sombras
                            const esCastShadow =
                                nombreHijo.includes('jugador') ||
                                nombreHijo.includes('player') ||
                                nombreHijo.includes('estatua') ||
                                nombreHijo.includes('torii') ||
                                nombreHijo.includes('puente') ||
                                nombreHijo.includes('arbol') ||
                                nombreHijo.includes('tree') ||
                                nombreHijo.includes('cerezo') ||
                                nombreHijo.includes('bonsai') ||
                                nombreHijo.includes('farola') ||
                                nombreHijo.includes('lampara') ||
                                nombreHijo.includes('lantern') ||
                                nombreHijo.includes('banca') ||
                                nombreHijo.includes('bench') ||
                                nombreHijo.includes('muro') ||
                                nombreHijo.includes('fence') ||
                                nombreHijo.includes('valla') ||
                                nombreHijo.includes('piedra') ||
                                nombreHijo.includes('stone') ||
                                nombreHijo.includes('roca') ||
                                nombreHijo.includes('rock') ||
                                nombreHijo.includes('columna') ||
                                nombreHijo.includes('column') ||
                                nombreArchivo.includes('torii') ||
                                nombreArchivo.includes('arbol') ||
                                nombreArchivo.includes('tree') ||
                                nombreArchivo.includes('cerezo') ||
                                nombreArchivo.includes('bonsai') ||
                                nombreArchivo.includes('farola') ||
                                nombreArchivo.includes('lampara') ||
                                nombreArchivo.includes('lantern') ||
                                nombreArchivo.includes('banca') ||
                                nombreArchivo.includes('bench') ||
                                nombreArchivo.includes('estatua') ||
                                nombreArchivo.includes('puente') ||
                                nombreArchivo.includes('bamboo') ||
                                nombreArchivo.includes('bambu');

                            // Vegetación pequeña - no proyecta sombra
                            const esVegetacionPequeno =
                                nombreHijo.includes('sakura') ||
                                nombreHijo.includes('follaje') ||
                                nombreHijo.includes('petalo') ||
                                nombreHijo.includes('pasto') ||
                                nombreHijo.includes('grass') ||
                                nombreHijo.includes('cesped');

                            child.castShadow = esCastShadow && !esVegetacionPequeno;

                            // Suelo, plazas y paredes reciben sombras
                            const esSuelo =
                                nombreHijo.includes('suelo') ||
                                nombreHijo.includes('piso') ||
                                nombreHijo.includes('floor') ||
                                nombreHijo.includes('ground') ||
                                nombreArchivo.includes('plaza') ||
                                nombreArchivo.includes('suelo');

                            child.receiveShadow = true; // Todos reciben sombras con MeshPhongMaterial
                        }
                    });

                    // Modelo de colisiones
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

                    // Aplicar MeshPhongMaterial con farolas
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

                    // Generar hitbox automática excepto para las plazas y el museo
                    const esPlaza = item.archivo.toLowerCase().includes('plaza');
                    const esMuseo = item.archivo.toLowerCase().includes('museo');
                    if (!esPlaza && !esMuseo) {
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
                        const animIdx = instancia.animacionInicial ?? item.animacionInicial ?? 0;
                        registraranimations(clon, gltf.animations, animIdx);
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