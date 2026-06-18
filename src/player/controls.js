import { Vector3, MathUtils } from 'three';
import { resolverMovimientoJugador } from '../world/collisions.js';
import { broker } from '../world/EventBroker.js';
import nipplejs from 'nipplejs';

// Controles en primera persona
class controlsPrimeraPersona {

    constructor(camara, domElement, objetosColision = []) {
        this.camara = camara;
        this.domElement = domElement;
        this.objetosColision = objetosColision;

        this.inicializarSistemas();
    }

    inicializarSistemas() {
        this.inicializarDeteccionDispositivo();
        this.configurarCompatibilidadTeclas();
        this.inicializarPropiedadesCamara();
        this.vincularEventosEntrada();
        this.verificarInicializacioncontrolsMoviles();
    }

    inicializarDeteccionDispositivo() {
        this.isMobile = 'ontouchstart' in window || 
                        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || 
                        window.esMovil === true ||
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.isLocked = this.isMobile; 
    }

    configurarCompatibilidadTeclas() {
        // Teclas para movimiento
        this.teclas = { w: false, a: false, s: false, d: false };

        // Banderas direccionales compatibles con el joystick y teclado
        Object.defineProperty(this, 'moverAdelante', {
            get: () => this.teclas.w,
            set: (valor) => { this.teclas.w = valor; }
        });
        Object.defineProperty(this, 'moverAtras', {
            get: () => this.teclas.s,
            set: (valor) => { this.teclas.s = valor; }
        });
        Object.defineProperty(this, 'moverIzquierda', {
            get: () => this.teclas.a,
            set: (valor) => { this.teclas.a = valor; }
        });
        Object.defineProperty(this, 'moverDerecha', {
            get: () => this.teclas.d,
            set: (valor) => { this.teclas.d = valor; }
        });
    }

    inicializarPropiedadesCamara() {
        this.velocidad = 0.5;
        this.sensibilidad = 0.002;

        // Ángulos de Euler para la cámara
        this.yaw = Math.PI; // Empezamos mirando hacia el -Z
        this.pitch = 0;
        this.camara.rotation.order = 'YXZ'; // Modo de rotación estándar FPS
        this.camara.rotation.set(this.pitch, this.yaw, 0); // Aplicar rotación inicial

        this._vectorAdelante = new Vector3();
        this._vectorArriba = new Vector3(0, 1, 0);
        this._vectorDerecha = new Vector3();

        this._onMouseMove = this.onMouseMove.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onPointerlockChange = this.onPointerlockChange.bind(this);

        // Estado del jugador
        this.isWalking = false;
    }

    vincularEventosEntrada() {
        this.vincularBloqueoPunteroClic();
        this.vincularEventosTeclado();
        this.vincularSeguridadMovilTouch();
        this.vincularCambioOrientacion();
        
        // Escuchar evento para liberar el cursor exclusivamente en la interacción de música
        broker.on('mostrarCursorMusica', (mostrar) => {
            if (mostrar && document.pointerLockElement) {
                document.exitPointerLock();
            }
        });
    }

    vincularBloqueoPunteroClic() {
        this.domElement.addEventListener('click', (eventoClick) => this.gestionarClicCanvas(eventoClick));
        document.addEventListener('pointerlockchange', this._onPointerlockChange);
    }

    gestionarClicCanvas(eventoClick) {
        // No ocultar cursor si se hace clic dentro de un elemento interactivo UI
        if (this.esElementoUI(eventoClick.target)) {
            return;
        }
        if (!this.isMobile) {
            this.domElement.requestPointerLock();
        }
    }

