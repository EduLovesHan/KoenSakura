import GUI from 'lil-gui';

let gui = null;

/**
 * Obtiene o inicializa la instancia de lil-gui.
 * @returns {GUI} Instancia de lil-gui.
 */
export function obtenerDebugGUI() {
    if (!gui) {
        gui = new GUI({ title: 'Panel de Depuración' });

        // Por defecto, hacer que el panel aparezca minimizado
        gui.close();

        if (window.esMovil) {
            gui.hide();
        }

    }
    return gui;
}