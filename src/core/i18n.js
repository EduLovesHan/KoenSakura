export let idiomaActual = localStorage.getItem('koensakura_lang') || 'es';

export const diccionario = {
    es: {
        menu_titulo: "Menú",
        btn_general: "General",
        btn_ayuda: "Ayuda",
        btn_controles: "Controles",
        btn_ajustes: "Ajustes",
        btn_creditos: "Créditos",
        ajustes_sonido: "Sonido",
        ajustes_musica: "Música",
        ajustes_sfx: "SFX",
        ajustes_iluminacion: "Iluminación",
        ajustes_noche: "Modo Noche",
        ajustes_idioma: "Idioma",
        btn_volver: "Volver",
        texto_general: "Una experiencia web interactiva en 3D desarrollada como proyecto final de Programación Gráfica. Consiste en un recorrido virtual inmersivo en primera persona a través de una plaza con estética japonesa al estilo low-poly.",
        texto_ayuda: "En construcción",
        texto_creditos_titulo: "Desarrollado por:",
        btn_activar: "Activar",
        carga_subtitulo: "Paseo Virtual · 3D",
        btn_entrar: "Entrar al Paseo",
        carga_progreso: "Cargando...",
        ui_interactuar: "Interactuar",
        musica_defecto: "Defecto",
        ctrl_adelante: "Adelante",
        ctrl_izq: "Izquierda",
        ctrl_atras: "Atrás",
        ctrl_der: "Derecha",
        ctrl_interact: "Interactuar",
        ctrl_cursor: "Mostrar cursor",
        ctrl_camara: "Mover la cámara"
    },
    en: {
        menu_titulo: "Menu",
        btn_general: "General",
        btn_ayuda: "Help",
        btn_controles: "Controls",
        btn_ajustes: "Settings",
        btn_creditos: "Credits",
        ajustes_sonido: "Sound",
        ajustes_musica: "Music",
        ajustes_sfx: "SFX",
        ajustes_iluminacion: "Lighting",
        ajustes_noche: "Night Mode",
        ajustes_idioma: "Language",
        btn_volver: "Back",
        texto_general: "A 3D interactive web experience developed as a final project for Computer Graphics. It consists of a first-person immersive virtual tour through a Japanese-style low-poly plaza.",
        texto_ayuda: "Under construction",
        texto_creditos_titulo: "Developed by:",
        btn_activar: "Enable",
        carga_subtitulo: "3D Virtual Tour",
        btn_entrar: "Enter Tour",
        carga_progreso: "Loading...",
        ui_interactuar: "Interact",
        musica_defecto: "Default",
        ctrl_adelante: "Forward",
        ctrl_izq: "Left",
        ctrl_atras: "Backward",
        ctrl_der: "Right",
        ctrl_interact: "Interact",
        ctrl_cursor: "Show cursor",
        ctrl_camara: "Move camera"
    }
};

export function setIdioma(nuevoIdioma) {
    idiomaActual = nuevoIdioma;
    localStorage.setItem('koensakura_lang', idiomaActual);
    actualizarDOM();
}

export function actualizarDOM() {
    const elementos = document.querySelectorAll('[data-i18n]');
    elementos.forEach(el => {
        const clave = el.getAttribute('data-i18n');
        if (diccionario[idiomaActual][clave]) {
            el.textContent = diccionario[idiomaActual][clave];
        }
    });

    // Si estamos en diseño móvil (cuadrícula oculta) y hay una pestaña abierta,
    // el título superior debe ser el de la pestaña y no "Menú"
    const gridBotones = document.querySelector('.contenedor-botones-grid');
    if (gridBotones && gridBotones.classList.contains('oculto')) {
        const activeTab = document.querySelector('.tab-contenido:not(.oculto)');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            const botonPestana = document.querySelector(`.contenedor-botones-grid .btn-opcion[data-tab="${tabName}"]`);
            const tituloMenu = document.getElementById('titulo-menu');
            if (botonPestana && tituloMenu) {
                tituloMenu.textContent = botonPestana.textContent;
            }
        }
    }
}
