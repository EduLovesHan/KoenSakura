import { Vector3, MathUtils, Audio, AudioLoader } from 'three';
import { resolverMovimientoJugador } from '../world/colisiones.js';

//Clase para controlar la camara en primera persona

class ControlesPrimeraPersona {

    constructor(camara, domElement, objetosColision = [], audioListener) {
        this.camara = camara;
        this.domElement = domElement;
        this.objetosColision = objetosColision;

        // Propiedades de la camara
        this.isLocked = false;
        this.velocidad = 0.5;
        this.sensibilidad = 0.002;

        // teclas para movimiento
        this.teclas = { w: false, a: false, s: false, d: false };

        // Ángulos de Euler para la cámara
        this.yaw = Math.PI; // Empezamos mirando hacia el -Z
        this.pitch = 0;
        this.camara.rotation.order = 'YXZ'; // FPS
        this.camara.rotation.set(this.pitch, this.yaw, 0); // Aplicar rotación inicial

        this._vectorAdelante = new Vector3();
        this._vectorArriba = new Vector3(0, 1, 0);
        this._vectorDerecha = new Vector3();

        this._onMouseMove = this.onMouseMove.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onPointerlockChange = this.onPointerlockChange.bind(this);

        // Configuración volumen SFX
        this.sfxVolume = 1.5;
        this.sfxMuted = false;

        // Conectar eventos automaticamente
        this.conectar();

        // Configurar Audio para los pasos
        this.pasosAudio = null;
        if (audioListener) {
            this.pasosAudio = new Audio(audioListener);
            const audioLoader = new AudioLoader();
            audioLoader.load('assets/audio/Footsteps.mp3', (buffer) => {
                this.pasosAudio.setBuffer(buffer);
                this.pasosAudio.setLoop(true); // Repetir mientras caminamos
                this.pasosAudio.setVolume(this.sfxMuted ? 0 : this.sfxVolume); 
            });
        }
    }

    conectar() {
        this.domElement.addEventListener('click', (e) => {
            // No ocultar cursor si se hace clic dentro del menú superior, botón sakura o lil-gui
            if (e.target.closest('#panel-menu-superior') || e.target.closest('#btn-menu-superior') || e.target.closest('.lil-gui')) {
                return;
            }
            this.domElement.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', this._onPointerlockChange);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    // eventos

    onPointerlockChange() {
        this.isLocked = document.pointerLockElement === this.domElement;
    }

    onMouseMove(evento) {
        if (!this.isLocked) return;

        this.yaw -= evento.movementX * this.sensibilidad;
        this.pitch -= evento.movementY * this.sensibilidad;

        const limite = Math.PI / 2 - 0.01;
        this.pitch = MathUtils.clamp(this.pitch, -limite, limite);

        this.camara.rotation.set(this.pitch, this.yaw, 0);
    }

    onKeyDown(evento) {
        switch (evento.key.toLowerCase()) {
            case 'w': this.teclas.w = true; break;
            case 'a': this.teclas.a = true; break;
            case 's': this.teclas.s = true; break;
            case 'd': this.teclas.d = true; break;
        }
    }

    onKeyUp(evento) {
        switch (evento.key.toLowerCase()) {
            case 'w': this.teclas.w = false; break;
            case 'a': this.teclas.a = false; break;
            case 's': this.teclas.s = false; break;
            case 'd': this.teclas.d = false; break;
        }
    }
    setSfxVolume(volumen) {
        this.sfxVolume = volumen;
        if (this.pasosAudio) this.pasosAudio.setVolume(this.sfxMuted ? 0 : this.sfxVolume);
    }

    setSfxMute(isMuted) {
        this.sfxMuted = isMuted;
        if (this.pasosAudio) this.pasosAudio.setVolume(this.sfxMuted ? 0 : this.sfxVolume);
    }

    //movimiento
    actualizar() {
        if (!this.isLocked) return;

        // Calcular hacia donde va la camara (movimiento plano en el eje XZ)
        this._vectorAdelante.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();

        // Calcular el vector derecho (Producto Cruz)
        this._vectorDerecha.crossVectors(this._vectorAdelante, this._vectorArriba).normalize();

        // Calcular desplazamiento deseado combinando todas las teclas presionadas
        const desplazamiento = new Vector3(0, 0, 0);

        if (this.teclas.w) desplazamiento.add(this._vectorAdelante);
        if (this.teclas.s) desplazamiento.addScaledVector(this._vectorAdelante, -1);
        if (this.teclas.a) desplazamiento.addScaledVector(this._vectorDerecha, -1);
        if (this.teclas.d) desplazamiento.add(this._vectorDerecha);

        let enMovimiento = false;

        if (desplazamiento.lengthSq() > 0) {
            // Normalizar la dirección del desplazamiento acumulado y escalarla por la velocidad
            desplazamiento.normalize().multiplyScalar(this.velocidad);

            // Resolver colisión por deslizamiento (AABB)
            const nuevaPosicion = resolverMovimientoJugador(this.camara.position, desplazamiento);

            // Verificar si hubo un desplazamiento real para considerarlo en movimiento
            if (this.camara.position.distanceToSquared(nuevaPosicion) > 0.0001) {
                this.camara.position.copy(nuevaPosicion);
                enMovimiento = true;
            }
        }

        // Controlar la reproducción del sonido de los pasos
        if (this.pasosAudio && this.pasosAudio.buffer) {
            if (enMovimiento) {
                if (!this.pasosAudio.isPlaying) this.pasosAudio.play();
            } else {
                if (this.pasosAudio.isPlaying) this.pasosAudio.pause();
            }
        }
    }
}

export { ControlesPrimeraPersona};
