import GUI from 'lil-gui';

let gui = null;

/**
 * Obtiene o inicializa la instancia singleton de lil-gui.
 * @returns {GUI} Instancia de lil-gui.
 */
export function obtenerDebugGUI() {
    if (!gui) {
        gui = new GUI({ title: 'Panel de Depuración' });
    }
    return gui;
}
