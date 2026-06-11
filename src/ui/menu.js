import { animacionesUI } from './GestorAnimaciones.js';
import { gsap } from 'gsap';

export function cerrarMenuSuperior() {
    const panelMenuSuperior = document.getElementById('panel-menu-superior');
    if (panelMenuSuperior && !panelMenuSuperior.classList.contains('oculto')) {
        animacionesUI.desaparecerMenu(panelMenuSuperior, () => {
            panelMenuSuperior.classList.add('oculto');
        });
        
        const btnMenuSuperior = document.getElementById('btn-menu-superior');
        if (btnMenuSuperior) {
            const icono = btnMenuSuperior.querySelector('.icono-sakura');
            if (icono) {
                gsap.to(icono, {
                    rotation: 0,
                    duration: 0.5,
                    ease: 'power2.inOut'
                });
            }
        }
    }
}

export function inicializarUI(onInteraccion) {
    // Lógica del menú superior
    const btnMenuSuperior = document.getElementById('btn-menu-superior');
    const panelMenuSuperior = document.getElementById('panel-menu-superior');

    if (btnMenuSuperior) {
        btnMenuSuperior.addEventListener('click', (evento) => {
            evento.stopPropagation(); 
            onInteraccion(); 
            
            const estaOculto = panelMenuSuperior.classList.contains('oculto');
            const icono = btnMenuSuperior.querySelector('.icono-sakura');

            if (estaOculto) {
                // Abrir
                panelMenuSuperior.classList.remove('oculto');
                animacionesUI.aparecerMenu(panelMenuSuperior);
                
                if (icono) {
                    gsap.to(icono, {
                        rotation: 180,
                        duration: 0.5,
                        ease: 'power2.inOut'
                    });
                }
            } else {
                // Cerrar
                animacionesUI.desaparecerMenu(panelMenuSuperior, () => {
                    panelMenuSuperior.classList.add('oculto');
                });
                
                if (icono) {
                    gsap.to(icono, {
                        rotation: 0,
                        duration: 0.5,
                        ease: 'power2.inOut'
                    });
                }
            }
        });
    }

    if (panelMenuSuperior) {
        panelMenuSuperior.addEventListener('click', (evento) => {
            evento.stopPropagation();
        });
    }

    // Creación e inicialización de carruseles
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
                onInteraccion();
                mostrarPagina(indiceActual + 1);
            });
            btnPrev.addEventListener('click', (e) => {
                e.stopPropagation();
                onInteraccion();
                mostrarPagina(indiceActual - 1);
            });
        }
        return mostrarPagina; 
    }

    const resetCarruselControles = inicializarCarrusel('#tab-controles', 'next-control', 'prev-control');
    const resetCarruselAjustes = inicializarCarrusel('#tab-ajustes', 'next-ajustes', 'prev-ajustes');

    // Lógica de pestañas del menú superior
    const botonesPestanas = document.querySelectorAll('.btn-opcion');
    const contenidosPestanas = document.querySelectorAll('.tab-contenido');

    botonesPestanas.forEach(boton => {
        // Efecto de hover dinámico en los botones de pestañas del menú
        boton.addEventListener('mouseenter', () => {
            animacionesUI.pulsoBoton(boton);
        });

        boton.addEventListener('click', () => {
            onInteraccion();
            
            const { tab: tabDestino } = boton.dataset;

            contenidosPestanas.forEach(contenido => {
                contenido.classList.add('oculto');
            });

            const tabAMostrar = document.getElementById(`tab-${tabDestino}`);
            if (tabAMostrar) {
                tabAMostrar.classList.remove('oculto');
                
                if (tabDestino === 'controles') {
                    resetCarruselControles(0); 
                } else if (tabDestino === 'ajustes') {
                    resetCarruselAjustes(0); 
                }
            }
        });
    });
}
