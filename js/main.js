// importacion de librerias necesarias para el proyecto
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ControlesPrimeraPersona } from './controles.js';
import { Skybox } from './skybox.js';

// creacion de la escena, camara y renderizador
const scene = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0.8, 1.7, 25);
// camara.position.set(50.62, 1.7, 173.04);
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

// audio config
const listener = new THREE.AudioListener();
camara.add(listener); 

const sonidoFondo = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('assets/audio/MusicaFondo.mp3', (buffer) => {
    sonidoFondo.setBuffer(buffer);
    sonidoFondo.setLoop(true); 
    sonidoFondo.setVolume(0.3);
});

// reproducir musica al hacer click
document.body.addEventListener('click', () => {
    if (listener.context.state === 'suspended') listener.context.resume();
    if (!sonidoFondo.isPlaying && sonidoFondo.buffer) sonidoFondo.play();
    panelMenuSuperior.classList.add('oculto');
});

const Controles = new ControlesPrimeraPersona(camara, document.body, objetosColision, listener);

// Inicializar el Skybox
const skybox = new Skybox(scene, 'assets/texturas/SkyBox/');

// Iluminación básica de prueba
// luz ambiental
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

// luz puntual
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// carga del modelo 3D  en formato glTF (glb) 
const loader = new GLTFLoader();

loader.load('assets/modelos/plazaPrincipal.glb', 
    (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0); 
        scene.add(model);

        // Recorrer el modelo para buscar las cajas de colisión exportadas de Blender
        model.traverse((hijo) => {
            // Los objetos tienen el prefijo 'caja_colision'
            if (hijo.isMesh && hijo.name.toLowerCase().includes('caja_colision')) {
                hijo.material.visible = false;
                objetosColision.push(hijo);
                console.log("Caja de colisión cargada:", hijo.name);
            }
        });

        console.log("Modelo cargado");
    }, 
    undefined, 
    (error) => {
        console.error("Error al cargar el modelo:", error);
    }
);

// logica del menu
const btnMenuSuperior = document.getElementById('btn-menu-superior');
const panelMenuSuperior = document.getElementById('panel-menu-superior');

btnMenuSuperior.addEventListener('click', (evento) => {
    evento.stopPropagation(); 
    panelMenuSuperior.classList.toggle('oculto');
});

// Evitar el bloqueo del cursor
panelMenuSuperior.addEventListener('click', (evento) => {
    evento.stopPropagation();
});

// botones y pestañas con informacion del menu
const botonesOpcion = document.querySelectorAll('.btn-opcion');
const tabControles = document.getElementById('tab-controles');
const tabSonido = document.getElementById('tab-sonido');

botonesOpcion.forEach(boton => {
    boton.addEventListener('click', (e) => {
        // Ocultar las pestañas por defeault
        if (tabControles) tabControles.classList.add('oculto');
        if (tabSonido) tabSonido.classList.add('oculto');
        
        // mostrar la pestaña de acuerdo al boton
        const tabId = e.target.dataset.tab;
        if (tabId === 'controles' && tabControles) {
            tabControles.classList.remove('oculto');
        } else if (tabId === 'sonido' && tabSonido) {
            tabSonido.classList.remove('oculto');
        }
    });
});

// controlar el volumen, musica y efectos de sonido
const musicaSlider = document.getElementById('musica-slider');
const musicaMute = document.getElementById('musica-mute');
const sfxSlider = document.getElementById('sfx-slider');
const sfxMute = document.getElementById('sfx-mute');

let volumenMusicaAnterior = 0.3;

if (musicaSlider && musicaMute) {
    musicaSlider.addEventListener('input', (e) => {
        volumenMusicaAnterior = parseFloat(e.target.value);
        if (!musicaMute.checked) {
            sonidoFondo.setVolume(volumenMusicaAnterior);
        }
    });
    musicaMute.addEventListener('change', (e) => {
        sonidoFondo.setVolume(e.target.checked ? 0 : volumenMusicaAnterior);
    });
}

if (sfxSlider && sfxMute) {
    sfxSlider.addEventListener('input', (e) => {
        Controles.setSfxVolume(parseFloat(e.target.value));
    });
    sfxMute.addEventListener('change', (e) => {
        Controles.setSfxMute(e.target.checked);
    });
}

function animar() {
    requestAnimationFrame(animar);
    
    //actualizar controles
    Controles.actualizar();

    // Muestra la posición de la cámara en la consola solo cuando el puntero está bloqueado (dentro del juego)
    if (Controles.isLocked) {
        console.log(`Posición Cámara -> X: ${camara.position.x.toFixed(2)}, Y: ${camara.position.y.toFixed(2)}, Z: ${camara.position.z.toFixed(2)}`);
    }

    renderizador.render(scene, camara);
}

animar();