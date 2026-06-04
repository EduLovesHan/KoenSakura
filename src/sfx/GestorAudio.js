import * as THREE from 'three';

let listener;
let sonidoFondo, sonidoClick;

// Carga e inicializacion de audios
export function inicializarAudio(camara) {
    listener = new THREE.AudioListener();
    camara.add(listener);

    const audioLoader = new THREE.AudioLoader();

    // Música de fondo
    sonidoFondo = new THREE.Audio(listener);
    audioLoader.load('assets/audio/MusicaFondo.mp3', (buffer) => {
        sonidoFondo.setBuffer(buffer);
        sonidoFondo.setLoop(true); 
        sonidoFondo.setVolume(0.3);
    });

    // Efecto de clic
    sonidoClick = new THREE.Audio(listener);
    audioLoader.load('assets/audio/click-boton.mp3', (buffer) => {
        sonidoClick.setBuffer(buffer);
        sonidoClick.setLoop(false);
        sonidoClick.setVolume(1.5);
    });

    // Reproducir música al hacer clic y ocultar menú 
    document.body.addEventListener('click', () => {
        if (listener.context.state === 'suspended') listener.context.resume();
        if (!sonidoFondo.isPlaying && sonidoFondo.buffer) sonidoFondo.play();
        
        const panelMenuSuperior = document.getElementById('panel-menu-superior');
        if (panelMenuSuperior) panelMenuSuperior.classList.add('oculto');
    });

    return listener; 
}

// Sonar los botones en el menu
export function reproducirClick() {
    if (listener && listener.context.state === 'suspended') listener.context.resume();
    if (sonidoClick && sonidoClick.isPlaying) sonidoClick.stop();
    if (sonidoClick && sonidoClick.buffer) sonidoClick.play();
}

// Conectar sliders con el motor de audio
export function configurarControlesAudio(Controles) {
    const musicaSlider = document.getElementById('musica-slider');
    const musicaMute = document.getElementById('musica-mute');
    const sfxSlider = document.getElementById('sfx-slider');
    const sfxMute = document.getElementById('sfx-mute');

    let volumenMusicaAnterior = 0.3;

    if (musicaSlider && musicaMute) {
        musicaSlider.addEventListener('input', (e) => {
            volumenMusicaAnterior = parseFloat(e.target.value);
            if (!musicaMute.checked && sonidoFondo) {
                sonidoFondo.setVolume(volumenMusicaAnterior);
            }
        });
        musicaMute.addEventListener('change', (e) => {
            if(sonidoFondo) {
                sonidoFondo.setVolume(e.target.checked ? 0 : volumenMusicaAnterior);
            }
        });
    }

    if (sfxSlider && sfxMute) {
        sfxSlider.addEventListener('input', (e) => {
            const volumen = parseFloat(e.target.value);
            Controles.setSfxVolume(volumen);
            if (sonidoClick) sonidoClick.setVolume(volumen);
        });
        sfxMute.addEventListener('change', (e) => {
            const isMuted = e.target.checked;
            Controles.setSfxMute(isMuted);
            if (sonidoClick) sonidoClick.setVolume(isMuted ? 0 : parseFloat(sfxSlider.value));
        });
    }
}