    vincularEventosTeclado() {
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    vincularSeguridadMovilTouch() {
        // Listener de seguridad para forzar detección móvil ante cualquier interacción touch 
        const forzarMovil = () => {
            if (!this.isMobile) {
                this.isMobile = true;
                this.isLocked = true;
                this.inicializarcontrolsMoviles();
            }
        };
        window.addEventListener('touchstart', forzarMovil, { once: true });
    }

    vincularCambioOrientacion() {
        window.addEventListener('resize', () => this.reajustarJoystickOrientacion());
    }

    esElementoUI(elementoTarget) {
        return elementoTarget.closest('#panel-menu-superior') || 
               elementoTarget.closest('#btn-menu-superior') || 
               elementoTarget.closest('.lil-gui') ||
               elementoTarget.closest('#modal-dialogo');
    }

    reajustarJoystickOrientacion() {
        const joystickContenedor = document.getElementById('zona-joystick');
        if (joystickContenedor && this.isMobile) {
            joystickContenedor.style.bottom = '10%';
            joystickContenedor.style.left = '5%';
        }
    }

    verificarInicializacioncontrolsMoviles() {
        if (this.isMobile) {
            this.inicializarcontrolsMoviles();
        }
    }


    inicializarcontrolsMoviles() {
        this.mostrarContenedorJoystick();
        this.configurarJoystick();
        this.configurarRotacionCamaraTactil();
        this.configurarinteractionsTactiles();
    }

    mostrarContenedorJoystick() {
        const contenedorJoystick = document.getElementById('zona-joystick');
        if (contenedorJoystick) {
            contenedorJoystick.style.display = 'block';
        }
    }

    configurarJoystick() {
        const contenedorJoystick = document.getElementById('zona-joystick');
        if (!contenedorJoystick) return;

        // Instanciar joystick al contenedor
        this.joystick = nipplejs.create({
            zone: contenedorJoystick,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 100
        });

        this._joystickVectorLog = 'Sin datos';
        this._joystickEventLog = 'Ninguno';

        this.joystick.on('move', (eventoJoystick, datosNipple) => {
            this.actualizarVectoresMovimiento(eventoJoystick, datosNipple);
        });

        this.joystick.on('end', () => {
            this.reiniciarVectoresMovimiento();
        });
    }

    actualizarVectoresMovimiento(eventoJoystick, datosNipple) {
        this._joystickEventLog = 'Moviendo';

        // Extraer los datos válidos 
        const datosValidos = this.extraerDatosValidosNipple(eventoJoystick, datosNipple);
        if (!datosValidos) {
            const nombresLlavesEvento = eventoJoystick ? Object.keys(eventoJoystick).join(',') : 'nulo';
            this._joystickVectorLog = `Data vacía (keys arg1: ${nombresLlavesEvento})`;
            return;
        }

        // Si tiene vector directo, mapearlo
        if (datosValidos.vector) {
            this.procesarMovimientoDesdeVector(datosValidos.vector);
        } 
        // Fallback por si la versión expone angle/distance pero no vector directamente
        else if (datosValidos.angle) {
            this.procesarMovimientoDesdeAnguloYDistancia(datosValidos.angle, datosValidos.distance);
        } else {
            this._joystickVectorLog = 'Data sin vector ni angle';
        }
    }

    extraerDatosValidosNipple(eventoJoystick, datosNipple) {
        if (eventoJoystick) {
            const tienePropiedadesDirectas = eventoJoystick.vector || eventoJoystick.angle || eventoJoystick.position || eventoJoystick.distance;
            if (tienePropiedadesDirectas) {
                return eventoJoystick;
            }
            const tieneDatosEncapsulados = eventoJoystick.data && (eventoJoystick.data.vector || eventoJoystick.data.angle || eventoJoystick.data.position || eventoJoystick.data.distance);
            if (tieneDatosEncapsulados) {
                return eventoJoystick.data;
            }
        }
        if (datosNipple) {
            const tienePropiedadesDirectasNipple = datosNipple.vector || datosNipple.angle || datosNipple.position || datosNipple.distance;
            if (tienePropiedadesDirectasNipple) {
                return datosNipple;
            }
            const tieneDatosEncapsuladosNipple = datosNipple.data && (datosNipple.data.vector || datosNipple.data.angle || datosNipple.data.position || datosNipple.data.distance);
            if (tieneDatosEncapsuladosNipple) {
                return datosNipple.data;
            }
        }
        return null;
    }

    procesarMovimientoDesdeVector(vectorJoystick) {
        this._joystickVectorLog = `X: ${vectorJoystick.x.toFixed(2)}, Y: ${vectorJoystick.y.toFixed(2)}`;
        
        const componenteMovimientoX = vectorJoystick.x;
        const componenteMovimientoY = vectorJoystick.y;
        const umbralSensibilidadJoystick = 0.2;

        this.moverAdelante = componenteMovimientoY > umbralSensibilidadJoystick;
        this.moverAtras = componenteMovimientoY < -umbralSensibilidadJoystick;
        this.moverDerecha = componenteMovimientoX > umbralSensibilidadJoystick;
        this.moverIzquierda = componenteMovimientoX < -umbralSensibilidadJoystick;
    }

    procesarMovimientoDesdeAnguloYDistancia(datosAngulo, distanciaJoystick) {
        const anguloRadianes = datosAngulo.radian;
        const fuerzaNormalizada = Math.min((distanciaJoystick || 0) / 50, 1.0);
        const componenteSeno = Math.sin(anguloRadianes);
        const componenteCoseno = Math.cos(anguloRadianes);
        
        this._joystickVectorLog = `Ang: ${anguloRadianes.toFixed(2)} Rad (Fallback)`;

        const umbralZonaMuerta = 0.38;
        const fuerzaMinimaMovimiento = 0.1;
        const tieneFuerzaSuficiente = fuerzaNormalizada > fuerzaMinimaMovimiento;

        this.moverAdelante = componenteSeno > umbralZonaMuerta && tieneFuerzaSuficiente;
        this.moverAtras = componenteSeno < -umbralZonaMuerta && tieneFuerzaSuficiente;
        this.moverDerecha = componenteCoseno > umbralZonaMuerta && tieneFuerzaSuficiente;
        this.moverIzquierda = componenteCoseno < -umbralZonaMuerta && tieneFuerzaSuficiente;
    }

    reiniciarVectoresMovimiento() {
        this._joystickEventLog = 'Soltado';
        this._joystickVectorLog = 'Soltado';
        this.moverAdelante = false;
        this.moverAtras = false;
        this.moverDerecha = false;
        this.moverIzquierda = false;
    }

    configurarRotacionCamaraTactil() {
        this._activeRotationTouchId = null;
        this._lastTouchX = 0;
        this._lastTouchY = 0;

        this._onTouchStart = this.gestionarInicioRotacionTactil.bind(this);
        this._onTouchMove = this.gestionarMovimientoRotacionTactil.bind(this);
        this._onTouchEnd = this.gestionarFinRotacionTactil.bind(this);

        window.addEventListener('touchstart', this._onTouchStart);
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
        window.addEventListener('touchend', this._onTouchEnd);
        window.addEventListener('touchcancel', this._onTouchEnd);
    }

    gestionarInicioRotacionTactil(eventoTouch) {
        // Ignorar rotación de cámara si el menú superior está abierto
        if (this.esMenuSuperiorAbierto()) {
            return;
        }

        const toquesModificados = eventoTouch.changedTouches;

        for (let indiceToque = 0; indiceToque < toquesModificados.length; indiceToque++) {
            const toqueIndividual = toquesModificados[indiceToque];
            
            // La mitad derecha es clientX > width / 2
            const esLadoDerecho = toqueIndividual.clientX > window.innerWidth / 2;

            if (esLadoDerecho) {
                this._activeRotationTouchId = toqueIndividual.identifier;
                this._lastTouchX = toqueIndividual.clientX;
                this._lastTouchY = toqueIndividual.clientY;
                break;
            }
        }
    }

    gestionarMovimientoRotacionTactil(eventoTouch) {
        if (this._activeRotationTouchId === null) return;

        if (this.esMenuSuperiorAbierto()) return;

        let toqueActivo = null;
        const listaToques = eventoTouch.touches;

        for (let indiceToque = 0; indiceToque < listaToques.length; indiceToque++) {
            if (listaToques[indiceToque].identifier === this._activeRotationTouchId) {
                toqueActivo = listaToques[indiceToque];
                break;
            }
        }

        if (!toqueActivo) return;

        // Evitar el scroll o zoom de página nativo en dispositivos móviles al arrastrar
        eventoTouch.preventDefault();

        const deltaTouchX = toqueActivo.clientX - this._lastTouchX;
        const deltaTouchY = toqueActivo.clientY - this._lastTouchY;

        this._lastTouchX = toqueActivo.clientX;
        this._lastTouchY = toqueActivo.clientY;

        this.procesarRotacionCamara(deltaTouchX, deltaTouchY);
    }

    gestionarFinRotacionTactil(eventoTouch) {
        const toquesModificados = eventoTouch.changedTouches;
        for (let indiceToque = 0; indiceToque < toquesModificados.length; indiceToque++) {
            if (toquesModificados[indiceToque].identifier === this._activeRotationTouchId) {
                this._activeRotationTouchId = null;
                break;
            }
        }
    }

    esMenuSuperiorAbierto() {
        const panelMenuSuperior = document.getElementById('panel-menu-superior');
        return panelMenuSuperior && !panelMenuSuperior.classList.contains('oculto');
    }

    procesarRotacionCamara(deltaX, deltaY) {
        // Rotación de la cámara adaptada a la velocidad de arrastre táctil
        const factorSensibilidadMovil = 1.5;
        this.yaw -= deltaX * this.sensibilidad * factorSensibilidadMovil;
        this.pitch -= deltaY * this.sensibilidad * factorSensibilidadMovil;

        const limitePitch = Math.PI / 2 - 0.01;
        this.pitch = MathUtils.clamp(this.pitch, -limitePitch, limitePitch);

        this.camara.rotation.set(this.pitch, this.yaw, 0);
    }

    configurarinteractionsTactiles() {
        const uiInteraccion = document.getElementById('ui-interaccion');
        if (uiInteraccion) {
            this.vincularElementoInteractivo(uiInteraccion);
        }

        const modalDialogo = document.getElementById('modal-dialogo');
        if (modalDialogo) {
            this.vincularElementoInteractivo(modalDialogo);
        }
    }

    vincularElementoInteractivo(elementoUI) {
        elementoUI.style.pointerEvents = 'auto'; // Permitir capturar eventos touch
        elementoUI.addEventListener('touchstart', (eventoTouch) => {
            if (eventoTouch.target.closest('.btn-musica')) {
                return;
            }
            eventoTouch.preventDefault();
            eventoTouch.stopPropagation();
            this.simularPulsacionTeclaE();
        });
    }

    simularPulsacionTeclaE() {
        // Simular pulsación de tecla E para continuar diálogos
        const eventoTeclaE = new KeyboardEvent('keydown', { key: 'e', bubbles: true });
        document.dispatchEvent(eventoTeclaE);
    }

    // Handlers de eventos de PointerLock y Teclado PC
    onPointerlockChange() {
        this.isLocked = document.pointerLockElement === this.domElement;
    }

    onMouseMove(eventoMouse) {
        if (!this.isLocked) return;

        this.yaw -= eventoMouse.movementX * this.sensibilidad;
        this.pitch -= eventoMouse.movementY * this.sensibilidad;

        const limitePitch = Math.PI / 2 - 0.01;
        this.pitch = MathUtils.clamp(this.pitch, -limitePitch, limitePitch);

        this.camara.rotation.set(this.pitch, this.yaw, 0);
    }

    onKeyDown(eventoTeclado) {
        const codigoTecla = eventoTeclado.key.toLowerCase();
        switch (codigoTecla) {
            case 'w': this.moverAdelante = true; break;
            case 'a': this.moverIzquierda = true; break;
            case 's': this.moverAtras = true; break;
            case 'd': this.moverDerecha = true; break;
        }
    }

    onKeyUp(eventoTeclado) {
        const codigoTecla = eventoTeclado.key.toLowerCase();
        switch (codigoTecla) {
            case 'w': this.moverAdelante = false; break;
            case 'a': this.moverIzquierda = false; break;
            case 's': this.moverAtras = false; break;
            case 'd': this.moverDerecha = false; break;
        }
    }

    // Bucle de actualización

    actualizar() {
        const menuAbierto = this.esMenuSuperiorAbierto();

        // Controlar la visibilidad del joystick según si el menú está visible
        this.actualizarVisibilidadJoystick(menuAbierto);

        // En móvil el movimiento se procesa sin PointerLock 
        if ((!this.isLocked && !this.isMobile) || menuAbierto) {
            this.detenerCaminata(menuAbierto);
            return;
        }

        this.procesarDesplazamientoJugador();
    }

    actualizarVisibilidadJoystick(menuAbierto) {
        const contenedorJoystick = document.getElementById('zona-joystick');
        if (contenedorJoystick && this.isMobile) {
            contenedorJoystick.style.display = menuAbierto ? 'none' : 'block';
        }
    }


    detenerCaminata(menuAbierto) {
        if (this.isWalking) {
            this.isWalking = false;
            broker.emit('jugadorCaminando', false);
        }
        if (menuAbierto) {
            this.moverAdelante = false;
            this.moverAtras = false;
            this.moverIzquierda = false;
            this.moverDerecha = false;
        }
    }

    procesarDesplazamientoJugador() {
        const { w: teclaPresionadaW, a: teclaPresionadaA, s: teclaPresionadaS, d: teclaPresionadaD } = this.teclas;
        const posicionCamara = this.camara.position;

        // Calcular hacia donde va la camara (movimiento plano en el eje XZ)
        this._vectorAdelante.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();

        // Calcular el vector derecho (Producto Cruz)
        this._vectorDerecha.crossVectors(this._vectorAdelante, this._vectorArriba).normalize();

        // Calcular desplazamiento deseado combinando todas las teclas presionadas
        const vectorDesplazamientoDeseado = new Vector3(0, 0, 0);

        if (teclaPresionadaW) {
            vectorDesplazamientoDeseado.add(this._vectorAdelante);
        }
        if (teclaPresionadaS) {
            vectorDesplazamientoDeseado.addScaledVector(this._vectorAdelante, -1);
        }
        if (teclaPresionadaA) {
            vectorDesplazamientoDeseado.addScaledVector(this._vectorDerecha, -1);
        }
        if (teclaPresionadaD) {
            vectorDesplazamientoDeseado.add(this._vectorDerecha);
        }

        let jugadorEnMovimiento = false;

        if (vectorDesplazamientoDeseado.lengthSq() > 0) {
            // Normalizar la dirección del desplazamiento acumulado y escalarla por la velocidad
            vectorDesplazamientoDeseado.normalize().multiplyScalar(this.velocidad);

            // Resolver colisión por deslizamiento (AABB)
            const proximaPosicionCalculada = resolverMovimientoJugador(posicionCamara, vectorDesplazamientoDeseado);

            // Verificar si hubo un desplazamiento real para considerarlo en movimiento
            const distanciaCuadradaAlObjetivo = posicionCamara.distanceToSquared(proximaPosicionCalculada);
            const umbralMinimoMovimiento = 0.0001;

            if (distanciaCuadradaAlObjetivo > umbralMinimoMovimiento) {
                posicionCamara.copy(proximaPosicionCalculada);
                jugadorEnMovimiento = true;
            }
        }

        // Controlar el estado de caminata y emitir evento si cambia
        if (this.isWalking !== jugadorEnMovimiento) {
            this.isWalking = jugadorEnMovimiento;
            broker.emit('jugadorCaminando', this.isWalking);
        }
    }
}

export { controlsPrimeraPersona };