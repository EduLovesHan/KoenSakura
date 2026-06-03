// importacion de librerias necesarias para el proyecto
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ControlesPrimeraPersona } from './controles.js';
import { Skybox } from './skybox.js';

// creacion de la escena, camara y renderizador
const scene = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0.8, 3.5, 25);
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

// Cargar audio de click
const sonidoClick = new THREE.Audio(listener);
audioLoader.load('assets/audio/click-boton.mp3', (buffer) => {
    sonidoClick.setBuffer(buffer);
    sonidoClick.setLoop(false);
    sonidoClick.setVolume(1.5);
});

function reproducirClick() {
    if (listener.context.state === 'suspended') listener.context.resume();
    if (sonidoClick.isPlaying) sonidoClick.stop();
    if (sonidoClick.buffer) sonidoClick.play();
}

//reproducir musica al hacer click
document.body.addEventListener('click', () => {
    if (listener.context.state === 'suspended') listener.context.resume();
    if (!sonidoFondo.isPlaying && sonidoFondo.buffer) sonidoFondo.play();
    panelMenuSuperior.classList.add('oculto');
});

const Controles = new ControlesPrimeraPersona(camara, document.body, objetosColision, listener);

// Inicializar el Skybox
const skybox = new Skybox(scene, 'assets/texturas/SkyBox/');

// Iluminación básica de prueba (luz ambiental)
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

// Límites del mapa (Cajas de colisión manuales que delimita el área)
// crearHitbox(-100, 1, 0, 0.5, 10, 600);   // Pared izquierda
// crearHitbox(100, 1, 0, 0.5, 10, 600);    // Pared derecha
// crearHitbox(0, 1, -300, 200, 10, 0.5);  // Pared frontal (aún más profundo)
// crearHitbox(0, 1, 300, 200, 10, 0.5);   // Pared trasera (aún más profundo)
// crearHitbox(0, -0.05, 0, 200, 0.1, 600); // Suelo (aún más ampliado)

// Función para crear cajas de colisión invisibles
// function crearHitbox(x, y, z, ancho, alto, profundo) {
//     const geometry = new THREE.BoxGeometry(ancho, alto, profundo);
//     const material = new THREE.MeshBasicMaterial({ 
//         color: 0xff0000, 
//         wireframe: true, 
//         //visible: false 
//         visible: true 
//     });
//     const hitbox = new THREE.Mesh(geometry, material);
//     hitbox.position.set(x, y, z);
//     scene.add(hitbox);
//     objetosColision.push(hitbox);
// }

// sistema para detectar proximidad a objetos interactivos y mostrar cuadros de texto
const objetosInteractivos = [];
let objetoCercanoActual = null;
const uiInteraccion = document.getElementById('ui-interaccion');
const modalDialogo = document.getElementById('modal-dialogo');
const dialogoTitulo = document.getElementById('dialogo-titulo');
const dialogoTexto = document.getElementById('dialogo-texto');

// Datos de los letreros a distribuir por el mapa
const datosLetreros = [
    { posicion: new THREE.Vector3(40, 0, 60), rotacionY: Math.PI, titulo: "Letrero de la Plaza", texto: "¡Bienvenido a KoenSakura! Disfruta de la tranquilidad y la belleza de este pequeño espacio de paz." }
];

// Cargar el modelo del letrero 
loader.load('assets/modelos/letreroBasico.glb', (gltf) => {
    datosLetreros.forEach((datos) => {
        const letreroModelo = gltf.scene.clone(); // Clonamos el modelo
        letreroModelo.position.copy(datos.posicion); 
        letreroModelo.rotation.y = datos.rotacionY; 
        
        scene.add(letreroModelo);
        objetosColision.push(letreroModelo);

        // Registrar el objeto como interactivo
        objetosInteractivos.push({
            malla: letreroModelo,
            distancia: 8, 
            titulo: datos.titulo,
            texto: datos.texto
        });
    });
});

// Escuchar tecla 'E' para interactuar
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e' && objetoCercanoActual) {
        // Si estamos cerca de un objeto y presionamos E
        if (modalDialogo && uiInteraccion) {
            const estaOculto = modalDialogo.classList.contains('oculto');
            if (estaOculto) {
                // Abrir diálogo
                dialogoTitulo.innerText = objetoCercanoActual.titulo;
                dialogoTexto.innerText = objetoCercanoActual.texto;
                modalDialogo.classList.remove('oculto');
            } else {
                // Cerrar diálogo
                modalDialogo.classList.add('oculto');
            }
        }
    }
});

