import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { broker } from './EventBroker.js';
import { registraranimations, registrarTexturaAgua } from './animations.js';
import { mallasSuelo, registrarBoxColision } from './collisions.js';

export const aguasInstanciadas = [];
const configuracionRendimiento = window.configuracionRendimiento || {
    esMovil: false,
    precompilarShaders: true,
    usarAguaAvanzada: true,
    concurrenciaPrincipal: 2,
    concurrenciaSecundaria: 2,
};

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
    // vViewPosition en Three.js MeshPhong = -mvPosition.xyz (dirección al origen/cámara)
    // Por tanto la posición real del fragmento en view-space = -vViewPosition
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
const materialCache = new Map();

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

    // Generar la clave de caché única basada en los parámetros que definen el material
    const cacheKey = `${texturaOriginal ? texturaOriginal.uuid : 'nomap'}_${colorOriginal.getHexString()}_${opacidadFinal.toFixed(3)}_${esTransparente?'1':'0'}_${alphaTestFinal.toFixed(3)}_${depthWriteFinal?'1':'0'}_${sideFinal}_${blendingFinal}_${esPiso?'floor':'object'}`;

    if (materialCache.has(cacheKey)) {
        return materialCache.get(cacheKey);
    }

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

    // Distinguir variantes de compilación
    nuevoMaterial.customProgramCacheKey = () => {
        const t = nuevoMaterial.transparent ? 't' : 'o';
        const a = nuevoMaterial.alphaTest > 0 ? `a${nuevoMaterial.alphaTest.toFixed(2)}` : 'na';
        const s = nuevoMaterial.side;
        const m = nuevoMaterial.map ? 'map' : 'nomap';
        return `farolas_v1_${t}_${a}_${s}_${m}`;
    };

    materialCache.set(cacheKey, nuevoMaterial);
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

// Orden de carga de zonas secundarias
const ZONAS_SECUNDARIAS = ['hiroshima', 'yokai', 'museo', 'ramen', 'lago'];

const esperarSiguienteTick = () => {
    if (typeof requestIdleCallback === 'function') {
        return new Promise((resolve) => requestIdleCallback(() => resolve()));
    } else {
        return new Promise((resolve) => setTimeout(resolve, 0));
    }
};

// Crea un GLTFLoader configurado con Meshopt y Draco
function crearGLTFLoader(mgr = null) {
    const loader = mgr ? new GLTFLoader(mgr) : new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('assets/draco/');
    loader.setDRACOLoader(dracoLoader);
    return loader;
}



// Estados globales para la carga
let globalScene = null;
let globalObjetosColision = null;
let globalLoadingManager = null;
let globalRenderizador = null;
let globalCamara = null;
let contadorPrincipal = 0;

const MAX_REINTENTOS = 2;
const TIMEOUT_MS = window.esMovil ? 30000 : 45000;
const modelosDiagnosticados = new Set();

// Estados de zonas para carga por proximidad
const zonasCargando = new Set();
const zonasCargadas = new Set();
let zonasPendientes = null;
let totalZonasSecundarias = 0;
let zonasCompletadasCount = 0;
let loaderBg = null;

async function cargarModeloConRetry(item, loader, esTrackeado, intento = 0) {
    try {
        await cargarModelo(item, loader, esTrackeado);
    } catch (err) {
        if (intento < MAX_REINTENTOS) {
            const espera = Math.pow(2, intento) * 1000; // 1s, 2s
            console.warn(`[ModelLoader] Reintentando ${item.archivo} (intento ${intento + 1}/${MAX_REINTENTOS}) en ${espera}ms...`);
            await new Promise(r => setTimeout(r, espera));
            await cargarModeloConRetry(item, loader, esTrackeado, intento + 1);
        } else {
            console.error(`[ModelLoader] Falló definitivamente ${item.archivo} tras ${MAX_REINTENTOS} reintentos`);
            // Liberar los items del loadingManager para no bloquear la barra
            if (esTrackeado && globalLoadingManager) {
                const n = item.instancias?.length ?? 0;
                for (let i = 0; i < n; i++) {
                    contadorPrincipal++;
                    globalLoadingManager.itemEnd(`ip_${contadorPrincipal}`);
                }
            }
        }
    }
}

