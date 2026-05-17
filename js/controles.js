import { Vector3, MathUtils } from 'three';

//Clase para controlar la camara en primera persona

class ControlesPrimeraPersona {

    constructor(camara, domElement) {
        this.camara = camara;
        this.domElement = domElement;

        // Propiedades de la camara
        this.isLocked = false;
        this.velocidad = 0.15;
        this.sensibilidad = 0.002;

        // teclas para movimiento
        this.teclas = { w: false, a: false, s: false, d: false };

        // Ángulos de Euler para la cámara
        this.yaw = 0;
        this.pitch = 0;
        this.camara.rotation.order = 'YXZ'; // FPS

        this._vectorAdelante = new Vector3();
        this._vectorArriba = new Vector3(0, 1, 0);
        this._vectorDerecha = new Vector3();

        this._onMouseMove = this.onMouseMove.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onPointerlockChange = this.onPointerlockChange.bind(this);

        // Conectar eventos automaticamente
        this.conectar();
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

    //movimiento
	//se debe llamar la funcion en el cuadro de animacion 
    actualizar() {
        if (!this.isLocked) return;

        // Calcular hacia donde va la camara
        this._vectorAdelante.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();

        // Calcular el vector derecho (Producto Cruz)
        this._vectorDerecha.crossVectors(this._vectorAdelante, this._vectorArriba).normalize();

        // Aplicar el movimiento al presionar las teclas
        if (this.teclas.w) this.camara.position.addScaledVector(this._vectorAdelante, this.velocidad);
        if (this.teclas.s) this.camara.position.addScaledVector(this._vectorAdelante, -this.velocidad);
        if (this.teclas.a) this.camara.position.addScaledVector(this._vectorDerecha, -this.velocidad);
        if (this.teclas.d) this.camara.position.addScaledVector(this._vectorDerecha, this.velocidad);
    }
}

export { ControlesPrimeraPersona};