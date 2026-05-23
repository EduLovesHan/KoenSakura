//importacion de librerias necesarias para el proyecto
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ControlesPrimeraPersona } from './controles.js';
import { Skybox } from './skybox.js';

//creacion de la escena, camara y renderizador

const escene = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0, 3, 15);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderizador.domElement);

// Manejo de redimensionado de ventana
window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
});

const Controles = new ControlesPrimeraPersona(camara, document.body);

// Inicializar el Skybox
const skybox = new Skybox(escene, 'assets/texturas/SkyBox/');

// Iluminación básica de prueba
// luz ambiental
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
escene.add(ambientLight);

// luz puntual
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
escene.add(directionalLight);

// carga del modelo 3D  en formato glTF (glb) 
const loader = new GLTFLoader();

loader.load('assets/modelos/plazaPrincipal.glb', 
    (gltf) => {
        
        const model = gltf.scene;
        // model.scale.set(2, 2, 2); // escalar modelo
        model.position.y = -1; // Ajuste de la posición vertical del modelo
        escene.add(model);
        console.log("Modelo cargado");
    }, 
    undefined, 
    (error) => {
        // debug para errores de carga
        console.error("Error al cargarel modelo:", error);
    }
);

// Ejemplo de cómo podrías cargar otro objeto por separado si eliges el camino modular
/*
loader.load('assets/modelos/otro_objeto.glb', (gltf) => {
    const item = gltf.scene;
    item.position.set(5, 0, 5);
    item.scale.set(0.5, 0.5, 0.5);
    escene.add(item);
});
*/

function animar() {
    requestAnimationFrame(animar);
    
    //actualizar controles
    Controles.actualizar();
    renderizador.render(escene, camara);
}

animar();