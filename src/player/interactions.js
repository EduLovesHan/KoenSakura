import { broker } from '../world/EventBroker.js';
import { idiomaActual } from '../core/i18n.js';
import { reproducirClick, cambiarMusicaFondo, obtenerMusicaFondoActual, reproducirSonidoInteractivo, detenerSonidoInteractivo } from '../audio/AudioManager.js';

const objetosInteractivos = [];
let objetoCercanoActual = null;
let uiInteraccion, modalDialogo, dialogoTitulo, dialogoTexto;
let timeoutSonidoEva = null;
let sonidoEvaActivo = false;

function actualizarBotonesMusicaActiva() {
    const songActual = obtenerMusicaFondoActual();
    const botonesMusica = document.querySelectorAll('.btn-musica');
    botonesMusica.forEach(btn => {
        const songPath = btn.getAttribute('data-song');
        if (songPath === songActual) {
            btn.classList.add('active-song');
        } else {
            btn.classList.remove('active-song');
        }
    });
}

// Enlazar elementos HTML y escuchar el teclado
export function inicializarinteractions() {
    uiInteraccion = document.getElementById('ui-interaccion');
    modalDialogo = document.getElementById('modal-dialogo');
    dialogoTitulo = document.getElementById('dialogo-titulo');
    dialogoTexto = document.getElementById('dialogo-texto');
    const opcionesMusica = document.getElementById('dialogo-opciones-musica');

    // Configurar botones de música
    const botonesMusica = document.querySelectorAll('.btn-musica');
    botonesMusica.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const songPath = btn.getAttribute('data-song');
            cambiarMusicaFondo(songPath);
            reproducirClick();
            actualizarBotonesMusicaActiva();
        });
    });

    document.addEventListener('keydown', ({ key }) => {
        if (key.toLowerCase() === 'e' && objetoCercanoActual) {
            if (modalDialogo && uiInteraccion) {
                const estaOculto = modalDialogo.classList.contains('oculto');
                if (estaOculto) {
                    const { titulo, texto } = objetoCercanoActual;
                    
                    dialogoTitulo.innerText = titulo[idiomaActual] || titulo;
                    dialogoTexto.innerText = texto[idiomaActual] || texto;
                    
                    if (objetoCercanoActual.esMusica && opcionesMusica) {
                        opcionesMusica.classList.remove('oculto');
                        actualizarBotonesMusicaActiva();
                        broker.emit('mostrarCursorMusica', true);
                    } else if (opcionesMusica) {
                        opcionesMusica.classList.add('oculto');
                    }
                    
                    modalDialogo.classList.remove('oculto');
                    reproducirClick();

                    // Reproducir audio dinámico si está configurado para la interacción (con el delay especificado o 1 segundo por defecto)
                    if (objetoCercanoActual.audio) {
                        const delay = objetoCercanoActual.delayAudio ?? 1000;
                        if (timeoutSonidoEva) {
                            clearTimeout(timeoutSonidoEva);
                        }
                        timeoutSonidoEva = setTimeout(() => {
                            reproducirSonidoInteractivo(objetoCercanoActual.audio);
                            timeoutSonidoEva = null;
                        }, delay);
                        sonidoEvaActivo = true;
                    }
                } else {
                    modalDialogo.classList.add('oculto');
                    if (opcionesMusica) opcionesMusica.classList.add('oculto');
                    broker.emit('mostrarCursorMusica', false);
                    reproducirClick();

                    if (timeoutSonidoEva) {
                        clearTimeout(timeoutSonidoEva);
                        timeoutSonidoEva = null;
                    }
                    detenerSonidoInteractivo();
                    sonidoEvaActivo = false;
                }
            }
        }
    });
}

// registrar nuevos objetos
export function registrarObjetoInteractivo(malla, distancia, titulo, texto, datosExtra = {}) {
    objetosInteractivos.push({ malla, distancia, titulo, texto, ...datosExtra });
}

// Funcion para cada frame de animación
export function actualizarinteractions(camara, isLocked) {
    if (modalDialogo) {
        const modalOculto = modalDialogo.classList.contains('oculto');
        if (modalOculto && sonidoEvaActivo) {
            if (timeoutSonidoEva) {
                clearTimeout(timeoutSonidoEva);
                timeoutSonidoEva = null;
            }
            detenerSonidoInteractivo();
            sonidoEvaActivo = false;
        }
    }

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
                    if (!modalDialogo.classList.contains('oculto')) {
                        modalDialogo.classList.add('oculto');
                        const opcionesMusica = document.getElementById('dialogo-opciones-musica');
                        if (opcionesMusica) opcionesMusica.classList.add('oculto');
                        broker.emit('mostrarCursorMusica', false);
                        reproducirClick();
                    }
                }
            }
        }
    }
}

// bus de eventos para registrar interacciones
broker.on('modeloCargado', ({ modelo, datosJSON }) => {
    const { interactivo, archivo } = datosJSON;
    if (interactivo) {
        const { distancia = 4.0, titulo = "Interactuable", texto = "", ...datosExtra } = interactivo;
        registrarObjetoInteractivo(
            modelo,
            distancia,
            titulo,
            texto,
            { ...datosExtra, archivo }
        );
    }
});