//logica del menu superior
const btnMenuSuperior = document.getElementById('btn-menu-superior');
const panelMenuSuperior = document.getElementById('panel-menu-superior');

btnMenuSuperior.addEventListener('click', (evento) => {
    evento.stopPropagation(); 
    reproducirClick();
    panelMenuSuperior.classList.toggle('oculto');
});

// Evitar que hacer clic dentro del menú lo cierre (o dispare algo del juego)
panelMenuSuperior.addEventListener('click', (evento) => {
    evento.stopPropagation();
});

// Creacion e inicializacion de carruseles

function inicializarCarrusel(selectorContenedor, idBtnNext, idBtnPrev) {
    let indiceActual = 0;
    const contenedor = document.querySelector(selectorContenedor);
    if (!contenedor) return () => {}; // si el contenedor no existe

    const paginas = contenedor.querySelectorAll('.control-slide');
    const puntos = contenedor.querySelectorAll('.punto');
    const btnNext = document.getElementById(idBtnNext);
    const btnPrev = document.getElementById(idBtnPrev);

    function mostrarPagina(index) {
        if (index >= paginas.length) indiceActual = 0;
        else if (index < 0) indiceActual = paginas.length - 1;
        else indiceActual = index;

        paginas.forEach((pag, i) => {
            pag.classList.toggle('active', i === indiceActual);
            if (puntos[i]) puntos[i].classList.toggle('active', i === indiceActual);
        });
    }

    if (btnNext && btnPrev) {
        btnNext.addEventListener('click', (e) => {
            e.stopPropagation();
            reproducirClick();
            mostrarPagina(indiceActual + 1);
        });
        btnPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            reproducirClick();
            mostrarPagina(indiceActual - 1);
        });
    }

    return mostrarPagina; // Devolvemos la función para reiniciarlo desde las pestañas
}

const resetCarruselControles = inicializarCarrusel('#tab-controles', 'next-control', 'prev-control');
const resetCarruselAjustes = inicializarCarrusel('#tab-ajustes', 'next-ajustes', 'prev-ajustes');

//logica de pestañas del menu superior
const botonesPestañas = document.querySelectorAll('.btn-opcion');
const contenidosPestañas = document.querySelectorAll('.tab-contenido');

