import * as THREE from 'three';
import GUI from 'lil-gui';

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

    debugGui = new GUI({ title: 'Panel de Depuración' });

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

    // Ejes de referencia (AxesHelper)
    const axesHelper = new THREE.AxesHelper(15);
    axesHelper.visible = false;
    scene.add(axesHelper);

    debugGui.add(axesHelper, 'visible')
        .name('Mostrar Ejes (X:R, Y:V, Z:A)');
}

// Actualizar la visibilidad de los helpers en la escena
function actualizarHelpersVisibilidad(scene) {
    // Eliminar helpers antiguos
    boxHelpers.forEach(h => scene.remove(h));
    boxHelpers.length = 0;

    if (playerHelper) {
        scene.remove(playerHelper);
        playerHelper = null;
    }

    if (mostrarHitboxes) {
        // Crear helpers verdes para los obstáculos estáticos
        collidableBoxes.forEach(box => {
            const helper = new THREE.Box3Helper(box, 0x00ff00);
            scene.add(helper);
            boxHelpers.push(helper);
        });

        // Crear helper rojo para la hitbox del jugador
        playerHelper = new THREE.Box3Helper(playerBox, 0xff0000);
        scene.add(playerHelper);
    }
}

// Registrar un Box3 en la lista y crear su helper si está activo el modo debug
function registrarBoxColision(box) {
    collidableBoxes.push(box);
    if (mostrarHitboxes && escenaGlobal) {
        const helper = new THREE.Box3Helper(box, 0x00ff00);
        escenaGlobal.add(helper);
        boxHelpers.push(helper);
    }
}

// Crear cajas de colisión invisibles manuales (boundboxing)
export function crearHitbox(x, y, z, ancho, alto, profundo, scene, objetosColision) {
    escenaGlobal = scene;
    const geometry = new THREE.BoxGeometry(ancho, alto, profundo);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(geometry, material);
    hitbox.position.set(x, y, z);

    scene.add(hitbox);
    objetosColision.push(hitbox);

    // Generar Box3 y registrarlo en collidableBoxes
    const box = new THREE.Box3().setFromObject(hitbox);
    registrarBoxColision(box);
}

// Colisiones para los modelos 3D 
export function procesarColisiones(modelo, scene, objetosColision, paddingX = 1.0, paddingZ = 1.0) {
    escenaGlobal = scene;
    let tieneCajaBlender = false;

    // Actualizar matrices del modelo
    modelo.updateMatrixWorld(true);

    modelo.traverse((hijo) => {
        if (hijo.isMesh && (hijo.name.toLowerCase().includes('colision_escalera') || hijo.name.toLowerCase().includes('colision_suelo'))) {
            hijo.material.visible = false;
            mallasSuelo.push(hijo);
            tieneCajaBlender = true;
        }


        if (hijo.isMesh && hijo.name.toLowerCase().includes('caja_colision_i')) {
            // hijo.material.visible = false;
            objetosColision.push(hijo);
            tieneCajaBlender = true;

            const box = new THREE.Box3().setFromObject(hijo);
            registrarBoxColision(box);
        }
        if (hijo.isMesh && hijo.name.toLowerCase().includes('caja_colision_v')) {
            hijo.material.visible = true;
            objetosColision.push(hijo);
            tieneCajaBlender = true;

            const box = new THREE.Box3().setFromObject(hijo);
            registrarBoxColision(box);
        }
    });

    if (!tieneCajaBlender) {
        const caja = new THREE.Box3().setFromObject(modelo);
        const tamaño = caja.getSize(new THREE.Vector3());
        const centro = caja.getCenter(new THREE.Vector3());

        if (tamaño.x < paddingX) tamaño.x = paddingX;
        if (tamaño.z < paddingZ) tamaño.z = paddingZ;

        const hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(tamaño.x, tamaño.y, tamaño.z),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hitbox.position.copy(centro);

        scene.add(hitbox);
        objetosColision.push(hitbox);

        const box = new THREE.Box3().setFromObject(hitbox);
        registrarBoxColision(box);
    }
}

// Lógica de resolución de colisiones y deslizamiento AABB
export function resolverMovimientoJugador(posCamara, vectorMovimiento) {
    const nuevaPos = posCamara.clone();
    const tempBox = new THREE.Box3();

    const maxStepHeight = 0.4;

    // 1. Probar y resolver movimiento en el eje X
    nuevaPos.x += vectorMovimiento.x;
    actualizarBoxTemporal(nuevaPos, tempBox);

    let colisionX = false;
    for (const box of collidableBoxes) {
        if (tempBox.intersectsBox(box)) {
            colisionX = true;

            const posicionSubida = nuevaPos.clone();
            posicionSubida.y += maxStepHeight;
            const tempBoxSubida = new THREE.Box3();
            actualizarBoxTemporal(posicionSubida, tempBoxSubida);

            let colisionEnSubida = false;
            for (const b of collidableBoxes) {
                if (tempBoxSubida.intersectsBox(b)) {
                    colisionEnSubida = true;
                    break;
                }
            }

            if (!colisionEnSubida) {
                nuevaPos.y += vectorMovimiento.x * 0.5;
                colisionX = false;
            }

            break;
        }
    }
    if (colisionX) {
        nuevaPos.x -= vectorMovimiento.x;
    }

    // 2. Probar y resolver movimiento en el eje Z
    nuevaPos.z += vectorMovimiento.z;
    actualizarBoxTemporal(nuevaPos, tempBox);
    let colisionZ = false;
    for (const box of collidableBoxes) {
        if (tempBox.intersectsBox(box)) {
            colisionZ = true;

            const posicionSubida = nuevaPos.clone();
            posicionSubida.y += maxStepHeight;
            const tempBoxSubida = new THREE.Box3();
            actualizarBoxTemporal(posicionSubida, tempBoxSubida);

            let colisionEnSubida = false;
            for (const b of collidableBoxes) {
                if (tempBoxSubida.intersectsBox(b)) {
                    colisionEnSubida = true;
                    break;
                }
            }

            if (!colisionEnSubida) {
                colisionZ = false;
            }

            break;
        }
    }
    if (colisionZ) {
        nuevaPos.z -= vectorMovimiento.z;
    }

    // 3. Probar y resolver movimiento en el eje Y usando Raycaster para la rampa
    const origenRayo = nuevaPos.clone();
    origenRayo.y += 5.0;

    raycasterSuelo.set(origenRayo, vectorAbajo);

    const intersecciones = raycasterSuelo.intersectObjects(mallasSuelo);

    if (intersecciones.length > 0) {
        const alturaSuelo = intersecciones[0].point.y;
        nuevaPos.y = alturaSuelo + camOffset;
    } else {
        nuevaPos.y += vectorMovimiento.y;
    }

    // Actualizar la hitbox oficial del jugador a la nueva posición resuelta
    actualizarPlayerBox(nuevaPos);

    return nuevaPos;


}

// Función auxiliar para actualizar una caja Box3 temporal
function actualizarBoxTemporal(posCamara, targetBox) {
    targetBox.min.set(
        posCamara.x - playerHalfWidth,
        posCamara.y - camOffset,
        posCamara.z - playerHalfWidth
    );
    targetBox.max.set(
        posCamara.x + playerHalfWidth,
        posCamara.y - camOffset + playerHeight,
        posCamara.z + playerHalfWidth
    );
}
