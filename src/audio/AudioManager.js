import * as THREE from 'three';
import { broker } from '../world/EventBroker.js';

let listener;
let sonidoFondo, sonidoClick, sonidoPasos;
let sfxVolume = 1.5;
let sfxMuted = false;
let jugadorEstaCaminando = false;

// Carga e inicialización de audios
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
        sonidoClick.setVolume(sfxMuted ? 0 : sfxVolume);
    });

    // Sonido de pisadas
    sonidoPasos = new THREE.Audio(listener);
    audioLoader.load('assets/audio/Footsteps.mp3', (buffer) => {
        sonidoPasos.setBuffer(buffer);
        sonidoPasos.setLoop(true);
        sonidoPasos.setVolume(sfxMuted ? 0 : sfxVolume);
        if (jugadorEstaCaminando) {
            sonidoPasos.play();
        }
    });

    // Reproducir música y sonidos al hacer clic y ocultar menú
    document.body.addEventListener('click', () => {
        if (listener.context.state === 'suspended') listener.context.resume();
        if (!sonidoFondo.isPlaying && sonidoFondo.buffer) sonidoFondo.play();
        if (jugadorEstaCaminando && sonidoPasos && sonidoPasos.buffer && !sonidoPasos.isPlaying) {
            sonidoPasos.play();
        }
        
        const panelMenuSuperior = document.getElementById('panel-menu-superior');
        if (panelMenuSuperior) panelMenuSuperior.classList.add('oculto');
    });

    return listener;
}

// Sonar los botones en el menú
export function reproducirClick() {
    if (listener && listener.context.state === 'suspended') listener.context.resume();
    if (sonidoClick && sonidoClick.isPlaying) sonidoClick.stop();
    if (sonidoClick && sonidoClick.buffer) sonidoClick.play();
}

// Conectar sliders con el engine de audio
export function configurarcontrolsAudio() {
    const musicaSlider = document.getElementById('musica-slider');
    const musicaMute = document.getElementById('musica-mute');
    const sfxSlider = document.getElementById('sfx-slider');
    const sfxMute = document.getElementById('sfx-mute');

    let volumenMusicaAnterior = 0.3;

    if (musicaSlider && musicaMute) {
        musicaSlider.addEventListener('input', ({ target }) => {
            volumenMusicaAnterior = parseFloat(target.value);
            if (!musicaMute.checked && sonidoFondo) {
                sonidoFondo.setVolume(volumenMusicaAnterior);
            }
        });
        musicaMute.addEventListener('change', ({ target }) => {
            if (sonidoFondo) {
                sonidoFondo.setVolume(target.checked ? 0 : volumenMusicaAnterior);
            }
        });
    }

    if (sfxSlider && sfxMute) {
        sfxSlider.addEventListener('input', ({ target }) => {
            sfxVolume = parseFloat(target.value);
            actualizarVolumenSFX();
        });
        sfxMute.addEventListener('change', ({ target }) => {
            sfxMuted = target.checked;
            actualizarVolumenSFX();
        });
    }
}

function actualizarVolumenSFX() {
    const volumenEfectivo = sfxMuted ? 0 : sfxVolume;
    if (sonidoPasos) sonidoPasos.setVolume(volumenEfectivo);
    if (sonidoClick) sonidoClick.setVolume(volumenEfectivo);
}

export function actualizarAudioPasos(isWalking) {
    jugadorEstaCaminando = isWalking;
    if (sonidoPasos && sonidoPasos.buffer) {
        if (isWalking) {
            if (!sonidoPasos.isPlaying) sonidoPasos.play();
        } else {
            if (sonidoPasos.isPlaying) sonidoPasos.pause();
        }
    }
}

// cambios de estado del jugador (pisadas)
broker.on('jugadorCaminando', (isWalking) => {
    actualizarAudioPasos(isWalking);
});