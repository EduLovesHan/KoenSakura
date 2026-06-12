import GUI from 'lil-gui';

let gui = null;

/**
 * Obtiene o inicializa la instancia singleton de lil-gui.
 * @returns {GUI} Instancia de lil-gui.
 */
export function obtenerDebugGUI() {
    if (!gui) {
        gui = new GUI({ title: 'Panel de Depuración' });
        
        // Por defecto, hacer que el panel aparezca minimizado
        gui.close();

        // Si es móvil o pantalla táctil pequeña, ocultar el panel de depuración completamente para liberar espacio
        if (window.esMovil) {
            gui.hide();
        }

        // Hacer que se pueda arrastrar (mover)
        hacerDraggable(gui);
    }
    return gui;
}

function hacerDraggable(guiInstance) {
    const { domElement: el } = guiInstance;
    const titleEl = el.querySelector('.title');
    if (!titleEl) return;

    // Estilo visual del cursor sobre el título para indicar que es arrastrable
    titleEl.style.cursor = 'move';
    titleEl.style.userSelect = 'none';

    let active = false;
    let shiftX = 0;
    let shiftY = 0;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    titleEl.addEventListener('mousedown', dragStart, false);
    document.addEventListener('mouseup', dragEnd, false);
    document.addEventListener('mousemove', drag, false);

    titleEl.addEventListener('touchstart', dragStart, false);
    document.addEventListener('touchend', dragEnd, false);
    document.addEventListener('touchmove', drag, false);

    // Evitar que lil-gui collapse/se expanda al arrastrar, solo al hacer clic simple
    titleEl.addEventListener('click', (e) => {
        if (hasMoved) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    function dragStart(e) {
        const { type, touches, clientX, clientY, target } = e;
        const currentX = type === 'touchstart' ? touches[0].clientX : clientX;
        const currentY = type === 'touchstart' ? touches[0].clientY : clientY;
        
        const rect = el.getBoundingClientRect();
        
        shiftX = currentX - rect.left;
        shiftY = currentY - rect.top;

        startX = currentX;
        startY = currentY;
        hasMoved = false;

        if (target === titleEl || titleEl.contains(target)) {
            active = true;
        }
    }

    function dragEnd() {
        active = false;
    }

    function drag(e) {
        if (active) {
            const { type, touches, clientX, clientY } = e;
            const currentX = type === 'touchmove' ? touches[0].clientX : clientX;
            const currentY = type === 'touchmove' ? touches[0].clientY : clientY;

            if (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5) {
                hasMoved = true;
            }

            if (e.cancelable) e.preventDefault();

            el.style.left = (currentX - shiftX) + 'px';
            el.style.top = (currentY - shiftY) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
    }
}
