import { Vector3, MathUtils, Raycaster, Audio, AudioLoader } from 'three';

//Clase para controlar la camara en primera persona

class ControlesPrimeraPersona {

    constructor(camara, domElement, objetosColision = [], audioListener) {
        this.camara = camara;
        this.domElement = domElement;
        this.objetosColision = objetosColision;

        // Propiedades de la camara
        this.isLocked = false;
        this.velocidad = 0.25;
        this.sensibilidad = 0.002;
        this.distanciaColision = 0.4; 

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
        this._raycaster = new Raycaster();
        this._direccionAux = new Vector3();
        this._origenRayo = new Vector3(); // Para no crear vectores nuevos cada frame

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
        this.domElement.addEventListener('click', () => this.domElement.requestPointerLock());
        document.addEventListener('pointerlockchange', this._onPointerlockChange);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    desconectar() {
        document.removeEventListener('pointerlockchange', this._onPointerlockChange);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
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

    // Método para verificar si el camino está despejado
    puedeMoverse(direccion) {
        if (this.objetosColision.length === 0) return true;

        // Bajamos el origen del rayo 1.2 unidades desde la cámara
        // Si la cámara está en 1.7, el rayo se lanza desde 0.5 (altura de las rodillas)
        this._origenRayo.copy(this.camara.position);
        this._origenRayo.y -= 1.2; 

        this._raycaster.set(this._origenRayo, direccion);
        const intersecciones = this._raycaster.intersectObjects(this.objetosColision, true);

        if (intersecciones.length > 0 && intersecciones[0].distance < this.distanciaColision) {
            return false;
        }
        return true;
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
	//se debe llamar la funcion en el cuadro de animacion 
    actualizar() {
        if (!this.isLocked) return;

        // Calcular hacia donde va la camara
        this._vectorAdelante.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();

        // Calcular el vector derecho (Producto Cruz)
        this._vectorDerecha.crossVectors(this._vectorAdelante, this._vectorArriba).normalize();

        // Aplicar el movimiento al presionar las teclas
        let enMovimiento = false;
        
        if (this.teclas.w) {
            if (this.puedeMoverse(this._vectorAdelante)) {
                this.camara.position.addScaledVector(this._vectorAdelante, this.velocidad);
                enMovimiento = true;
            }
        }
        if (this.teclas.s) {
            this._direccionAux.copy(this._vectorAdelante).negate();
            if (this.puedeMoverse(this._direccionAux)) {
                this.camara.position.addScaledVector(this._vectorAdelante, -this.velocidad);
                enMovimiento = true;
            }
        }
        if (this.teclas.a) {
            this._direccionAux.copy(this._vectorDerecha).negate();
            if (this.puedeMoverse(this._direccionAux)) {
                this.camara.position.addScaledVector(this._vectorDerecha, -this.velocidad);
                enMovimiento = true;
            }
        }
        if (this.teclas.d) {
            if (this.puedeMoverse(this._vectorDerecha)) {
                this.camara.position.addScaledVector(this._vectorDerecha, this.velocidad);
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