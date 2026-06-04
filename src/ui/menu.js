
export function inicializarUI(onInteraccion) {
    // Lógica del menú superior
    const btnMenuSuperior = document.getElementById('btn-menu-superior');
    const panelMenuSuperior = document.getElementById('panel-menu-superior');

    if (btnMenuSuperior) {
        btnMenuSuperior.addEventListener('click', (evento) => {
            evento.stopPropagation(); 
            onInteraccion(); 
            panelMenuSuperior.classList.toggle('oculto');
        });
    }

    if (panelMenuSuperior) {
        panelMenuSuperior.addEventListener('click', (evento) => {
            evento.stopPropagation();
        });
    }

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

    // Logica de pestañas del menu superior
    const botonesPestañas = document.querySelectorAll('.btn-opcion');
    const contenidosPestañas = document.querySelectorAll('.tab-contenido');

    botonesPestañas.forEach(boton => {
        boton.addEventListener('click', () => {
            onInteraccion();
            
            const tabDestino = boton.getAttribute('data-tab');

            contenidosPestañas.forEach(contenido => {
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