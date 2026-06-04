import { inicializarMotor } from '../src/core/motor.js';
import { ControlesPrimeraPersona } from '../src/player/controles.js'; 
import { Skybox } from '../src/world/skybox.js';

import { inicializarUI } from '../src/ui/menu.js';
import { inicializarAudio, reproducirClick, configurarControlesAudio } from '../src/sfx/GestorAudio.js';
import { inicializarIluminacion, configurarControlesIluminacion } from '../src/world/iluminacion.js';
import { cargarEscenario } from '../src/world/CargadorModelos.js';
import { crearHitbox } from '../src/world/colisiones.js';
import { inicializarInteracciones, actualizarInteracciones } from '../src/player/interacciones.js';

//Configuracion inicial del motor, escena, cámara y renderizador
const { scene, camara, renderizador } = inicializarMotor();
const objetosColision = [];

//configuracion del audio y controles de movimiento
const listener = inicializarAudio(camara);
const Controles = new ControlesPrimeraPersona(camara, document.body, objetosColision, listener);
configurarControlesAudio(Controles);

//configuracion de la iluminacion y el skybox
const skybox = new Skybox(scene, 'assets/texturas/SkyBoxAtardecer/', '.png');
inicializarIluminacion(scene);
configurarControlesIluminacion(skybox);

//carga de los modelos y objetos interactivos en el mapa
cargarEscenario(scene, objetosColision);

// Límites del mapa 
crearHitbox(-100, 1, 0, 0.5, 10, 600, scene, objetosColision); // Izquierda
crearHitbox(100, 1, 0, 0.5, 10, 600, scene, objetosColision);  // Derecha
crearHitbox(0, 1, -300, 200, 10, 0.5, scene, objetosColision); // Frontal
crearHitbox(0, 1, 300, 200, 10, 0.5, scene, objetosColision);  // Trasera
crearHitbox(0, -0.05, 0, 200, 0.1, 600, scene, objetosColision); // Suelo

//configuracion de la UI y las interacciones 
inicializarInteracciones();
inicializarUI(reproducirClick);

//bucle de renderizado
function animar() {
    requestAnimationFrame(animar);
    
    // Actualizar logica
    actualizarInteracciones(camara, Controles.isLocked);
    Controles.actualizar();

    // mostrar coordenadas para debug
    if (Controles.isLocked) {
        console.log(`Posición Cámara -> X: ${camara.position.x.toFixed(2)}, Y: ${camara.position.y.toFixed(2)}, Z: ${camara.position.z.toFixed(2)}`);
    }

    renderizador.render(scene, camara);
}
//iniciar el bucle 
animar();