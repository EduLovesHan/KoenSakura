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

        // Hacer que se pueda arrastrar (mover)
        hacerDraggable(gui);
    }
    return gui;
}

function hacerDraggable(guiInstance) {
    const el = guiInstance.domElement;
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
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        const rect = el.getBoundingClientRect();
        
        shiftX = clientX - rect.left;
        shiftY = clientY - rect.top;

        startX = clientX;
        startY = clientY;
        hasMoved = false;

        if (e.target === titleEl || titleEl.contains(e.target)) {
            active = true;
        }
    }

    function dragEnd(e) {
        active = false;
    }

    function drag(e) {
        if (active) {
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            if (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5) {
                hasMoved = true;
            }

            if (e.cancelable) e.preventDefault();

            el.style.left = (clientX - shiftX) + 'px';
            el.style.top = (clientY - shiftY) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
    }
}