function recolectarEstadisticasModelo(modelo) {
    let meshes = 0;
    let meshesSkinned = 0;
    let vertices = 0;
    let triangulos = 0;
    const materiales = new Set();

    modelo.traverse((child) => {
        if (!child.isMesh) return;

        meshes++;
        if (child.isSkinnedMesh) meshesSkinned++;

        const geometry = child.geometry;
        if (geometry?.attributes?.position) {
            vertices += geometry.attributes.position.count;
        }
        if (geometry?.index) {
            triangulos += geometry.index.count / 3;
        } else if (geometry?.attributes?.position) {
            triangulos += geometry.attributes.position.count / 3;
        }

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.filter(Boolean).forEach((mat) => materiales.add(mat.uuid));
    });

    return {
        meshes,
        meshesSkinned,
        vertices: Math.round(vertices),
        triangulos: Math.round(triangulos),
        materiales: materiales.size,
    };
}

function diagnosticarModelo(item, modeloBase) {
    if (modelosDiagnosticados.has(item.archivo)) return;
    modelosDiagnosticados.add(item.archivo);

    const stats = recolectarEstadisticasModelo(modeloBase);
    const totalInstancias = item.instancias?.length ?? 0;
    const pesoAproximado = (
        (stats.vertices > 120000) ||
        (stats.triangulos > 80000) ||
        (stats.meshes > 80)
    ) ? 'ALTO' : 'OK';

    console.groupCollapsed(
        `[ModelStats] ${item.archivo} | meshes=${stats.meshes} | vertices=${stats.vertices} | triangulos=${stats.triangulos} | instancias=${totalInstancias} | carga=${pesoAproximado}`
    );
    console.log('Zona:', item.zona || 'principal');
    console.log('Instancias:', totalInstancias);
    console.log('Meshes:', stats.meshes);
    console.log('SkinnedMeshes:', stats.meshesSkinned);
    console.log('Vertices:', stats.vertices);
    console.log('Triangulos:', stats.triangulos);
    console.log('Materiales unicos:', stats.materiales);
    console.groupEnd();
}