botonesPestañas.forEach(boton => {
    boton.addEventListener('click', () => {
        reproducirClick();
        
        //obtener pestaña a mostrar 
        const tabDestino = boton.getAttribute('data-tab');

        //ocultar contenido de las demas pestañas
        contenidosPestañas.forEach(contenido => {
            contenido.classList.add('oculto');
        });

        //mostrar la pestaña seleccionada 
        const tabAMostrar = document.getElementById(`tab-${tabDestino}`);
        if (tabAMostrar) {
            tabAMostrar.classList.remove('oculto');
            
            //reiniciar carruseles al abrir cada pestaña
            if (tabDestino === 'controles') {
                resetCarruselControles(0); 
            } else if (tabDestino === 'ajustes') {
                resetCarruselAjustes(0); 
            }
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
        const volumen = parseFloat(e.target.value);
        Controles.setSfxVolume(volumen);
        sonidoClick.setVolume(volumen);
    });
    sfxMute.addEventListener('change', (e) => {
        const isMuted = e.target.checked;
        Controles.setSfxMute(isMuted);
        sonidoClick.setVolume(isMuted ? 0 : parseFloat(sfxSlider.value));
    });
}

// Controlar Iluminación
const luzAmbSlider = document.getElementById('luz-amb-slider');
const luzDirSlider = document.getElementById('luz-dir-slider');

if (luzAmbSlider) {
    luzAmbSlider.addEventListener('input', (e) => {
        ambientLight.intensity = parseFloat(e.target.value);
    });
}
if (luzDirSlider) {
    luzDirSlider.addEventListener('input', (e) => {
        directionalLight.intensity = parseFloat(e.target.value);
    });
}

function animar() {
    requestAnimationFrame(animar);
    
    // Detectar proximidad a objetos interactivos 
    if (Controles.isLocked) {
        let objetoEncontrado = null;
        
        for (const obj of objetosInteractivos) {
            // Medir la distancia entre la cámara y el modelo 
            const dist = camara.position.distanceTo(obj.malla.position);
            if (dist <= obj.distancia) {
                objetoEncontrado = obj;
                break; 
            }
        }

        objetoCercanoActual = objetoEncontrado;

        // Mostrar/Ocultar mensaje
        if (uiInteraccion) {
            if (objetoCercanoActual && modalDialogo.classList.contains('oculto')) {
                uiInteraccion.classList.remove('oculto');
            } else {
                uiInteraccion.classList.add('oculto');
                if (modalDialogo && !objetoCercanoActual) modalDialogo.classList.add('oculto'); // Cierra el cuadro al alejarse
            }
        }
    }

    //actualizar controles
    Controles.actualizar();

    // Muestra la posición de la cámara en la consola solo cuando el puntero está bloqueado (dentro del juego)
    if (Controles.isLocked) {
        console.log(`Posición Cámara -> X: ${camara.position.x.toFixed(2)}, Y: ${camara.position.y.toFixed(2)}, Z: ${camara.position.z.toFixed(2)}`);
    }

    renderizador.render(scene, camara);
}

animar();

// Posiciones de las farolas en el mapa
const posicionesFarolas = [
    
    new THREE.Vector3(10, -1, 35),
    new THREE.Vector3(-10, -1, 35),
    new THREE.Vector3(-35, -1, 35),
    new THREE.Vector3(-60, -1, 35),
    new THREE.Vector3(35, -1, 35),
    new THREE.Vector3(60, -1, 35),
    new THREE.Vector3(85, -1, 35),
    new THREE.Vector3(110, -1, 35),
    new THREE.Vector3(116, -1, 75),
    new THREE.Vector3(116, -1, 100),
    new THREE.Vector3(116, -1, 125),
    new THREE.Vector3(95, -1, 134),
    new THREE.Vector3(70, -1, 134),
    new THREE.Vector3(45, -1, 134),
    new THREE.Vector3(40, -1, 160),
    new THREE.Vector3(20, -1, 190),
    new THREE.Vector3(-5, -1, 190),
    new THREE.Vector3(-30, -1, 190),
    new THREE.Vector3(-55, -1, 190),
    new THREE.Vector3(-105, -1, 190),
    new THREE.Vector3(-117, -1, 165),
    new THREE.Vector3(-117, -1, 140),
    new THREE.Vector3(-117, -1, 115),
];

loader.load('assets/modelos/farolaPrueba.glb', (gltf) => {
    posicionesFarolas.forEach((posicion) => {
        const farol = gltf.scene.clone();
        farol.position.copy(posicion); 
        scene.add(farol);
        objetosColision.push(farol);

        //creacion de luz puntual pra la farola
        const luzFoco = new THREE.PointLight(0xffcc88, 50.0, 50); 
        luzFoco.position.set(0, 7, 0);
       
        // Crear un cubo para representar el foco brillando
        const geometriaFoco = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const materialFoco = new THREE.MeshBasicMaterial({ color: 0xffcc88 }); 
        const mallaFoco = new THREE.Mesh(geometriaFoco, materialFoco);
        mallaFoco.position.copy(luzFoco.position); // posicionar donde esta la luz (sirve como guia)
        
        farol.add(luzFoco); 
        farol.add(mallaFoco);
        
    });
});


const posicionesEstatuas = [
    
    new THREE.Vector3(5, 0, 35),
    new THREE.Vector3(-5, 0, 35)
    
    
];

// Cargar el modelo de la estatua
loader.load('assets/modelos/estatua.glb', (gltf) => {
    posicionesEstatuas.forEach((posicion) => {
        const estatua = gltf.scene.clone();
        estatua.position.copy(posicion); 
        estatua.rotation.y = 3 * Math.PI / 2; 
        scene.add(estatua);
        objetosColision.push(estatua); 
    });
});

//para cargar cualquier objeto multiples veces se definen las diferentes posiciones

const posicionesCerezos = [
    //new THREE.Vector3(35, 0, 35),
    //new THREE.Vector3(35, 0, 40)
];

// Cargar el modelo 
loader.load('assets/modelos/arbolCerezoPequeño.glb', (gltf) => {
    posicionesCerezos.forEach((posicion) => {
        const cerezo = gltf.scene.clone(); 
        cerezo.position.copy(posicion); 
        cerezo.rotation.y = 3 * Math.PI / 2; // Rotar si es necesario
        scene.add(cerezo);
        objetosColision.push(cerezo); // para que el objeto choque con la cámara
    });
});


