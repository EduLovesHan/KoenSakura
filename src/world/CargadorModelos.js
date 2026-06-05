import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { procesarColisiones } from './colisiones.js';
import { registrarObjetoInteractivo } from '../player/interacciones.js';

export function cargarEscenario(scene, objetosColision) {
    const loader = new GLTFLoader();

    // Cargar Plaza Principal
    loader.load('assets/modelos/plazaPrincipal.glb', 
        (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0); 
            scene.add(model);
            procesarColisiones(model, scene, objetosColision);
            console.log("Plaza cargada con éxito");
        }, 
        undefined, 
        (error) => {
            console.error("Error al cargar la plaza:", error);
        }
    );

    // Cargar modelos
    loader.load('assets/modelos/letreroBasico.glb', (gltf) => {
        const letreroModelo = gltf.scene;
        letreroModelo.position.set(40, 0, 60); 
        letreroModelo.rotation.y = Math.PI; 
        
        scene.add(letreroModelo);
        procesarColisiones(letreroModelo, scene, objetosColision);

        registrarObjetoInteractivo(
            letreroModelo, 
            8, 
            "Letrero de la Plaza", 
            "¡Bienvenido a KoenSakura! Disfruta de la tranquilidad y la belleza de este pequeño espacio de paz."
        );
    });

  //clonar modelos en las posiciones del mundo
    const posicionesFarolas = [
        new THREE.Vector3(10, -1, 35), new THREE.Vector3(-10, -1, 35), new THREE.Vector3(-35, -1, 35),
        new THREE.Vector3(-60, -1, 35), new THREE.Vector3(35, -1, 35), new THREE.Vector3(60, -1, 35),
        new THREE.Vector3(85, -1, 35), new THREE.Vector3(110, -1, 35), new THREE.Vector3(116, -1, 75),
        new THREE.Vector3(116, -1, 100), new THREE.Vector3(116, -1, 125), new THREE.Vector3(95, -1, 134),
        new THREE.Vector3(70, -1, 134), new THREE.Vector3(45, -1, 134), new THREE.Vector3(40, -1, 160),
        new THREE.Vector3(20, -1, 190), new THREE.Vector3(-5, -1, 190), new THREE.Vector3(-30, -1, 190),
        new THREE.Vector3(-55, -1, 190), new THREE.Vector3(-105, -1, 190), new THREE.Vector3(-117, -1, 165),
        new THREE.Vector3(-117, -1, 140), new THREE.Vector3(-117, -1, 115)
    ];

    loader.load('assets/modelos/farolaPrueba.glb', (gltf) => {
        posicionesFarolas.forEach((posicion) => {
            const farol = gltf.scene.clone();
            farol.position.copy(posicion); 
            scene.add(farol);
            procesarColisiones(farol, scene, objetosColision, 1.5, 1.5); 
        });
    });
}
