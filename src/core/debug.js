import GUI from 'lil-gui';

let gui = null;

/**
 * Obtiene o inicializa la instancia de lil-gui.
 * @returns {GUI} Instancia de lil-gui.
 */
export function obtenerDebugGUI() {
    if (!gui) {
        gui = new GUI({ title: 'Panel de Depuración' });

        gui.close();
        gui.hide();

        if (window.esMovil) {
            // gui.hide();
        }

    }
    return gui;
}