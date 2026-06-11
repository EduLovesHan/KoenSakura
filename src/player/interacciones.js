import { broker } from '../world/EventBroker.js';

const objetosInteractivos = [];
let objetoCercanoActual = null;
let uiInteraccion, modalDialogo, dialogoTitulo, dialogoTexto;

// Enlazar los elementos HTML y escuchar el teclado
export function inicializarInteracciones() {
    uiInteraccion = document.getElementById('ui-interaccion');
    modalDialogo = document.getElementById('modal-dialogo');
    dialogoTitulo = document.getElementById('dialogo-titulo');
    dialogoTexto = document.getElementById('dialogo-texto');

    document.addEventListener('keydown', ({ key }) => {
        if (key.toLowerCase() === 'e' && objetoCercanoActual) {
            if (modalDialogo && uiInteraccion) {
                const estaOculto = modalDialogo.classList.contains('oculto');
                if (estaOculto) {
                    const { titulo, texto } = objetoCercanoActual;
                    dialogoTitulo.innerText = titulo;
                    dialogoTexto.innerText = texto;
                    modalDialogo.classList.remove('oculto');
                } else {
                    modalDialogo.classList.add('oculto');
                }
            }
        }
    });
}

// registrar nuevos objetos
export function registrarObjetoInteractivo(malla, distancia, titulo, texto) {
    objetosInteractivos.push({ malla, distancia, titulo, texto });
}

// Funcion para cada frame de animación
export function actualizarInteracciones(camara, isLocked) {
    if (isLocked) {
        let objetoEncontrado = null;
        const { position } = camara;
        
        for (const obj of objetosInteractivos) {
            const dist = position.distanceTo(obj.malla.position);
            if (dist <= obj.distancia) {
                objetoEncontrado = obj;
                break; 
            }
        }

        objetoCercanoActual = objetoEncontrado;

        if (uiInteraccion) {
            if (objetoCercanoActual && modalDialogo.classList.contains('oculto')) {
                uiInteraccion.classList.remove('oculto');
            } else {
                uiInteraccion.classList.add('oculto');
                if (modalDialogo && !objetoCercanoActual) {
                    modalDialogo.classList.add('oculto');
                }
            }
        }
    }
}

// Suscribirse al bus de eventos para registrar interactivos autónomamente
broker.on('modeloCargado', ({ modelo, datosJSON: { interactivo } }) => {
    if (interactivo) {
        const { distancia = 8, titulo = "Interactuable", texto = "" } = interactivo;
        registrarObjetoInteractivo(
            modelo,
            distancia,
            titulo,
            texto
        );
    }
});
