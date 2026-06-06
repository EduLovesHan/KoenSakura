import './style.css';
import { inicializarMotor } from './core/motor.js';
import { ControlesPrimeraPersona } from './player/controles.js';
import { Skybox } from './world/skybox.js';

import { inicializarUI } from './ui/menu.js';
import { inicializarAudio, reproducirClick, configurarControlesAudio } from './audio/GestorAudio.js';
import { inicializarIluminacion, configurarControlesIluminacion, ambientLight, directionalLight } from './world/iluminacion.js';
import { cargarEscenario, phongUniformsGlobales } from './world/CargadorModelos.js';
import { crearHitbox, inicializarDebugColisiones, actualizarPlayerBox } from './world/colisiones.js';
import { inicializarInteracciones, actualizarInteracciones } from './player/interacciones.js';

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

// Inicializar depuración de colisiones e hitbox del jugador
inicializarDebugColisiones(scene, camara, Controles);
actualizarPlayerBox(camara.position);

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
    
    // Sincronizar y actualizar los uniforms de Phong en cada frame
    if (phongUniformsGlobales && ambientLight && directionalLight) {
        phongUniformsGlobales.uAmbientIntensity.value = ambientLight.intensity;
        phongUniformsGlobales.uAmbientColor.value.copy(ambientLight.color);
        phongUniformsGlobales.uLightIntensity.value = directionalLight.intensity;
        phongUniformsGlobales.uLightColor.value.copy(directionalLight.color);
        phongUniformsGlobales.uLightPosition.value.copy(directionalLight.position).applyMatrix4(camara.matrixWorldInverse);
        phongUniformsGlobales.uCameraPosition.value.set(0, 0, 0); // En espacio de cámara la posición de cámara es origen
    }
    
    // Mantener la esfera de noche centrada en la cámara
    if (skybox && typeof skybox.actualizar === 'function') {
        skybox.actualizar(camara);
    }
    renderizador.render(scene, camara);
}
//iniciar el bucle 
animar();
