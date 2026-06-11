class EventBroker {
    constructor() {
        this.listeners = {};
    }

    /**
     * Se suscribe a un evento.
     * @param {string} event Nombre del evento.
     * @param {Function} callback Función a ejecutar cuando ocurra el evento.
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Cancela la suscripción a un evento.
     * @param {string} event Nombre del evento.
     * @param {Function} callback Función originalmente suscrita.
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Emite un evento con datos asociados.
     * @param {string} event Nombre del evento.
     * @param {any} data Datos que se pasarán a los callbacks correspondientes.
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBroker] Error ejecutando callback para el evento "${event}":`, error);
            }
        });
    }
}

export const broker = new EventBroker();
