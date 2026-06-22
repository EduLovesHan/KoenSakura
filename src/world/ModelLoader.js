import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { broker } from './EventBroker.js';
import { registraranimations, registrarTexturaAgua, eliminarAnimacionesZona } from './animations.js';
import { mallasSuelo, registrarBoxColision } from './collisions.js';

export const aguasInstanciadas = [];
const configuracionRendimientoPredeterminada = {
    esMovil: false,
    usarModelosReducidos: false,
    precompilarShaders: true,
    usarAguaAvanzada: true,
    concurrenciaPrincipal: 2,
    concurrenciaSecundaria: 1,
    distanciaCargaZona: 60,
    distanciaDescargaZona: 100,
    distanciaLODLejano: 45,
    maxZonasCache: 8,
};
const configuracionRendimiento = new Proxy(configuracionRendimientoPredeterminada, {
    get(objetivo, propiedad) {
        return window.configuracionRendimiento?.[propiedad] ?? objetivo[propiedad];
    },
});

const textureLoader = new THREE.TextureLoader();
let waterNormals = null;

function obtenerNormalesAgua() {
    if (!waterNormals) {
        waterNormals = textureLoader.load('assets/textures/others/waternormals3.webp', (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        });
    }
    return waterNormals;
}

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

const esperarSiguienteTick = () => {
    if (typeof requestIdleCallback === 'function') {
        return new Promise((resolve) => requestIdleCallback(() => resolve(), { timeout: 200 }));
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
const zonasVisitadas = new Set();
const objetosPorZona = new Map();
const zonasEnCache = new Map();
const modelosEnCarga = new Set();
let zonasPendientes = null;
let totalZonasSecundarias = 0;
let zonasCompletadasCount = 0;
let loaderBg = null;
let ultimaComprobacionZona = 0;
const reintentoGrupoDespues = new Map();

async function cargarModeloConRetry(item, loader, esTrackeado, intento = 0) {
    const archivoMedido = obtenerArchivoModelo(item);
    const inicioCarga = performance.now();
    modelosEnCarga.add(archivoMedido);
    try {
        await cargarModelo(item, loader, esTrackeado);
        console.info(
            `[ModelTiming] ${archivoMedido} | carga+procesado=${Math.round(performance.now() - inicioCarga)}ms`
        );
        return true;
    } catch (err) {
        if (intento < MAX_REINTENTOS) {
            const espera = Math.pow(2, intento) * 1000; // 1s, 2s
            console.warn(`[ModelLoader] Reintentando ${item.archivo} (intento ${intento + 1}/${MAX_REINTENTOS}) en ${espera}ms...`);
            await new Promise(r => setTimeout(r, espera));
            return cargarModeloConRetry(item, loader, esTrackeado, intento + 1);
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
            return false;
        }
    } finally {
        modelosEnCarga.delete(archivoMedido);
    }
}

export function obtenerModelosEnCarga() {
    return [...modelosEnCarga];
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

function obtenerArchivoModelo(item) {
    return (configuracionRendimiento.usarModelosReducidos || item._usarLODLejano) && item.archivoMovil
        ? item.archivoMovil
        : item.archivo;
}

function registrarObjetoZona(zona, objeto) {
    if (!zona || zona === 'principal') return;
    if (!objetosPorZona.has(zona)) objetosPorZona.set(zona, new Set());
    objetosPorZona.get(zona).add(objeto);
}

function agregarTexturasMaterial(material, texturas) {
    if (!material) return;
    for (const valor of Object.values(material)) {
        if (valor?.isTexture) texturas.add(valor);
    }
}

function puedeMantenerseEnCache(zona) {
    const items = zonasPendientes?.[zona]?.items || [];
    return configuracionRendimiento.maxZonasCache > 0 &&
        items.length > 0 &&
        items.every((item) => {
            const archivo = item.archivo.toLowerCase();
            return !item.tieneanimations && !item.tieneAnimations && !item.tieneAgua &&
                !archivo.includes('collisions') && !archivo.includes('colisiones');
        });
}

function reactivarZonaDesdeCache(zona) {
    const objetos = objetosPorZona.get(zona);
    if (!zonasEnCache.has(zona) || !objetos?.size) return false;

    objetos.forEach((objeto) => {
        objeto.visible = true;
        if (objeto.userData.datosJSON) {
            broker.emit('modeloCargado', {
                modelo: objeto,
                datosJSON: objeto.userData.datosJSON,
                scene: globalScene,
                objetosColision: globalObjetosColision,
            });
        }
    });
    zonasEnCache.delete(zona);
    zonasCargadas.add(zona);
    console.log(`[Cache] '${zona}' restaurada sin recargar GLB`);
    return true;
}

function limitarCacheZonas() {
    const maximo = configuracionRendimiento.maxZonasCache;
    while (zonasEnCache.size > maximo) {
        const zonaMasAntigua = zonasEnCache.keys().next().value;
        descargarZona(zonaMasAntigua, false);
    }
}

function descargarZona(zona, conservarEnCache = true) {
    const objetos = objetosPorZona.get(zona);
    if (!objetos?.size) {
        objetosPorZona.delete(zona);
        zonasCargadas.delete(zona);
        return;
    }

    if (conservarEnCache && puedeMantenerseEnCache(zona)) {
        objetos.forEach((objeto) => { objeto.visible = false; });
        broker.emit('zonaDescargando', { zona });
        zonasCargadas.delete(zona);
        zonasEnCache.delete(zona);
        zonasEnCache.set(zona, performance.now());
        console.log(`[Cache] '${zona}' oculta y conservada en memoria`);
        limitarCacheZonas();
        return;
    }

    broker.emit('zonaDescargando', { zona });
    eliminarAnimacionesZona(zona);

    const geometrias = new Set();
    const materiales = new Set();
    const texturas = new Set();

    for (const objeto of objetos) {
        objeto.traverse((child) => {
            if (!child.isMesh) return;
            if (child.geometry) geometrias.add(child.geometry);
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.filter(Boolean).forEach((material) => {
                materiales.add(material);
                agregarTexturasMaterial(material, texturas);
            });
        });
        objeto.removeFromParent();
    }

    for (let i = globalObjetosColision.length - 1; i >= 0; i--) {
        if (globalObjetosColision[i].userData?.zonaCarga === zona) {
            globalObjetosColision.splice(i, 1);
        }
    }

    const geometriasActivas = new Set();
    const materialesActivos = new Set();
    const texturasActivas = new Set();
    globalScene.traverse((child) => {
        if (!child.isMesh) return;
        if (child.geometry) geometriasActivas.add(child.geometry);
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.filter(Boolean).forEach((material) => {
            materialesActivos.add(material);
            agregarTexturasMaterial(material, texturasActivas);
        });
    });

    geometrias.forEach((geometry) => {
        if (!geometriasActivas.has(geometry)) geometry.dispose();
    });
    materiales.forEach((material) => {
        if (materialesActivos.has(material)) return;
        material.dispose();
        for (const [key, cached] of materialCache) {
            if (cached === material) materialCache.delete(key);
        }
    });
    texturas.forEach((texture) => {
        if (!texturasActivas.has(texture)) texture.dispose();
    });

    objetosPorZona.delete(zona);
    zonasEnCache.delete(zona);
    zonasCargadas.delete(zona);
    globalRenderizador?.renderLists?.dispose();
    console.log(`[Streaming] Zona '${zona}' descargada de memoria`);
}

function distanciaMinimaZona(posicionJugador, items) {
    let distanciaSqMinima = Infinity;
    for (const item of items || []) {
        for (const instancia of item.instancias || []) {
            if (!instancia.posicion) continue;
            const dx = posicionJugador.x - instancia.posicion[0];
            const dz = posicionJugador.z - instancia.posicion[2];
            distanciaSqMinima = Math.min(distanciaSqMinima, dx * dx + dz * dz);
        }
    }
    return Math.sqrt(distanciaSqMinima);
}

const MODELOS_PRIORITARIOS = [
    'ichirakuramen.glb',
    'foocourt.glb',
    'foodletrero.glb',
    'letrerobasico.glb',
    'museo.glb',
    'plazalago.glb',
    'hiroshima.glb',
    'altar.glb',
];

function esModeloPrioritario(grupo) {
    const archivo = grupo.items[0]?.archivo?.toLowerCase().split('/').pop() || '';
    return MODELOS_PRIORITARIOS.includes(archivo);
}

async function cargarModelo(item, loader, esTrackeado) {
    const archivoCarga = obtenerArchivoModelo(item);
    const gltfPromise = loader.loadAsync(archivoCarga);
    
    // Timeout para evitar que un modelo bloquee todo
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout cargando ${archivoCarga}`)), TIMEOUT_MS)
    );

    const gltf = await Promise.race([gltfPromise, timeoutPromise]);
    const modeloBase = gltf.scene;
    modeloBase.name = archivoCarga;
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

            child.frustumCulled = !item.archivo.toLowerCase().includes('letrero');

            const nh = child.name.toLowerCase();
            const na = item.archivo.toLowerCase();

            // lógica de DoubleSide
            const esDoubleSide =
                nh.includes('sakura') || na.includes('bandera') || nh.includes('bandera') ||
                na.includes('letrero') || nh.includes('letrero') ||
                na.includes('sign') || nh.includes('sign') ||
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
        const zonaCarga = item._grupoCarga || item.zona || 'principal';
        clon.traverse((child) => {
            child.userData.zonaCarga = zonaCarga;
        });

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
            registrarObjetoZona(zonaCarga, clon);
            clon.updateMatrixWorld(true);
            clon.traverse((hijo) => {
                if (!hijo.isMesh) return;
                const nl = hijo.name.toLowerCase();
                const nombreJerarquia = `${nl} ${hijo.parent?.name?.toLowerCase() || ''}`;
                const materiales = Array.isArray(hijo.material) ? hijo.material : [hijo.material];
                materiales.filter(Boolean).forEach((material) => {
                    material.visible = false;
                    material.depthWrite = false;
                    material.colorWrite = false;
                });
                hijo.castShadow = false;
                hijo.receiveShadow = false;
                globalObjetosColision.push(hijo);
                if (nombreJerarquia.includes('suelo') || nombreJerarquia.includes('ground') ||
                    nombreJerarquia.includes('rampa') || nombreJerarquia.includes('escalera') ||
                    nombreJerarquia.includes('piso') || nombreJerarquia.includes('floor')) {
                    mallasSuelo.push(hijo);
                } else {
                    registrarBoxColision(new THREE.Box3().setFromObject(hijo), zonaCarga);
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
                    waterNormals: obtenerNormalesAgua(),
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
        registrarObjetoZona(zonaCarga, clon);

        const esPlaza = na.includes('plaza');
        const esMuseo = na.includes('museo');
        if (!esPlaza && !esMuseo) clon.userData.generarHitboxAutomata = true;

        const datosJSON = { ...item, ...instancia };
        delete datosJSON.instancias;
        clon.userData.datosJSON = datosJSON;
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
        if (!esTrackeado && configuracionRendimiento.esMovil) {
            await esperarSiguienteTick();
        }
    }

    console.log(`[${item.zona || 'principal'}] OK ${archivoCarga} (${item.instancias?.length ?? 0} inst.)`);
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
        throw error;
    }

    //carga de modelos base con mayor prioridad para empezar el recorrido
    const MODELOS_CRITICOS = ['plazaprincipal_optimizado_editable.glb', 'plazaprincipal_colisiones.glb'];

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

    // Cada GLB secundario se transmite de forma independiente. Las zonas del
    // JSON se superponen espacialmente y no sirven como unidad de streaming.
    const gruposPorModelo = {};
    itemsSecundarios.forEach((item, indice) => {
        const zona = item.zona || 'otro';
        const clave = `${zona}:${indice}`;
        gruposPorModelo[clave] = {
            zona,
            items: [{ ...item, _grupoCarga: clave }],
        };
    });

    zonasCargando.clear();
    zonasCargadas.clear();
    zonasEnCache.clear();
    zonasVisitadas.clear();
    objetosPorZona.clear();
    reintentoGrupoDespues.clear();
    zonasPendientes = gruposPorModelo;
    totalZonasSecundarias = Object.keys(gruposPorModelo).length;
    zonasCompletadasCount = 0;
    loaderBg = null;
    ultimaComprobacionZona = 0;
}

export function actualizarCargaPorProximidad(posicionJugador) {
    if (window.juegoIniciado !== true) return;
    if (!zonasPendientes) return;
    const ahora = performance.now();
    if (ahora - ultimaComprobacionZona < 150) return;
    ultimaComprobacionZona = ahora;

    // Descargar como maximo un grupo por comprobacion para repartir el trabajo.
    for (const clave of zonasCargadas) {
        const grupo = zonasPendientes[clave];
        const distancia = distanciaMinimaZona(posicionJugador, grupo?.items);
        if (!grupo || distancia > configuracionRendimiento.distanciaDescargaZona) {
            descargarZona(clave);
            return;
        }
    }

    // Una descarga/decodificacion a la vez evita picos largos en el hilo principal.
    if (zonasCargando.size > 0) return;

    const cacheCercana = [...zonasEnCache.keys()]
        .map((clave) => ({
            clave,
            distancia: distanciaMinimaZona(posicionJugador, zonasPendientes[clave]?.items),
        }))
        .filter(({ distancia }) => distancia <= configuracionRendimiento.distanciaCargaZona)
        .sort((a, b) => a.distancia - b.distancia)[0];
    if (cacheCercana && reactivarZonaDesdeCache(cacheCercana.clave)) return;

    const siguiente = Object.entries(zonasPendientes)
        .filter(([clave]) => !zonasCargadas.has(clave))
        .filter(([clave]) => (reintentoGrupoDespues.get(clave) || 0) <= ahora)
        .map(([clave, grupo]) => ({
            clave,
            grupo,
            distancia: distanciaMinimaZona(posicionJugador, grupo.items),
            prioritario: esModeloPrioritario(grupo),
        }))
        .filter(({ distancia, prioritario }) =>
            distancia <= configuracionRendimiento.distanciaCargaZona + (prioritario ? 15 : 0)
        )
        .sort((a, b) =>
            (a.distancia - (a.prioritario ? 20 : 0)) -
            (b.distancia - (b.prioritario ? 20 : 0))
        )[0];

    if (!siguiente) return;
    zonasCargando.add(siguiente.clave);
    cargarZonaSecundaria(siguiente.clave, siguiente.grupo, siguiente.distancia).catch((error) => {
        zonasCargando.delete(siguiente.clave);
        descargarZona(siguiente.clave, false);
        reintentoGrupoDespues.set(siguiente.clave, performance.now() + 15000);
        console.error(`[Streaming] Error inesperado en '${siguiente.clave}'`, error);
        broker.emit('zonaError', {
            zona: siguiente.grupo.zona,
            archivo: siguiente.grupo.items[0]?.archivo || siguiente.clave,
        });
    });
}

async function cargarZonaSecundaria(clave, grupo, distanciaInicial = 0) {
    if (!loaderBg) {
        loaderBg = crearGLTFLoader(null);
    }

    const { zona, items } = grupo;
    const usarLODLejano = !configuracionRendimiento.esMovil &&
        distanciaInicial >= configuracionRendimiento.distanciaLODLejano;
    const itemsCarga = usarLODLejano
        ? items.map((item) => ({ ...item, _usarLODLejano: Boolean(item.archivoMovil) }))
        : items;
    const archivo = items[0]?.archivo || clave;
    console.log(`[Streaming] Cargando '${archivo}' (${zona})`);
    broker.emit('zonaCargando', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });

    let exito = true;
    try {
        const CONCURRENT_BATCH = configuracionRendimiento.concurrenciaSecundaria;
        for (let i = 0; i < itemsCarga.length; i += CONCURRENT_BATCH) {
            const lote = itemsCarga.slice(i, i + CONCURRENT_BATCH);
            await esperarSiguienteTick();
            const resultados = await Promise.all(lote.map(item => cargarModeloConRetry(item, loaderBg, false)));
            if (resultados.some(resultado => !resultado)) exito = false;
        }
    } finally {
        zonasCargando.delete(clave);
    }

    if (!exito) {
        descargarZona(clave, false);
        reintentoGrupoDespues.set(clave, performance.now() + 15000);
        broker.emit('zonaError', { zona, archivo });
        return;
    }

    zonasCargadas.add(clave);
    reintentoGrupoDespues.delete(clave);
    const primeraVisita = !zonasVisitadas.has(clave);
    zonasVisitadas.add(clave);
    zonasCompletadasCount = zonasVisitadas.size;
    console.log(`[Streaming] '${archivo}' listo ✓ (${zonasCompletadasCount}/${totalZonasSecundarias})`);
    broker.emit('zonaCompleta', { zona, progreso: zonasCompletadasCount, total: totalZonasSecundarias });

    if (primeraVisita && zonasCompletadasCount === totalZonasSecundarias) {
        console.log('[Carga Proximidad] ✓ Todas las zonas secundarias visitadas');
        broker.emit('todasZonasCargadas');
    }
}

