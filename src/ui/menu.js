import { animationsUI } from './AnimationManager.js';
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
    animationsUI.aparecerMenu(panelMenuSuperior);
    
    if (iconoBoton) {
        gsap.to(iconoBoton, {
            rotation: 180,
            duration: 0.5,
            ease: 'power2.inOut'
        });
    }
}

function resetearEstadoMenu() {
    // Ocultar contenidos de pestañas
    document.querySelectorAll('.tab-contenido').forEach(tab => tab.classList.add('oculto'));
    // Mostrar botones principales
    const contenedorBotones = document.querySelector('.contenedor-botones-grid');
    if (contenedorBotones) contenedorBotones.classList.remove('oculto');
    // Restaurar título
    const tituloMenu = document.querySelector('#panel-menu-superior h3');
    if (tituloMenu) tituloMenu.textContent = 'Menú';
    // Ocultar botón volver
    const btnVolver = document.getElementById('btn-volver-menu');
    if (btnVolver) btnVolver.classList.add('oculto');
}

// Cierra el menú superior con animación y restablece la rotación del icono de sakura
function cerrarMenuSuperiorConIcono(panelMenuSuperior, iconoBoton) {
    animationsUI.desaparecerMenu(panelMenuSuperior, () => {
        panelMenuSuperior.classList.add('oculto');
        setTimeout(() => {
            resetearEstadoMenu();
        }, 400);
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

    const restablecerCarruselcontrols = inicializarCarrusel('#tab-controls', 'next-control', 'prev-control');
    const restablecerCarruselAjustes = inicializarCarrusel('#tab-ajustes', 'next-ajustes', 'prev-ajustes');

    // Configuración de pestañas del menú superior
    const botonesPestanas = document.querySelectorAll('.contenedor-botones-grid .btn-opcion');
    const contenidosPestanas = document.querySelectorAll('.tab-contenido');
    const gridBotones = document.querySelector('.contenedor-botones-grid');
    const btnVolver = document.getElementById('btn-volver-menu');
    const tituloMenu = document.getElementById('titulo-menu');

    // Manejador de clic para el botón volver
    if (btnVolver) {
        btnVolver.addEventListener('click', (eventoClick) => {
            eventoClick.stopPropagation();
            onInteraccion();

            // Ocultar pestañas y botón volver
            contenidosPestanas.forEach(contenidoTab => {
                contenidoTab.classList.add('oculto');
            });
            btnVolver.classList.add('oculto');

            // Mostrar cuadrícula de botones y restaurar el título
            if (gridBotones) {
                gridBotones.classList.remove('oculto');
            }
            if (tituloMenu) {
                tituloMenu.textContent = 'Menú';
            }
        });
    }

    botonesPestanas.forEach(botonPestana => {
        // Efecto de hover dinámico en los botones de pestañas
        botonPestana.addEventListener('mouseenter', () => {
            animationsUI.pulsoBoton(botonPestana);
        });

        botonPestana.addEventListener('click', () => {
            onInteraccion();
            
            const tabDestino = botonPestana.dataset.tab;
            
            // Detectar si la vista corresponde a móvil (ancho <= 1024px, alto <= 600px o flag esMovil del engine)
            const isMobileLayout = window.innerWidth <= 1024 || window.innerHeight <= 600 || window.esMovil;

            if (isMobileLayout) {
                // Comportamiento móvil: ocultar cuadrícula y mostrar botón volver con título cambiado
                if (gridBotones) {
                    gridBotones.classList.add('oculto');
                }
                if (btnVolver) {
                    btnVolver.classList.remove('oculto');
                }
                if (tituloMenu) {
                    tituloMenu.textContent = botonPestana.innerText || botonPestana.textContent;
                }
            } else {
                // Comportamiento PC: mantener cuadrícula, ocultar botón volver y título estático "Menú"
                if (gridBotones) {
                    gridBotones.classList.remove('oculto');
                }
                if (btnVolver) {
                    btnVolver.classList.add('oculto');
                }
                if (tituloMenu) {
                    tituloMenu.textContent = 'Menú';
                }
            }

            contenidosPestanas.forEach(contenidoTab => {
                contenidoTab.classList.add('oculto');
            });

            const pestañaAMostrar = document.getElementById(`tab-${tabDestino}`);
            if (pestañaAMostrar) {
                pestañaAMostrar.classList.remove('oculto');
                
                if (tabDestino === 'controls') {
                    restablecerCarruselcontrols(0); 
                } else if (tabDestino === 'ajustes') {
                    restablecerCarruselAjustes(0); 
                }
            }
        });
    });
}
