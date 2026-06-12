import * as THREE from 'three';
import { obtenerDebugGUI } from '../core/debug.js';
import { broker } from './EventBroker.js';

// Array global de cajas de colisión AABB
export const collidableBoxes = [];

// Array para mallas inclinadas y suelos reales
export const mallasSuelo = [];
const raycasterSuelo = new THREE.Raycaster();
const vectorAbajo = new THREE.Vector3(0, -1, 0);

// Box3 global que representa la hitbox del jugador
export const playerBox = new THREE.Box3();

// Dimensiones de la hitbox del jugador
const playerHalfWidth = 0.4;
const camOffset = 3.5;
const playerHeight = 4.0;
const margenPies = 0.2;

// Parámetros de depuración
let mostrarHitboxes = false;
const boxHelpers = [];
let playerHelper = null;
let debugGui = null;
let escenaGlobal = null;

// Actualiza el Box3 del jugador según la posición de la cámara
export function actualizarPlayerBox(posCamara) {
    playerBox.min.set(
        posCamara.x - playerHalfWidth,
        posCamara.y - camOffset + margenPies,
        posCamara.z - playerHalfWidth
    );
    playerBox.max.set(
        posCamara.x + playerHalfWidth,
        posCamara.y - camOffset + playerHeight,
        posCamara.z + playerHalfWidth
    );
}

// Inicializar la interfaz lil-gui y el modo de depuración
export function inicializarDebugColisiones(scene, camara, controles) {
    escenaGlobal = scene;
    if (debugGui) return;

    debugGui = obtenerDebugGUI();

    // Carpeta: Físicas y Colisiones
    const carpetaColisiones = debugGui.addFolder('Físicas y Colisiones');

    const params = {
        mostrarHitboxes: false
    };

    carpetaColisiones.add(params, 'mostrarHitboxes')
        .name('Mostrar Hitboxes')
        .onChange((val) => {
            mostrarHitboxes = val;
            actualizarHelpersVisibilidad(scene);
        });

    // Carpeta: Cámara y Movimiento
    if (camara || controles) {
        const carpetaCamara = debugGui.addFolder('Cámara y Movimiento');

        if (controles) {
            carpetaCamara.add(controles, 'velocidad', 0, 1, 0.01)
                .name('Velocidad Caminar');
        }

        if (camara) {
            carpetaCamara.add(camara.position, 'x')
                .name('Posición X')
                .listen();
            carpetaCamara.add(camara.position, 'y')
                .name('Posición Y')
                .listen();
            carpetaCamara.add(camara.position, 'z')
                .name('Posición Z')
                .listen();
        }
    }

    // Ejes de referencia (AxesHelper) removidos a petición del usuario
    /*
    const axesHelper = new THREE.AxesHelper(15);
    axesHelper.visible = false;
    scene.add(axesHelper);

    debugGui.add(axesHelper, 'visible')
        .name('Mostrar Ejes (X:R, Y:V, Z:A)');
    */
}

// Actualizar la visibilidad de los helpers en la escena
function actualizarHelpersVisibilidad(scene) {
    boxHelpers.forEach(helper => {
        helper.visible = mostrarHitboxes;
    });

    if (playerHelper) {
        scene.remove(playerHelper);
        playerHelper = null;
    }

    if (mostrarHitboxes) {
        // Crear helper rojo para la hitbox del jugador
        playerHelper = new THREE.Box3Helper(playerBox, 0xff0000);
        scene.add(playerHelper);
    }
}

// Registrar un Box3 en la lista y crear su helper si está activo el modo debug
function registrarBoxColision(box) {
    collidableBoxes.push(box);
    if (escenaGlobal) {
        const helper = new THREE.Box3Helper(box, 0x00ff00); // Líneas verdes
        helper.visible = mostrarHitboxes; // Sincronizado con el estado actual del menú
        escenaGlobal.add(helper);
        boxHelpers.push(helper); // Asegúrate de guardarlo en tu array global de helpers
    }
}

// Crear cajas de colisión invisibles manuales (boundboxing)
export function crearHitbox(x, y, z, ancho, alto, profundo, scene, objetosColision) {
    escenaGlobal = scene;
}