async function cargarModelo(item, loader, esTrackeado) {
    const gltfPromise = loader.loadAsync(item.archivo);
    
    // Timeout para evitar que un modelo bloquee todo
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout cargando ${item.archivo}`)), TIMEOUT_MS)
    );

    const gltf = await Promise.race([gltfPromise, timeoutPromise]);
    const modeloBase = gltf.scene;
    modeloBase.name = item.archivo;
    diagnosticarModelo(item, modeloBase);

    const usarSkeletonUtils = tieneSkinnedMesh(modeloBase);
    const na = item.archivo.toLowerCase();
    const esColision = na.includes('collisions') || na.includes('colisiones');

    if (!esColision) {
        // Aplicar materiales Phong con farolas al modelo base
        aplicarMaterialPhong(modeloBase);

        // Configurar culling, sombras y propiedades de renderizado
        modeloBase.traverse((child) => {
            if (!child.isMesh) return;

            child.frustumCulled = true;

            const nh = child.name.toLowerCase();
            const na = item.archivo.toLowerCase();

            // lógica de DoubleSide
            const esDoubleSide =
                nh.includes('sakura') || na.includes('bandera') || nh.includes('bandera') ||
                nh.includes('follaje') || nh.includes('flor') || nh.includes('petalo') ||
                nh.includes('muñeca') || nh.includes('muneca') || nh.includes('agua') ||
                nh.includes('museo') || nh.includes('pared') || nh.includes('wall') ||
                nh.includes('techo') || nh.includes('roof') || nh.includes('ceiling') ||
                nh.includes('columna') || nh.includes('column') || nh.includes('puerta') ||
                nh.includes('door') || nh.includes('cristal') || nh.includes('glass') ||
                nh.includes('vidrio') || nh.includes('marco') || nh.includes('ventana') ||
                nh.includes('window') || na.includes('museo') ||
                nh.includes('casa') || nh.includes('casita') || nh.includes('tradicional') ||
                nh.includes('stand') || na.includes('stand') || nh.includes('puesto') ||
                nh.includes('tienda') || nh.includes('mesa') || nh.includes('table') ||
                nh.includes('mostrador') || nh.includes('puestito');

            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(mat => {
                    if (!mat) return;
                    mat.side = esDoubleSide ? THREE.DoubleSide : THREE.FrontSide;

                    const esSolido =
                        nh.includes('casa') || nh.includes('casita') || nh.includes('tradicional') ||
                        nh.includes('pared') || nh.includes('wall') || nh.includes('techo') ||
                        nh.includes('roof') || nh.includes('ceiling') || nh.includes('columna') ||
                        nh.includes('column') || nh.includes('puerta') || nh.includes('door') ||
                        nh.includes('piso') || nh.includes('floor') || nh.includes('suelo') ||
                        na.includes('museo') || nh.includes('stand') || na.includes('stand') ||
                        nh.includes('puesto') || nh.includes('tienda') || nh.includes('mesa') ||
                        nh.includes('table') || nh.includes('mostrador') || nh.includes('puestito');
                    const esVidrio =
                        nh.includes('cristal') || nh.includes('glass') || nh.includes('vidrio') ||
                        nh.includes('ventana') || nh.includes('window');

                    if (esSolido && !esVidrio && mat.alphaTest === 0) {
                        mat.transparent = false;
                        mat.depthWrite = true;
                        mat.depthTest = true;
                        mat.needsUpdate = true;
                    }
                });
            }

            const castShadow =
                nh.includes('jugador') || nh.includes('player') || nh.includes('estatua') ||
                nh.includes('torii') || nh.includes('puente') || nh.includes('arbol') ||
                nh.includes('tree') || nh.includes('cerezo') || nh.includes('bonsai') ||
                nh.includes('farola') || nh.includes('lampara') || nh.includes('lantern') ||
                nh.includes('banca') || nh.includes('bench') || nh.includes('muro') ||
                nh.includes('fence') || nh.includes('valla') || nh.includes('piedra') ||
                nh.includes('stone') || nh.includes('roca') || nh.includes('rock') ||
                nh.includes('columna') || nh.includes('column') ||
                na.includes('torii') || na.includes('arbol') || na.includes('tree') ||
                na.includes('cerezo') || na.includes('bonsai') || na.includes('farola') ||
                na.includes('lampara') || na.includes('lantern') || na.includes('banca') ||
                na.includes('bench') || na.includes('estatua') || na.includes('puente') ||
                na.includes('bamboo') || na.includes('bambu');

            const esVegetacionPequeña =
                nh.includes('sakura') || nh.includes('follaje') || nh.includes('petalo') ||
                nh.includes('pasto') || nh.includes('grass') || nh.includes('cesped');

            child.castShadow = castShadow && !esVegetacionPequeña;
            child.receiveShadow = true;
        });
    }

    for (const instancia of (item.instancias || [])) {

        const clon = usarSkeletonUtils
            ? SkeletonUtils.clone(modeloBase)
            : modeloBase.clone();

        // Modelo de colisiones
        if (esColision) {
            const { posicion, rotacion, rotacionY, escala } = instancia;
            if (posicion) clon.position.set(posicion[0], posicion[1], posicion[2]);
            if (rotacion) clon.rotation.set(rotacion[0], rotacion[1], rotacion[2]);
            else if (rotacionY !== undefined) clon.rotation.y = rotacionY;
            if (escala) {
                if (Array.isArray(escala)) clon.scale.set(escala[0], escala[1], escala[2]);
                else clon.scale.setScalar(escala);
            }
            globalScene.add(clon);
            clon.updateMatrixWorld(true);
            clon.traverse((hijo) => {
                if (!hijo.isMesh) return;
                const nl = hijo.name.toLowerCase();
                if (!nl.includes('colision')) return;
                if (hijo.material) hijo.material.visible = false;
                globalObjetosColision.push(hijo);
                if (nl.includes('suelo') || nl.includes('rampa') ||
                    nl.includes('escalera') || nl.includes('piso')) {
                    mallasSuelo.push(hijo);
                } else {
                    registrarBoxColision(new THREE.Box3().setFromObject(hijo));
                }
            });
            if (esTrackeado && globalLoadingManager) {
                contadorPrincipal++;
                globalLoadingManager.itemEnd(`ip_${contadorPrincipal}`);
            }
            if (esTrackeado && contadorPrincipal % BATCH_SIZE === 0) {
                await esperarSiguienteTick();
            }
            continue;
        }

        if (item.tieneAgua && configuracionRendimiento.usarAguaAvanzada) {
            const aguasMallas = [];
            clon.traverse((hijo) => {
                if (hijo.isMesh && hijo.name.toLowerCase().includes('agua')) {
                    aguasMallas.push(hijo);
                }
            });
            aguasMallas.forEach((hijo) => {
                const textura = hijo.material.normalMap || hijo.material.map;
                if (textura) {
                    registrarTexturaAgua(textura);
                    console.log('[Agua] Textura registrada desde:', hijo.name);
                }
                const water = new Water(hijo.geometry, {
                    textureWidth: window.esMovil ? 64 : 128,
                    textureHeight: window.esMovil ? 64 : 128,
                    waterNormals,
                    sunDirection: new THREE.Vector3(10, 20, 10).normalize(),
                    sunColor: 0xffffff,
                    waterColor: 0x001e0f,
                    distortionScale: 3.7,
                    fog: globalScene.fog !== undefined,
                });
                water.position.copy(hijo.position);
                water.rotation.copy(hijo.rotation);
                water.scale.copy(hijo.scale);
                water.name = hijo.name;
                const parent = hijo.parent;
                if (parent) { parent.remove(hijo); parent.add(water); }
                aguasInstanciadas.push(water);
            });
        }

        const { posicion, rotacion, rotacionY } = instancia;
        const escala = instancia.escala !== undefined ? instancia.escala : item.escala;
        if (posicion) clon.position.set(posicion[0], posicion[1], posicion[2]);
        if (rotacion) clon.rotation.set(rotacion[0], rotacion[1], rotacion[2]);
        else if (rotacionY !== undefined) clon.rotation.y = rotacionY;
        if (escala) {
            if (Array.isArray(escala)) clon.scale.set(escala[0], escala[1], escala[2]);
            else clon.scale.setScalar(escala);
        }

        const esFolaje = na.includes('bamboo') || na.includes('bambu');
        if (esFolaje) {
            clon.scale.y *= (0.8 + Math.random() * 0.4);
            clon.scale.x *= (0.9 + Math.random() * 0.2);
            clon.scale.z *= (0.9 + Math.random() * 0.2);
        }

        globalScene.add(clon);

        const esPlaza = na.includes('plaza');
        const esMuseo = na.includes('museo');
        if (!esPlaza && !esMuseo) clon.userData.generarHitboxAutomata = true;

        const datosJSON = { ...item, ...instancia };
        delete datosJSON.instancias;
        broker.emit('modeloCargado', { modelo: clon, datosJSON, scene: globalScene, objetosColision: globalObjetosColision });

        if ((item.tieneanimations || item.tieneAnimations) && gltf.animations?.length > 0) {
            const animIdx = instancia.animacionInicial ?? item.animacionInicial ?? 0;
            registraranimations(clon, gltf.animations, animIdx);
        }

        if (esTrackeado && globalLoadingManager) {
            contadorPrincipal++;
            globalLoadingManager.itemEnd(`ip_${contadorPrincipal}`);
        }
        if (esTrackeado && contadorPrincipal % BATCH_SIZE === 0) {
            await esperarSiguienteTick();
        }
    }

    console.log(`[${item.zona || 'principal'}] OK ${item.archivo} (${item.instancias?.length ?? 0} inst.)`);
}

export async function cargarEscenario(scene, objetosColision, loadingManager = null, renderizador = null, camara = null) {
    globalScene = scene;
    globalObjetosColision = objetosColision;
    globalLoadingManager = loadingManager;
    globalRenderizador = renderizador;
    globalCamara = camara;
    contadorPrincipal = 0;
    aguasInstanciadas.length = 0;

    let configuracion;
    try {
        const respuesta = await fetch('assets/objectMap.json');
        if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
        configuracion = await respuesta.json();
    } catch (error) {
        console.error('[ModelLoader] Error al cargar objectMap.json:', error);
        return;
    }

    //carga de modelos base con mayor prioridad para empezar el recorrido
    const MODELOS_CRITICOS = ['plazaprincipal_optimizado.glb', 'plazaprincipal_colisiones.glb'];

    const itemsCriticos = [];
    const itemsPrincipalResto = [];
    const itemsSecundarios = [];

    for (const item of configuracion) {
        const zona = item.zona || 'principal';
        const na = item.archivo.toLowerCase();
        const baseName = na.split('/').pop();

        if (zona === 'principal' && MODELOS_CRITICOS.includes(baseName)) {
            itemsCriticos.push(item);
        } else if (zona === 'principal') {
            itemsPrincipalResto.push(item);
        } else {
            itemsSecundarios.push(item);
        }
    }

    // Carga de instancias totales para la barra de progreso
    let totalInstanciasTrackeadas = 0;
    for (const item of [...itemsCriticos, ...itemsPrincipalResto]) {
        if (item.instancias) totalInstanciasTrackeadas += item.instancias.length;
    }
    if (globalLoadingManager) {
        for (let i = 1; i <= totalInstanciasTrackeadas; i++) {
            globalLoadingManager.itemStart(`ip_${i}`);
        }
    }

    //Carga de modelos base
    const loaderTrackeado = crearGLTFLoader(globalLoadingManager);

    console.log(`[Carga] CRÍTICOS: ${itemsCriticos.length} modelos`);
    for (const item of itemsCriticos) {
        await cargarModeloConRetry(item, loaderTrackeado, true);
    }
    console.log('[Carga] Modelos críticos listos ✓');

    // Carga del resto de modelos de la zona principal en lotes secuenciales
    const CONCURRENT_BATCH = configuracionRendimiento.concurrenciaPrincipal;
    console.log(`[Carga] PRINCIPAL: ${itemsPrincipalResto.length} modelos (en lotes de ${CONCURRENT_BATCH})`);

    for (let i = 0; i < itemsPrincipalResto.length; i += CONCURRENT_BATCH) {
        const lote = itemsPrincipalResto.slice(i, i + CONCURRENT_BATCH);
        await Promise.all(lote.map(item => cargarModeloConRetry(item, loaderTrackeado, true)));
    }
    console.log('[Carga] Zona principal completa ✓');

    // Preparar zonas secundarias para carga por proximidad
    const porZona = {};
    for (const item of itemsSecundarios) {
        const z = item.zona || 'otro';
        if (!porZona[z]) porZona[z] = [];
        porZona[z].push(item);
    }

    zonasCargando.clear();
    zonasCargadas.clear();
    zonasPendientes = porZona;
    totalZonasSecundarias = ZONAS_SECUNDARIAS.filter(z => porZona[z]?.length).length;
    zonasCompletadasCount = 0;
    loaderBg = null;

    if (!window.esMovil) {
        // En PC cargamos las zonas secundarias en background de inmediato de forma secuencial
        cargarTodasLasZonasSecundariasDeInmediato(porZona);
    }
}

async function cargarTodasLasZonasSecundariasDeInmediato(porZona) {
    if (!loaderBg) {
        loaderBg = crearGLTFLoader(null);
    }
    for (const zona of ZONAS_SECUNDARIAS) {
        const items = porZona[zona];
        if (!items?.length) continue;

        zonasCargando.add(zona);
        broker.emit('zonaCargando', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });

        const CONCURRENT_BATCH = configuracionRendimiento.concurrenciaSecundaria;
        for (let i = 0; i < items.length; i += CONCURRENT_BATCH) {
            const lote = items.slice(i, i + CONCURRENT_BATCH);
            await Promise.all(lote.map(item => cargarModeloConRetry(item, loaderBg, false)));
        }

        zonasCargando.delete(zona);
        zonasCargadas.add(zona);
        zonasCompletadasCount++;

        // Compilar asíncronamente los shaders de los nuevos modelos agregados a la escena
        if (configuracionRendimiento.precompilarShaders && globalRenderizador && globalCamara) {
            try {
                await globalRenderizador.compileAsync(globalScene, globalCamara);
                console.log(`[Carga BG] Shaders de la zona '${zona}' pre-compilados con éxito`);
            } catch (e) {
                console.warn(`[Carga BG] Error en compilación de shaders para '${zona}':`, e);
            }
        }

        broker.emit('zonaCompleta', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });
    }

    broker.emit('todasZonasCargadas');
    zonasPendientes = null;
}

export function actualizarCargaPorProximidad(posicionJugador) {
    if (!window.esMovil) return; // Solo móvil usa proximidad
    if (!zonasPendientes) return;

    for (const zona of ZONAS_SECUNDARIAS) {
        if (!zonasPendientes[zona]) continue;
        if (zonasCargando.has(zona) || zonasCargadas.has(zona)) continue;

        const items = zonasPendientes[zona];
        let cerca = false;
        
        for (const item of items) {
            for (const inst of (item.instancias || [])) {
                if (inst.posicion) {
                    const dx = posicionJugador.x - inst.posicion[0];
                    const dz = posicionJugador.z - inst.posicion[2];
                    const distSq = dx * dx + dz * dz;
                    if (distSq < 60 * 60) { // 60 unidades de distancia (3600 distSq)
                        cerca = true;
                        break;
                    }
                }
            }
            if (cerca) break;
        }

        if (cerca) {
            zonasCargando.add(zona);
            cargarZonaSecundaria(zona, items);
        }
    }
}

async function cargarZonaSecundaria(zona, items) {
    if (!loaderBg) {
        loaderBg = crearGLTFLoader(null);
    }
    
    console.log(`[Carga Proximidad] Entrando a zona '${zona}': iniciando carga de ${items.length} modelos`);
    broker.emit('zonaCargando', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });

    const CONCURRENT_BATCH = configuracionRendimiento.concurrenciaSecundaria;
    for (let i = 0; i < items.length; i += CONCURRENT_BATCH) {
        const lote = items.slice(i, i + CONCURRENT_BATCH);
        await Promise.all(lote.map(item => cargarModeloConRetry(item, loaderBg, false)));
    }

    zonasCargando.delete(zona);
    zonasCargadas.add(zona);
    zonasCompletadasCount++;

    // Compilar asíncronamente los shaders de los nuevos modelos agregados a la escena
    if (configuracionRendimiento.precompilarShaders && globalRenderizador && globalCamara) {
        try {
            await globalRenderizador.compileAsync(globalScene, globalCamara);
            console.log(`[Carga Proximidad] Shaders de la zona '${zona}' pre-compilados con éxito`);
        } catch (e) {
            console.warn(`[Carga Proximidad] Error en compilación de shaders para '${zona}':`, e);
        }
    }

    console.log(`[Carga Proximidad] Zona '${zona}' completa ✓ (${zonasCompletadasCount}/${totalZonasSecundarias})`);
    broker.emit('zonaCompleta', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });

    // Eliminar de las pendientes para dejar de comprobar
    delete zonasPendientes[zona];

    if (zonasCompletadasCount === totalZonasSecundarias) {
        console.log('[Carga Proximidad] ✓ Todas las zonas secundarias cargadas');
        broker.emit('todasZonasCargadas');
        zonasPendientes = null;
    }
}

