import * as THREE from 'three';
import { obtenerDebugGUI } from '../core/debug.js';
import { broker } from './EventBroker.js';

// Array global de cajas de colisión AABB
export const collidableBoxes = [];

// Array para mallas inclinadas y suelos reales
export const mallasSuelo = [];
const raycasterSuelo = new THREE.Raycaster();
raycasterSuelo.far = 15.0; // Evitar evaluar infinitamente 
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
export function inicializarDebugCollisions(scene, camara, controls) {
    escenaGlobal = scene;
    if (debugGui) return;

    debugGui = obtenerDebugGUI();

    // Carpeta: Físicas y Colisiones
    const carpetaCollisions = debugGui.addFolder('Físicas y Collisions');

    const params = {
        mostrarHitboxes: false
    };

    carpetaCollisions.add(params, 'mostrarHitboxes')
        .name('Mostrar Hitboxes')
        .onChange((val) => {
            mostrarHitboxes = val;
            actualizarHelpersVisibilidad(scene);
        });

    // Carpeta: Cámara y Movimiento
    if (camara || controls) {
        const carpetaCamara = debugGui.addFolder('Cámara y Movimiento');

        if (controls) {
            carpetaCamara.add(controls, 'velocidad', 0, 1, 0.01)
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
export function registrarBoxColision(box) {
    collidableBoxes.push(box);
    if (escenaGlobal) {
        const helper = new THREE.Box3Helper(box, 0x00ff00); // Líneas verdes
        helper.visible = mostrarHitboxes; // Sincronizado con el estado actual del menú
        escenaGlobal.add(helper);
        boxHelpers.push(helper);
    }
}
//colisiones para modelos
export function procesarCollisions(modelo, scene, objetosColision, configItem = {}) {
    escenaGlobal = scene;
    let tieneCajaBlender = false;

    // Actualizar matrices del modelo
    modelo.updateMatrixWorld(true);


    // Detectar cajas de colisión desde Blender 
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
            hijo.material.visible = false; // Cajas ocultas
            objetosColision.push(hijo);
            tieneCajaBlender = true;
            const box = new THREE.Box3().setFromObject(hijo);
            registrarBoxColision(box);
        }
    });

    if (!tieneCajaBlender) {
        if (modelo.userData.generarHitboxAutomata === true) {
            // considerar modelos con mallas válidas y visibles.
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

                // Filtrar mallas 
                const esExcluido = nombresExcluidos.some(tag => nombreHijo.includes(tag));
                if (esExcluido) return;

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

            //hacer caja mas pegada al modelo
            const shrinkFactor = configItem.shrinkFactor !== undefined
                ? configItem.shrinkFactor
                : 0.85;

            const tamañoOriginal = caja.getSize(new THREE.Vector3());
            const centro = caja.getCenter(new THREE.Vector3());

            const tamañoReducido = tamañoOriginal.clone().multiplyScalar(shrinkFactor);

            // Rearmar la caja desde el centro con las dimensiones reducidas
            caja.setFromCenterAndSize(centro, tamañoReducido);

            // Crear la hitbox visual y registrar
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

// Margen de separación 
const COLLISION_SKIN = 0.05;

// Lógica de resolución de colisiones con deslizamiento por ejes separados
export function resolverMovimientoJugador(posCamara, vectorMovimiento) {
    // Posición base
    const posBase = posCamara.clone();
    const maxStepHeight = 0.4;

    // Evaluar movimiento solo en el eje X
    let movXPermitido = vectorMovimiento.x;

    if (movXPermitido !== 0) {
        // posición actual + solo el desplazamiento X
        const candidataX = posBase.clone();
        candidataX.x += movXPermitido;

        // Construir la hitbox del jugador en esa posición
        const boxTestX = new THREE.Box3();
        actualizarBoxTemporal(candidataX, boxTestX, COLLISION_SKIN);

        let colisionX = false;
        for (const box of collidableBoxes) {
            if (boxTestX.intersectsBox(box)) {
                colisionX = true;

                // Intentar step-up
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
                    // aceptar X y elevar Y
                    posBase.y += maxStepHeight;
                    colisionX = false;
                }

                break;
            }
        }

        if (colisionX) {
            movXPermitido = 0; // Bloquear X, Z libre
        }
    }

    // Aplicar el resultado de X a la posición base
    posBase.x += movXPermitido;

    // Evaluar movimiento solo en el eje Z
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
            movZPermitido = 0; // Bloquear Z
        }
    }

    // Aplicar el resultado de Z
    posBase.z += movZPermitido;

    // Resolver Y usando Raycaster para rampas
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

// Función para construir el Box3 del jugador en una posición dada.
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

// Bus de eventos para procesar colisiones
broker.on('modeloCargado', ({ modelo, datosJSON, scene, objetosColision }) => {
    procesarCollisions(modelo, scene, objetosColision, datosJSON);
});