// Colisiones para los modelos 3D
// configItem: objeto del JSON con posibles propiedades { hitboxManual, shrinkFactor }
//   - hitboxManual: { centro: [x,y,z], tamaño: [w,h,d] } → caja manual absoluta
//   - shrinkFactor: número 0-1, porcentaje del tamaño original a conservar (default 0.85)
export function procesarColisiones(modelo, scene, objetosColision, configItem = {}) {
    escenaGlobal = scene;
    let tieneCajaBlender = false;

    // Actualizar matrices del modelo
    modelo.updateMatrixWorld(true);

    // ── Paso 3 (fallback): Si el JSON trae hitboxManual, usarlo directamente ──
    if (configItem.hitboxManual) {
        const hm = configItem.hitboxManual;
        const centro = new THREE.Vector3(hm.centro[0], hm.centro[1], hm.centro[2]);
        const tamaño = new THREE.Vector3(hm.tamaño[0], hm.tamaño[1], hm.tamaño[2]);

        // Si la hitbox manual es relativa al modelo, sumar la posición del modelo
        centro.add(modelo.position);

        const box = new THREE.Box3();
        box.setFromCenterAndSize(centro, tamaño);

        const hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(tamaño.x, tamaño.y, tamaño.z),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hitbox.position.copy(centro);
        scene.add(hitbox);
        objetosColision.push(hitbox);

        registrarBoxColision(box);
        return; // Hitbox manual definida, no necesitamos nada más
    }

    // ── Detectar cajas de colisión embebidas desde Blender ──
    modelo.traverse((hijo) => {
        if (!hijo.isMesh) return;

        const nombreHijo = hijo.name.toLowerCase();

        if (nombreHijo.includes('colision_escalera') || nombreHijo.includes('colision_suelo')) {
            hijo.material.visible = false;
            mallasSuelo.push(hijo);
            tieneCajaBlender = true;
        }

        if (nombreHijo.includes('caja_colision_i')) {
            hijo.material.visible = false;
            objetosColision.push(hijo);
            tieneCajaBlender = true;

            const box = new THREE.Box3().setFromObject(hijo);
            registrarBoxColision(box);
        }
        if (nombreHijo.includes('caja_colision_v')) {
            hijo.material.visible = false; // Ocultar por ahora
            objetosColision.push(hijo);
            tieneCajaBlender = true;

            const box = new THREE.Box3().setFromObject(hijo);
            registrarBoxColision(box);
        }
    });

    if (!tieneCajaBlender) {
        if (modelo.userData.generarHitboxAutomata === true) {
            // ── Paso 1: Filtrar mallas invisibles o basura ──
            // Solo considerar hijos que sean Mesh válidos Y visibles.
            // Ignorar Object3D vacíos, luces, y mallas con nombres de follaje/sombra.
            const caja = new THREE.Box3();
            let meshesContados = 0;

            const nombresExcluidos = [
                'hoja', 'leaf', 'leaves', 'foliage',
                'rama', 'branch',
                'sakura', 'flor', 'flower', 'petal',
                'copa', 'canopy', 'crown',
                'shadow', 'sombra',
                'plane', 'suelo', 'floor', 'ground'
            ];

            modelo.traverse((child) => {
                // Solo procesar mallas reales y visibles
                if (!child.isMesh) return;
                if (!child.visible) return;
                if (!child.geometry) return;

                const nombreHijo = child.name.toLowerCase();

                // Filtrar mallas de follaje, sombras, y planos decorativos
                const esExcluido = nombresExcluidos.some(tag => nombreHijo.includes(tag));
                if (esExcluido) return;

                // Ignorar mallas con geometría degenerada (sin vértices reales)
                const posAttr = child.geometry.getAttribute('position');
                if (!posAttr || posAttr.count < 3) return;

                // Calcular la bounding box de esta malla individual en espacio mundo
                child.geometry.computeBoundingBox();
                const tempBox = new THREE.Box3()
                    .copy(child.geometry.boundingBox)
                    .applyMatrix4(child.matrixWorld);

                caja.union(tempBox);
                meshesContados++;
            });

            // Si no se encontró ningún mesh válido, fallback al objeto completo
            if (meshesContados === 0) {
                caja.setFromObject(modelo);
            }

            // ── Paso 2: Encogimiento global (Shrink Factor) ──
            // Reduce la caja un porcentaje para que quede más pegada al modelo real.
            // shrinkFactor = 0.85 significa conservar el 85% del tamaño (encoger 15%).
            const shrinkFactor = configItem.shrinkFactor !== undefined
                ? configItem.shrinkFactor
                : 0.85;

            const tamañoOriginal = caja.getSize(new THREE.Vector3());
            const centro = caja.getCenter(new THREE.Vector3());

            const tamañoReducido = tamañoOriginal.clone().multiplyScalar(shrinkFactor);

            // Re-armar la caja desde el centro con las dimensiones reducidas
            caja.setFromCenterAndSize(centro, tamañoReducido);

            // Crear la hitbox visual (invisible) y registrar
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(tamañoReducido.x, tamañoReducido.y, tamañoReducido.z),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.copy(centro);

            scene.add(hitbox);
            objetosColision.push(hitbox);

            const box = new THREE.Box3().setFromObject(hitbox);
            registrarBoxColision(box);
        }
    }
}

// ── Margen de separación (skin) para evitar incrustación matemática ──
const COLLISION_SKIN = 0.05;

