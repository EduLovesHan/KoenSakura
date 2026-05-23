import { Vector3, MathUtils, Raycaster } from 'three';

//Clase para controlar la camara en primera persona

class ControlesPrimeraPersona {

    constructor(camara, domElement, objetosColision = []) {
        this.camara = camara;
        this.domElement = domElement;
        this.objetosColision = objetosColision;

        // Propiedades de la camara
        this.isLocked = false;
        this.velocidad = 0.15;
        this.sensibilidad = 0.002;
        this.distanciaColision = 0.7; // Radio de "cuerpo" de la cámara

        // teclas para movimiento
        this.teclas = { w: false, a: false, s: false, d: false };

        // Ángulos de Euler para la cámara
        this.yaw = Math.PI; // Inicia mirando 180 grados (hacia el otro lado)
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

    //movimiento
	//se debe llamar la funcion en el cuadro de animacion 
    actualizar() {
        if (!this.isLocked) return;

        // Calcular hacia donde va la camara
        this._vectorAdelante.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();

        // Calcular el vector derecho (Producto Cruz)
        this._vectorDerecha.crossVectors(this._vectorAdelante, this._vectorArriba).normalize();

        // Calcular dirección de movimiento final basada en teclas presionadas
        this._direccionAux.set(0, 0, 0);
        if (this.teclas.w) this._direccionAux.add(this._vectorAdelante);
        if (this.teclas.s) this._direccionAux.sub(this._vectorAdelante);
        if (this.teclas.a) this._direccionAux.sub(this._vectorDerecha);
        if (this.teclas.d) this._direccionAux.add(this._vectorDerecha);

        if (this._direccionAux.lengthSq() > 0) {
            this._direccionAux.normalize();
            
            if (this.puedeMoverse(this._direccionAux)) {
                this.camara.position.addScaledVector(this._direccionAux, this.velocidad);
            }
        }
    }
}

export { ControlesPrimeraPersona};