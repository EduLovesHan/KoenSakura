//importacion de librerias necesarias para el proyecto
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ControlesPrimeraPersona } from './controles.js';

//creacion de la escena, camara y renderizador

const escene = new THREE.Scene();
escene.background = new THREE.Color(0x87CEEB);

// Configuración de la cámara en perspectiva con un campo de visión de 75 grados, una relación de aspecto basada en el tamaño de la ventana, y planos de recorte cercanos y lejanos de 0.1 y 1000 unidades respectivamente
const camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Ajustamos el segundo valor (Y) para bajar la altura de la vista
camara.position.set(-14, 1.7, 28);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderizador.domElement);

// Manejo de redimensionado de ventana
window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
});

// Lista de objetos con los que la cámara puede colisionar
const objetosColision = [];
const Controles = new ControlesPrimeraPersona(camara, document.body, objetosColision);

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
        // model.scale.set(2, 2, 2); // Si el modelo sigue pareciendo pequeño, aumenta este valor
        model.position.y = -1; // Ajuste de la posición vertical del modelo
        escene.add(model);

        // Agregamos el modelo completo al array de colisiones.
        // Esto hará que el Raycaster detecte automáticamente las paredes y verjas.
        objetosColision.push(model);

        console.log("Modelo cargado");
    }, 
    undefined, 
    (error) => {
        console.error("Error al cargarel modelo:", error);
    }
);

// Función para crear cajas de colisión invisibles y optimizadas
function crearHitbox(x, y, z, ancho, alto, profundo) {
    const geometry = new THREE.BoxGeometry(ancho, alto, profundo);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        wireframe: true, 
        visible: false // Cambia a true para ver las cajas mientras las posicionas
    });
    const hitbox = new THREE.Mesh(geometry, material);
    hitbox.position.set(x, y, z);
    escene.add(hitbox);
    objetosColision.push(hitbox);
}

function animar() {
    requestAnimationFrame(animar);
    
    //actualizar controles
    Controles.actualizar();

    // Muestra la posición de la cámara en la consola solo cuando el puntero está bloqueado (dentro del juego)
    if (Controles.isLocked) {
        console.log(`Posición Cámara -> X: ${camara.position.x.toFixed(2)}, Y: ${camara.position.y.toFixed(2)}, Z: ${camara.position.z.toFixed(2)}`);
    }

    renderizador.render(escene, camara);
}

animar();