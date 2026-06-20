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
    // nuevoMaterial.onBeforeCompile = (shader) => {
    //     Object.assign(shader.uniforms, construirUniformsFarolas());

    //     shader.fragmentShader = shader.fragmentShader.replace(
    //         '#include <lights_phong_pars_fragment>',
    //         '#include <lights_phong_pars_fragment>\n' + FAROLAS_GLSL_DECLARATIONS
    //     );

    //     shader.fragmentShader = shader.fragmentShader.replace(
    //         '#include <output_fragment>',
    //         FAROLAS_GLSL_CONTRIBUTION + '\n    #include <output_fragment>'
    //     );
    // };

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
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);
    return loader;
}


export async function cargarEscenario(scene, objetosColision, loadingManager = null) {
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

    const itemsPrincipal = configuracion.filter(i => (i.zona || 'principal') === 'principal');
    const itemsSecundarios = configuracion.filter(i => (i.zona || 'principal') !== 'principal');

    let totalInstanciasPrincipal = 0;
    for (const item of itemsPrincipal) {
        if (item.instancias) totalInstanciasPrincipal += item.instancias.length;
    }
    if (loadingManager) {
        for (let i = 1; i <= totalInstanciasPrincipal; i++) {
            loadingManager.itemStart(`ip_${i}`);
        }
    }

    let contadorPrincipal = 0;

    async function cargarModelo(item, loader, esZonaPrincipal) {
        try {
            const gltf = await loader.loadAsync(item.archivo);
            const modeloBase = gltf.scene;
            modeloBase.name = item.archivo;

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
                    scene.add(clon);
                    clon.updateMatrixWorld(true);
                    clon.traverse((hijo) => {
                        if (!hijo.isMesh) return;
                        const nl = hijo.name.toLowerCase();
                        if (!nl.includes('colision')) return;
                        if (hijo.material) hijo.material.visible = false;
                        objetosColision.push(hijo);
                        if (nl.includes('suelo') || nl.includes('rampa') ||
                            nl.includes('escalera') || nl.includes('piso')) {
                            mallasSuelo.push(hijo);
                        } else {
                            registrarBoxColision(new THREE.Box3().setFromObject(hijo));
                        }
                    });
                    if (esZonaPrincipal && loadingManager) {
                        contadorPrincipal++;
                        loadingManager.itemEnd(`ip_${contadorPrincipal}`);
                    }
                    if (esZonaPrincipal && contadorPrincipal % BATCH_SIZE === 0) {
                        await esperarSiguienteTick();
                    }
                    continue;
                }

                if (item.tieneAgua) {
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
                            fog: scene.fog !== undefined,
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

                scene.add(clon);

                const esPlaza = na.includes('plaza');
                const esMuseo = na.includes('museo');
                if (!esPlaza && !esMuseo) clon.userData.generarHitboxAutomata = true;

                const datosJSON = { ...item, ...instancia };
                delete datosJSON.instancias;
                broker.emit('modeloCargado', { modelo: clon, datosJSON, scene, objetosColision });

                if ((item.tieneanimations || item.tieneAnimations) && gltf.animations?.length > 0) {
                    const animIdx = instancia.animacionInicial ?? item.animacionInicial ?? 0;
                    registraranimations(clon, gltf.animations, animIdx);
                }

                if (esZonaPrincipal && loadingManager) {
                    contadorPrincipal++;
                    loadingManager.itemEnd(`ip_${contadorPrincipal}`);
                }
                if (esZonaPrincipal && contadorPrincipal % BATCH_SIZE === 0) {
                    await esperarSiguienteTick();
                }
            }

            console.log(`[${item.zona || 'principal'}] OK ${item.archivo} (${item.instancias?.length ?? 0} inst.)`);

        } catch (err) {
            console.error(`[ModelLoader] Error en ${item.archivo}:`, err);
            if (esZonaPrincipal && loadingManager) {
                const n = item.instancias?.length ?? 0;
                for (let i = 0; i < n; i++) {
                    contadorPrincipal++;
                    loadingManager.itemEnd(`ip_${contadorPrincipal}`);
                }
            }
        }
    }

    const loaderPrincipal = crearGLTFLoader(loadingManager);
    console.log(`[Zonas] Principal: ${itemsPrincipal.length} modelos, ${totalInstanciasPrincipal} instancias`);
    await Promise.all(itemsPrincipal.map(item => cargarModelo(item, loaderPrincipal, true)));
    console.log('[Zonas] Zona principal completa');
    const loaderBg = crearGLTFLoader(null);
    (async () => {
        const porZona = {};
        for (const item of itemsSecundarios) {
            const z = item.zona || 'otro';
            if (!porZona[z]) porZona[z] = [];
            porZona[z].push(item);
        }
        for (const zona of ZONAS_SECUNDARIAS) {
            const items = porZona[zona];
            if (!items?.length) continue;
            console.log(`[Zonas] '${zona}' en background: ${items.length} modelos`);
            await Promise.all(items.map(item => cargarModelo(item, loaderBg, false)));
            console.log(`[Zonas] '${zona}' completa`);
        }
        console.log('[Zonas] Todas las zonas cargadas');
    })();
}