import { animacionesUI } from './GestorAnimaciones.js';
import { gsap } from 'gsap';

// Cierra el menú superior animando el icono y ocultando el contenedor
export function cerrarMenuSuperior() {
    const panelMenuSuperior = document.getElementById('panel-menu-superior');
    const botonMenuSuperior = document.getElementById('btn-menu-superior');
    
    if (panelMenuSuperior && !panelMenuSuperior.classList.contains('oculto')) {
        const iconoBoton = botonMenuSuperior ? botonMenuSuperior.querySelector('.icono-sakura') : null;
        cerrarMenuSuperiorConIcono(panelMenuSuperior, iconoBoton);
    }
}

// Alterna la visibilidad del menú principal superior
export function alternarMenuPrincipal(onInteraccion) {
    const panelMenuSuperior = document.getElementById('panel-menu-superior');
    const botonMenuSuperior = document.getElementById('btn-menu-superior');
    
    if (!panelMenuSuperior || !botonMenuSuperior) return;

    onInteraccion();

    const estaOculto = panelMenuSuperior.classList.contains('oculto');
    const iconoBoton = botonMenuSuperior.querySelector('.icono-sakura');

    if (estaOculto) {
        abrirMenuSuperior(panelMenuSuperior, iconoBoton);
    } else {
        cerrarMenuSuperiorConIcono(panelMenuSuperior, iconoBoton);
    }
}

// Abre el menú superior y rota el icono de sakura
function abrirMenuSuperior(panelMenuSuperior, iconoBoton) {
    panelMenuSuperior.classList.remove('oculto');
    animacionesUI.aparecerMenu(panelMenuSuperior);
    
    if (iconoBoton) {
        gsap.to(iconoBoton, {
            rotation: 180,
            duration: 0.5,
            ease: 'power2.inOut'
        });
    }
}

// Cierra el menú superior con animación y restablece la rotación del icono de sakura
function cerrarMenuSuperiorConIcono(panelMenuSuperior, iconoBoton) {
    animacionesUI.desaparecerMenu(panelMenuSuperior, () => {
        panelMenuSuperior.classList.add('oculto');
    });
    
    if (iconoBoton) {
        gsap.to(iconoBoton, {
            rotation: 0,
            duration: 0.5,
            ease: 'power2.inOut'
        });
    }
}

// Inicializa toda la interfaz de usuario del menú y carruseles
export function inicializarUI(onInteraccion) {
    const botonMenuSuperior = document.getElementById('btn-menu-superior');
    const panelMenuSuperior = document.getElementById('panel-menu-superior');

    if (botonMenuSuperior) {
        botonMenuSuperior.addEventListener('click', (eventoClick) => {
            eventoClick.stopPropagation(); 
            alternarMenuPrincipal(onInteraccion);
        });
    }

    if (panelMenuSuperior) {
        panelMenuSuperior.addEventListener('click', (eventoClick) => {
            eventoClick.stopPropagation();
        });
    }

    // Inicialización del carrusel de pestañas
    function inicializarCarrusel(selectorContenedor, idBotonSiguiente, idBotonAnterior) {
        let indicePaginaActual = 0;
        const contenedorCarrusel = document.querySelector(selectorContenedor);
        if (!contenedorCarrusel) return () => {}; // Retorna función vacía si no existe

        const paginasCarrusel = contenedorCarrusel.querySelectorAll('.control-slide');
        const puntosNavegacion = contenedorCarrusel.querySelectorAll('.punto');
        const botonSiguiente = document.getElementById(idBotonSiguiente);
        const botonAnterior = document.getElementById(idBotonAnterior);

        function mostrarPagina(indicePaginaDeseado) {
            if (indicePaginaDeseado >= paginasCarrusel.length) {
                indicePaginaActual = 0;
            } else if (indicePaginaDeseado < 0) {
                indicePaginaActual = paginasCarrusel.length - 1;
            } else {
                indicePaginaActual = indicePaginaDeseado;
            }

            paginasCarrusel.forEach((paginaElemento, indiceElemento) => {
                const esPaginaActiva = indiceElemento === indicePaginaActual;
                paginaElemento.classList.toggle('active', esPaginaActiva);
                
                if (puntosNavegacion[indiceElemento]) {
                    puntosNavegacion[indiceElemento].classList.toggle('active', esPaginaActiva);
                }
            });
        }

        if (botonSiguiente && botonAnterior) {
            botonSiguiente.addEventListener('click', (eventoClick) => {
                eventoClick.stopPropagation();
                onInteraccion();
                mostrarPagina(indicePaginaActual + 1);
            });
            botonAnterior.addEventListener('click', (eventoClick) => {
                eventoClick.stopPropagation();
                onInteraccion();
                mostrarPagina(indicePaginaActual - 1);
            });
        }
        return mostrarPagina; 
    }

    const restablecerCarruselControles = inicializarCarrusel('#tab-controles', 'next-control', 'prev-control');
    const restablecerCarruselAjustes = inicializarCarrusel('#tab-ajustes', 'next-ajustes', 'prev-ajustes');

    // Configuración de pestañas del menú superior
    const botonesPestanas = document.querySelectorAll('.btn-opcion');
    const contenidosPestanas = document.querySelectorAll('.tab-contenido');

    botonesPestanas.forEach(botonPestana => {
        // Efecto de hover dinámico en los botones de pestañas
        botonPestana.addEventListener('mouseenter', () => {
            animacionesUI.pulsoBoton(botonPestana);
        });

        botonPestana.addEventListener('click', () => {
            onInteraccion();
            
            const tabDestino = botonPestana.dataset.tab;

            contenidosPestanas.forEach(contenidoTab => {
                contenidoTab.classList.add('oculto');
            });

            const pestañaAMostrar = document.getElementById(`tab-${tabDestino}`);
            if (pestañaAMostrar) {
                pestañaAMostrar.classList.remove('oculto');
                
                if (tabDestino === 'controles') {
                    restablecerCarruselControles(0); 
                } else if (tabDestino === 'ajustes') {
                    restablecerCarruselAjustes(0); 
                }
            }
        });
    });
}
