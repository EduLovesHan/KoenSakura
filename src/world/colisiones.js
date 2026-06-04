import * as THREE from 'three';

// Crear cajas de colisión invisibles manuales (boundboxing)
export function crearHitbox(x, y, z, ancho, alto, profundo, scene, objetosColision) {
    const geometry = new THREE.BoxGeometry(ancho, alto, profundo);
    const material = new THREE.MeshBasicMaterial({ visible: false }); 
    const hitbox = new THREE.Mesh(geometry, material);
    hitbox.position.set(x, y, z);
    
    scene.add(hitbox);
    objetosColision.push(hitbox);
}

// Colisiones para los modelos 3D (boxes directo de blender o automaticas)
export function procesarColisiones(modelo, scene, objetosColision, paddingX = 1.0, paddingZ = 1.0) {
    let tieneCajaBlender = false;
    
    modelo.traverse((hijo) => {
        if (hijo.isMesh && hijo.name.toLowerCase().includes('caja_colision')) {
            hijo.material.visible = false;
            objetosColision.push(hijo); 
            tieneCajaBlender = true;
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
    }
}