// Lógica de resolución de colisiones con deslizamiento por ejes separados
export function resolverMovimientoJugador(posCamara, vectorMovimiento) {
    // Posición base: donde el jugador está AHORA (antes de mover)
    const posBase = posCamara.clone();
    const maxStepHeight = 0.4;

    // ──────────────────────────────────────────────────────
    // Paso 1: Evaluar movimiento SOLO en el eje X
    // ──────────────────────────────────────────────────────
    let movXPermitido = vectorMovimiento.x;

    if (movXPermitido !== 0) {
        // Candidata: posición actual + solo el desplazamiento X
        const candidataX = posBase.clone();
        candidataX.x += movXPermitido;

        // Construir la hitbox del jugador en esa candidata, inflada por el skin
        const boxTestX = new THREE.Box3();
        actualizarBoxTemporal(candidataX, boxTestX, COLLISION_SKIN);

        let colisionX = false;
        for (const box of collidableBoxes) {
            if (boxTestX.intersectsBox(box)) {
                colisionX = true;

                // Intentar step-up: ¿puedo subir un escalón?
                const candidataSubida = candidataX.clone();
                candidataSubida.y += maxStepHeight;
                const boxSubida = new THREE.Box3();
                actualizarBoxTemporal(candidataSubida, boxSubida, COLLISION_SKIN);

                let colisionSubida = false;
                for (const b of collidableBoxes) {
                    if (boxSubida.intersectsBox(b)) {
                        colisionSubida = true;
                        break;
                    }
                }

                if (!colisionSubida) {
                    // Puedo subir el escalón: aceptar X y elevar Y
                    posBase.y += maxStepHeight;
                    colisionX = false;
                }

                break;
            }
        }

        if (colisionX) {
            movXPermitido = 0; // Bloquear X, pero Z sigue libre
        }
    }

    // Aplicar el resultado de X a la posición base
    posBase.x += movXPermitido;

    // ──────────────────────────────────────────────────────
    // Paso 2: Evaluar movimiento SOLO en el eje Z
    //         (partiendo de la posBase ya resuelta en X)
    // ──────────────────────────────────────────────────────
    let movZPermitido = vectorMovimiento.z;

    if (movZPermitido !== 0) {
        const candidataZ = posBase.clone();
        candidataZ.z += movZPermitido;

        const boxTestZ = new THREE.Box3();
        actualizarBoxTemporal(candidataZ, boxTestZ, COLLISION_SKIN);

        let colisionZ = false;
        for (const box of collidableBoxes) {
            if (boxTestZ.intersectsBox(box)) {
                colisionZ = true;

                // Intentar step-up en Z
                const candidataSubida = candidataZ.clone();
                candidataSubida.y += maxStepHeight;
                const boxSubida = new THREE.Box3();
                actualizarBoxTemporal(candidataSubida, boxSubida, COLLISION_SKIN);

                let colisionSubida = false;
                for (const b of collidableBoxes) {
                    if (boxSubida.intersectsBox(b)) {
                        colisionSubida = true;
                        break;
                    }
                }

                if (!colisionSubida) {
                    posBase.y += maxStepHeight;
                    colisionZ = false;
                }

                break;
            }
        }

        if (colisionZ) {
            movZPermitido = 0; // Bloquear Z, pero X ya fue aceptado
        }
    }

    // Aplicar el resultado de Z
    posBase.z += movZPermitido;

    // ──────────────────────────────────────────────────────
    // Paso 3: Resolver Y usando Raycaster para rampas/suelo
    // ──────────────────────────────────────────────────────
    const origenRayo = posBase.clone();
    origenRayo.y += 5.0;

    raycasterSuelo.set(origenRayo, vectorAbajo);
    const intersecciones = raycasterSuelo.intersectObjects(mallasSuelo);

    if (intersecciones.length > 0) {
        const alturaSuelo = intersecciones[0].point.y;
        posBase.y = alturaSuelo + camOffset;
    } else {
        posBase.y += vectorMovimiento.y;
    }

    // Actualizar la hitbox oficial del jugador a la posición final
    actualizarPlayerBox(posBase);

    return posBase;
}

// Función auxiliar para construir el Box3 del jugador en una posición dada.
// skin: margen de inflado para evitar incrustación (0 = caja exacta).
function actualizarBoxTemporal(posCamara, targetBox, skin = 0) {
    targetBox.min.set(
        posCamara.x - playerHalfWidth - skin,
        posCamara.y - camOffset,
        posCamara.z - playerHalfWidth - skin
    );
    targetBox.max.set(
        posCamara.x + playerHalfWidth + skin,
        posCamara.y - camOffset + playerHeight,
        posCamara.z + playerHalfWidth + skin
    );
}

// Suscribirse al bus de eventos para procesar colisiones autónomamente
broker.on('modeloCargado', ({ modelo, datosJSON, scene, objetosColision }) => {
    procesarColisiones(modelo, scene, objetosColision, datosJSON);
});
